import { $articles, $sources, and, gte, lte, isNotNull, eq, not } from '@meridian/database';
import { Env } from './index';
import { getDb, hasValidAuthToken } from './lib/utils';
import { Hono } from 'hono';
import { trimTrailingSlash } from 'hono/trailing-slash';
import openGraph from './routers/openGraph.router';
import reportsRouter from './routers/reports.router';
import { startRssFeedScraperWorkflow } from './workflows/rssFeed.workflow';
import { startProcessArticleWorkflow } from './workflows/processArticles.workflow';
import { generateWithOpenRouter } from './lib/openrouter';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getArticleWithBrowser, getArticleWithFetch } from './lib/puppeteer';
import getArticleAnalysisPrompt, { articleAnalysisSchema } from './prompts/articleAnalysis.prompt';

export type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>()
  .use(trimTrailingSlash())
  .get('/favicon.ico', async c => c.notFound()) // disable favicon
  .route('/reports', reportsRouter)
  .route('/openGraph', openGraph)
  .get('/ping', async c => c.json({ pong: true }))
  .get('/test-openrouter', async c => {
    // Check for token in Authorization header or query parameter
    const authHeader = c.req.header('Authorization');
    const tokenParam = c.req.query('token');
    
    // Check if either the Authorization header or token query parameter is valid
    const hasValidToken = 
      (authHeader !== undefined && authHeader === `Bearer ${c.env.MERIDIAN_SECRET_KEY}`) || 
      (tokenParam !== undefined && tokenParam === c.env.MERIDIAN_SECRET_KEY);
    
    if (!hasValidToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      // Simple test prompt
      const testPrompt = "Return a JSON object with a single field 'status' set to 'working'";
      const testSchema = z.object({ status: z.string() });
      
      const result = await generateWithOpenRouter(c.env, testPrompt, testSchema);
      
      return c.json({ 
        success: true, 
        result: result.object,
        message: "OpenRouter integration is working correctly"
      });
    } catch (error) {
      console.error('OpenRouter test error:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        message: "OpenRouter integration test failed"
      }, 500);
    }
  })
  .get('/test-article-processing', async c => {
    // Check for token in Authorization header or query parameter
    const authHeader = c.req.header('Authorization');
    const tokenParam = c.req.query('token');
    
    // Check if either the Authorization header or token query parameter is valid
    const hasValidToken = 
      (authHeader !== undefined && authHeader === `Bearer ${c.env.MERIDIAN_SECRET_KEY}`) || 
      (tokenParam !== undefined && tokenParam === c.env.MERIDIAN_SECRET_KEY);
    
    if (!hasValidToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get article ID from query parameter
    const articleId = c.req.query('articleId');
    if (!articleId) {
      return c.json({ error: 'Missing articleId parameter' }, 400);
    }

    try {
      const db = getDb(c.env.DATABASE_URL);
      
      // Get article from database
      const article = await db
        .select({
          id: $articles.id,
          url: $articles.url,
          title: $articles.title,
          publishDate: $articles.publishDate,
        })
        .from($articles)
        .where(eq($articles.id, parseInt(articleId)))
        .limit(1);
      
      if (article.length === 0) {
        return c.json({ error: `Article with ID ${articleId} not found` }, 404);
      }
      
      const articleData = article[0];
      
      // Scrape the article
      let scrapedArticle;
      const trickyDomains = ['reuters.com', 'nytimes.com'];
      const domain = new URL(articleData.url).hostname;
      
      // Skip PDF files
      if (articleData.url.toLowerCase().endsWith('.pdf')) {
        return c.json({ error: 'PDF files are not supported' }, 400);
      }
      
      // If from a tricky domain, use browser rendering
      if (trickyDomains.some(d => domain.includes(d))) {
        const articleResult = await getArticleWithBrowser(c.env, articleData.url);
        if (articleResult.isErr()) {
          return c.json({ 
            error: `Failed to scrape article: ${articleResult.error.error}`,
            details: articleResult.error
          }, 500);
        }
        scrapedArticle = articleResult.value;
      } else {
        // Try with fetch first
        const lightResult = await getArticleWithFetch(articleData.url);
        if (lightResult.isErr()) {
          // If fetch fails, try with browser
          const articleResult = await getArticleWithBrowser(c.env, articleData.url);
          if (articleResult.isErr()) {
            return c.json({ 
              error: `Failed to scrape article: ${articleResult.error.error}`,
              details: articleResult.error
            }, 500);
          }
          scrapedArticle = articleResult.value;
        } else {
          scrapedArticle = lightResult.value;
        }
      }
      
      // Process with Gemini
      const prompt = getArticleAnalysisPrompt(scrapedArticle.title, scrapedArticle.text);
      
      try {
        const result = await generateWithOpenRouter(c.env, prompt, articleAnalysisSchema);
        
        return c.json({
          success: true,
          article: {
            id: articleData.id,
            url: articleData.url,
            title: articleData.title,
            publishDate: articleData.publishDate,
          },
          scrapedContent: {
            title: scrapedArticle.title,
            text: scrapedArticle.text.substring(0, 500) + '...', // Truncate for response
            publishedTime: scrapedArticle.publishedTime,
          },
          analysis: result.object,
        });
      } catch (error) {
        console.error('Gemini processing error:', error);
        
        // Provide more detailed error information
        let errorDetails = error;
        if (error instanceof Error) {
          errorDetails = {
            message: error.message,
            stack: error.stack,
            name: error.name
          };
        }
        
        return c.json({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          details: errorDetails,
          message: "Gemini processing failed",
          article: {
            id: articleData.id,
            url: articleData.url,
            title: articleData.title,
            publishDate: articleData.publishDate,
          },
          scrapedContent: {
            title: scrapedArticle.title,
            text: scrapedArticle.text.substring(0, 500) + '...', // Truncate for response
            publishedTime: scrapedArticle.publishedTime,
          }
        }, 500);
      }
    } catch (error) {
      console.error('Article processing test error:', error);
      
      // Provide more detailed error information
      let errorDetails = error;
      if (error instanceof Error) {
        errorDetails = {
          message: error.message,
          stack: error.stack,
          name: error.name
        };
      }
      
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        details: errorDetails,
        message: "Article processing test failed"
      }, 500);
    }
  })
  .get('/trigger-rss', async c => {
    // Check for token in Authorization header or query parameter
    const authHeader = c.req.header('Authorization');
    const tokenParam = c.req.query('token');
    
    // Check if either the Authorization header or token query parameter is valid
    const hasValidToken = 
      (authHeader !== undefined && authHeader === `Bearer ${c.env.MERIDIAN_SECRET_KEY}`) || 
      (tokenParam !== undefined && tokenParam === c.env.MERIDIAN_SECRET_KEY);
    
    if (!hasValidToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const result = await startRssFeedScraperWorkflow(c.env);
    if (result.isErr()) {
      return c.json({ error: result.error.message }, 500);
    }

    return c.json({ success: true, workflowId: result.value.id });
  })
  .get('/trigger-process-articles', async c => {
    // Check for token in Authorization header or query parameter
    const authHeader = c.req.header('Authorization');
    const tokenParam = c.req.query('token');
    
    // Check if either the Authorization header or token query parameter is valid
    const hasValidToken = 
      (authHeader !== undefined && authHeader === `Bearer ${c.env.MERIDIAN_SECRET_KEY}`) || 
      (tokenParam !== undefined && tokenParam === c.env.MERIDIAN_SECRET_KEY);
    
    if (!hasValidToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const result = await startProcessArticleWorkflow(c.env);
    if (result.isErr()) {
      return c.json({ error: result.error.message }, 500);
    }

    return c.json({ success: true, workflowId: result.value.id });
  })
  .get('/events', async c => {
    // require bearer auth token
    const hasValidToken = hasValidAuthToken(c);
    if (!hasValidToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if a date query parameter was provided in yyyy-mm-dd format
    const dateParam = c.req.query('date');

    let endDate: Date;
    if (dateParam) {
      // Parse the date parameter explicitly with UTC
      // Append T07:00:00Z to ensure it's 7am UTC
      endDate = new Date(`${dateParam}T07:00:00Z`);
      // Check if date is valid
      if (isNaN(endDate.getTime())) {
        return c.json({ error: 'Invalid date format. Please use yyyy-mm-dd' }, 400);
      }
    } else {
      // Use current date if no date parameter was provided
      endDate = new Date();
      // Set to 7am UTC today
      endDate.setUTCHours(7, 0, 0, 0);
    }

    // Create a 30-hour window ending at 7am UTC on the specified date
    const startDate = new Date(endDate.getTime() - 30 * 60 * 60 * 1000);

    const db = getDb(c.env.DATABASE_URL);

    const allSources = await db.select({ id: $sources.id, name: $sources.name }).from($sources);

    let events = await db
      .select({
        id: $articles.id,
        sourceId: $articles.sourceId,
        url: $articles.url,
        title: $articles.title,
        publishDate: $articles.publishDate,
        content: $articles.content,
        location: $articles.location,
        completeness: $articles.completeness,
        relevance: $articles.relevance,
        summary: $articles.summary,
        createdAt: $articles.createdAt,
      })
      .from($articles)
      .where(
        and(
          isNotNull($articles.location),
          gte($articles.publishDate, startDate),
          lte($articles.publishDate, endDate),
          eq($articles.relevance, 'RELEVANT'),
          not(eq($articles.completeness, 'PARTIAL_USELESS')),
          isNotNull($articles.summary)
        )
      );

    const response = {
      sources: allSources,
      events,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    return c.json(response);
  });

export default app;

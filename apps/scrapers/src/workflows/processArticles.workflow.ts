import getArticleAnalysisPrompt, { articleAnalysisSchema } from '../prompts/articleAnalysis.prompt';
import { $articles, and, eq, gte, isNull, sql } from '@meridian/database';
import { Env } from '../index';
import { getArticleWithBrowser, getArticleWithFetch } from '../lib/puppeteer';
import { getDb } from '../lib/utils';
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent, WorkflowStepConfig } from 'cloudflare:workers';
import { err, ok } from 'neverthrow';
import { ResultAsync } from 'neverthrow';
import { DomainRateLimiter } from '../lib/rateLimiter';
import { generateWithOpenRouter } from '../lib/openrouter';

const dbStepConfig: WorkflowStepConfig = {
  retries: { limit: 3, delay: '1 second', backoff: 'linear' },
  timeout: '5 seconds',
};

// Main workflow class
export class ProcessArticles extends WorkflowEntrypoint<Env, Params> {
  async run(_event: WorkflowEvent<Params>, step: WorkflowStep) {
    const env = this.env;
    const db = getDb(env.DATABASE_URL);

    async function getUnprocessedArticles(opts: { limit?: number }) {
      const articles = await db
        .select({
          id: $articles.id,
          url: $articles.url,
          title: $articles.title,
          publishedAt: $articles.publishDate,
        })
        .from($articles)
        .where(
          and(
            // only process articles that haven't been processed yet
            isNull($articles.processedAt),
            // only process articles that have a publish date in the last 48 hours
            gte($articles.publishDate, new Date(new Date().getTime() - 48 * 60 * 60 * 1000)),
            // only articles that have not failed
            isNull($articles.failReason)
          )
        )
        .limit(opts.limit ?? 100)
        .orderBy(sql`RANDOM()`);
      return articles;
    }

    // get articles to process
    const articles = await step.do('get articles', dbStepConfig, async () => getUnprocessedArticles({ limit: 50 }));

    // Create rate limiter with article processing specific settings
    const rateLimiter = new DomainRateLimiter<{
      id: number;
      url: string;
      title: string;
      publishedAt: Date | null;
    }>({
      maxConcurrent: 5,
      globalCooldownMs: 1000,
      domainCooldownMs: 5000,
    });

    const articlesToProcess: Array<{
      id: number;
      title: string;
      text: string;
      publishedTime?: string;
    }> = [];

    const trickyDomains = ['reuters.com', 'nytimes.com'];

    // Process articles in smaller chunks
    const CHUNK_SIZE = 10;
    const articleChunks = [];
    for (let i = 0; i < articles.length; i += CHUNK_SIZE) {
      articleChunks.push(articles.slice(i, i + CHUNK_SIZE));
    }

    // Process each chunk separately
    for (const chunk of articleChunks) {
      // Process articles with rate limiting
      const articleResults = await rateLimiter.processBatch(chunk, step, async (article, domain) => {
        // Skip PDF files immediately
        if (article.url.toLowerCase().endsWith('.pdf')) {
          return { id: article.id, success: false, error: 'pdf' };
        }

        const result = await step.do(
          `scrape article ${article.id}`,
          {
            retries: { limit: 3, delay: '2 second', backoff: 'exponential' },
            timeout: '1 minute',
          },
          async () => {
            // start with light scraping
            let articleData: { title: string; text: string; publishedTime: string | undefined } | undefined = undefined;

            // if we're from a tricky domain, fetch with browser first
            if (trickyDomains.includes(domain)) {
              const articleResult = await getArticleWithBrowser(env, article.url);
              if (articleResult.isErr()) {
                return { id: article.id, success: false, error: articleResult.error.error };
              }
              articleData = articleResult.value;
            }

            // otherwise, start with fetch & then browser if that fails
            const lightResult = await getArticleWithFetch(article.url);
            if (lightResult.isErr()) {
              // rand jitter between .5 & 3 seconds
              const jitterTime = Math.random() * 2500 + 500;
              await step.sleep(`jitter`, jitterTime);

              const articleResult = await getArticleWithBrowser(env, article.url);
              if (articleResult.isErr()) {
                return { id: article.id, success: false, error: articleResult.error.error };
              }

              articleData = articleResult.value;
            } else articleData = lightResult.value;

            return { id: article.id, success: true, html: articleData };
          }
        );

        return result;
      });

      // Handle results for this chunk
      for (const result of articleResults) {
        if (result.success && 'html' in result) {
          articlesToProcess.push({
            id: result.id,
            title: result.html.title,
            text: result.html.text,
            publishedTime: result.html.publishedTime,
          });
        } else {
          // update failed articles in DB with the fail reason
          await step.do(`update db for failed article ${result.id}`, dbStepConfig, async () => {
            await db
              .update($articles)
              .set({
                processedAt: new Date(),
                failReason: result.error ? String(result.error) : 'Unknown error',
              })
              .where(eq($articles.id, result.id));
          });
        }
      }

      // Process LLM analysis for this chunk
      await Promise.all(
        articlesToProcess.map(async article => {
          const articleAnalysis = await step.do(
            `analyze article ${article.id}`,
            {
              retries: { limit: 3, delay: '2 seconds', backoff: 'exponential' },
              timeout: '1 minute',
            },
            async () => {
              const response = await generateWithOpenRouter(
                env,
                getArticleAnalysisPrompt(article.title, article.text),
                articleAnalysisSchema
              );
              return response.object;
            }
          );

          // update db
          await step.do(`update db for article ${article.id}`, dbStepConfig, async () => {
            await db
              .update($articles)
              .set({
                processedAt: new Date(),
                content: article.text,
                title: article.title,
                completeness: articleAnalysis.completeness,
                relevance: articleAnalysis.relevance,
                language: articleAnalysis.language,
                location: articleAnalysis.location,
                summary: (() => {
                  if (articleAnalysis.summary === undefined) return null;
                  let txt = '';
                  txt += `HEADLINE: ${articleAnalysis.summary.HEADLINE?.trim() || ''}\n`;
                  
                  // Handle ENTITIES that might be a string instead of an array
                  let entitiesText = '';
                  if (articleAnalysis.summary.ENTITIES) {
                    if (Array.isArray(articleAnalysis.summary.ENTITIES)) {
                      entitiesText = articleAnalysis.summary.ENTITIES.join(', ');
                    } else if (typeof articleAnalysis.summary.ENTITIES === 'string') {
                      entitiesText = articleAnalysis.summary.ENTITIES;
                    }
                  }
                  txt += `ENTITIES: ${entitiesText}\n`;
                  
                  txt += `EVENT: ${articleAnalysis.summary.EVENT?.trim() || ''}\n`;
                  txt += `CONTEXT: ${articleAnalysis.summary.CONTEXT?.trim() || ''}\n`;
                  return txt.trim();
                })(),
              })
              .where(eq($articles.id, article.id))
              .execute();
          });
        })
      );

      // Clear the articlesToProcess array after processing this chunk
      articlesToProcess.length = 0;
    }

    console.log(`Processed ${articles.length} articles`);

    // check if there are articles to process still
    const remainingArticles = await step.do('get remaining articles', dbStepConfig, async () =>
      getUnprocessedArticles({ limit: 50 })
    );
    if (remainingArticles.length > 0) {
      console.log(`Found at least ${remainingArticles.length} remaining articles to process`);

      // trigger the workflow again
      await step.do('trigger_article_processor', dbStepConfig, async () => {
        const workflow = await this.env.PROCESS_ARTICLES.create({ id: crypto.randomUUID() });
        return workflow.id;
      });
    }
  }
}

// helper to start the workflow from elsewhere
export async function startProcessArticleWorkflow(env: Env) {
  const workflow = await ResultAsync.fromPromise(env.PROCESS_ARTICLES.create({ id: crypto.randomUUID() }), e =>
    e instanceof Error ? e : new Error(String(e))
  );
  if (workflow.isErr()) {
    return err(workflow.error);
  }
  return ok(workflow.value);
}

'use client';

import { useState, useEffect } from 'react';
import { useReportBySlug } from '@/hooks/useReports';
import SubscriptionForm from '@/components/SubscriptionForm';
import { renderMarkdown } from '@/utils/markdown';
import { notFound } from 'next/navigation';

/**
 * Calculates estimated reading time in minutes
 */
const estimateReadingTime = (content: string): number => {
  const WORDS_PER_MINUTE = 300;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
};

export default function BriefPage({ params }: { params: { slug: string } }) {
  const { report, isLoading, error, notFound: reportNotFound } = useReportBySlug(params.slug);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    if (reportNotFound) {
      notFound();
    }
  }, [reportNotFound]);

  useEffect(() => {
    // Initialize scroll progress tracking
    const scrollListener = () => {
      const scrollTop = document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setReadingProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };

    window.addEventListener('scroll', scrollListener);

    return () => {
      window.removeEventListener('scroll', scrollListener);
    };
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading brief: {error.message}</div>;
  }

  if (!report) {
    return null; // Let Next.js handle the 404
  }

  return (
    <>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-50">
        <div
          className="h-full bg-black dark:bg-white transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div>
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-3">{report.title}</h1>
          <div className="flex text-sm text-gray-600 items-center space-x-2">
            <time>
              {report.date?.month.toLowerCase()} {report.date?.day}, {report.date?.year}
            </time>
            <span>•</span>
            <p>{estimateReadingTime(report.content)} min read</p>
          </div>
        </header>

        <article
          className="prose text-justify w-full"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content) }}
        />

        <div className="mt-16 mb-8">
          <div className="h-px w-full bg-gray-300 mb-8" />
          <div className="flex flex-col text-center gap-8">
            {/* Brief stats */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-12 text-sm">
              <div>
                <p className="text-gray-600 mb-1">total articles</p>
                <p className="font-bold text-base">{report.totalArticles || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">total sources</p>
                <p className="font-bold text-base">{report.totalSources || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">used articles</p>
                <p className="font-bold text-base">{report.usedArticles || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">used sources</p>
                <p className="font-bold text-base">{report.usedSources || '-'}</p>
              </div>
            </div>

            <div className="text-sm">
              <p className="text-gray-600 mb-1">final brief generated by</p>
              <p className="font-bold text-base">{report.model_author}</p>
            </div>

            {/* Subscription area */}
            <div className="mt-4 pt-8 border-t border-gray-300">
              <SubscriptionForm />
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
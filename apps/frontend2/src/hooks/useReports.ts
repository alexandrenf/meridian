import { useState, useEffect } from 'react';
import { fetchReports } from '@/utils/api';
import { Report } from '@/utils/validators';

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await fetchReports();
        setReports(data);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        setIsLoading(false);
      }
    }

    loadReports();
  }, []);

  return { reports, isLoading, error };
}

export function useReportBySlug(slug: string) {
  const { reports, isLoading, error } = useReports();
  
  const report = reports.find(report => report.slug === slug);

  return { report, isLoading, error, notFound: !isLoading && !error && !report };
} 
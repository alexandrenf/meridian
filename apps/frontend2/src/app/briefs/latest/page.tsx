'use client';

import { useReports } from '@/hooks/useReports';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LatestPage() {
  const { reports, isLoading, error } = useReports();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && reports.length > 0) {
      // Redirect to the latest report
      router.push(`/briefs/${reports[0].slug}`);
    }
  }, [isLoading, reports, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading reports: {error.message}</div>;
  }

  if (reports.length === 0) {
    return <div>No reports found</div>;
  }

  return (
    <div>
      <p>Redirecting to the latest report...</p>
    </div>
  );
} 
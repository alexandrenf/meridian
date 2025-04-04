'use client';

import { useReports } from '@/hooks/useReports';
import Link from 'next/link';

export default function BriefsPage() {
  const { reports, isLoading, error } = useReports();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading briefs: {error.message}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {reports.map(report => (
        <Link 
          key={report.id} 
          href={`/briefs/${report.slug}`}
          className="group"
        >
          <p className="text-xl font-bold group-hover:underline">{report.title}</p>
          <p className="text-sm text-gray-600 mt-1">
            {report.date?.month.toLowerCase()} {report.date?.day}, {report.date?.year}
          </p>
        </Link>
      ))}
    </div>
  );
} 
import { NextResponse } from 'next/server';
import { getDb } from '@meridian/database';

export async function GET() {
  try {
    const db = getDb(process.env.DATABASE_URL as string);
    const reports = await db.query.$reports.findMany();

    // Process reports to add date and slug
    const processedReports = reports
      .map(report => {
        // Ensure createdAt is a valid Date object and work with UTC
        const createdAt = report.createdAt ? new Date(report.createdAt) : new Date();

        // Use UTC methods to avoid timezone issues
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        const month = monthNames[createdAt.getUTCMonth()];
        const day = createdAt.getUTCDate();
        const year = createdAt.getUTCFullYear();

        return {
          ...report,
          date: { month, day, year },
          slug: `${month.toLowerCase()}-${day}-${year}`,
        };
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

    return NextResponse.json(processedReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
} 
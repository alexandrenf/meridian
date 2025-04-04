import { z } from 'zod';
import { reportValidator, Report } from './validators';

export async function fetchReports(): Promise<Report[]> {
  const response = await fetch('/api/reports');
  
  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }
  
  const data = await response.json();
  return z.array(reportValidator).parse(data);
}

export async function subscribeToNewsletter(email: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to subscribe');
  }
  
  return await response.json();
} 
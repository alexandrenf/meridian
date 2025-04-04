import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@meridian/database';
import { $newsletter } from '@meridian/database';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const bodyContent = z
      .object({
        email: z.string().email(),
      })
      .safeParse(body);

    if (bodyContent.success === false) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Insert email into the newsletter table
    await getDb(process.env.DATABASE_URL as string)
      .insert($newsletter)
      .values({ email: bodyContent.data.email })
      .onConflictDoNothing();

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully subscribed' 
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Database error' },
      { status: 500 }
    );
  }
} 
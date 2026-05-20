import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/googleCalendar';

// Force dynamic so Next.js never caches this route
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}

import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ authenticated: isAuthenticated() });
}

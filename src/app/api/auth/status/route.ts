import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/googleCalendar';

export async function GET() {
  return NextResponse.json({ authenticated: isAuthenticated() });
}

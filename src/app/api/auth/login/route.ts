import { redirect } from 'next/navigation';
import { getAuthUrl } from '@/lib/googleCalendar';

export async function GET() {
  const url = getAuthUrl();
  redirect(url);
}

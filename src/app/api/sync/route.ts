import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createCalendarEvent, isAuthenticated } from '@/lib/googleCalendar';
import type { Event } from '@/lib/types';

export async function POST() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Não autenticado com Google Calendar' }, { status: 401 });
  }

  const db = getDb();
  const unsynced = db
    .prepare('SELECT * FROM events WHERE gcal_event_id IS NULL OR gcal_event_id = ""')
    .all() as Event[];

  const results = { synced: 0, errors: 0 };

  for (const event of unsynced) {
    try {
      const gcalId = await createCalendarEvent(event);
      db.prepare('UPDATE events SET gcal_event_id = ? WHERE id = ?').run(gcalId, event.id);
      results.synced++;
    } catch (err) {
      console.error(`Sync error for event ${event.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({ ...results, total: unsynced.length });
}

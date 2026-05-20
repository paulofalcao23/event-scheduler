import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createCalendarEvent, isAuthenticated } from '@/lib/googleCalendar';
import type { CreateEventPayload, Event } from '@/lib/types';

export async function GET() {
  try {
    const db = getDb();
    const events = db.prepare('SELECT * FROM events ORDER BY date_start ASC').all() as Event[];
    return NextResponse.json(events);
  } catch (err) {
    console.error('GET /api/events error:', err);
    return NextResponse.json({ error: 'Erro ao buscar eventos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateEventPayload;

    if (!body.title || !body.date_start || !body.priority || !body.decision) {
      return NextResponse.json({ error: 'Campos obrigatórios: título, data de início, prioridade e decisão.' }, { status: 400 });
    }
    // Fim = início quando não informado (ou dia inteiro)
    if (!body.date_end) {
      body.date_end = body.date_start;
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO events
          (title, theme, date_start, date_end, all_day, location, organizer, description, priority, decision, attendees, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.title,
        body.theme ?? '',
        body.date_start,
        body.date_end,
        body.all_day ? 1 : 0,
        body.location ?? '',
        body.organizer ?? '',
        body.description ?? '',
        body.priority,
        body.decision,
        body.attendees ?? '',
        body.notes ?? ''
      );

    const id = result.lastInsertRowid as number;
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event;

    if (isAuthenticated()) {
      try {
        const gcalId = await createCalendarEvent(event);
        db.prepare('UPDATE events SET gcal_event_id = ? WHERE id = ?').run(gcalId, id);
        event.gcal_event_id = gcalId;
      } catch (calErr) {
        console.error('Google Calendar error (non-fatal):', calErr);
      }
    }

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error('POST /api/events error:', err);
    return NextResponse.json({ error: 'Erro ao criar evento' }, { status: 500 });
  }
}

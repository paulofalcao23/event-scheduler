import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createCalendarEvent, deleteCalendarEvent, isAuthenticated, updateCalendarEvent } from '@/lib/googleCalendar';
import type { CreateEventPayload, Event } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = (await request.json()) as CreateEventPayload;

    if (!body.title || !body.date_start || !body.priority || !body.decision) {
      return NextResponse.json({ error: 'Campos obrigatórios: título, data de início, prioridade e decisão.' }, { status: 400 });
    }
    if (!body.date_end) body.date_end = body.date_start;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    db.prepare(
      `UPDATE events SET
        title=?, theme=?, date_start=?, date_end=?, all_day=?,
        location=?, organizer=?, description=?, priority=?, decision=?,
        attendees=?, notes=?
       WHERE id=?`
    ).run(
      body.title, body.theme ?? '', body.date_start, body.date_end,
      body.all_day ? 1 : 0, body.location ?? '', body.organizer ?? '',
      body.description ?? '', body.priority, body.decision,
      body.attendees ?? '', body.notes ?? '',
      id
    );

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event;

    if (isAuthenticated()) {
      try {
        if (existing.gcal_event_id) {
          await updateCalendarEvent(existing.gcal_event_id, updated);
        } else {
          const gcalId = await createCalendarEvent(updated);
          db.prepare('UPDATE events SET gcal_event_id = ? WHERE id = ?').run(gcalId, id);
          updated.gcal_event_id = gcalId;
        }
      } catch (calErr) {
        console.error('Google Calendar update error (non-fatal):', calErr);
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar evento' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const db = getDb();
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined;

    if (!event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    if (event.gcal_event_id && isAuthenticated()) {
      try {
        await deleteCalendarEvent(event.gcal_event_id);
      } catch (calErr) {
        console.error('Google Calendar delete error (non-fatal):', calErr);
      }
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao excluir evento' }, { status: 500 });
  }
}

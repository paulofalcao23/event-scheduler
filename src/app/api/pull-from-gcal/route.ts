import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { getOAuth2Client, isAuthenticated } from '@/lib/googleCalendar';

const SYNC_TOKEN_PATH = path.join(process.cwd(), 'data', '.gcal-sync-token.json');
const SYNC_COLOR_ID = '10'; // Basil (verde) — cor usada pelo app

export async function POST() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const db = getDb();
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });

  let syncToken: string | undefined;
  if (fs.existsSync(SYNC_TOKEN_PATH)) {
    try {
      syncToken = JSON.parse(fs.readFileSync(SYNC_TOKEN_PATH, 'utf-8')).syncToken;
    } catch { /* ignore */ }
  }

  const results = { created: 0, updated: 0, deleted: 0 };

  try {
    const baseParams: Record<string, string | boolean | number> = {
      calendarId: 'primary',
      singleEvents: true,
      maxResults: 250,
    };

    if (syncToken) {
      baseParams.syncToken = syncToken;
    } else {
      baseParams.timeMin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      baseParams.timeMax = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    do {
      const params = pageToken ? { ...baseParams, pageToken } : baseParams;
      const response = await calendar.events.list(params);
      const items = response.data.items ?? [];
      nextSyncToken = response.data.nextSyncToken ?? undefined;
      pageToken = response.data.nextPageToken ?? undefined;

      for (const ev of items) {
        const gcalId = ev.id!;

        // Handle deleted events — remove from DB if we have them
        if (ev.status === 'cancelled') {
          const hit = db.prepare('SELECT id FROM events WHERE gcal_event_id = ?').get(gcalId);
          if (hit) {
            db.prepare('DELETE FROM events WHERE gcal_event_id = ?').run(gcalId);
            results.deleted++;
          }
          continue;
        }

        // Only import/update events with our color, or events already in our DB
        const inDb = db.prepare('SELECT id FROM events WHERE gcal_event_id = ?').get(gcalId) as { id: number } | undefined;
        if (ev.colorId !== SYNC_COLOR_ID && !inDb) continue;

        // Parse our structured description fields
        const descText = ev.description ?? '';
        const field = (prefix: string) => {
          const m = descText.match(new RegExp(`^${prefix}: (.+)$`, 'm'));
          return m ? m[1] : '';
        };

        const priorityRaw = field('Prioridade');
        const priority =
          priorityRaw === 'Alta' ? 'alta' :
          priorityRaw === 'Baixa' ? 'baixa' : 'media';

        const decisionRaw = field('Decisão');
        const decision =
          decisionRaw === 'Participar' ? 'participar' :
          decisionRaw === 'Analisar' ? 'analisar' : 'nao_participar';

        const dateStart = ev.start?.dateTime ?? ev.start?.date ?? '';
        const dateEnd = ev.end?.dateTime ?? ev.end?.date ?? dateStart;
        const allDay = !ev.start?.dateTime ? 1 : 0;
        const attendees = (ev.attendees ?? []).map((a) => a.email ?? '').filter(Boolean).join(', ');

        if (inDb) {
          db.prepare(`
            UPDATE events SET
              title=?, theme=?, date_start=?, date_end=?, all_day=?,
              location=?, organizer=?, description=?, priority=?, decision=?,
              attendees=?, notes=?
            WHERE gcal_event_id=?
          `).run(
            ev.summary ?? 'Sem título',
            field('Tema'), dateStart, dateEnd, allDay,
            ev.location ?? '', field('Organizador'), field('Descrição'),
            priority, decision, attendees, field('Observações'),
            gcalId
          );
          results.updated++;
        } else {
          db.prepare(`
            INSERT INTO events
              (title, theme, date_start, date_end, all_day, location, organizer,
               description, priority, decision, attendees, notes, gcal_event_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            ev.summary ?? 'Sem título',
            field('Tema'), dateStart, dateEnd, allDay,
            ev.location ?? '', field('Organizador'), field('Descrição'),
            priority, decision, attendees, field('Observações'),
            gcalId
          );
          results.created++;
        }
      }
    } while (pageToken);

    if (nextSyncToken) {
      fs.writeFileSync(SYNC_TOKEN_PATH, JSON.stringify({ syncToken: nextSyncToken }));
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    // 410 = syncToken expired — reset and let next call do full sync
    const code = (err as { code?: number })?.code;
    if (code === 410) {
      if (fs.existsSync(SYNC_TOKEN_PATH)) fs.unlinkSync(SYNC_TOKEN_PATH);
      return NextResponse.json({ error: 'sync_token_expired' }, { status: 410 });
    }
    console.error('pull-from-gcal error:', err);
    return NextResponse.json({ error: 'Erro ao sincronizar com Google Calendar' }, { status: 500 });
  }
}

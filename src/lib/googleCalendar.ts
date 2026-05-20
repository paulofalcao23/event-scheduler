import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import type { Event } from './types';

const TOKEN_PATH = path.join(process.cwd(), 'data', '.token.json');

export function isAuthenticated(): boolean {
  return fs.existsSync(TOKEN_PATH);
}

export function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  oauth2Client.setCredentials(tokens);

  oauth2Client.on('tokens', (newTokens) => {
    const existing = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...existing, ...newTokens }));
  });

  return oauth2Client;
}

export function getAuthUrl(): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent',
    login_hint: 'paulo.falcao@astrainfra.com.br',
    hd: 'astrainfra.com.br',
  });
}

export async function saveToken(code: string): Promise<void> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
}

export async function createCalendarEvent(event: Event): Promise<string> {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });

  const descriptionLines = [
    event.theme ? `Tema: ${event.theme}` : '',
    event.organizer ? `Organizador: ${event.organizer}` : '',
    `Prioridade: ${event.priority === 'alta' ? 'Alta' : event.priority === 'media' ? 'Média' : 'Baixa'}`,
    `Decisão: ${event.decision === 'participar' ? 'Participar' : 'Não Participar'}`,
    event.description ? `Descrição: ${event.description}` : '',
    event.notes ? `Observações: ${event.notes}` : '',
  ].filter(Boolean);

  const attendeeList = event.attendees
    ? event.attendees
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.includes('@'))
        .map((email) => ({ email }))
    : [];

  const isAllDay = Boolean(event.all_day);
  const dateStr = event.date_start.split('T')[0];

  const startObj = isAllDay
    ? { dateTime: `${dateStr}T08:00:00`, timeZone: 'America/Sao_Paulo' }
    : { dateTime: new Date(event.date_start).toISOString(), timeZone: 'America/Sao_Paulo' };

  const endObj = isAllDay
    ? { dateTime: `${dateStr}T18:00:00`, timeZone: 'America/Sao_Paulo' }
    : event.date_end
    ? { dateTime: new Date(event.date_end).toISOString(), timeZone: 'America/Sao_Paulo' }
    : { dateTime: new Date(new Date(event.date_start).getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'America/Sao_Paulo' };

  // Analisar → 30 dias antes (43200 min); demais → 10 dias antes (14400 min)
  const reminderMinutes = event.decision === 'analisar' ? 43200 : 14400;

  const response = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    requestBody: {
      summary: event.title,
      description: descriptionLines.join('\n'),
      location: event.location || undefined,
      colorId: '10',
      start: startObj,
      end: endObj,
      attendees: attendeeList.length > 0 ? attendeeList : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: reminderMinutes },
          { method: 'email', minutes: reminderMinutes },
        ],
      },
    },
  });

  return response.data.id!;
}

export async function updateCalendarEvent(gcalEventId: string, event: Event): Promise<void> {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });

  const descriptionLines = [
    event.theme ? `Tema: ${event.theme}` : '',
    event.organizer ? `Organizador: ${event.organizer}` : '',
    `Prioridade: ${event.priority === 'alta' ? 'Alta' : event.priority === 'media' ? 'Média' : 'Baixa'}`,
    `Decisão: ${event.decision === 'participar' ? 'Participar' : event.decision === 'analisar' ? 'Analisar' : 'Não Participar'}`,
    event.description ? `Descrição: ${event.description}` : '',
    event.notes ? `Observações: ${event.notes}` : '',
  ].filter(Boolean);

  const attendeeList = event.attendees
    ? event.attendees.split(',').map((e) => e.trim()).filter((e) => e.includes('@')).map((email) => ({ email }))
    : [];

  const isAllDay = Boolean(event.all_day);
  const dateStr = event.date_start.split('T')[0];

  const startObj = isAllDay
    ? { dateTime: `${dateStr}T08:00:00`, timeZone: 'America/Sao_Paulo' }
    : { dateTime: new Date(event.date_start).toISOString(), timeZone: 'America/Sao_Paulo' };

  const endObj = isAllDay
    ? { dateTime: `${dateStr}T18:00:00`, timeZone: 'America/Sao_Paulo' }
    : event.date_end
    ? { dateTime: new Date(event.date_end).toISOString(), timeZone: 'America/Sao_Paulo' }
    : { dateTime: new Date(new Date(event.date_start).getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'America/Sao_Paulo' };

  // Analisar → 30 dias antes; demais → 10 dias antes
  const reminderMinutes = event.decision === 'analisar' ? 43200 : 14400;

  await calendar.events.update({
    calendarId: 'primary',
    eventId: gcalEventId,
    sendUpdates: 'all',
    requestBody: {
      summary: event.title,
      description: descriptionLines.join('\n'),
      location: event.location || undefined,
      colorId: '10',
      start: startObj,
      end: endObj,
      attendees: attendeeList.length > 0 ? attendeeList : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: reminderMinutes },
          { method: 'email', minutes: reminderMinutes },
        ],
      },
    },
  });
}

export async function deleteCalendarEvent(gcalEventId: string): Promise<void> {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: gcalEventId,
    sendUpdates: 'all',
  });
}

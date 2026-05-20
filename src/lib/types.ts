export interface Event {
  id: number;
  title: string;
  theme: string;
  date_start: string;
  date_end: string;
  all_day: number;
  location: string;
  organizer: string;
  description: string | null;
  priority: 'alta' | 'media' | 'baixa';
  decision: 'participar' | 'nao_participar' | 'analisar';
  attendees: string | null;
  notes: string | null;
  gcal_event_id: string | null;
  created_at: string;
}

export interface CreateEventPayload {
  title: string;
  theme: string;
  date_start: string;
  date_end: string;
  all_day: boolean;
  location: string;
  organizer: string;
  description?: string;
  priority: 'alta' | 'media' | 'baixa';
  decision: 'participar' | 'nao_participar' | 'analisar';
  attendees?: string;
  notes?: string;
}

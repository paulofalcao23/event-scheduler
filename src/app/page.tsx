'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import EventForm from '@/components/EventForm';
import EventTable from '@/components/EventTable';
import { useEvents } from '@/hooks/useEvents';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function Home() {
  const { events, loading, error, refetch } = useEvents();
  const [calConnected, setCalConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pullStatus, setPullStatus] = useState<string | null>(null);
  const pullTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setCalConnected(d.authenticated))
      .catch(() => setCalConnected(false));
  }, []);

  const pullFromGcal = useCallback(async (silent = true) => {
    if (!silent) setPullStatus('Buscando eventos do Google Calendar...');
    try {
      const res = await fetch('/api/pull-from-gcal', { method: 'POST' });
      if (res.status === 410) {
        // Sync token expired — retry once (server reset the token)
        await fetch('/api/pull-from-gcal', { method: 'POST' });
      }
      if (res.ok) {
        const data = await res.json();
        if (data.created > 0 || data.updated > 0 || data.deleted > 0) {
          refetch();
          if (!silent) {
            setPullStatus(
              `Sincronizado: ${data.created} novo(s), ${data.updated} atualizado(s), ${data.deleted} removido(s).`
            );
            setTimeout(() => setPullStatus(null), 4000);
          }
        } else if (!silent) {
          setPullStatus('Nenhuma novidade no Google Calendar.');
          setTimeout(() => setPullStatus(null), 3000);
        }
      }
    } catch {
      if (!silent) {
        setPullStatus('Erro ao buscar do Google Calendar.');
        setTimeout(() => setPullStatus(null), 3000);
      }
    }
  }, [refetch]);

  // Auto-poll when connected
  useEffect(() => {
    if (!calConnected) return;
    pullFromGcal(true); // immediate silent pull on load
    pullTimerRef.current = setInterval(() => pullFromGcal(true), POLL_INTERVAL_MS);
    return () => {
      if (pullTimerRef.current) clearInterval(pullTimerRef.current);
    };
  }, [calConnected, pullFromGcal]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Sincronização concluída: ${data.synced} evento(s) enviados ao Google Calendar.`);
        refetch();
      } else {
        alert('Erro ao sincronizar: ' + (data.error || 'Tente novamente.'));
      }
    } catch {
      alert('Erro ao sincronizar. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      refetch();
    } catch {
      alert('Erro ao excluir o evento. Tente novamente.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Agendamento de Eventos</h1>
              <p className="text-xs text-gray-500">Gerencie seus eventos com Google Calendar</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pullStatus && (
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full animate-pulse">
                {pullStatus}
              </span>
            )}
            {calConnected === null ? null : calConnected ? (
              <button
                onClick={() => pullFromGcal(false)}
                title="Buscar atualizações do Google Calendar agora"
                className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Google Calendar conectado ↺
              </button>
            ) : (
              <a
                href="/setup"
                className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                Conectar Google Calendar
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
          {/* Form column */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">+</span>
              Cadastrar Novo Evento
            </h2>
            <EventForm onSuccess={refetch} />
          </div>

          {/* Table column */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-lg">🗓</span>
                Eventos Agendados
                {!loading && (
                  <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {events.length} {events.length === 1 ? 'evento' : 'eventos'}
                  </span>
                )}
              </h2>

              {!loading && calConnected && events.some((e) => !e.gcal_event_id) && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {syncing ? 'Sincronizando...' : '↑ Sincronizar com Google Calendar'}
                </button>
              )}
              {!loading && calConnected === false && events.some((e) => !e.gcal_event_id) && (
                <p className="text-xs text-orange-600">
                  Conecte o Google Calendar para sincronizar eventos
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <EventTable events={events} loading={loading} onDelete={handleDelete} onRefresh={refetch} />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs text-gray-400 px-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            Participar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
            Não Participar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-green-500 font-bold">✓</span>
            Sincronizado com Google Calendar (lembrete 10 dias antes)
          </span>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import PriorityBadge from './PriorityBadge';
import DecisionBadge from './DecisionBadge';
import EditEventModal from './EditEventModal';
import type { Event } from '@/lib/types';

interface EventTableProps {
  events: Event[];
  loading: boolean;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

type SortField = 'title' | 'theme' | 'date_start' | 'location' | 'organizer' | 'priority' | 'decision';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER = { alta: 0, media: 1, baixa: 2 };

function formatDateTime(start: string, end: string, allDay: number): string {
  if (allDay) {
    return new Date(start + 'T00:00:00').toLocaleDateString('pt-BR');
  }
  const s = new Date(start).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  if (!end || end === start) return s;
  const e = new Date(end).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  return `${s} → ${e}`;
}

function downloadCSV(events: Event[]) {
  const headers = [
    'Título', 'Tema', 'Início', 'Fim', 'Dia Inteiro', 'Local',
    'Organizador', 'Prioridade', 'Decisão', 'Convidados', 'Descrição', 'Observações',
  ];
  const priorityLabel = (p: string) =>
    p === 'alta' ? 'Alta' : p === 'media' ? 'Média' : 'Baixa';
  const decisionLabel = (d: string) =>
    d === 'participar' ? 'Participar' : 'Não Participar';

  const rows = events.map((ev) => [
    ev.title,
    ev.theme ?? '',
    ev.date_start,
    ev.date_end ?? '',
    ev.all_day ? 'Sim' : 'Não',
    ev.location ?? '',
    ev.organizer ?? '',
    priorityLabel(ev.priority),
    decisionLabel(ev.decision),
    ev.attendees ?? '',
    ev.description ?? '',
    ev.notes ?? '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eventos_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function EventTable({ events, loading, onDelete, onRefresh }: EventTableProps) {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterDecision, setFilterDecision] = useState<'all' | 'participar' | 'nao_participar' | 'analisar'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'alta' | 'media' | 'baixa'>('all');
  const [filterOrganizer, setFilterOrganizer] = useState('');
  const [sortField, setSortField] = useState<SortField>('date_start');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const organizers = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const ev of events) {
      if (ev.organizer && !seen.has(ev.organizer)) {
        seen.add(ev.organizer);
        result.push(ev.organizer);
      }
    }
    return result.sort();
  }, [events]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (filterDecision !== 'all' && ev.decision !== filterDecision) return false;
      if (filterPriority !== 'all' && ev.priority !== filterPriority) return false;
      if (filterOrganizer && ev.organizer !== filterOrganizer) return false;
      if (filterDateFrom && ev.date_start < filterDateFrom) return false;
      if (filterDateTo && ev.date_start > filterDateTo + 'T23:59') return false;
      return true;
    });
  }, [events, filterDecision, filterPriority, filterOrganizer, filterDateFrom, filterDateTo]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (sortField === 'priority') {
        av = PRIORITY_ORDER[a.priority];
        bv = PRIORITY_ORDER[b.priority];
        return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
      }

      av = (a[sortField] ?? '') as string;
      bv = (b[sortField] ?? '') as string;
      const cmp = av.localeCompare(bv, 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const hasFilters =
    filterDateFrom || filterDateTo || filterDecision !== 'all' || filterPriority !== 'all' || filterOrganizer;

  const inputClass =
    'border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const selectClass =
    'border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function Th({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <th
        className="px-3 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:text-blue-600 whitespace-nowrap"
        onClick={() => handleSort(field)}
      >
        {children}
        <SortIcon field={field} />
      </th>
    );
  }

  return (
    <>
    {editingEvent && (
      <EditEventModal
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onSuccess={() => { setEditingEvent(null); onRefresh(); }}
      />
    )}
    <div className="space-y-3">
      {/* Filtros */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros</span>
          {hasFilters && (
            <button
              onClick={() => {
                setFilterDateFrom(''); setFilterDateTo('');
                setFilterDecision('all'); setFilterPriority('all');
                setFilterOrganizer('');
              }}
              className="text-xs text-red-500 hover:text-red-700 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">De</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Até</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Decisão</label>
            <select value={filterDecision} onChange={(e) => setFilterDecision(e.target.value as typeof filterDecision)} className={selectClass}>
              <option value="all">Todas</option>
              <option value="participar">Participar</option>
              <option value="analisar">Analisar</option>
              <option value="nao_participar">Não Participar</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Prioridade</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)} className={selectClass}>
              <option value="all">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
          {organizers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">Organizador</label>
              <select value={filterOrganizer} onChange={(e) => setFilterOrganizer(e.target.value)} className={selectClass}>
                <option value="">Todos</option>
                {organizers.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {loading ? '' : `Mostrando ${sorted.length} de ${events.length} eventos`}
        </p>
        {!loading && sorted.length > 0 && (
          <button
            onClick={() => downloadCSV(sorted)}
            className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors font-medium"
          >
            ⬇ Baixar CSV
          </button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Carregando eventos...
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
          <p className="text-sm">
            {events.length === 0
              ? 'Nenhum evento cadastrado.'
              : 'Nenhum evento encontrado com os filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <Th field="title">Título</Th>
                <Th field="theme">Tema</Th>
                <Th field="date_start">Data</Th>
                <Th field="location">Local</Th>
                <Th field="organizer">Organizador</Th>
                <Th field="priority">Prioridade</Th>
                <Th field="decision">Decisão</Th>
                <th className="px-3 py-3 font-semibold text-gray-600 text-center">Cal.</th>
                <th className="px-3 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((event, i) => (
                <tr
                  key={event.id}
                  className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-gray-50/40'
                  }`}
                >
                  <td className="px-3 py-3 font-medium text-gray-900 max-w-[150px]">
                    <div className="truncate" title={event.title}>{event.title}</div>
                    {event.description && (
                      <div className="text-xs text-gray-400 truncate mt-0.5" title={event.description}>
                        {event.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate max-w-[100px]" title={event.theme ?? ''}>{event.theme}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs">
                    {formatDateTime(event.date_start, event.date_end, event.all_day)}
                    {Boolean(event.all_day) && (
                      <div className="text-gray-400">dia inteiro</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate max-w-[100px]" title={event.location ?? ''}>{event.location}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate max-w-[100px]" title={event.organizer ?? ''}>{event.organizer}</div>
                  </td>
                  <td className="px-3 py-3">
                    <PriorityBadge priority={event.priority} />
                  </td>
                  <td className="px-3 py-3">
                    <DecisionBadge decision={event.decision} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {event.gcal_event_id ? (
                      <span title="Sincronizado com Google Calendar" className="text-green-500">✓</span>
                    ) : (
                      <span title="Não sincronizado" className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingEvent(event)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 text-xs font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir o evento "${event.title}"?`)) {
                            onDelete(event.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-2 py-1 text-xs font-medium transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
}

'use client';

import { useState } from 'react';
import type { CreateEventPayload } from '@/lib/types';

interface EventFormProps {
  onSuccess: () => void;
}

const emptyForm: CreateEventPayload = {
  title: '',
  theme: '',
  date_start: '',
  date_end: '',
  all_day: false,
  location: '',
  organizer: '',
  description: '',
  priority: 'alta',
  decision: 'participar',
  attendees: '',
  notes: '',
};

const inputClass =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

const selectClass =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export default function EventForm({ onSuccess }: EventFormProps) {
  const [form, setForm] = useState<CreateEventPayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
      // Ao ativar dia inteiro, limpa o campo fim (não é mais necessário)
      if (name === 'all_day' && checked) {
        updated.date_end = '';
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Para evento dia inteiro, fim = início (será tratado no backend/calendar)
      const payload: CreateEventPayload = {
        ...form,
        date_end: form.all_day ? form.date_start : form.date_end,
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar evento');
      }

      setForm(emptyForm);
      setSuccess(true);
      onSuccess();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Título */}
      <div>
        <label className={labelClass}>
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          placeholder="Nome do evento"
          className={inputClass}
        />
      </div>

      {/* Tema */}
      <div>
        <label className={labelClass}>Tema</label>
        <input
          type="text"
          name="theme"
          value={form.theme}
          onChange={handleChange}
          placeholder="Ex: Tecnologia, Negócios..."
          className={inputClass}
        />
      </div>

      {/* Datas */}
      <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="all_day"
            name="all_day"
            checked={form.all_day}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="all_day" className="text-sm font-medium text-gray-700 cursor-pointer">
            Evento de dia inteiro
            <span className="ml-1 text-xs text-gray-400">(agenda: 08h – 18h)</span>
          </label>
        </div>

        <div className={`grid gap-3 ${form.all_day ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <div>
            <label className={labelClass}>
              {form.all_day ? 'Data' : 'Início'} <span className="text-red-500">*</span>
            </label>
            <input
              type={form.all_day ? 'date' : 'datetime-local'}
              name="date_start"
              value={form.date_start}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>

          {!form.all_day && (
            <div>
              <label className={labelClass}>Fim</label>
              <input
                type="datetime-local"
                name="date_end"
                value={form.date_end}
                onChange={handleChange}
                min={form.date_start || undefined}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {/* Local e Organizador */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Local</label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Endereço ou link online"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Organizador</label>
          <input
            type="text"
            name="organizer"
            value={form.organizer}
            onChange={handleChange}
            placeholder="Nome do organizador"
            className={inputClass}
          />
        </div>
      </div>

      {/* Prioridade e Decisão */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Prioridade <span className="text-red-500">*</span>
          </label>
          <select name="priority" value={form.priority} onChange={handleChange} className={selectClass}>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            Decisão <span className="text-red-500">*</span>
          </label>
          <select name="decision" value={form.decision} onChange={handleChange} className={selectClass}>
            <option value="participar">Participar</option>
            <option value="analisar">Analisar</option>
            <option value="nao_participar">Não Participar</option>
          </select>
        </div>
      </div>

      {/* Convidar participantes */}
      <div>
        <label className={labelClass}>Convidar participantes</label>
        <input
          type="text"
          name="attendees"
          value={form.attendees}
          onChange={handleChange}
          placeholder="email1@ex.com, email2@ex.com"
          className={inputClass}
        />
        <p className="text-xs text-gray-400 mt-1">
          Separe os e-mails por vírgula. Os convidados receberão o invite pelo Google Calendar.
        </p>
      </div>

      {/* Descrição */}
      <div>
        <label className={labelClass}>Descrição</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          placeholder="Detalhes do evento..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Observações */}
      <div>
        <label className={labelClass}>Observações</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          placeholder="Notas pessoais..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Evento cadastrado com sucesso!
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors"
      >
        {loading ? 'Salvando...' : 'Salvar Evento'}
      </button>
    </form>
  );
}

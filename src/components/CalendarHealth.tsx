import React, { useState } from 'react';
import { CalendarCheck, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Loader2, RefreshCw } from 'lucide-react';

type Check = { id: string; label: string; status: 'ok' | 'warn' | 'error' | 'unknown'; detail: string };
type Report = { overall: 'ok' | 'warn' | 'error'; checks: Check[] };

const ICON = {
  ok: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
  error: <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
  unknown: <HelpCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />,
};

/** Advisor-only: one click to know whether the slots offered to sellers really are Céline's availability. */
export const CalendarHealth: React.FC = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cal/diagnostic', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setReport(await res.json());
    } catch (e: any) {
      setError(e.message || 'Diagnostic impossible');
    } finally {
      setLoading(false);
    }
  };

  const tone =
    report?.overall === 'ok' ? 'border-emerald-200 bg-emerald-50/60' : report?.overall === 'error' ? 'border-rose-200 bg-rose-50/60' : 'border-stone-200 bg-white';

  return (
    <section aria-labelledby="cal-health-title" className={`mb-4 rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-stone-700" />
          <h2 id="cal-health-title" className="text-sm font-semibold text-stone-900">
            Synchronisation de l'agenda de Céline
          </h2>
        </div>
        <button
          type="button"
          id="btn-run-cal-diagnostic"
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:bg-stone-500 text-white text-xs font-semibold px-3 py-2"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {report ? 'Revérifier' : 'Vérifier maintenant'}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>}
      {report && (
        <ul className="mt-3 space-y-2">
          {report.checks.map((c) => (
            <li key={c.id} className="flex gap-2 text-sm">
              {ICON[c.status]}
              <span>
                <span className="font-semibold text-stone-900">{c.label}.</span> <span className="text-stone-700">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

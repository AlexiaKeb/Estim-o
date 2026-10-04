import React, { useState } from 'react';
import { Lead } from '../types';
import { ClipboardCheck, RefreshCw, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

const OWNERSHIP = { seul: 'Seul propriétaire', plusieurs: 'Plusieurs propriétaires', pas_encore: 'Pas encore propriétaire' } as const;
const MANDATE = { aucun: 'Aucun mandat', estimations: 'Estimations reçues, sans mandat', simple: 'Mandat simple ailleurs', exclusif: 'Mandat exclusif ailleurs' } as const;
const OCCUPANCY = { occupe: 'Occupé par le propriétaire', libre: 'Libre', loue: 'Loué' } as const;

interface Props {
  lead: Lead;
  onBrief: (brief: NonNullable<Lead['brief']>) => void;
}

/** Why this score, what the seller said, and the visit brief: the part of the AI that saves Céline time. */
export const PreVisitBrief: React.FC<Props> = ({ lead, onBrief }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = lead.qualification;
  const answers = [
    q?.ownership && OWNERSHIP[q.ownership],
    q?.mandate && MANDATE[q.mandate],
    q?.occupancy && OCCUPANCY[q.occupancy],
    q?.expectedPrice ? `Prix espéré : ${q.expectedPrice.toLocaleString('fr-FR')} €` : null,
  ].filter(Boolean) as string[];

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/leads/${encodeURIComponent(lead.id)}/brief`, { method: 'POST', credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      onBrief(data.brief);
    } catch (e: any) {
      setError(e.message || 'Génération impossible');
    } finally {
      setLoading(false);
    }
  };

  const b = lead.brief;
  return (
    <section aria-labelledby="brief-title" className="bg-white rounded-2xl border-2 border-emerald-500/30 p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id="brief-title" className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          Fiche de pré-visite
        </h4>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {b ? 'Actualiser' : 'Préparer la fiche'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}

      {/* Why this score */}
      <div>
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pourquoi ce score ({lead.score}/100)</div>
        {lead.scoreReasons && lead.scoreReasons.length > 0 ? (
          <ul className="space-y-1">
            {lead.scoreReasons.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-xs text-slate-700">
                <span>{r.label}</span>
                <span className={`font-mono font-bold ${r.points > 0 ? 'text-emerald-700' : r.points < 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                  {r.points > 0 ? `+${r.points}` : r.points}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Détail indisponible pour cette fiche.</p>
        )}
      </div>

      {lead.blockers && lead.blockers.length > 0 && (
        <ul className="space-y-1.5">
          {lead.blockers.map((t, i) => (
            <li key={i} className="flex gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {t}
            </li>
          ))}
        </ul>
      )}

      <div>
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Réponses du vendeur</div>
        {answers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {answers.map((a) => (
              <span key={a} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">{a}</span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Le vendeur n'a pas répondu aux questions rapides.</p>
        )}
      </div>

      {b && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-800 leading-relaxed">{b.summary}</p>
          {b.strengths.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Points favorables</div>
              <ul className="space-y-1">
                {b.strengths.map((t, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-700"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />{t}</li>
                ))}
              </ul>
            </div>
          )}
          {b.watchouts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">À surveiller</div>
              <ul className="space-y-1">
                {b.watchouts.map((t, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-700"><AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />{t}</li>
                ))}
              </ul>
            </div>
          )}
          {b.questions.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">Questions à poser pendant la visite</div>
              <ul className="space-y-1">
                {b.questions.map((t, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-700"><HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />{t}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-slate-400">
            {b.source === 'ia' ? 'Rédigée par l\'assistant IA à partir des seules données du dossier.' : 'Générée à partir des règles de qualification (IA indisponible).'}
            {b.generatedAt ? ` · ${new Date(b.generatedAt).toLocaleString('fr-FR')}` : ''}
          </p>
        </div>
      )}
    </section>
  );
};

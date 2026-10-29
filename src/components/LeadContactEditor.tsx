import React, { useState } from 'react';
import { Pencil, Loader2, Check } from 'lucide-react';
import type { Lead } from '../types';
import { saveLeadContact } from '../lib/supabaseService';

const isDbId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Dossier client : correction des coordonnées (nom, téléphone, e-mail, adresse du bien, ville). */
export const LeadContactEditor: React.FC<{ lead: Lead; onUpdate: (l: Lead) => void }> = ({ lead, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const start = () => {
    setForm({ name: lead.name || '', phone: lead.phone || '', email: lead.email || '', address: lead.address || '', city: lead.city || '' });
    setError(null);
    setSaved(false);
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const err = isDbId(lead.id) ? await saveLeadContact(lead.id, form) : null;
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    const clean = { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim().toLowerCase(), address: form.address.trim(), city: form.city.trim() };
    onUpdate({
      ...lead,
      ...clean,
      address: clean.address || undefined,
      activities: [{ id: `act-${Date.now()}`, type: 'note', label: 'Coordonnées du contact modifiées', date: "À l'instant" }, ...(lead.activities || [])],
    });
    setOpen(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const field = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm';
  const lab = 'block text-[10px] font-bold uppercase text-stone-500 mb-1';

  return (
    <div id="lead-contact-editor">
      {!open ? (
        <div className="flex items-center gap-3">
          <button type="button" id="btn-edit-contact" onClick={start} className="inline-flex items-center gap-2 rounded-xl border-2 border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-800 hover:border-stone-500">
            <Pencil className="w-4 h-4" /> Modifier les coordonnées
          </button>
          {saved && <span role="status" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700"><Check className="w-4 h-4" /> Coordonnées enregistrées</span>}
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); void save(); }}
          className="space-y-3 rounded-2xl border-2 border-stone-300 bg-white p-4 shadow-xs"
          aria-label="Modifier les coordonnées du contact"
        >
          <p className="text-sm font-extrabold text-stone-900">Modifier les coordonnées</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="ce-name" className={lab}>Nom</label><input id="ce-name" className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" /></div>
            <div><label htmlFor="ce-phone" className={lab}>Téléphone</label><input id="ce-phone" className={field} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="off" /></div>
            <div><label htmlFor="ce-email" className={lab}>E-mail</label><input id="ce-email" className={field} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" /></div>
            <div><label htmlFor="ce-city" className={lab}>Ville du bien</label><input id="ce-city" className={field} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} autoComplete="off" /></div>
            <div className="sm:col-span-2"><label htmlFor="ce-address" className={lab}>Adresse du bien</label><input id="ce-address" className={field} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="off" /></div>
          </div>
          {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" id="btn-save-contact" disabled={busy} className="inline-flex items-center gap-2 rounded-xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-4 py-2 text-sm font-black text-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F] disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold underline text-stone-600">Annuler</button>
          </div>
          <p className="text-[11px] text-stone-500">Le rendez-vous déjà réservé sur l'agenda (Cal.com) garde l'e-mail d'origine du client. Les prochains e-mails partiront à la nouvelle adresse.</p>
        </form>
      )}
    </div>
  );
};

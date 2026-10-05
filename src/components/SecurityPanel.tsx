import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, X, Copy, Check, Loader2, LogOut } from 'lucide-react';

interface Props {
  onClose: () => void;
  onLoggedOut: () => void;
}

/** Sécurité du compte conseiller : double authentification et déconnexion de tous les appareils. */
export const SecurityPanel: React.FC<Props> = ({ onClose, onLoggedOut }) => {
  const [state, setState] = useState<{ enabled: boolean; secret?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/agent/2fa', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setState({ enabled: Boolean(d.enabled), secret: d.secret }))
      .catch(() => setState({ enabled: false }));
  }, []);

  const logoutAll = async () => {
    if (!window.confirm('Déconnecter tous les appareils, y compris celui-ci ?')) return;
    setBusy(true);
    try {
      await fetch('/api/agent/logout-all', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setBusy(false);
      onLoggedOut();
    }
  };

  const copy = async () => {
    if (!state?.secret) return;
    try {
      await navigator.clipboard.writeText(state.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* copie manuelle */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60" role="dialog" aria-modal="true" aria-labelledby="sec-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-stone-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id="sec-title" className="text-lg font-bold text-stone-900">Sécurité de votre accès</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"><X className="w-4 h-4" /></button>
        </div>

        {state === null ? (
          <p className="text-sm text-stone-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Chargement…</p>
        ) : state.enabled ? (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className="font-semibold">Double authentification activée</p>
              <p>Un code à 6 chiffres est demandé à chaque connexion, en plus du mot de passe.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Double authentification non activée</p>
                <p>C'est la meilleure protection : même avec votre mot de passe, personne ne peut entrer sans votre téléphone.</p>
              </div>
            </div>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-stone-700">
              <li>Installez une application d'authentification (Google Authenticator, Microsoft Authenticator, 1Password…).</li>
              <li>Ajoutez un compte avec « saisir une clé de configuration », puis recopiez cette clé :
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-stone-100 border border-stone-200 px-3 py-2">
                  <code className="flex-1 font-mono text-sm tracking-wider break-all select-all">{state.secret}</code>
                  <button type="button" onClick={copy} className="shrink-0 p-1.5 rounded-md hover:bg-white text-stone-600" aria-label="Copier la clé">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </li>
              <li>Sur Render (Environment), ajoutez la variable <code className="font-mono bg-stone-100 px-1 rounded">AGENT_TOTP_SECRET</code> avec cette même clé, puis enregistrez : le service redémarre.</li>
              <li>À la prochaine connexion, un champ « Code à 6 chiffres » apparaît.</li>
            </ol>
            <p className="text-xs text-stone-500">Cette clé n'est affichée que tant que la protection n'est pas activée. Ne la partagez avec personne.</p>
          </div>
        )}

        <div className="border-t border-stone-200 pt-4">
          <h3 className="font-semibold text-stone-900 text-sm">Appareils connectés</h3>
          <p className="text-sm text-stone-600 mt-1">Perdu un appareil ou connecté sur un ordinateur partagé ? Fermez toutes les sessions d'un clic.</p>
          <button type="button" onClick={logoutAll} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 px-4 py-2 text-sm font-semibold disabled:opacity-50">
            <LogOut className="w-4 h-4" />
            Me déconnecter partout
          </button>
        </div>
      </div>
    </div>
  );
};

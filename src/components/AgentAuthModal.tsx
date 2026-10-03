import React, { useEffect, useRef, useState } from 'react';
import { Lock, X, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { AgentPrivacySettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rememberSession: boolean) => void;
  settings: AgentPrivacySettings;
}

/** Advisor login. The password is checked by the server (AGENT_PASSWORD); nothing is stored in the browser. */
export const AgentAuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authenticated) {
        setPassword('');
        onSuccess(remember);
      } else {
        setError(data.error || 'Connexion impossible. Réessayez.');
      }
    } catch {
      setError('Serveur injoignable. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-auth-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-stone-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <h2 id="agent-auth-title" className="font-semibold text-stone-900">Espace conseiller</h2>
              <p className="text-xs text-stone-500">Accès réservé</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="agent-password" className="text-xs font-semibold uppercase tracking-wider text-stone-700">
            Mot de passe
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="agent-password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-500 hover:text-stone-900"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded border-stone-300" />
          Rester connecté sur cet appareil (30 jours)
        </label>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          id="btn-agent-login"
          disabled={!password || loading}
          className="w-full rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white font-semibold py-3 text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Se connecter
        </button>
      </form>
    </div>
  );
};

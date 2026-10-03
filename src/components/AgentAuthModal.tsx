import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Building2,
  ArrowRight,
  ShieldAlert,
  Smartphone,
  Key,
  Clock,
  Laptop
} from 'lucide-react';
import { AgentPrivacySettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rememberSession: boolean) => void;
  settings: AgentPrivacySettings;
}

export const AgentAuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  settings,
}) => {
  const [authTab, setAuthTab] = useState<'pin' | 'password'>('pin');
  const [pinInput, setPinInput] = useState('');
  const [emailInput, setEmailInput] = useState(settings.agentEmail || 'celine@estimeo.fr');
  const [passwordInput, setPasswordInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(true);
  
  // Anti brute-force security
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);
  
  const pinInputRef = useRef<HTMLInputElement>(null);
  const passInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer when locked out
  useEffect(() => {
    let interval: any = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setPasswordInput('');
      setErrorMsg(null);
      setTimeout(() => {
        if (authTab === 'pin') {
          pinInputRef.current?.focus();
        } else {
          passInputRef.current?.focus();
        }
      }, 150);
    }
  }, [isOpen, authTab]);

  if (!isOpen) return null;

  const MAX_ATTEMPTS = 5;

  const handleFailedAttempt = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);

    if (nextAttempts >= MAX_ATTEMPTS) {
      setLockoutTimer(60);
      setErrorMsg(`Protection anti-intrusion activée : Trop d'échecs consécutifs. Accès suspendu pendant 60 secondes.`);
    } else {
      const remaining = MAX_ATTEMPTS - nextAttempts;
      setErrorMsg(`Code ou identifiant invalide. Il vous reste ${remaining} tentative${remaining > 1 ? 's' : ''} avant verrouillage temporaire.`);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    const effectivePin = (settings.agentPinCode || '1234').trim();
    if (pinInput.trim() === effectivePin) {
      setFailedAttempts(0);
      setErrorMsg(null);
      onSuccess(rememberDevice);
      onClose();
    } else {
      setPinInput('');
      pinInputRef.current?.focus();
      handleFailedAttempt();
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    const expectedEmail = (settings.agentEmail || 'celine@estimeo.fr').toLowerCase().trim();
    const expectedPassword = (settings.agentPassword || 'Estimeo2026!').trim();

    if (
      emailInput.toLowerCase().trim() === expectedEmail &&
      passwordInput.trim() === expectedPassword
    ) {
      setFailedAttempts(0);
      setErrorMsg(null);
      onSuccess(rememberDevice);
      onClose();
    } else {
      setPasswordInput('');
      passInputRef.current?.focus();
      handleFailedAttempt();
    }
  };

  const handleQuickDigit = (digit: string) => {
    if (lockoutTimer > 0) return;
    if (pinInput.length < 8) {
      const nextVal = pinInput + digit;
      setPinInput(nextVal);
      setErrorMsg(null);
      const effectivePin = (settings.agentPinCode || '1234').trim();
      if (nextVal === effectivePin) {
        setFailedAttempts(0);
        onSuccess(rememberDevice);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95">
        {/* Header with Dark Warm Stone theme */}
        <div className="bg-stone-900 text-stone-100 p-5 sm:p-6 relative border-b border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 text-white flex items-center justify-center shadow-2xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[10px] font-medium uppercase tracking-wider border border-stone-700">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Espace Conseiller Sécurisé
              </div>
              <h3 className="text-lg font-semibold text-white tracking-tight mt-0.5">
                Authentification Pro
              </h3>
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-2 font-normal">
            Accès confidentiel réservé : CRM, scoring des dossiers vendeurs, séquences de relance et barèmes.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center border-b border-stone-200 bg-stone-50/70 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setAuthTab('pin')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-all ${
              authTab === 'pin'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Code PIN Rapide</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthTab('password')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-all ${
              authTab === 'password'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Email & Mot de passe</span>
          </button>
        </div>

        {/* Lockout Banner if rate limit exceeded */}
        {lockoutTimer > 0 ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-stone-900">Verrouillage de sécurité actif</h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Pour protéger vos dossiers clients contre toute tentative non autorisée, l'accès est bloqué pendant :
              </p>
              <div className="text-2xl font-bold font-mono text-stone-900 pt-2">
                {lockoutTimer}s
              </div>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-600 h-full transition-all duration-1000"
                style={{ width: `${(lockoutTimer / 60) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          /* Form Content */
          <div className="p-5 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs font-medium text-rose-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {authTab === 'pin' ? (
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider">
                    Entrez votre code secret conseiller :
                  </label>

                  <div className="relative">
                    <input
                      ref={pinInputRef}
                      type={showSecret ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={8}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="••••"
                      className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-stone-50/50 text-stone-900 text-center font-mono text-xl font-bold tracking-widest focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 transition-all"
                    />

                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
                      title={showSecret ? 'Masquer' : 'Afficher'}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                    <span>Code par défaut : <strong className="text-stone-800 font-mono bg-stone-100 px-1 py-0.5 rounded border border-stone-200">{settings.agentPinCode || '1234'}</strong></span>
                    <span className="text-stone-400">Modifiable dans les réglages</span>
                  </div>
                </div>

                {/* Quick keypad for fast mobile login */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleQuickDigit(num)}
                      className="py-2.5 rounded-lg bg-stone-100/80 hover:bg-stone-200/80 active:bg-stone-900 active:text-white text-stone-800 font-semibold text-sm transition-all shadow-2xs font-mono"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinInput('')}
                    className="py-2.5 rounded-lg bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 font-medium text-xs transition-all"
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDigit('0')}
                    className="py-2.5 rounded-lg bg-stone-100/80 hover:bg-stone-200/80 active:bg-stone-900 active:text-white text-stone-800 font-semibold text-sm transition-all shadow-2xs font-mono"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setPinInput(pinInput.slice(0, -1))}
                    className="py-2.5 rounded-lg bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 font-medium text-xs transition-all font-mono"
                  >
                    ⌫
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember-agent-device-pin"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded text-stone-900 border-stone-300 focus:ring-stone-400"
                  />
                  <label htmlFor="remember-agent-device-pin" className="text-xs text-stone-600 select-none cursor-pointer">
                    Mémoriser cet appareil de confiance
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-xs font-medium text-white shadow-2xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>Déverrouiller</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
                  </button>
                </div>
              </form>
            ) : (
              /* Email + Password form */
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider">
                    Email Conseiller :
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    placeholder="celine@estimeo.fr"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-200 text-xs font-normal text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider">
                    Mot de passe Conseiller :
                  </label>
                  <div className="relative">
                    <input
                      ref={passInputRef}
                      type={showSecret ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-200 text-xs font-normal text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-stone-400 flex items-center justify-between pt-0.5">
                    <span>Par défaut : <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">Estimeo2026!</code></span>
                    <span>Modifiable dans vos réglages</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember-agent-device-pwd"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded text-stone-900 border-stone-300 focus:ring-stone-400"
                  />
                  <label htmlFor="remember-agent-device-pwd" className="text-xs text-stone-600 select-none cursor-pointer">
                    Mémoriser cet appareil de confiance
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-xs font-medium text-white shadow-2xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>Connexion sécurisée</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
                  </button>
                </div>
              </form>
            )}

            {/* Stealth access notice */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Session chiffrée & protégée
              </span>
              <span>Raccourci : <kbd className="bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 text-[10px] font-mono text-stone-600">Ctrl+Shift+P</kbd></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

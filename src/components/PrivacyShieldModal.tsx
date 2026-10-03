import React, { useState } from 'react';
import { AgentPrivacySettings } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  UserX, 
  CheckCircle2, 
  X, 
  Building2, 
  Mail, 
  Phone, 
  Bot, 
  Sparkles,
  Info,
  Link2,
  Copy,
  RefreshCw,
  Eye,
  Key,
  Shield,
  Smartphone,
  ExternalLink,
  Laptop
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AgentPrivacySettings;
  onUpdateSettings: (newSettings: AgentPrivacySettings) => void;
}

export const PrivacyShieldModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAgentPath, setCopiedAgentPath] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const currentSlug = settings.customAgentSlug || 'agent';
  const currentToken = settings.stealthLoginToken || 'pro-conseil-2026';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://estimeo.fr';
  const directAgentUrl = `${origin}/${currentSlug}`;
  const stealthUrl = `${origin}/?pro=${currentToken}`;

  const handleCopyAgentPathUrl = () => {
    navigator.clipboard.writeText(directAgentUrl);
    setCopiedAgentPath(true);
    setTimeout(() => setCopiedAgentPath(false), 2500);
  };

  const handleCopyStealthUrl = () => {
    navigator.clipboard.writeText(stealthUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleGenerateRandomToken = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let result = 'pro-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    onUpdateSettings({ ...settings, stealthLoginToken: result });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-stone-100 p-5 sm:p-6 flex items-start justify-between border-b border-stone-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700 text-[10px] font-medium uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Sécurité Pro & Bouclier d'Anonymat
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
              Paramètres de Confidentialité & Accès Furtif
            </h3>
            <p className="text-xs text-stone-400">
              Gérez votre URL secrète, masquez votre identité aux prospects et sécurisez vos dossiers clients.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-stone-800">
          
          {/* SECTION 1: URL DIRECTE /AGENT */}
          <div className="p-4.5 rounded-xl bg-stone-50 border border-stone-200/90 space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center flex-shrink-0">
                  <Laptop className="w-4 h-4 text-stone-200" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                    URL Directe Conseiller (/agent)
                  </h4>
                  <p className="text-[11px] text-stone-500 font-normal">
                    Votre adresse dédiée et mémorisable pour accéder directement à votre portail conseiller.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Actif & Prêt
              </span>
            </div>

            {/* Direct URL Box */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white font-mono text-xs text-stone-800 truncate select-all">
                  {directAgentUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyAgentPathUrl}
                  className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all flex-shrink-0 ${
                    copiedAgentPath
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-stone-900 hover:bg-stone-800 text-white shadow-2xs'
                  }`}
                  title="Copier mon URL /agent"
                >
                  {copiedAgentPath ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-300" />
                      <span>Copier l'URL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-600 font-medium">Chemin URL personnalisé :</span>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-stone-200 bg-white text-xs font-mono text-stone-900">
                    <span className="text-stone-400">/</span>
                    <input
                      type="text"
                      value={currentSlug}
                      onChange={(e) =>
                        onUpdateSettings({ 
                          ...settings, 
                          customAgentSlug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'agent' 
                        })
                      }
                      className="w-24 px-1 py-0.5 bg-transparent border-0 focus:outline-none text-stone-900 font-mono text-xs"
                      placeholder="agent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState(null, '', `/${currentSlug}`);
                      window.location.reload();
                    }}
                    className="text-[11px] text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1 underline underline-offset-2"
                  >
                    <span>Tester le lien /{currentSlug}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Explanatory note */}
            <div className="p-3 rounded-lg bg-stone-100/70 border border-stone-200 text-[11px] text-stone-600 space-y-1">
              <div className="font-medium text-stone-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Comment fonctionne l'accès direct /{currentSlug} ?
              </div>
              <p className="leading-relaxed">
                Lorsque vous ouvrez votre navigateur et tapez <strong className="text-stone-900 font-mono">monsite.com/{currentSlug}</strong> (ou <strong className="text-stone-900 font-mono">/agent</strong>, <strong className="text-stone-900 font-mono">/conseiller</strong>, <strong className="text-stone-900 font-mono">/pro</strong>), l'application vous dirige automatiquement vers l'écran de déverrouillage sécurisé pour entrer votre code PIN ou vos identifiants. Si votre session est déjà active, vous arrivez directement sur votre CRM.
              </p>
            </div>
          </div>

          {/* SECTION 2: URL SECRETE D'ACCÈS FURTIF AVEC PARAMETRE */}
          <div className="p-4.5 rounded-xl bg-stone-50/70 border border-stone-200/90 space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-4 h-4 text-stone-700" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                    Variante : URL Secrète avec Token Furtif
                  </h4>
                  <p className="text-[11px] text-stone-500 font-normal">
                    Accédez avec un jeton temporaire qui s'efface automatiquement de la barre d'adresse.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 text-[10px] font-medium">
                Auto-nettoyage d'URL
              </span>
            </div>

            {/* Secret URL Box */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white font-mono text-xs text-stone-800 truncate select-all">
                  {stealthUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyStealthUrl}
                  className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all flex-shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-stone-800 hover:bg-stone-700 text-white shadow-2xs'
                  }`}
                  title="Copier le lien secret"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-300" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-600 font-medium">Token secret :</span>
                  <input
                    type="text"
                    value={currentToken}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, stealthLoginToken: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })
                    }
                    className="px-2 py-1 rounded-md border border-stone-200 text-xs font-mono text-stone-900 bg-white w-36 focus:outline-none focus:ring-1 focus:ring-stone-400"
                    placeholder="pro-secret"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRandomToken}
                    className="p-1 rounded-md hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors"
                    title="Générer un nouveau token aléatoire"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: MASQUAGE DU BOUTON PUBLIC */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <EyeOff className="w-3.5 h-3.5 text-stone-700" />
              Visibilité Publique du Point d'Entrée
            </h4>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/80 bg-white">
              <div className="space-y-0.5 max-w-[80%]">
                <div className="text-xs font-semibold text-stone-900">
                  Masquer le bouton "Espace Conseiller" sur le site public
                </div>
                <div className="text-[11px] text-stone-500 font-normal">
                  Aucun bouton de connexion n'est visible sur la page d'accueil ni dans le pied de page pour vos visiteurs.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hidePublicLoginButton ?? true}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, hidePublicLoginButton: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-stone-900"></div>
              </label>
            </div>

            {/* Alternative Stealth Entry Methods */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-lg border border-stone-200/80 bg-stone-50/50 space-y-1 text-xs">
                <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-stone-200 text-stone-800 text-[10px] font-bold flex items-center justify-center">1</span>
                  URL Secrète
                </div>
                <p className="text-[11px] text-stone-500">
                  Ouvrez l'URL avec votre paramètre secret en favori.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-stone-200/80 bg-stone-50/50 space-y-1 text-xs">
                <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-stone-200 text-stone-800 text-[10px] font-bold flex items-center justify-center">2</span>
                  Raccourci Clavier
                </div>
                <p className="text-[11px] text-stone-500">
                  Pressez <kbd className="bg-white px-1 py-0.5 rounded border border-stone-200 text-[10px] font-mono text-stone-800">Ctrl+Shift+P</kbd> ou <kbd className="bg-white px-1 py-0.5 rounded border border-stone-200 text-[10px] font-mono text-stone-800">Cmd+Shift+P</kbd>.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-stone-200/80 bg-stone-50/50 space-y-1 text-xs">
                <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-stone-200 text-stone-800 text-[10px] font-bold flex items-center justify-center">3</span>
                  Triple-Clic Logo
                </div>
                <p className="text-[11px] text-stone-500">
                  Cliquez 3 fois rapidement sur le logo Estiméo.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: WHITE LABEL & IDENTITÉ PROSPECT */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-stone-700" />
              Identité de Marque Présentée au Vendeur (White-Label)
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700">
                Nom d'enseigne / cabinet affiché au prospect
              </label>
              <input
                type="text"
                value={settings.publicBrandName}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, publicBrandName: e.target.value })
                }
                placeholder="Estiméo • Estimation & Valorisation Sur-Mesure"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-normal text-stone-900 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              <p className="text-[10px] text-stone-400">
                Nom neutre et certifié présenté lors de l'estimation en ligne.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Sécurité & anti-bruteforce activés</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg shadow-2xs transition-colors"
          >
            Enregistrer & Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

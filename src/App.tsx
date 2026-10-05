import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Sparkles, 
  Layers, 
  Bot, 
  Calendar, 
  MailCheck, 
  Calculator, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  Menu, 
  X,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Flame,
  Lock,
  Unlock,
  Eye,
  LogOut,
  Sliders,
  Settings,
  ChevronRight
} from 'lucide-react';
import { ValuationInputs, ValuationResult, Lead, AgentPrivacySettings } from './types';
import { INITIAL_LEADS } from './data/mockLeads';
import { fetchCrmLeads, saveCrmLead } from './lib/supabaseService';
import { LandingSimulator } from './components/LandingSimulator';
const QualificationChatbot = lazy(() => import('./components/QualificationChatbot').then((m) => ({ default: m.QualificationChatbot })));
const CrmPipelineView = lazy(() => import('./components/CrmPipelineView').then((m) => ({ default: m.CrmPipelineView })));
const NurtureEngineView = lazy(() => import('./components/NurtureEngineView').then((m) => ({ default: m.NurtureEngineView })));
const KpiRoiCalculator = lazy(() => import('./components/KpiRoiCalculator').then((m) => ({ default: m.KpiRoiCalculator })));
const CalendarBookingModal = lazy(() => import('./components/CalendarBookingModal').then((m) => ({ default: m.CalendarBookingModal })));
const BookingConfirmationView = lazy(() => import('./components/BookingConfirmationView').then((m) => ({ default: m.BookingConfirmationView })));
const PrivacyShieldModal = lazy(() => import('./components/PrivacyShieldModal').then((m) => ({ default: m.PrivacyShieldModal })));
const AgentAuthModal = lazy(() => import('./components/AgentAuthModal').then((m) => ({ default: m.AgentAuthModal })));
const CalendarHealth = lazy(() => import('./components/CalendarHealth').then((m) => ({ default: m.CalendarHealth })));
import { BRAND } from './data/siteContent';
import { CreditLine } from './components/CreditLine';

type NavView = 'landing' | 'chat' | 'confirmation' | 'pipeline' | 'nurture' | 'calculator';

export default function App() {
  // Agent Authentication & View Mode State - Default to authenticated pro mode for immediate dashboard view
  // Truth comes from the server (signed HttpOnly cookie), never from localStorage
  const [isAgentAuthenticated, setIsAgentAuthenticated] = useState<boolean>(false);
  const authRef = useRef(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Logo secret multi-click counter
  const [logoClicks, setLogoClicks] = useState(0);

  // Active view - Default to CRM Pipeline Dashboard
  const [currentView, setCurrentView] = useState<NavView>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Privacy & Stealth Settings
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<AgentPrivacySettings>(() => {
    const saved = localStorage.getItem('estimeo_privacy_settings') || localStorage.getItem('valoria_privacy_settings') || localStorage.getItem('estival_privacy_settings') || localStorage.getItem('mandatflow_privacy_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.publicBrandName && /MandatFlow|EstiVal|Valoria|Estiméo|Estimeo/i.test(parsed.publicBrandName)) {
          parsed.publicBrandName = "Agent Estimation";
        }
        if (parsed.hidePublicLoginButton === undefined) {
          parsed.hidePublicLoginButton = true;
        }
        delete parsed.agentPinCode;
        delete parsed.agentPassword;
        delete parsed.agentEmail;
        return parsed;
      } catch {
        // fallback
      }
    }
    return {
      hidePersonalIdentity: true,
      publicBrandName: "Agent Estimation",
      publicContactEmail: "",
      publicContactPhone: "06 03 58 03 16 (Céline - Conseillère référente)",
      hideInternalScoringFromProspect: true,
      stealthModeEnabled: true,
      customPrivacyDisclaimer: "Données protégées sous secret professionnel et conformité RGPD.",
      stealthLoginToken: "pro-conseil-2026",
      hidePublicLoginButton: true,
      sessionTimeoutMinutes: 30,
    };
  });

  // Helper to determine if a pathname matches the agent portal
  const isAgentPath = (path: string, slug = 'agent') => {
    const clean = path.toLowerCase().replace(/\/+$/, '');
    const normalizedSlug = slug.toLowerCase().replace(/^\/+|\/+$/g, '');
    return (
      clean === '/agent' ||
      clean === '/pro' ||
      clean === '/conseiller' ||
      clean === '/admin' ||
      clean === `/${normalizedSlug}`
    );
  };

  useEffect(() => {
    fetch('/api/agent/session', { credentials: 'same-origin' })
      .then((r) => r.json())
      .catch(() => ({ authenticated: false }))
      .then((d) => {
        authRef.current = Boolean(d.authenticated);
        setIsAgentAuthenticated(authRef.current);
        setSessionChecked(true);
      });
  }, []);

  // Check for /agent path or stealth URL parameters on initial mount and route accordingly
  useEffect(() => {
    if (typeof window === 'undefined' || !sessionChecked) return;

    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const customSlug = privacySettings.customAgentSlug || 'agent';

    const isDirectAgentUrl = isAgentPath(pathname, customSlug);
    const proParam = urlParams.get('pro') || urlParams.get('agent') || urlParams.get('access') || urlParams.get('secret');
    const hasProFlag = urlParams.has('pro') || urlParams.has('agent') || hash.includes('pro') || hash.includes('access');

    const isCurrentAuth = authRef.current;

    // 1. Direct /agent URL access
    if (isDirectAgentUrl) {
      if (isCurrentAuth) {
        setIsAgentAuthenticated(true);
        setIsAgentMode(true);
        setCurrentView('pipeline');
        showToast('Espace Conseiller (/agent) : Session active connectée.');
      } else {
        setIsAuthModalOpen(true);
        showToast('🔒 Espace Conseiller : Entrez votre code PIN ou vos identifiants.');
      }
    } 
    // 2. Stealth parameter access (?pro=...)
    else if (proParam || hasProFlag) {
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (err) {
        // Ignore history replace errors
      }

      if (isCurrentAuth) {
        setIsAgentMode(true);
        setCurrentView('pipeline');
        showToast('Accès Pro Sécurisé : Session active restaurée.');
      } else {
        setIsAuthModalOpen(true);
        showToast('🔒 Accès Espace Conseiller détecté. URL nettoyée pour votre sécurité.');
      }
    }

    // Popstate listener for browser back/forward buttons
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (isAgentPath(currentPath, customSlug)) {
        const auth = authRef.current;
        if (auth) {
          setIsAgentMode(true);
          setCurrentView('pipeline');
        } else {
          setIsAuthModalOpen(true);
        }
      } else if (currentPath === '/' || currentPath === '') {
        setIsAgentMode(false);
        setCurrentView('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [privacySettings.customAgentSlug, sessionChecked]);

  useEffect(() => {
    if (!isAgentAuthenticated) return;
    loadLeads();
    const t = window.setInterval(loadLeads, 60000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgentAuthenticated]);

  // Reconcile with Cal.com whenever the advisor opens the pipeline (cancellations / reschedules)
  useEffect(() => {
    if (currentView === 'pipeline' && isAgentMode) {
      fetch('/api/cal/sync', { method: 'POST' }).then(() => loadLeads()).catch(() => {});
    }
  }, [currentView, isAgentMode]);

  // Global Keyboard Shortcut: Ctrl + Shift + P or Cmd + Shift + P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (isAgentAuthenticated) {
          setIsAgentMode((prev) => !prev);
          setCurrentView((prev) => (prev === 'pipeline' ? 'landing' : 'pipeline'));
          showToast('Bascule rapide Espace Conseiller / Vue Vendeur');
        } else {
          setIsAuthModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAgentAuthenticated]);

  // Logo secret triple-click handler
  const handleLogoSecretClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        if (isAgentAuthenticated) {
          setIsAgentMode(true);
          setCurrentView('pipeline');
          showToast('Espace Conseiller activé via accès discret.');
        } else {
          setIsAuthModalOpen(true);
        }
        return 0;
      }
      return next;
    });

    setTimeout(() => {
      setLogoClicks(0);
    }, 2000);
  };

  const handleUpdatePrivacySettings = (newSettings: AgentPrivacySettings) => {
    setPrivacySettings(newSettings);
    localStorage.setItem('estimeo_privacy_settings', JSON.stringify(newSettings));
    showToast('Paramètres mis à jour : vos données et votre code secret sont enregistrés.');
  };

  // Shared state
  const [valuationInputs, setValuationInputs] = useState<ValuationInputs | null>(null);
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);
  // Real leads come from Supabase through the advisor API; demo data only when Supabase is not configured
  const [leads, setLeads] = useState<Lead[]>([]);
  const [crmState, setCrmState] = useState<'loading' | 'live' | 'demo' | 'error'>('loading');
  const [crmError, setCrmError] = useState<string | null>(null);
  const pendingSaves = useRef(0);
  const saveTimers = useRef<Record<string, number>>({});

  const loadLeads = async () => {
    if (pendingSaves.current > 0) return; // do not overwrite edits still on their way to the server
    const r = await fetchCrmLeads();
    if (r.state === 'live') {
      setLeads(r.leads);
      setCrmState('live');
      setCrmError(null);
    } else if (r.state === 'demo') {
      setLeads((prev) => (prev.length ? prev : INITIAL_LEADS));
      setCrmState('demo');
    } else if (r.state === 'unauthorized') {
      authRef.current = false;
      setIsAgentAuthenticated(false);
      setIsAgentMode(false);
      setCurrentView('landing');
    } else {
      setCrmState('error');
      setCrmError(r.message);
    }
  };

  const persistLead = (lead: Lead) => {
    if (crmState !== 'live') return;
    window.clearTimeout(saveTimers.current[lead.id]);
    pendingSaves.current += 1;
    saveTimers.current[lead.id] = window.setTimeout(async () => {
      const err = await saveCrmLead(lead);
      pendingSaves.current -= 1;
      if (err) showToast(`Enregistrement impossible : ${err}`);
    }, 700);
  };

  // Booking modal
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingLeadInfo, setBookingLeadInfo] = useState<Partial<Lead> | null>(null);
  const [latestConfirmedLead, setLatestConfirmedLead] = useState<Lead | null>(null);
  // The one lead of the current seller journey: created once by the simulator, reused by chat and booking
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedLeadForNurtureId, setSelectedLeadForNurtureId] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    persistLead(updatedLead);
  };

  // Deletes a contact and everything attached to it (server side), then removes it from the screen
  const handleDeleteLead = async (lead: Lead): Promise<boolean> => {
    const isDbId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.id);
    if (isDbId) {
      try {
        const res = await fetch(`/api/crm/leads/${encodeURIComponent(lead.id)}`, { method: 'DELETE', credentials: 'same-origin' });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          showToast(d.error || 'Suppression impossible.');
          return false;
        }
      } catch {
        showToast('Serveur injoignable : suppression impossible.');
        return false;
      }
    }
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    if (activeLead?.id === lead.id) setActiveLead(null);
    showToast(`Dossier de ${lead.name} supprimé, avec ses messages et rendez-vous.`);
    return true;
  };

  const handleNavigateToNurture = (leadId: string) => {
    setSelectedLeadForNurtureId(leadId);
    handleNavigate('nurture');
  };

  // Login handler
  const handleAuthSuccess = (rememberSession: boolean) => {
    authRef.current = true;
    setIsAgentAuthenticated(true);
    setIsAgentMode(true);
    setIsAuthModalOpen(false);
    const slug = privacySettings.customAgentSlug || 'agent';
    try {
      window.history.pushState(null, '', `/${slug}`);
    } catch {
      // Ignore
    }
    setCurrentView('pipeline');
    showToast('Authentification réussie ! Bienvenue dans votre Espace Agent sécurisé (/agent).');
  };

  // Logout / Lock handler
  const handleLockAgentMode = () => {
    authRef.current = false;
    setIsAgentAuthenticated(false);
    setIsAgentMode(false);
    fetch('/api/agent/logout', { method: 'POST' }).catch(() => {});
    try {
      window.history.pushState(null, '', '/');
    } catch {
      // Ignore
    }
    setCurrentView('landing');
    showToast('Session verrouillée. Retour à l\'interface publique vendeur.');
  };

  // Safe navigation switcher
  const handleNavigate = (view: NavView) => {
    const isInternalAgentView = ['pipeline', 'nurture', 'calculator'].includes(view);

    if (isInternalAgentView && !isAgentAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (isInternalAgentView) {
      const slug = privacySettings.customAgentSlug || 'agent';
      try {
        window.history.pushState(null, '', `/${slug}`);
      } catch {
        // Ignore
      }
    } else if (view === 'landing' && !isAgentMode) {
      try {
        window.history.pushState(null, '', '/');
      } catch {
        // Ignore
      }
    }

    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  // Handler when user finishes valuation in simulator
  const handleValuationComplete = (inputs: ValuationInputs, result: ValuationResult) => {
    setValuationInputs(inputs);
    setValuationResult(result);
    setCurrentView('chat');
    showToast('Simulation validée ! Finalisation de votre étude d\'estimation personnalisée...');
  };

  // Handler when lead qualifies for booking
  const handleOpenBooking = (leadInfo: Partial<Lead>) => {
    // Bookings started from the seller journey carry no id: attach the lead already created for this seller
    const info =
      !leadInfo.id && activeLead
        ? { ...leadInfo, id: activeLead.id, name: activeLead.name, phone: activeLead.phone, email: activeLead.email }
        : leadInfo;
    setBookingLeadInfo(info);
    setIsBookingOpen(true);
  };


  // Handler when meeting is confirmed
  const handleConfirmBooking = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
    setLatestConfirmedLead(newLead);
    setIsBookingOpen(false);

    if (isAgentMode) {
      showToast(`Rendez-vous confirmé pour ${newLead.name} ! Synchronisation CRM effectuée.`);
      setCurrentView('pipeline');
    } else {
      showToast(`✅ Merci ${newLead.name}, votre rendez-vous d'estimation est confirmé !`);
      setCurrentView('confirmation');
    }
  };

  // Handler when lead is captured in simulator before showing price
  const handleSimulatorLeadCaptured = (newLead: Lead, replacesId?: string) => {
    setActiveLead(newLead);
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id && l.id !== replacesId)]);
    if (!replacesId) showToast(`Merci ${newLead.name.split(' ')[0]}, votre estimation est prête.`);
  };


  // Handler when non-mature lead is saved to nurture
  const handleSaveLead = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);

    if (isAgentMode) {
      showToast('Lead enregistré ! Séquence de nurture 6 semaines activée.');
      setCurrentView('pipeline');
    } else {
      showToast('Votre demande a bien été transmise.');
      setCurrentView('landing');
    }
  };

  const handleUpdateLeadStatus = (leadId: string, newStatus: 'HOT' | 'WARM' | 'COLD') => {
    const target = leads.find((l) => l.id === leadId);
    if (target) persistLead({ ...target, status: newStatus });
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    showToast(`Statut du lead mis à jour : ${newStatus}`);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa] text-stone-900 flex flex-col font-sans selection:bg-stone-900 selection:text-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-stone-100 px-4 py-3 rounded-xl shadow-lg border border-stone-800 flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER: DUAL MODE (Agent Mode vs Client Mode) */}
      {isAgentMode ? (
        /* =================== AGENT AUTHENTICATED HEADER (Warm Attio/Linear SaaS) =================== */
        <header className="sticky top-0 z-40 bg-[#18181b] text-stone-100 border-b border-zinc-800 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Agent Logo & Security Indicator */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleNavigate('pipeline')}
                className="flex items-center gap-2.5 text-left focus:outline-none group"
              >
                <div className="w-8.5 h-8.5 rounded-xl bg-stone-100 text-stone-900 flex items-center justify-center font-bold text-sm group-hover:bg-white transition-all shadow-xs">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white tracking-tight">{BRAND.name}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-stone-800 text-stone-300 font-semibold text-[10px] uppercase border border-stone-700">
                      Conseil Pro
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400 font-normal">Espace conseiller</div>
                </div>
              </button>
            </div>

            {/* Desktop Agent Nav Items */}
            <nav className="hidden lg:flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 whitespace-nowrap">
              <button
                type="button"
                id="agent-nav-pipeline"
                onClick={() => handleNavigate('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  currentView === 'pipeline'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>Dossiers</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  {leads.filter(l => l.status === 'HOT').length}
                </span>
              </button>

              <button
                type="button"
                id="agent-nav-nurture"
                onClick={() => handleNavigate('nurture')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'nurture'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <MailCheck className="w-3.5 h-3.5" />
                <span>Relances</span>
              </button>

              <button
                type="button"
                id="agent-nav-calculator"
                onClick={() => handleNavigate('calculator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'calculator'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Honoraires</span>
              </button>

              <button
                type="button"
                id="agent-nav-simulator"
                onClick={() => handleNavigate('landing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'landing' || currentView === 'chat'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Essayer le parcours client"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Tester le site</span>
              </button>
            </nav>

            {/* Right Action Controls for Agent */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                id="btn-agent-privacy-shield"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="py-1.5 px-3 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-stone-800 text-stone-200 text-xs font-medium transition-all flex items-center gap-1.5"
                title="Gérer la confidentialité et l'identité affichée aux clients"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                <span>Confidentialité</span>
              </button>

              <button
                type="button"
                onClick={() => window.open('/', '_blank', 'noopener')}
                className="py-1.5 px-3 rounded-lg border border-stone-700 bg-stone-800/50 hover:bg-stone-800 text-stone-300 text-xs font-medium transition-all flex items-center gap-1.5"
                title="Ouvre le site tel que le voient vos clients, dans un nouvel onglet"
              >
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>Voir le site client</span>
              </button>

              <button
                type="button"
                onClick={handleLockAgentMode}
                className="py-1.5 px-3 rounded-lg border border-rose-950/60 bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 text-xs font-medium transition-all flex items-center gap-1.5"
                title="Verrouiller et masquer le dashboard agent"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Verrouiller</span>
              </button>
            </div>

            {/* Mobile Agent Menu Button */}
            <div className="flex lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-stone-300 hover:bg-stone-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown for Agent */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-zinc-900 border-b border-zinc-800 px-4 py-3 space-y-1">
              {[
                { key: 'pipeline', label: `Dossiers & Mandats (${leads.length})` },
                { key: 'nurture', label: 'Relances' },
                { key: 'calculator', label: 'Honoraires' },
                { key: 'landing', label: 'Tester le site' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigate(item.key as NavView)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                    currentView === item.key
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-stone-300 hover:bg-zinc-800/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-200 bg-stone-800/50 border border-stone-700 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-stone-400" />
                  <span>Confidentialité</span>
                </button>
                <button
                  type="button"
                  onClick={handleLockAgentMode}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-800 flex items-center gap-2"
                >
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Verrouiller l'Espace Pro</span>
                </button>
              </div>
            </div>
          )}
        </header>
      ) : (
        /* =================== PUBLIC CLIENT HEADER (Warm SaaS Editorial) =================== */
        <>
          <header className="sticky top-0 z-40 bg-[#fbfbfa]/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              {/* Public Brand Logo with subtle triple-click detection */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleLogoSecretClick();
                    setCurrentView('landing');
                  }}
                  className="flex items-center gap-2.5 text-left focus:outline-none group select-none"
                  title={privacySettings.publicBrandName}
                >
                  <div className="w-8.5 h-8.5 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center font-bold text-sm group-hover:bg-stone-800 transition-all shadow-xs">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-stone-900 tracking-tight">
                        {BRAND.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-normal">
                      {BRAND.tagline}
                    </div>
                  </div>
                </button>
              </div>

              {/* Public Client Funnel: linear progress, no jumping ahead */}
              <nav aria-label="Progression" className="hidden sm:flex items-center gap-2 text-xs font-semibold">
                {[
                  { n: 1, label: 'Estimation', active: currentView === 'landing', done: currentView !== 'landing' },
                  { n: 2, label: 'Échange avec Céline', active: currentView === 'chat', done: currentView === 'confirmation' || !!latestConfirmedLead },
                  { n: 3, label: 'Rendez-vous', active: currentView === 'confirmation', done: false },
                ].map((st, idx) => (
                  <React.Fragment key={st.n}>
                    {idx > 0 && <span className="w-6 h-px bg-stone-300" />}
                    <button
                      type="button"
                      id={`client-nav-step-${st.n}`}
                      disabled={!st.active && !st.done}
                      onClick={() => setCurrentView(st.n === 1 ? 'landing' : st.n === 2 ? 'chat' : 'confirmation')}
                      className={`flex items-center gap-2 transition-colors ${
                        st.active ? 'text-stone-900' : st.done ? 'text-emerald-700 hover:text-emerald-800' : 'text-stone-400 cursor-default'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          st.active ? 'bg-stone-900 text-white' : st.done ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'
                        }`}
                      >
                        {st.done && !st.active ? '✓' : st.n}
                      </span>
                      {st.label}
                    </button>
                  </React.Fragment>
                ))}
              </nav>

              {/* Public Right Area: Discreet Reassurance & Optional Pro Login */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-[11px] font-medium text-stone-600 border border-stone-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Confidentialité garantie</span>
                </div>

                {!privacySettings.hidePublicLoginButton && (
                  <button
                    type="button"
                    id="btn-open-agent-auth"
                    onClick={() => {
                      if (isAgentAuthenticated) {
                        setIsAgentMode(true);
                        setCurrentView('pipeline');
                      } else {
                        setIsAuthModalOpen(true);
                      }
                    }}
                    className="py-1.5 px-3 rounded-lg border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-all flex items-center gap-1.5 shadow-2xs"
                    title="Accès réservé au conseiller immobilier référent"
                  >
                    <Lock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Espace Conseiller</span>
                  </button>
                )}
              </div>
            </div>
          </header>
        </>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 ${currentView === 'landing' ? 'pb-0' : 'pb-8'}`}>
        <Suspense fallback={<div role="status" className="py-24 text-center text-sm text-stone-500">Chargement…</div>}>
        {currentView === 'landing' && (
          <LandingSimulator
            onValuationComplete={handleValuationComplete}
            onOpenChatDirect={() => setCurrentView('chat')}
            onLeadCaptured={handleSimulatorLeadCaptured}
            onOpenBooking={handleOpenBooking}
          />
        )}

        {currentView === 'chat' && (
          <QualificationChatbot
            initialValuationInputs={valuationInputs}
            initialValuationResult={valuationResult}
            privacySettings={privacySettings}
            existingLeadId={activeLead?.id}
            isAgentMode={isAgentMode}
            onBookMeeting={handleOpenBooking}
            onSaveLead={handleSaveLead}
            onBackToSimulator={() => setCurrentView('landing')}
            onOpenPrivacySettings={isAgentMode ? () => setIsPrivacyModalOpen(true) : undefined}
          />
        )}

        {currentView === 'confirmation' && (latestConfirmedLead || leads[0]) && (
          <BookingConfirmationView
            confirmedLead={latestConfirmedLead || leads[0]}
            onModifyBooking={() => {
              setBookingLeadInfo(latestConfirmedLead || leads[0]);
              setIsBookingOpen(true);
            }}
            onBackToEstimator={() => setCurrentView('landing')}
          />
        )}

        {/* Protected Views: rendered only when accessed in authenticated agent mode */}
        {currentView === 'pipeline' && <CalendarHealth />}
        {currentView === 'pipeline' && crmState === 'demo' && (
          <div role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Données de démonstration.</strong> Supabase n'est pas configuré sur ce serveur : ces prospects sont fictifs. Renseignez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY pour afficher vos vrais prospects.
          </div>
        )}
        {currentView === 'pipeline' && crmState === 'error' && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Impossible de charger vos prospects ({crmError}). Les données affichées peuvent être incomplètes.
          </div>
        )}
        {currentView === 'pipeline' && crmState === 'live' && leads.length === 0 && (
          <div role="status" className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-600">
            Aucun prospect pour l'instant. Ils apparaissent ici dès qu'un vendeur débloque son estimation.
          </div>
        )}
        {currentView === 'pipeline' && (
          <CrmPipelineView
            leads={leads}
            onSelectLead={(l) => {
              setBookingLeadInfo(l);
              setIsBookingOpen(true);
            }}
            onOpenBookingModal={handleOpenBooking}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onNavigateToNurture={handleNavigateToNurture}
          />
        )}

        {currentView === 'nurture' && (
          <NurtureEngineView
            leads={leads}
            selectedLeadId={selectedLeadForNurtureId}
            onUpdateLead={handleUpdateLead}
            onShowToast={showToast}
          />
        )}

        {currentView === 'calculator' && <KpiRoiCalculator />}
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {/* Calendar Booking Modal */}
        {isBookingOpen && (
          <CalendarBookingModal
            isOpen={isBookingOpen}
            initialLeadInfo={bookingLeadInfo}
            onClose={() => setIsBookingOpen(false)}
            onConfirmBooking={handleConfirmBooking}
          />
        )}

        {/* Agent Privacy & PIN Configuration Modal */}
        {isPrivacyModalOpen && (
          <PrivacyShieldModal
            isOpen={isPrivacyModalOpen}
            onClose={() => setIsPrivacyModalOpen(false)}
            settings={privacySettings}
            onUpdateSettings={handleUpdatePrivacySettings}
          />
        )}

        {/* Agent Authentication / PIN Modal */}
        {isAuthModalOpen && (
          <AgentAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={handleAuthSuccess}
            settings={privacySettings}
          />
        )}
      </Suspense>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200/80 pt-6 pb-24 sm:pb-6 mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">
              {BRAND.name}
            </span>
            <span>•</span>
            <span>Estimation gratuite et sans engagement</span>
            <span>•</span>
            <a href="/blog" className="hover:text-stone-800 underline-offset-2 hover:underline">Conseils</a>
            <a href="/mentions-legales" className="hover:text-stone-800 underline-offset-2 hover:underline">Mentions légales</a>
            <a href="/confidentialite" className="hover:text-stone-800 underline-offset-2 hover:underline">Confidentialité</a>
          </div>

          <div className="flex items-center gap-4 text-stone-500">
            {isAgentMode ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Session Conseiller Active
              </span>
            ) : !privacySettings.hidePublicLoginButton ? (
              <button
                type="button"
                onClick={() => {
                  if (isAgentAuthenticated) {
                    setIsAgentMode(true);
                    setCurrentView('pipeline');
                  } else {
                    setIsAuthModalOpen(true);
                  }
                }}
                className="text-stone-400 hover:text-stone-700 text-xs flex items-center gap-1 transition-colors"
              >
                <Lock className="w-3 h-3 text-stone-400" />
                <span>Espace réservé aux conseillers référents</span>
              </button>
            ) : (
              <CreditLine />
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

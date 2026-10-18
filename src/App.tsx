import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Sparkles, 
  Layers, 
  Bot, 
  Calendar, 
  MailCheck, 
  Calculator,
  PenLine,
  BarChart3, 
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
  ChevronRight,
  Instagram,
  Linkedin,
  Facebook
} from 'lucide-react';
import { ValuationInputs, ValuationResult, Lead, AgentPrivacySettings } from './types';
import { INITIAL_LEADS } from './data/mockLeads';
import { fetchCrmLeads, saveCrmLead } from './lib/supabaseService';
import { LandingSimulator } from './components/LandingSimulator';
import { CalendarBookingModal } from './components/CalendarBookingModal';
// Part of the booking flow: loaded with the page so the confirmation always opens, even right after a site update
import { BookingConfirmationView } from './components/BookingConfirmationView';
import { clearAssistantDraft } from './components/GuidedAssistant';

// After a redeploy an open tab can ask for a file that no longer exists: reload once to fetch the new version
const lazyRetry = <T extends React.ComponentType<any>>(load: () => Promise<{ default: T }>) =>
  lazy(() =>
    load().then(
      (m) => {
        return m;
      },
      (err) => {
        // After a site update the file may no longer exist: reload once (not in a loop), the boundary shows a message otherwise
        let last = 0;
        try { last = Number(sessionStorage.getItem('chunk-reload-at') || 0); } catch { /* ignoré */ }
        if (Date.now() - last > 30_000) {
          try { sessionStorage.setItem('chunk-reload-at', String(Date.now())); } catch { /* ignoré */ }
          window.location.reload();
          return new Promise<never>(() => {});
        }
        throw err;
      },
    ),
  );

const QualificationChatbot = lazyRetry(() => import('./components/QualificationChatbot').then((m) => ({ default: m.QualificationChatbot })));
const CrmPipelineView = lazyRetry(() => import('./components/CrmPipelineView').then((m) => ({ default: m.CrmPipelineView })));
const EmailManagerView = lazyRetry(() => import('./components/EmailManagerView').then((m) => ({ default: m.EmailManagerView })));
const CommissionCalculator = lazyRetry(() => import('./components/CommissionCalculator').then((m) => ({ default: m.CommissionCalculator })));
const PrivacyShieldModal = lazyRetry(() => import('./components/PrivacyShieldModal').then((m) => ({ default: m.PrivacyShieldModal })));
const AgentAuthModal = lazyRetry(() => import('./components/AgentAuthModal').then((m) => ({ default: m.AgentAuthModal })));
const StatsView = lazyRetry(() => import('./components/StatsView').then((m) => ({ default: m.StatsView })));
const ArticlesView = lazyRetry(() => import('./components/ArticlesView').then((m) => ({ default: m.ArticlesView })));
const CalendarHealth = lazyRetry(() => import('./components/CalendarHealth').then((m) => ({ default: m.CalendarHealth })));
import { BRAND, SOCIALS } from './data/siteContent';

// Confirmation page: its own address (/confirmation) so a refresh keeps it; /confirmation?demo=1 shows a sample for tests
const CONFIRMED_KEY = 'estimo-confirmed-lead-v1';
const CONFIRMED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const onConfirmationPath = () => typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/confirmation';
const DEMO_CONFIRMED_LEAD = {
  id: 'demo-confirmation',
  name: 'Alexia KEBIR',
  phone: '06 12 34 56 78',
  email: 'exemple@email.fr',
  address: '12 rue de la République, 69002 Lyon',
  city: 'Lyon',
  propertyType: 'Appartement',
  surface: 80,
  estimatedValue: 420000,
  motive: 'Agrandissement',
  timeframe: '1-3 mois',
  status: 'HOT',
  score: 60,
  meetingBooked: true,
  meetingDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  meetingTime: '10:30',
  valuation: { lowPrice: 396000, highPrice: 441000 },
} as unknown as Lead;
const loadConfirmedLead = (): Lead | null => {
  if (!onConfirmationPath()) return null;
  try {
    if (new URLSearchParams(window.location.search).get('demo')) return DEMO_CONFIRMED_LEAD;
    const raw = window.localStorage.getItem(CONFIRMED_KEY);
    const d = raw ? JSON.parse(raw) : null;
    if (d && d.lead && typeof d.t === 'number' && Date.now() - d.t < CONFIRMED_TTL_MS) return d.lead as Lead;
  } catch { /* ignoré */ }
  return null;
};
const BOOT_CONFIRMED_LEAD = loadConfirmedLead();

type NavView = 'landing' | 'chat' | 'confirmation' | 'pipeline' | 'nurture' | 'calculator' | 'articles' | 'stats';

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
  const [currentView, setCurrentView] = useState<NavView>(BOOT_CONFIRMED_LEAD ? 'confirmation' : 'landing');
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
  const [latestConfirmedLead, setLatestConfirmedLead] = useState<Lead | null>(BOOT_CONFIRMED_LEAD);
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
  // The advisor's tab is easy to tell apart from the public site tab
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const publicTitle = document.title.startsWith('Dashboard') ? BRAND.name : document.title;
    if (isAgentMode) document.title = `Dashboard | ${BRAND.name}`;
    else document.title = publicTitle;
  }, [isAgentMode]);

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

  // Bulk deletion: returns the ids that were really deleted
  const handleDeleteLeads = async (toDelete: Lead[]): Promise<string[]> => {
    const isDb = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const dbIds = toDelete.filter((l) => isDb(l.id)).map((l) => l.id);
    const deleted = new Set<string>(toDelete.filter((l) => !isDb(l.id)).map((l) => l.id));
    for (let i = 0; i < dbIds.length; i += 200) {
      try {
        const res = await fetch('/api/crm/leads/delete-bulk', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: dbIds.slice(i, i + 200) }),
        });
        const d = await res.json().catch(() => ({}));
        (d.deleted || []).forEach((id: string) => deleted.add(id));
      } catch {
        /* the toast below reports what could not be deleted */
      }
    }
    setLeads((prev) => prev.filter((l) => !deleted.has(l.id)));
    if (activeLead && deleted.has(activeLead.id)) setActiveLead(null);
    const failed = toDelete.length - deleted.size;
    showToast(failed === 0 ? `${deleted.size} dossier${deleted.size > 1 ? 's' : ''} supprimé${deleted.size > 1 ? 's' : ''}.` : `${deleted.size} supprimé(s), ${failed} impossible(s) à supprimer.`);
    return Array.from(deleted);
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
    const isInternalAgentView = ['pipeline', 'nurture', 'calculator', 'articles', 'stats'].includes(view);

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


  // Personal link from the reminder e-mail (/?rdv=…): reopens the booking window with the visitor's details already filled in
  useEffect(() => {
    let token: string | null = null;
    try { token = new URLSearchParams(window.location.search).get('rdv'); } catch { /* ignoré */ }
    if (!token) return;
    try { history.replaceState(null, '', window.location.pathname + window.location.hash); } catch { /* ignoré */ }
    fetch(`/api/rdv/lead?t=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.booked) showToast('Votre rendez-vous est déjà confirmé : à très bientôt !');
        else if (d?.lead) { setBookingLeadInfo(d.lead as Partial<Lead>); setIsBookingOpen(true); }
      })
      .catch(() => { /* le visiteur reste sur le site et peut réserver normalement */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving the confirmation (or opening /confirmation without a booking) brings the address back to the home page
  useEffect(() => {
    if (currentView !== 'confirmation' && onConfirmationPath()) {
      try { window.history.replaceState(null, '', '/'); } catch { /* ignoré */ }
    }
  }, [currentView]);

  // Handler when meeting is confirmed
  const handleConfirmBooking = (newLead: Lead) => {
    clearAssistantDraft();
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
    setLatestConfirmedLead(newLead);
    setIsBookingOpen(false);

    if (isAgentMode) {
      showToast(`Rendez-vous confirmé pour ${newLead.name} ! Synchronisation CRM effectuée.`);
      setCurrentView('pipeline');
    } else {
      showToast(`✅ Merci ${newLead.name}, votre rendez-vous d'estimation est confirmé !`);
      try {
        window.localStorage.setItem(CONFIRMED_KEY, JSON.stringify({ t: Date.now(), lead: newLead }));
        window.history.pushState(null, '', '/confirmation');
      } catch { /* l'adresse reste celle de l'accueil */ }
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
    <div className={`min-h-screen ${isAgentMode ? 'admin-da bg-[#FFF7E6]' : 'bg-[#fbfbfa]'} text-stone-900 flex flex-col font-sans selection:bg-stone-900 selection:text-white`}>
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
        <header className="sticky top-0 z-40 bg-[#FFF7E6] text-[#0B0F1F] border-b-[3px] border-[#0B0F1F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Agent Logo & Security Indicator */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleNavigate('pipeline')}
                className="flex items-center gap-2.5 text-left focus:outline-none group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#2B4BFF] border-[3px] border-[#0B0F1F] text-white flex items-center justify-center font-bold text-sm group-hover:bg-[#0B0F1F] transition-all">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-[#0B0F1F] tracking-tight">{BRAND.name}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-[#FFD60A] text-[#0B0F1F] font-black text-[10px] uppercase border-2 border-[#0B0F1F]">
                      Conseil Pro
                    </span>
                  </div>
                  <div className="text-[11px] text-[#0B0F1F]/70 font-medium">Espace conseiller</div>
                </div>
              </button>
            </div>

            {/* Desktop Agent Nav Items */}
            <nav className="hidden lg:flex items-center gap-1 bg-white p-1 rounded-xl border-[3px] border-[#0B0F1F] whitespace-nowrap">
              <button
                type="button"
                id="agent-nav-pipeline"
                onClick={() => handleNavigate('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  currentView === 'pipeline'
                    ? 'bg-[#2B4BFF] text-white'
                    : 'text-[#0B0F1F] hover:bg-[#FFF7E6]'
                }`}
              >
                <span>Leads</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#FFD60A] text-[#0B0F1F] text-[10px] font-black border-2 border-[#0B0F1F]">
                  {leads.filter(l => l.status === 'HOT').length}
                </span>
              </button>

              <button
                type="button"
                id="agent-nav-nurture"
                onClick={() => handleNavigate('nurture')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'nurture'
                    ? 'bg-[#2B4BFF] text-white'
                    : 'text-[#0B0F1F] hover:bg-[#FFF7E6]'
                }`}
              >
                <MailCheck className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>

              <button
                type="button"
                id="agent-nav-articles"
                onClick={() => handleNavigate('articles')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'articles'
                    ? 'bg-[#2B4BFF] text-white'
                    : 'text-[#0B0F1F] hover:bg-[#FFF7E6]'
                }`}
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Blog</span>
              </button>

              <button
                type="button"
                id="agent-nav-stats"
                onClick={() => handleNavigate('stats')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'stats'
                    ? 'bg-[#2B4BFF] text-white'
                    : 'text-[#0B0F1F] hover:bg-[#FFF7E6]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Statistiques</span>
              </button>

              <button
                type="button"
                id="agent-nav-calculator"
                onClick={() => handleNavigate('calculator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'calculator'
                    ? 'bg-[#2B4BFF] text-white'
                    : 'text-[#0B0F1F] hover:bg-[#FFF7E6]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculatrice</span>
              </button>
            </nav>

            {/* Right Action Controls for Agent */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                id="btn-agent-privacy-shield"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="py-1.5 px-3 rounded-lg border-[3px] border-[#0B0F1F] bg-white hover:bg-[#FFF7E6] text-[#0B0F1F] text-xs font-bold shadow-[3px_3px_0_#0B0F1F] transition-all flex items-center gap-1.5"
                title="Gérer la confidentialité et l'identité affichée aux clients"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#2B4BFF]" />
                <span>Confidentialité</span>
              </button>

              <button
                type="button"
                onClick={() => window.open('/', '_blank', 'noopener')}
                className="py-1.5 px-3 rounded-lg border-[3px] border-[#0B0F1F] bg-white hover:bg-[#FFF7E6] text-[#0B0F1F] text-xs font-bold shadow-[3px_3px_0_#0B0F1F] transition-all flex items-center gap-1.5"
                title="Ouvre le site tel que le voient vos clients, dans un nouvel onglet"
              >
                <Eye className="w-3.5 h-3.5 text-[#2B4BFF]" />
                <span>Voir le site client</span>
              </button>

              <button
                type="button"
                onClick={handleLockAgentMode}
                className="py-1.5 px-3 rounded-lg border-[3px] border-[#0B0F1F] bg-[#FFD60A] hover:brightness-95 text-[#0B0F1F] text-xs font-black shadow-[3px_3px_0_#0B0F1F] transition-all flex items-center gap-1.5"
                title="Verrouiller et masquer le dashboard agent"
              >
                <Lock className="w-3.5 h-3.5 text-[#0B0F1F]" />
                <span>Verrouiller</span>
              </button>
            </div>

            {/* Mobile Agent Menu Button */}
            <div className="flex lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-[#0B0F1F] hover:bg-white border-[3px] border-[#0B0F1F]"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown for Agent */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-[#FFF7E6] border-b-[3px] border-[#0B0F1F] px-4 py-3 space-y-1">
              {[
                { key: 'pipeline', label: `Leads (${leads.length})` },
                { key: 'nurture', label: 'Email' },
                { key: 'articles', label: 'Blog' },
                { key: 'stats', label: 'Statistiques' },
                { key: 'calculator', label: 'Calculatrice' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigate(item.key as NavView)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                    currentView === item.key
                      ? 'bg-[#2B4BFF] text-white font-bold'
                      : 'text-[#0B0F1F] hover:bg-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-2 border-t-[3px] border-[#0B0F1F] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#0B0F1F] bg-white border-[3px] border-[#0B0F1F] flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#2B4BFF]" />
                  <span>Confidentialité</span>
                </button>
                <button
                  type="button"
                  onClick={handleLockAgentMode}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#0B0F1F] bg-[#FFD60A] border-[3px] border-[#0B0F1F] flex items-center gap-2"
                >
                  <Lock className="w-4 h-4 text-[#0B0F1F]" />
                  <span>Verrouiller l'Espace Pro</span>
                </button>
              </div>
            </div>
          )}
        </header>
      ) : (
        /* =================== PUBLIC CLIENT HEADER (Warm SaaS Editorial) =================== */
        <>
          <header className="sticky top-0 z-40 bg-[#FFF7E6] border-b-[3px] border-[#0B0F1F]">
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
                  <div className="w-8.5 h-8.5 rounded-xl bg-[#2B4BFF] border-[3px] border-[#0B0F1F] text-white flex items-center justify-center font-bold text-sm group-hover:bg-[#0B0F1F] transition-all shadow-xs">
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

              {/* Public Right Area: Discreet Reassurance & Optional Pro Login */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[11px] font-bold text-[#0B0F1F] border-2 border-[#0B0F1F]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2B4BFF]" />
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
                    className="py-1.5 px-3 rounded-lg border-2 border-[#0B0F1F] bg-white hover:bg-[#FFD60A] text-[#0B0F1F] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
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
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 ${currentView === 'landing' ? 'pt-0 pb-0' : 'pt-8 pb-8'}`}>
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
            onDeleteLeads={handleDeleteLeads}
            onNavigateToNurture={handleNavigateToNurture}
          />
        )}

        {currentView === 'nurture' && <EmailManagerView leads={leads} onUpdateLead={handleUpdateLead} onShowToast={showToast} />}

        {currentView === 'calculator' && <CommissionCalculator />}
        {currentView === 'articles' && <ArticlesView />}
        {currentView === 'stats' && <StatsView leads={leads} />}
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

      {/* Réseaux sociaux : bandeau bien visible au-dessus du pied de page */}
      {!isAgentMode && (
        <section id="footer-socials" aria-label="Réseaux sociaux de Céline" className="border-t-[3px] border-[#0B0F1F] bg-white">
          <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4 px-4 py-6 sm:flex-row sm:gap-8 sm:px-6 lg:px-8">
            <p className="text-lg font-black text-[#0B0F1F]">Suivez Céline sur les réseaux</p>
            <div className="flex flex-wrap justify-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-4 py-2 text-sm font-black text-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F] transition-transform hover:-translate-y-0.5"
                >
                  {s.id === 'instagram' ? <Instagram className="h-5 w-5" /> : s.id === 'linkedin' ? <Linkedin className="h-5 w-5" /> : <Facebook className="h-5 w-5" />}
                  {s.label}
                  <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer : logo à gauche, menu à droite */}
      <footer className="bg-[#0B0F1F] py-8 pb-24 sm:pb-8 mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
          <a href="/" className="flex items-center gap-2.5 select-none" aria-label={`${BRAND.name} : retour à l'accueil`}>
            <span className="w-9 h-9 rounded-xl bg-[#2B4BFF] border-[3px] border-white text-white flex items-center justify-center">
              <Building2 className="w-[18px] h-[18px]" />
            </span>
            <span>
              <span className="block text-sm font-bold text-white tracking-tight leading-tight">{BRAND.name}</span>
              <span className="block text-[11px] text-white/60 leading-tight">{BRAND.tagline}</span>
            </span>
          </a>

          <nav aria-label="Liens du site" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/80">
            <a href="/blog" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Conseils</a>
            <a href="/contact" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Contact</a>
            <a href="/honoraires" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Honoraires</a>
            <a href="/mentions-legales" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Mentions légales</a>
            <a href="/confidentialite" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Politique de confidentialité</a>
            {isAgentMode ? (
              <span className="text-[#FFD60A] font-medium flex items-center gap-1.5">
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
                className="text-stone-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Lock className="w-3 h-3" />
                <span>Espace conseillers</span>
              </button>
            ) : null}
          </nav>
        </div>
      </footer>
    </div>
  );
}

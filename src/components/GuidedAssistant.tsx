import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bot, CalendarDays, CheckCircle2, Loader2, Send, ShieldCheck, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Lead, ValuationInputs, ValuationResult } from '../types';
import { AGENT, VISIT_LABEL } from '../data/siteContent';
import { fetchCalSlotsDetailed, syncLeadToSupabase } from '../lib/supabaseService';
import { getAttribution, trackConversion } from '../utils/tracking';
import { renderRichText } from '../utils/richText';
import { AddressSearch, AddressSuggestion } from './AddressSearch';
import { ValuationEvidence } from './LandingSections';

type Timeframe = Lead['timeframe'];
type Motive = Lead['motive'];

type Step =
  | 'address'
  | 'type'
  | 'surface'
  | 'rooms'
  | 'timeframe'
  | 'motive'
  | 'contact'
  | 'computing'
  | 'offer'
  | 'q_ownership'
  | 'q_mandate'
  | 'q_occupancy'
  | 'q_price';

interface Msg {
  id: string;
  role: 'assistant' | 'user';
  text?: string;
  result?: boolean; // renders the estimate card
}

export interface AssistantSeed {
  address: string;
  postalCode?: string;
  city?: string;
  nonce: number;
}

interface Props {
  seed: AssistantSeed | null;
  onLeadCaptured?: (lead: Lead, replacesId?: string) => void;
  onOpenBooking?: (info: Partial<Lead> & { preferredSlot?: { date: string; time: string } }) => void;
  onLeadReady?: (info: Partial<Lead> | null) => void;
}

const TIMEFRAMES: Array<[Timeframe, string]> = [
  ['< 1 mois', "Moins d'un mois"],
  ['1-3 mois', '1 à 3 mois'],
  ['3-6 mois', '3 à 6 mois'],
  ['> 6 mois', 'Plus de 6 mois'],
  ['Curiosité', 'Je me renseigne'],
];
const MOTIVES: Array<[Motive, string]> = [
  ['Agrandissement', 'Changer de logement'],
  ['Mutation pro', 'Mutation professionnelle'],
  ['Succession', 'Succession'],
  ['Divorce / Séparation', 'Séparation'],
  ['Vente investissement', 'Investissement'],
  ['Autre', 'Autre raison'],
];
const OWNERSHIP: Array<[string, string]> = [
  ['seul', 'Seul propriétaire'],
  ['plusieurs', 'Plusieurs propriétaires'],
  ['pas_encore', 'Pas encore propriétaire'],
];
const MANDATE: Array<[string, string]> = [
  ['aucun', 'Non, aucun'],
  ['estimations', "J'ai des estimations, sans mandat"],
  ['simple', 'Oui, mandat simple'],
  ['exclusif', 'Oui, mandat exclusif'],
];
const OCCUPANCY: Array<[string, string]> = [
  ['occupe', 'Je l\'habite'],
  ['libre', 'Il est libre'],
  ['loue', 'Il est loué'],
];

const DEFAULT_INPUTS: ValuationInputs = {
  propertyType: 'apartment',
  address: '',
  surface: 70,
  rooms: 3,
  city: '',
  postalCode: '',
  condition: 'good',
  outdoor: 'balcony',
  dpe: 'C',
  hasParking: true,
  hasElevator: true,
  hasCellar: false,
  floor: 'intermediate',
  viewType: 'standard',
  facadeState: 'good',
  heatingType: 'electric_indiv',
  constructionPeriod: '1975_1999',
  yearBuilt: 1995,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fmt = (n: number) => n.toLocaleString('fr-FR');
let uid = 0;
const nextId = () => `m-${Date.now()}-${uid++}`;

const Chip: React.FC<{ onClick: () => void; children: React.ReactNode; strong?: boolean; disabled?: boolean }> = ({ onClick, children, strong, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={
      strong
        ? 'rounded-full bg-amber-400 hover:bg-amber-300 text-[#0f1f3d] font-bold px-4 py-2.5 text-sm shadow transition-colors disabled:opacity-50'
        : 'rounded-full border border-stone-300 bg-white hover:border-[#0f1f3d] hover:bg-stone-50 text-stone-800 font-medium px-4 py-2.5 text-sm transition-colors disabled:opacity-50'
    }
  >
    {children}
  </button>
);

export const GuidedAssistant: React.FC<Props> = ({ seed, onLeadCaptured, onOpenBooking, onLeadReady }) => {
  const [inputs, setInputs] = useState<ValuationInputs>(DEFAULT_INPUTS);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>('address');
  const [typing, setTyping] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const leadRef = useRef<Lead | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1-3 mois');
  const [motive, setMotive] = useState<Motive>('Agrandissement');
  const [contact, setContact] = useState({ name: '', phone: '', email: '', consent: false });
  const [contactError, setContactError] = useState<string | null>(null);
  const [addrText, setAddrText] = useState('');
  const [picked, setPicked] = useState<AddressSuggestion | null>(null);
  const [cityText, setCityText] = useState('');
  const [postalText, setPostalText] = useState('');
  const [surfaceText, setSurfaceText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [freeText, setFreeText] = useState('');
  const [slots, setSlots] = useState<Record<string, string[]> | null>(null);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [qAnswers, setQAnswers] = useState<Record<string, any>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const lastSeed = useRef(0);

  const contactDone = step !== 'address' && step !== 'type' && step !== 'surface' && step !== 'rooms' && step !== 'timeframe' && step !== 'motive' && step !== 'contact' && step !== 'computing';

  // Keep the conversation (not the page) scrolled to the latest message
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Once the estimate is shown, keep its top in view: the price is the hook, the slots stay under it
    const card = el.querySelector<HTMLElement>('#assistant-result');
    const lastResult = messages.map((m) => m.result).lastIndexOf(true);
    if (card && lastResult >= messages.length - 3) el.scrollTo({ top: Math.max(0, card.offsetTop - 12), behavior: 'smooth' });
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, step]);

  const say = useCallback((text: string, opts?: { result?: boolean; delay?: number }) => {
    return new Promise<void>((resolve) => {
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        setMessages((m) => [...m, { id: nextId(), role: 'assistant', text, result: opts?.result }]);
        resolve();
      }, opts?.delay ?? 550);
    });
  }, []);
  const userSays = (text: string) => setMessages((m) => [...m, { id: nextId(), role: 'user', text }]);

  // Opening message
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void say(
      `Bonjour ! Je suis l'assistant virtuel de ${AGENT.firstName} (une intelligence artificielle). Je vous guide en 2 minutes : votre estimation, puis un rendez-vous avec ${AGENT.firstName} si vous le souhaitez.`,
      { delay: 300 },
    ).then(() => say("Pour commencer, quelle est l'adresse du bien à estimer ?", { delay: 450 }));
  }, [say]);

  // The hero search hands over an address: confirm it and move on
  useEffect(() => {
    if (!seed || seed.nonce === lastSeed.current || !started.current) return;
    if (step !== 'address') return;
    lastSeed.current = seed.nonce;
    setAddrText(seed.address);
    if (seed.city && seed.postalCode) {
      void confirmAddress(seed.address, seed.postalCode, seed.city);
    } else {
      setCityText(seed.city || '');
      setPostalText(seed.postalCode || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, step]);

  const confirmAddress = async (street: string, postalCode: string, city: string) => {
    setInputs((p) => ({ ...p, address: street, postalCode, city }));
    userSays(`${street}, ${postalCode} ${city}`);
    setStep('type');
    await say(`Merci. S'agit-il d'un appartement ou d'une maison ?`);
  };

  const submitAddress = () => {
    if (picked && picked.label === addrText) return void confirmAddress(picked.street, picked.postalCode, picked.city);
    const street = addrText.trim();
    const city = cityText.trim();
    const postal = postalText.replace(/\D/g, '').slice(0, 5);
    if (!street || !city || postal.length !== 5) return;
    void confirmAddress(street, postal, city);
  };

  const chooseType = async (kind: 'apartment' | 'house' | 'other') => {
    if (kind === 'other') {
      userSays('Un autre type de bien');
      await say(
        `Pour un garage, un terrain ou un local, ${AGENT.firstName} préfère vous répondre directement : appelez-la au **${AGENT.phone}** ou réservez une visite.`,
      );
      setStep('offer');
      void loadSlots();
      return;
    }
    setInputs((p) => ({ ...p, propertyType: kind }));
    userSays(kind === 'apartment' ? 'Un appartement' : 'Une maison');
    setStep('surface');
    await say('Quelle est sa surface habitable, en m² (approximativement) ?');
  };

  const submitSurface = async () => {
    const s = Number(surfaceText.replace(/[^\d]/g, ''));
    if (!s || s < 8 || s > 1000) return;
    setInputs((p) => ({ ...p, surface: s }));
    userSays(`${s} m²`);
    setStep('rooms');
    await say('Et combien de pièces principales ?');
  };

  const chooseRooms = async (n: number) => {
    setInputs((p) => ({ ...p, rooms: n }));
    userSays(n >= 6 ? '6 pièces ou plus' : `${n} pièce${n > 1 ? 's' : ''}`);
    setStep('timeframe');
    await say('Où en êtes-vous de votre projet ? Cela aide à adapter la suite, sans engagement.');
  };

  const chooseTimeframe = async (v: Timeframe, label: string) => {
    setTimeframe(v);
    userSays(label);
    setStep('motive');
    await say(v === 'Curiosité' ? "Très bien, c'est un bon moment pour connaître la valeur de son bien. Qu'est-ce qui vous amène ?" : 'Merci. Qu\'est-ce qui motive ce projet ?');
  };

  const chooseMotive = async (v: Motive, label: string) => {
    setMotive(v);
    userSays(label);
    setStep('contact');
    await say(
      `Votre estimation est prête à être calculée à partir des ventes réelles autour de chez vous. Où puis-je vous l'envoyer, et à qui ${AGENT.firstName} peut-elle s'adresser ?`,
    );
  };

  // Lead + valuation ------------------------------------------------------------------------------
  const requestValuation = async (): Promise<ValuationResult | null> => {
    try {
      const res = await fetch('/api/valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      const data = await res.json();
      return data.success && data.data ? (data.data as ValuationResult) : null;
    } catch {
      return null;
    }
  };

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = contact.name.trim();
    const phone = contact.phone.trim();
    const email = contact.email.trim();
    if (name.length < 2) return setContactError('Indiquez votre prénom et votre nom.');
    if (phone.replace(/\D/g, '').length < 8) return setContactError('Indiquez un numéro de téléphone valide.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setContactError('Indiquez une adresse e-mail valide.');
    if (!contact.consent) return setContactError('Merci de cocher la case de consentement pour continuer.');
    setContactError(null);

    userSays(`${name} · ${phone} · ${email}`);
    setStep('computing');
    setTyping(true);
    const [res] = await Promise.all([requestValuation(), new Promise((r) => window.setTimeout(r, 1400))]);
    setTyping(false);

    const typeLabel = inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison';
    const hot = timeframe === '< 1 mois' || timeframe === '1-3 mois';
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name,
      phone,
      email,
      address: inputs.address ? `${inputs.address}, ${inputs.postalCode} ${inputs.city}` : `${inputs.postalCode} ${inputs.city}`,
      propertyType: typeLabel,
      surface: inputs.surface,
      city: inputs.city,
      estimatedValue: res?.estimatedAvg || 0,
      motive,
      timeframe,
      status: hot ? 'HOT' : 'WARM',
      score: hot ? 60 : 40,
      meetingBooked: false,
      createdAt: "À l'instant",
      attribution: getAttribution(),
      valuation: res
        ? {
            dataSource: res.dataSource,
            lowPrice: res.lowPrice,
            highPrice: res.highPrice,
            medianM2: res.medianM2,
            sampleSize: res.sampleSize,
            radiusM: res.radiusM,
            periodFrom: res.periodFrom,
            periodTo: res.periodTo,
          }
        : undefined,
      notes: `Lead capturé par l'assistant (parcours conversationnel). Projet : ${motive} (${timeframe}). Bien : ${typeLabel} ${inputs.surface} m², ${inputs.rooms} pièces à ${inputs.city}.${
        res ? ` Fourchette affichée : ${fmt(res.lowPrice)} € - ${fmt(res.highPrice)} €.` : ' Estimation non calculée (service indisponible).'
      }`,
      tasks: [
        { id: `t-${Date.now()}-1`, label: 'Coordonnées laissées dans la conversation avec l\'assistant', done: true, category: 'qualification' },
        { id: `t-${Date.now()}-2`, label: 'Rappeler le vendeur sous 2h (priorité)', done: false, category: 'qualification' },
        { id: `t-${Date.now()}-3`, label: "Proposer et fixer la visite d'expertise", done: false, category: 'rdv' },
      ],
      activities: [
        { id: `act-${Date.now()}`, type: 'chat', label: 'Conversation avec l\'assistant : estimation débloquée', date: "À l'instant" },
      ],
    } as Lead;

    if (res) setResult(res);
    setLead(newLead);
    leadRef.current = newLead;
    onLeadCaptured?.(newLead);
    trackConversion('lead');
    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    } catch {
      /* ignoré */
    }
    onLeadReady?.({
      id: newLead.id,
      name,
      phone,
      email,
      city: inputs.city,
      address: inputs.address || inputs.city,
      surface: inputs.surface,
      propertyType: typeLabel,
      estimatedValue: res?.estimatedAvg,
      motive,
      timeframe,
    });

    syncLeadToSupabase(newLead)
      .then((realId) => {
        if (realId && realId !== newLead.id) {
          const synced = { ...newLead, id: realId };
          setLead(synced);
          leadRef.current = synced;
          onLeadCaptured?.(synced, newLead.id);
          onLeadReady?.({ id: realId, name, phone, email, city: inputs.city, address: inputs.address || inputs.city, surface: inputs.surface, propertyType: typeLabel, estimatedValue: res?.estimatedAvg, motive, timeframe });
        }
      })
      .catch(() => {});

    setStep('offer');
    void loadSlots();
    if (res) {
      await say(`Merci ${name.split(' ')[0]} ! Voici l'estimation de votre ${typeLabel.toLowerCase()} de ${inputs.surface} m² à ${inputs.city}.`, { delay: 300 });
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', result: true }]);
      await say(
        `C'est un repère : seule une visite tient compte de l'état réel, de la lumière, de l'étage ou de la vue. ${AGENT.firstName} vous propose une visite de **${VISIT_LABEL}**, gratuite et sans engagement. Choisissez un créneau ci-dessous.`,
        { delay: 900 },
      );
    } else {
      await say(
        `Merci ${name.split(' ')[0]}. Je n'arrive pas à consulter les ventes de votre secteur pour l'instant, je préfère ne pas vous donner un chiffre approximatif. ${AGENT.firstName} peut établir l'estimation lors d'une visite de **${VISIT_LABEL}**, gratuite et sans engagement.`,
      );
    }
  };

  // Slots ------------------------------------------------------------------------------------------
  const loadSlots = async () => {
    if (slots) return;
    try {
      const r = await fetchCalSlotsDetailed({ start: new Date().toISOString(), end: new Date(Date.now() + 21 * 86400000).toISOString() });
      if (r.success && Object.keys(r.slots || {}).some((k) => (r.slots[k] || []).length > 0)) setSlots(r.slots);
      else setSlotsFailed(true);
    } catch {
      setSlotsFailed(true);
    }
  };

  const bookingInfo = (): Partial<Lead> => ({
    id: leadRef.current?.id,
    name: contact.name.trim(),
    phone: contact.phone.trim(),
    email: contact.email.trim(),
    city: inputs.city,
    address: inputs.address || inputs.city,
    surface: inputs.surface,
    propertyType: inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison',
    estimatedValue: result?.estimatedAvg,
    motive,
    timeframe,
  });

  const pickSlot = (date: string, time: string) => onOpenBooking?.({ ...bookingInfo(), preferredSlot: { date, time } });

  const days = useMemo(() => {
    if (!slots) return [];
    return Object.keys(slots)
      .filter((d) => (slots[d] || []).length > 0)
      .sort()
      .slice(0, 3)
      .map((d) => ({
        date: d,
        label: new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }),
        times: slots[d].slice(0, 4),
      }));
  }, [slots]);

  // Quick questions (optional, after the offer) --------------------------------------------------------
  const startQuestions = async () => {
    userSays('Je préfère préparer la visite avec quelques questions');
    setStep('q_ownership');
    await say('Avec plaisir, trois questions rapides. Vous êtes…');
  };

  const sendQualification = (extra: Record<string, any>) => {
    const next = { ...qAnswers, ...extra };
    setQAnswers(next);
    const id = leadRef.current?.id;
    if (id && UUID_RE.test(id)) {
      fetch('/api/supabase/qualification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: id, ...next }),
      }).catch(() => {});
    }
  };

  const answerQ = async (key: 'ownership' | 'mandate' | 'occupancy', value: string, label: string) => {
    sendQualification({ [key]: value });
    userSays(label);
    if (key === 'ownership') {
      setStep('q_mandate');
      await say('Un mandat de vente est-il déjà signé pour ce bien ?');
    } else if (key === 'mandate') {
      setStep('q_occupancy');
      await say('Et votre bien est…');
    } else {
      setStep('q_price');
      await say(
        result
          ? `Dernière question, facultative : avez-vous un prix en tête ? (L'estimation est de ${fmt(result.lowPrice)} à ${fmt(result.highPrice)} €.)`
          : 'Dernière question, facultative : avez-vous un prix en tête pour ce bien ?',
      );
    }
  };

  const finishQuestions = async (skip: boolean) => {
    if (!skip) {
      const price = Number(priceText.replace(/[^\d]/g, ''));
      if (price >= 20000) {
        sendQualification({ expectedPrice: price });
        userSays(`${fmt(price)} €`);
      }
    } else userSays('Pas de prix en tête');
    setStep('offer');
    await say(`Merci, c'est transmis à ${AGENT.firstName} : elle arrivera préparée. Il ne reste qu'à choisir votre créneau.`);
  };

  // Free questions to the AI (after contact) ----------------------------------------------------------
  const askAssistant = async (text: string) => {
    const q = text.trim();
    if (!q || typing) return;
    setFreeText('');
    const history = [...messages.filter((m) => m.text), { id: 'q', role: 'user' as const, text: q }];
    setMessages((m) => [...m, { id: nextId(), role: 'user', text: q }]);
    setTyping(true);
    try {
      const res = await fetch('/api/chat-qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.text })),
          leadId: leadRef.current?.id,
          leadData: {
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            propertyType: inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison',
            surface: inputs.surface,
            city: inputs.city,
            motive,
            timeframe,
            estimatedAvg: result?.estimatedAvg,
            reponsesRapides: qAnswers,
          },
        }),
      });
      const data = await res.json();
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'assistant',
          text: data.reply || `Bonne question. ${AGENT.firstName} y répondra précisément lors de la visite de ${VISIT_LABEL}.`,
        },
      ]);
    } catch {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id: nextId(), role: 'assistant', text: `Je n'ai pas pu répondre à l'instant. Vous pouvez joindre ${AGENT.firstName} au ${AGENT.phone}.` },
      ]);
    }
  };

  // Rendering --------------------------------------------------------------------------------------------
  const resultCard =
    result && lead ? (
      <div className="rounded-2xl bg-white border border-stone-200 shadow-md p-4 sm:p-5 space-y-2 w-full">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <TrendingUp className="w-3.5 h-3.5" />
          Votre estimation
        </span>
        <div className="text-2xl sm:text-3xl font-bold text-[#0f1f3d] tracking-tight">
          {fmt(result.lowPrice)} € – {fmt(result.highPrice)} €
        </div>
        <div className="text-xs text-stone-600">
          ~{fmt(result.avgM2)} €/m² · {result.propertyType} de {result.surface} m² à {result.city}
        </div>
        <ValuationEvidence result={result} />
      </div>
    ) : null;

  const field =
    'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400';

  const composer = (() => {
    switch (step) {
      case 'address':
        return (
          <div className="space-y-2">
            <AddressSearch
              id="assistant-address"
              size="lg"
              value={addrText}
              onChange={(t) => {
                setAddrText(t);
                setPicked(null);
              }}
              onSelect={(s) => {
                setPicked(s);
                setAddrText(s.label);
                setCityText(s.city);
                setPostalText(s.postalCode);
              }}
              placeholder="Ex : 14 rue de la République, Lyon"
            />
            {addrText.trim().length > 3 && !picked && (
              <div className="grid grid-cols-[1fr_8rem] gap-2">
                <input className={field} placeholder="Ville" value={cityText} onChange={(e) => setCityText(e.target.value)} aria-label="Ville" />
                <input className={field} placeholder="Code postal" inputMode="numeric" value={postalText} onChange={(e) => setPostalText(e.target.value)} aria-label="Code postal" />
              </div>
            )}
            <Chip strong onClick={submitAddress}>
              Continuer <ArrowRight className="inline w-4 h-4 ml-1" />
            </Chip>
          </div>
        );
      case 'type':
        return (
          <div className="flex flex-wrap gap-2">
            <Chip onClick={() => chooseType('apartment')}>Appartement</Chip>
            <Chip onClick={() => chooseType('house')}>Maison</Chip>
            <Chip onClick={() => chooseType('other')}>Autre</Chip>
          </div>
        );
      case 'surface':
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitSurface();
            }}
            className="flex gap-2"
          >
            <input
              id="assistant-surface"
              className={field}
              inputMode="numeric"
              placeholder="Ex : 78"
              value={surfaceText}
              onChange={(e) => setSurfaceText(e.target.value)}
              aria-label="Surface en mètres carrés"
              autoFocus
            />
            <Chip strong onClick={() => void submitSurface()}>
              OK
            </Chip>
          </form>
        );
      case 'rooms':
        return (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Chip key={n} onClick={() => chooseRooms(n)}>
                {n === 6 ? '6 ou plus' : n}
              </Chip>
            ))}
          </div>
        );
      case 'timeframe':
        return (
          <div className="flex flex-wrap gap-2">
            {TIMEFRAMES.map(([v, l]) => (
              <Chip key={v} onClick={() => chooseTimeframe(v, l)}>
                {l}
              </Chip>
            ))}
          </div>
        );
      case 'motive':
        return (
          <div className="flex flex-wrap gap-2">
            {MOTIVES.map(([v, l]) => (
              <Chip key={v} onClick={() => chooseMotive(v, l)}>
                {l}
              </Chip>
            ))}
          </div>
        );
      case 'contact':
        return (
          <form onSubmit={submitContact} className="space-y-2.5" noValidate>
            <input id="input-prospect-name" className={field} placeholder="Prénom et nom" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} aria-label="Prénom et nom" />
            <div className="grid sm:grid-cols-2 gap-2.5">
              <input id="input-prospect-phone" className={field} placeholder="Téléphone" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} aria-label="Téléphone" />
              <input id="input-prospect-email" className={field} placeholder="E-mail" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} aria-label="E-mail" />
            </div>
            <label className="flex items-start gap-2.5 text-xs text-stone-600 leading-relaxed cursor-pointer">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={contact.consent} onChange={(e) => setContact({ ...contact, consent: e.target.checked })} />
              <span>
                J'accepte que mes coordonnées servent à m'envoyer mon estimation et à être recontacté(e) à ce sujet par {AGENT.name}. Mes données ne sont jamais revendues et je peux me désinscrire à tout moment.{' '}
                <a href="/confidentialite" target="_blank" rel="noreferrer" className="underline">Confidentialité</a>
              </span>
            </label>
            {contactError && <p role="alert" className="text-sm text-rose-700">{contactError}</p>}
            <button id="btn-submit-lead-gate" type="submit" className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0f1f3d] font-bold py-3.5 text-base shadow transition-colors">
              Voir mon estimation <ArrowRight className="inline w-4 h-4 ml-1" />
            </button>
          </form>
        );
      case 'computing':
        return (
          <div className="flex items-center gap-2 text-sm text-stone-600" role="status">
            <Loader2 className="w-4 h-4 animate-spin" />
            Je consulte les ventes réelles autour de chez vous…
          </div>
        );
      case 'q_ownership':
        return <div className="flex flex-wrap gap-2">{OWNERSHIP.map(([v, l]) => <Chip key={v} onClick={() => answerQ('ownership', v, l)}>{l}</Chip>)}</div>;
      case 'q_mandate':
        return <div className="flex flex-wrap gap-2">{MANDATE.map(([v, l]) => <Chip key={v} onClick={() => answerQ('mandate', v, l)}>{l}</Chip>)}</div>;
      case 'q_occupancy':
        return <div className="flex flex-wrap gap-2">{OCCUPANCY.map(([v, l]) => <Chip key={v} onClick={() => answerQ('occupancy', v, l)}>{l}</Chip>)}</div>;
      case 'q_price':
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void finishQuestions(false);
            }}
            className="flex flex-wrap gap-2 items-center"
          >
            <input className={`${field} flex-1 min-w-[10rem]`} inputMode="numeric" placeholder="Ex : 350 000" value={priceText} onChange={(e) => setPriceText(e.target.value)} aria-label="Prix espéré en euros" />
            <Chip strong onClick={() => void finishQuestions(false)}>Valider</Chip>
            <Chip onClick={() => void finishQuestions(true)}>Passer</Chip>
          </form>
        );
      case 'offer':
        return (
          <div className="space-y-3">
            {slots === null && !slotsFailed && (
              <div className="flex items-center gap-2 text-sm text-stone-600" role="status">
                <Loader2 className="w-4 h-4 animate-spin" /> Je regarde les disponibilités de {AGENT.firstName}…
              </div>
            )}
            {days.length > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-3 sm:p-4 space-y-3">
                <p className="text-sm font-semibold text-[#0f1f3d] flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-600" />
                  Prochains créneaux de {AGENT.firstName} (visite de {VISIT_LABEL})
                </p>
                {days.map((d) => (
                  <div key={d.date} className="space-y-1.5">
                    <div className="text-xs font-medium text-stone-600 capitalize">{d.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {d.times.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => pickSlot(d.date, t)}
                          className="rounded-lg bg-[#0f1f3d] hover:bg-[#1a3060] text-white font-semibold text-sm px-4 py-2.5 transition-colors"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Chip strong disabled={slots === null && !slotsFailed} onClick={() => onOpenBooking?.(bookingInfo())}>
                {days.length > 0 ? 'Voir tous les créneaux' : `Réserver ma visite gratuite (${VISIT_LABEL})`}
              </Chip>
              {!qAnswers.ownership && <Chip onClick={startQuestions}>Préparer ma visite en 3 questions</Chip>}
            </div>
            {slotsFailed && (
              <p className="text-sm text-stone-600">
                L'agenda est momentanément indisponible. Appelez {AGENT.firstName} au{' '}
                <a className="underline font-semibold" href={AGENT.phoneHref}>{AGENT.phone}</a> : elle fixera la visite avec vous.
              </p>
            )}
          </div>
        );
    }
  })();

  return (
    <div
      id="assistant-panel"
      className="rounded-3xl border border-stone-200 bg-white shadow-xl overflow-hidden flex flex-col max-w-3xl mx-auto w-full"
      style={{ height: 'min(82vh, 760px)', minHeight: 520 }}
    >
      <header className="bg-[#0f1f3d] text-white px-4 sm:px-5 py-3.5 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-amber-400 text-[#0f1f3d] flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f1f3d]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm flex items-center gap-2">
            Assistant de {AGENT.firstName}
            <span className="text-[10px] font-bold bg-white/15 border border-white/20 rounded-full px-2 py-0.5 text-amber-200">IA</span>
          </div>
          <div className="text-xs text-slate-300">Estimation gratuite · réponse en 2 minutes</div>
        </div>
        <a href={AGENT.phoneHref} className="text-xs text-slate-200 hover:text-white underline underline-offset-4 whitespace-nowrap">
          {AGENT.phone}
        </a>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-3 bg-stone-50" aria-live="polite">
        {messages.map((m) =>
          m.result ? (
            <div key={m.id} id="assistant-result" className="max-w-[92%]">{resultCard}</div>
          ) : (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl rounded-br-md bg-[#0f1f3d] text-white px-4 py-2.5 text-sm leading-relaxed'
                    : 'max-w-[92%] rounded-2xl rounded-bl-md bg-white border border-stone-200 text-stone-800 px-4 py-2.5 text-[15px] leading-relaxed shadow-xs'
                }
              >
                {renderRichText(m.text || '')}
              </div>
            </div>
          ),
        )}
        {typing && (
          <div className="flex" aria-label="L'assistant écrit">
            <div className="rounded-2xl rounded-bl-md bg-white border border-stone-200 px-4 py-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-stone-200 bg-white px-4 sm:px-5 py-4 space-y-3 max-h-[60%] overflow-y-auto">
        {!typing || step === 'computing' ? composer : <div className="h-10" />}
        {contactDone && step !== 'computing' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void askAssistant(freeText);
            }}
            className="flex gap-2 pt-1"
          >
            <input
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder={`Une question ? Posez-la à l'assistant`}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              aria-label="Poser une question à l'assistant"
            />
            <button type="submit" disabled={!freeText.trim() || typing} className="rounded-xl bg-[#0f1f3d] text-white px-3.5 disabled:opacity-40" aria-label="Envoyer">
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Assistant automatisé (IA) · estimation basée sur les ventes enregistrées par l'État · données jamais revendues
        </p>
      </div>
    </div>
  );
};

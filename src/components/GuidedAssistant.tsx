import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bot, CalendarDays, Check, CheckCircle2, Loader2, Lock, Send, ShieldCheck, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Lead, ValuationInputs, ValuationResult } from '../types';
import { AGENT } from '../data/siteContent';
import { isValidFrPhone } from '../utils/phone';
import { fetchCalSlotsDetailed, syncLeadToSupabase } from '../lib/supabaseService';
import { getAttribution, trackConversion } from '../utils/tracking';
import { renderRichText } from '../utils/richText';
import { AddressSearch, AddressSuggestion } from './AddressSearch';
import { ValuationEvidence } from './LandingSections';
import { Human, Robot } from './Mascots';

type Timeframe = Lead['timeframe'];
type Motive = Lead['motive'];

type Step =
  | 'address'
  | 'type'
  | 'surface'
  | 'land'
  | 'rooms'
  | 'timeframe'
  | 'motive'
  | 'contact'
  | 'computing'
  | 'offer'
  | 'q_ownership'
  | 'q_mandate'
  | 'q_occupancy'
  | 'q_price'
  | 'q_job';

interface Msg {
  id: string;
  role: 'assistant' | 'user';
  text?: string;
  result?: boolean; // renders the estimate card
  rewind?: Step; // answer the visitor can change: going back re-asks this step
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
  ['occupe', 'Habité'],
  ['libre', 'Libre'],
  ['loue', 'Loué'],
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

/** Wording of the consent box, kept with each lead as proof (version to bump whenever the text changes). */
const CONSENT_VERSION = '2026-10-v3';
const CONSENT_TEXT = `Je donne mon consentement explicite à être contacté(e) par ${AGENT.name}, conseillère immobilière indépendante, par téléphone ou par e-mail, au sujet de mon projet immobilier : réception de mon estimation, proposition d'une visite et quelques e-mails utiles liés à cette estimation. Pour cela, elle utilise mon nom, mon numéro de téléphone et mon adresse e-mail. Je peux retirer mon consentement à tout moment, sans frais, en un clic dans chaque e-mail ou en contactant ${AGENT.firstName}. Mes données ne sont jamais revendues et sont conservées 3 ans après notre dernier échange.`;

const Chip: React.FC<{ onClick: () => void; children: React.ReactNode; strong?: boolean; disabled?: boolean }> = ({ onClick, children, strong, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={
      strong
        ? 'rounded-full bg-[#FFD60A] hover:bg-[#ffe34d] text-[#0B0F1F] border-[3px] border-white font-black px-4 py-2.5 text-sm transition-colors disabled:opacity-50'
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
  const [landText, setLandText] = useState('');
  const [land, setLand] = useState<number | null>(null);
  const [jobText, setJobText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [freeText, setFreeText] = useState('');
  const [slots, setSlots] = useState<Record<string, string[]> | null>(null);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [qAnswers, setQAnswers] = useState<Record<string, any>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const lastSeed = useRef(0);

  const contactDone = step !== 'address' && step !== 'type' && step !== 'surface' && step !== 'rooms' && step !== 'timeframe' && step !== 'motive' && step !== 'contact' && step !== 'computing';

  const expanded = Boolean(result && lead);

  // Keep the conversation (not the page) scrolled to the latest message
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Once the estimate is shown, keep its top in view: the price is the hook, the slots stay under it
    const card = el.querySelector<HTMLElement>('#assistant-result');
    const lastResult = messages.map((m) => m.result).lastIndexOf(true);
    if (card && expanded) {
      if (lastResult >= messages.length - 1 && !typing) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
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
      }, opts?.delay ?? 800 + Math.floor(Math.random() * 700));
    });
  }, []);
  const userSays = (text: string, rewind?: Step) => setMessages((m) => [...m, { id: nextId(), role: 'user', text, rewind }]);

  // Let the visitor correct an earlier answer: drop everything after it and ask that question again
  const goBack = (msg: Msg) => {
    if (!msg.rewind || typing || step === 'computing') return;
    setMessages((m) => {
      const i = m.findIndex((x) => x.id === msg.id);
      return i < 0 ? m : m.slice(0, i);
    });
    const early: Step[] = ['address', 'type', 'surface', 'land', 'rooms', 'timeframe', 'motive', 'contact'];
    if (early.includes(msg.rewind)) setResult(null);
    setStep(msg.rewind);
  };

  // Opening message
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void say(
      `Bonjour ! Je suis l'assistant virtuel (IA) de ${AGENT.firstName}. En 2 minutes, nous évaluons la valeur de votre bien immobilier en Région Lyonnaise ou dans le Beaujolais.`,
    ).then(() => say("Pour commencer, quelle est l'adresse du bien à estimer ?"));
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

  const confirmAddress = async (street: string, postalCode: string, city: string, knownInZone?: boolean | null) => {
    // Only properties inside the advisor's area go further: no contact, no conversion, no wasted advertising
    let inZone = knownInZone;
    let radius = 50;
    if (inZone === undefined || inZone === null) {
      try {
        const r = await fetch('/api/zone-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: street, city, postalCode }),
        });
        const d = await r.json();
        inZone = d.inZone;
        radius = d.radiusKm || radius;
      } catch {
        inZone = null; // service unreachable: never turn a seller away because of an outage
      }
    }
    if (inZone === false) {
      userSays(`${street}, ${postalCode} ${city}`);
      await say(
        `${AGENT.firstName} intervient à Lyon et dans un rayon d'environ ${radius} km autour. Votre bien à **${city}** semble en dehors de ce secteur, je ne peux donc pas planifier de visite. Si l'adresse est erronée, saisissez-la de nouveau ci-dessous. Pour un projet particulier, vous pouvez appeler ${AGENT.firstName} au **${AGENT.phone}**.`,
      );
      return;
    }
    setInputs((p) => ({ ...p, address: street, postalCode, city }));
    userSays(`${street}, ${postalCode} ${city}`, 'address');
    setStep('type');
    await say(`Merci. S'agit-il d'un appartement ou d'une maison ?`);
  };

  const submitAddress = () => {
    if (picked && picked.label === addrText) return void confirmAddress(picked.street, picked.postalCode, picked.city, picked.inZone);
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
    userSays(kind === 'apartment' ? 'Un appartement' : 'Une maison', 'type');
    setStep('surface');
    await say('Quelle est sa surface habitable, en m² (approximativement) ?');
  };

  const submitSurface = async () => {
    const s = Number(surfaceText.replace(/[^\d]/g, ''));
    if (!s || s < 8 || s > 1000) return;
    setInputs((p) => ({ ...p, surface: s }));
    userSays(`${s} m²`, 'surface');
    if (inputs.propertyType === 'house') {
      setStep('land');
      await say('Et quelle est la superficie du terrain, en m² ? (facultatif)');
      return;
    }
    setLand(null);
    setStep('rooms');
    await say('Et combien de pièces principales ?');
  };

  const submitLand = async (skip: boolean) => {
    const n = Number(landText.replace(/[^\d]/g, ''));
    const value = !skip && n > 0 ? n : null;
    setLand(value);
    userSays(value ? `Terrain : ${fmt(value)} m²` : 'Je ne sais pas', 'land');
    setStep('rooms');
    await say('Et combien de pièces principales ?');
  };

  const chooseRooms = async (n: number) => {
    setInputs((p) => ({ ...p, rooms: n }));
    userSays(n >= 6 ? '6 pièces ou plus' : `${n} pièce${n > 1 ? 's' : ''}`, 'rooms');
    setStep('timeframe');
    await say('Où en êtes-vous de votre projet ? Cela aide à adapter la suite, sans engagement.');
  };

  const chooseTimeframe = async (v: Timeframe, label: string) => {
    setTimeframe(v);
    userSays(label, 'timeframe');
    setStep('motive');
    await say(v === 'Curiosité' ? "Très bien, connaître la valeur de son bien est une bonne démarche, même sans projet précis. Quelle est la raison de votre démarche ?" : "Merci. Qu'est-ce qui motive ce projet ?");
  };

  const chooseMotive = async (v: Motive, label: string) => {
    setMotive(v);
    userSays(label, 'motive');
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
    if (!isValidFrPhone(phone)) return setContactError('Indiquez un numéro de téléphone français valide (ex : 06 12 34 56 78) : Céline doit pouvoir vous joindre.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setContactError('Indiquez une adresse e-mail valide.');
    if (!contact.consent) return setContactError("Pour obtenir votre estimation, cochez la case : vous donnez ainsi votre consentement à être contacté(e) par Céline.");
    setContactError(null);

    userSays(`${name} · ${phone} · ${email}`, 'contact');
    setStep('computing');
    setTyping(true);
    const [res] = await Promise.all([requestValuation(), new Promise((r) => window.setTimeout(r, 1400))]);
    setTyping(false);

    const hadLead = Boolean(leadRef.current);
    const typeLabel = inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison';
    const hot = timeframe === '< 1 mois' || timeframe === '1-3 mois';
    const newLead: Lead = {
      id: leadRef.current?.id || `lead-${Date.now()}`,
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
      consent: { wording: CONSENT_TEXT, version: CONSENT_VERSION, page: typeof window !== 'undefined' ? window.location.pathname : '' },
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
      notes: `Lead capturé par l'assistant (parcours conversationnel). Projet : ${motive} (${timeframe}). Bien : ${typeLabel} ${inputs.surface} m²${land ? `, terrain ${fmt(land)} m²` : ''}, ${inputs.rooms} pièces à ${inputs.city}.${
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
    if (!hadLead) trackConversion('lead');
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
      valuation: res ? { lowPrice: res.lowPrice, highPrice: res.highPrice } : undefined,
    });

    syncLeadToSupabase(newLead)
      .then((realId) => {
        if (realId && realId !== newLead.id) {
          const synced = { ...newLead, id: realId };
          setLead(synced);
          leadRef.current = synced;
          onLeadCaptured?.(synced, newLead.id);
          onLeadReady?.({ id: realId, name, phone, email, city: inputs.city, address: inputs.address || inputs.city, surface: inputs.surface, propertyType: typeLabel, estimatedValue: res?.estimatedAvg, motive, timeframe, valuation: res ? { lowPrice: res.lowPrice, highPrice: res.highPrice } : undefined });
        }
      })
      .catch(() => {});

    setStep('offer');
    void loadSlots();
    if (res) {
      await say(`Merci ${name.split(' ')[0]} ! Voici l'estimation de votre ${typeLabel.toLowerCase()} de ${inputs.surface} m² à ${inputs.city}.`, { delay: 300 });
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', result: true }]);
    } else {
      await say(`Merci ${name.split(' ')[0]}. Je n'arrive pas à consulter les ventes de votre secteur pour l'instant, et je préfère ne pas vous donner un chiffre approximatif.`);
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', result: true }]);
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
    address: inputs.address ? `${inputs.address}, ${inputs.postalCode} ${inputs.city}` : `${inputs.postalCode} ${inputs.city}`,
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
      .slice(0, 2)
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
    userSays(label, key === 'ownership' ? 'q_ownership' : key === 'mandate' ? 'q_mandate' : 'q_occupancy');
    if (key === 'ownership') {
      setStep('q_mandate');
      await say('Un mandat de vente est-il déjà signé pour ce bien ?');
    } else if (key === 'mandate') {
      setStep('q_occupancy');
      await say('Et votre bien est…');
    } else {
      setStep('q_price');
      await say('Avez-vous déjà un prix en tête pour votre bien ?');
    }
  };

  const finishQuestions = async (skip: boolean) => {
    if (!skip) {
      const price = Number(priceText.replace(/[^\d]/g, ''));
      if (price >= 20000) {
        sendQualification({ expectedPrice: price });
        userSays(`${fmt(price)} €`, 'q_price');
      }
    } else userSays('Pas de prix en tête');
    setStep('q_job');
    await say("Un dernier mot sur vous : quelle est votre activité professionnelle ? (Facultatif, simple curiosité pour mieux vous connaître avant notre rencontre)");
  };

  const finishJob = async (skip: boolean) => {
    const job = jobText.trim().slice(0, 80);
    if (!skip && job) {
      sendQualification({ profession: job });
      userSays(job, 'q_job');
    } else userSays('Je préfère passer');
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
          text: data.reply || `Bonne question. ${AGENT.firstName} y répondra précisément lors de la visite.`,
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

  // Count-up of the range so the result "lands" (skipped when the visitor prefers reduced motion)
  const [shownLow, setShownLow] = useState(0);
  const [shownHigh, setShownHigh] = useState(0);
  useEffect(() => {
    if (!result) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShownLow(result.lowPrice); setShownHigh(result.highPrice); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      const e = 1 - Math.pow(1 - t, 3);
      setShownLow(Math.round((result.lowPrice * e) / 1000) * 1000);
      setShownHigh(Math.round((result.highPrice * e) / 1000) * 1000);
      if (t < 1) raf = requestAnimationFrame(tick);
      else { setShownLow(result.lowPrice); setShownHigh(result.highPrice); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  const pitchCard = (
    <div className="rounded-2xl bg-[#2B4BFF] text-white p-4 sm:p-5 shadow-lg border-l-4 border-[#0B0F1F] w-full">
      <p className="text-[#FFD60A] text-[11px] font-bold uppercase tracking-wider mb-1.5">Pourquoi prendre rendez-vous ?</p>
      <p className="text-[15px] sm:text-base leading-relaxed">
        <strong className="text-white">Ce montant est un premier indicateur.</strong> Seule une visite physique sur place permet de fixer le prix juste, la clé d'une vente réussie. {AGENT.firstName} étudie votre bien et vous remet un <strong className="text-[#FFD60A]">avis de valeur complet sous 48h</strong>.
      </p>
      <p className="mt-2 text-[15px] sm:text-base leading-relaxed">
        <strong className="text-white">{AGENT.firstName} vous contactera personnellement</strong> pour tout organiser et répondre à vos questions.
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[#FFD60A]">Réservez votre visite offerte et sans engagement ↓</p>
    </div>
  );

  // Rendering --------------------------------------------------------------------------------------------
  const resultCard =
    result && lead ? (
      <div className="relative w-full space-y-5 rounded-3xl border-[3px] border-[#0B0F1F] bg-[#0B0F1F] p-4 text-white shadow-[6px_6px_0_#2B4BFF] sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Robot className="bob h-16 w-12 shrink-0 sm:h-20 sm:w-16" />
          <div className="min-w-0 space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#0B0F1F]">
              <TrendingUp className="h-3.5 w-3.5" />
              Estimation indicative (IA)
            </span>
            <p className="text-xs font-semibold leading-snug text-white/80 sm:text-sm">Calculée par l'assistant IA de {AGENT.firstName} à partir des ventes réelles (DVF) autour de chez vous.</p>
          </div>
        </div>

        <div className="space-y-2 text-center">
          <div className="text-4xl font-black leading-none tracking-tight text-[#FFD60A] sm:text-6xl" aria-hidden="true">
            {fmt(shownLow)} € <span className="text-white">–</span> {fmt(shownHigh)} €
          </div>
          <p className="sr-only">Fourchette de {fmt(result.lowPrice)} à {fmt(result.highPrice)} euros.</p>
          <p className="text-sm font-medium leading-snug text-white/85">
            La base DVF donne des moyennes. Votre logement se situe quelque part dans cette amplitude :
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border-[3px] border-white/90 bg-[#FFF7E6] p-3 text-[#0B0F1F] sm:p-4">
          <div className="flex justify-between gap-3 text-xs sm:text-sm">
            <div>
              <div className="font-black">📉 Décote</div>
              <div className="text-[11px] font-medium text-[#0B0F1F]/70">Travaux, bruit, vis-à-vis</div>
            </div>
            <div className="text-right">
              <div className="font-black">📈 Plus-value</div>
              <div className="text-[11px] font-medium text-[#0B0F1F]/70">Lumière, vue, état irréprochable</div>
            </div>
          </div>
          <div className="relative flex h-4 rounded-full border-[3px] border-[#0B0F1F] bg-white">
            <span aria-hidden className="h-full w-1/3 rounded-l-full bg-[#FFD60A]" />
            <span aria-hidden className="ml-auto h-full w-1/3 rounded-r-full bg-[#2B4BFF]" />
            <button
              type="button"
              onClick={() => onOpenBooking?.(bookingInfo())}
              className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border-[3px] border-[#0B0F1F] bg-[#0B0F1F] px-3 py-2 text-[11px] font-black text-white sm:px-4 sm:text-xs"
            >
              <Lock className="h-3.5 w-3.5 text-[#FFD60A]" /> <span className="sm:hidden">Valeur réelle sur place</span><span className="hidden sm:inline">Valeur réelle à déterminer sur place</span>
            </button>
          </div>
          <div className="h-2" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-2xl border-[3px] border-white/90 bg-[#2B4BFF] p-4 text-white">
            <div className="flex items-center justify-between gap-2 text-sm font-black">
              <span>🤖 Ce que voit l'algorithme (IA)</span>
            </div>
            <ul className="space-y-1 text-sm font-medium">
              {['Surface en m²', 'Code postal / quartier', 'Historique des ventes DVF'].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFD60A]" />{t}</li>
              ))}
            </ul>
            <p className="text-xs italic text-white/80">Une vision théorique, sans visite.</p>
          </div>
          <div className="space-y-2 rounded-2xl border-[3px] border-white/90 bg-[#FFD60A] p-4 text-[#0B0F1F]">
            <div className="text-sm font-black">🏠 Ce que valide {AGENT.firstName} sur place</div>
            <ul className="space-y-1 text-sm font-semibold">
              {['Luminosité, exposition & vue', 'Agencement & potentiel du bien', 'Qualité des prestations & matériaux', 'Demande réelle des acheteurs du secteur'].map((t) => (
                <li key={t} className="flex gap-2"><Lock className="mt-1 h-3.5 w-3.5 shrink-0" />{t}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-end gap-3 sm:gap-4">
          <Human className="bob w-20 shrink-0 sm:w-28" />
          <div className="min-w-0 flex-1 space-y-2 pb-1">
          <button
            type="button"
            onClick={() => onOpenBooking?.(bookingInfo())}
            className="cta-pulse flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-white bg-[#FFD60A] px-4 py-4 text-base font-black text-[#0B0F1F] shadow-[5px_5px_0_#2B4BFF] transition-transform hover:-translate-y-0.5 sm:text-lg"
          >
            <Lock className="h-5 w-5" /> Débloquer l'avis de valeur réel avec {AGENT.firstName}
          </button>
          <p className="text-center text-xs font-semibold text-white/80">Visite offerte et sans engagement · avis de valeur sous 48h</p>
          </div>
        </div>

        <div className="text-center text-xs font-medium text-white/70">
          ~{fmt(result.avgM2)} €/m² · {result.propertyType} de {result.surface} m² à {result.city}
        </div>
        <ValuationEvidence result={result} />
      </div>
    ) : null;

  const field =
    'w-full rounded-xl border-[3px] border-white bg-white px-4 py-3 text-base font-medium text-[#0B0F1F] placeholder:text-[#0B0F1F]/50 focus:outline-none focus:ring-4 focus:ring-[#FFD60A] focus:border-[#FFD60A]';

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
            <label className="flex items-start gap-3 text-xs text-white/90 leading-relaxed cursor-pointer">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#FFD60A]" checked={contact.consent} onChange={(e) => setContact({ ...contact, consent: e.target.checked })} />
              <span>
                {CONSENT_TEXT}{' '}
                <a href="/confidentialite" target="_blank" rel="noreferrer" className="font-bold underline">Politique de confidentialité</a>
              </span>
            </label>
            {contactError && <p role="alert" className="text-sm font-bold text-[#FFD60A]">{contactError}</p>}
            <button id="btn-submit-lead-gate" type="submit" className="w-full rounded-xl bg-[#FFD60A] hover:bg-[#ffe34d] text-[#0B0F1F] border-[3px] border-white font-black py-3.5 text-base shadow transition-colors">
              Voir mon estimation <ArrowRight className="inline w-4 h-4 ml-1" />
            </button>
          </form>
        );
      case 'computing':
        return (
          <div className="flex items-center gap-2 text-sm text-white/90" role="status">
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
            <input className={`${field} flex-1 min-w-[10rem]`} inputMode="numeric" placeholder={result ? `Ex : ${fmt(Math.round(result.estimatedAvg / 1000) * 1000)}` : 'Ex : 350 000'} value={priceText} onChange={(e) => setPriceText(e.target.value)} aria-label="Prix espéré en euros" />
            <Chip strong onClick={() => void finishQuestions(false)}>Valider</Chip>
            <Chip onClick={() => void finishQuestions(true)}>Passer</Chip>
          </form>
        );
      case 'land':
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitLand(false);
            }}
            className="flex flex-wrap gap-2 items-center"
          >
            <input className={`${field} flex-1 min-w-[10rem]`} inputMode="numeric" placeholder="Ex : 600" value={landText} onChange={(e) => setLandText(e.target.value)} aria-label="Superficie du terrain en mètres carrés" autoFocus />
            <Chip strong onClick={() => void submitLand(false)}>OK</Chip>
            <Chip onClick={() => void submitLand(true)}>Je ne sais pas</Chip>
          </form>
        );
      case 'q_job':
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void finishJob(false);
            }}
            className="flex flex-wrap gap-2 items-center"
          >
            <input className={`${field} flex-1 min-w-[10rem]`} maxLength={80} placeholder="Ex : infirmière, artisan, retraité…" value={jobText} onChange={(e) => setJobText(e.target.value)} aria-label="Activité professionnelle (facultatif)" />
            <Chip strong onClick={() => void finishJob(false)}>Valider</Chip>
            <Chip onClick={() => void finishJob(true)}>Passer</Chip>
          </form>
        );
      case 'offer':
        return (
          <div className="space-y-3">
            {pitchCard}
            {slots === null && !slotsFailed && (
              <div className="flex items-center gap-2 text-sm text-white/90" role="status">
                <Loader2 className="w-4 h-4 animate-spin" /> Je regarde les disponibilités de {AGENT.firstName}…
              </div>
            )}
            {days.length > 0 && (
              <div className="rounded-2xl border border-[#0B0F1F] bg-[#FFF7E6] p-3 sm:p-4 space-y-3">
                <p className="text-sm font-semibold text-[#0B0F1F] flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#2B4BFF]" />
                  Disponibilités de {AGENT.firstName} pour votre visite sur place
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
                          className="rounded-lg bg-[#2B4BFF] hover:bg-[#0B0F1F] text-white font-semibold text-sm px-4 py-2.5 transition-colors"
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
                {days.length > 0 ? 'Voir tous les créneaux disponibles' : 'Réserver ma visite offerte'}
              </Chip>
              {!qAnswers.ownership && <Chip onClick={startQuestions}>Préparer le rendez-vous (3 questions)</Chip>}
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
      className="rounded-3xl border-[3px] border-[#0B0F1F] bg-white shadow-[8px_8px_0_#0B0F1F] overflow-hidden flex flex-col max-w-3xl mx-auto w-full"
      style={expanded ? undefined : { maxHeight: 'min(90vh, 880px)' }}
    >
      <header className="bg-[#2B4BFF] text-white px-4 sm:px-5 py-3.5 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-[#FFD60A] text-[#0B0F1F] flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FFF7E6] border-2 border-[#0B0F1F]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm flex items-center gap-2">
            Assistant Estimation de {AGENT.firstName}
            <span className="text-[10px] font-bold bg-white/15 border border-white/20 rounded-full px-2 py-0.5 text-[#FFD60A]">IA</span>
          </div>
          <div className="text-xs text-slate-300">100 % offert · Données DVF officielles · Réponse en 2 min</div>
        </div>
        <a href={AGENT.phoneHref} className="text-xs text-slate-200 hover:text-white underline underline-offset-4 whitespace-nowrap">
          {AGENT.phone}
        </a>
      </header>

      {result && lead && (
        <div className="bg-[#FFF7E6] border-b border-[#0B0F1F] px-4 sm:px-5 py-2 flex items-baseline justify-between gap-3" aria-label="Rappel de votre estimation">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0B0F1F]">Estimation indicative (IA)</span>
          <span className="text-base sm:text-lg font-bold text-[#0B0F1F] whitespace-nowrap">
            {fmt(result.lowPrice)} – {fmt(result.highPrice)} €
          </span>
        </div>
      )}

      <div ref={scrollRef} className={`relative min-h-0 ${expanded ? '' : 'overflow-y-auto'} px-4 sm:px-5 py-5 space-y-3 bg-stone-50`} aria-live="polite">
        {messages.map((m) =>
          m.result ? (
            <div key={m.id} id="assistant-result" className="w-full space-y-3 scroll-mt-4">{resultCard}</div>
          ) : (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl rounded-br-md bg-[#2B4BFF] text-white px-4 py-2.5 text-sm leading-relaxed'
                    : 'max-w-[92%] rounded-2xl rounded-bl-md bg-white border border-stone-200 text-stone-800 px-4 py-2.5 text-[15px] leading-relaxed shadow-xs'
                }
              >
                {renderRichText(m.text || '')}
                {m.role === 'user' && m.rewind && (
                  <button
                    type="button"
                    onClick={() => goBack(m)}
                    disabled={typing || step === 'computing'}
                    className="ml-2 text-[11px] underline underline-offset-2 text-slate-300 hover:text-white disabled:opacity-40"
                    aria-label={`Modifier ma réponse : ${m.text}`}
                  >
                    Modifier
                  </button>
                )}
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

      <div className={`border-t-[3px] border-[#0B0F1F] bg-[#0B0F1F] text-white px-4 sm:px-5 py-4 space-y-3 shrink-0 ${expanded ? '' : 'max-h-[52vh] overflow-y-auto'}`}>
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
              className="flex-1 rounded-xl border-[3px] border-white bg-white px-4 py-2.5 text-sm font-medium text-[#0B0F1F] placeholder:text-[#0B0F1F]/50 focus:outline-none focus:ring-4 focus:ring-[#FFD60A]"
              placeholder={`Une question ? Posez-la à l'assistant`}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              aria-label="Poser une question à l'assistant"
            />
            <button type="submit" disabled={!freeText.trim() || typing} className="rounded-xl border-[3px] border-white bg-[#FFD60A] text-[#0B0F1F] px-3.5 disabled:opacity-40" aria-label="Envoyer">
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-white/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          Assistant automatisé (IA) · estimation basée sur les ventes enregistrées par l'État · données jamais revendues
        </p>
      </div>
    </div>
  );
};

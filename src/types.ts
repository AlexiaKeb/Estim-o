export interface ValuationInputs {
  propertyType: 'apartment' | 'house' | 'garage' | 'terrain' | 'building' | 'commercial';
  address?: string;
  surface: number;
  rooms: number;
  city: string;
  postalCode: string;
  condition: 'to_renovate' | 'refresh_needed' | 'good' | 'renovated' | 'new';
  outdoor: 'none' | 'balcony' | 'terrace' | 'garden';
  dpe: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'unknown';
  hasParking: boolean;
  hasElevator: boolean;
  hasCellar: boolean;
  floor?: 'rdc' | 'intermediate' | 'high_floor' | 'top_floor' | 'single_storey' | 'multi_storey';
  viewType?: 'open' | 'standard' | 'street' | 'exceptional' | 'vis_a_vis';
  facadeState?: 'recent' | 'good' | 'to_plan' | 'not_applicable';
  heatingType?: 'electric_indiv' | 'gas_indiv' | 'gas_collective' | 'heat_pump' | 'wood_pellet' | 'other';
  constructionPeriod?: 'before_1948' | '1949_1974' | '1975_1999' | '2000_2015' | 'after_2016' | 'unknown';
  yearBuilt?: number;
  customDetails?: string;
}

export interface ValuationResult {
  lowPrice: number;
  highPrice: number;
  estimatedAvg: number;
  avgM2: number;
  currency: string;
  address?: string;
  city: string;
  postalCode: string;
  surface: number;
  propertyType: string;
  marketTension: string;
  confidenceScore: number;
  /** 'dvf' = computed from real recorded sales; 'baseline' = sector average (no sales data available) */
  dataSource?: 'dvf' | 'baseline';
  sampleSize?: number;
  radiusM?: number | null;
  periodFrom?: string;
  periodTo?: string;
  medianM2?: number;
  comparables?: Array<{ street: string; month: string; surface: number; rooms: number; price: number; ppm2: number; distanceM: number | null }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  qualificationData?: {
    score?: number;
    status?: 'HOT' | 'WARM' | 'COLD';
    extracted?: Record<string, any>;
    recommendedAction?: 'BOOK_MEETING' | 'CONTINUE_QUESTIONS' | 'SEND_NURTURE';
  };
}

export interface ScheduledMessage {
  id: string;
  step: string;
  channel: 'SMS' | 'Email' | 'WhatsApp';
  delay: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  subject: string;
  message: string;
  goal: string;
  status: 'scheduled' | 'sent' | 'paused';
  sentAt?: string;
}

export type MandateType = 'exclusive' | 'simple' | 'in_negotiation' | 'none';
export type MandateStatus = 'signed' | 'draft' | 'pending_signature' | 'expired';

export interface MandateDetails {
  type: MandateType; // 'exclusive' (Mandat Exclusif) | 'simple' (Mandat Simple) | 'in_negotiation' | 'none'
  status: MandateStatus;
  mandateNumber?: string; // ex: "M-2026-092"
  signedDate?: string; // ex: "2026-08-22"
  sellingPrice?: number; // ex: 495000 €
  feeRatePercent?: number; // ex: 4.5%
  feeAmount?: number; // ex: 22275 €
  durationMonths?: number; // ex: 3 mois
  signedBy?: string; // ex: "Céline (Conseillère Référente)"
  notes?: string;
}

export interface LeadActivity {
  id: string;
  type: 'chat' | 'booking' | 'call' | 'email' | 'sms' | 'visit' | 'note' | 'task';
  label: string;
  description?: string;
  date: string;
  author?: string;
}

export interface LeadTask {
  id: string;
  label: string;
  done: boolean;
  dueDate?: string;
  category?: 'qualification' | 'preparation' | 'rdv' | 'mandat';
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  propertyType: 'Appartement' | 'Maison' | 'Garage / Box' | 'Terrain' | 'Immeuble' | 'Local commercial' | string;
  surface: number;
  city: string;
  estimatedValue: number;
  motive: 'Succession' | 'Mutation pro' | 'Agrandissement' | 'Divorce / Séparation' | 'Vente investissement' | 'Autre';
  hasConsultedAgency?: string;
  timeframe: '< 1 mois' | '1-3 mois' | '3-6 mois' | '> 6 mois' | 'Curiosité';
  status: 'HOT' | 'WARM' | 'COLD';
  score: number; // 0-100
  meetingBooked: boolean;
  meetingDate?: string;
  meetingTime?: string;
  meetingType?: 'Visite estimation à domicile' | 'Point téléphonique approfondi (15 min)';
  nurtureStep?: string;
  customSequence?: ScheduledMessage[];
  createdAt: string;
  createdAtIso?: string;
  /** E-mails of the follow-up sequence are sent automatically on their dates */
  autoRelances?: boolean;
  /** Quick answers given by the seller */
  qualification?: { ownership?: 'seul' | 'plusieurs' | 'pas_encore'; mandate?: 'aucun' | 'estimations' | 'simple' | 'exclusif'; occupancy?: 'occupe' | 'libre' | 'loue'; expectedPrice?: number | null };
  /** Why the score is what it is (transparent rules) */
  scoreReasons?: Array<{ label: string; points: number }>;
  blockers?: string[];
  /** Pre-visit brief for the advisor */
  brief?: { summary: string; strengths: string[]; watchouts: string[]; questions: string[]; source?: 'ia' | 'regles'; generatedAt?: string };
  /** How the price shown to the seller was computed (kept for the advisor) */
  valuation?: {
    dataSource?: 'dvf' | 'baseline';
    lowPrice: number;
    highPrice: number;
    medianM2?: number;
    sampleSize?: number;
    radiusM?: number | null;
    periodFrom?: string;
    periodTo?: string;
  };
  calBookingId?: string;
  conversationHistory?: ChatMessage[];
  notes?: string;
  lastAction?: {
    type: 'chat' | 'booking' | 'call' | 'email' | 'sms' | 'visit' | 'note';
    label: string;
    date: string;
  };
  tasks?: LeadTask[];
  activities?: LeadActivity[];
  mandate?: MandateDetails;
}

export interface NurtureSequenceItem {
  step: string;
  channel: 'SMS' | 'Email' | 'WhatsApp';
  delay: string;
  subject: string;
  message: string;
  goal: string;
}

export interface MetaAdCreative {
  id: string;
  motive: string;
  title: string;
  hook: string;
  primaryText: string;
  ctaText: string;
  targetAudience: string;
  imagePrompt: string;
  cplTarget: number;
}

export interface AgentPrivacySettings {
  hidePersonalIdentity: boolean;
  publicBrandName: string;
  publicContactEmail: string;
  publicContactPhone: string;
  hideInternalScoringFromProspect: boolean;
  stealthModeEnabled: boolean;
  customPrivacyDisclaimer: string;
  customAgentSlug?: string;
  agentPinCode?: string;
  agentPassword?: string;
  agentEmail?: string;
  stealthLoginToken?: string;
  hidePublicLoginButton?: boolean;
  sessionTimeoutMinutes?: number;
  lastLoginTimestamp?: string;
  authMethod?: 'pin' | 'password' | 'both';
}


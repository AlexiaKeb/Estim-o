import { supabase, isSupabaseConfigured, LeadRecord, AgentRecord } from './supabase';
import { Lead } from '../types';

/**
 * Service to bridge frontend actions to Supabase tables and Edge Functions
 * securely via backend API with Service Role execution (bypassing client-side RLS limits).
 */

export interface EdgeFunctionQualifyResponse {
  agent: {
    id?: string;
    nom: string;
    ville: string;
    cal_username?: string | null;
  };
  message_a_afficher: string;
  score_qualification: number;
  lead_chaud: boolean;
  conversation_terminee: boolean;
  donnees_extraites?: Record<string, any>;
  statut: 'nouveau' | 'en_conversation' | 'qualifie' | 'rdv_pris' | 'perdu';
  cal_username?: string | null;
}

export interface EdgeFunctionBookResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
  rendez_vous_id?: string;
  creneau?: string;
  statut?: string;
  cal_booking_id?: string | null;
  cal_booking_uid?: string | null;
  lead?: {
    id: string;
    nom: string;
    telephone: string;
    email?: string;
    statut: string;
  };
  agent?: {
    id?: string;
    nom: string;
    ville: string;
    cal_username?: string | null;
    cal_event_slug?: string | null;
  };
  cal_booking?: {
    id: string | null;
    uid?: string | null;
    status: string;
  };
}

/**
 * Retrieves or initializes the default active Agent
 */
export async function getActiveAgent(): Promise<AgentRecord | null> {
  // Try client read if available
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch {
      // ignore
    }
  }

  // Default agent fallback
  return {
    id: '00000000-0000-0000-0000-000000000001',
    nom: 'Céline Levrat (NOVEA Immobilier)',
    ville: 'Lyon',
    zone_intervention: 'Lyon et alentours, rayon de 30 km',
    email_contact: 'cel@novea-immobilier.fr',
    cal_username: 'celine-levrat-novea',
    script_qualification: {
      agent_display_name: 'Céline Levrat',
      agency_name: 'NOVEA Immobilier',
      phone: '06 03 58 03 16',
      tone: 'professionnel, empathique, valorisant et orienté vers une visite de découverte sans engagement',
    },
  };
}

/**
 * Inserts or ensures a Lead exists in Supabase leads table via server API (Service Role)
 * to prevent RLS (Row Level Security) violation errors on client anonymous inserts.
 */
export async function syncLeadToSupabase(lead: Partial<Lead>): Promise<string | null> {
  try {
    const response = await fetch('/api/supabase/sync-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        propertyType: lead.propertyType,
        city: lead.city,
        address: lead.address,
        estimatedValue: lead.estimatedValue,
        motive: lead.motive,
        timeframe: lead.timeframe,
        surface: lead.surface,
        score: lead.score,
        status: lead.status,
        meetingBooked: lead.meetingBooked,
        notes: lead.notes,
        tasks: lead.tasks,
        activities: lead.activities,
        valuation: lead.valuation,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.lead_id) {
        return data.lead_id;
      }
    }
  } catch (err) {
    console.warn('Backend sync-lead request error, using fallback ID:', err);
  }

  return lead.id || `lead-${Date.now()}`;
}

/**
 * Invokes the qualify-lead Edge Function / Gateway
 */
export async function invokeQualifyLeadEdgeFunction(
  leadId: string,
  userMessage?: string
): Promise<EdgeFunctionQualifyResponse | null> {
  try {
    const response = await fetch('/api/supabase/qualify-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        user_message: userMessage,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend qualify-lead request error:', err);
  }

  return null;
}

/**
 * Invokes the book-appointment Edge Function / Gateway with strict Cal.com verification
 */
export async function invokeBookAppointmentEdgeFunction(params: {
  lead_id: string;
  creneau: string; // ISO 8601
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  notes?: string;
  event_type_slug?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  property_type?: string;
  surface?: number;
  estimated_value?: number;
  timeframe?: string;
  motive?: string;
}): Promise<EdgeFunctionBookResponse> {
  try {
    const response = await fetch('/api/supabase/book-appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        lead_id: params.lead_id,
        creneau: params.creneau,
        date: params.date,
        time: params.time,
        notes: params.notes,
        event_type_slug: params.event_type_slug,
        name: params.name,
        phone: params.phone,
        email: params.email,
        address: params.address,
        property_type: params.property_type,
        surface: params.surface,
        estimated_value: params.estimated_value,
        timeframe: params.timeframe,
        motive: params.motive,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      return {
        success: false,
        error: data.error || "Ce créneau vient d'être réservé ou est indisponible dans l'agenda. Merci d'en choisir un autre.",
        details: data.details,
      };
    }

    return data;
  } catch (err: any) {
    console.error('Backend book-appointment request error:', err);
    return {
      success: false,
      error: "Impossible de confirmer la réservation avec l'agenda en ligne. Veuillez vérifier votre connexion et réessayer.",
    };
  }
}

export interface CalSlotsResult {
  success: boolean;
  slots: Record<string, string[]>;
  source: 'cal.com';
  username?: string;
  eventTypeSlug?: string;
  error?: string;
  message?: string;
}

/**
 * Fetches real available slots from Cal.com v2 API for the active agent
 * Strictly returns only verified real calendar availability.
 */
export async function fetchCalSlotsDetailed(params?: {
  start?: string;
  end?: string;
  username?: string;
  eventTypeSlug?: string;
  agentId?: string;
}): Promise<CalSlotsResult> {
  try {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    if (params?.username) query.set('username', params.username);
    if (params?.eventTypeSlug) query.set('eventTypeSlug', params.eventTypeSlug);
    if (params?.agentId) query.set('agentId', params.agentId);

    const response = await fetch(`/api/cal/slots?${query.toString()}`);
    const data = await response.json();

    if (response.ok && data && data.success) {
      return {
        success: true,
        slots: data.slots || {},
        source: 'cal.com',
        username: data.username,
        eventTypeSlug: data.eventTypeSlug,
      };
    } else {
      return {
        success: false,
        slots: {},
        source: 'cal.com',
        error: data?.error || 'CAL_SLOTS_UNAVAILABLE',
        message: data?.message || 'La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.',
      };
    }
  } catch (err: any) {
    console.warn('Error fetching Cal.com slots:', err);
    return {
      success: false,
      slots: {},
      source: 'cal.com',
      error: 'CAL_NETWORK_ERROR',
      message: 'La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.',
    };
  }
}

/**
 * Legacy compatibility wrapper
 */
export async function fetchCalSlots(params?: {
  start?: string;
  end?: string;
  username?: string;
  eventTypeSlug?: string;
  agentId?: string;
}): Promise<Record<string, string[]>> {
  const res = await fetchCalSlotsDetailed(params);
  return res.slots;
}

/**
 * Fetches all leads from the Supabase database
 */
export async function fetchSupabaseLeads(): Promise<LeadRecord[]> {
  try {
    const response = await fetch('/api/supabase/leads');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.leads)) {
        return data.leads;
      }
    }
  } catch (err) {
    console.warn('Error fetching leads via API:', err);
  }

  return [];
}



export type CrmLoadResult =
  | { state: 'live'; leads: Lead[] }
  | { state: 'demo' }
  | { state: 'unauthorized' }
  | { state: 'error'; message: string };

/** Loads the advisor's real leads (needs an advisor session). */
export async function fetchCrmLeads(): Promise<CrmLoadResult> {
  try {
    const res = await fetch('/api/crm/leads', { credentials: 'same-origin' });
    if (res.status === 401) return { state: 'unauthorized' };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { state: 'error', message: data.error || `Erreur ${res.status}` };
    if (data.configured === false) return { state: 'demo' };
    return { state: 'live', leads: Array.isArray(data.leads) ? data.leads : [] };
  } catch (e: any) {
    return { state: 'error', message: 'Serveur injoignable' };
  }
}

/** Saves CRM-only data (notes, tasks, mandate…) for one lead. Resolves to an error message or null. */
export async function saveCrmLead(lead: Lead): Promise<string | null> {
  try {
    const res = await fetch(`/api/crm/leads/${encodeURIComponent(lead.id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error || `Erreur ${res.status}`;
  } catch {
    return 'Serveur injoignable';
  }
}

import { createClient } from '@supabase/supabase-js';

// Types representing the Supabase database schema
export type LeadStatut = 'nouveau' | 'en_conversation' | 'qualifie' | 'rdv_pris' | 'perdu';
export type RdvStatut = 'propose' | 'confirme' | 'annule';

export interface ScriptQualification {
  agent_display_name?: string;
  agency_name?: string;
  phone?: string;
  tone?: string;
  geographic_perimeter?: string;
  welcome_template?: string;
  discovery_principles?: string[];
  qualification_questions?: Array<{ id: string; label: string }>;
  scoring_rules?: Record<string, number>;
  [key: string]: any;
}

export interface AgentRecord {
  id: string;
  nom: string;
  ville: string;
  zone_intervention: string;
  email_contact: string;
  cal_username: string | null;
  cal_event_slug?: string | null;
  script_qualification: ScriptQualification;
  created_at?: string;
  updated_at?: string;
}

export interface LeadRecord {
  id: string;
  agent_id: string;
  nom: string;
  telephone: string;
  email?: string | null;
  type_bien?: string | null;
  ville_bien?: string | null;
  code_postal?: string | null;
  surface?: number | null;
  nb_pieces?: number | null;
  statut: LeadStatut;
  score_qualification: number;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationRecord {
  id: string;
  lead_id: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  updated_at?: string;
}

export interface RendezVousRecord {
  id: string;
  lead_id: string;
  creneau: string;
  cal_booking_id?: string | null;
  statut: RdvStatut;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: AgentRecord;
        Insert: Omit<AgentRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<AgentRecord>;
      };
      leads: {
        Row: LeadRecord;
        Insert: Omit<LeadRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<LeadRecord>;
      };
      conversations: {
        Row: ConversationRecord;
        Insert: Omit<ConversationRecord, 'id' | 'updated_at'> & { id?: string };
        Update: Partial<ConversationRecord>;
      };
      rendez_vous: {
        Row: RendezVousRecord;
        Insert: Omit<RendezVousRecord, 'id' | 'created_at'> & { id?: string };
        Update: Partial<RendezVousRecord>;
      };
    };
  };
}

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

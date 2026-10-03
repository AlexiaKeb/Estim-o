-- Champs nécessaires au CRM (fiche prospect complète, mandat, tâches, notes).
-- À exécuter dans l'éditeur SQL Supabase. Sans danger si relancé.
-- Autonome : ne dépend d'aucune migration précédente.

-- Colonnes Cal.com (au cas où 20260828000001 n'a pas été exécutée)
ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS cal_booking_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS cal_event_slug TEXT DEFAULT 'visite-d-estimation-a-domicile';

-- Champs CRM
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS valeur_estimee NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS motif TEXT,
  ADD COLUMN IF NOT EXISTS delai_projet TEXT,
  ADD COLUMN IF NOT EXISTS crm JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN leads.crm IS 'Données CRM libres : notes, tâches, activités, mandat, séquence de relance, statut forcé.';

-- Un seul RDV confirmé par identifiant Cal.com (évite les doublons lors des webhooks rejoués)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rendez_vous_cal_booking_id
  ON rendez_vous(cal_booking_id) WHERE cal_booking_id IS NOT NULL;

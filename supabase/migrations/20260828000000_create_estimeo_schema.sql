-- ==============================================================================
-- ESTIMÉO - BACKEND SUPABASE SCHEMA & MIGRATIONS
-- Architecture Multi-Agents Ready (Actuellement 1 agent : Céline Levrat)
-- ==============================================================================

-- 1. Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Types Énumérés
DO $$ BEGIN
    CREATE TYPE lead_statut AS ENUM ('nouveau', 'en_conversation', 'qualifie', 'rdv_pris', 'perdu');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rdv_statut AS ENUM ('propose', 'confirme', 'annule');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Table `agents`
-- Remarque de sécurité : La clé API Cal.com ne doit JAMAIS être stockée ici.
-- Elle est gérée exclusivement via le secret d'environnement Supabase CAL_API_KEY.
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    ville TEXT NOT NULL,
    zone_intervention TEXT NOT NULL,
    email_contact TEXT NOT NULL,
    cal_username TEXT, -- Nom d'utilisateur public Cal.com de l'agent (ex: "celine-levrat-novea")
    cal_event_slug TEXT DEFAULT 'estimation-immobiliere', -- Slug du type d'événement Cal.com (ex: "estimation-immobiliere")
    script_qualification JSONB NOT NULL DEFAULT '{}'::jsonb, -- Paramètres dynamiques du prompt & questions de qualification
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Table `leads`
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    telephone TEXT NOT NULL,
    email TEXT,
    type_bien TEXT,
    ville_bien TEXT,
    code_postal TEXT,
    surface NUMERIC(10, 2),
    nb_pieces INTEGER,
    statut lead_statut NOT NULL DEFAULT 'nouveau',
    score_qualification INTEGER DEFAULT 0 CHECK (score_qualification >= 0 AND score_qualification <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Table `conversations`
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Table `rendez_vous`
CREATE TABLE IF NOT EXISTS rendez_vous (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    creneau TIMESTAMPTZ NOT NULL,
    cal_booking_id TEXT, -- ID de réservation Cal.com (ex: UID ou ID numérique)
    statut rdv_statut NOT NULL DEFAULT 'propose',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Index de Performance
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_statut ON leads(statut);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_rendez_vous_lead_id ON rendez_vous(lead_id);
CREATE INDEX IF NOT EXISTS idx_rendez_vous_creneau ON rendez_vous(creneau);

-- 8. Trigger de mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agents_updated_at ON agents;
CREATE TRIGGER trg_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Row Level Security (RLS)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendez_vous ENABLE ROW LEVEL SECURITY;

-- Politiques de base pour Service Role & Authentifié
CREATE POLICY "Service Role All Access Agents" ON agents FOR ALL USING (true);
CREATE POLICY "Service Role All Access Leads" ON leads FOR ALL USING (true);
CREATE POLICY "Service Role All Access Conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Service Role All Access RendezVous" ON rendez_vous FOR ALL USING (true);

-- 10. Insertion de l'agent initial unique (Céline Levrat)
-- Le script_qualification contient toutes les variables dynamiques indispensables pour l'Edge Function de qualification.
INSERT INTO agents (
    id,
    nom,
    ville,
    zone_intervention,
    email_contact,
    cal_username,
    script_qualification
) VALUES (
    'd0e8c854-3e91-477c-a49e-108848123abc',
    'Céline Levrat (NOVEA Immobilier)',
    'Lyon',
    'Lyon et alentours, rayon de 30 km',
    'cel@novea-immobilier.fr',
    '[à compléter avec son identifiant Cal.com une fois son compte créé]',
    '{
        "agent_display_name": "Céline Levrat",
        "agency_name": "NOVEA Immobilier",
        "phone": "06 03 58 03 16",
        "tone": "empathique, rassurant, professionnel et orienté vers une visite de découverte sans engagement",
        "geographic_perimeter": "Lyon, Villeurbanne, le Beaujolais et les communes situées dans un rayon de 30 km autour de Lyon",
        "welcome_template": "Bonjour et bienvenue ! Je suis l''assistant de qualification de Céline Levrat chez NOVEA Immobilier. Je suis ravi de vous accompagner pour découvrir votre projet sur Lyon et ses alentours.",
        "discovery_principles": [
            "Visite de découverte 100% offerte et sans aucun engagement",
            "Aucun document formel obligatoire pour le premier échange sur place",
            "L''estimation définitive est réalisée collégialement en équipe pour garantir un prix net vendeur optimal",
            "Échange sur les éventuels travaux (votés ou à prévoir), les charges et la taxe foncière"
        ],
        "qualification_questions": [
            {
                "id": "motivation",
                "label": "Quel est le contexte de votre démarche (curiosité, vente imminente, succession, achat-revente) ?"
            },
            {
                "id": "timeframe",
                "label": "Sous quel délai souhaiteriez-vous concrétiser votre projet si l''estimation vous convient ?"
            },
            {
                "id": "property_specifics",
                "label": "Avez-vous réalisé des travaux récents ou y a-t-il des spécificités particulières sur votre bien ?"
            },
            {
                "id": "availability",
                "label": "Quelles sont vos disponibilités cette semaine pour une visite de découverte de 20 minutes ?"
            }
        ],
        "scoring_rules": {
            "timeframe_under_3_months": 35,
            "owner_confirmed": 25,
            "project_clear": 20,
            "appointment_intent": 20
        }
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nom = EXCLUDED.nom,
    ville = EXCLUDED.ville,
    zone_intervention = EXCLUDED.zone_intervention,
    email_contact = EXCLUDED.email_contact,
    cal_username = EXCLUDED.cal_username,
    script_qualification = EXCLUDED.script_qualification;

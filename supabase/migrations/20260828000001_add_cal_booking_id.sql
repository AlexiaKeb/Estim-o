-- ==============================================================================
-- ESTIMÉO - ADD CAL.COM INTEGRATION COLUMNS TO RENDEZ_VOUS & AGENTS
-- ==============================================================================

-- 1. Add cal_booking_id to rendez_vous if not exists
ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS cal_booking_id TEXT;

-- 2. Add cal_event_slug to agents if not exists
ALTER TABLE agents ADD COLUMN IF NOT EXISTS cal_event_slug TEXT DEFAULT 'estimation-immobiliere';

-- 3. Update agent Céline Levrat with default event slug
UPDATE agents 
SET cal_event_slug = 'estimation-immobiliere',
    cal_username = COALESCE(NULLIF(cal_username, '[à compléter avec son identifiant Cal.com une fois son compte créé]'), 'celine-levrat-novea')
WHERE ville = 'Lyon';

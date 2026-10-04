-- Relances par e-mail : messages programmés / envoyés, et désinscriptions.
-- Sans danger si relancé.

CREATE TABLE IF NOT EXISTS relances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  step TEXT,
  channel TEXT NOT NULL DEFAULT 'Email' CHECK (channel IN ('Email', 'SMS', 'WhatsApp')),
  subject TEXT,
  message TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'programme'
    CHECK (status IN ('programme', 'envoi', 'envoye', 'erreur', 'annule', 'a_faire')),
  sent_at TIMESTAMPTZ,
  recipient TEXT,
  provider_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relances_due ON relances(status, send_at);
CREATE INDEX IF NOT EXISTS idx_relances_lead ON relances(lead_id);
ALTER TABLE relances ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS desinscriptions (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE desinscriptions ENABLE ROW LEVEL SECURITY;

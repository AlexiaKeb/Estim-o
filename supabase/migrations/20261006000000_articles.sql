-- Articles de blog écrits par la conseillère depuis le tableau de bord, et dossier de stockage des photos.
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_title TEXT,
  description TEXT,
  category TEXT,
  cover_url TEXT,
  intro TEXT,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'publie')),
  reading_minutes INT NOT NULL DEFAULT 3,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS articles_status_idx ON articles (status, published_at DESC);
-- Accès uniquement par le serveur (clé de service) : aucune politique publique
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Photos des articles : lecture publique, écriture réservée au serveur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('blog', 'blog', true, 6291456, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

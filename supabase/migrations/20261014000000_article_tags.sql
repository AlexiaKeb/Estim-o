-- Mots-clés (tags) des articles de blog, pour les filtrer dans le tableau de bord.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

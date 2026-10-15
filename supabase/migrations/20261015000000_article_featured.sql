-- Articles mis en avant sur la page d'accueil (3 au maximum, choisis depuis le tableau de bord).
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

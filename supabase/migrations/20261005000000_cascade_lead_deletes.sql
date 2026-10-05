-- Supprimer un contact doit supprimer tout ce qui s'y rattache (rendez-vous, conversations, relances).
-- Recrée les clés étrangères vers leads avec ON DELETE CASCADE, quel que soit leur nom actuel.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.leads'::regclass
      AND c.conrelid::regclass::text IN ('rendez_vous', 'conversations', 'relances', 'public.rendez_vous', 'public.conversations', 'public.relances')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.leads(id) ON DELETE CASCADE', r.tbl, r.conname, r.col);
  END LOOP;
END $$;

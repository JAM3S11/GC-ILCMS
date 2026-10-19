-- Supabase publishes the public schema through its Data API (REST/GraphQL) to anyone holding the
-- project's anon key. This app has its own accounts and sessions and reaches the database only
-- through the server, so on Supabase every table gets row level security with no policies: the API
-- sees nothing, while the server's table-owner connection is unaffected. Skipped on plain
-- PostgreSQL (no "anon" role), where a restricted runtime user would otherwise be locked out.
-- Re-running the migrations covers tables added by later files.
DO $$
DECLARE
  t RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    RETURN;
  END IF;
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

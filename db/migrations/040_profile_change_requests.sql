-- Staff cannot edit their own name, title (role) or sign-in email: they ask the super-admin, who
-- approves or rejects the change, the same way department moves work. Only the fields the officer
-- wants changed are filled in; NULL means "keep as is". The current values are kept so the request
-- still reads correctly after the account changes.
CREATE TABLE IF NOT EXISTS profile_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_full_name TEXT NOT NULL,
  current_email TEXT NOT NULL,
  current_user_role TEXT NOT NULL,
  requested_full_name TEXT CHECK (requested_full_name IS NULL OR LENGTH(BTRIM(requested_full_name)) BETWEEN 2 AND 150),
  requested_email TEXT CHECK (requested_email IS NULL OR LENGTH(requested_email) <= 254),
  requested_role TEXT CHECK (requested_role IS NULL OR requested_role IN (
    'CEO', 'VICE_CEO', 'ADMINISTRATOR', 'CLERK', 'ACCOUNTANT', 'HR',
    'RECEPTIONIST', 'HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST',
    'INTERN', 'ATTACHEE', 'QUALITY_MANAGER'
  )),
  reason TEXT CHECK (reason IS NULL OR LENGTH(reason) <= 500),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  decision_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requested_full_name IS NOT NULL OR requested_email IS NOT NULL OR requested_role IS NOT NULL)
);

-- One open request per officer.
CREATE UNIQUE INDEX IF NOT EXISTS profile_change_requests_pending_user_idx
  ON profile_change_requests (user_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS profile_change_requests_pending_idx
  ON profile_change_requests (created_at DESC) WHERE status = 'PENDING';

-- Same Supabase lockdown as 039, for this table (039 runs before this file on a first migration).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

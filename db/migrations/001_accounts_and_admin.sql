CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN (
    'CEO', 'VICE_CEO', 'ADMINISTRATOR', 'CLERK', 'ACCOUNTANT', 'HR',
    'RECEPTIONIST', 'HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST',
    'INTERN', 'ATTACHEE', 'QUALITY_MANAGER', 'SUPER_ADMIN'
  )),
  department TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_INVITE'
    CHECK (status IN ('PENDING_INVITE', 'ACTIVE', 'DISABLED')),
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'ACTIVE' AND password_hash IS NOT NULL) OR status <> 'ACTIVE')
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN (
    'CEO', 'VICE_CEO', 'ADMINISTRATOR', 'CLERK', 'ACCOUNTANT', 'HR',
    'RECEPTIONIST', 'HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST',
    'INTERN', 'ATTACHEE', 'QUALITY_MANAGER'
  )),
  department TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decision_by UUID REFERENCES users(id),
  decision_at TIMESTAMPTZ,
  decision_note TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_requests_pending_idx
  ON account_requests (created_at DESC) WHERE status = 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS account_requests_pending_email_idx
  ON account_requests (LOWER(email)) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS account_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_invites_user_idx
  ON account_invites (user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);

-- ASCEND: proposed multi-user PostgreSQL schema for Vercel + Neon.
-- Run only on a new ASCEND database after reviewing the deployment guide.
-- This schema does NOT replace the existing SQLite server until its API
-- handlers have been migrated and verified. Do not publish with mock auth.

BEGIN;

CREATE TABLE IF NOT EXISTS ascend_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ascend_users_email_nonempty CHECK (length(trim(email)) > 3)
);
CREATE UNIQUE INDEX IF NOT EXISTS ascend_users_email_lower_idx
  ON ascend_users (lower(email));

CREATE TABLE IF NOT EXISTS ascend_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES ascend_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ascend_sessions_expiry_idx
  ON ascend_sessions (expires_at);
CREATE INDEX IF NOT EXISTS ascend_sessions_user_idx
  ON ascend_sessions (user_id);

CREATE TABLE IF NOT EXISTS ascend_workspaces (
  user_id UUID PRIMARY KEY REFERENCES ascend_users(id) ON DELETE CASCADE,
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Store only metadata and opaque keys here. Actual PDF/image bytes belong
-- in a private object-storage bucket with authorized download URLs.
CREATE TABLE IF NOT EXISTS ascend_attachments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES ascend_users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (
    mime_type IN ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')
  ),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ascend_attachments_user_idx
  ON ascend_attachments (user_id);

COMMIT;

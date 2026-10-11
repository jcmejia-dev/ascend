-- ASCEND cloud runtime additions. Safe to run more than once.
BEGIN;
CREATE TABLE IF NOT EXISTS ascend_attachment_data (
  attachment_id UUID PRIMARY KEY REFERENCES ascend_attachments(id) ON DELETE CASCADE,
  content BYTEA NOT NULL,
  CONSTRAINT ascend_attachment_data_size CHECK (octet_length(content) BETWEEN 1 AND 2097152)
);
CREATE TABLE IF NOT EXISTS ascend_rate_limits (
  key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts >= 0)
);
CREATE INDEX IF NOT EXISTS ascend_rate_limits_window_idx ON ascend_rate_limits(window_started_at);
COMMIT;

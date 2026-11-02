import type { MigrationEntry } from "@agent-native/core/db";

/** Additive, append-only. Never edit an applied entry; add a new version. */
export const MIGRATIONS: MigrationEntry[] = [
  {
    version: 1,
    name: "scam-shield-cases",
    sql: `CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now()),
  source TEXT NOT NULL DEFAULT 'other' CHECK (source IN ('sms', 'whatsapp', 'email', 'link', 'other')),
  text TEXT NOT NULL DEFAULT '',
  url TEXT,
  sender TEXT,
  risk_score INTEGER CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)),
  verdict TEXT CHECK (verdict IS NULL OR verdict IN ('safe', 'suspicious', 'scam')),
  category TEXT,
  signals TEXT NOT NULL DEFAULT '[]',
  explanation_es TEXT,
  explanation_en TEXT,
  advice_es TEXT,
  advice_en TEXT,
  llm_used BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'analyzed', 'flagged', 'resolved')),
  flagged_by TEXT CHECK (flagged_by IS NULL OR flagged_by IN ('user', 'agent')),
  notes TEXT,
  safe_reply TEXT,
  tip TEXT,
  last_actor TEXT NOT NULL DEFAULT 'user' CHECK (last_actor IN ('user', 'agent')),
  last_action TEXT,
  owner_email TEXT NOT NULL,
  org_id TEXT
);
CREATE TABLE IF NOT EXISTS case_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN ('user', 'agent')),
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  owner_email TEXT NOT NULL,
  org_id TEXT
);
CREATE INDEX IF NOT EXISTS cases_owner_org_created_idx ON cases (owner_email, org_id, created_at);
CREATE INDEX IF NOT EXISTS cases_org_status_idx ON cases (org_id, status, created_at);
CREATE INDEX IF NOT EXISTS case_events_case_idx ON case_events (case_id, created_at)`,
  },
];

import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

/**
 * One suspicious message/link reported to the shared inbox. Humans (UI) and
 * the agent (chat tools, CLI, MCP) read and write the same rows through the
 * actions in `actions/`.
 *
 * Access: visible to the active organization when there is one, otherwise
 * private to its creator (`owner_email`). Timestamps are UTC ISO strings.
 */
export const cases = pgTable("cases", {
  id: text("id").primaryKey(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
  source: text("source", {
    enum: ["sms", "whatsapp", "email", "link", "other"],
  })
    .notNull()
    .default("other"),
  text: text("text").notNull().default(""),
  url: text("url"),
  sender: text("sender"),
  riskScore: integer("risk_score"),
  verdict: text("verdict", { enum: ["safe", "suspicious", "scam"] }),
  category: text("category"),
  /** JSON array of `{ id, weight, reasonEs, reasonEn }`. */
  signals: text("signals").notNull().default("[]"),
  explanationEs: text("explanation_es"),
  explanationEn: text("explanation_en"),
  adviceEs: text("advice_es"),
  adviceEn: text("advice_en"),
  llmUsed: boolean("llm_used").notNull().default(false),
  status: text("status", {
    enum: ["new", "analyzed", "flagged", "resolved"],
  })
    .notNull()
    .default("new"),
  flaggedBy: text("flagged_by", { enum: ["user", "agent"] }),
  notes: text("notes"),
  safeReply: text("safe_reply"),
  tip: text("tip"),
  lastActor: text("last_actor", { enum: ["user", "agent"] })
    .notNull()
    .default("user"),
  lastAction: text("last_action"),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

/** Append-only activity log per case: who did what ("by you" / "by agent"). */
export const caseEvents = pgTable("case_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  action: text("action").notNull(),
  actor: text("actor", { enum: ["user", "agent"] }).notNull(),
  detail: text("detail"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

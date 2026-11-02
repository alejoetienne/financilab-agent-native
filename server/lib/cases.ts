import { fail, type ActionRunContext } from "@agent-native/core/action";
import { and, eq, isNull, type SQL } from "drizzle-orm";

import { getDb, schema } from "../db/index.js";
import {
  analyzeMessage,
  CATEGORY_LABELS,
  isCategory,
  type Signal,
} from "./scam-shield.js";

export const CASE_SOURCES = [
  "sms",
  "whatsapp",
  "email",
  "link",
  "other",
] as const;
export const CASE_STATUSES = ["new", "analyzed", "flagged", "resolved"] as const;
export type CaseSource = (typeof CASE_SOURCES)[number];
export type CaseStatus = (typeof CASE_STATUSES)[number];
export type Actor = "user" | "agent";

type CaseRow = typeof schema.cases.$inferSelect;

export interface CaseDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: CaseSource;
  text: string;
  url: string | null;
  sender: string | null;
  riskScore: number | null;
  verdict: "safe" | "suspicious" | "scam" | null;
  category: string | null;
  categoryLabelEs: string | null;
  categoryLabelEn: string | null;
  signals: Signal[];
  explanationEs: string | null;
  explanationEn: string | null;
  adviceEs: string | null;
  adviceEn: string | null;
  llmUsed: boolean;
  status: CaseStatus;
  flaggedBy: Actor | null;
  notes: string | null;
  safeReply: string | null;
  tip: string | null;
  lastActor: Actor;
  lastAction: string | null;
}

/**
 * Who performed a call. Browser UI calls are the human; chat tools, MCP, A2A,
 * automations and the CLI (used by coding agents) are the agent.
 */
export function actorFromCtx(ctx?: ActionRunContext): Actor {
  const caller = ctx?.caller;
  return caller === "frontend" || caller === "http" ? "user" : "agent";
}

export function requireIdentity(ctx?: ActionRunContext) {
  const ownerEmail =
    ctx?.userEmail ??
    fail("Sign in to use the case inbox.", {
      errorCode: "unauthenticated",
      statusCode: 401,
    });
  return { ownerEmail, orgId: ctx?.orgId ?? null };
}

/** Org-visible when an org is active; otherwise private to the creator. */
export function caseScope(ctx?: ActionRunContext): SQL {
  const { ownerEmail, orgId } = requireIdentity(ctx);
  const c = schema.cases;
  return orgId
    ? eq(c.orgId, orgId)
    : (and(isNull(c.orgId), eq(c.ownerEmail, ownerEmail)) as SQL);
}

export function parseSignals(raw: string | null | undefined): Signal[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as Signal[]) : [];
  } catch {
    return [];
  }
}

export function toCaseDto(row: CaseRow): CaseDto {
  const label = isCategory(row.category)
    ? CATEGORY_LABELS[row.category]
    : null;
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    source: row.source as CaseSource,
    text: row.text,
    url: row.url,
    sender: row.sender,
    riskScore: row.riskScore,
    verdict: row.verdict ?? null,
    category: row.category,
    categoryLabelEs: label?.es ?? null,
    categoryLabelEn: label?.en ?? null,
    signals: parseSignals(row.signals),
    explanationEs: row.explanationEs,
    explanationEn: row.explanationEn,
    adviceEs: row.adviceEs,
    adviceEn: row.adviceEn,
    llmUsed: row.llmUsed,
    status: row.status as CaseStatus,
    flaggedBy: (row.flaggedBy as Actor | null) ?? null,
    notes: row.notes,
    safeReply: row.safeReply,
    tip: row.tip,
    lastActor: row.lastActor as Actor,
    lastAction: row.lastAction,
  };
}

export async function loadCase(
  id: string,
  ctx?: ActionRunContext,
): Promise<CaseRow> {
  const [row] = await getDb()
    .select()
    .from(schema.cases)
    .where(and(eq(schema.cases.id, id), caseScope(ctx)))
    .limit(1);
  if (!row) {
    fail(`Case ${id} not found.`, { errorCode: "not_found", statusCode: 404 });
  }
  return row;
}

export async function recordEvent(
  row: Pick<CaseRow, "id" | "ownerEmail" | "orgId">,
  action: string,
  actor: Actor,
  detail?: string | null,
) {
  await getDb()
    .insert(schema.caseEvents)
    .values({
      id: crypto.randomUUID(),
      caseId: row.id,
      action,
      actor,
      detail: detail ?? null,
      createdAt: new Date().toISOString(),
      ownerEmail: row.ownerEmail,
      orgId: row.orgId,
    });
}

/**
 * Apply a patch to a case the caller can see, stamp updatedAt/lastActor/
 * lastAction, append an activity event, and return the saved row.
 */
export async function updateCase(
  row: CaseRow,
  patch: Partial<typeof schema.cases.$inferInsert>,
  action: string,
  ctx?: ActionRunContext,
  detail?: string | null,
): Promise<CaseDto> {
  const actor = actorFromCtx(ctx);
  const [saved] = await getDb()
    .update(schema.cases)
    .set({
      ...patch,
      updatedAt: new Date().toISOString(),
      lastActor: actor,
      lastAction: action,
    })
    .where(and(eq(schema.cases.id, row.id), caseScope(ctx)))
    .returning();
  if (!saved) {
    fail(`Case ${row.id} not found.`, {
      errorCode: "not_found",
      statusCode: 404,
    });
  }
  await recordEvent(saved, action, actor, detail);
  return toCaseDto(saved);
}

/** Fields written by running scam-shield-core on a case. */
export async function analysisPatch(row: Pick<CaseRow, "text" | "url">) {
  const result = await analyzeMessage({ text: row.text, url: row.url });
  return {
    result,
    patch: {
      riskScore: result.riskScore,
      verdict: result.verdict,
      category: result.category,
      signals: JSON.stringify(result.signals),
      explanationEs: result.explanationEs,
      explanationEn: result.explanationEn,
      adviceEs: result.adviceEs,
      adviceEn: result.adviceEn,
      llmUsed: result.llmUsed,
    },
  };
}

/** Run the analysis first when a case has never been analyzed. */
export async function ensureAnalyzed(row: CaseRow, ctx?: ActionRunContext) {
  if (row.riskScore !== null && row.verdict) return row;
  const { patch } = await analysisPatch(row);
  const dto = await updateCase(
    row,
    { ...patch, status: row.status === "new" ? "analyzed" : row.status },
    "analyzed",
    ctx,
    `${patch.verdict} · ${patch.riskScore}/100`,
  );
  return loadCase(dto.id, ctx);
}

export function categoryOf(row: CaseRow) {
  return isCategory(row.category) ? row.category : "none";
}

export function assertNotResolved(row: CaseRow) {
  if (row.status === "resolved") {
    fail(`Case ${row.id} is already resolved.`, {
      errorCode: "already_resolved",
      statusCode: 409,
    });
  }
}

import { defineAction } from "@agent-native/core/action";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { inboxLink } from "../server/lib/case-link.js";
import { detectLanguage } from "../server/lib/language.js";
import {
  caseScope,
  CASE_STATUSES,
  type Actor,
  type CaseSource,
  type CaseStatus,
} from "../server/lib/cases.js";

export default defineAction({
  description:
    "List cases in the shared Scam Shield inbox, newest first, with counts per status and whether each case already has a saved safe reply/tip, plus messageLang (detected es/en language of the message; drafts/tips default to it). Filter by status, verdict or a text search.",
  schema: z.object({
    status: z
      .enum(CASE_STATUSES)
      .optional()
      .describe("Only cases with this status: new, analyzed, flagged, resolved"),
    verdict: z
      .enum(["safe", "suspicious", "scam"])
      .optional()
      .describe("Only cases with this verdict"),
    query: z
      .string()
      .max(200)
      .optional()
      .describe("Case-insensitive search in text, URL and sender"),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .default(100)
      .describe("Maximum rows to return (1-200)"),
  }),
  http: { method: "GET" },
  readOnly: true,
  link: () => ({ url: inboxLink(), label: "Open inbox" }),
  run: async (args, ctx) => {
    const c = schema.cases;
    const scope = caseScope(ctx);
    const filters = [scope];
    if (args.status) filters.push(eq(c.status, args.status));
    if (args.verdict) filters.push(eq(c.verdict, args.verdict));
    const q = args.query?.trim();
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      filters.push(
        or(ilike(c.text, pattern), ilike(c.url, pattern), ilike(c.sender, pattern))!,
      );
    }
    const db = getDb();
    const [rows, counts] = await Promise.all([
      db
        .select({
          id: c.id,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          source: c.source,
          text: c.text,
          url: c.url,
          sender: c.sender,
          riskScore: c.riskScore,
          verdict: c.verdict,
          category: c.category,
          status: c.status,
          flaggedBy: c.flaggedBy,
          lastActor: c.lastActor,
          lastAction: c.lastAction,
          hasSafeReply: sql<boolean>`${c.safeReply} is not null`,
          hasTip: sql<boolean>`${c.tip} is not null`,
        })
        .from(c)
        .where(and(...filters))
        .orderBy(desc(c.createdAt))
        .limit(args.limit),
      db
        .select({ status: c.status, n: sql<number>`count(*)::int` })
        .from(c)
        .where(scope)
        .groupBy(c.status),
    ]);
    const byStatus: Record<CaseStatus, number> = {
      new: 0,
      analyzed: 0,
      flagged: 0,
      resolved: 0,
    };
    for (const row of counts) byStatus[row.status as CaseStatus] = Number(row.n);
    return {
      cases: rows.map((r) => ({
        ...r,
        source: r.source as CaseSource,
        status: r.status as CaseStatus,
        flaggedBy: (r.flaggedBy as Actor | null) ?? null,
        lastActor: r.lastActor as Actor,
        hasSafeReply: Boolean(r.hasSafeReply),
        hasTip: Boolean(r.hasTip),
        messageLang: detectLanguage(r.text),
        text: r.text.length > 280 ? `${r.text.slice(0, 277)}…` : r.text,
      })),
      counts: {
        ...byStatus,
        all: Object.values(byStatus).reduce((a, b) => a + b, 0),
      },
    };
  },
});

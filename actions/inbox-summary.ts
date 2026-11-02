import { defineAction } from "@agent-native/core/action";
import { and, desc, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { inboxLink } from "../server/lib/case-link.js";
import { caseScope } from "../server/lib/cases.js";
import { detectorMode } from "../server/lib/scam-shield.js";

export default defineAction({
  description:
    "Summarize the shared inbox for triage: totals by status and verdict, cases still needing analysis, the riskiest open cases, and how many were last handled by the user vs the agent.",
  schema: z.object({}),
  http: { method: "GET" },
  readOnly: true,
  link: () => ({ url: inboxLink(), label: "Open inbox" }),
  run: async (_args, ctx) => {
    const c = schema.cases;
    const scope = caseScope(ctx);
    const db = getDb();
    const [grouped, riskiest, unanalyzed] = await Promise.all([
      db
        .select({
          status: c.status,
          verdict: c.verdict,
          lastActor: c.lastActor,
          n: sql<number>`count(*)::int`,
          avg: sql<number | null>`avg(${c.riskScore})`,
        })
        .from(c)
        .where(scope)
        .groupBy(c.status, c.verdict, c.lastActor),
      db
        .select({
          id: c.id,
          riskScore: c.riskScore,
          verdict: c.verdict,
          category: c.category,
          status: c.status,
          sender: c.sender,
        })
        .from(c)
        .where(and(scope, ne(c.status, "resolved"), inArray(c.verdict, ["scam", "suspicious"])))
        .orderBy(desc(c.riskScore))
        .limit(5),
      db
        .select({ id: c.id })
        .from(c)
        .where(and(scope, sql`${c.riskScore} is null`))
        .limit(50),
    ]);
    const byStatus = { new: 0, analyzed: 0, flagged: 0, resolved: 0 };
    const byVerdict = { scam: 0, suspicious: 0, safe: 0, unanalyzed: 0 };
    const lastActor = { user: 0, agent: 0 };
    let scoreSum = 0;
    let scored = 0;
    for (const g of grouped) {
      const n = Number(g.n);
      byStatus[g.status as keyof typeof byStatus] += n;
      byVerdict[(g.verdict ?? "unanalyzed") as keyof typeof byVerdict] += n;
      lastActor[g.lastActor as keyof typeof lastActor] += n;
      if (g.avg !== null && g.verdict) {
        scoreSum += Number(g.avg) * n;
        scored += n;
      }
    }
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return {
      total,
      open: total - byStatus.resolved,
      byStatus,
      byVerdict,
      averageRisk: scored ? Math.round(scoreSum / scored) : null,
      lastHandledBy: lastActor,
      needsAnalysis: unanalyzed.map((u) => u.id),
      riskiestOpen: riskiest,
      detector: { rules: true, llm: detectorMode().llm },
    };
  },
});

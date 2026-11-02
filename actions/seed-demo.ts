import { defineAction } from "@agent-native/core/action";
import { and, inArray } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { inboxLink } from "../server/lib/case-link.js";
import {
  actorFromCtx,
  caseScope,
  recordEvent,
  requireIdentity,
} from "../server/lib/cases.js";
import { DEMO_CASES } from "../server/lib/demo-cases.js";

export default defineAction({
  description:
    "Load 6 synthetic Nicaraguan example cases (fake BAC SMS, Banpro OTP request, PayPal lookalike, crypto doubling, remittance fee, one legitimate bank alert) as status 'new'. Skips examples already in the inbox.",
  schema: z.object({}),
  link: () => ({ url: inboxLink(), label: "Open inbox" }),
  run: async (_args, ctx) => {
    const { ownerEmail, orgId } = requireIdentity(ctx);
    const actor = actorFromCtx(ctx);
    const c = schema.cases;
    const db = getDb();
    const existing = await db
      .select({ text: c.text })
      .from(c)
      .where(and(caseScope(ctx), inArray(c.text, DEMO_CASES.map((d) => d.text))))
      .limit(DEMO_CASES.length);
    const have = new Set(existing.map((e) => e.text));
    const base = Date.now();
    const rows = DEMO_CASES.filter((d) => !have.has(d.text)).map((d, i) => {
      // Stagger timestamps so the list keeps the demo order (newest first).
      const at = new Date(base - (DEMO_CASES.length - i) * 60_000).toISOString();
      return {
        id: crypto.randomUUID(),
        createdAt: at,
        updatedAt: at,
        source: d.source,
        text: d.text,
        url: d.url ?? null,
        sender: d.sender,
        status: "new" as const,
        lastActor: actor,
        lastAction: "added",
        ownerEmail,
        orgId,
      };
    });
    if (rows.length) {
      const inserted = await db.insert(c).values(rows).returning();
      for (const row of inserted) await recordEvent(row, "added (demo)", actor);
    }
    return {
      created: rows.length,
      skipped: DEMO_CASES.length - rows.length,
      ids: rows.map((r) => r.id),
    };
  },
});

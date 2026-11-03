import { defineAction } from "@agent-native/core/action";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { inboxLink } from "../server/lib/case-link.js";
import { loadCase, toCaseDto, type Actor } from "../server/lib/cases.js";

export default defineAction({
  description:
    "Get one case with its full analysis (score, verdict, signals with ES/EN reasons, explanations, advice), safe reply, tip, notes and activity history (who did what: user or agent).",
  schema: z.object({
    id: z.string().min(1).describe(
        "Exact full case id (36-char UUID) copied verbatim from list-cases or inbox-summary",
      ),
  }),
  http: { method: "GET" },
  readOnly: true,
  link: ({ args }) => ({ url: inboxLink(args.id), label: "Open case" }),
  run: async ({ id }, ctx) => {
    const row = await loadCase(id, ctx);
    const e = schema.caseEvents;
    const events = await getDb()
      .select({
        id: e.id,
        action: e.action,
        actor: e.actor,
        detail: e.detail,
        createdAt: e.createdAt,
      })
      .from(e)
      .where(eq(e.caseId, row.id))
      .orderBy(desc(e.createdAt))
      .limit(50);
    return {
      ...toCaseDto(row),
      events: events.map((ev) => ({ ...ev, actor: ev.actor as Actor })),
    };
  },
});

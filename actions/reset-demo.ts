import { defineAction } from "@agent-native/core/action";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { caseScope, requireIdentity } from "../server/lib/cases.js";

export default defineAction({
  description:
    "Delete ALL cases and their activity history for the current user/org so the inbox starts empty (for a fresh demo). Destructive: only call when the user explicitly asks to reset or clear the inbox.",
  schema: z.object({ confirm: z.literal(true) }),
  run: async (_args, ctx) => {
    const { ownerEmail, orgId } = requireIdentity(ctx);
    const db = getDb();
    const e = schema.caseEvents;
    const eventScope = orgId
      ? eq(e.orgId, orgId)
      : and(isNull(e.orgId), eq(e.ownerEmail, ownerEmail));
    const events = await db.delete(e).where(eventScope).returning({ id: e.id });
    const cases = await db
      .delete(schema.cases)
      .where(caseScope(ctx))
      .returning({ id: schema.cases.id });
    return { deletedCases: cases.length, deletedEvents: events.length };
  },
});

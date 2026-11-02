import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { inboxLink } from "../server/lib/case-link.js";
import {
  actorFromCtx,
  assertNotResolved,
  loadCase,
  updateCase,
} from "../server/lib/cases.js";

export default defineAction({
  description:
    "Flag a case as a confirmed/likely scam that needs attention. Records who flagged it (user or agent). Fails with already_flagged or already_resolved (409); report that instead of retrying.",
  schema: z.object({
    id: z.string().min(1).describe("Case id from list-cases"),
    notes: z
      .string()
      .max(2000)
      .optional()
      .describe("Optional note explaining why it was flagged"),
  }),
  link: ({ args }) => ({ url: inboxLink(args.id), label: "Open case" }),
  run: async ({ id, notes }, ctx) => {
    const row = await loadCase(id, ctx);
    assertNotResolved(row);
    if (row.status === "flagged") {
      fail(`Case ${id} is already flagged.`, {
        errorCode: "already_flagged",
        statusCode: 409,
      });
    }
    return updateCase(
      row,
      {
        status: "flagged",
        flaggedBy: actorFromCtx(ctx),
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
      },
      "flagged",
      ctx,
      notes?.trim() || null,
    );
  },
});

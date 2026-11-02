import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { inboxLink } from "../server/lib/case-link.js";
import {
  assertNotResolved,
  loadCase,
  updateCase,
} from "../server/lib/cases.js";

export default defineAction({
  description:
    "Close a case (status 'resolved'), e.g. after the user was warned, blocked the sender, or it was legitimate. Fails with already_resolved (409) if it is already closed.",
  schema: z.object({
    id: z.string().min(1).describe("Case id from list-cases"),
    notes: z
      .string()
      .max(2000)
      .optional()
      .describe("Optional resolution note, e.g. 'Sender blocked, bank notified'"),
  }),
  link: ({ args }) => ({ url: inboxLink(args.id), label: "Open case" }),
  run: async ({ id, notes }, ctx) => {
    const row = await loadCase(id, ctx);
    assertNotResolved(row);
    return updateCase(
      row,
      { status: "resolved", ...(notes?.trim() ? { notes: notes.trim() } : {}) },
      "resolved",
      ctx,
      notes?.trim() || null,
    );
  },
});

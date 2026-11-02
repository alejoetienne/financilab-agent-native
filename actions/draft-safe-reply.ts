import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { inboxLink } from "../server/lib/case-link.js";
import {
  ensureAnalyzed,
  loadCase,
  updateCase,
} from "../server/lib/cases.js";
import { draftSafeReply, isCategory } from "../server/lib/scam-shield.js";

export default defineAction({
  description:
    "Draft a short, safe reply the user could send to the sender (never shares data, codes or money) and save it on the case. Ignoring and blocking is always fine too. Analyzes first if needed.",
  schema: z.object({
    id: z.string().min(1).describe("Case id from list-cases"),
    lang: z
      .enum(["es", "en"])
      .default("es")
      .describe("Reply language: es (Spanish) or en (English)"),
  }),
  link: ({ args }) => ({ url: inboxLink(args.id), label: "Open case" }),
  run: async ({ id, lang }, ctx) => {
    const row = await ensureAnalyzed(await loadCase(id, ctx), ctx);
    const reply = draftSafeReply(
      {
        verdict: row.verdict ?? "suspicious",
        category: isCategory(row.category) ? row.category : "none",
      } as Parameters<typeof draftSafeReply>[0],
      lang,
    );
    return updateCase(row, { safeReply: reply }, "drafted safe reply", ctx, lang.toUpperCase());
  },
});

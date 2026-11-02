import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { inboxLink } from "../server/lib/case-link.js";
import {
  categoryOf,
  ensureAnalyzed,
  loadCase,
  updateCase,
} from "../server/lib/cases.js";
import { educationTip } from "../server/lib/scam-shield.js";

export default defineAction({
  description:
    "Pick a short anti-fraud education tip matched to the case's scam category and save it on the case. Analyzes first if needed.",
  schema: z.object({
    id: z.string().min(1).describe("Case id from list-cases"),
    lang: z
      .enum(["es", "en"])
      .default("es")
      .describe("Tip language: es (Spanish) or en (English)"),
    variant: z.coerce
      .number()
      .int()
      .min(0)
      .max(20)
      .default(0)
      .describe("Which tip to pick when the category has several (0-based)"),
  }),
  link: ({ args }) => ({ url: inboxLink(args.id), label: "Open case" }),
  run: async ({ id, lang, variant }, ctx) => {
    const row = await ensureAnalyzed(await loadCase(id, ctx), ctx);
    const tip = educationTip(categoryOf(row), lang, variant);
    return updateCase(row, { tip }, "added tip", ctx, lang.toUpperCase());
  },
});

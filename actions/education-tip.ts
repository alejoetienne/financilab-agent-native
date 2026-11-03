import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { inboxLink } from "../server/lib/case-link.js";
import {
  categoryOf,
  ensureAnalyzed,
  loadCase,
  updateCase,
} from "../server/lib/cases.js";
import { LANG_OPTIONS, resolveLang } from "../server/lib/language.js";
import { educationTip } from "../server/lib/scam-shield.js";

export default defineAction({
  description:
    "Pick a short anti-fraud education tip matched to the case's scam category and save it on the case. Analyzes first if needed. By default the tip is written in the same language as the case message (Spanish or English).",
  schema: z.object({
    id: z.string().min(1).describe("Case id from list-cases"),
    lang: z
      .enum(LANG_OPTIONS)
      .default("auto")
      .describe(
        "Tip language: auto (default; same language as the case message), or es (Spanish) / en (English) to override",
      ),
    variant: z.coerce
      .number()
      .int()
      .min(0)
      .max(20)
      .default(0)
      .describe("Which tip to pick when the category has several (0-based)"),
  }),
  link: ({ args }) => ({ url: inboxLink(args.id), label: "Open case" }),
  run: async ({ id, lang: langOption, variant }, ctx) => {
    const row = await ensureAnalyzed(await loadCase(id, ctx), ctx);
    const lang = resolveLang(langOption, row.text);
    const tip = educationTip(categoryOf(row), lang, variant);
    const saved = await updateCase(row, { tip }, "added tip", ctx, lang.toUpperCase());
    return { ...saved, lang };
  },
});

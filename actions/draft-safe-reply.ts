import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { inboxLink } from "../server/lib/case-link.js";
import {
  ensureAnalyzed,
  loadCase,
  updateCase,
} from "../server/lib/cases.js";
import { LANG_OPTIONS, resolveLang } from "../server/lib/language.js";
import { draftSafeReply, isCategory } from "../server/lib/scam-shield.js";

export default defineAction({
  description:
    "Draft a short, safe reply the user could send to the sender (never shares data, codes or money) and save it on the case. Ignoring and blocking is always fine too. Analyzes first if needed. By default the reply is written in the same language as the case message (Spanish or English).",
  schema: z.object({
    id: z.string().min(1).describe("Case id from list-cases"),
    lang: z
      .enum(LANG_OPTIONS)
      .default("auto")
      .describe(
        "Reply language: auto (default; same language as the case message), or es (Spanish) / en (English) to override",
      ),
  }),
  link: ({ args }) => ({ url: inboxLink(args.id), label: "Open case" }),
  run: async ({ id, lang: langOption }, ctx) => {
    const row = await ensureAnalyzed(await loadCase(id, ctx), ctx);
    const lang = resolveLang(langOption, row.text);
    const reply = draftSafeReply(
      {
        verdict: row.verdict ?? "suspicious",
        category: isCategory(row.category) ? row.category : "none",
      } as Parameters<typeof draftSafeReply>[0],
      lang,
    );
    const saved = await updateCase(
      row,
      { safeReply: reply },
      "drafted safe reply",
      ctx,
      lang.toUpperCase(),
    );
    return { ...saved, lang };
  },
});

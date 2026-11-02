import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { inboxLink } from "../server/lib/case-link.js";
import {
  actorFromCtx,
  ensureAnalyzed,
  loadCase,
  parseSignals,
  recordEvent,
  toCaseDto,
} from "../server/lib/cases.js";

export default defineAction({
  description:
    "Explain why a case is or is not a scam, in Spanish (es) or English (en): verdict, score, plain-language explanation, advice and each detector signal's reason. Analyzes the case first if needed. Use the user's language.",
  schema: z.object({
    id: z.string().min(1).describe("Case id from list-cases"),
    lang: z
      .enum(["es", "en"])
      .default("es")
      .describe("Language of the explanation: es (Spanish) or en (English)"),
  }),
  link: ({ args }) => ({ url: inboxLink(args.id), label: "Open case" }),
  run: async ({ id, lang }, ctx) => {
    const row = await ensureAnalyzed(await loadCase(id, ctx), ctx);
    const dto = toCaseDto(row);
    await recordEvent(row, `explained (${lang.toUpperCase()})`, actorFromCtx(ctx));
    const es = lang === "es";
    return {
      id: dto.id,
      lang,
      riskScore: dto.riskScore,
      verdict: dto.verdict,
      category: es ? dto.categoryLabelEs : dto.categoryLabelEn,
      explanation: es ? dto.explanationEs : dto.explanationEn,
      advice: es ? dto.adviceEs : dto.adviceEn,
      reasons: parseSignals(row.signals)
        .filter((s) => s.weight !== 0 || s.id.startsWith("llm_"))
        .map((s) => ({ id: s.id, weight: s.weight, reason: es ? s.reasonEs : s.reasonEn })),
    };
  },
});

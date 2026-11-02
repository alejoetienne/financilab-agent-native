import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { inboxLink } from "../server/lib/case-link.js";
import { analysisPatch, loadCase, updateCase } from "../server/lib/cases.js";

export default defineAction({
  description:
    "Run the scam-shield-core detector on a case and save riskScore (0-100), verdict (safe/suspicious/scam), category, signals and ES/EN explanations. Uses the offline rules engine; blends in an LLM only when SCAM_SHIELD_LLM and its API key are configured on the server. A new case becomes 'analyzed'; flagged/resolved keep their status.",
  schema: z.object({
    id: z.string().min(1).describe("Case id from list-cases"),
  }),
  link: ({ args }) => ({ url: inboxLink(args.id), label: "Open case" }),
  run: async ({ id }, ctx) => {
    const row = await loadCase(id, ctx);
    const { patch } = await analysisPatch(row);
    return updateCase(
      row,
      { ...patch, status: row.status === "new" ? "analyzed" : row.status },
      "analyzed",
      ctx,
      `${patch.verdict} · ${patch.riskScore}/100${patch.llmUsed ? " · LLM" : ""}`,
    );
  },
});

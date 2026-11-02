import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { inboxLink } from "../server/lib/case-link.js";
import {
  actorFromCtx,
  analysisPatch,
  CASE_SOURCES,
  recordEvent,
  requireIdentity,
  toCaseDto,
} from "../server/lib/cases.js";

export default defineAction({
  description:
    "Add a suspicious message and/or link to the shared Scam Shield case inbox. Set analyze=true to run the scam detector immediately. Text is stored verbatim (Spanish or English).",
  schema: z.object({
    text: z
      .string()
      .max(5000)
      .default("")
      .describe("Message body exactly as received (SMS, WhatsApp, email…)"),
    url: z
      .string()
      .max(2000)
      .optional()
      .describe("Suspicious link, if any, e.g. https://banpr0.top/login"),
    sender: z
      .string()
      .max(200)
      .optional()
      .describe("Sender phone number, email or name, if known"),
    source: z
      .enum(CASE_SOURCES)
      .default("other")
      .describe("Where it arrived: sms, whatsapp, email, link or other"),
    analyze: z
      .boolean()
      .default(false)
      .describe("Run analyze-case right after adding (default false)"),
  }),
  link: ({ result }) => ({ url: inboxLink(result.id), label: "Open case" }),
  run: async (args, ctx) => {
    const { ownerEmail, orgId } = requireIdentity(ctx);
    const text = args.text.trim();
    const url = args.url?.trim() || null;
    if (!text && !url) {
      fail("Provide the message text or a link.", {
        errorCode: "empty_case",
        statusCode: 400,
      });
    }
    const actor = actorFromCtx(ctx);
    const now = new Date().toISOString();
    const analysis = args.analyze ? await analysisPatch({ text, url }) : null;
    const [row] = await getDb()
      .insert(schema.cases)
      .values({
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        source: args.source,
        text,
        url,
        sender: args.sender?.trim() || null,
        ...(analysis?.patch ?? {}),
        status: analysis ? "analyzed" : "new",
        lastActor: actor,
        lastAction: analysis ? "analyzed" : "added",
        ownerEmail,
        orgId,
      })
      .returning();
    await recordEvent(row!, "added", actor);
    if (analysis) {
      await recordEvent(
        row!,
        "analyzed",
        actor,
        `${analysis.patch.verdict} · ${analysis.patch.riskScore}/100`,
      );
    }
    return toCaseDto(row!);
  },
});

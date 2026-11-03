import type { ActionRunContext } from "@agent-native/core/action";
import { getDbExec } from "@agent-native/core/db";
import { beforeAll, describe, expect, it } from "vitest";

import addCase from "../actions/add-case";
import analyzeCase from "../actions/analyze-case";
import draftSafeReply from "../actions/draft-safe-reply";
import educationTip from "../actions/education-tip";
import explainCase from "../actions/explain-case";
import flagCase from "../actions/flag-case";
import getCase from "../actions/get-case";
import inboxSummary from "../actions/inbox-summary";
import listCases from "../actions/list-cases";
import resolveCase from "../actions/resolve-case";
import seedDemo from "../actions/seed-demo";
import { MIGRATIONS } from "../server/db/migrations";

// The UI (browser) and the agent (chat tool) act as the same signed-in person
// in the same organization, so they see the same cases.
const user: ActionRunContext = {
  caller: "frontend",
  userEmail: "ana@example.test",
  orgId: "org-1",
};
const agent: ActionRunContext = { ...user, caller: "tool" };
const outsider: ActionRunContext = {
  caller: "frontend",
  userEmail: "eve@example.test",
  orgId: "org-2",
};

/** Call an action the way the framework does: zod-parse, then run. */
async function call<A extends { schema?: unknown; run: (...a: any[]) => any }>(
  action: A,
  args: Record<string, unknown>,
  ctx: ActionRunContext,
): Promise<Awaited<ReturnType<A["run"]>>> {
  const schema = action.schema as { parse: (v: unknown) => unknown };
  return action.run(schema.parse(args), ctx);
}

beforeAll(async () => {
  const exec = getDbExec();
  for (const m of MIGRATIONS) {
    const sql = typeof m.sql === "string" ? m.sql : (m.sql.postgres ?? "");
    // Our migration SQL has no semicolons inside literals.
    for (const stmt of sql.split(/;\s*\n/).filter((x) => x.trim())) {
      await exec.execute(stmt);
    }
  }
});

describe("case inbox actions", () => {
  it("adds and analyzes a fake bank SMS, recording the actor", async () => {
    const saved = await call(
      addCase,
      {
        text: "Banpro: su cuenta será bloqueada. Confirme su PIN en https://banpr0.top",
        source: "sms",
        analyze: true,
      },
      user,
    );
    expect(saved.status).toBe("analyzed");
    expect(saved.verdict).toBe("scam");
    expect(saved.riskScore).toBeGreaterThanOrEqual(60);
    expect(saved.lastActor).toBe("user");
    expect(saved.explanationEs).toMatch(/estafa/);
    expect(saved.signals.length).toBeGreaterThan(0);
  });

  it("rejects an empty case", async () => {
    await expect(call(addCase, { text: "   " }, user)).rejects.toMatchObject({
      errorCode: "empty_case",
    });
  });

  it("lets the agent analyze, flag and resolve what the user added", async () => {
    const created = await call(
      addCase,
      {
        text: "Su remesa de $350 está retenida. Para liberarla debe pagar una comisión de $25.",
        source: "whatsapp",
      },
      user,
    );
    expect(created.status).toBe("new");

    const analyzed = await call(analyzeCase, { id: created.id }, agent);
    expect(analyzed.lastActor).toBe("agent");
    expect(analyzed.category).toBe("remittance_fee");

    const flagged = await call(flagCase, { id: created.id, notes: "triage" }, agent);
    expect(flagged).toMatchObject({ status: "flagged", flaggedBy: "agent" });

    await expect(call(flagCase, { id: created.id }, user)).rejects.toMatchObject({
      errorCode: "already_flagged",
      statusCode: 409,
    });

    const resolved = await call(resolveCase, { id: created.id }, user);
    expect(resolved).toMatchObject({ status: "resolved", lastActor: "user" });
    await expect(call(resolveCase, { id: created.id }, agent)).rejects.toMatchObject({
      errorCode: "already_resolved",
    });

    const detail = await call(getCase, { id: created.id }, user);
    expect(detail.events.map((e) => `${e.action}:${e.actor}`)).toEqual([
      "resolved:user",
      "flagged:agent",
      "analyzed:agent",
      "added:user",
    ]);
  });

  it("explains, drafts a safe reply and a tip in Spanish or English", async () => {
    const c = await call(
      addCase,
      { text: "Your PayPal account is limited.", url: "https://paypa1-security-check.com/login", source: "email" },
      user,
    );
    const es = await call(explainCase, { id: c.id, lang: "es" }, agent);
    expect(es.lang).toBe("es");
    expect(es.explanation).toMatch(/PayPal/);
    const en = await call(explainCase, { id: c.id, lang: "en" }, agent);
    expect(en.explanation).toMatch(/scam/i);

    const reply = await call(draftSafeReply, { id: c.id, lang: "en" }, agent);
    expect(reply.safeReply).toBeTruthy();
    const tip = await call(educationTip, { id: c.id, lang: "es" }, user);
    expect(tip.tip).toMatch(/PayPal/);
  });

  it("seeds six synthetic demo cases once and summarizes the inbox", async () => {
    const first = await call(seedDemo, {}, agent);
    expect(first.created).toBe(6);
    const again = await call(seedDemo, {}, agent);
    expect(again).toMatchObject({ created: 0, skipped: 6 });

    const newOnes = await call(listCases, { status: "new" }, user);
    expect(newOnes.cases.length).toBeGreaterThanOrEqual(6);

    const summary = await call(inboxSummary, {}, agent);
    expect(summary.total).toBe(newOnes.counts.all);
    expect(summary.needsAnalysis.length).toBeGreaterThanOrEqual(6);
    expect(summary.detector.rules).toBe(true);
  });

  it("does not leak cases across organizations", async () => {
    const mine = await call(listCases, {}, user);
    expect(mine.cases.length).toBeGreaterThan(0);
    const theirs = await call(listCases, {}, outsider);
    expect(theirs.cases).toHaveLength(0);
    await expect(
      call(getCase, { id: mine.cases[0]!.id }, outsider),
    ).rejects.toMatchObject({ errorCode: "not_found" });
    // The not-found hint is scoped too: no ids from another org.
    await expect(
      call(getCase, { id: mine.cases[0]!.id }, outsider),
    ).rejects.toSatisfy((e: Error) => !/Similar case ids/.test(e.message));
  });

  it("points a mis-copied case id at the real one instead of guessing", async () => {
    const [a, b] = (await call(listCases, {}, agent)).cases;
    // The failing triage call spliced one id's head onto another id's tail.
    const spliced = `${a!.id.slice(0, 23)}-${b!.id.slice(24, 35)}`;
    const err = await call(getCase, { id: spliced }, agent).catch((e) => e);
    expect(err).toMatchObject({ errorCode: "not_found" });
    expect(err.message).toMatch(/not a valid 36-character case id/);
    expect(err.message).toContain(a!.id);

    const listed = await call(listCases, {}, agent);
    expect(listed.cases[0]).toHaveProperty("hasSafeReply");
    expect(listed.cases[0]).toHaveProperty("hasTip");
  });

  it("requires a signed-in identity", async () => {
    await expect(
      call(listCases, {}, { caller: "frontend" }),
    ).rejects.toMatchObject({ errorCode: "unauthenticated" });
  });
});

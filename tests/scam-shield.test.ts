import { describe, expect, it } from "vitest";

import { detectorMode, scamShieldEnv } from "../server/lib/scam-shield";

describe("scam-shield LLM layer configuration", () => {
  it("stays rules-only without SCAM_SHIELD_LLM or a key", () => {
    expect(detectorMode({}).llm).toBeNull();
    expect(detectorMode({ SCAM_SHIELD_LLM: "anthropic" }).llm).toBeNull();
    expect(detectorMode({ ANTHROPIC_API_KEY: "x" }).llm).toBeNull();
  });

  it("enables the provider only when both are set", () => {
    expect(
      detectorMode({ SCAM_SHIELD_LLM: "openai", OPENAI_API_KEY: "x" }).llm,
    ).toBe("openai");
  });

  it("accepts the framework's Gemini key name", () => {
    const env = { SCAM_SHIELD_LLM: "gemini", GOOGLE_GENERATIVE_AI_API_KEY: "x" };
    expect(scamShieldEnv(env).GEMINI_API_KEY).toBe("x");
    expect(detectorMode(env).llm).toBe("gemini");
  });
});

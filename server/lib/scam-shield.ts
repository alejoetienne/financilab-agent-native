/**
 * App-side adapter for the vendored scam-shield-core package
 * (`packages/scam-shield-core`, MIT, FinanciLab).
 *
 * The rules engine always runs offline. The optional LLM layer is used only
 * when `SCAM_SHIELD_LLM` is `anthropic` | `openai` | `gemini` AND that
 * provider's key is set; any failure falls back to rules only.
 */
import {
  analyze,
  CATEGORY_LABELS,
  draftSafeReply,
  educationTip,
  resolveProvider,
} from "../../packages/scam-shield-core/src/index.js";
import type {
  AnalysisResult,
  Category,
  Locale,
  Signal,
  Verdict,
} from "../../packages/scam-shield-core/src/index.js";

export type { AnalysisResult, Category, Locale, Signal, Verdict };
export { CATEGORY_LABELS, draftSafeReply, educationTip };

/**
 * Environment passed to scam-shield-core. The framework stores Gemini keys as
 * GOOGLE_GENERATIVE_AI_API_KEY (canonical) while scam-shield-core reads
 * GEMINI_API_KEY, so accept either.
 */
export function scamShieldEnv(
  env: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  return {
    ...env,
    GEMINI_API_KEY: env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY,
  };
}

/** Which detector layers are active, without exposing any secret. */
export function detectorMode(env?: Record<string, string | undefined>): {
  llm: "anthropic" | "openai" | "gemini" | null;
} {
  const provider = resolveProvider({ env: scamShieldEnv(env) });
  return { llm: provider?.name ?? null };
}

export async function analyzeMessage(input: {
  text: string;
  url?: string | null;
}): Promise<AnalysisResult> {
  return analyze(
    input.url ? { text: input.text, url: input.url } : { text: input.text },
    { env: scamShieldEnv(), timeoutMs: 8000 },
  );
}

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && value in CATEGORY_LABELS;
}

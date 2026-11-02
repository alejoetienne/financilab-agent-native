# scam-shield-core (vendored copy)

This directory is a **verbatim copy** of the `src/` folder and `LICENSE` of
[`scam-shield-core`](../../../scam-shield-core), an MIT-licensed, Spanish-first
scam detector for payment links and messages in Nicaragua and Latin America.

- Written on **Nov 2, 2026** by **Alejandro Arana / FinanciLab** for the
  Builder.io Agent-Native Hackathon.
- Copied here so the FinanciLab Scam Shield app is self-contained (no npm
  install or sibling checkout needed).
- License: MIT (see [`LICENSE`](./LICENSE)).

The app imports it through the relative path `packages/scam-shield-core/src/index.ts`
(see `server/lib/scam-shield.ts`). Do not edit files here without also updating
the upstream project; the app-specific behaviour lives in `server/lib/`.

Public API used by the app: `analyze()` (rules + optional LLM, falls back to
rules), `draftSafeReply()`, `educationTip()`, `CATEGORY_LABELS`.

## Local changes

One **type-only** compatibility patch so the code compiles under this app's
stricter `exactOptionalPropertyTypes` TypeScript setting (no runtime change):
`| undefined` was added to `AnalyzeInput.url`, `AnalyzeInput.locale`,
`FetchLike` `init.signal` (`src/types.ts`) and `RuleHit.category`
(`src/rules.ts`).

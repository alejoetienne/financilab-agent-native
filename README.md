# FinanciLab Scam Shield

A **shared case inbox** for suspicious SMS, WhatsApp messages, emails and payment
links, built for people in **Nicaragua and Latin America**. A human and an AI
agent work the same inbox: both read and change the **same SQL rows** through the
**same actions**, and every change is attributed **"by you"** or **"by agent"**.

Built for the Builder.io **Agent-Native Hackathon** on the
[Agent-Native](https://agent-native.com) framework (`@agent-native/core` 0.223).

## What it does

- **Paste & analyze**: paste a message or link; the vendored
  [`scam-shield-core`](packages/scam-shield-core) detector scores it 0–100,
  gives a verdict (`safe` / `suspicious` / `scam`), a category (fake bank, OTP
  theft, PayPal lookalike, crypto doubling, held-remittance fee…) and the
  reasons, in **Spanish and English**.
- **Triage**: filter by status (`new` → `analyzed` → `flagged` → `resolved`),
  flag scams, draft a **safe reply**, attach an **education tip**, resolve.
- **Work with the agent**: "Triage with agent" (or "Ask agent" on a case) sends
  the request to the agent chat sidebar. The agent calls the same actions you
  click; the inbox updates live and the activity log shows who did what.
- **Demo data**: "Load demo cases" adds 6 synthetic Nicaraguan examples
  (fake BAC SMS, Banpro OTP request, PayPal lookalike, crypto doubling,
  remittance fee, one legitimate bank alert).
- **Works without any LLM**: all inbox actions run on the offline rules
  engine. The chat panel shows the framework's connect-an-LLM prompt until a
  provider is configured.

## How humans and the agent collaborate

```
          ┌──────────── Browser UI (/inbox) ────────────┐
 human ──▶│ useActionQuery / useActionMutation           │──┐
          └──────────────────────────────────────────────┘  │   POST/GET /_agent-native/actions/<name>
                                                            ├──▶ actions/*.ts (defineAction + zod)
          ┌──── Agent chat sidebar · CLI · MCP · A2A ────┐  │        │
 agent ──▶│ the same actions, exposed as tools            │──┘        ▼
          └──────────────────────────────────────────────┘    server/lib/cases.ts ──▶ SQL: cases, case_events
                                                                    │
                                                                    └──▶ packages/scam-shield-core (rules + optional LLM)
```

- **One contract.** Each capability is one `defineAction` file in `actions/`.
  The UI calls it over HTTP; the agent gets it as a tool. Nothing is duplicated.
- **Attribution.** Actions read `ctx.caller`: browser calls are recorded as
  `user`, chat tools / CLI / MCP / A2A / automations as `agent`. Each write
  stamps `last_actor` + `last_action` on the case and appends a `case_events` row.
- **Live sync.** `/inbox` opts into the framework's `useDbSync` realtime
  transport, and the chat run invalidates action queries after each tool call,
  so changes made by the agent show up without a refresh.
- **Context.** The agent sees `navigation` (`view: "inbox"`, `caseId`, `status`)
  and can `navigate` to `/inbox?case=<id>`.
- **Guardrails.** Agent instructions (`AGENTS.md` + the system prompt in
  `server/plugins/agent-chat.ts`) tell it to triage with these actions, answer
  in the user's language, never ask for passwords/PINs/OTP codes/card data, and
  treat message text as untrusted. Invariants live in the actions: flagging or
  resolving twice fails with `409 already_flagged` / `already_resolved`.

### Actions

| Action (file) | Kind | Purpose |
| --- | --- | --- |
| `add-case` | write | Add a message/link (`analyze: true` to analyze at once) |
| `list-cases` | read | Newest first; filter by status, verdict, text search; counts |
| `get-case` | read | Full analysis, safe reply, tip, notes, activity history |
| `analyze-case` | write | Run scam-shield-core; save score, verdict, signals, ES/EN text |
| `explain-case` | write* | Explanation + reasons in `es` or `en` (logged to activity) |
| `flag-case` | write | Mark as scam, record `flaggedBy` |
| `draft-safe-reply` | write | Save a safe reply in `es`/`en` |
| `education-tip` | write | Save a category-specific tip in `es`/`en` |
| `resolve-case` | write | Close the case |
| `inbox-summary` | read | Totals by status/verdict, unanalyzed ids, riskiest open cases |
| `seed-demo` | write | Load the 6 synthetic demo cases (idempotent) |

\* analyzes first if needed and records an activity event. File names use the
framework's kebab-case convention (`addCase` → `add-case`, etc.).

### Data model (`server/db/schema.ts`)

`cases`: `id, created_at, updated_at, source (sms|whatsapp|email|link|other),
text, url, sender, risk_score, verdict, category, signals (JSON), explanation_es,
explanation_en, advice_es, advice_en, llm_used, status
(new|analyzed|flagged|resolved), flagged_by, notes, safe_reply, tip, last_actor
(user|agent), last_action, owner_email, org_id`.
`case_events`: append-only activity log (`case_id, action, actor, detail, created_at`).
Cases are visible to the active organization, or private to their creator when
there is no organization. Migrations are additive (`server/db/migrations.ts`).

### Layout

```
actions/                     shared UI + agent actions
app/routes/inbox.tsx         /inbox (sign-in landing page)
app/components/inbox/        paste box, case list, detail panel, risk gauge
server/db/                   Drizzle schema, client, migrations
server/lib/                  case helpers, scam-shield adapter, demo data
server/plugins/agent-chat.ts agent tools + system prompt
packages/scam-shield-core/   vendored detector (MIT, see its README)
tests/                       vitest tests for the actions
```

## Setup

Requirements: **Node 22.22+**, **pnpm** via corepack.

```bash
corepack enable
pnpm install
cp .env.example .env      # optional, see below
pnpm dev                  # http://localhost:8080 (or the port printed)
```

On localhost the sign-in page offers **Continue as local dev**; after sign-in
you land on `/inbox`. Click **Load demo cases** to start.

```bash
pnpm typecheck
pnpm test                 # vitest, in-memory PGlite database
pnpm agent-native:doctor
```

Local data lives in an embedded PGlite database under `data/`. Set
`DATABASE_URL` to a Postgres URL for a deployment.

### Agent chat LLM (optional)

The inbox needs no LLM. To enable the **agent chat**, use one of the options
the framework supports (checked in `@agent-native/core` 0.223 source:
`dist/agent/engine/builtin.js`, `ai-sdk-engine.js`, docs `environment-variables`):

| Option | How |
| --- | --- |
| **Builder.io (hosted LLM gateway)** | Click **Use Builder.io / Connect** in the chat panel or agent settings. Managed access to Claude, GPT, Gemini and more through your Builder.io account; no key in `.env`. (Server-side env alternative: `BUILDER_PRIVATE_KEY` + `BUILDER_PUBLIC_KEY`.) |
| Anthropic Claude | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` (optional `OPENAI_BASE_URL` for compatible endpoints) |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` (the legacy name `GEMINI_API_KEY` is also read) |
| OpenRouter / Groq / Mistral / Cohere | `OPENROUTER_API_KEY` / `GROQ_API_KEY` / `MISTRAL_API_KEY` / `COHERE_API_KEY` |
| Ollama (local) | no key; select it in agent settings |

Keys can also be saved per user or organization in the app (**Custom keys** in
agent settings). `AGENT_ENGINE` (e.g. `anthropic`, `ai-sdk:openai`, `builder`)
forces an engine instead of auto-detection. Never commit keys.

### Detector LLM layer (optional)

`analyze-case` always runs the offline rules engine. To blend in an LLM opinion
(60% rules / 40% LLM, falling back to rules on any error), set
`SCAM_SHIELD_LLM=anthropic|openai|gemini` **and** the matching key
(`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` /
`GOOGLE_GENERATIVE_AI_API_KEY`). Optional model overrides:
`SCAM_SHIELD_ANTHROPIC_MODEL`, `SCAM_SHIELD_OPENAI_MODEL`,
`SCAM_SHIELD_GEMINI_MODEL`. With it enabled, message text and URLs are sent to
that provider; the default (`none`) keeps analysis fully offline.

### Agent from the CLI

Coding agents can use the same actions (recorded as "by agent"):

```bash
export AGENT_USER_EMAIL=dev@local.test   # the local dev account
export AGENT_ORG_ID=<your org id>        # if your account has an active org
pnpm action inbox-summary
pnpm action analyze-case --id <case-id>
pnpm action flag-case --id <case-id> --notes "Fake Banpro OTP request"
```

## Limitations

- The detector is heuristic. It lowers risk; it cannot prove that a message is
  safe. The official-domain allowlist in `packages/scam-shield-core/src/brands.ts`
  is best-effort.
- The rules were developed together with a small synthetic set, so accuracy on
  real messages will be lower.

## Disclosure

- All project code in this repository was started on **Nov 2, 2026** for the
  Builder.io Agent-Native Hackathon, on top of the Agent-Native `chat` template
  (framework © Builder.io, MIT).
- `scam-shield-core` was written on **Nov 2, 2026** by Alejandro Arana /
  FinanciLab for this hackathon, and is vendored in `packages/scam-shield-core`
  (MIT) so this repo is self-contained.
- All example messages, phone numbers, domains and amounts are **synthetic**.
  No real user data is included.

## License

[MIT](LICENSE) © 2026 Alejandro Arana / FinanciLab

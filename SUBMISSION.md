# FinanciLab Scam Shield — Agent-Native Hackathon Submission

## (a) Demo video script (Builder.io Clips, ~2:30)

| # | Time | Screen | Voiceover / action |
|---|------|--------|--------------------|
| 1 | 0:00–0:15 | App at `/inbox`, empty state | "In Nicaragua, scams arrive by WhatsApp and SMS, mostly in Spanish. FinanciLab Scam Shield is a shared case inbox where a human analyst and an AI agent work on the same data." |
| 2 | 0:15–0:30 | Click **Load demo cases** → 6 cases appear | "I load six synthetic demo cases: fake bank links, an OTP request, a PayPal lookalike, crypto doubling, a fee scam, and one real bank alert." Point at the **by you** labels. |
| 3 | 0:30–1:00 | Click **Triage with agent**; sidebar opens; agent works | "One click hands the inbox to the agent. It calls the same actions the UI uses." Scores fill in live: fake BAC link **93**, Banpro OTP **75**, PayPal lookalike **66**, BTC doubling **65**, Western Union fee **65**, legit BAC alert **0 (safe)**. "Five flagged, the real alert correctly left safe." Point at **by agent** labels. |
| 4 | 1:00–1:35 | Open the fake BAC case; in chat ask: "Explain this in Spanish and draft a safe reply" | Agent explains the red flags in Spanish (lookalike domain, urgency, credential request) and drafts a safe reply the user can send. "Explanations are bilingual — Spanish for the victim, English for the analyst." |
| 5 | 1:35–2:00 | Agent adds an education tip; human clicks **Resolve** | "The agent writes an education tip; I review it and resolve the case myself. Human decides, agent assists — both edits show who did them." |
| 6 | 2:00–2:20 | Ask agent: "Summarize the inbox" | Agent returns counts and top risks. |
| 7 | 2:20–2:35 | Quick cut: terminal running the same action via HTTP/CLI, repo page | "Every action is shared by the UI, the agent, HTTP and the CLI — that's Agent-Native. Data is synthetic, scores are heuristic. Built by Alejandro Arana, FinanciLab, Nicaragua." |

Tips: reset data before recording; keep the agent sidebar visible; keep under 3 minutes.

## (b) Submission form answers (fields found at builder.io/hackathon/submit)

- **First name \***: Alejandro
- **Last name**: Arana
- **Email \***: (the email used for the Builder.io account — Alejandro to confirm)
- **Project name \***: FinanciLab Scam Shield
- **Project description \*** (placeholder asks: what it does, how it uses Agent-Native, pre-existing work/templates/third-party assets and what changed during the event, team names):

> FinanciLab Scam Shield is a shared scam-case inbox for Spanish-speaking users in Central America, where a human analyst and an AI agent triage suspicious WhatsApp/SMS/email messages together on the same data.
>
> What it does: paste or load suspicious messages; the agent scores each one (heuristic 0–100 risk), flags scams, explains the red flags in Spanish or English, drafts a safe reply, and writes an education tip. The human reviews and resolves cases. Every change is labeled "by you" or "by agent", so collaboration is visible.
>
> How it uses Agent-Native: cases, scores, replies and tips are defined once as actions that are shared by the UI, the agent chat, HTTP and the CLI. The "Triage with agent" button hands the inbox to the agent, which calls the same actions the human uses; the UI updates live from the shared database.
>
> Pre-existing work and what changed: built on the Agent-Native framework and its app template. The scam heuristics come from our own open-source scam-shield-core library (github.com/alejoetienne/scam-shield-core), written for this event series. The inbox app, actions, agent instructions, UI and tests were built during the event (Nov 2, 2026). All demo data is synthetic; scores are heuristic, not a trained model. No real payments or user data.
>
> Team: Alejandro Arana (FinanciLab / Blockchain Nicaragua), solo.

- **Project or GitHub URL**: https://github.com/alejoetienne/financilab-agent-native
- **Public Clips recording URL \***: (pending — record per script above)
- **Slides URL**: (optional, leave blank)
- **Rules/eligibility consent \***: Alejandro must check himself.
- **Marketing**: optional, Alejandro's choice.

Short tagline: *A human + AI agent scam inbox for Spanish-speaking Central America.*

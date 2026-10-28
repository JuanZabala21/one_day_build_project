# Scoutline: AI company research

Type a company name and get a sourced research report in a few minutes: **headquarters, age, headcount, decision makers and how to reach them**, plus funding/revenue, recent news and an analyst summary.

Built for the One Day Build Challenge (Project 1: Company Research Tool) with the T3 stack and the Claude API's server-side web search.

## Features

- **Disambiguation first.** "Delta" could be the airline or the faucet maker. A quick search returns up to 5 matching companies (with website, HQ and a one-line description) so you research the right one. You can add a hint (website, city, industry) to narrow it down.
- **Live research log.** While Claude works, the report page shows every search query and every page it reads, with timings.
- **Structured, sourced report.** Every section lists the pages it came from and a confidence level (high / medium / low). Where sources disagree (for example on headcount), the report says so.
- **Decision makers with honest contact info.**
  - Emails and phones are shown only if they were **published verbatim on a public page**, and are marked *Published*.
  - If Claude found evidence of the company's email format (e.g. `{first}.{last}@acme.com`), the app derives a likely address per person and labels it **Suggested · unverified**. The AI never invents addresses.
- **Exports.** Download contacts as CSV, the whole report as JSON, or print it / save it as a PDF.
- **History and reuse.** Reports are saved. Researching the same company (matched by domain) within 7 days reopens the existing report, and *Re-run research* forces a fresh one.
- **Cost transparency.** Each report shows duration, number of searches and pages read, token usage and an estimated API cost.

## How it works

```
 Browser                       Next.js server (tRPC)                     Anthropic API
 ───────                       ─────────────────────                     ─────────────
 1. "Stripe" ──findMatches──▶  runAgent(submit_candidates, effort=low) ─▶ Claude + web_search
            ◀── candidates ──
 2. pick one ──startResearch─▶ insert report row (status=researching)
            ◀── report id ───  after(): runResearchJob(id) ─────────────▶ Claude + web_search
 3. /reports/:id                 │ each streamed block → progress row       + web_fetch
    polls company.get every 2s   │ submit_report input → zod validation
            ◀── progress / report ┘ store result + stats, status=complete
```

**The agent loop** ([src/server/research/claude.ts](src/server/research/claude.ts)) calls `claude-opus-5-5` with three tools:

| Tool | Runs on | Purpose |
|---|---|---|
| `web_search_20260209` | Anthropic | Search the web (max 12 per call) |
| `web_fetch_20260209` | Anthropic | Read full pages such as leadership or contact pages (max 10 per call) |
| `submit_report` | Our app | Claude's final answer. Its input schema is generated from the Zod schema in [src/lib/report-schema.ts](src/lib/report-schema.ts) |

Because search and fetch run server-side at Anthropic, the loop only has to handle three things:
- `pause_turn`: a long search turn was paused, so it is sent back for Claude to continue.
- An invalid `submit_report`: the Zod validation errors go back to Claude as a tool error so it can fix them.
- Claude ending its turn without submitting: it gets a nudge to submit.

The loop also:
- streams responses and turns each finished content block into a log line ("Searching …", "Reading …");
- caches the conversation prefix, because each turn resends all search results;
- enables the API's default refusal fallback.

**Prompting for accuracy** ([src/server/research/prompts.ts](src/server/research/prompts.ts)):
- cite pages for every fact, and use `null` instead of guessing;
- confirm facts belong to the right company (not a namesake);
- check that leaders are current;
- never construct personal contact details.

The Zod field descriptions repeat these rules, so they reach Claude through the tool schema too.

**Background jobs.**
- A full report takes about 1–3 minutes, so `startResearch` returns at once and the run continues in Next.js `after()`.
- Progress is written to SQLite as it happens. The report page polls, so you can close the tab and come back.
- A run with no progress for 15 minutes is shown as interrupted.

## Tech stack

- [Next.js 15](https://nextjs.org) (App Router) + [tRPC 11](https://trpc.io) + [TanStack Query](https://tanstack.com/query)
- [Drizzle ORM](https://orm.drizzle.team) + SQLite (libSQL)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript): Claude Opus 5.5 with web search and web fetch
- [Zod 4](https://zod.dev) for the report schema, validation and JSON Schema generation
- [Vitest](https://vitest.dev) for unit tests

## Running it locally

Requirements: Node.js 20+ and an Anthropic API key ([console.anthropic.com](https://console.anthropic.com/settings/keys)) with web search enabled for your organization.

```bash
npm install
cp .env.example .env        # then set ANTHROPIC_API_KEY (and AUTH_SECRET: npx auth secret)
npm run db:push             # creates the local SQLite database (db.sqlite)
npm run dev                 # http://localhost:3000
```

Other scripts:

| Command | What it does |
|---|---|
| `npm test` | Unit tests (email-pattern logic, URL helpers, report schema) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:studio` | Browse the database in Drizzle Studio |

API cost depends on how much there is to read about the company. Each report shows its own estimate, based on Opus 5.5 list prices set in `PRICING` in [src/server/research/claude.ts](src/server/research/claude.ts).

## Project structure

```
src/
├── app/
│   ├── page.tsx                          # Home: search + recent reports
│   ├── _components/
│   │   ├── company-search.tsx            # Search form and candidate picker
│   │   ├── recent-reports.tsx
│   │   └── ui.tsx                        # Card, Badge, Sources, ConfidencePill…
│   └── reports/[id]/
│       ├── page.tsx
│       └── _components/
│           ├── report-view.tsx           # Polling, live progress log, failure state
│           └── report-content.tsx        # The finished report + CSV/JSON export
├── lib/
│   ├── report-schema.ts                  # Zod schemas shared by Claude, validation and UI
│   └── format.ts                         # Email pattern, URL and number helpers
└── server/
    ├── api/routers/company.ts            # findMatches, startResearch, get, recent
    ├── db/schema.ts                      # reports table (+ NextAuth tables)
    └── research/
        ├── claude.ts                     # Agent loop, cost accounting, error messages
        ├── prompts.ts                    # System prompts
        └── job.ts                        # Background run + progress logging
```

## Limitations and next steps

- **Contact data is limited to what's public.** Most executives don't publish direct emails or phones. A verification provider (Hunter, Apollo, ZeroBounce) could confirm the suggested addresses.
- **Background runs need a long-lived server.** This works with `npm run dev` / `npm start`. On serverless hosts, runs are capped by the function's `maxDuration` (set to 300s); a queue (Inngest, Trigger.dev) would be the production fix.
- **No accounts.** Reports are shared by everyone using the instance. NextAuth is scaffolded and could scope reports per user.
- Possible next steps: compare several companies side by side, scheduled re-research with change alerts, CRM export (HubSpot / Salesforce).

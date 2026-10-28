import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";

import { env } from "~/env";
import {
  CandidateListSchema,
  CompanyReportSchema,
  type CompanyCandidate,
  type CompanyReport,
  type ResearchStats,
} from "~/lib/report-schema";
import {
  CANDIDATES_SYSTEM,
  REPORT_SYSTEM,
  candidatesPrompt,
  reportPrompt,
} from "./prompts";

export const RESEARCH_MODEL = "claude-opus-5-5";

/**
 * Claude Opus 5.5 list prices, used only for the "estimated cost" line on each report.
 * Tokens are USD per million; web search is USD per search. Check https://www.anthropic.com/pricing.
 */
const PRICING = {
  input: 4,
  output: 20,
  cacheRead: 0.2,
  cacheWrite: 5,
  webSearch: 0.01,
};

/** An error whose message is safe and useful to show to the user. */
export class ResearchError extends Error {}

let client: Anthropic | undefined;

export function assertResearchConfigured() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ResearchError(
      "ANTHROPIC_API_KEY is not set. Add it to your .env file and restart the server.",
    );
  }
}

function getClient() {
  assertResearchConfigured();
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

type BlockListener = (block: Anthropic.Beta.BetaContentBlock) => void;

type AgentOptions<T> = {
  system: string;
  prompt: string;
  /** Claude hands back its final answer by calling this tool; its input is the result. */
  submitTool: { name: string; description: string; schema: z.ZodType<T> };
  effort: "low" | "medium" | "high";
  maxSearches: number;
  maxFetches: number;
  onBlock?: BlockListener;
};

const MAX_TURNS = 15;

/**
 * Runs Claude with server-side web search / web fetch until it calls the submit tool with input
 * that passes schema validation.
 *
 * Searches and page fetches run on Anthropic's side, so the only things handled here are:
 * - `pause_turn`: a long server-tool turn was paused; send it back so Claude continues.
 * - a submission that fails validation: return the errors as a tool_result so Claude fixes them.
 * - Claude ending its turn without submitting: ask it to submit.
 */
async function runAgent<T>(
  opts: AgentOptions<T>,
): Promise<{ data: T; stats: ResearchStats }> {
  const anthropic = getClient();
  const startedAt = Date.now();
  const stats = emptyStats();

  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: opts.maxSearches,
    },
    {
      name: opts.submitTool.name,
      description: opts.submitTool.description,
      input_schema: z.toJSONSchema(
        opts.submitTool.schema,
      ) as Anthropic.Beta.BetaTool.InputSchema,
    },
  ];
  if (opts.maxFetches > 0) {
    tools.splice(1, 0, {
      type: "web_fetch_20260209",
      name: "web_fetch",
      max_uses: opts.maxFetches,
    });
  }

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: opts.prompt },
  ];
  let invalidSubmissions = 0;
  let nudges = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = anthropic.beta.messages.stream({
      model: RESEARCH_MODEL,
      max_tokens: 32000,
      system: opts.system,
      messages,
      tools,
      output_config: { effort: opts.effort },
      // Each turn resends the whole conversation (including search results), so cache it.
      cache_control: { type: "ephemeral" },
      // If the model declines for policy reasons, let the API retry on its default fallback.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (opts.onBlock) stream.on("contentBlock", opts.onBlock);

    const message = await stream.finalMessage();
    addUsage(stats, message);

    if (message.stop_reason === "refusal") {
      throw new ResearchError("This request could not be researched.");
    }
    messages.push({ role: "assistant", content: message.content });

    const submission = message.content.find(
      (block): block is Anthropic.Beta.BetaToolUseBlock =>
        block.type === "tool_use" && block.name === opts.submitTool.name,
    );
    if (submission) {
      const parsed = opts.submitTool.schema.safeParse(submission.input);
      if (parsed.success) {
        stats.durationMs = Date.now() - startedAt;
        return { data: parsed.data, stats };
      }
      if (++invalidSubmissions > 2) {
        throw new ResearchError(
          "The research result did not match the expected format. Please try again.",
        );
      }
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: submission.id,
            is_error: true,
            content: `The input did not match the schema:\n${z.prettifyError(parsed.error)}\nFix these fields and call ${opts.submitTool.name} again.`,
          },
        ],
      });
      continue;
    }

    if (message.stop_reason === "pause_turn") continue;

    if (++nudges > 2) {
      throw new ResearchError("Research finished without producing a report. Please try again.");
    }
    messages.push({
      role: "user",
      content: `Call the ${opts.submitTool.name} tool now with what you have found.`,
    });
  }

  throw new ResearchError("Research took too many steps and was stopped.");
}

export async function findCandidates(
  name: string,
  hint: string | undefined,
): Promise<CompanyCandidate[]> {
  const { data } = await runAgent({
    system: CANDIDATES_SYSTEM,
    prompt: candidatesPrompt(name, hint),
    submitTool: {
      name: "submit_candidates",
      description: "Submit the list of companies that match the user's query.",
      schema: CandidateListSchema,
    },
    effort: "low",
    maxSearches: 3,
    maxFetches: 0,
  });
  return data.candidates.slice(0, 5);
}

export async function researchCompany(
  candidate: CompanyCandidate,
  onBlock: BlockListener,
): Promise<{ report: CompanyReport; stats: ResearchStats }> {
  const { data, stats } = await runAgent({
    system: REPORT_SYSTEM,
    prompt: reportPrompt(candidate),
    submitTool: {
      name: "submit_report",
      description:
        "Submit the finished company report. Call this exactly once, after your research is done.",
      schema: CompanyReportSchema,
    },
    effort: "medium",
    maxSearches: 12,
    maxFetches: 10,
    onBlock,
  });
  return { report: data, stats };
}

/** Converts any error from a research run into a message that is safe to show the user. */
export function describeResearchError(error: unknown): string {
  if (error instanceof ResearchError) return error.message;
  if (error instanceof Anthropic.AuthenticationError) {
    return "Anthropic rejected the API key. Check ANTHROPIC_API_KEY in your .env file.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "The Anthropic API is rate limiting requests. Wait a minute and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `The Anthropic API returned an error (${error.status ?? "network"}): ${error.message}`;
  }
  console.error("[research] unexpected error", error);
  return "Something went wrong while researching. Please try again.";
}

function emptyStats(): ResearchStats {
  return {
    model: RESEARCH_MODEL,
    durationMs: 0,
    apiCalls: 0,
    webSearches: 0,
    webFetches: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    estimatedCostUsd: 0,
  };
}

function addUsage(stats: ResearchStats, message: Anthropic.Beta.BetaMessage) {
  const { usage } = message;
  stats.model = message.model;
  stats.apiCalls += 1;
  stats.inputTokens += usage.input_tokens;
  stats.outputTokens += usage.output_tokens;
  stats.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
  stats.cacheWriteTokens += usage.cache_creation_input_tokens ?? 0;
  stats.webSearches += usage.server_tool_use?.web_search_requests ?? 0;
  stats.webFetches += usage.server_tool_use?.web_fetch_requests ?? 0;
  stats.estimatedCostUsd =
    (stats.inputTokens * PRICING.input +
      stats.outputTokens * PRICING.output +
      stats.cacheReadTokens * PRICING.cacheRead +
      stats.cacheWriteTokens * PRICING.cacheWrite) /
      1_000_000 +
    stats.webSearches * PRICING.webSearch;
}

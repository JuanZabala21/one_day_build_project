import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";

import { prettyUrl } from "~/lib/format";
import { type ProgressEvent } from "~/lib/report-schema";
import { db } from "~/server/db";
import { reports } from "~/server/db/schema";
import { describeResearchError, researchCompany } from "./claude";

/**
 * Runs the research for a report row in the background and records progress as it goes, so the
 * report page can poll and show a live log. Never throws: failures are stored on the row.
 */
export async function runResearchJob(reportId: string) {
  const row = await db.query.reports.findFirst({
    where: eq(reports.id, reportId),
  });
  if (!row) return;

  const progress: ProgressEvent[] = [...row.progress];
  // Writes are chained so they land in order even though stream callbacks are synchronous.
  let pendingWrite = Promise.resolve();
  const log = (kind: ProgressEvent["kind"], label: string) => {
    const previous = progress.at(-1);
    if (previous?.kind === kind && previous.label === label) return;
    progress.push({ at: Date.now(), kind, label });
    const snapshot = [...progress];
    pendingWrite = pendingWrite
      .then(async () => {
        await db
          .update(reports)
          .set({ progress: snapshot })
          .where(eq(reports.id, reportId));
      })
      .catch((error) => console.error("[research] progress write failed", error));
  };

  try {
    const { report, stats } = await researchCompany(row.candidate, (block) => {
      const event = describeBlock(block);
      if (event) log(event.kind, event.label);
    });
    log("status", "Report complete");
    await pendingWrite;
    await db
      .update(reports)
      .set({
        status: "complete",
        result: report,
        stats,
        progress,
        completedAt: new Date(),
      })
      .where(eq(reports.id, reportId));
  } catch (error) {
    const message = describeResearchError(error);
    log("error", message);
    await pendingWrite;
    await db
      .update(reports)
      .set({ status: "failed", error: message, progress, completedAt: new Date() })
      .where(eq(reports.id, reportId));
  }
}

/** Turns a finished content block from Claude's stream into a human-readable log line. */
function describeBlock(
  block: Anthropic.Beta.BetaContentBlock,
): Pick<ProgressEvent, "kind" | "label"> | null {
  if (block.type === "server_tool_use") {
    const input = (block.input ?? {}) as { query?: unknown; url?: unknown };
    if (block.name === "web_search" && typeof input.query === "string") {
      return { kind: "search", label: `Searching “${input.query}”` };
    }
    if (block.name === "web_fetch" && typeof input.url === "string") {
      return { kind: "fetch", label: `Reading ${prettyUrl(input.url)}` };
    }
    return { kind: "analyze", label: "Filtering search results" };
  }
  if (block.type === "tool_use" && block.name === "submit_report") {
    return { kind: "write", label: "Writing the report" };
  }
  return null;
}

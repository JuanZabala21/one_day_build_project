import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod/v4";

import { normalizeDomain } from "~/lib/format";
import { CompanyCandidateSchema } from "~/lib/report-schema";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { reports } from "~/server/db/schema";
import {
  assertResearchConfigured,
  describeResearchError,
  findCandidates,
} from "~/server/research/claude";
import { runResearchJob } from "~/server/research/job";

/** A run with no progress for this long is assumed dead (e.g. the server restarted mid-run). */
const STALE_AFTER_MS = 15 * 60 * 1000;
/** Completed reports for the same domain this recent are reused instead of re-researched. */
const REUSE_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;

export const companyRouter = createTRPCRouter({
  /** Step 1: turn a typed name into a short list of real companies the user can pick from. */
  findMatches: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        hint: z.string().trim().max(160).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await findCandidates(input.name, input.hint);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: describeResearchError(error),
        });
      }
    }),

  /** Step 2: research the picked company. Returns immediately; the run continues in the background. */
  startResearch: publicProcedure
    .input(
      z.object({
        query: z.string().trim().min(1).max(200),
        candidate: CompanyCandidateSchema,
        force: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = normalizeDomain(input.candidate.website);

      if (domain && !input.force) {
        const recent = await ctx.db.query.reports.findFirst({
          where: and(
            eq(reports.domain, domain),
            eq(reports.status, "complete"),
            gt(reports.createdAt, new Date(Date.now() - REUSE_WITHIN_MS)),
          ),
          orderBy: desc(reports.createdAt),
          columns: { id: true },
        });
        if (recent) return { id: recent.id, reused: true };
      }

      try {
        assertResearchConfigured();
      } catch (error) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: describeResearchError(error),
        });
      }

      const [row] = await ctx.db
        .insert(reports)
        .values({
          query: input.query,
          companyName: input.candidate.name,
          domain,
          candidate: input.candidate,
          progress: [{ at: Date.now(), kind: "status", label: "Research started" }],
        })
        .returning({ id: reports.id });
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      after(() => runResearchJob(row.id));
      return { id: row.id, reused: false };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.reports.findFirst({
        where: eq(reports.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });

      const lastActivity = row.updatedAt ?? row.createdAt;
      if (
        row.status === "researching" &&
        Date.now() - lastActivity.getTime() > STALE_AFTER_MS
      ) {
        return {
          ...row,
          status: "failed" as const,
          error: "This research run was interrupted. Run it again.",
        };
      }
      return row;
    }),

  recent: publicProcedure.query(({ ctx }) =>
    ctx.db.query.reports.findMany({
      orderBy: desc(reports.createdAt),
      limit: 12,
      columns: {
        id: true,
        companyName: true,
        domain: true,
        status: true,
        createdAt: true,
      },
    }),
  ),
});

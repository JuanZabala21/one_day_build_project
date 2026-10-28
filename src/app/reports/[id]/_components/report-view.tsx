"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card, ErrorBox, Spinner } from "~/app/_components/ui";
import { formatDuration } from "~/lib/format";
import { type ProgressEvent } from "~/lib/report-schema";
import { api, type RouterOutputs } from "~/trpc/react";
import { ReportContent } from "./report-content";

type Report = RouterOutputs["company"]["get"];

export function ReportView({ id }: { id: string }) {
  const router = useRouter();
  const [report] = api.company.get.useSuspenseQuery(
    { id },
    {
      refetchInterval: (query) =>
        query.state.data?.status === "researching" ? 2000 : false,
    },
  );

  const rerun = api.company.startResearch.useMutation({
    onSuccess: ({ id: newId }) => router.push(`/reports/${newId}`),
  });
  const onRerun = () =>
    rerun.mutate({
      query: report.query,
      candidate: report.candidate,
      force: true,
    });

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-block text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 print:hidden"
      >
        ← New search
      </Link>

      {rerun.error && <ErrorBox>{rerun.error.message}</ErrorBox>}

      {report.status === "researching" && <ResearchProgress report={report} />}

      {report.status === "failed" && (
        <Card>
          <h1 className="text-xl font-semibold">{report.companyName}</h1>
          <div className="mt-3">
            <ErrorBox>{report.error ?? "Research failed."}</ErrorBox>
          </div>
          <button
            onClick={onRerun}
            disabled={rerun.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {rerun.isPending && <Spinner />}
            Try again
          </button>
          <ProgressLog events={report.progress} className="mt-6" />
        </Card>
      )}

      {report.status === "complete" && report.result && (
        <ReportContent
          report={report.result}
          stats={report.stats}
          completedAt={report.completedAt ?? report.createdAt}
          progress={report.progress}
          onRerun={onRerun}
          rerunning={rerun.isPending}
        />
      )}
    </div>
  );
}

function ResearchProgress({ report }: { report: Report }) {
  const now = useNow();
  const elapsed = now - report.createdAt.getTime();
  const searches = report.progress.filter((e) => e.kind === "search").length;
  const pages = report.progress.filter((e) => e.kind === "fetch").length;

  return (
    <Card>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
            <Spinner /> Researching
          </p>
          <h1 className="mt-1 text-xl font-bold wrap-anywhere sm:text-2xl">
            {report.companyName}
          </h1>
          {report.candidate.description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {report.candidate.description}
            </p>
          )}
        </div>
        <p className="text-sm text-slate-500 tabular-nums dark:text-slate-400">
          {formatDuration(Math.max(0, elapsed))} · {searches}{" "}
          {searches === 1 ? "search" : "searches"} · {pages}{" "}
          {pages === 1 ? "page" : "pages"} read
        </p>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Searching the web, reading sources and cross-checking facts. A full
        report usually takes 1–3 minutes. You can leave this page and come back
        later.
      </p>
      <ProgressLog events={report.progress} live className="mt-5" />
    </Card>
  );
}

const kindIcon: Record<ProgressEvent["kind"], string> = {
  status: "•",
  search: "🔍",
  fetch: "📄",
  analyze: "⚙️",
  write: "✍️",
  error: "⚠️",
};

export function ProgressLog({
  events,
  live = false,
  className = "",
}: {
  events: ProgressEvent[];
  live?: boolean;
  className?: string;
}) {
  if (events.length === 0) return null;
  const start = events[0]!.at;
  return (
    <ol className={`space-y-1.5 text-sm ${className}`}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <li key={`${event.at}-${index}`} className="flex gap-2 sm:gap-3">
            <span className="w-11 shrink-0 text-right text-xs leading-5 text-slate-400 tabular-nums sm:w-12 dark:text-slate-500">
              +{formatDuration(event.at - start)}
            </span>
            <span className="w-5 shrink-0 text-center" aria-hidden>
              {live && isLast ? (
                <Spinner className="mt-0.5 size-3.5 text-indigo-500 dark:text-indigo-400" />
              ) : (
                kindIcon[event.kind]
              )}
            </span>
            <span
              className={`min-w-0 wrap-anywhere ${
                event.kind === "error"
                  ? "text-red-700 dark:text-red-400"
                  : isLast && live
                    ? "font-medium text-slate-900 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {event.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

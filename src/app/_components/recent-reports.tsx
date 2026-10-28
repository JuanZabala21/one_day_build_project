"use client";

import Link from "next/link";

import { timeAgo } from "~/lib/format";
import { api } from "~/trpc/react";
import { Badge } from "./ui";

export function RecentReports() {
  const [reports] = api.company.recent.useSuspenseQuery();

  if (reports.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No reports yet. Search for a company above to create your first one.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={`/reports/${report.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{report.companyName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {report.domain ?? "No website"} · {timeAgo(report.createdAt)}
              </p>
            </div>
            {report.status === "complete" && (
              <Badge tone="emerald">Complete</Badge>
            )}
            {report.status === "researching" && (
              <Badge tone="indigo">Researching…</Badge>
            )}
            {report.status === "failed" && <Badge tone="red">Failed</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import { timeAgo } from "~/lib/format";
import { api } from "~/trpc/react";
import { ConfirmDialog } from "./confirm-dialog";
import { Badge, Spinner } from "./ui";

type DeleteTarget = { id: string; companyName: string } | "all";

export function RecentReportsHeading({ action }: { action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Recent reports
      </h2>
      {action}
    </div>
  );
}

export function RecentReports() {
  const [reports] = api.company.recent.useSuspenseQuery();
  const utils = api.useUtils();
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  // Keep the dialog open until the list has refreshed, so it never shows a row that's gone.
  const onSuccess = async () => {
    await utils.company.recent.invalidate();
    setTarget(null);
  };
  const deleteOne = api.company.delete.useMutation({ onSuccess });
  const deleteAll = api.company.deleteAll.useMutation({ onSuccess });
  const busy = deleteOne.isPending || deleteAll.isPending;
  const error = deleteOne.error ?? deleteAll.error;

  const askToDelete = (next: DeleteTarget) => {
    deleteOne.reset();
    deleteAll.reset();
    setTarget(next);
  };

  const dialog = (
    <ConfirmDialog
      open={target !== null}
      title={target === "all" ? "Delete all reports?" : "Delete this report?"}
      description={
        target === "all" ? (
          "Every report will be permanently deleted. This can't be undone."
        ) : (
          <>
            The report for{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {target?.companyName}
            </span>{" "}
            will be permanently deleted. This can&apos;t be undone.
          </>
        )
      }
      confirmLabel={target === "all" ? "Delete all" : "Delete"}
      pending={busy}
      error={error ? `Couldn't delete: ${error.message}` : undefined}
      onConfirm={() => {
        if (target === "all") deleteAll.mutate();
        else if (target) deleteOne.mutate({ id: target.id });
      }}
      onClose={() => setTarget(null)}
    />
  );

  if (reports.length === 0) {
    return (
      <>
        <RecentReportsHeading />
        {dialog}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No reports yet. Search for a company above to create your first one.
        </p>
      </>
    );
  }

  return (
    <>
      <RecentReportsHeading
        action={
          <button
            type="button"
            disabled={busy}
            onClick={() => askToDelete("all")}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            {deleteAll.isPending && <Spinner className="size-3" />}
            Delete all
          </button>
        }
      />
      {dialog}
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {reports.map((report) => {
          const deletingThis =
            deleteOne.isPending && deleteOne.variables?.id === report.id;
          return (
            <li
              key={report.id}
              className={`flex items-center transition ${deletingThis || deleteAll.isPending ? "opacity-50" : ""}`}
            >
              <Link
                href={`/reports/${report.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pr-2 pl-4 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{report.companyName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {report.domain ?? "No website"} ·{" "}
                    {timeAgo(report.createdAt)}
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
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  askToDelete({
                    id: report.id,
                    companyName: report.companyName,
                  })
                }
                aria-label={`Delete report for ${report.companyName}`}
                title="Delete report"
                className="mr-2 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
              >
                {deletingThis ? <Spinner className="size-4" /> : <TrashIcon />}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

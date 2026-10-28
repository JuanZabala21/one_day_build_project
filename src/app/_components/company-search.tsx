"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { type CompanyCandidate } from "~/lib/report-schema";
import { api } from "~/trpc/react";
import { ErrorBox, ExternalLink, Spinner } from "./ui";

export function CompanySearch() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [searchedName, setSearchedName] = useState("");

  const findMatches = api.company.findMatches.useMutation();
  const startResearch = api.company.startResearch.useMutation({
    onSuccess: ({ id }) => router.push(`/reports/${id}`),
  });

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    setSearchedName(name.trim());
    startResearch.reset();
    findMatches.mutate({ name: name.trim(), hint: hint.trim() || undefined });
  };

  const research = (candidate: CompanyCandidate) =>
    startResearch.mutate({ query: searchedName, candidate });

  const researchAsTyped = () =>
    research({
      name: searchedName,
      website: null,
      headquarters: hint.trim() || null,
      industry: null,
      description: `Company named "${searchedName}" as entered by the user.`,
    });

  const candidates = findMatches.data;
  const busy = findMatches.isPending || startResearch.isPending;

  return (
    <div className="space-y-6">
      <form
        onSubmit={search}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Company name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stripe"
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:focus:ring-indigo-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Website, location or industry{" "}
              <span className="font-normal text-slate-400 dark:text-slate-500">
                (optional)
              </span>
            </span>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. stripe.com or San Francisco"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:focus:ring-indigo-900"
            />
          </label>
          <button
            type="submit"
            disabled={busy || name.trim().length < 2}
            className="inline-flex h-[42px] items-center justify-center gap-2 self-end rounded-lg bg-indigo-600 px-5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {findMatches.isPending && <Spinner />}
            Find company
          </button>
        </div>
      </form>

      {findMatches.isPending && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Spinner /> Searching the web for companies named “{searchedName}”.
            This usually takes 10–30 seconds.
          </p>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60"
            />
          ))}
        </div>
      )}

      {findMatches.error && <ErrorBox>{findMatches.error.message}</ErrorBox>}
      {startResearch.error && (
        <ErrorBox>{startResearch.error.message}</ErrorBox>
      )}

      {candidates && !findMatches.isPending && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {candidates.length > 0
              ? "Which company do you mean?"
              : `No companies found for “${searchedName}”.`}
          </h2>
          <ul className="space-y-3">
            {candidates.map((candidate, index) => (
              <li
                key={`${candidate.name}-${index}`}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{candidate.name}</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                    {candidate.description}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                    {candidate.headquarters && (
                      <span>{candidate.headquarters}</span>
                    )}
                    {candidate.industry && <span>{candidate.industry}</span>}
                    {candidate.website && (
                      <ExternalLink href={candidate.website} />
                    )}
                  </p>
                </div>
                <button
                  onClick={() => research(candidate)}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                >
                  {startResearch.isPending &&
                    startResearch.variables?.candidate === candidate && (
                      <Spinner />
                    )}
                  Research this company
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={researchAsTyped}
            disabled={busy}
            className="text-sm text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Not listed? Research “{searchedName}” as typed
          </button>
        </div>
      )}
    </div>
  );
}

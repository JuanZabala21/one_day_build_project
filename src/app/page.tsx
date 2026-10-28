import { Suspense } from "react";

import { CompanySearch } from "~/app/_components/company-search";
import {
  RecentReports,
  RecentReportsHeading,
} from "~/app/_components/recent-reports";
import { api, HydrateClient } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  void api.company.recent.prefetch();

  return (
    <HydrateClient>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-14">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
            Research any company in minutes
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            Enter a company name. We search the web and build a sourced report
            with location, age, headcount, decision makers and how to reach
            them.
          </p>
        </div>

        <CompanySearch />

        <section className="mt-10 sm:mt-12">
          <Suspense
            fallback={
              <>
                <RecentReportsHeading />
                <div className="h-32 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
              </>
            }
          >
            <RecentReports />
          </Suspense>
        </section>
      </main>
    </HydrateClient>
  );
}

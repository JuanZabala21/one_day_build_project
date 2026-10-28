import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { ReportView } from "./_components/report-view";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  void api.company.get.prefetch({ id });

  return (
    <HydrateClient>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
          }
        >
          <ReportView id={id} />
        </Suspense>
      </main>
    </HydrateClient>
  );
}

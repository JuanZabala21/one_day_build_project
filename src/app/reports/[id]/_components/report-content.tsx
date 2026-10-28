"use client";

import {
  Badge,
  Card,
  ConfidencePill,
  ExternalLink,
  Sources,
  Spinner,
} from "~/app/_components/ui";
import { env } from "~/env";
import {
  applyEmailPattern,
  ensureProtocol,
  formatDuration,
  formatTokens,
  timeAgo,
} from "~/lib/format";
import {
  type CompanyReport,
  type DecisionMaker,
  type ProgressEvent,
  type ResearchStats,
} from "~/lib/report-schema";
import { ProgressLog } from "./report-view";

type Props = {
  report: CompanyReport;
  stats: ResearchStats | null;
  completedAt: Date;
  progress: ProgressEvent[];
  onRerun: () => void;
  rerunning: boolean;
};

export function ReportContent({
  report,
  stats,
  completedAt,
  progress,
  onRerun,
  rerunning,
}: Props) {
  const { company } = report;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight wrap-anywhere sm:text-3xl">
              {company.name}
            </h1>
            {company.legalName && company.legalName !== company.name && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {company.legalName}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {company.website && (
                <ExternalLink
                  href={ensureProtocol(company.website)}
                  className="text-sm"
                />
              )}
              {company.industry && <Badge>{company.industry}</Badge>}
              <Badge tone="indigo">
                {ownershipLabel[company.ownership]}
                {company.stockTicker ? ` · ${company.stockTicker}` : ""}
              </Badge>
              {company.parentCompany && (
                <Badge>Part of {company.parentCompany}</Badge>
              )}
            </div>
            <p className="mt-3 max-w-3xl text-slate-700 dark:text-slate-300">
              {company.description}
            </p>
          </div>
          {/* 2x2 grid of full-width buttons on phones, a single row from sm up. */}
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap print:hidden">
            <button
              onClick={onRerun}
              disabled={rerunning}
              className={actionButton}
            >
              {rerunning && <Spinner />}
              Re-run research
            </button>
            <button
              onClick={() => downloadCsv(report)}
              className={actionButton}
            >
              Contacts CSV
            </button>
            <button
              onClick={() => downloadJson(report)}
              className={actionButton}
            >
              JSON
            </button>
            <button onClick={() => window.print()} className={actionButton}>
              Print / PDF
            </button>
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-indigo-50/60 p-4 dark:bg-indigo-950/40">
          <p className="mb-1 text-xs font-semibold tracking-wide text-indigo-700 uppercase dark:text-indigo-300">
            Analyst summary
          </p>
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {report.summary}
          </p>
        </div>
      </Card>

      {/* Key facts */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <HeadquartersFact report={report} />
        <FoundedFact report={report} />
        <EmployeesFact report={report} />
      </div>

      <DecisionMakers report={report} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <CompanyContact report={report} />
        <LocationMap report={report} />
      </div>

      {report.caveats.length > 0 && (
        <Card title="Recommended Actions to Reach Out">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {report.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </Card>
      )}

      <footer className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
        {stats && (
          <p>
            Researched {timeAgo(completedAt)} in{" "}
            {formatDuration(stats.durationMs)} · {stats.webSearches} web
            searches · {stats.webFetches} pages read · {stats.apiCalls} API
            calls ·{" "}
            {formatTokens(
              stats.inputTokens +
                stats.cacheReadTokens +
                stats.cacheWriteTokens,
            )}{" "}
            input / {formatTokens(stats.outputTokens)} output tokens · est. $
            {stats.estimatedCostUsd.toFixed(2)}
          </p>
        )}
        <p>
          AI-generated from public web sources. Verify important details,
          especially contact information, before relying on them.
        </p>
        <details className="print:hidden">
          <summary className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
            Research log
          </summary>
          <ProgressLog events={progress} className="mt-3" />
        </details>
      </footer>
    </div>
  );
}

const actionButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 sm:py-1.5 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800";

const ownershipLabel: Record<CompanyReport["company"]["ownership"], string> = {
  public: "Public company",
  private: "Private company",
  subsidiary: "Subsidiary",
  nonprofit: "Nonprofit",
  government: "Government",
  unknown: "Ownership unknown",
};

function Fact({
  label,
  value,
  detail,
  children,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {detail && (
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
          {detail}
        </p>
      )}
      <div className="mt-auto space-y-1.5 pt-3">{children}</div>
    </Card>
  );
}

const unknown = (
  <span className="text-slate-400 dark:text-slate-500">Not found</span>
);

function HeadquartersFact({ report }: { report: CompanyReport }) {
  const hq = report.headquarters;
  const place = [hq.city, hq.region, hq.country].filter(Boolean).join(", ");
  return (
    <Fact
      label="Headquarters"
      // Full width in the 2-column tablet grid so the three facts don't leave a gap.
      className="sm:col-span-2 lg:col-span-1"
      value={place || unknown}
      detail={
        <>
          {hq.address && <span className="block">{hq.address}</span>}
          {hq.otherLocations.length > 0 && (
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Also: {hq.otherLocations.join(" · ")}
            </span>
          )}
        </>
      }
    >
      <ConfidencePill level={hq.confidence} />
      <Sources urls={hq.sourceUrls} />
    </Fact>
  );
}

function FoundedFact({ report }: { report: CompanyReport }) {
  const { founding } = report;
  const age = founding.year ? new Date().getFullYear() - founding.year : null;
  return (
    <Fact
      label="Founded"
      value={
        founding.year ? (
          <>
            {founding.year}{" "}
            <span className="text-base font-normal text-slate-500 dark:text-slate-400">
              ·{" "}
              {age! < 1
                ? "under 1 year"
                : `${age} ${age === 1 ? "year" : "years"}`}{" "}
              old
            </span>
          </>
        ) : (
          unknown
        )
      }
      detail={
        <>
          {founding.founders.length > 0 && (
            <span className="block">By {founding.founders.join(", ")}</span>
          )}
          {founding.notes && (
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {founding.notes}
            </span>
          )}
        </>
      }
    >
      <ConfidencePill level={founding.confidence} />
      <Sources urls={founding.sourceUrls} />
    </Fact>
  );
}

function EmployeesFact({ report }: { report: CompanyReport }) {
  const { employees } = report;
  const value =
    employees.count !== null
      ? `~${employees.count.toLocaleString()}`
      : (employees.range ?? unknown);
  return (
    <Fact
      label="Employees"
      value={value}
      detail={
        <>
          {employees.count !== null && employees.range && (
            <span className="block">Range: {employees.range}</span>
          )}
          {employees.asOf && (
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              As of {employees.asOf}
            </span>
          )}
          {employees.notes && (
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {employees.notes}
            </span>
          )}
        </>
      }
    >
      <ConfidencePill level={employees.confidence} />
      <Sources urls={employees.sourceUrls} />
    </Fact>
  );
}

function DecisionMakers({ report }: { report: CompanyReport }) {
  const { decisionMakers, emailPattern } = report;
  return (
    <Card
      title={`Decision makers (${decisionMakers.length})`}
      action={
        emailPattern.pattern && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Email format:{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {emailPattern.pattern}
            </code>{" "}
            <ConfidencePill level={emailPattern.confidence} />
          </span>
        )
      }
    >
      {decisionMakers.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No current leaders could be confirmed.
        </p>
      ) : (
        <>
          {/* Phones: one stacked card per person. */}
          <ul className="space-y-3 md:hidden print:hidden">
            {decisionMakers.map((person) => (
              <li
                key={`${person.name}-${person.title}`}
                className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <PersonIdentity person={person} />
                <PersonEmail person={person} pattern={emailPattern.pattern} />
                <PersonLinks person={person} />
              </li>
            ))}
          </ul>

          {/* Tablet and up (and print): a table. */}
          <div className="-mx-5 hidden md:block print:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">
                    Profiles &amp; source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {decisionMakers.map((person) => (
                  <tr
                    key={`${person.name}-${person.title}`}
                    className="align-top"
                  >
                    <td className="px-5 py-3">
                      <PersonIdentity person={person} />
                    </td>
                    <td className="px-3 py-3">
                      <PersonEmail
                        person={person}
                        pattern={emailPattern.pattern}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <PersonLinks person={person} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {emailPattern.basis && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Email format evidence: {emailPattern.basis}
        </p>
      )}
    </Card>
  );
}

function PersonIdentity({ person }: { person: DecisionMaker }) {
  return (
    <div className="text-sm">
      <p className="font-medium">{person.name}</p>
      <p className="text-slate-600 dark:text-slate-400">{person.title}</p>
      {person.department && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {person.department}
        </p>
      )}
      {person.notes && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          {person.notes}
        </p>
      )}
    </div>
  );
}

function PersonEmail({
  person,
  pattern,
}: {
  person: DecisionMaker;
  pattern: string | null;
}) {
  const suggested = person.email
    ? null
    : applyEmailPattern(pattern, person.name);

  if (person.email) {
    return (
      <div className="space-y-1 text-sm">
        <a
          href={`mailto:${person.email}`}
          className="block wrap-anywhere text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {person.email}
        </a>
        <Badge tone="emerald">Published</Badge>
      </div>
    );
  }
  if (suggested) {
    return (
      <div className="space-y-1 text-sm">
        <span className="block wrap-anywhere text-slate-700 dark:text-slate-300">
          {suggested}
        </span>
        <Badge tone="amber">Suggested · unverified</Badge>
      </div>
    );
  }
  return (
    <span className="text-sm text-slate-400 dark:text-slate-500">
      No email found
    </span>
  );
}

function PersonLinks({ person }: { person: DecisionMaker }) {
  return (
    <div className="space-y-1 text-sm">
      {person.linkedinUrl && (
        <div>
          <ExternalLink href={ensureProtocol(person.linkedinUrl)}>
            LinkedIn
          </ExternalLink>
        </div>
      )}
      <Sources urls={[person.sourceUrl]} visible={1} />
    </div>
  );
}

function CompanyContact({ report }: { report: CompanyReport }) {
  const contact = report.companyContact;
  const rows: [string, React.ReactNode][] = [
    [
      "Phone",
      contact.phone && (
        <a
          href={`tel:${contact.phone}`}
          className="text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {contact.phone}
        </a>
      ),
    ],
    [
      "Email",
      contact.email && (
        <a
          href={`mailto:${contact.email}`}
          className="text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {contact.email}
        </a>
      ),
    ],
    [
      "Contact page",
      contact.contactPageUrl && <ExternalLink href={contact.contactPageUrl} />,
    ],
    [
      "LinkedIn",
      contact.linkedinUrl && <ExternalLink href={contact.linkedinUrl} />,
    ],
    ["X / Twitter", contact.xUrl && <ExternalLink href={contact.xUrl} />],
    ["Address", report.headquarters.address],
  ];
  return (
    <Card title="Company contact">
      {/* Label above value on phones, side by side from sm up. */}
      <dl className="space-y-3 text-sm sm:space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col sm:flex-row sm:gap-3">
            <dt className="text-xs text-slate-500 sm:w-28 sm:shrink-0 sm:text-sm dark:text-slate-400">
              {label}
            </dt>
            <dd className="min-w-0 wrap-anywhere">
              {value ?? (
                <span className="text-slate-400 dark:text-slate-500">—</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <Sources urls={contact.sourceUrls} />
      </div>
    </Card>
  );
}

function LocationMap({ report }: { report: CompanyReport }) {
  const hq = report.headquarters;
  const place = [hq.city, hq.region, hq.country].filter(Boolean).join(", ");
  // A street address pins the exact building; otherwise search for the company in its city.
  const query =
    hq.address ?? (place ? `${report.company.name}, ${place}` : null);

  if (!query) {
    return (
      <Card title="Location">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No location found to show on a map.
        </p>
      </Card>
    );
  }

  const q = encodeURIComponent(query);
  const embedKey = env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  // The official Maps Embed API needs a (free) key; without one, fall back to the classic embed URL.
  const embedUrl = embedKey
    ? `https://www.google.com/maps/embed/v1/place?key=${embedKey}&q=${q}`
    : `https://maps.google.com/maps?q=${q}&z=14&output=embed`;

  return (
    <Card
      title="Location"
      action={
        <ExternalLink
          href={`https://www.google.com/maps/search/?api=1&query=${q}`}
          className="text-xs print:hidden"
        >
          Open in Google Maps
        </ExternalLink>
      }
    >
      <iframe
        title={`Map of ${query}`}
        src={embedUrl}
        className="h-56 w-full rounded-lg border border-slate-200 sm:h-72 dark:border-slate-800"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{query}</p>
    </Card>
  );
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function slug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "company"
  );
}

function downloadJson(report: CompanyReport) {
  download(
    `${slug(report.company.name)}-report.json`,
    JSON.stringify(report, null, 2),
    "application/json",
  );
}

function downloadCsv(report: CompanyReport) {
  const header = [
    "Name",
    "Title",
    "Department",
    "Email",
    "Email status",
    "Phone",
    "LinkedIn",
    "Source",
  ];
  const rows = report.decisionMakers.map((person) => {
    const suggested = person.email
      ? null
      : applyEmailPattern(report.emailPattern.pattern, person.name);
    return [
      person.name,
      person.title,
      person.department ?? "",
      person.email ?? suggested ?? "",
      person.email ? "published" : suggested ? "suggested (unverified)" : "",
      person.phone ?? "",
      person.linkedinUrl ?? "",
      person.sourceUrl,
    ];
  });
  const csv = [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  download(`${slug(report.company.name)}-contacts.csv`, csv, "text/csv");
}

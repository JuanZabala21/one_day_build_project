import { prettyUrl } from "~/lib/format";
import { type Confidence } from "~/lib/report-schema";

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-current ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900 print:break-inside-avoid print:shadow-none ${className}`}
    >
      {(title ?? action) && (
        // Wraps so the action drops under the title on narrow screens instead of squeezing it.
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {title && (
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "indigo" | "amber" | "emerald" | "red";
}) {
  const tones = {
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    indigo:
      "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300",
    amber:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300",
    emerald:
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
    red: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const confidenceStyles: Record<Confidence, { dot: string; label: string }> = {
  high: { dot: "bg-emerald-500", label: "High confidence" },
  medium: { dot: "bg-amber-400", label: "Medium confidence" },
  low: { dot: "bg-red-400", label: "Low confidence" },
};

export function ConfidencePill({ level }: { level: Confidence }) {
  const style = confidenceStyles[level];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <span className={`size-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export function ExternalLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`wrap-anywhere text-indigo-600 hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300 ${className}`}
    >
      {children ?? prettyUrl(href)}
    </a>
  );
}

/** Compact list of source links: the first few inline, the rest behind a toggle. */
export function Sources({
  urls,
  visible = 2,
}: {
  urls: string[];
  visible?: number;
}) {
  const unique = [...new Set(urls)].filter((url) => /^https?:\/\//.test(url));
  if (unique.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500">
        No sources cited
      </p>
    );
  }
  const shown = unique.slice(0, visible);
  const hidden = unique.slice(visible);
  return (
    <div className="text-xs text-slate-500 dark:text-slate-400">
      <span className="mr-1">Sources:</span>
      {shown.map((url, i) => (
        <span key={url}>
          {i > 0 && ", "}
          <ExternalLink href={url} />
        </span>
      ))}
      {hidden.length > 0 && (
        <details className="inline">
          <summary className="ml-1 inline cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            +{hidden.length} more
          </summary>
          <ul className="mt-1 space-y-0.5">
            {hidden.map((url) => (
              <li key={url}>
                <ExternalLink href={url} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
      {children}
    </div>
  );
}

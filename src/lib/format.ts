/** "https://www.Acme.com/about" -> "acme.com". Returns null for anything that isn't a URL. */
export function normalizeDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Short, human-readable form of a URL for link text: "acme.com/about/leadership". */
export function prettyUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const path = pathname === "/" ? "" : pathname.replace(/\/$/, "");
    const short = hostname.replace(/^www\./, "") + path;
    return short.length > 48 ? `${short.slice(0, 47)}…` : short;
  } catch {
    return url;
  }
}

export function ensureProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const NAME_NOISE = /\b(dr|mr|mrs|ms|prof|jr|sr|ii|iii|iv|phd|md|mba|cpa)\b\.?/gi;

/**
 * Fills an email pattern like "{first}.{last}@acme.com" for a person.
 * Returns null when the name or pattern can't produce a sensible address.
 */
export function applyEmailPattern(
  pattern: string | null,
  fullName: string,
): string | null {
  if (!pattern?.includes("@")) return null;
  const parts = fullName
    .replace(/\(.*?\)/g, " ")
    .replace(NAME_NOISE, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[\s,]+/)
    .map((part) => part.replace(/[^a-z-]/g, ""))
    .filter(Boolean);
  if (parts.length < 2) return null;

  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  const email = pattern
    .toLowerCase()
    .replaceAll("{first}", first)
    .replaceAll("{last}", last)
    .replaceAll("{f}", first[0]!)
    .replaceAll("{l}", last[0]!);
  return /^[^\s{}@]+@[^\s{}@]+\.[a-z]{2,}$/.test(email) ? email : null;
}

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return String(tokens);
}

export function timeAgo(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return date.toLocaleDateString();
}

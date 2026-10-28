/** The Scoutline mark. Same artwork as src/app/icon.svg (the favicon); keep the two in sync. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="scoutline-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#scoutline-tile)" />
      <circle
        cx="28"
        cy="28"
        r="14"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
      />
      <path
        d="M38.5 38.5 49 49"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M20.5 32.5 25.5 27.5 29 31 35 24"
        fill="none"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

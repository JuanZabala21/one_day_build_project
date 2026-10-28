import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";

import { LogoMark } from "~/app/_components/logo";
import { ThemeToggle, themeInitScript } from "~/app/_components/theme-toggle";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Scoutline · AI company research",
  description:
    "Research any company in minutes: location, age, headcount and decision makers, with sources.",
  // Icons come from the file conventions in src/app: favicon.ico, icon.svg and apple-icon.png.
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The theme script adds the `dark` class before React hydrates, so the class attribute differs.
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <TRPCReactProvider>
          <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 print:hidden">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <LogoMark />
                Scoutline
              </Link>
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">
                  AI company research
                </span>
                <ThemeToggle />
              </div>
            </div>
          </header>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}

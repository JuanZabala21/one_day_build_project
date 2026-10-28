import { z } from "zod/v4";

/**
 * Shared schemas for the research pipeline. These are used in three places:
 *  1. converted to JSON Schema and handed to Claude as the `submit_*` tool input schemas,
 *  2. to validate what Claude submits before it is stored,
 *  3. as the TypeScript types the UI renders.
 *
 * Field descriptions are part of the prompt: Claude reads them, so they spell out the rules
 * (cite sources, use null instead of guessing, never fabricate contact details).
 */

const confidence = z
  .enum(["high", "medium", "low"])
  .describe(
    "high = confirmed by a primary or multiple agreeing sources; medium = one reputable secondary source; low = conflicting or indirect evidence",
  );

const sourceUrls = z
  .array(z.string())
  .describe("URLs of the pages you actually read that support this section");

export const CompanyCandidateSchema = z.object({
  name: z.string().describe("Company name as it appears publicly"),
  website: z
    .string()
    .nullable()
    .describe("Official website URL, e.g. https://www.acme.com"),
  headquarters: z
    .string()
    .nullable()
    .describe("City, region and country of the headquarters"),
  industry: z.string().nullable(),
  description: z
    .string()
    .describe("One sentence that distinguishes this company from others with a similar name"),
});

export const CandidateListSchema = z.object({
  candidates: z
    .array(CompanyCandidateSchema)
    .describe("Distinct real companies matching the query, best match first (max 5)"),
});

const decisionMaker = z.object({
  name: z.string(),
  title: z.string().describe("Current job title"),
  department: z
    .string()
    .nullable()
    .describe("e.g. Executive, Sales, Marketing, Engineering, Finance, Operations, Board"),
  linkedinUrl: z
    .string()
    .nullable()
    .describe("LinkedIn profile URL, only if you found the exact profile"),
  email: z
    .string()
    .nullable()
    .describe(
      "Only an email address published verbatim on a public page (cite it in sourceUrl). Never construct or guess one.",
    ),
  phone: z
    .string()
    .nullable()
    .describe("Only a phone number published verbatim on a public page. Never guess."),
  sourceUrl: z
    .string()
    .describe("Page that confirms this person currently holds this role"),
  notes: z
    .string()
    .nullable()
    .describe("e.g. 'Appointed March 2026' or 'Role may be outdated: last confirmed 2024'"),
});

export const CompanyReportSchema = z.object({
  company: z.object({
    name: z.string(),
    legalName: z.string().nullable(),
    website: z.string().nullable(),
    description: z.string().describe("2-3 sentences: what the company does and for whom"),
    industry: z.string().nullable(),
    ownership: z.enum([
      "public",
      "private",
      "subsidiary",
      "nonprofit",
      "government",
      "unknown",
    ]),
    stockTicker: z.string().nullable().describe("e.g. NASDAQ: AAPL"),
    parentCompany: z.string().nullable(),
  }),
  headquarters: z.object({
    address: z.string().nullable().describe("Full street address if published"),
    city: z.string().nullable(),
    region: z.string().nullable().describe("State / province"),
    country: z.string().nullable(),
    otherLocations: z
      .array(z.string())
      .describe("Other notable offices or facilities (max 8)"),
    confidence,
    sourceUrls,
  }),
  founding: z.object({
    year: z
      .number()
      .int()
      .nullable()
      .describe("Year the company was founded; null if not found"),
    founders: z.array(z.string()),
    notes: z
      .string()
      .nullable()
      .describe("e.g. predecessor companies, re-incorporation, conflicting dates"),
    confidence,
    sourceUrls,
  }),
  employees: z.object({
    count: z
      .number()
      .int()
      .nullable()
      .describe("Best single estimate of current headcount"),
    range: z.string().nullable().describe("e.g. '1,001-5,000'"),
    asOf: z
      .string()
      .nullable()
      .describe("When the figure was reported, e.g. '2025 annual report' or 'Oct 2026'"),
    notes: z
      .string()
      .nullable()
      .describe("Explain disagreements between sources, if any"),
    confidence,
    sourceUrls,
  }),
  decisionMakers: z
    .array(decisionMaker)
    .describe(
      "Current leaders who make purchasing / strategic decisions: CEO, founders, C-suite, VPs and heads of key functions (max 12)",
    ),
  companyContact: z.object({
    phone: z.string().nullable().describe("Main published phone number"),
    email: z
      .string()
      .nullable()
      .describe("General published email, e.g. info@ / press@ / sales@"),
    contactPageUrl: z.string().nullable(),
    linkedinUrl: z.string().nullable(),
    xUrl: z.string().nullable().describe("X / Twitter profile URL"),
    sourceUrls,
  }),
  emailPattern: z.object({
    pattern: z
      .string()
      .nullable()
      .describe(
        "Company email format using placeholders {first} {last} {f} {l}, e.g. '{first}.{last}@acme.com'. Only fill this if you saw evidence (published addresses that follow it, or an email-format directory).",
      ),
    basis: z
      .string()
      .nullable()
      .describe("The evidence for the pattern, e.g. 'press contact jane.doe@acme.com on newsroom page'"),
    confidence,
  }),
  financials: z.object({
    revenue: z.string().nullable().describe("Latest reported or estimated annual revenue, with year"),
    funding: z.string().nullable().describe("Total funding raised / last round, for private companies"),
    notes: z.string().nullable(),
    sourceUrls,
  }),
  recentNews: z
    .array(
      z.object({
        title: z.string(),
        date: z.string().nullable(),
        url: z.string(),
      }),
    )
    .describe("Up to 5 notable news items from the last 12 months"),
  summary: z
    .string()
    .describe("A short analyst summary (3-5 sentences) a salesperson would read before outreach"),
  caveats: z
    .array(z.string())
    .describe("Anything the reader should double-check: gaps, conflicting data, stale sources"),
});

export type CompanyCandidate = z.infer<typeof CompanyCandidateSchema>;
export type CompanyReport = z.infer<typeof CompanyReportSchema>;
export type DecisionMaker = CompanyReport["decisionMakers"][number];
export type Confidence = z.infer<typeof confidence>;

/** A step shown in the live research log. */
export type ProgressEvent = {
  at: number;
  kind: "status" | "search" | "fetch" | "analyze" | "write" | "error";
  label: string;
};

export type ResearchStats = {
  model: string;
  durationMs: number;
  apiCalls: number;
  webSearches: number;
  webFetches: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCostUsd: number;
};

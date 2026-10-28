import { relations, sql } from "drizzle-orm";
import {
  customType,
  index,
  primaryKey,
  sqliteTableCreator,
} from "drizzle-orm/sqlite-core";
import { type AdapterAccount } from "next-auth/adapters";

import {
  type CompanyCandidate,
  type CompanyReport,
  type ProgressEvent,
  type ResearchStats,
} from "~/lib/report-schema";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator(
  (name) => `company_research_${name}`,
);

/**
 * SQLite has no DATE type. Store dates as ISO-8601 UTC text ("2026-10-27T21:05:00.000Z"), which is
 * readable in the database, sorts and compares correctly as text, and works with SQLite's date
 * functions. In TypeScript the column is a `Date`.
 */
const isoDate = customType<{ data: Date; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => value.toISOString(),
  fromDriver: (value) => new Date(value),
});

export const reports = createTable(
  "report",
  (d) => ({
    id: d
      .text({ length: 36 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** What the user typed in the search box. */
    query: d.text({ length: 256 }).notNull(),
    companyName: d.text({ length: 256 }).notNull(),
    /** Normalized hostname (e.g. "acme.com"), used to reuse recent reports. */
    domain: d.text({ length: 256 }),
    /** The disambiguated company the user picked; the input to the research run. */
    candidate: d.text({ mode: "json" }).$type<CompanyCandidate>().notNull(),
    status: d
      .text({ enum: ["researching", "complete", "failed"] })
      .notNull()
      .default("researching"),
    progress: d
      .text({ mode: "json" })
      .$type<ProgressEvent[]>()
      .notNull()
      .$defaultFn(() => []),
    result: d.text({ mode: "json" }).$type<CompanyReport>(),
    stats: d.text({ mode: "json" }).$type<ResearchStats>(),
    error: d.text(),
    createdAt: isoDate()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .notNull(),
    updatedAt: isoDate().$onUpdate(() => new Date()),
    completedAt: isoDate(),
  }),
  (t) => [
    index("report_created_at_idx").on(t.createdAt),
    index("report_domain_idx").on(t.domain),
  ],
);

export const users = createTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull(),
  emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  image: d.text({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.text({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.text({ length: 255 }).notNull(),
    providerAccountId: d.text({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.text({ length: 255 }),
    scope: d.text({ length: 255 }),
    id_token: d.text(),
    session_state: d.text({ length: 255 }),
  }),
  (t) => [
    primaryKey({
      columns: [t.provider, t.providerAccountId],
    }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.text({ length: 255 }).notNull().primaryKey(),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.text({ length: 255 }).notNull(),
    token: d.text({ length: 255 }).notNull(),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

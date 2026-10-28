import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { CandidateListSchema, CompanyReportSchema, type CompanyReport } from "./report-schema";

const sampleReport: CompanyReport = {
  company: {
    name: "Acme Robotics",
    legalName: "Acme Robotics, Inc.",
    website: "https://acme.example",
    description: "Builds warehouse robots.",
    industry: "Robotics",
    ownership: "private",
    stockTicker: null,
    parentCompany: null,
  },
  headquarters: {
    address: null,
    city: "Austin",
    region: "TX",
    country: "United States",
    otherLocations: [],
    confidence: "high",
    sourceUrls: ["https://acme.example/about"],
  },
  founding: {
    year: 2015,
    founders: ["Jane Doe"],
    notes: null,
    confidence: "medium",
    sourceUrls: [],
  },
  employees: {
    count: 250,
    range: "201-500",
    asOf: "2026",
    notes: null,
    confidence: "medium",
    sourceUrls: [],
  },
  decisionMakers: [
    {
      name: "Jane Doe",
      title: "CEO",
      department: "Executive",
      linkedinUrl: null,
      email: null,
      phone: null,
      sourceUrl: "https://acme.example/team",
      notes: null,
    },
  ],
  companyContact: {
    phone: null,
    email: "info@acme.example",
    contactPageUrl: null,
    linkedinUrl: null,
    xUrl: null,
    sourceUrls: [],
  },
  emailPattern: { pattern: "{first}.{last}@acme.example", basis: null, confidence: "low" },
  financials: { revenue: null, funding: "$40M Series B", notes: null, sourceUrls: [] },
  recentNews: [],
  summary: "A growing robotics company.",
  caveats: [],
};

describe("CompanyReportSchema", () => {
  it("accepts a well-formed report", () => {
    expect(CompanyReportSchema.safeParse(sampleReport).success).toBe(true);
  });

  it("rejects missing required sections and bad enum values", () => {
    const withoutPeople: Partial<CompanyReport> = { ...sampleReport };
    delete withoutPeople.decisionMakers;
    expect(CompanyReportSchema.safeParse(withoutPeople).success).toBe(false);
    expect(
      CompanyReportSchema.safeParse({
        ...sampleReport,
        headquarters: { ...sampleReport.headquarters, confidence: "certain" },
      }).success,
    ).toBe(false);
  });

  it("converts to an object JSON Schema usable as a tool input_schema", () => {
    const jsonSchema = z.toJSONSchema(CompanyReportSchema) as {
      type: string;
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(jsonSchema.type).toBe("object");
    expect(jsonSchema.required).toContain("decisionMakers");
    // Field descriptions are part of the prompt, so make sure they survive conversion.
    expect(JSON.stringify(jsonSchema)).toContain("Never construct or guess one");
    expect(z.toJSONSchema(CandidateListSchema)).toMatchObject({ type: "object" });
  });
});

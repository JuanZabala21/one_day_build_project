import { describe, expect, it } from "vitest";

import { applyEmailPattern, normalizeDomain, prettyUrl } from "./format";

describe("applyEmailPattern", () => {
  it("fills first/last placeholders", () => {
    expect(applyEmailPattern("{first}.{last}@acme.com", "Jane Doe")).toBe(
      "jane.doe@acme.com",
    );
  });

  it("supports initials", () => {
    expect(applyEmailPattern("{f}{last}@acme.com", "Jane Doe")).toBe("jdoe@acme.com");
    expect(applyEmailPattern("{first}{l}@acme.com", "Jane Doe")).toBe("janed@acme.com");
  });

  it("strips titles, suffixes and accents", () => {
    expect(
      applyEmailPattern("{first}.{last}@acme.com", "Dr. José María García-López Jr."),
    ).toBe("jose.garcia-lopez@acme.com");
  });

  it("uses first and last name when there is a middle name", () => {
    expect(applyEmailPattern("{first}.{last}@acme.com", "Mary Ann Smith")).toBe(
      "mary.smith@acme.com",
    );
  });

  it("returns null when it cannot build a sensible address", () => {
    expect(applyEmailPattern(null, "Jane Doe")).toBeNull();
    expect(applyEmailPattern("{first}.{last}", "Jane Doe")).toBeNull();
    expect(applyEmailPattern("{first}@acme.com", "Cher")).toBeNull();
    expect(applyEmailPattern("{firstname}@acme.com", "Jane Doe")).toBeNull();
  });
});

describe("normalizeDomain", () => {
  it("reduces URLs to a bare lowercase hostname", () => {
    expect(normalizeDomain("https://www.Stripe.com/about")).toBe("stripe.com");
    expect(normalizeDomain("stripe.com")).toBe("stripe.com");
    expect(normalizeDomain("http://shop.example.co.uk/")).toBe("shop.example.co.uk");
  });

  it("returns null for missing or invalid input", () => {
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("not a url")).toBeNull();
  });
});

describe("prettyUrl", () => {
  it("drops protocol, www and trailing slash", () => {
    expect(prettyUrl("https://www.example.com/about/leadership/")).toBe(
      "example.com/about/leadership",
    );
    expect(prettyUrl("https://example.com/")).toBe("example.com");
  });
});

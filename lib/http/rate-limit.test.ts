import { describe, expect, it } from "vitest";

import { rateLimitAllow } from "./rate-limit";

describe("rateLimitAllow", () => {
  it("allows requests under the limit", () => {
    expect(rateLimitAllow(["unit", "a"], 3, 60_000)).toBe(true);
    expect(rateLimitAllow(["unit", "a"], 3, 60_000)).toBe(true);
    expect(rateLimitAllow(["unit", "a"], 3, 60_000)).toBe(true);
  });

  it("blocks after the limit", () => {
    expect(rateLimitAllow(["unit", "b"], 2, 60_000)).toBe(true);
    expect(rateLimitAllow(["unit", "b"], 2, 60_000)).toBe(true);
    expect(rateLimitAllow(["unit", "b"], 2, 60_000)).toBe(false);
  });
});

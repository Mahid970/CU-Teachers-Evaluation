import { describe, expect, it } from "vitest";
import { MIN_RATINGS_TO_SHOW, bayesianScore, isPublishable, isValidScore } from "./rating";

describe("bayesianScore", () => {
  it("keeps a tiny perfect sample below a large strong one", () => {
    const tiny = bayesianScore(3, 5.0, 4.0);
    const large = bayesianScore(80, 4.8, 4.0);
    expect(tiny).toBeLessThan(large);
  });

  it("moves towards the raw average as ratings accumulate", () => {
    expect(bayesianScore(5, 5, 3.5)).toBeCloseTo(4.25, 2);
    expect(bayesianScore(200, 5, 3.5)).toBeGreaterThan(4.9);
  });

  it("falls back to the prior with no ratings", () => {
    expect(bayesianScore(0, 0, 3.8)).toBe(3.8);
  });
});

describe("thresholds and validation", () => {
  it("hides teachers below the publication threshold", () => {
    expect(isPublishable(MIN_RATINGS_TO_SHOW - 1)).toBe(false);
    expect(isPublishable(MIN_RATINGS_TO_SHOW)).toBe(true);
  });

  it("accepts only whole stars from 1 to 5", () => {
    expect(isValidScore(1)).toBe(true);
    expect(isValidScore(5)).toBe(true);
    expect(isValidScore(0)).toBe(false);
    expect(isValidScore(6)).toBe(false);
    expect(isValidScore(4.5)).toBe(false);
    expect(isValidScore("5")).toBe(false);
  });
});

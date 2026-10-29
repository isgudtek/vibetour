import { describe, it, expect } from "vitest";
import { mockCompare, mockDatePlan } from "../mock";

describe("mockCompare", () => {
  it("scores shared favorites", () => {
    const r = mockCompare(["a", "b"], ["b", "c"]);
    expect(r.results.map((x) => x.name)).toContain("b");
    expect(r.score).toBeGreaterThan(0.5);
  });
});

describe("mockDatePlan", () => {
  it("returns picks", () => {
    const picks = mockDatePlan(["jazz"], "NYC", []);
    expect(picks.length).toBe(5);
    expect(picks[0].category).toBe("restaurant");
  });
});

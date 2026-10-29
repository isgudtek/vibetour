import { describe, it, expect } from "vitest";
import { POST } from "../route";

describe("api/more", () => {
  it("returns standard mock selection without enrichmentText", async () => {
    const req = new Request("http://localhost/api/more", {
      method: "POST",
      body: JSON.stringify({
        city: "Tokyo",
        category: "Bar",
        tags: ["jazz", "design"],
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.places).toHaveLength(1);
    expect(data.places[0].name).toBe("Tokyo Bar Selection");
    expect(data.places[0].rationale).toContain("specifically to the guest's jazz & design affinity.");
  });

  it("incorporates enrichmentText dynamically into mock results", async () => {
    const req = new Request("http://localhost/api/more", {
      method: "POST",
      body: JSON.stringify({
        city: "Tokyo",
        category: "Bar",
        tags: ["jazz", "design"],
        enrichmentText: "rooftop speakeasy",
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.places).toHaveLength(1);
    expect(data.places[0].name).toBe("Tokyo Curated rooftop speakeasy Bar");
    expect(data.places[0].rationale).toContain('refined preference of "rooftop speakeasy"');
  });
});

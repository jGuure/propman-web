import { describe, expect, it } from "vitest";
import { suggestSlug } from "./forms";

describe("suggestSlug", () => {
  it("turns a company name into a subdomain", () => {
    expect(suggestSlug("Hodan Estates")).toBe("hodan-estates");
    expect(suggestSlug("  Café & Co. Rentals!  ")).toBe("cafe-co-rentals");
    expect(suggestSlug("Al-Noor   Properties 2")).toBe("al-noor-properties-2");
  });

  it("stays within 30 characters without a trailing hyphen", () => {
    const slug = suggestSlug("The Very Long Name Of A Property Company In Mogadishu");
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug.endsWith("-")).toBe(false);
  });
});

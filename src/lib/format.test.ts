import { describe, expect, it } from "vitest";
import { formatMoney, formatPercent } from "./format";
import { floorLabel } from "./labels";

describe("formatting", () => {
  it("formats money per currency, without cents for whole amounts", () => {
    expect(formatMoney(350, "USD")).toBe("$350");
    expect(formatMoney(15400, "USD")).toBe("$15,400");
    expect(formatMoney(99.5, "USD")).toBe("$99.50");
    expect(formatMoney(null, "USD")).toBe("—");
    expect(formatMoney(100000, "SOS")).toContain("100,000");
  });

  it("formats occupancy rates as whole percentages", () => {
    expect(formatPercent(0.1818)).toBe("18%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("names floors", () => {
    expect(floorLabel(0)).toBe("Ground");
    expect(floorLabel(3)).toBe("Floor 3");
    expect(floorLabel(-1)).toBe("Basement 1");
  });
});

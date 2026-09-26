import { describe, expect, it } from "vitest";
import { floorText } from "./labels";
import { formatMoney, formatPercent } from "./format";
import type { Vars } from "@/i18n/core";
import { translate } from "@/i18n/text";

describe("formatting", () => {
  it("formats money in US dollars, without cents for whole amounts", () => {
    expect(formatMoney(350)).toBe("$350");
    expect(formatMoney(15400)).toBe("$15,400");
    expect(formatMoney(99.5)).toBe("$99.50");
    expect(formatMoney(null)).toBe("—");
  });

  it("formats occupancy rates as whole percentages", () => {
    expect(formatPercent(0.1818)).toBe("18%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("names floors in both languages", () => {
    const en = (key: string, vars?: Vars) => translate("en", key, vars);
    const so = (key: string, vars?: Vars) => translate("so", key, vars);
    expect(floorText(en, 0)).toBe("Ground");
    expect(floorText(en, 3)).toBe("Floor 3");
    expect(floorText(en, -1)).toBe("Basement 1");
    expect(floorText(so, 0)).not.toBe("Ground");
  });
});

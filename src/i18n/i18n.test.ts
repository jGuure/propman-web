import { describe, expect, it } from "vitest";
import { interpolate } from "./core";
import { en } from "./en";
import { so } from "./so";
import { translate } from "./text";

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") {
    return { [prefix]: value };
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }), {});
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  const english = flatten(en);
  const somali = flatten(so);

  it("Somali has exactly the English keys", () => {
    expect(Object.keys(somali).sort()).toEqual(Object.keys(english).sort());
  });

  it("every Somali text is filled in and uses the same {placeholders}", () => {
    for (const [key, text] of Object.entries(english)) {
      expect(somali[key].trim(), key).not.toBe("");
      expect(placeholders(somali[key]), key).toEqual(placeholders(text));
    }
  });

  it("calls vacant apartments available", () => {
    expect(translate("en", "unitStatus.VACANT")).toBe("Available");
  });
});

describe("interpolate", () => {
  it("replaces known placeholders and keeps unknown ones", () => {
    expect(interpolate("Apartment {number} on {floor}", { number: "101" })).toBe("Apartment 101 on {floor}");
    expect(interpolate("{count} days", { count: 0 })).toBe("0 days");
  });
});

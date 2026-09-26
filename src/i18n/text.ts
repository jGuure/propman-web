import { interpolate, lookup, type Lang, type Vars } from "./core";
import { en } from "./en";
import { so } from "./so";

const DICTIONARIES: Record<Lang, unknown> = { en, so };

/** Text lookup for code outside React components (formatters, error messages). */
export function translate(lang: Lang, key: string, vars?: Vars): string {
  const value = lookup(DICTIONARIES[lang], key) ?? lookup(en, key);
  return typeof value === "string" ? interpolate(value, vars) : key;
}

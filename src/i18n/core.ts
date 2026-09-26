/** Supported interface languages. */
export type Lang = "en" | "so";

export const LANGS: { value: Lang; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "so", label: "Soomaali", short: "SO" },
];

export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "propman_lang";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "so";
}

/** A plural message: {count} is replaced by the number. */
export interface Plural {
  one: string;
  other: string;
}

/** Same shape as the English dictionary, every leaf a string (or plural). */
export type Messages<T> = {
  [K in keyof T]: T[K] extends Plural ? Plural : T[K] extends string ? string : Messages<T[K]>;
};

type Join<P extends string, K extends string> = P extends "" ? K : `${P}.${K}`;

/** Dotted keys of string leaves, e.g. "common.save". */
export type StringKey<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends Plural ? never : T[K] extends string ? Join<P, K> : StringKey<T[K], Join<P, K>>;
}[keyof T & string];

/** Dotted keys of plural leaves, e.g. "units.count". */
export type PluralKey<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends Plural ? Join<P, K> : T[K] extends string ? never : PluralKey<T[K], Join<P, K>>;
}[keyof T & string];

export type Vars = Record<string, string | number | null | undefined>;

export function interpolate(text: string, vars?: Vars): string {
  if (!vars) {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}

export function lookup(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) =>
    node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined, dict);
}

let currentLang: Lang = DEFAULT_LANG;

/** The active language for code outside React (formatters, error messages). Set by the I18nProvider. */
export function getCurrentLang(): Lang {
  return currentLang;
}

export function setCurrentLang(lang: Lang): void {
  currentLang = lang;
}

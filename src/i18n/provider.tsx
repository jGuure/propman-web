"use client";

import { GlobalOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { config } from "@/lib/config";
import { applyDateLocale } from "@/lib/format";
import { interpolate, LANG_COOKIE, LANGS, lookup, setCurrentLang, type Lang, type Plural, type PluralKey, type StringKey, type Vars } from "./core";
import { en, type Dictionary } from "./en";
import { so } from "./so";
import { translate } from "./text";

const DICTIONARIES: Record<Lang, unknown> = { en, so };

export type TKey = StringKey<Dictionary>;
export type TPluralKey = PluralKey<Dictionary>;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Text for a key in the current language (falls back to English). */
  t: (key: TKey, vars?: Vars) => string;
  /** Plural text: picks `one` or `other` by {count}. */
  tn: (key: TPluralKey, count: number, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function translatePlural(lang: Lang, key: string, count: number, vars?: Vars): string {
  const value = (lookup(DICTIONARIES[lang], key) ?? lookup(en, key)) as Plural | undefined;
  if (!value || typeof value !== "object") {
    return key;
  }
  return interpolate(count === 1 ? value.one : value.other, { ...vars, count });
}

/** Remembers the language in a cookie (shared across tenant subdomains in production). */
function persist(lang: Lang) {
  const domain = config.baseDomain && config.baseDomain !== "localhost" ? `; domain=.${config.baseDomain}` : "";
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax${domain}`;
}

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  setCurrentLang(lang);
  applyDateLocale(lang);

  const setLang = useCallback((next: Lang) => {
    persist(next);
    setCurrentLang(next);
    applyDateLocale(next);
    document.documentElement.lang = next;
    setLangState(next);
  }, []);

  const value = useMemo<I18nValue>(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    tn: (key, count, vars) => translatePlural(lang, key, count, vars),
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useT must be used inside <I18nProvider>");
  }
  return value;
}

/** EN / SO switcher. */
export function LanguageSwitcher({ light = false }: { light?: boolean }) {
  const { lang, setLang, t } = useT();
  const current = LANGS.find((l) => l.value === lang) ?? LANGS[0];
  return (
    <Dropdown trigger={["click"]} menu={{
      selectedKeys: [lang],
      items: LANGS.map((l) => ({ key: l.value, label: l.label, onClick: () => setLang(l.value) })),
    }}>
      <Button type="text" icon={<GlobalOutlined />} aria-label={t("common.language")}
        style={light ? { color: "#fff" } : undefined}>
        {current.short}
      </Button>
    </Dropdown>
  );
}

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getCurrentLang, type Lang } from "@/i18n/core";
import { translate } from "@/i18n/text";

dayjs.extend(relativeTime);

/** dayjs has no Somali locale; this one covers month names and relative times. */
dayjs.locale({
  name: "so",
  weekStart: 6,
  months: ["Janaayo", "Febraayo", "Maarso", "Abriil", "May", "Juun", "Luulyo", "Ogosto", "Sebtembar", "Oktoobar",
    "Nofembar", "Desembar"],
  monthsShort: ["Jan", "Feb", "Mar", "Abr", "May", "Jun", "Luu", "Ogo", "Seb", "Okt", "Nof", "Des"],
  weekdays: ["Axad", "Isniin", "Talaado", "Arbaco", "Khamiis", "Jimco", "Sabti"],
  relativeTime: {
    future: "%s kadib", past: "%s ka hor", s: "dhowr ilbiriqsi", m: "daqiiqad", mm: "%d daqiiqo", h: "saacad",
    hh: "%d saacadood", d: "maalin", dd: "%d maalmood", M: "bil", MM: "%d bilood", y: "sannad", yy: "%d sano",
  },
  ordinal: (n: number) => `${n}`,
} as unknown as ILocale, undefined, true);
dayjs.locale("en");

export function applyDateLocale(lang: Lang): void {
  dayjs.locale(lang);
}

export function formatDate(value: string | null | undefined): string {
  return value ? dayjs(value).format("D MMM YYYY") : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? dayjs(value).format("D MMM YYYY, HH:mm") : "—";
}

export function fromNow(value: string | null | undefined): string {
  return value ? dayjs(value).fromNow() : translate(getCurrentLang(), "common.never");
}

/** "$1,200" / "SOS 100,000" — whole amounts without decimals, cents when present. */
/** The platform works in US dollars only (the Somali market prices rent in USD). */
export const CURRENCY = "USD";

/** "$350", "$15,400", "$99.50". */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return "—";
  }
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}


/** Countries and currencies offered in forms; the API accepts any ISO code. */
const COUNTRY_CODES = [
  "SO", "DJ", "ET", "KE", "UG", "TZ", "RW", "BI", "SD", "SS", "ER", "YE", "EG",
  "AE", "SA", "QA", "OM", "KW", "BH", "TR", "GB", "IE", "US", "CA", "SE", "NO", "DK", "FI", "NL", "DE", "BE", "FR",
  "IT", "CH", "AT", "AU", "NZ", "ZA", "NG", "GH", "IN", "PK", "MY", "CN",
];

const CURRENCY_CODES = ["USD", "SOS", "EUR", "GBP", "KES", "ETB", "DJF", "UGX", "TZS", "AED", "SAR", "QAR", "TRY"];

export function countryOptions(current?: string | null) {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const codes = current && !COUNTRY_CODES.includes(current) ? [current, ...COUNTRY_CODES] : COUNTRY_CODES;
  return codes
    .map((code) => ({ value: code, label: `${names.of(code) ?? code} (${code})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function currencyOptions(current?: string | null) {
  const names = new Intl.DisplayNames(["en"], { type: "currency" });
  const codes = current && !CURRENCY_CODES.includes(current) ? [current, ...CURRENCY_CODES] : CURRENCY_CODES;
  return codes.map((code) => ({ value: code, label: `${code} — ${names.of(code) ?? code}` }));
}

export function timezoneOptions() {
  return Intl.supportedValuesOf("timeZone").map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }));
}

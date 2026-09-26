/** Countries offered in forms (names in the UI language); the API accepts any ISO code. Amounts are always USD. */
const COUNTRY_CODES = [
  "SO", "DJ", "ET", "KE", "UG", "TZ", "RW", "BI", "SD", "SS", "ER", "YE", "EG",
  "AE", "SA", "QA", "OM", "KW", "BH", "TR", "GB", "IE", "US", "CA", "SE", "NO", "DK", "FI", "NL", "DE", "BE", "FR",
  "IT", "CH", "AT", "AU", "NZ", "ZA", "NG", "GH", "IN", "PK", "MY", "CN",
];


export function countryOptions(current?: string | null, lang = "en") {
  const names = new Intl.DisplayNames([lang, "en"], { type: "region" });
  const codes = current && !COUNTRY_CODES.includes(current) ? [current, ...COUNTRY_CODES] : COUNTRY_CODES;
  return codes
    .map((code) => ({ value: code, label: `${names.of(code) ?? code} (${code})` }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}

export function timezoneOptions() {
  return Intl.supportedValuesOf("timeZone").map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }));
}

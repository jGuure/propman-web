import dayjs, { type Dayjs } from "dayjs";

/** Calendar day as the API expects it ("2026-10-01"). */
export function isoDate(value: Dayjs | null | undefined): string | null {
  return value ? value.format("YYYY-MM-DD") : null;
}

export function fromIsoDate(value: string | null | undefined): Dayjs | null {
  return value ? dayjs(value) : null;
}

export const DATE_FORMAT = "D MMM YYYY";

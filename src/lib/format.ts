import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function formatDate(value: string | null | undefined): string {
  return value ? dayjs(value).format("D MMM YYYY") : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? dayjs(value).format("D MMM YYYY, HH:mm") : "—";
}

export function fromNow(value: string | null | undefined): string {
  return value ? dayjs(value).fromNow() : "Never";
}

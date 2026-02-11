import { format, formatDistanceToNowStrict } from "date-fns";

export function formatDate(value?: Date | null) {
  if (!value) {
    return "-";
  }
  return format(value, "MMM d, yyyy");
}

export function formatDateTime(value?: Date | null) {
  if (!value) {
    return "-";
  }
  return format(value, "MMM d, yyyy p");
}

export function fromNowDays(value?: Date | null) {
  if (!value) {
    return "-";
  }
  return formatDistanceToNowStrict(value, { unit: "day" });
}

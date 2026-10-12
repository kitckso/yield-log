import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const WEEKDAY_NAMES = "日一二三四五六";

/** Today, tomorrow and yesterday are named; anything else is dated. */
export function formatDate(dateStr: string): string {
  const date = dayjs(dateStr, "YYYY-MM-DD", true);
  const today = dayjs().startOf("day");
  if (date.isSame(today, "day")) return "今天";
  if (date.isSame(today.add(1, "day"), "day")) return "明天";
  if (date.isSame(today.subtract(1, "day"), "day")) return "昨天";
  return `${date.format("YYYY年MM月DD日")}(${WEEKDAY_NAMES[date.day()]})`;
}

/**
 * A span of days as years, months and days, e.g. 400 -> "1年1月10天". Months
 * are taken as 30 days, which is what the timeline wording has always used.
 */
export function formatRelativeDays(days: number): string {
  const abs = Math.abs(days);
  const years = Math.floor(abs / 365);
  const months = Math.floor((abs % 365) / 30);
  const remDays = abs % 30;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}年`);
  if (months > 0) parts.push(`${months}月`);
  if (remDays > 0 || parts.length === 0) parts.push(`${remDays}天`);
  return parts.join("");
}

import dayjs from "dayjs";
import { formatMoney } from "../lib/money";
import type { DayBucket } from "../lib/maturityCalendar";
import { WEEKDAYS } from "./heatmapTheme";

/** Tooltip text for a day bucket. */
export function cellTooltip(bucket: DayBucket): string {
  const date = dayjs(bucket.periodStart, "YYYY-MM-DD", true);
  return `${date.format("YYYY年M月D日")} (${WEEKDAYS[date.day()]})\n${formatMoney(bucket.amount)}  ·  ${bucket.count} 筆`;
}

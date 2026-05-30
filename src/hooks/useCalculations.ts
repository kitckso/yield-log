import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);

export function calculateInterest(
  amount: number,
  rate: number,
  startDate: string,
  endDate: string,
): number {
  const start = dayjs(startDate, "YYYY-MM-DD", true);
  const end = dayjs(endDate, "YYYY-MM-DD", true);
  const days = end.diff(start, "day");
  const interest = amount * (rate / 100) * (days / 365);
  const cents = Math.floor(interest * 100);
  return cents / 100;
}

export function calculateInterestRounded(
  amount: number,
  rate: number,
  startDate: string,
  endDate: string,
): number {
  const start = dayjs(startDate, "YYYY-MM-DD", true);
  const end = dayjs(endDate, "YYYY-MM-DD", true);
  const days = end.diff(start, "day");
  const interest = amount * (rate / 100) * (days / 365);
  return Math.round(interest * 100) / 100;
}

export function calculateEndDate(
  startDate: string,
  periodValue: number,
  periodUnit: string,
): string {
  const start = dayjs(startDate, "YYYY-MM-DD", true);
  let end = start;

  switch (periodUnit) {
    case "days":
      end = start.add(periodValue, "day");
      break;
    case "weeks":
      end = start.add(periodValue, "week");
      break;
    case "months":
      end = start.add(periodValue, "month");
      break;
    case "years":
      end = start.add(periodValue, "year");
      break;
  }

  return end.format("YYYY-MM-DD");
}

export function isMatured(endDate: string): boolean {
  return dayjs(endDate, "YYYY-MM-DD", true).isSameOrBefore(dayjs(), "day");
}

export function formatCurrency(amount: number): string {
  return `$ ${amount.toLocaleString("en-HK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr: string): string {
  const date = dayjs(dateStr, "YYYY-MM-DD", true);
  const today = dayjs().startOf("day");
  if (date.isSame(today, "day")) return "今天";
  if (date.isSame(today.add(1, "day"), "day")) return "明天";
  if (date.isSame(today.subtract(1, "day"), "day")) return "昨天";
  return date.format("YYYY年MM月DD日");
}

export function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    if (e.code === "42501" || e.status === 406) {
      return "沒有權限，訪客帳戶無法執行此操作";
    }
  }
  return "操作失敗，請稍後再試";
}

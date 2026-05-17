import dayjs from "dayjs";

export function calculateInterest(
  amount: number,
  rate: number,
  startDate: string,
  endDate: string,
): number {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
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
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const days = end.diff(start, "day");
  const interest = amount * (rate / 100) * (days / 365);
  return Math.round(interest * 100) / 100;
}

export function calculateEndDate(
  startDate: string,
  periodValue: number,
  periodUnit: string,
): string {
  const start = dayjs(startDate);
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
  return dayjs(endDate).isBefore(dayjs(), "day");
}

export function formatCurrency(amount: number): string {
  return `$ ${amount.toLocaleString("en-HK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr: string): string {
  return dayjs(dateStr).format("YYYY年MM月DD日");
}

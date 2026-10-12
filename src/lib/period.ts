import type { Dayjs } from "dayjs";

/**
 * The Term vocabulary: what a Period Unit is called, and how long it runs for.
 * One table, so a unit cannot be labelled 星期 in a dropdown and 2週 on a card.
 */

export type PeriodUnit = "days" | "weeks" | "months" | "years";

export interface PeriodUnitSpec {
  value: PeriodUnit;
  /** Short label, e.g. 個月. */
  label: string;
  /** Roughly how many months one of these spans, for bucketing by term length. */
  monthsEquivalent: number;
}

export const PERIOD_UNITS: readonly PeriodUnitSpec[] = [
  { value: "days", label: "日", monthsEquivalent: 1 / 30 },
  { value: "weeks", label: "週", monthsEquivalent: 7 / 30 },
  { value: "months", label: "個月", monthsEquivalent: 1 },
  { value: "years", label: "年", monthsEquivalent: 12 },
];

/** Dropdown options for the term fields, in the order the form offers them. */
export const PERIOD_UNIT_OPTIONS = PERIOD_UNITS.map(({ value, label }) => ({ value, label }));

const BY_VALUE = new Map<string, PeriodUnitSpec>(PERIOD_UNITS.map((unit) => [unit.value, unit]));

export function periodUnit(unit: string): PeriodUnitSpec | undefined {
  return BY_VALUE.get(unit);
}

/** A Term as it reads on screen, e.g. 6 months -> "6個月". */
export function formatPeriodLabel(value: number, unit: string): string {
  return `${value}${periodUnit(unit)?.label ?? unit}`;
}

/**
 * The Term in months, for bucketing. Months and years are exact; days and weeks
 * assume a 30-day month, which is close enough to place a deposit in a bracket.
 */
export function periodInMonths(value: number, unit: string): number {
  return value * (periodUnit(unit)?.monthsEquivalent ?? 1);
}

/**
 * The Term in days, or 0 when it has no fixed length. Days and weeks are exact.
 * Months and years return 0 because their length depends on where they start:
 * ask the calendar how long the period actually ran instead.
 */
export function periodInDays(value: number, unit: string): number {
  if (unit === "days") return value;
  if (unit === "weeks") return value * 7;
  return 0;
}

/**
 * The date a Term after `from`. Months and years follow the calendar, so a term
 * starting on the 31st lands on the last day of a shorter month. An
 * unrecognised unit has no defined length, so the date does not move.
 */
export function addPeriod(from: Dayjs, value: number, unit: string): Dayjs {
  switch (unit) {
    case "days":
      return from.add(value, "day");
    case "weeks":
      return from.add(value, "week");
    case "months":
      return from.add(value, "month");
    case "years":
      return from.add(value, "year");
    default:
      return from;
  }
}

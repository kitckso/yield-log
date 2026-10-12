import dayjs from "dayjs";
import { calculateEndDate, calculateInterest, calculateInterestRounded } from "./interest";
import type { PeriodUnit } from "./period";
import type { DepositWithBank } from "../types";

export const RECENT_WINDOW_MONTHS = 6;
export const MAX_SUGGESTIONS = 5;

/**
 * Keeps the most frequent values of `keyFn` across recent deposits. Ties keep
 * first-seen order, which is the order deposits arrived in.
 */
export function topByFrequency<T>(
  items: T[],
  keyFn: (item: T) => string | number,
  limit: number = MAX_SUGGESTIONS,
): T[] {
  const freq = new Map<string | number, { item: T; count: number }>();
  items.forEach((item) => {
    const key = keyFn(item);
    const entry = freq.get(key) ?? { item, count: 0 };
    entry.count += 1;
    freq.set(key, entry);
  });
  return [...freq.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e) => e.item);
}

export function recentDeposits(
  deposits: DepositWithBank[],
  now: dayjs.Dayjs = dayjs(),
  windowMonths: number = RECENT_WINDOW_MONTHS,
): DepositWithBank[] {
  const cutoff = now.subtract(windowMonths, "month").format("YYYY-MM-DD");
  return deposits.filter((d) => d.start_date >= cutoff);
}

export function recentAmounts(deposits: DepositWithBank[], now?: dayjs.Dayjs): number[] {
  return topByFrequency(recentDeposits(deposits, now), (d) => d.amount).map((d) => d.amount);
}

export function recentRates(deposits: DepositWithBank[], now?: dayjs.Dayjs): number[] {
  return topByFrequency(recentDeposits(deposits, now), (d) => d.interest_rate).map(
    (d) => d.interest_rate,
  );
}

export interface PeriodSuggestion {
  value: number;
  unit: string;
}

export function recentPeriods(deposits: DepositWithBank[], now?: dayjs.Dayjs): PeriodSuggestion[] {
  return topByFrequency(
    recentDeposits(deposits, now),
    (d) => `${d.period_value}-${d.period_unit}`,
  ).map((d) => ({ value: d.period_value, unit: d.period_unit }));
}

export function isRegistrationEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_REGISTRATION === "true";
}

export function normalizeBankName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateRegistration(
  email: string,
  password: string,
  confirmPassword: string,
): string | null {
  if (!email || !password || !confirmPassword) return "請填寫所有欄位";
  if (password !== confirmPassword) return "密碼不一致";
  if (password.length < 6) return "密碼長度至少 6 個字元";
  return null;
}

export interface DepositFormValues {
  bankId: string | null;
  amount: number | string;
  periodValue: number | string;
  periodUnit: string | null;
  interestRate: number | string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface DepositDraft {
  user_id: string;
  bank_id: string;
  amount: number;
  period_value: number;
  period_unit: PeriodUnit;
  interest_rate: number;
  interest: number;
  start_date: string;
  end_date: string;
}

/**
 * A field counts as filled when it is present and non-zero. Zero amount and
 * zero rate are rejected here, matching the form's existing guard.
 */
export function isDepositFormComplete(values: DepositFormValues): boolean {
  const { bankId, amount, periodValue, periodUnit, interestRate, startDate, endDate } = values;
  if (!bankId || !periodUnit || !startDate || !endDate) return false;
  return Boolean(Number(amount) && Number(periodValue) && Number(interestRate));
}

/**
 * Builds the row to persist, or null when the form is incomplete. Dates are
 * serialized as YYYY-MM-DD, which is the format the calculator and the
 * database both expect.
 */
export function buildDepositDraft(
  values: DepositFormValues,
  interest: number | string,
  userId: string,
): DepositDraft | null {
  const { bankId, amount, periodValue, periodUnit, interestRate, startDate, endDate } = values;
  if (!isDepositFormComplete(values)) return null;
  return {
    user_id: userId,
    bank_id: bankId as string,
    amount: Number(amount),
    period_value: Number(periodValue),
    period_unit: periodUnit as PeriodUnit,
    interest_rate: Number(interestRate),
    interest: Number(interest),
    start_date: (startDate as Date).toLocaleDateString("en-CA"),
    end_date: (endDate as Date).toLocaleDateString("en-CA"),
  };
}

/**
 * True when the stored interest differs from the floored auto-calc and the user
 * has not typed their own figure, so the UI can offer the floored alternative.
 */
export function shouldOfferFloorAlternative(
  interest: number | string,
  floorInterest: number,
  interestManuallyEdited: boolean,
): boolean {
  if (interestManuallyEdited) return false;
  if (Number(interest) <= 0) return false;
  return floorInterest !== Number(interest);
}

/**
 * The end date to show: the manual override when the user set one, otherwise
 * the value derived from the start date and term. Returns null until the form
 * has enough input to derive it.
 */
export function resolveEndDate(
  startDate: Date | null,
  periodValue: number | string,
  periodUnit: string | null,
  manualEndDate: Date | null,
  endDateManuallyEdited: boolean,
): Date | null {
  if (endDateManuallyEdited) return manualEndDate;
  if (!startDate || !periodValue || !periodUnit) return null;
  return calcEndDateFor(startDate, periodValue, periodUnit);
}

export interface AutoInterest {
  interest: number;
  floorInterest: number;
}

export function calcInterestFor(
  amount: number | string,
  interestRate: number | string,
  startDate: Date,
  endDate: Date,
): AutoInterest {
  const s = startDate.toLocaleDateString("en-CA");
  const e = endDate.toLocaleDateString("en-CA");
  const a = Number(amount);
  const r = Number(interestRate);
  return {
    interest: calculateInterestRounded(a, r, s, e),
    floorInterest: calculateInterest(a, r, s, e),
  };
}

export function calcEndDateFor(
  startDate: Date,
  periodValue: number | string,
  periodUnit: string,
): Date {
  return new Date(
    calculateEndDate(startDate.toLocaleDateString("en-CA"), Number(periodValue), periodUnit),
  );
}

/**
 * The interest to store and the floored alternative to offer: the manual
 * override when the user typed one, otherwise the auto-calculated value.
 */
export function resolveInterest(
  amount: number | string,
  interestRate: number | string,
  startDate: Date | null,
  endDate: Date | null,
  manualInterest: number | string,
  interestManuallyEdited: boolean,
): { interest: number | string; floorInterest: number } {
  const auto =
    startDate && endDate && amount && interestRate
      ? calcInterestFor(amount, interestRate, startDate, endDate)
      : null;
  return {
    interest: interestManuallyEdited ? manualInterest : (auto?.interest ?? 0),
    floorInterest: auto?.floorInterest ?? 0,
  };
}

export interface RenewParams {
  bankId?: string;
  amount?: number;
  periodValue?: number;
  periodUnit?: string;
  interestRate?: number;
}

export function buildRenewUrl(deposit: DepositWithBank): string {
  const params = new URLSearchParams({
    renew: "1",
    bankId: deposit.bank_id,
    amount: String(deposit.amount),
    periodValue: String(deposit.period_value),
    periodUnit: deposit.period_unit,
    interestRate: String(deposit.interest_rate),
  });
  return `/deposits/new?${params.toString()}`;
}

function num(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function parseRenewParams(searchParams: URLSearchParams): RenewParams {
  return {
    bankId: searchParams.get("bankId") ?? undefined,
    amount: num(searchParams.get("amount")),
    periodValue: num(searchParams.get("periodValue")),
    periodUnit: searchParams.get("periodUnit") ?? undefined,
    interestRate: num(searchParams.get("interestRate")),
  };
}

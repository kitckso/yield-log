import dayjs from "dayjs";
import { isMatured } from "./depositLifecycle";
import type { DepositWithBank } from "../types";

export type SortBy =
  | "end_asc"
  | "end_desc"
  | "start_asc"
  | "start_desc"
  | "amount_asc"
  | "amount_desc"
  | "rate_asc"
  | "rate_desc";

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "end_asc", label: "到期日 ↑" },
  { value: "end_desc", label: "到期日 ↓" },
  { value: "start_asc", label: "開戶日 ↑" },
  { value: "start_desc", label: "開戶日 ↓" },
  { value: "amount_asc", label: "金額 ↑" },
  { value: "amount_desc", label: "金額 ↓" },
  { value: "rate_asc", label: "利率 ↑" },
  { value: "rate_desc", label: "利率 ↓" },
];

export const DEFAULT_SORT: SortBy = "end_asc";
export const DEFAULT_STATUS = "active";
export const DEFAULT_VIEW = "list";

export interface DepositListFilters {
  statusFilter: string;
  bankFilter: string | null;
  sortBy: string;
}

const DATE_SORTS = new Set(["start_asc", "start_desc", "end_asc", "end_desc"]);

export function isDateSort(sortBy: string): boolean {
  return DATE_SORTS.has(sortBy);
}

export function compareDeposits(a: DepositWithBank, b: DepositWithBank, sortBy: string): number {
  switch (sortBy) {
    case "start_asc":
      return a.start_date.localeCompare(b.start_date);
    case "start_desc":
      return b.start_date.localeCompare(a.start_date);
    case "end_desc":
      return b.end_date.localeCompare(a.end_date);
    case "amount_desc":
      return b.amount - a.amount;
    case "amount_asc":
      return a.amount - b.amount;
    case "rate_desc":
      return b.interest_rate - a.interest_rate;
    case "rate_asc":
      return a.interest_rate - b.interest_rate;
    case "end_asc":
    default:
      return a.end_date.localeCompare(b.end_date);
  }
}

export function filterAndSortDeposits(
  deposits: DepositWithBank[],
  { statusFilter, bankFilter, sortBy }: DepositListFilters,
): DepositWithBank[] {
  const filtered = deposits.filter((d) => {
    if (statusFilter === "active" && isMatured(d.end_date)) return false;
    if (statusFilter === "matured" && !isMatured(d.end_date)) return false;
    if (bankFilter && d.bank_id !== bankFilter) return false;
    return true;
  });
  return filtered.sort((a, b) => compareDeposits(a, b, sortBy));
}

export interface ListUrlState {
  statusFilter: string;
  bankFilter: string | null;
  sortBy: string;
  viewMode: string;
  calendarYear: number;
}

export function parseListUrlState(
  searchParams: URLSearchParams,
  currentYear: number = dayjs().year(),
): ListUrlState {
  const yearParam = searchParams.get("year");
  const parsedYear = yearParam ? Number(yearParam) : NaN;
  return {
    statusFilter: searchParams.get("status") ?? DEFAULT_STATUS,
    bankFilter: searchParams.get("bankId"),
    sortBy: searchParams.get("sort") ?? DEFAULT_SORT,
    viewMode: searchParams.get("view") ?? DEFAULT_VIEW,
    calendarYear: Number.isFinite(parsedYear) ? parsedYear : currentYear,
  };
}

/** Serializes back to the URL, omitting anything left at its default. */
export function buildListUrlParams(state: ListUrlState, currentYear: number = dayjs().year()) {
  const params = new URLSearchParams();
  if (state.statusFilter !== DEFAULT_STATUS) params.set("status", state.statusFilter);
  if (state.bankFilter) params.set("bankId", state.bankFilter);
  if (state.sortBy !== DEFAULT_SORT) params.set("sort", state.sortBy);
  if (state.viewMode !== DEFAULT_VIEW) params.set("view", state.viewMode);
  if (state.viewMode === "calendar" && state.calendarYear !== currentYear)
    params.set("year", String(state.calendarYear));
  return params;
}

export function sortFieldFor(sortBy: string): "start_date" | "end_date" {
  return sortBy.startsWith("start_") ? "start_date" : "end_date";
}

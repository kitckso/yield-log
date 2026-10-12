import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import dayjs from "dayjs";
import {
  MAX_SUGGESTIONS,
  RECENT_WINDOW_MONTHS,
  buildDepositDraft,
  buildRenewUrl,
  calcEndDateFor,
  calcInterestFor,
  isDepositFormComplete,
  isRegistrationEnabled,
  normalizeBankName,
  parseRenewParams,
  recentAmounts,
  recentDeposits,
  recentPeriods,
  recentRates,
  resolveEndDate,
  resolveInterest,
  seedForNewDeposit,
  seedFromDeposit,
  seedFromRenew,
  shouldOfferFloorAlternative,
  topByFrequency,
  validateRegistration,
  type DepositFormSeed,
} from "./depositForm";
import type { DepositWithBank } from "../types";

function dep(over: Partial<DepositWithBank> = {}): DepositWithBank {
  return {
    id: "d1",
    user_id: "u",
    bank_id: "b1",
    amount: 100000,
    period_value: 3,
    period_unit: "months",
    interest_rate: 3,
    interest: 750,
    start_date: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
    end_date: dayjs().add(2, "month").format("YYYY-MM-DD"),
    created_at: "2024-01-01",
    bank_name: "HSBC",
    ...over,
  };
}

const NOW = dayjs("2026-06-15", "YYYY-MM-DD", true);

describe("topByFrequency", () => {
  const items = ["a", "b", "a", "c", "b", "a", "d"];

  it("orders by descending frequency", () => {
    const result = topByFrequency(items, (s) => s);
    expect(result[0]).toBe("a");
    expect(result[1]).toBe("b");
  });

  it("keeps first-seen order for ties", () => {
    const result = topByFrequency(["c", "b", "a"], (s) => s);
    expect(result).toEqual(["c", "b", "a"]);
  });

  it("caps the result at five by default", () => {
    const many = Array.from({ length: 10 }, (_, i) => `v${i}`);
    expect(topByFrequency(many, (s) => s)).toHaveLength(MAX_SUGGESTIONS);
  });

  it("honours an explicit limit", () => {
    expect(topByFrequency(items, (s) => s, 2)).toHaveLength(2);
  });

  it("returns an empty array for no items", () => {
    expect(topByFrequency([], (s) => s)).toEqual([]);
  });

  it("groups by the derived key, not the whole item", () => {
    const result = topByFrequency([dep({ id: "x" }), dep({ id: "y" })], (d) => d.amount);
    expect(result).toHaveLength(1);
  });
});

describe("recentDeposits", () => {
  it("keeps deposits started within the six-month window", () => {
    const inside = dep({ id: "in", start_date: "2026-03-01" });
    const outside = dep({ id: "out", start_date: "2025-01-01" });
    const result = recentDeposits([inside, outside], NOW);
    expect(result.map((d) => d.id)).toEqual(["in"]);
  });

  it("includes a deposit exactly on the cutoff boundary", () => {
    const cutoff = NOW.subtract(RECENT_WINDOW_MONTHS, "month").format("YYYY-MM-DD");
    expect(recentDeposits([dep({ start_date: cutoff })], NOW)).toHaveLength(1);
  });

  it("excludes a deposit one day before the cutoff", () => {
    const dayBefore = NOW.subtract(RECENT_WINDOW_MONTHS, "month")
      .subtract(1, "day")
      .format("YYYY-MM-DD");
    expect(recentDeposits([dep({ start_date: dayBefore })], NOW)).toHaveLength(0);
  });

  it("honours a custom window", () => {
    const old = dep({ start_date: "2026-01-01" });
    expect(recentDeposits([old], NOW, 1)).toHaveLength(0);
    expect(recentDeposits([old], NOW, 12)).toHaveLength(1);
  });
});

describe("recent suggestions", () => {
  const deposits = [
    dep({ id: "a", amount: 100, interest_rate: 1 }),
    dep({ id: "b", amount: 100, interest_rate: 1 }),
    dep({ id: "c", amount: 100, interest_rate: 5 }),
    dep({ id: "d", amount: 999, interest_rate: 9 }),
  ];

  it("suggests the most frequent amount first", () => {
    expect(recentAmounts(deposits, NOW)[0]).toBe(100);
    expect(recentAmounts(deposits, NOW)).toContain(999);
  });

  it("suggests the most frequent rate first", () => {
    expect(recentRates(deposits, NOW)[0]).toBe(1);
  });

  it("suggests periods, keyed by value and unit together", () => {
    const periods = recentPeriods(
      [
        dep({ id: "a", period_value: 3, period_unit: "months" }),
        dep({ id: "b", period_value: 3, period_unit: "months" }),
        dep({ id: "c", period_value: 3, period_unit: "years" }),
      ],
      NOW,
    );
    expect(periods[0]).toEqual({ value: 3, unit: "months" });
    expect(periods).toContainEqual({ value: 3, unit: "years" });
  });

  it("treats the same value in different units as different periods", () => {
    const periods = recentPeriods(
      [
        dep({ id: "a", period_value: 3, period_unit: "months" }),
        dep({ id: "b", period_value: 3, period_unit: "days" }),
      ],
      NOW,
    );
    expect(periods).toHaveLength(2);
  });

  it("returns nothing when no deposits are recent", () => {
    const stale = [dep({ start_date: "2020-01-01" })];
    expect(recentAmounts(stale, NOW)).toEqual([]);
    expect(recentRates(stale, NOW)).toEqual([]);
    expect(recentPeriods(stale, NOW)).toEqual([]);
  });
});

describe("isDepositFormComplete", () => {
  const valid = {
    bankId: "b1",
    amount: 10000,
    periodValue: 3,
    periodUnit: "months",
    interestRate: 3,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-04-01"),
  };

  it("accepts a fully filled form", () => {
    expect(isDepositFormComplete(valid)).toBe(true);
  });

  it("accepts numeric strings", () => {
    expect(isDepositFormComplete({ ...valid, amount: "10000", periodValue: "3" })).toBe(true);
  });

  it("rejects a missing bank", () => {
    expect(isDepositFormComplete({ ...valid, bankId: null })).toBe(false);
  });

  it("rejects missing dates", () => {
    expect(isDepositFormComplete({ ...valid, startDate: null })).toBe(false);
    expect(isDepositFormComplete({ ...valid, endDate: null })).toBe(false);
  });

  it("rejects a missing period unit", () => {
    expect(isDepositFormComplete({ ...valid, periodUnit: null })).toBe(false);
  });

  it("treats zero amount and zero rate as incomplete", () => {
    expect(isDepositFormComplete({ ...valid, amount: 0 })).toBe(false);
    expect(isDepositFormComplete({ ...valid, interestRate: 0 })).toBe(false);
    expect(isDepositFormComplete({ ...valid, periodValue: 0 })).toBe(false);
  });
});

describe("buildDepositDraft", () => {
  const values = {
    bankId: "b1",
    amount: "100000",
    periodValue: "3",
    periodUnit: "months",
    interestRate: "2.5",
    startDate: new Date("2026-01-15"),
    endDate: new Date("2026-04-15"),
  };

  it("coerces numeric fields and formats dates as YYYY-MM-DD", () => {
    const draft = buildDepositDraft(values, "1250.5", "user-9");
    expect(draft).toEqual({
      user_id: "user-9",
      bank_id: "b1",
      amount: 100000,
      period_value: 3,
      period_unit: "months",
      interest_rate: 2.5,
      interest: 1250.5,
      start_date: "2026-01-15",
      end_date: "2026-04-15",
    });
  });

  it("returns null for an incomplete form", () => {
    expect(buildDepositDraft({ ...values, bankId: null }, 1, "u")).toBeNull();
    expect(buildDepositDraft({ ...values, endDate: null }, 1, "u")).toBeNull();
  });

  it("preserves zero interest, which is valid for a draft", () => {
    expect(buildDepositDraft(values, 0, "u")?.interest).toBe(0);
  });
});

describe("calcEndDateFor", () => {
  it("derives the end date from the start date and term", () => {
    const result = calcEndDateFor(new Date("2026-01-31"), 1, "months");
    expect(result.toLocaleDateString("en-CA")).toBe("2026-02-28");
  });

  it("accepts a numeric string term", () => {
    const result = calcEndDateFor(new Date("2026-01-01"), "90", "days");
    expect(result.toLocaleDateString("en-CA")).toBe("2026-04-01");
  });
});

describe("calcInterestFor", () => {
  it("returns both the rounded and floored interest", () => {
    const result = calcInterestFor(100000, 1.5, new Date("2024-01-01"), new Date("2024-01-02"));
    expect(result.interest).toBe(4.11);
    expect(result.floorInterest).toBe(4.1);
  });

  it("returns identical values when there is no fractional cent", () => {
    const result = calcInterestFor(100000, 3, new Date("2023-01-01"), new Date("2024-01-01"));
    expect(result.interest).toBe(3000);
    expect(result.floorInterest).toBe(3000);
  });
});

describe("resolveEndDate", () => {
  const start = new Date("2026-01-01");

  it("derives the end date from the start date and term", () => {
    const result = resolveEndDate(start, 3, "months", null, false);
    expect(result?.toLocaleDateString("en-CA")).toBe("2026-04-01");
  });

  it("returns the manual override once the user set one", () => {
    const manual = new Date("2026-06-15");
    const result = resolveEndDate(start, 3, "months", manual, true);
    expect(result?.toLocaleDateString("en-CA")).toBe("2026-06-15");
  });

  it("keeps a cleared date cleared instead of re-deriving it", () => {
    expect(resolveEndDate(start, 3, "months", null, true)).toBeNull();
  });

  it("returns null until the form has enough input", () => {
    expect(resolveEndDate(null, 3, "months", null, false)).toBeNull();
    expect(resolveEndDate(start, "", "months", null, false)).toBeNull();
    expect(resolveEndDate(start, 3, null, null, false)).toBeNull();
  });
});

describe("resolveInterest", () => {
  const start = new Date("2024-01-01");
  const end = new Date("2024-01-02");

  it("derives interest and the floored alternative when not overridden", () => {
    const result = resolveInterest(100000, 1.5, start, end, "", false);
    expect(result.interest).toBe(4.11);
    expect(result.floorInterest).toBe(4.1);
  });

  it("returns the manual value once the user typed one", () => {
    const result = resolveInterest(100000, 1.5, start, end, 999, true);
    expect(result.interest).toBe(999);
  });

  it("falls back to zero interest while an input is missing", () => {
    expect(resolveInterest("", 1.5, start, end, "", false).interest).toBe(0);
    expect(resolveInterest(100000, "", start, end, "", false).interest).toBe(0);
    expect(resolveInterest(100000, 1.5, null, end, "", false).interest).toBe(0);
    expect(resolveInterest(100000, 1.5, start, null, "", false).interest).toBe(0);
  });

  it("reports no floor alternative while an input is missing", () => {
    expect(resolveInterest(100000, 1.5, start, null, "", false).floorInterest).toBe(0);
  });
});

describe("shouldOfferFloorAlternative", () => {
  it("offers the floored value when it differs", () => {
    expect(shouldOfferFloorAlternative(4.11, 4.1, false)).toBe(true);
  });

  it("stays quiet when the values already agree", () => {
    expect(shouldOfferFloorAlternative(4.1, 4.1, false)).toBe(false);
  });

  it("stays quiet once the user typed their own interest", () => {
    expect(shouldOfferFloorAlternative(999, 4.1, true)).toBe(false);
  });

  it("stays quiet when interest is zero or negative", () => {
    expect(shouldOfferFloorAlternative(0, 4.1, false)).toBe(false);
    expect(shouldOfferFloorAlternative(-1, 4.1, false)).toBe(false);
  });
});

describe("validateRegistration", () => {
  it("accepts a valid registration", () => {
    expect(validateRegistration("a@b.com", "secret1", "secret1")).toBeNull();
  });

  it("requires every field", () => {
    expect(validateRegistration("", "secret1", "secret1")).toBe("請填寫所有欄位");
    expect(validateRegistration("a@b.com", "", "")).toBe("請填寫所有欄位");
    expect(validateRegistration("a@b.com", "secret1", "")).toBe("請填寫所有欄位");
  });

  it("rejects a mismatched confirmation", () => {
    expect(validateRegistration("a@b.com", "secret1", "secret2")).toBe("密碼不一致");
  });

  it("rejects a short password", () => {
    expect(validateRegistration("a@b.com", "12345", "12345")).toBe("密碼長度至少 6 個字元");
  });

  it("reports the mismatch before the length rule", () => {
    expect(validateRegistration("a@b.com", "123", "456")).toBe("密碼不一致");
  });

  it("reports missing fields before anything else", () => {
    expect(validateRegistration("", "", "")).toBe("請填寫所有欄位");
  });

  it("accepts exactly six characters", () => {
    expect(validateRegistration("a@b.com", "123456", "123456")).toBeNull();
  });
});

describe("isRegistrationEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled only for the exact string true", () => {
    vi.stubEnv("VITE_ENABLE_REGISTRATION", "true");
    expect(isRegistrationEnabled()).toBe(true);
    vi.stubEnv("VITE_ENABLE_REGISTRATION", "false");
    expect(isRegistrationEnabled()).toBe(false);
    vi.stubEnv("VITE_ENABLE_REGISTRATION", "1");
    expect(isRegistrationEnabled()).toBe(false);
  });
});

describe("normalizeBankName", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeBankName("  HSBC 匯豐銀行  ")).toBe("HSBC 匯豐銀行");
  });

  it("rejects blank and whitespace-only names", () => {
    expect(normalizeBankName("")).toBeNull();
    expect(normalizeBankName("   ")).toBeNull();
    expect(normalizeBankName("\t\n")).toBeNull();
  });
});

describe("renew url contract", () => {
  const deposit = dep({
    bank_id: "bank-7",
    amount: 50000,
    period_value: 6,
    period_unit: "weeks",
    interest_rate: 2.8,
  });

  it("round-trips every field through build and parse", () => {
    const url = buildRenewUrl(deposit);
    const params = new URL(url, "https://example.test").searchParams;
    expect(params.get("renew")).toBe("1");
    expect(parseRenewParams(params)).toEqual({
      bankId: "bank-7",
      amount: 50000,
      periodValue: 6,
      periodUnit: "weeks",
      interestRate: 2.8,
    });
  });

  it("targets the new-deposit route", () => {
    expect(buildRenewUrl(deposit).startsWith("/deposits/new?")).toBe(true);
  });

  it("omits fields that are absent", () => {
    const params = new URLSearchParams("renew=1");
    const parsed = parseRenewParams(params);
    expect(parsed.bankId).toBeUndefined();
    expect(parsed.amount).toBeUndefined();
    expect(parsed.periodUnit).toBeUndefined();
  });

  it("ignores blank and non-numeric numbers", () => {
    const params = new URLSearchParams("amount=&periodValue=abc&interestRate=");
    const parsed = parseRenewParams(params);
    expect(parsed.amount).toBeUndefined();
    expect(parsed.periodValue).toBeUndefined();
    expect(parsed.interestRate).toBeUndefined();
  });

  it("round-trips a zero interest rate", () => {
    const url = buildRenewUrl(dep({ interest_rate: 0 }));
    const params = new URL(url, "https://example.test").searchParams;
    expect(parseRenewParams(params).interestRate).toBe(0);
  });

  it("round-trips a bank id needing escaping", () => {
    const url = buildRenewUrl(dep({ bank_id: "a b&c=d" }));
    const params = new URL(url, "https://example.test").searchParams;
    expect(parseRenewParams(params).bankId).toBe("a b&c=d");
  });
});

describe("seedFromDeposit", () => {
  it("opens every field from the stored deposit", () => {
    const deposit = dep({
      bank_id: "b9",
      amount: 50000,
      period_value: 6,
      period_unit: "months",
      interest_rate: 2.5,
      start_date: "2024-06-01",
    });
    const seed = seedFromDeposit(deposit);
    expect(seed.bankId).toBe("b9");
    expect(seed.amount).toBe(50000);
    expect(seed.periodValue).toBe(6);
    expect(seed.periodUnit).toBe("months");
    expect(seed.interestRate).toBe(2.5);
    expect(seed.startDate?.toISOString().slice(0, 10)).toBe("2024-06-01");
  });

  it("never leaves a field blank, so an edit form submits as the deposit read", () => {
    const seed = seedFromDeposit(dep({ amount: 0, interest_rate: 0 }));
    expect(seed.amount).toBe(0);
    expect(seed.interestRate).toBe(0);
    expect(seed.bankId).not.toBeNull();
    expect(seed.periodUnit).not.toBeNull();
  });
});

describe("seedFromRenew", () => {
  const today = new Date("2026-06-15T09:00:00");

  it("carries the previous terms over from the link", () => {
    const url = buildRenewUrl(dep({ bank_id: "b7", amount: 80000, period_value: 12 }));
    const params = new URL(url, "https://example.test").searchParams;
    const seed = seedFromRenew(parseRenewParams(params), today);
    expect(seed.bankId).toBe("b7");
    expect(seed.amount).toBe(80000);
    expect(seed.periodValue).toBe(12);
    expect(seed.startDate).toBe(today);
  });

  it("starts a renewal today, not on the old deposit's start date", () => {
    const seed = seedFromRenew({}, today);
    expect(seed.startDate).toBe(today);
  });

  it("leaves anything the link omits blank rather than zero", () => {
    const seed = seedFromRenew({}, today);
    expect(seed.bankId).toBeNull();
    expect(seed.periodUnit).toBeNull();
    expect(seed.amount).toBe("");
    expect(seed.periodValue).toBe("");
    expect(seed.interestRate).toBe("");
  });
});

describe("seedForNewDeposit", () => {
  const today = new Date("2026-06-15T09:00:00");

  it("opens empty and starting today", () => {
    expect(seedForNewDeposit(today)).toEqual({
      bankId: null,
      amount: "",
      periodValue: "",
      periodUnit: null,
      interestRate: "",
      startDate: today,
    });
  });

  it("is the same shape a renewal or an edit produces", () => {
    const shape = (seed: DepositFormSeed) => Object.keys(seed).sort();
    expect(shape(seedForNewDeposit(today))).toEqual(shape(seedFromDeposit(dep())));
    expect(shape(seedForNewDeposit(today))).toEqual(shape(seedFromRenew({}, today)));
  });
});

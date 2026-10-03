import { describe, expect, it } from "vite-plus/test";
import {
  EXPORT_VERSION,
  buildExportFilename,
  buildExportPayload,
  hasPermissionError,
  parseImportPayload,
  permissionError,
} from "./settings";
import type { Bank, FixedDeposit } from "../types";

const bank: Bank = {
  id: "b1",
  user_id: "u1",
  name: "HSBC 匯豐銀行",
  created_at: "2024-01-01T00:00:00.000Z",
};

const deposit: FixedDeposit = {
  id: "d1",
  user_id: "u1",
  bank_id: "b1",
  amount: 100000,
  period_value: 3,
  period_unit: "months",
  interest_rate: 3,
  interest: 750,
  start_date: "2024-01-01",
  end_date: "2024-04-01",
  created_at: "2024-01-01T00:00:00.000Z",
};

const NOW = new Date("2026-07-04T12:30:00.000Z");

describe("buildExportPayload", () => {
  it("stamps the version and export time", () => {
    const payload = buildExportPayload([bank], [deposit], NOW);
    expect(payload.version).toBe(EXPORT_VERSION);
    expect(payload.exportedAt).toBe("2026-07-04T12:30:00.000Z");
  });

  it("carries banks and deposits through unchanged", () => {
    const payload = buildExportPayload([bank], [deposit], NOW);
    expect(payload.banks).toEqual([bank]);
    expect(payload.deposits).toEqual([deposit]);
  });

  it("handles empty collections", () => {
    const payload = buildExportPayload([], [], NOW);
    expect(payload.banks).toEqual([]);
    expect(payload.deposits).toEqual([]);
  });
});

describe("buildExportFilename", () => {
  it("uses the export date", () => {
    expect(buildExportFilename(NOW)).toBe("yieldlog-export-2026-07-04.json");
  });

  it("always ends in .json", () => {
    expect(buildExportFilename(NOW).endsWith(".json")).toBe(true);
  });
});

describe("parseImportPayload", () => {
  const payload = JSON.stringify({ version: "1.0", banks: [bank], deposits: [deposit] });

  it("accepts a valid file and re-stamps the owner", () => {
    const result = parseImportPayload(payload, "u2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.banks[0].user_id).toBe("u2");
    expect(result.deposits[0].user_id).toBe("u2");
  });

  it("rejects an unsupported version", () => {
    const result = parseImportPayload(JSON.stringify({ version: "2.0" }), "u2");
    expect(result).toEqual({ ok: false, error: "不支援的檔案格式" });
  });

  it("rejects a missing version", () => {
    expect(parseImportPayload(JSON.stringify({ banks: [] }), "u2")).toEqual({
      ok: false,
      error: "不支援的檔案格式",
    });
  });

  it("rejects malformed JSON", () => {
    const result = parseImportPayload("{ not json", "u2");
    expect(result).toEqual({ ok: false, error: "請檢查檔案格式是否正確" });
  });

  it("rejects an empty file", () => {
    expect(parseImportPayload("", "u2").ok).toBe(false);
  });

  it("drops unknown fields from rows", () => {
    const hostile = JSON.stringify({
      version: "1.0",
      banks: [{ id: "b1", name: "HSBC", evil: "x", user_id: "attacker" }],
      deposits: [
        {
          id: "d1",
          bank_id: "b1",
          amount: 100,
          period_value: 3,
          period_unit: "months",
          interest_rate: 3,
          interest: 5,
          start_date: "2024-01-01",
          end_date: "2024-04-01",
          user_id: "attacker",
          bank_name: "injected",
        },
      ],
    });
    const result = parseImportPayload(hostile, "u2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.banks[0]).not.toHaveProperty("evil");
    expect(result.banks[0].user_id).toBe("u2");
    expect(result.deposits[0]).not.toHaveProperty("bank_name");
    expect(result.deposits[0].user_id).toBe("u2");
  });

  it("coerces numeric fields that arrived as strings", () => {
    const loose = JSON.stringify({
      version: "1.0",
      deposits: [{ ...deposit, amount: "100000", interest_rate: "3" }],
    });
    const result = parseImportPayload(loose, "u2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deposits[0].amount).toBe(100000);
    expect(result.deposits[0].interest_rate).toBe(3);
  });

  it("treats missing collections as empty", () => {
    const result = parseImportPayload(JSON.stringify({ version: "1.0" }), "u2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.banks).toEqual([]);
    expect(result.deposits).toEqual([]);
  });

  it("skips non-object entries instead of crashing", () => {
    const messy = JSON.stringify({ version: "1.0", banks: [null, "x", bank] });
    const result = parseImportPayload(messy, "u2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.banks).toHaveLength(1);
  });

  it("omits created_at when the file lacks it, so the DB default applies", () => {
    const noTimestamps = JSON.stringify({
      version: "1.0",
      banks: [{ id: "b1", name: "HSBC" }],
      deposits: [{ ...deposit, created_at: undefined }],
    });
    const result = parseImportPayload(noTimestamps, "u2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.banks[0]).not.toHaveProperty("created_at");
    expect(result.deposits[0]).not.toHaveProperty("created_at");
  });

  it("preserves created_at when the file supplies it", () => {
    const result = parseImportPayload(payload, "u2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.banks[0].created_at).toBe(bank.created_at);
    expect(result.deposits[0].created_at).toBe(deposit.created_at);
  });

  it("round-trips a full export", () => {
    const exported = buildExportPayload([bank], [deposit], NOW);
    const result = parseImportPayload(JSON.stringify(exported), "u2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.banks[0].name).toBe(bank.name);
    expect(result.deposits[0].amount).toBe(deposit.amount);
    expect(result.deposits[0].period_unit).toBe("months");
  });
});

describe("permissionError", () => {
  it("carries the 42501 code", () => {
    expect(permissionError().code).toBe("42501");
  });

  it("is recognised by hasPermissionError", () => {
    expect(hasPermissionError(permissionError())).toBe(true);
  });
});

describe("hasPermissionError", () => {
  it("detects the 42501 code and 406 status", () => {
    expect(hasPermissionError({ code: "42501" })).toBe(true);
    expect(hasPermissionError({ status: 406 })).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(hasPermissionError(new Error("boom"))).toBe(false);
    expect(hasPermissionError({ code: "123" })).toBe(false);
    expect(hasPermissionError(null)).toBe(false);
    expect(hasPermissionError(undefined)).toBe(false);
  });
});

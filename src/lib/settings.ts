import type { Bank, FixedDeposit } from "../types";

export const EXPORT_VERSION = "1.0";

export interface ExportPayload {
  version: string;
  exportedAt: string;
  banks: Bank[];
  deposits: FixedDeposit[];
}

export function buildExportPayload(
  banks: Bank[],
  deposits: FixedDeposit[],
  now: Date = new Date(),
): ExportPayload {
  return {
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    banks,
    deposits,
  };
}

export function buildExportFilename(now: Date = new Date()): string {
  return `yieldlog-export-${now.toISOString().split("T")[0]}.json`;
}

export type ImportResult =
  | { ok: true; banks: ImportBank[]; deposits: ImportDeposit[] }
  | { ok: false; error: string };

/** Rows to write on import; created_at is optional so the DB default can apply. */
export type ImportBank = Omit<Bank, "created_at"> & { created_at?: string };
export type ImportDeposit = Omit<FixedDeposit, "created_at"> & { created_at?: string };

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function optionalStr(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Adds created_at only when the file provided it, leaving the DB default intact. */
function withCreatedAt<T extends object>(row: T, value: unknown): T & { created_at?: string } {
  const created_at = optionalStr(value);
  return created_at ? { ...row, created_at } : row;
}

/** Accepts a real number or a numeric string, so hand-edited files still work. */
function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Validates an export file and re-stamps every row onto the importing user.
 * Only the known columns survive, so unknown or hostile fields in the file are
 * dropped rather than written.
 */
export function parseImportPayload(text: string, userId: string): ImportResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "請檢查檔案格式是否正確" };
  }

  if (data.version !== EXPORT_VERSION) {
    return { ok: false, error: "不支援的檔案格式" };
  }

  const banks = Array.isArray(data.banks)
    ? data.banks
        .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
        .map((b) =>
          withCreatedAt(
            {
              id: str(b.id, ""),
              user_id: userId,
              name: str(b.name, ""),
            },
            b.created_at,
          ),
        )
    : [];

  const deposits = Array.isArray(data.deposits)
    ? data.deposits
        .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
        .map((d) =>
          withCreatedAt(
            {
              id: str(d.id, ""),
              user_id: userId,
              bank_id: str(d.bank_id, ""),
              amount: num(d.amount),
              period_value: num(d.period_value),
              period_unit: str(d.period_unit, "months") as FixedDeposit["period_unit"],
              interest_rate: num(d.interest_rate),
              interest: num(d.interest),
              start_date: str(d.start_date, ""),
              end_date: str(d.end_date, ""),
            },
            d.created_at,
          ),
        )
    : [];

  return { ok: true, banks, deposits };
}

/** Maps an in-place clear that left rows behind onto the permission message. */
export function permissionError(): Error & { code: string } {
  const e = new Error("No permission") as Error & { code: string };
  e.code = "42501";
  return e;
}

export function hasPermissionError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    ((err as { code?: unknown }).code === "42501" || (err as { status?: unknown }).status === 406)
  );
}

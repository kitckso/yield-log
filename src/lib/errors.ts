import { hasPermissionError } from "./settings";

/** A guest account hitting a row-level rule, or anything else failing. */
export function getErrorMessage(err: unknown): string {
  if (hasPermissionError(err)) {
    return "沒有權限，訪客帳戶無法執行此操作";
  }
  return "操作失敗，請稍後再試";
}

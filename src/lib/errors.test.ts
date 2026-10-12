import { describe, expect, it } from "vite-plus/test";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("maps permission errors", () => {
    expect(getErrorMessage({ code: "42501" })).toBe("沒有權限，訪客帳戶無法執行此操作");
    expect(getErrorMessage({ status: 406 })).toBe("沒有權限，訪客帳戶無法執行此操作");
  });

  it("falls back for unknown errors", () => {
    expect(getErrorMessage(new Error("x"))).toBe("操作失敗，請稍後再試");
    expect(getErrorMessage(null)).toBe("操作失敗，請稍後再試");
    expect(getErrorMessage("nope")).toBe("操作失敗，請稍後再試");
  });
});

import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mock = vi.hoisted(() => ({ storage: new Map<string, string>() }));

vi.mock("zustand/middleware", async (orig) => {
  const actual = await orig<{ persist: unknown }>();
  return {
    ...actual,
    persist:
      (initializer: (set: unknown, get: unknown) => unknown, options: { name: string }) =>
      (set: unknown, get: unknown, api: unknown) => {
        const createState = initializer as (set: unknown, get: unknown, api: unknown) => unknown;
        const state = createState(set, get, api) as Record<string, unknown>;
        mock.storage.set(options.name, JSON.stringify({ state: { ...state }, version: 0 }));
        return state;
      },
  };
});

const { useAppStore } = await import("./app");

beforeEach(() => {
  useAppStore.setState({ fontSizeLevel: 2, colorScheme: "system" });
});

describe("app store defaults", () => {
  it("starts at font size level 2 and system colour scheme", () => {
    const state = useAppStore.getState();
    expect(state.fontSizeLevel).toBe(2);
    expect(state.colorScheme).toBe("system");
  });

  it("persists under the yieldlog-app-settings key", () => {
    expect(mock.storage.has("yieldlog-app-settings")).toBe(true);
  });
});

describe("setFontSizeLevel", () => {
  it("sets each allowed level", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      useAppStore.getState().setFontSizeLevel(level);
      expect(useAppStore.getState().fontSizeLevel).toBe(level);
    }
  });

  it("leaves the colour scheme untouched", () => {
    useAppStore.getState().setColorScheme("dark");
    useAppStore.getState().setFontSizeLevel(5);
    expect(useAppStore.getState().colorScheme).toBe("dark");
  });
});

describe("setColorScheme", () => {
  it("accepts system, light and dark", () => {
    for (const scheme of ["system", "light", "dark"] as const) {
      useAppStore.getState().setColorScheme(scheme);
      expect(useAppStore.getState().colorScheme).toBe(scheme);
    }
  });

  it("leaves the font size level untouched", () => {
    useAppStore.getState().setFontSizeLevel(4);
    useAppStore.getState().setColorScheme("light");
    expect(useAppStore.getState().fontSizeLevel).toBe(4);
  });
});

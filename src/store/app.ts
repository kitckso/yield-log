import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontSizeLevel = 1 | 2 | 3 | 4 | 5;
export type ColorScheme = "system" | "light" | "dark";

interface AppState {
  fontSizeLevel: FontSizeLevel;
  setFontSizeLevel: (level: FontSizeLevel) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      fontSizeLevel: 2,
      setFontSizeLevel: (level) => set({ fontSizeLevel: level }),
      colorScheme: "system",
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
    }),
    { name: "yieldlog-app-settings" },
  ),
);

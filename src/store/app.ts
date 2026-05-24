import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontSizeLevel = 1 | 2 | 3 | 4 | 5;

interface AppState {
  fontSizeLevel: FontSizeLevel;
  setFontSizeLevel: (level: FontSizeLevel) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      fontSizeLevel: 2,
      setFontSizeLevel: (level) => set({ fontSizeLevel: level }),
    }),
    { name: "yieldlog-app-settings" },
  ),
);

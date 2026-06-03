import { useEffect, type ReactNode } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { useAppStore } from "../store/app";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useMantineColorScheme();
  const colorScheme = useAppStore((s) => s.colorScheme);

  useEffect(() => {
    setColorScheme(colorScheme === "system" ? "auto" : colorScheme);
  }, [colorScheme, setColorScheme]);

  return <>{children}</>;
}

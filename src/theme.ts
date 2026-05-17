import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "blue",
  colors: {
    blue: [
      "#e7f0ff",
      "#c7d9ff",
      "#9bbdff",
      "#6e9eff",
      "#4283fd",
      "#1b6af8",
      "#00346f",
      "#002b5c",
      "#00224a",
      "#001a38",
    ],
  },
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  defaultRadius: "lg",
  components: {
    Button: { defaultProps: { radius: "lg" } },
    TextInput: { defaultProps: { radius: "lg" } },
    NumberInput: { defaultProps: { radius: "lg" } },
    Select: { defaultProps: { radius: "lg" } },
    Card: { defaultProps: { padding: "lg" } },
  },
});

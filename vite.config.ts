import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "yieldlog-icon.svg"],
      manifest: {
        name: "YieldLog",
        short_name: "YieldLog",
        description: "定期存款記錄工具",
        theme_color: "#00346f",
        background_color: "#f9f9ff",
        display: "standalone",
        icons: [
          { src: "/yieldlog-icon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
    }),
  ],
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
});

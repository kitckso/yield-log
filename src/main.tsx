import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { theme } from "./theme";
import { ThemeProvider } from "./components/ThemeProvider";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/notifications/styles.css";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ThemeProvider>
        <ModalsProvider>
          <Notifications position="top-center" />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ModalsProvider>
      </ThemeProvider>
    </MantineProvider>
  </StrictMode>,
);

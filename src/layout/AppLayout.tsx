import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useAppStore } from "../store/app";

export default function AppLayout() {
  const fontSizeLevel = useAppStore((s) => s.fontSizeLevel);

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        minHeight: "100dvh",
        backgroundColor: "var(--mantine-color-gray-0)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1 }} data-fs={fontSizeLevel}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}

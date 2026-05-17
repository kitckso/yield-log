import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav";

export default function AppLayout() {
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
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}

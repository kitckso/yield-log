import { Outlet } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/Sidebar";
import { useAppStore } from "../store/app";

export default function AppLayout() {
  const fontSizeLevel = useAppStore((s) => s.fontSizeLevel);
  const isDesktop = useMediaQuery("(min-width: 768px)", false);

  if (isDesktop) {
    return (
      <div className="app-layout-desktop">
        <Sidebar />
        <main className="app-content" data-fs={fontSizeLevel}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout-mobile">
      <div className="app-content" data-fs={fontSizeLevel}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}

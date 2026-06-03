import { useLocation, useNavigate } from "react-router-dom";
import { IconLayoutDashboard, IconCoin, IconBuildingBank, IconSettings } from "@tabler/icons-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const icons = {
  dashboard: <IconLayoutDashboard size={24} />,
  savings: <IconCoin size={24} />,
  account_balance: <IconBuildingBank size={24} />,
  settings: <IconSettings size={24} />,
};

const navItems: NavItem[] = [
  { label: "首頁", icon: icons.dashboard, path: "/" },
  { label: "存款", icon: icons.savings, path: "/deposits" },
  { label: "銀行", icon: icons.account_balance, path: "/banks" },
  { label: "設定", icon: icons.settings, path: "/settings" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "64px",
        backgroundColor: "var(--mantine-color-body)",
        borderTop: "1px solid var(--mantine-color-gray-3)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 1000,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`bottom-nav-btn${active ? " active" : ""}`}
          >
            {item.icon}
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

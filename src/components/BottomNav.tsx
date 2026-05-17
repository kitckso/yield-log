import { useLocation, useNavigate } from "react-router-dom";

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: "首頁", icon: "dashboard", path: "/" },
  { label: "存款", icon: "savings", path: "/deposits" },
  { label: "銀行", icon: "account_balance", path: "/banks" },
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
        backgroundColor: "white",
        borderTop: "1px solid var(--mantine-color-gray-3)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 1000,
        maxWidth: "480px",
        margin: "0 auto",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "8px 16px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: active ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-6)",
              transition: "all 0.2s",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "24px",
                fontVariationSettings: active ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400",
              }}
            >
              {item.icon}
            </span>
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

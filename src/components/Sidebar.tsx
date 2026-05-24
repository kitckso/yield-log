import { useLocation, useNavigate } from "react-router-dom";
import {
  IconLayoutDashboard,
  IconCoin,
  IconBuildingBank,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { Stack, Text, Avatar, Divider } from "@mantine/core";
import { useAuthStore } from "../store/auth";

const navItems = [
  { label: "首頁", icon: IconLayoutDashboard, path: "/" },
  { label: "存款", icon: IconCoin, path: "/deposits" },
  { label: "銀行", icon: IconBuildingBank, path: "/banks" },
  { label: "設定", icon: IconSettings, path: "/settings" },
] as const;

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="app-sidebar">
      <div className="sidebar-brand">
        <Text fw={700} size="lg">
          YieldLog
        </Text>
        <Text size="xs" c="dimmed">
          定存記錄工具
        </Text>
      </div>

      <Stack gap={4} className="sidebar-nav">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`sidebar-link${active ? " active" : ""}`}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </Stack>

      <Divider my="sm" />

      <div className="sidebar-user">
        <Avatar size="sm" color="blue">
          {(user?.email ?? "?").charAt(0).toUpperCase()}
        </Avatar>
        <Text size="xs" truncate className="sidebar-user-email">
          {user?.email}
        </Text>
        <button onClick={() => signOut()} className="sidebar-logout-btn" title="登出">
          <IconLogout size={18} />
        </button>
      </div>
    </nav>
  );
}

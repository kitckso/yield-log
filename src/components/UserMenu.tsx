import { Avatar, Menu, Text } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import { useAuthStore } from "../store/auth";

export default function UserMenu() {
  const { user, signOut } = useAuthStore();

  return (
    <Menu shadow="md" width={160}>
      <Menu.Target>
        <Avatar src={null} alt={user?.email ?? ""} color="blue" style={{ cursor: "pointer" }}>
          {(user?.email ?? "?").charAt(0).toUpperCase()}
        </Avatar>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item disabled>
          <Text size="xs">{user?.email}</Text>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconLogout size={18} />} onClick={() => signOut()}>
          登出
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

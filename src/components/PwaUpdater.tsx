import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconRefresh } from "@tabler/icons-react";
import { useRegisterSW } from "virtual:pwa-register/react";

const UPDATE_TOAST_ID = "pwa-update";

export default function PwaUpdater() {
  useRegisterSW({
    onNeedReload() {
      notifications.show({
        id: UPDATE_TOAST_ID,
        title: "有可用更新",
        message: (
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="sm" c="dimmed">
              新版本已下載完成
            </Text>
            <Button
              size="compact-sm"
              variant="light"
              color="blue"
              leftSection={<IconRefresh size={14} />}
              onClick={() => window.location.reload()}
            >
              重新整理
            </Button>
          </Group>
        ),
        color: "blue",
        icon: <IconRefresh size={20} />,
        autoClose: false,
        withCloseButton: true,
      });
    },
  });

  return null;
}

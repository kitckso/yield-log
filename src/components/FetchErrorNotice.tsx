import { Alert, Button, Group, Text } from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

interface FetchErrorNoticeProps {
  error: string;
  onRetry: () => void;
}

/**
 * Says a fetch failed, rather than leaving whatever is on screen looking
 * current. Retrying forces a refetch, bypassing the cache that would otherwise
 * still consider the rows good.
 */
export default function FetchErrorNotice({ error, onRetry }: FetchErrorNoticeProps) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} title="載入失敗">
      <Group justify="space-between" wrap="nowrap" align="center">
        <Text size="sm">{error}</Text>
        <Button
          size="compact-xs"
          variant="light"
          color="red"
          leftSection={<IconRefresh size={14} />}
          onClick={onRetry}
        >
          重試
        </Button>
      </Group>
    </Alert>
  );
}

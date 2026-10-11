import { Card, Group, Stack, Text, ActionIcon, ThemeIcon } from "@mantine/core";
import { IconBuildingBank, IconEdit, IconTrash } from "@tabler/icons-react";

interface BankItemProps {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function BankItem({ name, onEdit, onDelete }: BankItemProps) {
  return (
    <Card padding="md" radius="lg" withBorder>
      <Group justify="space-between">
        <Group gap="md">
          <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
            <IconBuildingBank size={20} />
          </ThemeIcon>
          <Stack gap={4}>
            <Text fw={600}>{name}</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="gray.6" onClick={onEdit}>
            <IconEdit size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red.7" onClick={onDelete}>
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}

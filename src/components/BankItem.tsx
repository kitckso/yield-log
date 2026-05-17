import { Card, Group, Stack, Text, ActionIcon } from "@mantine/core";
import { IconBuildingBank, IconEdit, IconTrash } from "@tabler/icons-react";

interface BankItemProps {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function BankItem({ name, onEdit, onDelete }: BankItemProps) {
  return (
    <Card
      padding="md"
      radius="lg"
      style={{
        backgroundColor: "white",
        border: "1px solid var(--mantine-color-gray-3)",
      }}
    >
      <Group justify="space-between">
        <Group gap="md">
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "var(--mantine-color-blue-1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconBuildingBank size={20} color="var(--mantine-color-blue-6)" />
          </div>
          <Stack gap={4}>
            <Text fw={600}>{name}</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="gray" onClick={onEdit}>
            <IconEdit size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onDelete}>
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}

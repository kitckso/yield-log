import { Card, Text, Group, Badge, Stack, ActionIcon } from "@mantine/core";
import { isMatured, formatDate } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";

interface DepositCardProps {
  deposit: DepositWithBank;
  onEdit: () => void;
  onDelete: () => void;
}

export default function DepositCard({ deposit, onEdit, onDelete }: DepositCardProps) {
  const matured = isMatured(deposit.end_date);

  const periodLabel =
    deposit.period_unit === "months"
      ? `${deposit.period_value}個月`
      : deposit.period_unit === "days"
        ? `${deposit.period_value}日`
        : deposit.period_unit === "weeks"
          ? `${deposit.period_value}週`
          : `${deposit.period_value}年`;

  return (
    <Card
      padding="md"
      radius="lg"
      style={{
        backgroundColor: "white",
        border: "1px solid var(--mantine-color-gray-3)",
      }}
    >
      <Group justify="space-between" mb="xs">
        <Stack gap={4}>
          <Text fw={600}>{deposit.bank_name}</Text>
          <Text size="xs" c="dimmed">
            {periodLabel} 定期存款
          </Text>
        </Stack>
        <Badge color={matured ? "gray" : "green"} variant="light">
          {matured ? "已期滿" : "進行中"}
        </Badge>
      </Group>

      <Text fw={700} style={{ fontSize: "28px", lineHeight: "32px" }} mb="sm">
        HK${" "}
        {deposit.amount.toLocaleString("en-HK", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>

      <Group
        justify="space-between"
        pt="sm"
        style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
      >
        <Group gap="xs">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "18px",
              color: "var(--mantine-color-blue-6)",
            }}
          >
            percent
          </span>
          <Text fw={600}>{deposit.interest_rate}%</Text>
        </Group>
        <Group gap="xs">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "18px",
              color: "var(--mantine-color-gray-6)",
            }}
          >
            {matured ? "event_available" : "calendar_today"}
          </span>
          <Text size="sm" c="dimmed">
            {formatDate(deposit.end_date)}
          </Text>
        </Group>
      </Group>

      <Group gap="xs" mt="sm">
        <ActionIcon variant="subtle" color="gray" onClick={onEdit}>
          <span className="material-symbols-outlined">edit</span>
        </ActionIcon>
        <ActionIcon variant="subtle" color="red" onClick={onDelete}>
          <span className="material-symbols-outlined">delete</span>
        </ActionIcon>
      </Group>
    </Card>
  );
}

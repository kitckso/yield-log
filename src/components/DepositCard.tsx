import { Card, Text, Group, Badge, Stack } from "@mantine/core";
import { IconPercentage, IconCalendarCheck, IconCalendar } from "@tabler/icons-react";
import { isMatured, formatDate, formatCurrency } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";

interface DepositCardProps {
  deposit: DepositWithBank;
  onClick: () => void;
}

export default function DepositCard({ deposit, onClick }: DepositCardProps) {
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
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Group justify="space-between" mb="xs">
        <Stack gap={4}>
          <Text fw={600}>{deposit.bank_name}</Text>
          <Text size="xs" c="dimmed">
            {periodLabel} 定期存款
          </Text>
          <Group gap={4}>
            <IconCalendar size={14} color="var(--mantine-color-gray-6)" />
            <Text size="xs" c="dimmed">
              {formatDate(deposit.start_date)}
            </Text>
          </Group>
        </Stack>
        <Badge color={matured ? "gray" : "green"} variant="light">
          {matured ? "已期滿" : "進行中"}
        </Badge>
      </Group>

      <Text fw={700} style={{ fontSize: "28px", lineHeight: "32px" }} mb="sm">
        {formatCurrency(deposit.amount)}
      </Text>

      <Group
        justify="space-between"
        pt="sm"
        style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
      >
        <Group gap="xs">
          <IconPercentage size={18} color="var(--mantine-color-blue-6)" />
          <Text fw={600}>{deposit.interest_rate}%</Text>
          <Text size="sm" c="dimmed" ml="xs">
            利息 {formatCurrency(deposit.interest)}
          </Text>
        </Group>
        <Group gap="xs">
          {matured ? (
            <IconCalendarCheck size={18} color="var(--mantine-color-gray-6)" />
          ) : (
            <IconCalendar size={18} color="var(--mantine-color-gray-6)" />
          )}
          <Text size="sm" c="dimmed">
            {formatDate(deposit.end_date)}
          </Text>
        </Group>
      </Group>
    </Card>
  );
}

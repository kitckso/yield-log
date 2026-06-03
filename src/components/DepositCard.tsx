import { Card, Text, Group, Badge } from "@mantine/core";
import dayjs from "dayjs";
import { isMatured, formatCurrency, formatDate } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";

interface DepositCardProps {
  deposit: DepositWithBank;
  onClick: () => void;
}

export default function DepositCard({ deposit, onClick }: DepositCardProps) {
  const matured = isMatured(deposit.end_date);
  const endDay = dayjs(deposit.end_date).format("D日");

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
        backgroundColor: "var(--mantine-color-body)",
        border: "1px solid var(--mantine-color-gray-3)",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Group gap={6} wrap="nowrap">
          <Text fw={800} size="md">
            {endDay}
          </Text>
          <Badge size="sm" variant="light" color="gray" radius="sm" fw={500}>
            {deposit.bank_name}
          </Badge>
        </Group>
        <Badge color={matured ? "gray" : "green"} variant="light" size="sm">
          {matured ? "已期滿" : "進行中"}
        </Badge>
      </Group>

      <Text fw={700} style={{ fontSize: "28px", lineHeight: "32px" }} mb={4}>
        {formatCurrency(deposit.amount)}
      </Text>

      <Text size="xs" c="dimmed" mb="sm">
        {periodLabel} 定期存款 · 開戶 {formatDate(deposit.start_date)}
      </Text>

      <Group
        justify="space-between"
        wrap="nowrap"
        pt="sm"
        style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
      >
        <Group gap={4} wrap="nowrap">
          <Text size="sm" c="dimmed">
            {deposit.interest_rate}%
          </Text>
        </Group>
        <Group gap={4} wrap="nowrap">
          <Text size="sm" c="dimmed">
            利息
          </Text>
          <Text fw={700} size="sm" c="green">
            {formatCurrency(deposit.interest)}
          </Text>
        </Group>
      </Group>
    </Card>
  );
}

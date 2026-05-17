import { useMemo, useState } from "react";
import { Card, Group, Stack, Text, Title, ActionIcon, Badge, Button } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatCurrency, formatDate, isMatured } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";

interface MonthlyCalendarProps {
  deposits: DepositWithBank[];
  year: number;
  onYearChange: (year: number) => void;
}

interface MonthGroup {
  month: number;
  label: string;
  deposits: DepositWithBank[];
  totalAmount: number;
  totalInterest: number;
}

export default function MonthlyCalendar({ deposits, year, onYearChange }: MonthlyCalendarProps) {
  const [showPast, setShowPast] = useState(false);
  const currentMonth = dayjs().month();
  const isCurrentYear = year === dayjs().year();

  const months = useMemo(() => {
    const groups: MonthGroup[] = [];
    for (let m = 0; m < 12; m++) {
      const date = dayjs().year(year).month(m);
      const key = date.format("YYYY-MM");
      const monthDeposits = deposits.filter((d) => d.end_date.startsWith(key));
      groups.push({
        month: m,
        label: date.format("M月"),
        deposits: monthDeposits,
        totalAmount: monthDeposits.reduce((s, d) => s + d.amount, 0),
        totalInterest: monthDeposits.reduce((s, d) => s + d.interest, 0),
      });
    }
    return groups;
  }, [deposits, year]);

  const yearTotalAmount = months.reduce((s, m) => s + m.totalAmount, 0);
  const yearTotalInterest = months.reduce((s, m) => s + m.totalInterest, 0);

  const hasPrevYear = deposits.some((d) => d.end_date.startsWith(String(year - 1)));
  const hasNextYear = deposits.some((d) => d.end_date.startsWith(String(year + 1)));

  const renderEmptyMonth = (m: MonthGroup) => (
    <div key={m.month} style={{ padding: "4px 0", textAlign: "center" }}>
      <Text size="xs" c="dimmed">
        {m.label} — 暫無記錄
      </Text>
    </div>
  );

  const renderMonth = (m: MonthGroup) => {
    const isCurrent = isCurrentYear && m.month === currentMonth;

    if (m.deposits.length === 0) {
      return renderEmptyMonth(m);
    }

    return (
      <Card
        key={m.month}
        padding="sm"
        radius="lg"
        withBorder
        style={
          isCurrent ? { borderColor: "var(--mantine-color-blue-5)", borderWidth: 2 } : undefined
        }
      >
        <Text fw={700} size="sm" mb="xs" c={isCurrent ? "blue" : undefined}>
          {m.label}
        </Text>

        <Card padding="xs" radius="md" bg="gray.0" mb="xs">
          <Group justify="space-between">
            <Text size="xs" fw={600}>
              合計
            </Text>
            <Stack gap={0} align="end">
              <Text size="xs" fw={600}>
                {formatCurrency(m.totalAmount)}
              </Text>
              <Text size="xs" c="green" fw={600}>
                {formatCurrency(m.totalInterest)}
              </Text>
            </Stack>
          </Group>
        </Card>

        <Stack gap="sm">
          {m.deposits.map((d) => {
            const matured = isMatured(d.end_date);
            return (
              <Card
                key={d.id}
                padding="xs"
                radius="md"
                style={{
                  backgroundColor: matured ? "var(--mantine-color-gray-0)" : undefined,
                  opacity: matured ? 0.6 : 1,
                }}
              >
                <Group justify="space-between" mb={2}>
                  <Text size="xs" c="dimmed">
                    {formatDate(d.end_date)}
                  </Text>
                  {matured ? (
                    <Badge size="xs" color="gray" variant="light">
                      已期滿
                    </Badge>
                  ) : (
                    <Text size="xs" c="green" fw={500}>
                      {d.interest_rate}%
                    </Text>
                  )}
                </Group>
                <Group justify="space-between" mb={2}>
                  <Text size="sm" fw={500}>
                    {d.bank_name}
                  </Text>
                  <Text size="sm" fw={600}>
                    {formatCurrency(d.amount)}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  利息 {formatCurrency(d.interest)}
                </Text>
              </Card>
            );
          })}
        </Stack>
      </Card>
    );
  };

  return (
    <Stack gap="md">
      <Group justify="center" gap="xs">
        {hasPrevYear ? (
          <ActionIcon variant="subtle" onClick={() => onYearChange(year - 1)}>
            <IconChevronLeft size={20} />
          </ActionIcon>
        ) : (
          <div style={{ width: 36 }} />
        )}
        <Title order={3} style={{ minWidth: 80, textAlign: "center" }}>
          {year}
        </Title>
        {hasNextYear ? (
          <ActionIcon variant="subtle" onClick={() => onYearChange(year + 1)}>
            <IconChevronRight size={20} />
          </ActionIcon>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </Group>

      <Card padding="sm" radius="lg" withBorder>
        <Group justify="center" gap="xl">
          <div>
            <Text size="xs" c="dimmed" ta="center">
              全年本金
            </Text>
            <Text fw={700} size="lg" ta="center">
              {formatCurrency(yearTotalAmount)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" ta="center">
              全年利息
            </Text>
            <Text fw={700} size="lg" c="green" ta="center">
              {formatCurrency(yearTotalInterest)}
            </Text>
          </div>
        </Group>
      </Card>

      <Stack gap="sm">
        {isCurrentYear && showPast && months.filter((m) => m.month < currentMonth).map(renderMonth)}

        {isCurrentYear && (
          <Button
            variant="subtle"
            size="sm"
            fullWidth
            leftSection={showPast ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            onClick={() => setShowPast((v) => !v)}
          >
            {showPast ? "隱藏已過月份" : "顯示已過月份"}
          </Button>
        )}

        {months.filter((m) => !isCurrentYear || m.month >= currentMonth).map(renderMonth)}
      </Stack>
    </Stack>
  );
}

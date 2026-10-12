import { useEffect, useMemo, useState } from "react";
import { Card, Group, Stack, Text, Title, ActionIcon, SimpleGrid } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatMoney } from "../lib/money";
import {
  buildMonthGroups,
  hasDepositsInYear,
  isPastMonth,
  projectDec31Interest,
  splitMonthByToday,
  sumYearTotals,
} from "../lib/calendar";
import { monthLabelShort, monthOf } from "../lib/monthKey";
import type { MonthGroup } from "../lib/monthKey";
import DepositListModal from "./DepositListModal";
import type { DepositWithBank } from "../types";

interface MonthlyCalendarProps {
  deposits: DepositWithBank[];
  year: number;
  onYearChange: (year: number) => void;
}

export default function MonthlyCalendar({ deposits, year, onYearChange }: MonthlyCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState<MonthGroup | null>(null);
  const today = dayjs();
  const currentMonth = today.month();
  const currentYear = today.year();
  const isCurrentYear = year === currentYear;

  const months = useMemo(() => buildMonthGroups(deposits, year), [deposits, year]);

  const { yearTotalAmount, yearTotalInterest } = useMemo(() => sumYearTotals(months), [months]);

  // Projected total interest by Dec 31 = "全年利息" + rollover additions
  // from active deposits that will mature before year-end.
  const projectedDec31Interest = useMemo(
    () => projectDec31Interest(deposits, year, yearTotalInterest, currentYear),
    [deposits, year, yearTotalInterest, currentYear],
  );

  const hasPrevYear = useMemo(() => hasDepositsInYear(deposits, year - 1), [deposits, year]);
  const hasNextYear = useMemo(() => hasDepositsInYear(deposits, year + 1), [deposits, year]);

  const currentMonthId = `calendar-month-${year}-${currentMonth}`;

  useEffect(() => {
    if (deposits.length === 0) return;
    const el = document.getElementById(currentMonthId);
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, [currentMonthId, deposits.length]);

  const renderMonth = (m: MonthGroup) => {
    const month = monthOf(m.key);
    const label = monthLabelShort(m.key);
    const isCurrent = isCurrentYear && month === currentMonth;
    const isPast = isPastMonth(year, month, currentYear, currentMonth);
    const hasDeposits = m.deposits.length > 0;
    const dimmed = isPast && hasDeposits;
    const empty = !hasDeposits;

    const currentSplit = isCurrent && hasDeposits ? splitMonthByToday(m.deposits) : null;

    return (
      <Card
        key={m.key}
        id={isCurrent ? currentMonthId : undefined}
        padding="md"
        radius="lg"
        withBorder
        className={hasDeposits ? "month-card-hover" : undefined}
        style={{
          ...(isCurrent ? { borderColor: "var(--mantine-color-blue-5)", borderWidth: 2 } : {}),
          ...(empty ? { opacity: 0.55 } : {}),
          cursor: hasDeposits ? "pointer" : "default",
          transition: "background-color 0.15s, box-shadow 0.15s",
        }}
        onClick={hasDeposits ? () => setSelectedMonth(m) : undefined}
      >
        <Group justify="space-between" wrap="nowrap" mb={4}>
          <Group gap="xs" wrap="nowrap">
            <Text
              fw={empty ? 600 : 800}
              size="md"
              c={isCurrent ? "blue" : empty || dimmed ? "dimmed" : undefined}
              miw={36}
            >
              {label}
            </Text>
            <Text size="xs" c="dimmed">
              {empty ? "· —" : `· ${m.deposits.length} 筆`}
            </Text>
          </Group>
        </Group>

        {currentSplit ? (
          <Stack gap={2}>
            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed" fw={600}>
                已期滿
              </Text>
              <Text size="xs" c="dimmed">
                · {currentSplit.passed.length} 筆
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                本金
              </Text>
              <Text size="sm" c="dimmed" fw={600}>
                {formatMoney(currentSplit.passedAmount)}
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                利息
              </Text>
              <Text size="xs" c="dimmed" fw={600}>
                {formatMoney(currentSplit.passedInterest)}
              </Text>
            </Group>
            <div
              style={{
                height: 1,
                background: "light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
                margin: "4px 0",
              }}
            />
            <Group gap="xs" align="center">
              <Text size="xs" c="teal" fw={600}>
                未到期
              </Text>
              <Text size="xs" c="dimmed">
                · {currentSplit.future.length} 筆
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                本金
              </Text>
              <Text size="sm" fw={700}>
                {formatMoney(currentSplit.futureAmount)}
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                利息
              </Text>
              <Text size="sm" fw={700} c="green">
                {formatMoney(currentSplit.futureInterest)}
              </Text>
            </Group>
          </Stack>
        ) : empty ? (
          <Stack gap={4}>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                本金
              </Text>
              <Text size="sm" c="dimmed" fw={500}>
                —
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                利息
              </Text>
              <Text size="sm" c="dimmed" fw={500}>
                —
              </Text>
            </Group>
          </Stack>
        ) : (
          <Stack gap={4}>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                本金
              </Text>
              <Text size="sm" fw={dimmed ? 600 : 700} c={dimmed ? "dimmed" : undefined}>
                {formatMoney(m.totalAmount)}
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                利息
              </Text>
              <Text size="sm" fw={dimmed ? 600 : 700} c={dimmed ? "gray" : "green"}>
                {formatMoney(m.totalInterest)}
              </Text>
            </Group>
          </Stack>
        )}
      </Card>
    );
  };

  const modalDeposits = selectedMonth?.deposits ?? [];

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
              {formatMoney(yearTotalAmount)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" ta="center">
              全年利息
            </Text>
            <Text fw={700} size="lg" c="green" ta="center">
              {formatMoney(yearTotalInterest)}
            </Text>
          </div>
          {projectedDec31Interest !== null && (
            <div>
              <Text size="xs" c="dimmed" ta="center">
                預估至 12月31日
              </Text>
              <Text fw={700} size="lg" c="dimmed" ta="center">
                {formatMoney(projectedDec31Interest)}
              </Text>
            </div>
          )}
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
        {months.map(renderMonth)}
      </SimpleGrid>

      <DepositListModal
        opened={!!selectedMonth}
        onClose={() => setSelectedMonth(null)}
        title={
          selectedMonth
            ? `${monthLabelShort(selectedMonth.key)} 到期記錄（${selectedMonth.deposits.length} 筆）`
            : ""
        }
        deposits={modalDeposits}
      />
    </Stack>
  );
}

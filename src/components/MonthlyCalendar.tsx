import { useEffect, useMemo, useState } from "react";
import { Card, Group, Stack, Text, Title, ActionIcon, SimpleGrid } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatCurrency, isMatured } from "../hooks/useCalculations";
import DepositListModal from "./DepositListModal";
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
  const [selectedMonth, setSelectedMonth] = useState<MonthGroup | null>(null);
  const today = dayjs();
  const currentMonth = today.month();
  const currentYear = today.year();
  const isCurrentYear = year === currentYear;

  const months = useMemo(() => {
    const groups: MonthGroup[] = [];
    for (let m = 0; m < 12; m++) {
      const date = dayjs().year(year).month(m);
      const key = date.format("YYYY-MM");
      const monthDeposits = deposits
        .filter((d) => d.end_date.startsWith(key))
        .sort((a, b) => a.end_date.localeCompare(b.end_date));
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

  // Projected total interest by Dec 31 = "全年利息" + rollover additions
  // from active deposits that will mature before year-end.
  const projectedDec31Interest = useMemo(() => {
    if (!isCurrentYear) return null;
    const yearEnd = dayjs().year(year).endOf("year");
    let rolloverTotal = 0;

    deposits.forEach((d) => {
      // Only active deposits maturing by Dec 31
      if (isMatured(d.end_date)) return;
      const end = dayjs(d.end_date);
      if (end.isAfter(yearEnd)) return;

      let currentEnd = end;
      for (;;) {
        let nextEnd: dayjs.Dayjs;
        let termDays = 0;
        switch (d.period_unit) {
          case "days":
            nextEnd = currentEnd.add(d.period_value, "day");
            termDays = d.period_value;
            break;
          case "weeks":
            nextEnd = currentEnd.add(d.period_value * 7, "day");
            termDays = d.period_value * 7;
            break;
          case "months":
            nextEnd = currentEnd.add(d.period_value, "month");
            termDays = nextEnd.diff(currentEnd, "day");
            break;
          case "years":
            nextEnd = currentEnd.add(d.period_value, "year");
            termDays = nextEnd.diff(currentEnd, "day");
            break;
          default:
            nextEnd = currentEnd.add(d.period_value, "month");
            termDays = nextEnd.diff(currentEnd, "day");
        }
        if (nextEnd.isAfter(yearEnd)) break;
        rolloverTotal += d.amount * (d.interest_rate / 100) * (termDays / 365);
        currentEnd = nextEnd;
      }
    });

    return Math.round((yearTotalInterest + rolloverTotal) * 100) / 100;
  }, [deposits, year, isCurrentYear, yearTotalInterest]);

  const hasPrevYear = deposits.some((d) => d.end_date.startsWith(String(year - 1)));
  const hasNextYear = deposits.some((d) => d.end_date.startsWith(String(year + 1)));

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

  const isPastMonth = (m: MonthGroup) =>
    year < currentYear || (year === currentYear && m.month < currentMonth);

  const splitCurrentMonth = (m: MonthGroup) => {
    const todayStart = dayjs().startOf("day");
    const passed = m.deposits.filter((d) => dayjs(d.end_date).isBefore(todayStart));
    const future = m.deposits.filter((d) => !dayjs(d.end_date).isBefore(todayStart));
    const passedAmount = passed.reduce((s, d) => s + d.amount, 0);
    const passedInterest = passed.reduce((s, d) => s + d.interest, 0);
    const futureAmount = future.reduce((s, d) => s + d.amount, 0);
    const futureInterest = future.reduce((s, d) => s + d.interest, 0);
    return { passed, future, passedAmount, passedInterest, futureAmount, futureInterest };
  };

  const renderMonth = (m: MonthGroup) => {
    const isCurrent = isCurrentYear && m.month === currentMonth;
    const isPast = isPastMonth(m);
    const hasDeposits = m.deposits.length > 0;
    const dimmed = isPast && hasDeposits;
    const empty = !hasDeposits;

    const currentSplit = isCurrent && hasDeposits ? splitCurrentMonth(m) : null;

    return (
      <Card
        key={m.month}
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
              c={isCurrent ? "blue" : empty ? "dimmed" : dimmed ? "gray" : undefined}
              miw={36}
            >
              {m.label}
            </Text>
            <Text size="xs" c="dimmed">
              {empty ? "· —" : `· ${m.deposits.length} 筆`}
            </Text>
          </Group>
        </Group>

        {currentSplit ? (
          <Stack gap={2}>
            <Group gap="xs" align="center">
              <Text size="xs" c="gray" fw={600}>
                已期滿
              </Text>
              <Text size="xs" c="gray">
                · {currentSplit.passed.length} 筆
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                本金
              </Text>
              <Text size="sm" c="dimmed" fw={600}>
                {formatCurrency(currentSplit.passedAmount)}
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                利息
              </Text>
              <Text size="xs" c="gray" fw={600}>
                {formatCurrency(currentSplit.passedInterest)}
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
                {formatCurrency(currentSplit.futureAmount)}
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                利息
              </Text>
              <Text size="sm" fw={700} c="green">
                {formatCurrency(currentSplit.futureInterest)}
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
                {formatCurrency(m.totalAmount)}
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                利息
              </Text>
              <Text size="sm" fw={dimmed ? 600 : 700} c={dimmed ? "gray" : "green"}>
                {formatCurrency(m.totalInterest)}
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
          {projectedDec31Interest !== null && (
            <div>
              <Text size="xs" c="dimmed" ta="center">
                預估至 12月31日
              </Text>
              <Text fw={700} size="lg" c="dimmed" ta="center">
                {formatCurrency(projectedDec31Interest)}
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
            ? `${selectedMonth.label} 到期記錄（${selectedMonth.deposits.length} 筆）`
            : ""
        }
        deposits={modalDeposits}
      />
    </Stack>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Group, Stack, Text, Title, ActionIcon, Button, Collapse } from "@mantine/core";
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
  const navigate = useNavigate();
  const [showPast, setShowPast] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const currentMonth = dayjs().month();
  const isCurrentYear = year === dayjs().year();

  const toggleMonth = (month: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

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

  const hasPrevYear = deposits.some((d) => d.end_date.startsWith(String(year - 1)));
  const hasNextYear = deposits.some((d) => d.end_date.startsWith(String(year + 1)));

  const renderMonth = (m: MonthGroup) => {
    const isCurrent = isCurrentYear && m.month === currentMonth;
    const isExpanded = expandedMonths.has(m.month);

    if (m.deposits.length === 0) {
      return (
        <div key={m.month} style={{ padding: "4px 0", textAlign: "center" }}>
          <Text size="xs" c="dimmed">
            {m.label} — 暫無記錄
          </Text>
        </div>
      );
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
        {/* Clickable header: month label + totals + chevron */}
        <Stack gap={2} style={{ cursor: "pointer" }} onClick={() => toggleMonth(m.month)}>
          {/* Top row: month label + desktop totals + chevron */}
          <Group justify="space-between" wrap="nowrap">
            <Group gap="md" wrap="nowrap">
              <Text fw={700} size="sm" c={isCurrent ? "blue" : undefined} miw={32}>
                {m.label}
              </Text>
              <Group gap={4} wrap="nowrap" visibleFrom="xs">
                <Text size="xs" c="dimmed" fw={500}>
                  本金
                </Text>
                <Text size="sm" fw={700}>
                  {formatCurrency(m.totalAmount)}
                </Text>
              </Group>
              <Group gap={4} wrap="nowrap" visibleFrom="xs">
                <Text size="xs" c="dimmed" fw={500}>
                  利息
                </Text>
                <Text size="sm" fw={700} c="green">
                  {formatCurrency(m.totalInterest)}
                </Text>
              </Group>
            </Group>
            <ActionIcon variant="subtle" size="sm">
              {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          </Group>

          {/* Mobile: totals on their own row */}
          <Group justify="space-between" wrap="nowrap" hiddenFrom="xs">
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                本金
              </Text>
              <Text size="sm" fw={700}>
                {formatCurrency(m.totalAmount)}
              </Text>
            </Group>
            <Group gap={4}>
              <Text size="xs" c="dimmed" fw={500}>
                利息
              </Text>
              <Text size="sm" fw={700} c="green">
                {formatCurrency(m.totalInterest)}
              </Text>
            </Group>
          </Group>
        </Stack>

        <Collapse in={isExpanded}>
          <Stack gap="xs" mt="sm">
            {m.deposits.map((d) => {
              const matured = isMatured(d.end_date);
              return (
                <div
                  key={d.id}
                  onClick={() => navigate(`/deposits/${d.id}/detail`)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    backgroundColor: matured ? "var(--mantine-color-gray-0)" : undefined,
                    opacity: matured ? 0.6 : 1,
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = matured
                      ? "var(--mantine-color-gray-0)"
                      : "transparent")
                  }
                >
                  <Group justify="space-between" mb={4}>
                    <Text size="xs" c="dimmed">
                      {formatDate(d.end_date)}
                    </Text>
                    <Text size="sm" fw={500}>
                      {d.bank_name}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      {formatCurrency(d.amount)}
                    </Text>
                    {matured ? (
                      <Text size="xs" c="dimmed">
                        利息 {formatCurrency(d.interest)}
                      </Text>
                    ) : (
                      <Group gap={4}>
                        <Text size="xs" c="green" fw={500}>
                          {d.interest_rate}%
                        </Text>
                        <Text size="xs" c="dimmed">
                          利息 {formatCurrency(d.interest)}
                        </Text>
                      </Group>
                    )}
                  </Group>
                </div>
              );
            })}
          </Stack>
        </Collapse>
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

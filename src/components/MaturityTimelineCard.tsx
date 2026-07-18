import { useState } from "react";
import { Card, Text, Stack, Group, Badge, Divider, Button } from "@mantine/core";
import { formatCurrency, formatRelativeDays } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";
import dayjs from "dayjs";

interface MaturityTimelineCardProps {
  upcoming: DepositWithBank[];
  recentlyMatured: DepositWithBank[];
  bankMap: Map<string, string>;
  onNavigate: (id: string) => void;
}

const INITIAL_SHOW = 5;

function groupByMonth(items: DepositWithBank[]): [string, DepositWithBank[]][] {
  const groups = new Map<string, DepositWithBank[]>();
  for (const d of items) {
    const key = dayjs(d.end_date, "YYYY-MM-DD", true).format("YYYY年M月");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  return Array.from(groups.entries());
}

export default function MaturityTimelineCard({
  upcoming,
  recentlyMatured,
  bankMap,
  onNavigate,
}: MaturityTimelineCardProps) {
  const [showAll, setShowAll] = useState(false);

  if (upcoming.length === 0 && recentlyMatured.length === 0) return null;

  const displayRecent = showAll ? recentlyMatured : recentlyMatured.slice(0, INITIAL_SHOW);
  const displayUpcoming = showAll ? upcoming : upcoming.slice(0, INITIAL_SHOW);
  const hasMore = recentlyMatured.length > INITIAL_SHOW || upcoming.length > INITIAL_SHOW;

  const futureGroups = groupByMonth(displayUpcoming);

  function renderItem(d: DepositWithBank) {
    const today = dayjs().startOf("day");
    const target = dayjs(d.end_date).startOf("day");
    const daysDiff = target.diff(today, "day");
    const isYesterday = daysDiff === -1;
    const isToday = daysDiff === 0;
    const isTomorrow = daysDiff === 1;
    const matured = daysDiff < 0;
    return (
      <Group
        key={d.id}
        justify="space-between"
        style={{ cursor: "pointer" }}
        onClick={() => onNavigate(d.id)}
        {...(!isToday && matured ? { opacity: 0.65 } : {})}
      >
        <Stack gap={2}>
          <Group gap={6}>
            <Text
              size="sm"
              fw={isToday ? 700 : matured ? 400 : 500}
              c={isToday ? "green.7" : matured ? "dimmed" : undefined}
            >
              {bankMap.get(d.bank_id) ?? "未知"}
            </Text>
            {matured && !isToday && (
              <Badge size="xs" color="gray" variant="light">
                已期滿
              </Badge>
            )}
            {isToday && (
              <Badge size="xs" color="green" variant="light">
                今日到期
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {isToday
              ? "今日到期"
              : isYesterday
                ? "昨日到期"
                : isTomorrow
                  ? "明天到期"
                  : matured
                    ? `${formatRelativeDays(daysDiff)}前到期`
                    : `${formatRelativeDays(daysDiff)}後到期`}
          </Text>
        </Stack>
        <Stack gap={0} align="end">
          <Text fw={600} size="sm" c={isToday ? "green.7" : matured ? "dimmed" : undefined}>
            {formatCurrency(d.amount)}
          </Text>
          <Text size="xs" c="dimmed">
            利息 {formatCurrency(d.interest)}
          </Text>
        </Stack>
      </Group>
    );
  }

  function renderGroup([month, items]: [string, DepositWithBank[]], isFirst: boolean) {
    return (
      <Stack gap="xs" key={month}>
        {!isFirst && <Divider label={month} labelPosition="center" pt={4} pb={2} />}
        {items.map(renderItem)}
      </Stack>
    );
  }

  const hasPast = displayRecent.length > 0;
  const hasFuture = futureGroups.length > 0;

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Text fw={600} mb="md">
        到期動態
      </Text>
      <Stack gap="sm">
        {displayRecent.map(renderItem)}
        {hasPast && hasFuture && <Divider />}
        {futureGroups.map((g, i) => renderGroup(g, i === 0))}
        {hasMore && (
          <Button variant="subtle" size="compact-sm" fullWidth onClick={() => setShowAll(!showAll)}>
            {showAll ? "收起" : `顯示全部 (${recentlyMatured.length + upcoming.length})`}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

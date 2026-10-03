import { useState } from "react";
import { Card, Text, Stack, Group, Badge, Divider, Button } from "@mantine/core";
import { formatCurrency } from "../hooks/useCalculations";
import {
  classifyMaturity,
  groupByMonth,
  shouldRenderTimeline,
  truncateForDisplay,
} from "../lib/maturityTimeline";
import type { DepositWithBank } from "../types";

interface MaturityTimelineCardProps {
  upcoming: DepositWithBank[];
  recentlyMatured: DepositWithBank[];
  bankMap: Map<string, string>;
  onNavigate: (id: string) => void;
}

export default function MaturityTimelineCard({
  upcoming,
  recentlyMatured,
  bankMap,
  onNavigate,
}: MaturityTimelineCardProps) {
  const [showAll, setShowAll] = useState(false);

  if (!shouldRenderTimeline(recentlyMatured, upcoming)) return null;

  const {
    recent: displayRecent,
    upcoming: displayUpcoming,
    hasMore,
  } = truncateForDisplay(recentlyMatured, upcoming, showAll);

  const futureGroups = groupByMonth(displayUpcoming);

  function renderItem(d: DepositWithBank) {
    const { isToday, matured, dimmed, label } = classifyMaturity(d.end_date);
    return (
      <Group
        key={d.id}
        justify="space-between"
        style={{ cursor: "pointer" }}
        onClick={() => onNavigate(d.id)}
        {...(dimmed ? { opacity: 0.65 } : {})}
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
            {label}
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

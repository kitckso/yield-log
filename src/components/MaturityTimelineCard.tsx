import { Card, Text, Stack, Group, Badge, Divider } from "@mantine/core";
import { formatCurrency } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";
import dayjs from "dayjs";

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
  if (upcoming.length === 0 && recentlyMatured.length === 0) return null;

  function renderItem(d: DepositWithBank) {
    const today = dayjs().startOf("day");
    const target = dayjs(d.end_date).startOf("day");
    const daysDiff = target.diff(today, "day");
    const isToday = daysDiff === 0;
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
              : matured
                ? `${Math.abs(daysDiff)} 天前到期`
                : `${daysDiff} 天後到期`}
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

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Text fw={600} mb="md">
        到期動態
      </Text>
      <Stack gap="sm">
        {recentlyMatured.length > 0 && recentlyMatured.map(renderItem)}
        {recentlyMatured.length > 0 && upcoming.length > 0 && <Divider />}
        {upcoming.length > 0 && upcoming.map(renderItem)}
      </Stack>
    </Card>
  );
}

import { Card, Text, Stack, Group, Badge } from "@mantine/core";
import { isMatured, formatDate, formatCurrency } from "../hooks/useCalculations";
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
  if (upcoming.length === 0 && recentlyMatured.length === 0) return null;

  const items = [...recentlyMatured, ...upcoming].sort((a, b) =>
    a.end_date.localeCompare(b.end_date),
  );

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Text fw={600} mb="md">
        到期動態
      </Text>
      <Stack gap="sm">
        {items.map((d) => {
          const matured = isMatured(d.end_date);
          return (
            <Group
              key={d.id}
              justify="space-between"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate(d.id)}
              {...(matured ? { opacity: 0.65 } : {})}
            >
              <Stack gap={2}>
                <Group gap={6}>
                  <Text size="sm" fw={matured ? 400 : 500} c={matured ? "dimmed" : undefined}>
                    {bankMap.get(d.bank_id) ?? "未知"}
                  </Text>
                  {matured && (
                    <Badge size="xs" color="gray" variant="light">
                      已期滿
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed">
                  {formatDate(d.end_date)} 到期
                </Text>
              </Stack>
              <Stack gap={0} align="end">
                <Text fw={600} size="sm" c={matured ? "dimmed" : undefined}>
                  {formatCurrency(d.amount)}
                </Text>
                <Text size="xs" c="dimmed">
                  利息 {formatCurrency(d.interest)}
                </Text>
              </Stack>
            </Group>
          );
        })}
      </Stack>
    </Card>
  );
}

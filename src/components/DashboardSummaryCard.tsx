import { Card, Text, Stack, Group, SimpleGrid, Title } from "@mantine/core";
import { formatMoney } from "../lib/money";

interface DashboardSummaryCardProps {
  activeAmount: number;
  activeCount: number;
  avgRate: number;
  interestPerDay: number;
  pendingInterest: number;
  totalReceivedInterest: number;
  maturedCount: number;
  maturedTotal: number;
}

export default function DashboardSummaryCard({
  activeAmount,
  activeCount,
  avgRate,
  interestPerDay,
  pendingInterest,
  totalReceivedInterest,
  maturedCount,
  maturedTotal,
}: DashboardSummaryCardProps) {
  return (
    <Card padding="lg" radius="lg" withBorder>
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          總資產（進行中）
        </Text>
        <Title order={1} style={{ fontSize: "36px", lineHeight: "40px" }}>
          {formatMoney(activeAmount)}
        </Title>
        <Group gap="xs">
          <Text size="sm" fw={600}>
            {activeCount} 筆定存
          </Text>
          <Text size="sm" c="dimmed">
            ·
          </Text>
          <Text size="sm" fw={600}>
            加權平均 {avgRate.toFixed(2)}%
          </Text>
          {activeCount > 0 && (
            <>
              <Text size="sm" c="dimmed">
                ·
              </Text>
              <Text size="sm" fw={600}>
                平均每筆 {formatMoney(Math.round(activeAmount / activeCount))}
              </Text>
            </>
          )}
        </Group>
        {activeCount > 0 && (
          <Group gap="lg" mt={4}>
            <Group gap={4} wrap="nowrap">
              <Text size="sm" c="dimmed">
                每日利息
              </Text>
              <Text size="sm" fw={600} c="green.7">
                {formatMoney(interestPerDay)}
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap">
              <Text size="sm" c="dimmed">
                每月利息
              </Text>
              <Text size="sm" fw={600} c="green.7">
                {formatMoney(interestPerDay * 30)}
              </Text>
            </Group>
          </Group>
        )}
        <SimpleGrid cols={2} mt="xs">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              待收利息
            </Text>
            <Text size="sm" fw={500}>
              {formatMoney(pendingInterest)}
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              已收利息
            </Text>
            <Text size="sm" fw={500}>
              {formatMoney(totalReceivedInterest)}
            </Text>
          </Stack>
        </SimpleGrid>
        <Text size="sm" fw={500} mt="xs">
          預估總利息 {formatMoney(pendingInterest + totalReceivedInterest)}
        </Text>
        {maturedCount > 0 && (
          <Text size="xs" c="dimmed">
            已期滿 {maturedCount} 筆，共 {formatMoney(maturedTotal)}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

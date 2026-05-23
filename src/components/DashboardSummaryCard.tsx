import { Card, Text, Stack, Group, SimpleGrid, Title } from "@mantine/core";
import { formatCurrency } from "../hooks/useCalculations";

interface DashboardSummaryCardProps {
  activeAmount: number;
  activeCount: number;
  avgRate: number;
  pendingInterest: number;
  totalReceivedInterest: number;
  maturedCount: number;
  maturedTotal: number;
}

export default function DashboardSummaryCard({
  activeAmount,
  activeCount,
  avgRate,
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
          {formatCurrency(activeAmount)}
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
                平均每筆 {formatCurrency(Math.round(activeAmount / activeCount))}
              </Text>
            </>
          )}
        </Group>
        <SimpleGrid cols={2} mt="xs">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              待收利息
            </Text>
            <Text size="sm" fw={500}>
              {formatCurrency(pendingInterest)}
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              已收利息
            </Text>
            <Text size="sm" fw={500}>
              {formatCurrency(totalReceivedInterest)}
            </Text>
          </Stack>
        </SimpleGrid>
        {maturedCount > 0 && (
          <Text size="xs" c="dimmed" mt="xs">
            已期滿 {maturedCount} 筆，共 {formatCurrency(maturedTotal)}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

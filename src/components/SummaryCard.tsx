import { Card, Text, Group, Stack } from "@mantine/core";

interface SummaryCardProps {
  activeAmount: number;
  pendingInterest: number;
  totalReceivedInterest: number;
  averageRate: number;
  maturedCount: number;
  activeCount: number;
}

export default function SummaryCard({
  activeAmount,
  pendingInterest,
  totalReceivedInterest,
  averageRate,
  maturedCount,
  activeCount,
}: SummaryCardProps) {
  return (
    <Card
      padding="lg"
      radius="lg"
      style={{
        backgroundColor: "var(--mantine-color-blue-6)",
        color: "white",
      }}
    >
      <Stack gap="xs">
        <Text size="sm" fw={700} opacity={0.8}>
          進行中定存總額 (HKD)
        </Text>
        <Text fw={700} style={{ fontSize: "28px", lineHeight: "32px" }}>
          HK${" "}
          {activeAmount.toLocaleString("en-HK", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        <Group gap="lg" mt="sm">
          <Stack gap={4}>
            <Text size="sm" opacity={0.7}>
              預計利息
            </Text>
            <Text size="sm" fw={600}>
              HK${" "}
              {pendingInterest.toLocaleString("en-HK", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </Stack>
          <Stack gap={4}>
            <Text size="sm" opacity={0.7}>
              已收利息
            </Text>
            <Text size="sm" fw={600}>
              HK${" "}
              {totalReceivedInterest.toLocaleString("en-HK", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </Stack>
        </Group>
        <Group gap="lg" mt="sm">
          <Stack gap={4}>
            <Text size="sm" opacity={0.7}>
              平均利率
            </Text>
            <Text size="sm" fw={600}>
              {averageRate.toFixed(2)}%
            </Text>
          </Stack>
          <Stack gap={4}>
            <Text size="sm" opacity={0.7}>
              進行中
            </Text>
            <Text size="sm" fw={600}>
              {activeCount}
            </Text>
          </Stack>
          <Stack gap={4}>
            <Text size="sm" opacity={0.7}>
              已期滿
            </Text>
            <Text size="sm" fw={600}>
              {maturedCount}
            </Text>
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}

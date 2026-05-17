import { Card, Text, Group, Stack } from "@mantine/core";

interface SummaryCardProps {
  totalAmount: number;
  totalInterest: number;
  averageRate: number;
  maturedCount: number;
}

export default function SummaryCard({
  totalAmount,
  totalInterest,
  averageRate,
  maturedCount,
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
        <Text size="xs" fw={700} opacity={0.8}>
          預計總資產 (HKD)
        </Text>
        <Text fw={700} style={{ fontSize: "28px", lineHeight: "32px" }}>
          HK${" "}
          {totalAmount.toLocaleString("en-HK", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        <Text size="xs" fw={700} opacity={0.8} mt="md">
          總利息收益
        </Text>
        <Text fw={600} size="sm">
          HK${" "}
          {totalInterest.toLocaleString("en-HK", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        <Group gap="lg" mt="md">
          <Stack gap={4}>
            <Text size="xs" opacity={0.7}>
              平均利率
            </Text>
            <Text size="sm" fw={600}>
              {averageRate.toFixed(2)}%
            </Text>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" opacity={0.7}>
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

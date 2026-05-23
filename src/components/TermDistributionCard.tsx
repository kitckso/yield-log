import { Card, Text, Stack, Group, ColorSwatch } from "@mantine/core";
import { DonutChart } from "@mantine/charts";
import { formatCurrency } from "../hooks/useCalculations";

interface TermItem {
  name: string;
  value: number;
  color: string;
}

interface TermDistributionCardProps {
  termDistribution: TermItem[];
}

export default function TermDistributionCard({ termDistribution }: TermDistributionCardProps) {
  if (termDistribution.length === 0) return null;

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Text fw={600} mb="md">
        期長分佈
      </Text>
      <Stack align="center" gap="md">
        <DonutChart
          data={termDistribution}
          size={200}
          thickness={30}
          withTooltip={false}
          pieProps={{ isAnimationActive: true, animationDuration: 500 }}
        />
        <Stack gap="xs" w="100%">
          {termDistribution.map((item) => (
            <Group key={item.name} gap="xs" style={{ flexWrap: "nowrap" }}>
              <ColorSwatch
                color={`var(--mantine-color-${item.color.replace(".", "-")})`}
                size={10}
                withShadow={false}
              />
              <Text size="xs" style={{ flex: 1 }}>
                {item.name}
              </Text>
              <Text size="xs" fw={500}>
                {formatCurrency(item.value)}
              </Text>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

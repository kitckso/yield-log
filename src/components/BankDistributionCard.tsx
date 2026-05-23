import { Card, Text, Stack, Group, SimpleGrid, SegmentedControl, ColorSwatch } from "@mantine/core";
import { DonutChart } from "@mantine/charts";
import { formatCurrency } from "../hooks/useCalculations";
import type { BankDistributionItem } from "../hooks/useHomePageData";

interface BankDistributionCardProps {
  bankDistribution: BankDistributionItem[];
  groupBy: "amount" | "interest";
  onGroupByChange: (value: "amount" | "interest") => void;
  scope: "active" | "all";
  onScopeChange: (value: "active" | "all") => void;
}

export default function BankDistributionCard({
  bankDistribution,
  groupBy,
  onGroupByChange,
  scope,
  onScopeChange,
}: BankDistributionCardProps) {
  if (bankDistribution.length === 0) return null;

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Text fw={600} mb="sm">
        銀行分佈
      </Text>
      <Stack gap="xs">
        <SegmentedControl
          size="xs"
          value={groupBy}
          onChange={(v) => onGroupByChange(v as "amount" | "interest")}
          data={[
            { label: "本金", value: "amount" },
            { label: "利息", value: "interest" },
          ]}
          fullWidth
        />
        <SegmentedControl
          size="xs"
          value={scope}
          onChange={(v) => onScopeChange(v as "active" | "all")}
          data={[
            { label: "進行中", value: "active" },
            { label: "全部", value: "all" },
          ]}
          fullWidth
          mb="sm"
        />
        <Stack align="center" gap="md">
          <DonutChart
            data={bankDistribution}
            size={200}
            thickness={30}
            withTooltip={false}
            pieProps={{ isAnimationActive: true, animationDuration: 500 }}
          />
          <SimpleGrid cols={2} spacing="xs" w="100%">
            {bankDistribution.map((item) => (
              <Group key={item.name} gap="xs" style={{ flexWrap: "nowrap" }}>
                <ColorSwatch
                  color={`var(--mantine-color-${item.color.replace(".", "-")})`}
                  size={10}
                  withShadow={false}
                />
                <Text size="xs">
                  {item.name} {formatCurrency(item.value)} {item.pct}%
                </Text>
              </Group>
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </Card>
  );
}

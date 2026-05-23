import { Card, Text } from "@mantine/core";
import { LineChart } from "@mantine/charts";

interface GrowthItem {
  month: string;
  累計利息: number;
}

interface InterestGrowthCardProps {
  growthData: GrowthItem[];
}

export default function InterestGrowthCard({ growthData }: InterestGrowthCardProps) {
  if (growthData.length <= 1) return null;

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Text fw={600} mb="md">
        利息累積走勢
      </Text>
      <LineChart
        h={200}
        data={growthData}
        dataKey="month"
        series={[{ name: "累計利息", color: "green.6" }]}
        tickLine="y"
        gridAxis="x"
        withDots={false}
        curveType="linear"
        yAxisProps={{
          tickFormatter: (v: number) => {
            if (v >= 100_000_000) return `$${(v / 100_000_000).toFixed(1)}億`;
            if (v >= 10_000) return `$${(v / 10_000).toFixed(1)}萬`;
            return `$${v}`;
          },
        }}
        valueFormatter={(v: number) =>
          `$${v.toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      />
    </Card>
  );
}

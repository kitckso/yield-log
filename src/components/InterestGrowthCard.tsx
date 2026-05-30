import { Card, Group, Text } from "@mantine/core";
import { LineChart } from "@mantine/charts";
import dayjs from "dayjs";
import { formatCurrency } from "../hooks/useCalculations";

interface GrowthItem {
  month: string;
  累計利息: number;
}

interface InterestGrowthCardProps {
  growthData: GrowthItem[];
}

export default function InterestGrowthCard({ growthData }: InterestGrowthCardProps) {
  if (growthData.length <= 1) return null;

  const todayMonth = dayjs().format("YYYY-MM");
  const todayEntry = growthData.find((d) => d.month === todayMonth);
  const hasToday = !!todayEntry;

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
        {...(hasToday
          ? {
              referenceLines: [
                {
                  x: todayMonth,
                  label: "今天",
                  color: "blue.5",
                  strokeDasharray: "6 4",
                },
              ],
            }
          : {})}
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
      {hasToday && (
        <Group
          justify="space-between"
          mt="sm"
          pt="sm"
          style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
        >
          <Text size="sm" c="dimmed">
            今日累計利息
          </Text>
          <Text size="sm" fw={600} c="green.7">
            {formatCurrency(todayEntry.累計利息)}
          </Text>
        </Group>
      )}
    </Card>
  );
}

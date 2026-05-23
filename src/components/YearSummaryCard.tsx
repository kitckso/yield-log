import { Card, Text, Stack, Group, SegmentedControl } from "@mantine/core";
import { BarChart } from "@mantine/charts";
import { formatCurrency } from "../hooks/useCalculations";

interface YearItem {
  year: string;
  count: number;
  amount: number;
  pending: number;
  received: number;
}

interface YearSummaryCardProps {
  yearSummary: YearItem[];
  yearChartData: { year: string; amount: number }[];
  yearGroupMode: string;
  onYearGroupModeChange: (value: "end" | "start") => void;
}

export default function YearSummaryCard({
  yearSummary,
  yearChartData,
  yearGroupMode,
  onYearGroupModeChange,
}: YearSummaryCardProps) {
  if (yearSummary.length <= 1) return null;

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Text fw={600} mb="md">
        年度摘要
      </Text>
      <SegmentedControl
        size="xs"
        value={yearGroupMode}
        onChange={(v) => onYearGroupModeChange(v as "end" | "start")}
        data={[
          { label: "按開戶日", value: "start" },
          { label: "按到期日", value: "end" },
        ]}
        fullWidth
        mb="md"
      />
      <BarChart
        h={160}
        data={yearChartData}
        dataKey="year"
        series={[{ name: "amount", color: "blue.6" }]}
        tickLine="y"
        gridAxis="x"
        withYAxis={false}
        withLegend={false}
        withTooltip={false}
      />
      <Stack gap="xs" mt="md">
        {yearSummary.map((y) => (
          <Group key={y.year} justify="space-between">
            <Text size="sm" fw={500}>
              {y.year}
            </Text>
            <Stack gap={0} align="end">
              <Text size="sm">{formatCurrency(y.amount)}</Text>
              <Text size="xs" c="dimmed">
                {y.count} 筆
              </Text>
              <Text size="xs" c="dimmed">
                {y.pending > 0 && `待收 ${formatCurrency(y.pending)}`}
                {y.pending > 0 && y.received > 0 && " · "}
                {y.received > 0 && `已收 ${formatCurrency(y.received)}`}
              </Text>
            </Stack>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

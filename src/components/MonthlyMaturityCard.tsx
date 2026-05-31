import { Card, Text, SegmentedControl } from "@mantine/core";
import { BarChart } from "@mantine/charts";

interface MaturityMonth {
  month: string;
  value: number;
}

interface MonthlyMaturityCardProps {
  maturityTimeline: MaturityMonth[];
  maturityGroupBy: "amount" | "interest";
  onMaturityGroupByChange: (value: "amount" | "interest") => void;
}

export default function MonthlyMaturityCard({
  maturityTimeline,
  maturityGroupBy,
  onMaturityGroupByChange,
}: MonthlyMaturityCardProps) {
  return (
    <Card padding="lg" radius="lg" withBorder>
      <Text fw={600} mb="md">
        每月到期{maturityGroupBy === "amount" ? "金額" : "利息"}
      </Text>
      <SegmentedControl
        size="xs"
        value={maturityGroupBy}
        onChange={(v) => onMaturityGroupByChange(v as "amount" | "interest")}
        data={[
          { label: "本金", value: "amount" },
          { label: "利息", value: "interest" },
        ]}
        fullWidth
        mb="md"
      />
      <BarChart
        h={200}
        data={maturityTimeline}
        dataKey="month"
        series={[
          { name: "value", color: "blue.6", label: maturityGroupBy === "amount" ? "金額" : "利息" },
        ]}
        tickLine="y"
        gridAxis="x"
        withYAxis={false}
        valueFormatter={(v: number) =>
          `$${v.toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      />
    </Card>
  );
}

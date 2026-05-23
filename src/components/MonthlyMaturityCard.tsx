import { Card, Text } from "@mantine/core";
import { BarChart } from "@mantine/charts";

interface MaturityMonth {
  month: string;
  金額: number;
}

interface MonthlyMaturityCardProps {
  maturityTimeline: MaturityMonth[];
}

export default function MonthlyMaturityCard({ maturityTimeline }: MonthlyMaturityCardProps) {
  return (
    <Card padding="lg" radius="lg" withBorder>
      <Text fw={600} mb="md">
        每月到期金額
      </Text>
      <BarChart
        h={200}
        data={maturityTimeline}
        dataKey="month"
        series={[{ name: "金額", color: "blue.6" }]}
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

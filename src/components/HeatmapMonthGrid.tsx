import { Card, SimpleGrid, Text } from "@mantine/core";
import dayjs from "dayjs";
import { formatCurrency } from "../hooks/useCalculations";
import type { HeatmapCell } from "../lib/heatmap";
import { CURRENT_COLOR, EMPTY_OPACITY, LEVEL_COLORS } from "./heatmapTheme";

interface HeatmapMonthGridProps {
  cells: HeatmapCell[];
  onSelect: (date: string) => void;
}

/** A card per month showing totals, interest and deposit count. */
export default function HeatmapMonthGrid({ cells, onSelect }: HeatmapMonthGridProps) {
  return (
    <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="xs">
      {cells.map((cell) => {
        const date = dayjs(cell.periodStart);
        const hasData = cell.amount > 0;
        return (
          <Card
            key={cell.key}
            padding="sm"
            radius="md"
            withBorder
            onClick={hasData ? () => onSelect(cell.periodStart) : undefined}
            onKeyDown={(e) => {
              if (hasData && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(cell.periodStart);
              }
            }}
            role={hasData ? "button" : undefined}
            tabIndex={hasData ? 0 : undefined}
            aria-label={
              hasData
                ? `${date.format("YYYY年M月")} 到期 ${formatCurrency(cell.amount)}，利息 ${formatCurrency(cell.interest)}，${cell.count} 筆`
                : undefined
            }
            style={{
              cursor: hasData ? "pointer" : "default",
              background: LEVEL_COLORS[cell.level],
              opacity: hasData || cell.isCurrent ? 1 : EMPTY_OPACITY,
              borderColor: cell.isCurrent ? CURRENT_COLOR : undefined,
              borderWidth: cell.isCurrent ? 2 : 1,
            }}
          >
            <Text size="xs" fw={600} c={hasData ? undefined : "dimmed"}>
              {date.format("M月")}
            </Text>
            <Text size="sm" fw={700} mt={2} style={{ wordBreak: "break-all" }}>
              {hasData ? formatCurrency(cell.amount) : "—"}
            </Text>
            <Text
              size="xs"
              mt={2}
              fw={600}
              c={hasData ? undefined : "dimmed"}
              style={{ wordBreak: "break-all" }}
            >
              {hasData ? `利息 ${formatCurrency(cell.interest)}` : "—"}
            </Text>
            <Text size="xs" mt={2} fw={700}>
              {cell.count} 筆
            </Text>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}

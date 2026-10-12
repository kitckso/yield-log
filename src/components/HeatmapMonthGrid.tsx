import { Card, SimpleGrid, Text } from "@mantine/core";
import dayjs from "dayjs";
import { formatMoney } from "../lib/money";
import type { MaturityBucket } from "../lib/maturityCalendar";
import { BAND_COLORS, BAND_TEXT_COLORS, CURRENT_COLOR, EMPTY_OPACITY } from "./heatmapTheme";

interface HeatmapMonthGridProps {
  buckets: MaturityBucket[];
  onSelect: (date: string) => void;
}

/** A card per month showing totals, interest and deposit count. */
export default function HeatmapMonthGrid({ buckets, onSelect }: HeatmapMonthGridProps) {
  return (
    <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="xs">
      {buckets.map((cell) => {
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
                ? `${date.format("YYYY年M月")} 到期 ${formatMoney(cell.amount)}，利息 ${formatMoney(cell.interest)}，${cell.count} 筆`
                : undefined
            }
            style={{
              cursor: hasData ? "pointer" : "default",
              background: BAND_COLORS[cell.band],
              opacity: hasData || cell.isCurrent ? 1 : EMPTY_OPACITY,
              borderColor: cell.isCurrent ? CURRENT_COLOR : undefined,
              borderWidth: cell.isCurrent ? 2 : 1,
            }}
          >
            {/* Mantine's Text always sets its own colour, so every line needs the
                band's foreground rather than inheriting one from the Card. */}
            <Text size="xs" fw={600} c={BAND_TEXT_COLORS[cell.band]}>
              {date.format("M月")}
            </Text>
            <Text
              size="sm"
              fw={700}
              mt={2}
              c={BAND_TEXT_COLORS[cell.band]}
              style={{ wordBreak: "break-all" }}
            >
              {hasData ? formatMoney(cell.amount) : "—"}
            </Text>
            <Text
              size="xs"
              mt={2}
              fw={600}
              c={BAND_TEXT_COLORS[cell.band]}
              style={{ wordBreak: "break-all" }}
            >
              {hasData ? `利息 ${formatMoney(cell.interest)}` : "—"}
            </Text>
            <Text size="xs" mt={2} fw={700} c={BAND_TEXT_COLORS[cell.band]}>
              {cell.count} 筆
            </Text>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}

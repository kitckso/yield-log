import { Group, Stack, Text, Tooltip } from "@mantine/core";
import dayjs from "dayjs";
import { formatMoney } from "../lib/money";
import type { MaturityBucket } from "../lib/maturityCalendar";
import { BAND_COLORS, CURRENT_BORDER, EMPTY_OPACITY, WEEK_LABEL_COL } from "./heatmapTheme";

interface HeatmapWeekListProps {
  monthGroups: { label: string; buckets: MaturityBucket[] }[];
  onSelect: (date: string) => void;
}

/** One row of week cells per month, labelled with the month name. */
export default function HeatmapWeekList({ monthGroups, onSelect }: HeatmapWeekListProps) {
  return (
    <Stack gap={5}>
      {monthGroups.map((group) => (
        <Group key={group.label} gap="xs" wrap="nowrap" align="center">
          <Text size="xs" w={WEEK_LABEL_COL} c="dimmed" ta="right">
            {group.label}
          </Text>
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            {group.buckets.map((cell) => {
              const hasData = cell.amount > 0;
              const start = dayjs(cell.periodStart);
              const end = dayjs(cell.periodEnd);
              const tooltipLabel = hasData
                ? `${start.format("M/D")} - ${end.format("M/D")}\n${formatMoney(cell.amount)} · ${cell.count} 筆`
                : `${start.format("M/D")} - ${end.format("M/D")}\n無到期`;
              return (
                <Tooltip key={cell.key} label={tooltipLabel} withArrow openDelay={150}>
                  <div
                    onClick={hasData ? () => onSelect(cell.periodStart) : undefined}
                    onKeyDown={(e) => {
                      if (hasData && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onSelect(cell.periodStart);
                      }
                    }}
                    role={hasData ? "button" : undefined}
                    tabIndex={hasData ? 0 : undefined}
                    aria-label={hasData ? tooltipLabel : undefined}
                    style={{
                      flex: 1,
                      height: 22,
                      borderRadius: 3,
                      background: BAND_COLORS[cell.band],
                      cursor: hasData ? "pointer" : "default",
                      opacity: hasData || cell.isCurrent ? 1 : EMPTY_OPACITY,
                      boxSizing: "border-box",
                      border: cell.isCurrent ? CURRENT_BORDER : "2px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "light-dark(var(--mantine-color-dark-9), var(--mantine-color-dark-1))",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    {`${start.format("D")}-${end.format("D")}`}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </Group>
      ))}
    </Stack>
  );
}

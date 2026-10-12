import { forwardRef } from "react";
import { Stack, Tooltip } from "@mantine/core";
import type { DayBucket, MonthLabel } from "../lib/maturityCalendar";
import { cellTooltip } from "./heatmapTooltip";
import {
  BAND_COLORS,
  CURRENT_BORDER,
  DAY_CELL_GAP,
  DAY_CELL_SIZE,
  EMPTY_OPACITY,
  LABEL_COL,
  MONTH_LABEL_HEIGHT,
  WEEKDAYS,
} from "./heatmapTheme";

interface HeatmapDayGridProps {
  buckets: DayBucket[];
  columnCount: number;
  monthLabels: MonthLabel[];
  onSelect: (date: string) => void;
}

/** The Sunday-start day grid, with a scroll container the parent auto-centres. */
const HeatmapDayGrid = forwardRef<HTMLDivElement, HeatmapDayGridProps>(function HeatmapDayGrid(
  { buckets, columnCount, monthLabels, onSelect },
  ref,
) {
  return (
    <div ref={ref} style={{ overflowX: "auto", overflowY: "hidden" }}>
      <div style={{ display: "flex", gap: DAY_CELL_GAP, width: "fit-content" }}>
        <Stack gap={DAY_CELL_GAP} style={{ width: LABEL_COL, flexShrink: 0 }}>
          <div style={{ height: MONTH_LABEL_HEIGHT }} />
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              style={{
                height: DAY_CELL_SIZE,
                fontSize: 9,
                color: "var(--mantine-color-dimmed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {w}
            </div>
          ))}
        </Stack>
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columnCount}, ${DAY_CELL_SIZE}px)`,
              columnGap: DAY_CELL_GAP,
              height: MONTH_LABEL_HEIGHT,
            }}
          >
            {monthLabels.map((m, i) => {
              const next = monthLabels[i + 1];
              const span = next ? next.column - m.column : columnCount - m.column;
              return (
                <div
                  key={`${m.column}-${m.label}`}
                  style={{
                    gridColumn: `${m.column + 1} / span ${span}`,
                    fontSize: 9,
                    color: "var(--mantine-color-dimmed)",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "flex-end",
                    paddingBottom: 1,
                  }}
                >
                  {m.label}
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columnCount}, ${DAY_CELL_SIZE}px)`,
              gridTemplateRows: `repeat(7, ${DAY_CELL_SIZE}px)`,
              columnGap: DAY_CELL_GAP,
              rowGap: DAY_CELL_GAP,
            }}
          >
            {buckets.map((bucket) => {
              const bg = BAND_COLORS[bucket.band];
              const hasData = bucket.amount > 0;
              const style: React.CSSProperties = {
                gridColumn: bucket.column + 1,
                gridRow: bucket.row + 1,
                width: DAY_CELL_SIZE,
                height: DAY_CELL_SIZE,
                padding: 0,
                border: "none",
                appearance: "none",
                backgroundColor: bg,
                borderRadius: 3,
                cursor: hasData ? "pointer" : "default",
                transition: "transform 0.1s",
                outline: bucket.isCurrent ? CURRENT_BORDER : undefined,
                outlineOffset: bucket.isCurrent ? -2 : undefined,
                opacity: hasData || bucket.isCurrent ? 1 : EMPTY_OPACITY,
              };
              if (!hasData) {
                return <div key={bucket.key} style={style} />;
              }
              return (
                <Tooltip key={bucket.key} label={cellTooltip(bucket)} withArrow openDelay={150}>
                  <button
                    type="button"
                    style={style}
                    onClick={() => onSelect(bucket.periodStart)}
                    aria-label={cellTooltip(bucket)}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export default HeatmapDayGrid;

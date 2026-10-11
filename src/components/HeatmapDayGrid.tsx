import { forwardRef } from "react";
import { Stack, Tooltip } from "@mantine/core";
import { cellTooltip } from "./heatmapTooltip";
import {
  CURRENT_BORDER,
  DAY_CELL_GAP,
  DAY_CELL_SIZE,
  EMPTY_OPACITY,
  LABEL_COL,
  LEVEL_COLORS,
  MONTH_LABEL_HEIGHT,
  WEEKDAYS,
  WEEKS_PER_YEAR,
  type DayCell,
} from "./heatmapTheme";

interface HeatmapDayGridProps {
  dayGrid: DayCell[][];
  monthLabels: { col: number; label: string }[];
  onSelect: (date: string) => void;
}

/** The 53-week day grid, with a scroll container the parent auto-centres. */
const HeatmapDayGrid = forwardRef<HTMLDivElement, HeatmapDayGridProps>(function HeatmapDayGrid(
  { dayGrid, monthLabels, onSelect },
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
              gridTemplateColumns: `repeat(${WEEKS_PER_YEAR}, ${DAY_CELL_SIZE}px)`,
              columnGap: DAY_CELL_GAP,
              height: MONTH_LABEL_HEIGHT,
            }}
          >
            {monthLabels.map((m, i) => {
              const next = monthLabels[i + 1];
              const span = next ? next.col - m.col : WEEKS_PER_YEAR - m.col;
              return (
                <div
                  key={`${m.col}-${m.label}`}
                  style={{
                    gridColumn: `${m.col + 1} / span ${span}`,
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
              gridTemplateColumns: `repeat(${WEEKS_PER_YEAR}, ${DAY_CELL_SIZE}px)`,
              gridTemplateRows: `repeat(7, ${DAY_CELL_SIZE}px)`,
              columnGap: DAY_CELL_GAP,
              rowGap: DAY_CELL_GAP,
            }}
          >
            {dayGrid.flatMap((rowCells, row) =>
              rowCells.map((cell, col) => {
                const bg = LEVEL_COLORS[cell.level];
                const hasData = cell.amount > 0;
                const style: React.CSSProperties = {
                  gridColumn: col + 1,
                  gridRow: row + 1,
                  width: DAY_CELL_SIZE,
                  height: DAY_CELL_SIZE,
                  padding: 0,
                  border: "none",
                  appearance: "none",
                  backgroundColor: bg,
                  borderRadius: 3,
                  cursor: hasData ? "pointer" : "default",
                  transition: "transform 0.1s",
                  outline: cell.isToday ? CURRENT_BORDER : undefined,
                  outlineOffset: cell.isToday ? -2 : undefined,
                  opacity: hasData || cell.isToday ? 1 : EMPTY_OPACITY,
                };
                if (!hasData) {
                  return <div key={cell.date} style={style} />;
                }
                return (
                  <Tooltip
                    key={cell.date}
                    label={cellTooltip(cell, "day")}
                    withArrow
                    openDelay={150}
                  >
                    <button
                      type="button"
                      style={style}
                      onClick={() => onSelect(cell.date)}
                      aria-label={cellTooltip(cell, "day")}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.4)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    />
                  </Tooltip>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default HeatmapDayGrid;

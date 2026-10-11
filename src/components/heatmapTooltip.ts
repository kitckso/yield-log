import dayjs from "dayjs";
import { formatCurrency } from "../hooks/useCalculations";
import type { HeatmapMode } from "../lib/heatmap";
import { WEEKDAYS, type DayCell } from "./heatmapTheme";

/** Tooltip text for a cell, phrased according to the active heatmap mode. */
export function cellTooltip(cell: DayCell, mode: HeatmapMode): string {
  if (mode === "day") {
    return `${dayjs(cell.date).format("YYYY年M月D日")} (${WEEKDAYS[dayjs(cell.date).day()]})\n${formatCurrency(cell.amount)}  ·  ${cell.count} 筆`;
  }
  if (mode === "week") {
    const sunday = dayjs(cell.date).subtract(dayjs(cell.date).day(), "day");
    const saturday = sunday.add(6, "day");
    return `${sunday.format("M月D日")} - ${saturday.format("M月D日")}\n${formatCurrency(cell.amount)}  ·  ${cell.count} 筆`;
  }
  return `${dayjs(cell.date).format("YYYY年M月")}\n${formatCurrency(cell.amount)}  ·  ${cell.count} 筆`;
}

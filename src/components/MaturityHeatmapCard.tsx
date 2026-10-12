import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Group, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import { formatCurrency } from "../hooks/useCalculations";
import {
  computeHeatmap,
  bucketKey,
  availableYears as availableHeatmapYears,
  depositsInPeriod,
  pooledThresholds,
  weekWindowClamped,
  weeksInYear,
  type HeatmapMode,
  type HeatmapCell,
  type Thresholds,
} from "../lib/heatmap";
import DepositListModal from "./DepositListModal";
import HeatmapDayGrid from "./HeatmapDayGrid";
import HeatmapWeekList from "./HeatmapWeekList";
import HeatmapMonthGrid from "./HeatmapMonthGrid";
import { DAY_CELL_GAP, DAY_CELL_SIZE, LABEL_COL, LEVEL_COLORS, type DayCell } from "./heatmapTheme";
import type { DepositWithBank } from "../types";

interface MaturityHeatmapCardProps {
  deposits: DepositWithBank[];
}

const MODE_LABELS: { label: string; value: HeatmapMode }[] = [
  { label: "按日", value: "day" },
  { label: "按週", value: "week" },
  { label: "按月", value: "month" },
];

/** Compact HKD figure for a legend cut-point, e.g. 120000 -> "120K". */
function formatThreshold(value: number): string {
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${+(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];

/** Snaps a cut-point to a figure a person would round to by hand, e.g. 66800 -> 70000. */
function niceBoundary(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  let best = magnitude;
  for (const step of NICE_STEPS) {
    const candidate = step * magnitude;
    if (Math.abs(candidate - value) < Math.abs(best - value)) best = candidate;
  }
  return best;
}

/**
 * One label per band, upper-bound first, with the open-ended top band last:
 * ["<=70K", "<=150K", ">150K"].
 */
function formatBands(t: Thresholds): string[] {
  let previous = 0;
  const labels = [t.q1, t.q2].map((v) => {
    const nice = niceBoundary(v);
    const bound = nice > previous ? nice : v;
    previous = bound;
    return `≤${formatThreshold(bound)}`;
  });
  labels.push(`>${formatThreshold(previous)}`);
  return labels;
}

export default function MaturityHeatmapCard({ deposits }: MaturityHeatmapCardProps) {
  const [year, setYear] = useState<number>(() => dayjs().year());
  const [mode, setMode] = useState<HeatmapMode>("day");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => dayjs().startOf("day"), []);
  const yearStart = useMemo(() => dayjs(`${year}-01-01`, "YYYY-MM-DD", true), [year]);
  const yearEnd = useMemo(() => dayjs(`${year}-12-31`, "YYYY-MM-DD", true), [year]);
  const weekStart = useMemo(() => yearStart.subtract(yearStart.day(), "day"), [yearStart]);
  const columnCount = useMemo(() => weeksInYear(year), [year]);

  const availableYears = useMemo(() => availableHeatmapYears(deposits), [deposits]);

  const yearHasData = useMemo(
    () => deposits.some((d) => d.end_date.startsWith(`${year}-`)),
    [deposits, year],
  );

  const thresholds = useMemo(() => pooledThresholds(deposits, mode), [deposits, mode]);
  const bandLabels = useMemo(() => (thresholds ? formatBands(thresholds) : []), [thresholds]);

  const allCells = useMemo(
    () => computeHeatmap(deposits, year, mode, thresholds),
    [deposits, year, mode, thresholds],
  );

  const dayGrid = useMemo<DayCell[][]>(() => {
    const cellMap = new Map(allCells.map((c) => [c.key, c]));
    const result: DayCell[][] = [];
    for (let r = 0; r < 7; r++) {
      const row: DayCell[] = [];
      for (let c = 0; c < columnCount; c++) {
        const date = weekStart.add(c * 7 + r, "day");
        const dateStr = date.format("YYYY-MM-DD");
        const inYear = mode !== "day" || date.year() === year;
        const key = bucketKey(date, mode);
        const heatCell = cellMap.get(key);
        row.push({
          date: dateStr,
          amount: inYear ? (heatCell?.amount ?? 0) : 0,
          count: inYear ? (heatCell?.count ?? 0) : 0,
          level: inYear ? (heatCell?.level ?? 0) : 0,
          isToday: dayjs(dateStr).isSame(today, "day"),
        });
      }
      result.push(row);
    }
    return result;
  }, [allCells, year, mode, weekStart, today, columnCount]);

  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let col = 0; col < columnCount; col++) {
      const date = weekStart.add(col * 7, "day");
      if (date.year() !== year) continue;
      const m = date.month();
      if (m !== lastMonth) {
        labels.push({ col, label: `${m + 1}月` });
        lastMonth = m;
      }
    }
    return labels;
  }, [weekStart, year, columnCount]);

  const periodLabelText = useMemo(() => {
    if (mode === "day") return "天";
    if (mode === "week") return "週";
    return "月";
  }, [mode]);

  const yearDeposits = useMemo(
    () => deposits.filter((d) => d.end_date.startsWith(`${year}-`)),
    [deposits, year],
  );

  const totalAmount = useMemo(() => yearDeposits.reduce((s, d) => s + d.amount, 0), [yearDeposits]);
  const peakAmount = useMemo(() => {
    const periodTotals = new Map<string, number>();
    yearDeposits.forEach((d) => {
      const pk = bucketKey(dayjs(d.end_date, "YYYY-MM-DD", true), mode);
      periodTotals.set(pk, (periodTotals.get(pk) ?? 0) + d.amount);
    });
    return Math.max(0, ...periodTotals.values());
  }, [yearDeposits, mode]);
  const activeCount = useMemo(() => {
    const periods = new Set<string>();
    yearDeposits.forEach((d) => {
      periods.add(bucketKey(dayjs(d.end_date, "YYYY-MM-DD", true), mode));
    });
    return periods.size;
  }, [yearDeposits, mode]);

  const selectedDeposits = useMemo(() => {
    if (!selectedDate) return [];
    return depositsInPeriod(
      deposits,
      dayjs(selectedDate, "YYYY-MM-DD", true),
      mode,
      yearStart,
      yearEnd,
    );
  }, [selectedDate, deposits, mode, yearStart, yearEnd]);

  const weekMonthGroups = useMemo(() => {
    const monthGroups = new Map<string, HeatmapCell[]>();
    allCells.forEach((cell) => {
      if (dayjs(cell.periodStart, "YYYY-MM-DD", true).year() !== year) return;
      const monthKey = dayjs(cell.periodStart, "YYYY-MM-DD", true).format("M月");
      if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, []);
      monthGroups.get(monthKey)!.push(cell);
    });
    return Array.from(monthGroups.entries());
  }, [allCells, year]);

  useEffect(() => {
    if (mode !== "day") return;
    if (today.year() !== year) return;
    const container = dayScrollRef.current;
    if (!container) return;
    const daysSinceStart = today.diff(weekStart, "day");
    if (daysSinceStart < 0) return;
    const todayCol = Math.floor(daysSinceStart / 7);
    const todayX = LABEL_COL + todayCol * (DAY_CELL_SIZE + DAY_CELL_GAP);
    const visibleWidth = container.clientWidth;
    const target = Math.max(0, todayX - visibleWidth / 2 + DAY_CELL_SIZE / 2);
    container.scrollLeft = target;
  }, [mode, year, today, weekStart]);

  const modalTitle = (() => {
    if (!selectedDate) return "";
    const selected = dayjs(selectedDate, "YYYY-MM-DD", true);
    if (mode === "day") return `${selected.format("YYYY年M月D日")} 到期記錄`;
    if (mode === "week") {
      const { start, end } = weekWindowClamped(selected, yearStart, yearEnd);
      return `${start.format("M月D日")} - ${end.format("M月D日")} 到期記錄`;
    }
    return `${selected.format("YYYY年M月")} 到期記錄`;
  })();

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text fw={600}>到期熱力圖</Text>
          <SegmentedControl
            size="xs"
            value={mode}
            onChange={(v) => setMode(v as HeatmapMode)}
            data={MODE_LABELS}
          />
        </Group>

        <SegmentedControl
          size="xs"
          value={String(year)}
          onChange={(v) => setYear(Number(v))}
          data={availableYears.map((y) => ({ label: `${y}`, value: String(y) }))}
          styles={{ root: { minWidth: 140 } }}
        />

        {!yearHasData ? (
          <Stack align="center" py="lg" gap={4}>
            <Text c="dimmed" size="sm">
              {year} 年沒有到期記錄
            </Text>
            <Text c="dimmed" size="xs">
              切換至有資料的年份查看
            </Text>
          </Stack>
        ) : mode === "day" ? (
          <HeatmapDayGrid
            ref={dayScrollRef}
            dayGrid={dayGrid}
            columnCount={columnCount}
            monthLabels={monthLabels}
            onSelect={setSelectedDate}
          />
        ) : mode === "week" ? (
          <HeatmapWeekList monthGroups={weekMonthGroups} onSelect={setSelectedDate} />
        ) : (
          <HeatmapMonthGrid cells={allCells} onSelect={setSelectedDate} />
        )}

        {yearHasData && (
          <>
            {/* Legend sits directly under the grid so it stays next to what it explains,
                rather than being pushed below the stat cards on narrow screens. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 4,
              }}
            >
              {([1, 2, 3] as const).map((lvl, i) => (
                <div key={lvl} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2,
                      flexShrink: 0,
                      backgroundColor: LEVEL_COLORS[lvl],
                    }}
                  />
                  {bandLabels[i] !== undefined && (
                    <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
                      {bandLabels[i]}
                    </Text>
                  )}
                </div>
              ))}
            </div>

            <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xs">
              <Card padding="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">
                  累計到期
                </Text>
                <Text fw={700} size="sm" mt={2} style={{ wordBreak: "break-all" }}>
                  {formatCurrency(totalAmount)}
                </Text>
              </Card>
              <Card padding="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">
                  單{periodLabelText}峰值
                </Text>
                <Text fw={700} size="sm" mt={2} style={{ wordBreak: "break-all" }}>
                  {peakAmount > 0 ? formatCurrency(peakAmount) : "—"}
                </Text>
              </Card>
              <Card padding="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">
                  活躍{periodLabelText}數
                </Text>
                <Text fw={700} size="sm" mt={2}>
                  {activeCount}
                </Text>
              </Card>
            </SimpleGrid>
          </>
        )}
      </Stack>

      <DepositListModal
        opened={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={modalTitle}
        deposits={selectedDeposits}
      />
    </Card>
  );
}

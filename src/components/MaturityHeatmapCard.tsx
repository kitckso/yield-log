import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Group, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import { formatCurrency } from "../hooks/useCalculations";
import {
  computeHeatmap,
  bucketKey,
  availableYears as availableHeatmapYears,
  depositsInPeriod,
  weekWindowClamped,
  type HeatmapMode,
  type HeatmapCell,
} from "../lib/heatmap";
import DepositListModal from "./DepositListModal";
import HeatmapDayGrid from "./HeatmapDayGrid";
import HeatmapWeekList from "./HeatmapWeekList";
import HeatmapMonthGrid from "./HeatmapMonthGrid";
import {
  DAY_CELL_GAP,
  DAY_CELL_SIZE,
  LABEL_COL,
  LEVEL_COLORS,
  WEEKS_PER_YEAR,
  type DayCell,
} from "./heatmapTheme";
import type { DepositWithBank } from "../types";

interface MaturityHeatmapCardProps {
  deposits: DepositWithBank[];
}

const MODE_LABELS: { label: string; value: HeatmapMode }[] = [
  { label: "按日", value: "day" },
  { label: "按週", value: "week" },
  { label: "按月", value: "month" },
];

export default function MaturityHeatmapCard({ deposits }: MaturityHeatmapCardProps) {
  const [year, setYear] = useState<number>(() => dayjs().year());
  const [mode, setMode] = useState<HeatmapMode>("day");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => dayjs().startOf("day"), []);
  const yearStart = useMemo(() => dayjs(`${year}-01-01`, "YYYY-MM-DD", true), [year]);
  const yearEnd = useMemo(() => dayjs(`${year}-12-31`, "YYYY-MM-DD", true), [year]);
  const weekStart = useMemo(() => yearStart.subtract(yearStart.day(), "day"), [yearStart]);

  const availableYears = useMemo(() => availableHeatmapYears(deposits), [deposits]);

  const yearHasData = useMemo(
    () => deposits.some((d) => d.end_date.startsWith(`${year}-`)),
    [deposits, year],
  );

  const allCells = useMemo(() => computeHeatmap(deposits, year, mode), [deposits, year, mode]);

  const dayGrid = useMemo<DayCell[][]>(() => {
    const cellMap = new Map(allCells.map((c) => [c.key, c]));
    const result: DayCell[][] = [];
    for (let r = 0; r < 7; r++) {
      const row: DayCell[] = [];
      for (let c = 0; c < WEEKS_PER_YEAR; c++) {
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
  }, [allCells, year, mode, weekStart, today]);

  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let col = 0; col < WEEKS_PER_YEAR; col++) {
      const date = weekStart.add(col * 7, "day");
      if (date.year() !== year) continue;
      const m = date.month();
      if (m !== lastMonth) {
        labels.push({ col, label: `${m + 1}月` });
        lastMonth = m;
      }
    }
    return labels;
  }, [weekStart, year]);

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

            <Group justify="center" gap={6}>
              <Text size="xs" c="dimmed">
                少
              </Text>
              {([1, 2, 3, 4] as const).map((lvl) => (
                <div
                  key={lvl}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 2,
                    backgroundColor: LEVEL_COLORS[lvl],
                  }}
                />
              ))}
              <Text size="xs" c="dimmed">
                多
              </Text>
            </Group>
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

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Group, SegmentedControl, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import dayjs from "dayjs";
import { formatCurrency } from "../hooks/useCalculations";
import { computeHeatmap, bucketKey, type HeatmapMode, type HeatmapCell } from "../lib/heatmap";
import DepositListModal from "./DepositListModal";
import type { DepositWithBank } from "../types";

interface MaturityHeatmapCardProps {
  deposits: DepositWithBank[];
}

type Level = 0 | 1 | 2 | 3 | 4;

interface DayCell {
  date: string;
  amount: number;
  count: number;
  level: Level;
  isToday: boolean;
}

const LEVEL_COLORS: Record<Level, string> = {
  0: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
  1: "light-dark(var(--mantine-color-orange-1), var(--mantine-color-orange-8))",
  2: "light-dark(var(--mantine-color-orange-3), var(--mantine-color-orange-6))",
  3: "light-dark(var(--mantine-color-orange-6), var(--mantine-color-orange-4))",
  4: "light-dark(var(--mantine-color-orange-8), var(--mantine-color-orange-2))",
};

const CURRENT_BORDER = "2px solid var(--mantine-color-blue-6)";
const EMPTY_OPACITY = 0.5;

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const DAY_CELL_SIZE = 14;
const DAY_CELL_GAP = 2;
const LABEL_COL = 14;
const MONTH_LABEL_HEIGHT = 14;
const WEEK_LABEL_COL = 28;
const WEEKS_PER_YEAR = 53;

export default function MaturityHeatmapCard({ deposits }: MaturityHeatmapCardProps) {
  const [year, setYear] = useState<number>(dayjs().year());
  const [mode, setMode] = useState<HeatmapMode>("day");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => dayjs().startOf("day"), []);
  const yearStart = useMemo(() => dayjs(`${year}-01-01`, "YYYY-MM-DD", true), [year]);
  const weekStart = useMemo(() => yearStart.subtract(yearStart.day(), "day"), [yearStart]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    deposits.forEach((d) => years.add(Number(d.end_date.slice(0, 4))));
    years.add(dayjs().year());
    return Array.from(years).sort((a, b) => a - b);
  }, [deposits]);

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
    const selected = dayjs(selectedDate, "YYYY-MM-DD", true);
    return deposits
      .filter((d) => {
        const end = dayjs(d.end_date, "YYYY-MM-DD", true);
        if (mode === "day") return end.isSame(selected, "day");
        if (mode === "week") {
          const start = selected.subtract((selected.day() + 6) % 7, "day");
          const weekEnd = start.add(6, "day");
          return !end.isBefore(start) && !end.isAfter(weekEnd) && end.year() === year;
        }
        return end.year() === selected.year() && end.month() === selected.month();
      })
      .sort((a, b) => a.end_date.localeCompare(b.end_date));
  }, [selectedDate, deposits, mode, year]);

  const cellTooltip = (cell: DayCell) => {
    if (mode === "day") {
      return `${dayjs(cell.date).format("YYYY年M月D日")} (${WEEKDAYS[dayjs(cell.date).day()]})\n${formatCurrency(cell.amount)}  ·  ${cell.count} 筆`;
    }
    if (mode === "week") {
      const sunday = dayjs(cell.date).subtract(dayjs(cell.date).day(), "day");
      const saturday = sunday.add(6, "day");
      return `${sunday.format("M月D日")} - ${saturday.format("M月D日")}\n${formatCurrency(cell.amount)}  ·  ${cell.count} 筆`;
    }
    return `${dayjs(cell.date).format("YYYY年M月")}\n${formatCurrency(cell.amount)}  ·  ${cell.count} 筆`;
  };

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

  function renderDayGrid() {
    return (
      <div
        ref={dayScrollRef}
        style={{
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: DAY_CELL_GAP,
            width: "fit-content",
          }}
        >
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
                    backgroundColor: bg,
                    borderRadius: 3,
                    cursor: hasData ? "pointer" : "default",
                    transition: "transform 0.1s",
                    outline: cell.isToday ? "1.5px solid var(--mantine-color-blue-6)" : undefined,
                    outlineOffset: cell.isToday ? -1 : undefined,
                    opacity: hasData ? 1 : EMPTY_OPACITY,
                  };
                  if (!hasData) {
                    return <div key={cell.date} style={style} />;
                  }
                  return (
                    <Tooltip key={cell.date} label={cellTooltip(cell)} withArrow openDelay={150}>
                      <div
                        style={style}
                        onClick={() => setSelectedDate(cell.date)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedDate(cell.date);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={cellTooltip(cell)}
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
  }

  function renderWeekList() {
    const monthGroups = new Map<string, HeatmapCell[]>();
    allCells.forEach((cell) => {
      const monthKey = dayjs(cell.periodStart, "YYYY-MM-DD", true).format("M月");
      if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, []);
      monthGroups.get(monthKey)!.push(cell);
    });
    return (
      <Stack gap={5}>
        {Array.from(monthGroups.entries()).map(([monthLabel, cells]) => (
          <Group key={monthLabel} gap="xs" wrap="nowrap" align="center">
            <Text size="xs" w={WEEK_LABEL_COL} c="dimmed" ta="right">
              {monthLabel}
            </Text>
            <div style={{ display: "flex", gap: 4, flex: 1 }}>
              {cells.map((cell) => {
                const hasData = cell.amount > 0;
                const start = dayjs(cell.periodStart);
                const end = dayjs(cell.periodEnd);
                const tooltipLabel = hasData
                  ? `${start.format("M/D")} - ${end.format("M/D")}\n${formatCurrency(cell.amount)} · ${cell.count} 筆`
                  : `${start.format("M/D")} - ${end.format("M/D")}\n無到期`;
                return (
                  <Tooltip key={cell.key} label={tooltipLabel} withArrow openDelay={150}>
                    <div
                      onClick={hasData ? () => setSelectedDate(cell.periodStart) : undefined}
                      onKeyDown={(e) => {
                        if (hasData && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          setSelectedDate(cell.periodStart);
                        }
                      }}
                      role={hasData ? "button" : undefined}
                      tabIndex={hasData ? 0 : undefined}
                      aria-label={hasData ? tooltipLabel : undefined}
                      style={{
                        flex: 1,
                        height: 22,
                        borderRadius: 3,
                        background: LEVEL_COLORS[cell.level],
                        cursor: hasData ? "pointer" : "default",
                        opacity: hasData ? 1 : EMPTY_OPACITY,
                        boxSizing: "border-box",
                        border: cell.isCurrent ? CURRENT_BORDER : "2px solid transparent",
                      }}
                    />
                  </Tooltip>
                );
              })}
            </div>
          </Group>
        ))}
      </Stack>
    );
  }

  function renderMonthGrid() {
    return (
      <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="xs">
        {allCells.map((cell) => {
          const date = dayjs(cell.periodStart);
          const hasData = cell.amount > 0;
          return (
            <Card
              key={cell.key}
              padding="sm"
              radius="md"
              withBorder
              onClick={hasData ? () => setSelectedDate(cell.periodStart) : undefined}
              onKeyDown={(e) => {
                if (hasData && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setSelectedDate(cell.periodStart);
                }
              }}
              role={hasData ? "button" : undefined}
              tabIndex={hasData ? 0 : undefined}
              aria-label={
                hasData
                  ? `${date.format("YYYY年M月")} ${formatCurrency(cell.amount)} ${cell.count} 筆`
                  : undefined
              }
              style={{
                cursor: hasData ? "pointer" : "default",
                background: LEVEL_COLORS[cell.level],
                opacity: hasData ? 1 : EMPTY_OPACITY,
                borderColor: cell.isCurrent ? "var(--mantine-color-blue-5)" : undefined,
                borderWidth: cell.isCurrent ? 2 : 1,
              }}
            >
              <Text size="xs" fw={600} c={hasData ? undefined : "dimmed"}>
                {date.format("M月")}
              </Text>
              <Text size="sm" fw={700} mt={2} style={{ wordBreak: "break-all" }}>
                {hasData ? formatCurrency(cell.amount) : "—"}
              </Text>
              <Text size="xs" c={hasData ? "dimmed" : undefined} mt={2}>
                {cell.count} 筆
              </Text>
            </Card>
          );
        })}
      </SimpleGrid>
    );
  }

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text fw={600}>到期熱力圖</Text>
          <SegmentedControl
            size="xs"
            value={mode}
            onChange={(v) => setMode(v as HeatmapMode)}
            data={[
              { label: "按日", value: "day" },
              { label: "按週", value: "week" },
              { label: "按月", value: "month" },
            ]}
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
          renderDayGrid()
        ) : mode === "week" ? (
          renderWeekList()
        ) : (
          renderMonthGrid()
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
        title={(() => {
          if (!selectedDate) return "";
          const selected = dayjs(selectedDate, "YYYY-MM-DD", true);
          if (mode === "day") return `${selected.format("YYYY年M月D日")} 到期記錄`;
          if (mode === "week") {
            const sunday = selected.subtract(selected.day(), "day");
            const saturday = sunday.add(6, "day");
            return `${sunday.format("M月D日")} - ${saturday.format("M月D日")} 到期記錄`;
          }
          return `${selected.format("YYYY年M月")} 到期記錄`;
        })()}
        deposits={selectedDeposits}
      />
    </Card>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Modal,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatCurrency, isMatured } from "../hooks/useCalculations";
import { computeHeatmap, bucketKey, type HeatmapMode } from "../lib/heatmap";
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
  0: "var(--mantine-color-gray-2)",
  1: "var(--mantine-color-orange-1)",
  2: "var(--mantine-color-orange-3)",
  3: "var(--mantine-color-orange-6)",
  4: "var(--mantine-color-orange-8)",
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

const CELL_GAP = 2;
const LABEL_COL = 18;
const SIDE_PADDING = 0;
const TARGET_CELL = 22;
const TOTAL_WEEKS = 53;

function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    setWidth(ref.current.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

export default function MaturityHeatmapCard({ deposits }: MaturityHeatmapCardProps) {
  const navigate = useNavigate();
  const [year, setYear] = useState<number>(dayjs().year());
  const [mode, setMode] = useState<HeatmapMode>("day");
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>();

  const today = useMemo(() => dayjs().startOf("day"), []);

  const yearStart = useMemo(() => dayjs(`${year}-01-01`, "YYYY-MM-DD", true), [year]);
  const yearEnd = useMemo(() => dayjs(`${year}-12-31`, "YYYY-MM-DD", true), [year]);
  const firstMonday = useMemo(
    () => yearStart.subtract((yearStart.day() + 6) % 7, "day"),
    [yearStart],
  );

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

  const columnsPerPage = useMemo(() => {
    if (containerWidth <= 0) return 26;
    const usable = containerWidth - LABEL_COL - SIDE_PADDING * 2;
    return Math.max(7, Math.floor(usable / (TARGET_CELL + CELL_GAP)));
  }, [containerWidth]);

  const totalPages = Math.ceil(TOTAL_WEEKS / columnsPerPage);
  const clampedPageIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));
  const startWeek = clampedPageIndex * columnsPerPage;
  const pageColCount = Math.min(columnsPerPage, TOTAL_WEEKS - startWeek);

  // Default to the page containing today on initial mount (after layout measurement)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    if (containerWidth <= 0) return; // wait for actual layout measurement
    const todayMonday = today.subtract((today.day() + 6) % 7, "day");
    const weekOffset = todayMonday.diff(firstMonday, "day") / 7;
    if (weekOffset > 0) {
      const page = Math.floor(weekOffset / columnsPerPage);
      if (page > 0 && page < totalPages) {
        setPageIndex(page);
      }
    }
    hasInitialized.current = true;
  }, [columnsPerPage, containerWidth, today, firstMonday, totalPages]);

  // Jump to today's page when mode changes
  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      if (containerWidth > 0) {
        const todayMonday = today.subtract((today.day() + 6) % 7, "day");
        const weekOffset = todayMonday.diff(firstMonday, "day") / 7;
        if (weekOffset > 0) {
          const page = Math.floor(weekOffset / columnsPerPage);
          if (page > 0 && page < totalPages) {
            setPageIndex(page);
          }
        }
      }
    }
  }, [mode, containerWidth, today, firstMonday, columnsPerPage, totalPages]);

  // Reset to page 0 when year changes
  useEffect(() => {
    setPageIndex(0);
  }, [year]);

  const allCells = useMemo(() => computeHeatmap(deposits, year, mode), [deposits, year, mode]);

  const grid = useMemo(() => {
    const cellMap = new Map(allCells.map((c) => [c.key, c]));
    const result: DayCell[][] = [];

    for (let r = 0; r < 7; r++) {
      const row: DayCell[] = [];
      for (let c = 0; c < pageColCount; c++) {
        const date = firstMonday.add((startWeek + c) * 7 + r, "day");
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
  }, [allCells, year, mode, firstMonday, startWeek, pageColCount, today]);

  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let col = 0; col < pageColCount; col++) {
      const date = firstMonday.add((startWeek + col) * 7, "day");
      if (date.year() !== year) continue;
      const m = date.month();
      if (m !== lastMonth) {
        labels.push({ col, label: `${m + 1}月` });
        lastMonth = m;
      }
    }
    return labels;
  }, [year, firstMonday, startWeek, pageColCount]);

  const pageRangeLabel = useMemo(() => {
    let startDate = firstMonday.add(startWeek * 7, "day");
    let endDate = firstMonday.add((startWeek + pageColCount - 1) * 7 + 6, "day");
    if (startDate.isBefore(yearStart)) startDate = yearStart;
    if (endDate.isAfter(yearEnd)) endDate = yearEnd;
    const startLabel = startDate.format("M月");
    const endLabel = endDate.format("M月");
    if (startLabel === endLabel) return startLabel;
    return `${startLabel} - ${endLabel}`;
  }, [firstMonday, startWeek, pageColCount, yearStart, yearEnd]);

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
      return `${dayjs(cell.date).format("YYYY年M月D日")} (${WEEKDAYS[(dayjs(cell.date).day() + 6) % 7]})\n${formatCurrency(cell.amount)}  ·  ${cell.count} 筆`;
    }
    if (mode === "week") {
      const monday = dayjs(cell.date).subtract((dayjs(cell.date).day() + 6) % 7, "day");
      const sunday = monday.add(6, "day");
      return `${monday.format("M月D日")} - ${sunday.format("M月D日")}\n${formatCurrency(cell.amount)}  ·  ${cell.count} 筆`;
    }
    return `${dayjs(cell.date).format("YYYY年M月")}\n${formatCurrency(cell.amount)}  ·  ${cell.count} 筆`;
  };

  const cellSize = TARGET_CELL;

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

        <Group justify="space-between" wrap="wrap" gap="xs">
          <SegmentedControl
            size="xs"
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            data={availableYears.map((y) => ({ label: `${y}`, value: String(y) }))}
            styles={{ root: { minWidth: 140 } }}
          />
          {totalPages > 1 && (
            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                size="sm"
                disabled={clampedPageIndex === 0}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                aria-label="上一段"
              >
                <IconChevronLeft size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed" style={{ minWidth: 110, textAlign: "center" }}>
                {pageRangeLabel}
              </Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                disabled={clampedPageIndex >= totalPages - 1}
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                aria-label="下一段"
              >
                <IconChevronRight size={16} />
              </ActionIcon>
            </Group>
          )}
        </Group>

        {!yearHasData ? (
          <Stack align="center" py="lg" gap={4}>
            <Text c="dimmed" size="sm">
              {year} 年沒有到期記錄
            </Text>
            <Text c="dimmed" size="xs">
              切換至有資料的年份查看
            </Text>
          </Stack>
        ) : (
          <div ref={containerRef} style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                gap: CELL_GAP,
                width: "fit-content",
                maxWidth: "100%",
              }}
            >
              <Stack gap={mode === "day" ? CELL_GAP : 0} style={{ width: LABEL_COL }}>
                <div style={{ height: 14 }} />
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    style={{
                      height: cellSize,
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${pageColCount}, ${cellSize}px)`,
                  gridTemplateRows: `14px repeat(7, ${cellSize}px)`,
                  columnGap: CELL_GAP,
                  rowGap: mode === "day" ? CELL_GAP : 0,
                }}
              >
                {monthLabels.map((m, i) => {
                  const next = monthLabels[i + 1];
                  const span = next ? next.col - m.col : pageColCount - m.col;
                  return (
                    <div
                      key={`${m.col}-${m.label}`}
                      style={{
                        gridColumn: `${m.col + 1} / span ${span}`,
                        gridRow: 1,
                        fontSize: 10,
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
                {grid.flatMap((rowCells, row) =>
                  rowCells.map((cell, col) => {
                    const bg = LEVEL_COLORS[cell.level];
                    const hasData = cell.amount > 0;
                    const showToday = cell.isToday;
                    const isAggregated = mode !== "day";
                    const radius = isAggregated
                      ? row === 0
                        ? "2px 2px 0 0"
                        : row === 6
                          ? "0 0 2px 2px"
                          : 0
                      : 2;
                    const style: React.CSSProperties = {
                      gridColumn: col + 1,
                      gridRow: row + 2,
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bg,
                      borderRadius: radius,
                      cursor: hasData ? "pointer" : "default",
                      transition: "transform 0.1s",
                      boxShadow: showToday
                        ? "inset 0 0 0 2px var(--mantine-color-blue-7)"
                        : undefined,
                    };
                    if (!hasData) {
                      return <div key={cell.date} style={style} />;
                    }
                    return (
                      <Tooltip key={cell.date} label={cellTooltip(cell)} withArrow openDelay={150}>
                        <div
                          style={style}
                          onClick={() => setSelectedDate(cell.date)}
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

      <Modal
        opened={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={(() => {
          if (!selectedDate) return "";
          const selected = dayjs(selectedDate, "YYYY-MM-DD", true);
          if (mode === "day") return `${selected.format("YYYY年M月D日")} 到期記錄`;
          if (mode === "week") {
            const monday = selected.subtract((selected.day() + 6) % 7, "day");
            const sunday = monday.add(6, "day");
            return `${monday.format("M月D日")} - ${sunday.format("M月D日")} 到期記錄`;
          }
          return `${selected.format("YYYY年M月")} 到期記錄`;
        })()}
        radius="lg"
        size="sm"
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        styles={{
          content: {
            maxHeight: "calc(100dvh - var(--modal-y-offset, 5dvh) - 140px)",
            overflow: "hidden",
          },
          body: {
            maxHeight: "calc(100dvh - var(--modal-y-offset, 5dvh) - 200px)",
          },
        }}
      >
        <Stack gap="xs">
          {selectedDeposits.map((d) => {
            const matured = isMatured(d.end_date);
            return (
              <div
                key={d.id}
                onClick={() => {
                  void navigate(`/deposits/${d.id}/detail`);
                  setSelectedDate(null);
                }}
                style={{
                  borderLeft: `4px solid ${
                    matured ? "var(--mantine-color-gray-4)" : "var(--mantine-color-teal-5)"
                  }`,
                  padding: "8px 12px",
                  borderRadius: 6,
                  opacity: matured ? 0.6 : 1,
                  cursor: "pointer",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-0)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Group justify="space-between" wrap="nowrap" mb={4}>
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm" fw={700}>
                      {dayjs(d.end_date).format("M月D日")}
                    </Text>
                    <Badge size="sm" variant="light" color="gray" radius="sm" fw={500}>
                      {d.bank_name}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {d.interest_rate}%
                  </Text>
                </Group>
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={700}>
                    {formatCurrency(d.amount)}
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <Text size="xs" c="dimmed">
                      利息
                    </Text>
                    <Text size="xs" c="green" fw={700}>
                      {formatCurrency(d.interest)}
                    </Text>
                  </Group>
                </Group>
              </div>
            );
          })}
        </Stack>
      </Modal>
    </Card>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Group, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import { formatMoney } from "../lib/money";
import {
  availableMaturityYears,
  bucketLabel,
  buildMaturityCalendar,
  depositsInBucket,
  type MaturityMode,
} from "../lib/maturityCalendar";
import DepositListModal from "./DepositListModal";
import HeatmapDayGrid from "./HeatmapDayGrid";
import HeatmapWeekList from "./HeatmapWeekList";
import HeatmapMonthGrid from "./HeatmapMonthGrid";
import { formatBands } from "./heatmapLegend";
import { BAND_COLORS, DAY_CELL_GAP, DAY_CELL_SIZE, LABEL_COL } from "./heatmapTheme";
import type { DepositWithBank } from "../types";

interface MaturityHeatmapCardProps {
  deposits: DepositWithBank[];
}

const MODE_LABELS: { label: string; value: MaturityMode }[] = [
  { label: "按日", value: "day" },
  { label: "按週", value: "week" },
  { label: "按月", value: "month" },
];

const PERIOD_LABELS: Record<MaturityMode, string> = {
  day: "天",
  week: "週",
  month: "月",
};

export default function MaturityHeatmapCard({ deposits }: MaturityHeatmapCardProps) {
  const [year, setYear] = useState<number>(() => dayjs().year());
  const [mode, setMode] = useState<MaturityMode>("day");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => availableMaturityYears(deposits), [deposits]);
  const calendar = useMemo(
    () => buildMaturityCalendar(deposits, year, mode),
    [deposits, year, mode],
  );
  const bandLabels = useMemo(
    () => (calendar.bandBounds ? formatBands(calendar.bandBounds) : []),
    [calendar.bandBounds],
  );
  const selectedDeposits = useMemo(
    () => (selectedDate ? depositsInBucket(deposits, year, mode, selectedDate) : []),
    [selectedDate, deposits, year, mode],
  );

  useEffect(() => {
    if (calendar.mode !== "day" || calendar.scrollToColumn === null) return;
    const container = dayScrollRef.current;
    if (!container) return;
    const todayX = LABEL_COL + calendar.scrollToColumn * (DAY_CELL_SIZE + DAY_CELL_GAP);
    const visibleWidth = container.clientWidth;
    const target = Math.max(0, todayX - visibleWidth / 2 + DAY_CELL_SIZE / 2);
    container.scrollLeft = target;
  }, [calendar]);

  const modalTitle = selectedDate ? bucketLabel(year, mode, selectedDate) : "";

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text fw={600}>到期熱力圖</Text>
          <SegmentedControl
            size="xs"
            value={mode}
            onChange={(v) => setMode(v as MaturityMode)}
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

        {!calendar.hasDeposits ? (
          <Stack align="center" py="lg" gap={4}>
            <Text c="dimmed" size="sm">
              {year} 年沒有到期記錄
            </Text>
            <Text c="dimmed" size="xs">
              切換至有資料的年份查看
            </Text>
          </Stack>
        ) : calendar.mode === "day" ? (
          <HeatmapDayGrid
            ref={dayScrollRef}
            buckets={calendar.buckets}
            columnCount={calendar.columnCount}
            monthLabels={calendar.monthLabels}
            onSelect={setSelectedDate}
          />
        ) : calendar.mode === "week" ? (
          <HeatmapWeekList monthGroups={calendar.monthGroups} onSelect={setSelectedDate} />
        ) : (
          <HeatmapMonthGrid buckets={calendar.buckets} onSelect={setSelectedDate} />
        )}

        {calendar.hasDeposits && (
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
              {([1, 2, 3] as const).map((band, i) => (
                <div key={band} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2,
                      flexShrink: 0,
                      backgroundColor: BAND_COLORS[band],
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
                  {formatMoney(calendar.summary.totalAmount)}
                </Text>
              </Card>
              <Card padding="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">
                  單{PERIOD_LABELS[mode]}峰值
                </Text>
                <Text fw={700} size="sm" mt={2} style={{ wordBreak: "break-all" }}>
                  {calendar.summary.peakAmount > 0 ? formatMoney(calendar.summary.peakAmount) : "—"}
                </Text>
              </Card>
              <Card padding="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">
                  活躍{PERIOD_LABELS[mode]}數
                </Text>
                <Text fw={700} size="sm" mt={2}>
                  {calendar.summary.activePeriods}
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

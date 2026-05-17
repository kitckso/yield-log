import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Card,
  Avatar,
  Menu,
  SimpleGrid,
  ColorSwatch,
  SegmentedControl,
  Skeleton,
} from "@mantine/core";
import { DonutChart, BarChart } from "@mantine/charts";
import { useDepositsStore } from "../store/deposits";
import { useBanksStore } from "../store/banks";
import { useAuthStore } from "../store/auth";
import { isMatured, formatCurrency, formatDate } from "../hooks/useCalculations";
import dayjs from "dayjs";

const chartColors = [
  "blue.6",
  "cyan.6",
  "teal.6",
  "grape.6",
  "pink.6",
  "orange.6",
  "yellow.6",
  "lime.6",
  "green.6",
  "violet.6",
];

export default function HomePage() {
  const navigate = useNavigate();
  const { deposits, loading, fetchDeposits } = useDepositsStore();
  const { banks, fetchBanks } = useBanksStore();
  const { user, signOut } = useAuthStore();

  useEffect(() => {
    void fetchDeposits();
    void fetchBanks();
  }, [fetchDeposits, fetchBanks]);

  const bankMap = useMemo(() => {
    const map = new Map<string, string>();
    banks.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [banks]);

  const activeDeposits = deposits.filter((d) => !isMatured(d.end_date));
  const maturedDeposits = deposits.filter((d) => isMatured(d.end_date));

  const activeAmount = activeDeposits.reduce((sum, d) => sum + d.amount, 0);
  const pendingInterest = activeDeposits.reduce((sum, d) => sum + d.interest, 0);
  const totalReceivedInterest = maturedDeposits.reduce((sum, d) => sum + d.interest, 0);
  const avgRate =
    activeDeposits.length > 0
      ? activeDeposits.reduce((sum, d) => sum + d.interest_rate * d.amount, 0) /
        activeDeposits.reduce((sum, d) => sum + d.amount, 0)
      : 0;

  const bankDistribution = useMemo(() => {
    const grouped = new Map<string, number>();
    activeDeposits.forEach((d) => {
      grouped.set(d.bank_id, (grouped.get(d.bank_id) ?? 0) + d.amount);
    });
    const total = activeDeposits.reduce((s, d) => s + d.amount, 0);
    return Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([bankId, amount], i) => ({
        name: bankMap.get(bankId) ?? "未知",
        value: amount,
        color: chartColors[i % chartColors.length],
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }));
  }, [activeDeposits, bankMap]);

  const maturityTimeline = useMemo(() => {
    const now = dayjs();
    const grouped = new Map<string, number>();
    activeDeposits.forEach((d) => {
      const monthKey = dayjs(d.end_date).format("YYYY-MM");
      grouped.set(monthKey, (grouped.get(monthKey) ?? 0) + d.amount);
    });

    const months: { month: string; 金額: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const m = now.add(i, "month");
      const key = m.format("YYYY-MM");
      months.push({ month: m.format("M月"), 金額: grouped.get(key) ?? 0 });
    }
    return months;
  }, [activeDeposits]);

  const upcoming = useMemo(() => {
    return [...activeDeposits].sort((a, b) => a.end_date.localeCompare(b.end_date)).slice(0, 5);
  }, [activeDeposits]);

  const [yearGroupMode, setYearGroupMode] = useState<string>("end");
  const yearDateField = yearGroupMode === "start" ? "start_date" : "end_date";

  const yearSummary = useMemo(() => {
    const grouped = new Map<
      string,
      { count: number; amount: number; pending: number; received: number }
    >();
    deposits.forEach((d) => {
      const year = dayjs(d[yearDateField as keyof typeof d] as string).format("YYYY");
      const entry = grouped.get(year) ?? { count: 0, amount: 0, pending: 0, received: 0 };
      entry.count += 1;
      entry.amount += d.amount;
      if (isMatured(d.end_date)) {
        entry.received += d.interest;
      } else {
        entry.pending += d.interest;
      }
      grouped.set(year, entry);
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, data]) => ({ year, ...data }));
  }, [deposits, yearDateField]);

  const yearChartData = useMemo(() => {
    return yearSummary.map((y) => ({ year: y.year, amount: y.amount }));
  }, [yearSummary]);

  const bankStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        activeCount: number;
        activeAmount: number;
        maturedCount: number;
        maturedAmount: number;
        pendingInterest: number;
        receivedInterest: number;
      }
    >();
    deposits.forEach((d) => {
      const entry = grouped.get(d.bank_id) ?? {
        activeCount: 0,
        activeAmount: 0,
        maturedCount: 0,
        maturedAmount: 0,
        pendingInterest: 0,
        receivedInterest: 0,
      };
      if (isMatured(d.end_date)) {
        entry.maturedCount += 1;
        entry.maturedAmount += d.amount;
        entry.receivedInterest += d.interest;
      } else {
        entry.activeCount += 1;
        entry.activeAmount += d.amount;
        entry.pendingInterest += d.interest;
      }
      grouped.set(d.bank_id, entry);
    });
    return Array.from(grouped.entries())
      .map(([bankId, data]) => ({
        bankId,
        bankName: bankMap.get(bankId) ?? "未知",
        ...data,
      }))
      .sort((a, b) => b.activeAmount + b.maturedAmount - (a.activeAmount + a.maturedAmount));
  }, [deposits, bankMap]);

  return (
    <div>
      <Container size="sm" pb={100} pt="md">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={2}>YieldLog</Title>
              <Text size="sm" c="dimmed">
                定期存款管理
              </Text>
            </div>
            <Menu shadow="md" width={160}>
              <Menu.Target>
                <Avatar
                  src={null}
                  alt={user?.email ?? ""}
                  color="blue"
                  style={{ cursor: "pointer" }}
                >
                  {(user?.email ?? "?").charAt(0).toUpperCase()}
                </Avatar>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item disabled>
                  <Text size="xs">{user?.email}</Text>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<span className="material-symbols-outlined">logout</span>}
                  onClick={() => signOut()}
                >
                  登出
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {loading && deposits.length === 0 ? (
            <Stack gap="md">
              <Skeleton height={180} radius="lg" />
              <Skeleton height={220} radius="lg" />
              <Skeleton height={200} radius="lg" />
              <Skeleton height={140} radius="lg" />
            </Stack>
          ) : deposits.length === 0 ? (
            <Stack align="center" py="xl" gap="sm">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "64px", color: "var(--mantine-color-gray-4)" }}
              >
                savings
              </span>
              <Text c="dimmed">暫無存款記錄</Text>
              <Text size="sm" c="dimmed">
                前往「存款」頁面新增定存
              </Text>
            </Stack>
          ) : (
            <>
              <Card padding="lg" radius="lg" withBorder>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    總資產（進行中）
                  </Text>
                  <Title order={1} style={{ fontSize: "36px", lineHeight: "40px" }}>
                    {formatCurrency(activeAmount)}
                  </Title>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      {activeDeposits.length} 筆定存
                    </Text>
                    <Text size="sm" c="dimmed">
                      ·
                    </Text>
                    <Text size="sm" fw={600}>
                      加權平均 {avgRate.toFixed(2)}%
                    </Text>
                  </Group>
                  <SimpleGrid cols={2} mt="xs">
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">
                        預期利息
                      </Text>
                      <Text size="sm" fw={500}>
                        {formatCurrency(pendingInterest)}
                      </Text>
                    </Stack>
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">
                        已收利息
                      </Text>
                      <Text size="sm" fw={500}>
                        {formatCurrency(totalReceivedInterest)}
                      </Text>
                    </Stack>
                  </SimpleGrid>
                  {maturedDeposits.length > 0 && (
                    <Text size="xs" c="dimmed" mt="xs">
                      已期滿 {maturedDeposits.length} 筆，共{" "}
                      {formatCurrency(maturedDeposits.reduce((s, d) => s + d.amount, 0))}
                    </Text>
                  )}
                </Stack>
              </Card>

              {banks.length > 0 && bankDistribution.length > 0 && (
                <Card padding="lg" radius="lg" withBorder>
                  <Text fw={600} mb="md">
                    銀行分佈
                  </Text>
                  <Stack align="center" gap="md">
                    <DonutChart
                      data={bankDistribution}
                      size={200}
                      thickness={30}
                      valueFormatter={(v: number) =>
                        `$${v.toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    />
                    <SimpleGrid cols={2} spacing="xs" w="100%">
                      {bankDistribution.map((item) => (
                        <Group key={item.name} gap="xs">
                          <ColorSwatch
                            color={`var(--mantine-color-${item.color.replace(".", "-")})`}
                            size={10}
                            withShadow={false}
                          />
                          <Text size="xs">
                            {item.name} {item.pct}%
                          </Text>
                        </Group>
                      ))}
                    </SimpleGrid>
                  </Stack>
                </Card>
              )}

              <Card padding="lg" radius="lg" withBorder>
                <Text fw={600} mb="md">
                  每月到期金額
                </Text>
                <BarChart
                  h={200}
                  data={maturityTimeline}
                  dataKey="month"
                  series={[{ name: "金額", color: "blue.6" }]}
                  tickLine="y"
                  gridAxis="x"
                  withYAxis={false}
                />
              </Card>

              {upcoming.length > 0 && (
                <Card padding="lg" radius="lg" withBorder>
                  <Text fw={600} mb="md">
                    即將到期
                  </Text>
                  <Stack gap="sm">
                    {upcoming.map((d) => (
                      <Group
                        key={d.id}
                        justify="space-between"
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/deposits/${d.id}/detail`)}
                      >
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>
                            {bankMap.get(d.bank_id) ?? "未知"}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {formatDate(d.end_date)} 到期
                          </Text>
                        </Stack>
                        <Text fw={600} size="sm">
                          {formatCurrency(d.amount)}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              )}

              {yearSummary.length > 1 && (
                <Card padding="lg" radius="lg" withBorder>
                  <Text fw={600} mb="md">
                    年度摘要
                  </Text>
                  <SegmentedControl
                    size="xs"
                    value={yearGroupMode}
                    onChange={setYearGroupMode}
                    data={[
                      { label: "按開戶日", value: "start" },
                      { label: "按到期日", value: "end" },
                    ]}
                    fullWidth
                    mb="md"
                  />
                  <BarChart
                    h={160}
                    data={yearChartData}
                    dataKey="year"
                    series={[{ name: "amount", color: "blue.6" }]}
                    tickLine="y"
                    gridAxis="x"
                    withYAxis={false}
                    withLegend={false}
                    withTooltip={false}
                  />
                  <Stack gap="xs" mt="md">
                    {yearSummary.map((y) => (
                      <Group key={y.year} justify="space-between">
                        <Text size="sm" fw={500}>
                          {y.year}
                        </Text>
                        <Stack gap={0} align="end">
                          <Text size="sm">{formatCurrency(y.amount)}</Text>
                          <Text size="xs" c="dimmed">
                            {y.count} 筆
                          </Text>
                          <Text size="xs" c="dimmed">
                            {y.pending > 0 && `預期 ${formatCurrency(y.pending)}`}
                            {y.pending > 0 && y.received > 0 && " · "}
                            {y.received > 0 && `已收 ${formatCurrency(y.received)}`}
                          </Text>
                        </Stack>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              )}

              {bankStats.length > 0 && (
                <Card padding="lg" radius="lg" withBorder>
                  <Text fw={600} mb="md">
                    銀行統計
                  </Text>
                  <Stack gap="md">
                    {bankStats.map((b) => {
                      const totalAmount = b.activeAmount + b.maturedAmount;
                      return (
                        <Stack
                          key={b.bankId}
                          gap={4}
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/deposits?bankId=${b.bankId}`)}
                        >
                          <Group justify="space-between">
                            <Text size="sm" fw={600}>
                              {b.bankName}
                            </Text>
                            <Text size="sm" fw={600}>
                              {formatCurrency(totalAmount)}
                            </Text>
                          </Group>
                          <SimpleGrid cols={2} spacing="xs">
                            <Stack gap={0}>
                              {b.activeCount > 0 && (
                                <>
                                  <Text size="xs" c="dimmed">
                                    進行中
                                  </Text>
                                  <Text size="xs">
                                    {b.activeCount}筆 {formatCurrency(b.activeAmount)}
                                  </Text>
                                  {b.pendingInterest > 0 && (
                                    <Text size="xs" c="dimmed">
                                      預計利息 {formatCurrency(b.pendingInterest)}
                                    </Text>
                                  )}
                                </>
                              )}
                            </Stack>
                            <Stack gap={0} align="end">
                              {b.maturedCount > 0 && (
                                <>
                                  <Text size="xs" c="dimmed">
                                    已期滿
                                  </Text>
                                  <Text size="xs">
                                    {b.maturedCount}筆 {formatCurrency(b.maturedAmount)}
                                  </Text>
                                  {b.receivedInterest > 0 && (
                                    <Text size="xs" c="dimmed">
                                      已收利息 {formatCurrency(b.receivedInterest)}
                                    </Text>
                                  )}
                                </>
                              )}
                            </Stack>
                          </SimpleGrid>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Card>
              )}
            </>
          )}
        </Stack>
      </Container>
    </div>
  );
}

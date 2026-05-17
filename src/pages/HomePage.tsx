import { useEffect, useMemo } from "react";
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
  const { deposits, fetchDeposits } = useDepositsStore();
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
    return Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([bankId, amount], i) => ({
        name: bankMap.get(bankId) ?? "未知",
        value: amount,
        color: chartColors[i % chartColors.length],
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

          {deposits.length === 0 ? (
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

              {bankDistribution.length > 0 && (
                <Card padding="lg" radius="lg" withBorder>
                  <Text fw={600} mb="md">
                    銀行分佈
                  </Text>
                  <Stack align="center" gap="md">
                    <DonutChart
                      data={bankDistribution}
                      withLabelsLine
                      withLabels
                      size={180}
                      thickness={30}
                      labelsType="percent"
                    />
                    <SimpleGrid cols={2} spacing="xs" w="100%">
                      {bankDistribution.map((item) => (
                        <Group key={item.name} gap="xs">
                          <ColorSwatch
                            color={`var(--mantine-color-${item.color.replace(".", "-")})`}
                            size={10}
                            withShadow={false}
                          />
                          <Text size="xs">{item.name}</Text>
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
            </>
          )}
        </Stack>
      </Container>
    </div>
  );
}

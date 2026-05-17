import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  ActionIcon,
  Center,
  Avatar,
  Menu,
  Skeleton,
  SegmentedControl,
  Select,
} from "@mantine/core";
import { IconLogout, IconCoin, IconPlus } from "@tabler/icons-react";
import { useDepositsStore } from "../store/deposits";
import { useBanksStore } from "../store/banks";
import { useAuthStore } from "../store/auth";
import DepositCard from "../components/DepositCard";
import { isMatured } from "../hooks/useCalculations";

export default function DepositList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { deposits, loading, fetchDeposits } = useDepositsStore();
  const { user, signOut } = useAuthStore();

  useEffect(() => {
    void fetchDeposits();
  }, [fetchDeposits]);

  const { banks, fetchBanks } = useBanksStore();
  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "all");
  const [bankFilter, setBankFilter] = useState<string | null>(searchParams.get("bankId") ?? null);
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sort") ?? "start_desc");

  const sortOptions = [
    { value: "start_desc", label: "開戶日 (新→舊)" },
    { value: "start_asc", label: "開戶日 (舊→新)" },
    { value: "end_asc", label: "到期日 (近→遠)" },
    { value: "end_desc", label: "到期日 (遠→近)" },
    { value: "amount_desc", label: "金額 (大→小)" },
    { value: "amount_asc", label: "金額 (小→大)" },
    { value: "rate_desc", label: "利率 (高→低)" },
    { value: "rate_asc", label: "利率 (低→高)" },
  ];

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (bankFilter) params.set("bankId", bankFilter);
    if (sortBy !== "start_desc") params.set("sort", sortBy);
    setSearchParams(params, { replace: true });
  }, [statusFilter, bankFilter, sortBy, setSearchParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [searchParams]);

  const filteredDeposits = useMemo(() => {
    const filtered = deposits.filter((d) => {
      if (statusFilter === "active" && isMatured(d.end_date)) return false;
      if (statusFilter === "matured" && !isMatured(d.end_date)) return false;
      if (bankFilter && d.bank_id !== bankFilter) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "start_asc":
          return a.start_date.localeCompare(b.start_date);
        case "end_asc":
          return a.end_date.localeCompare(b.end_date);
        case "end_desc":
          return b.end_date.localeCompare(a.end_date);
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        case "rate_desc":
          return b.interest_rate - a.interest_rate;
        case "rate_asc":
          return a.interest_rate - b.interest_rate;
        default:
          return b.start_date.localeCompare(a.start_date);
      }
    });
  }, [deposits, statusFilter, bankFilter, sortBy]);

  return (
    <div style={{ position: "relative" }}>
      <Container size="sm" pb={160} pt="md">
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
                  leftSection={<IconLogout size={18} />}
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
              <Skeleton height={20} width={80} radius="sm" />
              <Skeleton height={100} radius="lg" />
              <Skeleton height={100} radius="lg" />
              <Skeleton height={100} radius="lg" />
            </Stack>
          ) : deposits.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="sm">
                <IconCoin size={64} color="var(--mantine-color-gray-4)" />
                <Text c="dimmed">暫無存款記錄</Text>
                <Text size="sm" c="dimmed">
                  點擊下方按鈕新增定存
                </Text>
              </Stack>
            </Center>
          ) : (
            <>
              <Stack gap="xs">
                <SegmentedControl
                  size="xs"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  data={[
                    { label: "全部", value: "all" },
                    { label: "進行中", value: "active" },
                    { label: "已期滿", value: "matured" },
                  ]}
                  fullWidth
                />
                <Group grow>
                  <Select
                    size="xs"
                    placeholder="全部銀行"
                    clearable
                    data={banks.map((b) => ({ label: b.name, value: b.id }))}
                    value={bankFilter}
                    onChange={setBankFilter}
                  />
                  <Select
                    size="xs"
                    data={sortOptions}
                    value={sortBy}
                    onChange={(v) => v && setSortBy(v)}
                  />
                </Group>
              </Stack>

              <Text fw={600}>存款列表</Text>

              <Stack gap="sm">
                {filteredDeposits.length === 0 ? (
                  <Text c="dimmed" size="sm" ta="center" py="md">
                    沒有符合篩選條件的記錄
                  </Text>
                ) : (
                  filteredDeposits.map((deposit) => (
                    <DepositCard
                      key={deposit.id}
                      deposit={deposit}
                      onClick={() => navigate(`/deposits/${deposit.id}/detail`)}
                    />
                  ))
                )}
              </Stack>
            </>
          )}
        </Stack>
      </Container>

      <div
        style={{
          position: "fixed",
          bottom: "76px",
          left: 0,
          right: 0,
          pointerEvents: "none",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            position: "relative",
            pointerEvents: "auto",
          }}
        >
          <ActionIcon
            size={56}
            radius="xl"
            style={{
              position: "absolute",
              right: "24px",
              bottom: 0,
              backgroundColor: "var(--mantine-color-blue-6)",
              color: "white",
            }}
            onClick={() => navigate("/deposits/new")}
          >
            <IconPlus size={28} color="white" />
          </ActionIcon>
        </div>
      </div>
    </div>
  );
}

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
  Skeleton,
  SegmentedControl,
  Select,
  Divider,
} from "@mantine/core";
import { IconCoin, IconPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import UserMenu from "../components/UserMenu";
import MonthlyCalendar from "../components/MonthlyCalendar";
import { useDepositsStore } from "../store/deposits";
import { useBanksStore } from "../store/banks";
import DepositCard from "../components/DepositCard";
import { isMatured } from "../hooks/useCalculations";

export default function DepositList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { deposits, loading, fetchDeposits } = useDepositsStore();

  useEffect(() => {
    void fetchDeposits();
  }, [fetchDeposits]);

  const { banks, fetchBanks } = useBanksStore();
  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "active");
  const [bankFilter, setBankFilter] = useState<string | null>(searchParams.get("bankId") ?? null);
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sort") ?? "end_asc");
  const [viewMode, setViewMode] = useState<string>(searchParams.get("view") ?? "list");
  const yearParam = searchParams.get("year");
  const [calendarYear, setCalendarYear] = useState<number>(
    yearParam ? Number(yearParam) : dayjs().year(),
  );

  const sortOptions = [
    { value: "end_asc", label: "到期日 ↑" },
    { value: "end_desc", label: "到期日 ↓" },
    { value: "start_asc", label: "開戶日 ↑" },
    { value: "start_desc", label: "開戶日 ↓" },
    { value: "amount_asc", label: "金額 ↑" },
    { value: "amount_desc", label: "金額 ↓" },
    { value: "rate_asc", label: "利率 ↑" },
    { value: "rate_desc", label: "利率 ↓" },
  ];

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "active") params.set("status", statusFilter);
    if (bankFilter) params.set("bankId", bankFilter);
    if (sortBy !== "end_asc") params.set("sort", sortBy);
    if (viewMode !== "list") params.set("view", viewMode);
    if (viewMode === "calendar" && calendarYear !== dayjs().year())
      params.set("year", String(calendarYear));
    setSearchParams(params, { replace: true });
  }, [statusFilter, bankFilter, sortBy, viewMode, calendarYear, setSearchParams]);

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

  const isDateSort = sortBy.startsWith("start_") || sortBy.startsWith("end_");

  const renderList = () => {
    if (filteredDeposits.length === 0) {
      return (
        <Text c="dimmed" size="sm" ta="center" py="md">
          沒有符合篩選條件的記錄
        </Text>
      );
    }

    if (!isDateSort) {
      return filteredDeposits.map((deposit) => (
        <DepositCard
          key={deposit.id}
          deposit={deposit}
          onClick={() => navigate(`/deposits/${deposit.id}/detail`)}
        />
      ));
    }

    const sortField = sortBy.startsWith("start_") ? "start_date" : "end_date";
    const getMonthKey = (d: (typeof filteredDeposits)[number]) =>
      dayjs(d[sortField]).format("YYYY年M月");

    const elements: React.ReactNode[] = [];
    let lastMonth = "";
    filteredDeposits.forEach((deposit) => {
      const month = getMonthKey(deposit);
      if (month !== lastMonth) {
        lastMonth = month;
        elements.push(
          <Divider key={`sep-${month}`} label={month} labelPosition="center" pt="sm" pb="xs" />,
        );
      }
      elements.push(
        <DepositCard
          key={deposit.id}
          deposit={deposit}
          onClick={() => navigate(`/deposits/${deposit.id}/detail`)}
        />,
      );
    });
    return elements;
  };

  return (
    <div style={{ position: "relative" }}>
      <Container size="sm" pb={160} pt="md">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={2}>存款</Title>
              <Text size="sm" c="dimmed">
                定期存款管理
              </Text>
            </div>
            <UserMenu />
          </Group>

          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={setViewMode}
            data={[
              { label: "列表", value: "list" },
              { label: "月曆", value: "calendar" },
            ]}
            fullWidth
          />

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
          ) : viewMode === "calendar" ? (
            <MonthlyCalendar
              deposits={deposits}
              year={calendarYear}
              onYearChange={setCalendarYear}
            />
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

              <Stack gap="sm">{renderList()}</Stack>
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

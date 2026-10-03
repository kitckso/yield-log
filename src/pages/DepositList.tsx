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
  Button,
} from "@mantine/core";
import { IconCoin, IconPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import UserMenu from "../components/UserMenu";
import MonthlyCalendar from "../components/MonthlyCalendar";
import { useDepositsStore } from "../store/deposits";
import { useBanksStore } from "../store/banks";
import DepositCard from "../components/DepositCard";
import {
  SORT_OPTIONS,
  buildListUrlParams,
  filterAndSortDeposits,
  groupByMonthField,
  isDateSort as isDateSortKey,
  parseListUrlState,
  sortFieldFor,
} from "../lib/depositList";

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

  const initial = parseListUrlState(searchParams);

  const [statusFilter, setStatusFilter] = useState<string>(initial.statusFilter);
  const [bankFilter, setBankFilter] = useState<string | null>(initial.bankFilter);
  const [sortBy, setSortBy] = useState<string>(initial.sortBy);
  const [viewMode, setViewMode] = useState<string>(initial.viewMode);
  const [calendarYear, setCalendarYear] = useState<number>(initial.calendarYear);

  const sortOptions = SORT_OPTIONS;

  useEffect(() => {
    const params = buildListUrlParams(
      { statusFilter, bankFilter, sortBy, viewMode, calendarYear },
      dayjs().year(),
    );
    setSearchParams(params, { replace: true });
  }, [statusFilter, bankFilter, sortBy, viewMode, calendarYear, setSearchParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [searchParams]);

  const filteredDeposits = useMemo(
    () => filterAndSortDeposits(deposits, { statusFilter, bankFilter, sortBy }),
    [deposits, statusFilter, bankFilter, sortBy],
  );

  const isDateSort = isDateSortKey(sortBy);

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

    const monthGroups = groupByMonthField(filteredDeposits, sortFieldFor(sortBy));
    const elements: React.ReactNode[] = [];
    const fmt = (n: number) => `$${n.toLocaleString("en-HK")}`;
    for (const group of monthGroups) {
      elements.push(
        <Divider
          key={`sep-${group.key}`}
          label={`${group.key}  ·  ${fmt(group.totalAmount)}`}
          labelPosition="center"
          pt="sm"
          pb="xs"
        />,
      );
      elements.push(
        ...group.deposits.map((deposit) => (
          <DepositCard
            key={deposit.id}
            deposit={deposit}
            onClick={() => navigate(`/deposits/${deposit.id}/detail`)}
          />
        )),
      );
    }
    return elements;
  };

  return (
    <div style={{ position: "relative" }}>
      <Container size={viewMode === "calendar" ? "lg" : "sm"} pt="md" pb={{ base: 150, sm: 16 }}>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={2}>存款</Title>
              <Text size="sm" c="dimmed">
                定期存款管理
              </Text>
            </div>
            <Group gap="xs">
              <Button
                size="xs"
                className="desktop-add-btn"
                leftSection={<IconPlus size={16} />}
                onClick={() => navigate("/deposits/new")}
              >
                新增
              </Button>
              <UserMenu />
            </Group>
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
        className="fab-container"
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

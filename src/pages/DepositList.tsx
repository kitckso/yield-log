import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useDepositsStore } from "../store/deposits";
import { useBanksStore } from "../store/banks";
import { useAuthStore } from "../store/auth";
import DepositCard from "../components/DepositCard";
import { isMatured } from "../hooks/useCalculations";

export default function DepositList() {
  const navigate = useNavigate();
  const { deposits, loading, fetchDeposits } = useDepositsStore();
  const { user, signOut } = useAuthStore();

  useEffect(() => {
    void fetchDeposits();
  }, [fetchDeposits]);

  const { banks, fetchBanks } = useBanksStore();
  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bankFilter, setBankFilter] = useState<string | null>(null);

  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => {
      if (statusFilter === "active" && isMatured(d.end_date)) return false;
      if (statusFilter === "matured" && !isMatured(d.end_date)) return false;
      if (bankFilter && d.bank_id !== bankFilter) return false;
      return true;
    });
  }, [deposits, statusFilter, bankFilter]);

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
              <Skeleton height={20} width={80} radius="sm" />
              <Skeleton height={100} radius="lg" />
              <Skeleton height={100} radius="lg" />
              <Skeleton height={100} radius="lg" />
            </Stack>
          ) : deposits.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="sm">
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "64px",
                    color: "var(--mantine-color-gray-4)",
                  }}
                >
                  savings
                </span>
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
                <Select
                  size="xs"
                  placeholder="全部銀行"
                  clearable
                  data={banks.map((b) => ({ label: b.name, value: b.id }))}
                  value={bankFilter}
                  onChange={setBankFilter}
                />
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
            <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>
              add
            </span>
          </ActionIcon>
        </div>
      </div>
    </div>
  );
}

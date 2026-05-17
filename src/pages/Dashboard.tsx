import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
} from "@mantine/core";
import { useDepositsStore } from "../store/deposits";
import { useAuthStore } from "../store/auth";
import SummaryCard from "../components/SummaryCard";
import DepositCard from "../components/DepositCard";
import { isMatured } from "../hooks/useCalculations";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDepositsPage = location.pathname.startsWith("/deposits");
  const { deposits, fetchDeposits, deleteDeposit } = useDepositsStore();
  const { user, signOut } = useAuthStore();

  useEffect(() => {
    void fetchDeposits();
  }, [fetchDeposits]);

  const activeDeposits = deposits.filter((d) => !isMatured(d.end_date));
  const maturedDeposits = deposits.filter((d) => isMatured(d.end_date));

  const activeAmount = activeDeposits.reduce((sum, d) => sum + d.amount, 0);
  const pendingInterest = activeDeposits.reduce((sum, d) => sum + d.interest, 0);
  const totalReceivedInterest = deposits.reduce((sum, d) => sum + d.interest, 0);
  const averageRate =
    deposits.length > 0
      ? deposits.reduce((sum, d) => sum + d.interest_rate, 0) / deposits.length
      : 0;
  const activeCount = activeDeposits.length;
  const maturedCount = maturedDeposits.length;

  const handleDelete = async (id: string) => {
    if (confirm("確定刪除這筆存款記錄？")) {
      await deleteDeposit(id);
    }
  };

  return (
    <div style={{ position: "relative" }}>
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
              <SummaryCard
                activeAmount={activeAmount}
                pendingInterest={pendingInterest}
                totalReceivedInterest={totalReceivedInterest}
                averageRate={averageRate}
                maturedCount={maturedCount}
                activeCount={activeCount}
              />

              {!isDepositsPage && <Text fw={600}>存款列表</Text>}

              <Stack gap="sm">
                {deposits.map((deposit) => (
                  <DepositCard
                    key={deposit.id}
                    deposit={deposit}
                    onEdit={() => navigate(`/deposits/${deposit.id}`)}
                    onDelete={() => handleDelete(deposit.id)}
                  />
                ))}
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

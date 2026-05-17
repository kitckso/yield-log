import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Container,
  Stack,
  Group,
  Title,
  Text,
  Card,
  Button,
  Loader,
  Center,
  Badge,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconTrash, IconEdit } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useDepositsStore } from "../store/deposits";
import { isMatured, formatCurrency, formatDate } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";

export default function DepositDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { deposits, fetchDeposits, deleteDeposit } = useDepositsStore();
  const [deposit, setDeposit] = useState<DepositWithBank | null>(null);

  useEffect(() => {
    void fetchDeposits();
  }, [fetchDeposits]);

  useEffect(() => {
    if (id) {
      const d = deposits.find((d) => d.id === id);
      if (d) setDeposit(d);
    }
  }, [id, deposits]);

  const handleDelete = () => {
    if (!deposit) return;
    modals.openConfirmModal({
      title: "確認刪除",
      children: <Text size="sm">確定刪除這筆存款記錄？此操作無法復原。</Text>,
      labels: { confirm: "刪除", cancel: "取消" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await deleteDeposit(deposit.id);
        notifications.show({
          title: "已刪除",
          message: "存款記錄已成功刪除",
          color: "green",
        });
        void navigate("/deposits");
      },
    });
  };

  if (!deposit) {
    return (
      <Center style={{ minHeight: "100dvh" }}>
        <Loader />
      </Center>
    );
  }

  const matured = isMatured(deposit.end_date);
  const periodLabel =
    deposit.period_unit === "months"
      ? `${deposit.period_value}個月`
      : deposit.period_unit === "days"
        ? `${deposit.period_value}日`
        : deposit.period_unit === "weeks"
          ? `${deposit.period_value}週`
          : `${deposit.period_value}年`;

  return (
    <Container size="sm" pb={100} pt="md">
      <Stack gap="md">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={20} />}
            onClick={() => navigate("/deposits")}
          >
            返回
          </Button>
          <Title order={2}>存款詳情</Title>
        </Group>

        <Card padding="lg" radius="lg" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text fw={700} size="lg">
                  {deposit.bank_name}
                </Text>
                <Text size="sm" c="dimmed">
                  {periodLabel} 定期存款
                </Text>
              </div>
              <Badge color={matured ? "gray" : "green"} variant="light" size="lg">
                {matured ? "已期滿" : "進行中"}
              </Badge>
            </Group>

            <div>
              <Text size="xs" c="dimmed">
                本金
              </Text>
              <Text fw={700} style={{ fontSize: "24px" }}>
                {formatCurrency(deposit.amount)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                利息
              </Text>
              <Text fw={700} style={{ fontSize: "24px" }} c="green">
                {formatCurrency(deposit.interest)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                年利率
              </Text>
              <Text fw={600}>{deposit.interest_rate}%</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                存期
              </Text>
              <Text fw={600}>{periodLabel}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                起息日期
              </Text>
              <Text fw={600}>{formatDate(deposit.start_date)}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                到期日期
              </Text>
              <Text fw={600}>{formatDate(deposit.end_date)}</Text>
            </div>
          </Stack>
        </Card>

        <Group grow mt="md">
          <Button
            variant="outline"
            color="red"
            leftSection={<IconTrash size={18} />}
            onClick={handleDelete}
          >
            刪除
          </Button>
          <Button
            leftSection={<IconEdit size={18} />}
            onClick={() => navigate(`/deposits/${deposit.id}`)}
          >
            編輯
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}

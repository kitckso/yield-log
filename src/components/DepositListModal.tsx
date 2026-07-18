import { Badge, Group, Modal, ScrollArea, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { formatCurrency, isMatured } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";

interface DepositListModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  deposits: DepositWithBank[];
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function DepositListModal({
  opened,
  onClose,
  title,
  deposits,
}: DepositListModalProps) {
  const navigate = useNavigate();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
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
        {deposits.map((d) => {
          const matured = isMatured(d.end_date);
          return (
            <div
              key={d.id}
              onClick={() => {
                void navigate(`/deposits/${d.id}/detail`);
                onClose();
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
                  <Text size="xs" c="dimmed">
                    ({WEEKDAYS[dayjs(d.end_date).day()]})
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
  );
}

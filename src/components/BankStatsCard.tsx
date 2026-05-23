import { Card, Text, Stack, Group, SimpleGrid } from "@mantine/core";
import { formatCurrency } from "../hooks/useCalculations";

interface BankStat {
  bankId: string;
  bankName: string;
  activeCount: number;
  activeAmount: number;
  maturedCount: number;
  maturedAmount: number;
  pendingInterest: number;
  receivedInterest: number;
}

interface BankStatsCardProps {
  bankStats: BankStat[];
  onNavigate: (bankId: string) => void;
}

export default function BankStatsCard({ bankStats, onNavigate }: BankStatsCardProps) {
  if (bankStats.length === 0) return null;

  return (
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
              onClick={() => onNavigate(b.bankId)}
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
                          待收利息 {formatCurrency(b.pendingInterest)}
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
  );
}

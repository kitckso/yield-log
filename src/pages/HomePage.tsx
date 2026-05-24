import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Title, Text, Stack, Group, Skeleton, Button, SimpleGrid } from "@mantine/core";
import UserMenu from "../components/UserMenu";
import DashboardSummaryCard from "../components/DashboardSummaryCard";
import MaturityTimelineCard from "../components/MaturityTimelineCard";
import BankDistributionCard from "../components/BankDistributionCard";
import TermDistributionCard from "../components/TermDistributionCard";
import InterestGrowthCard from "../components/InterestGrowthCard";
import MonthlyMaturityCard from "../components/MonthlyMaturityCard";
import YearSummaryCard from "../components/YearSummaryCard";
import BankStatsCard from "../components/BankStatsCard";
import { IconCoin, IconBuildingBank } from "@tabler/icons-react";
import { useBanksStore } from "../store/banks";
import { useHomePageData } from "../hooks/useHomePageData";

export default function HomePage() {
  const navigate = useNavigate();
  const { banks } = useBanksStore();
  const [groupBy, setGroupBy] = useState<"amount" | "interest">("amount");
  const [scope, setScope] = useState<"active" | "all">("active");
  const [yearGroupMode, setYearGroupMode] = useState<"end" | "start">("end");
  const [maturityGroupBy, setMaturityGroupBy] = useState<"amount" | "interest">("amount");

  const data = useHomePageData(groupBy, scope, yearGroupMode, maturityGroupBy);

  return (
    <div>
      <Container size="sm" pt="md">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={2}>YieldLog</Title>
              <Text size="sm" c="dimmed">
                定期存款管理
              </Text>
            </div>
            <UserMenu />
          </Group>

          {data.loading && data.activeDeposits.length === 0 && data.maturedDeposits.length === 0 ? (
            <Stack gap="md">
              <Skeleton height={180} radius="lg" />
              <Skeleton height={220} radius="lg" />
              <Skeleton height={200} radius="lg" />
              <Skeleton height={140} radius="lg" />
            </Stack>
          ) : data.activeDeposits.length === 0 &&
            data.maturedDeposits.length === 0 &&
            banks.length === 0 ? (
            <Stack align="center" py="xl" gap="md">
              <IconCoin size={64} color="var(--mantine-color-gray-4)" />
              <Text c="dimmed">尚未新增存款記錄</Text>
              <Text size="sm" c="dimmed" ta="center">
                先到「銀行」頁面新增銀行，再到「存款」頁面新增存款
              </Text>
              <Button
                variant="light"
                leftSection={<IconBuildingBank size={16} />}
                onClick={() => navigate("/banks")}
              >
                新增銀行
              </Button>
            </Stack>
          ) : data.activeDeposits.length === 0 && data.maturedDeposits.length === 0 ? (
            <Stack align="center" py="xl" gap="sm">
              <IconCoin size={64} color="var(--mantine-color-gray-4)" />
              <Text c="dimmed">暫無存款記錄</Text>
              <Text size="sm" c="dimmed">
                前往「存款」頁面新增定存
              </Text>
            </Stack>
          ) : (
            <>
              <DashboardSummaryCard
                activeAmount={data.activeAmount}
                activeCount={data.activeDeposits.length}
                avgRate={data.avgRate}
                pendingInterest={data.pendingInterest}
                totalReceivedInterest={data.totalReceivedInterest}
                maturedCount={data.maturedDeposits.length}
                maturedTotal={data.maturedDeposits.reduce((s, d) => s + d.amount, 0)}
              />

              <MaturityTimelineCard
                upcoming={data.upcoming}
                recentlyMatured={data.recentlyMatured}
                bankMap={data.bankMap}
                onNavigate={(id) => navigate(`/deposits/${id}/detail`)}
              />

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <BankDistributionCard
                  bankDistribution={data.bankDistribution}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                  scope={scope}
                  onScopeChange={setScope}
                />

                <TermDistributionCard termDistribution={data.termDistribution} />

                <InterestGrowthCard growthData={data.growthData} />

                <MonthlyMaturityCard
                  maturityTimeline={data.maturityTimeline}
                  maturityGroupBy={maturityGroupBy}
                  onMaturityGroupByChange={setMaturityGroupBy}
                />
              </SimpleGrid>

              <YearSummaryCard
                yearSummary={data.yearSummary}
                yearChartData={data.yearChartData}
                yearGroupMode={yearGroupMode}
                onYearGroupModeChange={setYearGroupMode}
              />

              <BankStatsCard
                bankStats={data.bankStats}
                onNavigate={(bankId) => navigate(`/deposits?bankId=${bankId}`)}
              />
            </>
          )}
        </Stack>
      </Container>
    </div>
  );
}

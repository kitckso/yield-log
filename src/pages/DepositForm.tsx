import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Container, Stack, Button, Group, Title, Loader, Center } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft } from "@tabler/icons-react";
import { useAuthStore } from "../store/auth";
import { useBanksStore } from "../store/banks";
import { useDepositsStore } from "../store/deposits";
import { getErrorMessage } from "../hooks/useCalculations";
import DepositFormFields from "../components/DepositFormFields";
import {
  buildDepositDraft,
  parseRenewParams,
  recentAmounts,
  recentPeriods,
  recentRates,
  resolveEndDate,
  resolveInterest,
  shouldOfferFloorAlternative,
} from "../lib/depositForm";

export default function DepositForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;
  const isRenew = !isEditing && searchParams.get("renew") === "1";

  const { user } = useAuthStore();
  const { banks, fetchBanks } = useBanksStore();
  const { deposits, addDeposit, updateDeposit } = useDepositsStore();

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(true);

  const [bankId, setBankId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | string>("");
  const [periodValue, setPeriodValue] = useState<number | string>("");
  const [periodUnit, setPeriodUnit] = useState<string | null>(null);
  const [interestRate, setInterestRate] = useState<number | string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [manualEndDate, setManualEndDate] = useState<Date | null>(null);
  const [manualInterest, setManualInterest] = useState<number | string>("");
  const [interestManuallyEdited, setInterestManuallyEdited] = useState(false);
  const [endDateManuallyEdited, setEndDateManuallyEdited] = useState(false);

  const recentAmountSuggestions = useMemo(() => recentAmounts(deposits), [deposits]);
  const recentRateSuggestions = useMemo(() => recentRates(deposits), [deposits]);
  const recentPeriodSuggestions = useMemo(() => recentPeriods(deposits), [deposits]);

  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  useEffect(() => {
    if (isEditing && id) {
      const deposit = deposits.find((d) => d.id === id);
      if (deposit) {
        setBankId(deposit.bank_id);
        setAmount(deposit.amount);
        setPeriodValue(deposit.period_value);
        setPeriodUnit(deposit.period_unit);
        setInterestRate(deposit.interest_rate);
        setStartDate(new Date(deposit.start_date));
      }
      setFormLoading(false);
    } else if (isRenew) {
      const renew = parseRenewParams(searchParams);
      if (renew.bankId) setBankId(renew.bankId);
      if (renew.amount !== undefined) setAmount(renew.amount);
      if (renew.periodValue !== undefined) setPeriodValue(renew.periodValue);
      if (renew.periodUnit) setPeriodUnit(renew.periodUnit);
      if (renew.interestRate !== undefined) setInterestRate(renew.interestRate);
      setStartDate(new Date());
      setFormLoading(false);
    } else {
      setFormLoading(false);
      setStartDate(new Date());
    }
  }, [id, deposits, isEditing, isRenew, searchParams]);

  // The end date follows from the start date and term unless the user set it.
  const endDate = resolveEndDate(
    startDate,
    periodValue,
    periodUnit,
    manualEndDate,
    endDateManuallyEdited,
  );

  // Interest follows from amount, rate and dates unless the user set it.
  const { interest, floorInterest } = resolveInterest(
    amount,
    interestRate,
    startDate,
    endDate,
    manualInterest,
    interestManuallyEdited,
  );

  const handleInterestChange = (val: number | string) => {
    setManualInterest(val);
    setInterestManuallyEdited(true);
  };

  const handleEndDateChange = (val: Date | null) => {
    setManualEndDate(val);
    setEndDateManuallyEdited(true);
  };

  const resetForm = () => {
    setAmount("");
    setPeriodValue("");
    setPeriodUnit(null);
    setInterestRate("");
    setManualInterest("");
    setManualEndDate(null);
    setStartDate(new Date());
    setInterestManuallyEdited(false);
    setEndDateManuallyEdited(false);
  };

  const handleSubmit = async (stay?: boolean) => {
    const depositData = buildDepositDraft(
      { bankId, amount, periodValue, periodUnit, interestRate, startDate, endDate },
      interest,
      user!.id,
    );
    if (!depositData) {
      notifications.show({
        title: "欄位不足",
        message: "請填寫所有欄位",
        color: "yellow",
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && id) {
        await updateDeposit(id, depositData);
        notifications.show({
          title: "已更新",
          message: "存款記錄已成功更新",
          color: "green",
        });
      } else {
        await addDeposit(depositData);
        notifications.show({
          title: "已新增",
          message: "存款記錄已成功新增",
          color: "green",
        });
      }
    } catch (e) {
      notifications.show({
        title: "錯誤",
        message: getErrorMessage(e),
        color: "red",
      });
      return;
    } finally {
      setLoading(false);
    }

    if (stay) {
      resetForm();
    } else {
      void navigate("/deposits");
    }
  };

  if (formLoading) {
    return (
      <Center style={{ minHeight: "100dvh" }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="sm" pt="md" pb={{ base: 80, sm: 16 }}>
      <Stack gap="md">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={20} />}
            onClick={() => navigate("/deposits")}
          >
            返回
          </Button>
          <Title order={2}>{isEditing ? "編輯存款" : isRenew ? "續存" : "新增存款"}</Title>
        </Group>

        <DepositFormFields
          isEditing={isEditing}
          banks={banks}
          bankId={bankId}
          setBankId={setBankId}
          amount={amount}
          setAmount={setAmount}
          periodValue={periodValue}
          setPeriodValue={setPeriodValue}
          periodUnit={periodUnit}
          setPeriodUnit={setPeriodUnit}
          interestRate={interestRate}
          setInterestRate={setInterestRate}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          handleEndDateChange={handleEndDateChange}
          interest={interest}
          handleInterestChange={handleInterestChange}
          floorInterest={floorInterest}
          showFloorAlternative={shouldOfferFloorAlternative(
            interest,
            floorInterest,
            interestManuallyEdited,
          )}
          applyFloorInterest={() => {
            setManualInterest(floorInterest);
            setInterestManuallyEdited(true);
          }}
          recentAmountSuggestions={recentAmountSuggestions}
          recentRateSuggestions={recentRateSuggestions}
          recentPeriodSuggestions={recentPeriodSuggestions}
        />

        <Group mt="md">
          <Button variant="outline" flex={1} onClick={() => navigate("/deposits")}>
            取消
          </Button>
          {!isEditing && (
            <Button variant="outline" flex={1} loading={loading} onClick={() => handleSubmit(true)}>
              繼續新增
            </Button>
          )}
          <Button flex={2} loading={loading} onClick={() => handleSubmit()}>
            儲存存款
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Container,
  Stack,
  NumberInput,
  Select,
  Button,
  Group,
  Title,
  Loader,
  Center,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft } from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import { useAuthStore } from "../store/auth";
import { useBanksStore } from "../store/banks";
import { useDepositsStore } from "../store/deposits";
import { getErrorMessage } from "../hooks/useCalculations";
import {
  buildDepositDraft,
  calcEndDateFor,
  calcInterestFor,
  formatPeriodLabel,
  parseRenewParams,
  recentAmounts,
  recentPeriods,
  recentRates,
  shouldOfferFloorAlternative,
} from "../lib/depositForm";

const periodUnits = [
  { value: "days", label: "日" },
  { value: "weeks", label: "星期" },
  { value: "months", label: "個月" },
  { value: "years", label: "年" },
];

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
  const [interest, setInterest] = useState<number | string>(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
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
        setInterest(deposit.interest);
        setStartDate(new Date(deposit.start_date));
        setEndDate(new Date(deposit.end_date));
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

  // Auto-calc end date
  useEffect(() => {
    if (startDate && periodValue && periodUnit && !endDateManuallyEdited) {
      setEndDate(calcEndDateFor(startDate, periodValue, periodUnit));
    }
  }, [startDate, periodValue, periodUnit, endDateManuallyEdited]);

  // Auto-calc interest
  const [floorInterest, setFloorInterest] = useState<number>(0);
  useEffect(() => {
    if (startDate && endDate && amount && interestRate && !interestManuallyEdited) {
      const { interest: rounded, floorInterest: floor } = calcInterestFor(
        amount,
        interestRate,
        startDate,
        endDate,
      );
      setInterest(rounded);
      setFloorInterest(floor);
    }
  }, [amount, interestRate, startDate, endDate, interestManuallyEdited]);

  const handleInterestChange = (val: number | string) => {
    setInterest(val);
    setInterestManuallyEdited(true);
  };

  const handleEndDateChange = (val: Date | null) => {
    setEndDate(val);
    setEndDateManuallyEdited(true);
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
      setLoading(false);
      return;
    }

    setLoading(false);

    if (stay) {
      resetForm();
    } else {
      void navigate("/deposits");
    }
  };

  const resetForm = () => {
    setAmount("");
    setPeriodValue("");
    setPeriodUnit(null);
    setInterestRate("");
    setInterest(0);
    setFloorInterest(0);
    setStartDate(new Date());
    setEndDate(null);
    setInterestManuallyEdited(false);
    setEndDateManuallyEdited(false);
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

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            銀行名稱
          </Text>
          <Group gap={8}>
            {banks.map((b) => (
              <Button
                key={b.id}
                size="compact-sm"
                variant={bankId === b.id ? "filled" : "light"}
                onClick={() => setBankId(b.id)}
              >
                {b.name}
              </Button>
            ))}
          </Group>
        </Stack>

        <NumberInput
          label="本金 (HKD)"
          placeholder="500,000"
          value={amount}
          onChange={setAmount}
          thousandSeparator=","
          min={0}
          required
        />
        {!isEditing && recentAmountSuggestions.length > 0 && (
          <Group gap={4}>
            {recentAmountSuggestions.map((v) => (
              <Button
                key={v}
                size="compact-xs"
                variant={amount === v ? "filled" : "light"}
                onClick={() => setAmount(v)}
              >
                {v.toLocaleString("en-HK")}
              </Button>
            ))}
          </Group>
        )}

        <Group grow>
          <NumberInput
            label="存期"
            value={periodValue}
            onChange={setPeriodValue}
            min={1}
            required
          />
          <Select
            label="單位"
            data={periodUnits}
            value={periodUnit}
            onChange={setPeriodUnit}
            required
          />
        </Group>
        {!isEditing && recentPeriodSuggestions.length > 0 && (
          <Group gap={4}>
            {recentPeriodSuggestions.map((p) => (
              <Button
                key={`${p.value}-${p.unit}`}
                size="compact-xs"
                variant={periodValue === p.value && periodUnit === p.unit ? "filled" : "light"}
                onClick={() => {
                  setPeriodValue(p.value);
                  setPeriodUnit(p.unit);
                }}
              >
                {formatPeriodLabel(p.value, p.unit)}
              </Button>
            ))}
          </Group>
        )}

        <NumberInput
          label="年利率 (%)"
          value={interestRate}
          onChange={setInterestRate}
          min={0}
          step={0.01}
          decimalScale={2}
          required
        />
        {!isEditing && recentRateSuggestions.length > 0 && (
          <Group gap={4}>
            {recentRateSuggestions.map((v) => (
              <Button
                key={v}
                size="compact-xs"
                variant={interestRate === v ? "filled" : "light"}
                onClick={() => setInterestRate(v)}
              >
                {v}%
              </Button>
            ))}
          </Group>
        )}

        <Group grow>
          <DateInput
            label="起息日期"
            value={startDate}
            onChange={setStartDate}
            valueFormat="YYYY年MM月DD日"
            required
          />
          <DateInput
            label="到期日期"
            value={endDate}
            onChange={handleEndDateChange}
            valueFormat="YYYY年MM月DD日"
            required
          />
        </Group>

        <NumberInput
          label="利息收益 (HKD)"
          value={interest}
          onChange={handleInterestChange}
          decimalScale={2}
          fixedDecimalScale
          required
        />
        {shouldOfferFloorAlternative(interest, floorInterest, interestManuallyEdited) && (
          <Group gap={4}>
            <Button
              size="compact-xs"
              variant="light"
              onClick={() => {
                setInterest(floorInterest);
                setInterestManuallyEdited(true);
              }}
            >
              {floorInterest.toLocaleString("en-HK", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Button>
          </Group>
        )}

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

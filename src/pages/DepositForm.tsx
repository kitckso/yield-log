import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { DateInput } from "@mantine/dates";
import { useAuthStore } from "../store/auth";
import { useBanksStore } from "../store/banks";
import { useDepositsStore } from "../store/deposits";
import { calculateInterest, calculateEndDate } from "../hooks/useCalculations";
import dayjs from "dayjs";

const periodUnits = [
  { value: "days", label: "日" },
  { value: "weeks", label: "星期" },
  { value: "months", label: "個月" },
  { value: "years", label: "年" },
];

export default function DepositForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { user } = useAuthStore();
  const { banks, fetchBanks } = useBanksStore();
  const { deposits, addDeposit, updateDeposit } = useDepositsStore();

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(true);

  const [bankId, setBankId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | string>("");
  const [periodValue, setPeriodValue] = useState<number | string>(3);
  const [periodUnit, setPeriodUnit] = useState<string | null>("months");
  const [interestRate, setInterestRate] = useState<number | string>("");
  const [interest, setInterest] = useState<number | string>(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [interestManuallyEdited, setInterestManuallyEdited] = useState(false);
  const [endDateManuallyEdited, setEndDateManuallyEdited] = useState(false);

  const recentCutoff = dayjs().subtract(6, "month").format("YYYY-MM-DD");
  const recentAmounts = useMemo(() => {
    const vals = deposits.filter((d) => d.start_date >= recentCutoff).map((d) => d.amount);
    return [...new Set(vals)].sort((a, b) => b - a).slice(0, 5);
  }, [deposits, recentCutoff]);
  const recentRates = useMemo(() => {
    const vals = deposits.filter((d) => d.start_date >= recentCutoff).map((d) => d.interest_rate);
    return [...new Set(vals)].sort((a, b) => b - a).slice(0, 5);
  }, [deposits, recentCutoff]);

  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  useEffect(() => {
    if (!isEditing && banks.length > 0 && !bankId) {
      setBankId(banks[0].id);
    }
  }, [banks, isEditing, bankId]);

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
    } else {
      setFormLoading(false);
      setStartDate(new Date());
    }
  }, [id, deposits, isEditing]);

  // Auto-calc end date
  useEffect(() => {
    if (startDate && periodValue && periodUnit && !endDateManuallyEdited) {
      const end = calculateEndDate(
        startDate.toISOString().split("T")[0],
        Number(periodValue),
        periodUnit,
      );
      setEndDate(new Date(end));
    }
  }, [startDate, periodValue, periodUnit, endDateManuallyEdited]);

  // Auto-calc interest
  useEffect(() => {
    if (startDate && endDate && amount && interestRate && !interestManuallyEdited) {
      const calc = calculateInterest(
        Number(amount),
        Number(interestRate),
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
      );
      setInterest(calc);
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
    if (
      !bankId ||
      !amount ||
      !periodValue ||
      !periodUnit ||
      !interestRate ||
      !startDate ||
      !endDate
    ) {
      alert("請填寫所有欄位");
      return;
    }

    setLoading(true);

    const depositData = {
      user_id: user!.id,
      bank_id: bankId,
      amount: Number(amount),
      period_value: Number(periodValue),
      period_unit: periodUnit as "days" | "weeks" | "months" | "years",
      interest_rate: Number(interestRate),
      interest: Number(interest),
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    };

    if (isEditing && id) {
      await updateDeposit(id, depositData);
    } else {
      await addDeposit(depositData);
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
    setPeriodValue(3);
    setPeriodUnit("months");
    setInterestRate("");
    setInterest(0);
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
    <Container size="sm" pb={100} pt="md">
      <Stack gap="md">
        <Group>
          <Button
            variant="subtle"
            leftSection={<span className="material-symbols-outlined">arrow_back</span>}
            onClick={() => navigate("/deposits")}
          >
            返回
          </Button>
          <Title order={4}>{isEditing ? "編輯存款" : "新增存款"}</Title>
        </Group>

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            銀行名稱
          </Text>
          <Group gap={4}>
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
        {!isEditing && recentAmounts.length > 0 && (
          <Group gap={4}>
            {recentAmounts.map((v) => (
              <Button key={v} size="compact-xs" variant="light" onClick={() => setAmount(v)}>
                {v.toLocaleString("en-HK")}
              </Button>
            ))}
          </Group>
        )}

        <Group grow>
          <NumberInput label="存期" value={periodValue} onChange={setPeriodValue} min={1} />
          <Select label="單位" data={periodUnits} value={periodUnit} onChange={setPeriodUnit} />
        </Group>

        <NumberInput
          label="年利率 (%)"
          placeholder="4.25"
          value={interestRate}
          onChange={setInterestRate}
          min={0}
          step={0.01}
          decimalScale={2}
          required
        />
        {!isEditing && recentRates.length > 0 && (
          <Group gap={4}>
            {recentRates.map((v) => (
              <Button key={v} size="compact-xs" variant="light" onClick={() => setInterestRate(v)}>
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
            valueFormat="DD-MM-YYYY"
            required
          />
          <DateInput
            label="到期日期"
            value={endDate}
            onChange={handleEndDateChange}
            valueFormat="DD-MM-YYYY"
            required
          />
        </Group>

        <NumberInput
          label="利息收益 (HKD)"
          value={interest}
          onChange={handleInterestChange}
          decimalScale={2}
          fixedDecimalScale
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Container, Stack, Button, Group, Title, Loader, Center, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft } from "@tabler/icons-react";
import { useAuthStore } from "../store/auth";
import { useBanksStore } from "../store/banks";
import { useDepositsStore } from "../store/deposits";
import { getErrorMessage } from "../lib/errors";
import DepositFormFields from "../components/DepositFormFields";
import FetchErrorNotice from "../components/FetchErrorNotice";
import {
  buildDepositDraft,
  parseRenewParams,
  recentAmounts,
  recentPeriods,
  recentRates,
  resolveEndDate,
  resolveInterest,
  seedForNewDeposit,
  seedFromDeposit,
  seedFromRenew,
  shouldOfferFloorAlternative,
  type DepositFormSeed,
} from "../lib/depositForm";

export default function DepositForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;
  const isRenew = !isEditing && searchParams.get("renew") === "1";

  const { user } = useAuthStore();
  const { banks, fetchBanks } = useBanksStore();
  const {
    deposits,
    error: depositsError,
    fetchDeposits,
    addDeposit,
    updateDeposit,
  } = useDepositsStore();

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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
    // This page needs the deposit list either way: an edit reads the row it is
    // editing out of the store, and the suggestion chips read every deposit.
    void fetchDeposits().finally(() => setSearched(true));
  }, [fetchBanks, fetchDeposits]);

  const applySeed = (seed: DepositFormSeed) => {
    setBankId(seed.bankId);
    setAmount(seed.amount);
    setPeriodValue(seed.periodValue);
    setPeriodUnit(seed.periodUnit);
    setInterestRate(seed.interestRate);
    setStartDate(seed.startDate);
  };

  // Seed the form once per route. Re-running this would replace whatever the
  // user has typed, so an edit waits for its row to arrive instead of re-reading
  // the store every time the deposits change.
  const seededRoute = useRef<string | null>(null);
  const routeKey = isEditing ? `edit:${id}` : isRenew ? `renew:${searchParams.toString()}` : "new";

  useEffect(() => {
    if (seededRoute.current === routeKey) return;

    if (isEditing && id) {
      const deposit = deposits.find((d) => d.id === id);
      if (!deposit) return;
      applySeed(seedFromDeposit(deposit));
    } else if (isRenew) {
      applySeed(seedFromRenew(parseRenewParams(searchParams)));
    } else {
      applySeed(seedForNewDeposit());
    }

    seededRoute.current = routeKey;
  }, [deposits, id, isEditing, isRenew, routeKey, searchParams]);

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

  // An edit form has nothing to show until its deposit is in the store. A blank
  // form here would let 儲存存款 overwrite the row with whatever got typed in.
  if (isEditing && !searched) {
    return (
      <Center style={{ minHeight: "100dvh" }}>
        <Loader />
      </Center>
    );
  }

  if (isEditing && !deposits.some((d) => d.id === id)) {
    // Not finding the row is not the same as it being gone: the list may simply
    // have failed to load, and saying it was deleted would be a lie the user
    // acts on.
    if (depositsError) {
      return (
        <Container size="sm" pt="md" pb={{ base: 80, sm: 16 }}>
          <Stack gap="md">
            <FetchErrorNotice error={depositsError} onRetry={() => void fetchDeposits(true)} />
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={20} />}
              onClick={() => navigate("/deposits")}
            >
              返回
            </Button>
          </Stack>
        </Container>
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
            <Title order={2}>找不到存款記錄</Title>
          </Group>
          <Text size="sm" c="dimmed">
            這筆存款可能已被刪除，或連結有誤。
          </Text>
        </Stack>
      </Container>
    );
  }

  // The seed runs in an effect, so the render where the row first arrives would
  // otherwise commit one frame with blank fields before the values pop in. Safe
  // either way — an empty form cannot be saved — but it looks like a glitch.
  if (isEditing && seededRoute.current !== routeKey) {
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

import { Button, Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { formatPeriodLabel, PERIOD_UNIT_OPTIONS } from "../lib/period";
import type { PeriodSuggestion } from "../lib/depositForm";
import SuggestionChips from "./SuggestionChips";
import type { Bank } from "../types";

export interface DepositFormFieldsProps {
  isEditing: boolean;
  banks: Bank[];
  bankId: string | null;
  setBankId: (id: string) => void;
  amount: number | string;
  setAmount: (value: number | string) => void;
  periodValue: number | string;
  setPeriodValue: (value: number | string) => void;
  periodUnit: string | null;
  setPeriodUnit: (value: string | null) => void;
  interestRate: number | string;
  setInterestRate: (value: number | string) => void;
  startDate: Date | null;
  setStartDate: (value: Date | null) => void;
  endDate: Date | null;
  handleEndDateChange: (value: Date | null) => void;
  interest: number | string;
  handleInterestChange: (value: number | string) => void;
  floorInterest: number;
  showFloorAlternative: boolean;
  applyFloorInterest: () => void;
  recentAmountSuggestions: number[];
  recentRateSuggestions: number[];
  recentPeriodSuggestions: PeriodSuggestion[];
}

/** All editable inputs for a deposit, excluding the submit action bar. */
export default function DepositFormFields({
  isEditing,
  banks,
  bankId,
  setBankId,
  amount,
  setAmount,
  periodValue,
  setPeriodValue,
  periodUnit,
  setPeriodUnit,
  interestRate,
  setInterestRate,
  startDate,
  setStartDate,
  endDate,
  handleEndDateChange,
  interest,
  handleInterestChange,
  floorInterest,
  showFloorAlternative,
  applyFloorInterest,
  recentAmountSuggestions,
  recentRateSuggestions,
  recentPeriodSuggestions,
}: DepositFormFieldsProps) {
  return (
    <>
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
      {!isEditing && (
        <SuggestionChips
          suggestions={recentAmountSuggestions.map((v) => ({
            key: v,
            label: v.toLocaleString("en-HK"),
            selected: amount === v,
            onSelect: () => setAmount(v),
          }))}
        />
      )}

      <Group grow>
        <NumberInput label="存期" value={periodValue} onChange={setPeriodValue} min={1} required />
        <Select
          label="單位"
          data={PERIOD_UNIT_OPTIONS}
          value={periodUnit}
          onChange={setPeriodUnit}
          required
        />
      </Group>
      {!isEditing && (
        <SuggestionChips
          suggestions={recentPeriodSuggestions.map((p) => ({
            key: `${p.value}-${p.unit}`,
            label: formatPeriodLabel(p.value, p.unit),
            selected: periodValue === p.value && periodUnit === p.unit,
            onSelect: () => {
              setPeriodValue(p.value);
              setPeriodUnit(p.unit);
            },
          }))}
        />
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
      {!isEditing && (
        <SuggestionChips
          suggestions={recentRateSuggestions.map((v) => ({
            key: v,
            label: `${v}%`,
            selected: interestRate === v,
            onSelect: () => setInterestRate(v),
          }))}
        />
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
      {showFloorAlternative && (
        <SuggestionChips
          suggestions={[
            {
              key: "floor",
              label: floorInterest.toLocaleString("en-HK", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
              selected: false,
              onSelect: applyFloorInterest,
            },
          ]}
        />
      )}
    </>
  );
}

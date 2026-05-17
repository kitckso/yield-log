import { useRef, useState } from "react";
import { Container, Title, Text, Stack, Card, Button, Group } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { version } from "../../package.json";
import { useDepositsStore } from "../store/deposits";
import { useBanksStore } from "../store/banks";
import { useAuthStore } from "../store/auth";
import { supabase } from "../lib/supabase";

export default function Settings() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const user = useAuthStore((s) => s.user);

  const handleExport = () => {
    const deposits = useDepositsStore.getState().deposits;
    const banks = useBanksStore.getState().banks;
    const data = { version: "1.0", exportedAt: new Date().toISOString(), banks, deposits };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yieldlog-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("警告：匯入將先清除所有現有資料，並以檔案內容取代。是否繼續？")) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.version !== "1.0") {
        alert("不支援的檔案格式");
        return;
      }

      const userId = user!.id;

      await supabase.from("fixed_deposits").delete().eq("user_id", userId);
      await supabase.from("banks").delete().eq("user_id", userId);

      if (data.banks?.length) {
        const { error } = await supabase.from("banks").upsert(
          data.banks.map((b: { id: string; name: string }) => ({
            id: b.id,
            user_id: userId,
            name: b.name,
          })),
          { onConflict: "id" },
        );
        if (error) throw error;
      }

      if (data.deposits?.length) {
        const { error } = await supabase.from("fixed_deposits").upsert(
          data.deposits.map((d: Record<string, unknown>) => ({
            id: d.id,
            user_id: userId,
            bank_id: d.bank_id,
            amount: d.amount,
            period_value: d.period_value,
            period_unit: d.period_unit,
            interest_rate: d.interest_rate,
            interest: d.interest,
            start_date: d.start_date,
            end_date: d.end_date,
          })),
          { onConflict: "id" },
        );
        if (error) throw error;
      }

      await useBanksStore.getState().fetchBanks(true);
      await useDepositsStore.getState().fetchDeposits(true);

      alert("匯入完成");
      void navigate("/deposits");
    } catch {
      alert("匯入失敗，請檢查檔案格式");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Container size="sm" pb={100} pt="md">
      <Stack gap="md">
        <Title order={4}>設定</Title>

        <Card padding="lg" radius="lg" withBorder>
          <Stack gap="sm">
            <Text fw={700} size="lg">
              YieldLog
            </Text>
            <Text size="sm" c="dimmed">
              版本 {version}
            </Text>
            <Text size="xs" c="dimmed">
              個人定存記錄工具（Hong Kong Fixed Deposit Tracker）
            </Text>
          </Stack>
        </Card>

        <Card padding="lg" radius="lg" withBorder>
          <Stack gap="md">
            <Text fw={600}>資料匯出/匯入</Text>
            <Text size="sm" c="dimmed">
              將所有存款和銀行資料匯出為 JSON 檔案，或從 JSON 檔案匯入。
            </Text>
            <Group grow>
              <Button
                variant="outline"
                onClick={handleExport}
                leftSection={<span className="material-symbols-outlined">download</span>}
              >
                匯出
              </Button>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                loading={importing}
                leftSection={<span className="material-symbols-outlined">upload</span>}
              >
                匯入
              </Button>
            </Group>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleImport}
            />
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

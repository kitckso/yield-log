import { useEffect, useState } from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  TextInput,
  ActionIcon,
  Center,
  Loader,
  Group,
  Modal,
  Button,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconCoin } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useDisclosure } from "@mantine/hooks";
import { useBanksStore } from "../store/banks";
import { getErrorMessage } from "../hooks/useCalculations";
import UserMenu from "../components/UserMenu";
import BankItem from "../components/BankItem";

export default function BankManagement() {
  const { banks, fetchBanks, addBank, updateBank, deleteBank } = useBanksStore();
  const [loading, setLoading] = useState(true);
  const [newBankName, setNewBankName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  useEffect(() => {
    void fetchBanks().finally(() => setLoading(false));
  }, [fetchBanks]);

  const handleAdd = async () => {
    if (!newBankName.trim()) return;
    try {
      await addBank(newBankName.trim());
      setNewBankName("");
      notifications.show({
        title: "已新增",
        message: `銀行「${newBankName.trim()}」已成功新增`,
        color: "green",
      });
    } catch (e) {
      notifications.show({
        title: "錯誤",
        message: getErrorMessage(e),
        color: "red",
      });
    }
  };

  const handleEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
    openModal();
  };

  const handleUpdate = async () => {
    if (!editingId || !editingName.trim()) return;
    try {
      await updateBank(editingId, editingName.trim());
      closeModal();
      setEditingId(null);
      setEditingName("");
      notifications.show({
        title: "已更新",
        message: "銀行名稱已成功更新",
        color: "green",
      });
    } catch (e) {
      notifications.show({
        title: "錯誤",
        message: getErrorMessage(e),
        color: "red",
      });
    }
  };

  const handleDelete = (id: string) => {
    const bank = banks.find((b) => b.id === id);
    modals.openConfirmModal({
      title: "確認刪除",
      children: <Text size="sm">確定刪除銀行「{bank?.name}」？所有相關的存款記錄也會被刪除。</Text>,
      labels: { confirm: "刪除", cancel: "取消" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteBank(id);
          notifications.show({
            title: "已刪除",
            message: "銀行已成功刪除",
            color: "green",
          });
        } catch (e) {
          notifications.show({
            title: "錯誤",
            message: getErrorMessage(e),
            color: "red",
          });
        }
      },
    });
  };

  if (loading) {
    return (
      <Center style={{ minHeight: "100dvh" }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="sm" pt="md" pb={{ base: 110, sm: 16 }}>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>銀行管理</Title>
            <Text size="sm" c="dimmed">
              設置並管理您的常用存款銀行
            </Text>
          </div>
          <UserMenu />
        </Group>

        <TextInput
          placeholder="輸入銀行名稱 (例如: HSBC)"
          value={newBankName}
          onChange={(e) => setNewBankName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
          rightSection={
            <ActionIcon
              variant="filled"
              color="blue"
              onClick={handleAdd}
              disabled={!newBankName.trim()}
            >
              <IconPlus size={20} />
            </ActionIcon>
          }
        />

        <Stack gap="sm">
          {banks.map((bank) => (
            <BankItem
              key={bank.id}
              name={bank.name}
              onEdit={() => handleEdit(bank.id, bank.name)}
              onDelete={() => handleDelete(bank.id)}
            />
          ))}

          {banks.length === 0 && (
            <Center py="xl">
              <Stack align="center" gap="md">
                <IconCoin size={48} color="var(--mantine-color-gray-4)" />
                <Text c="dimmed">尚未新增銀行</Text>
                <Text size="sm" c="dimmed" ta="center">
                  新增銀行後可開始新增存款記錄
                </Text>
              </Stack>
            </Center>
          )}
        </Stack>
      </Stack>

      <Modal opened={modalOpened} onClose={closeModal} title="編輯銀行" centered>
        <Stack>
          <TextInput
            label="銀行名稱"
            value={editingName}
            onChange={(e) => setEditingName(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={closeModal}>
              取消
            </Button>
            <Button onClick={handleUpdate}>儲存</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

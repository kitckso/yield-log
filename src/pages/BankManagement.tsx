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
import { useDisclosure } from "@mantine/hooks";
import { useBanksStore } from "../store/banks";
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
    await addBank(newBankName.trim());
    setNewBankName("");
  };

  const handleEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
    openModal();
  };

  const handleUpdate = async () => {
    if (!editingId || !editingName.trim()) return;
    await updateBank(editingId, editingName.trim());
    closeModal();
    setEditingId(null);
    setEditingName("");
  };

  const handleDelete = async (id: string) => {
    if (confirm("確定刪除此銀行？所有相關存款也會被刪除。")) {
      await deleteBank(id);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: "100dvh" }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="sm" pb={100} pt="md">
      <Stack gap="md">
        <div>
          <Title order={2}>銀行管理</Title>
          <Text size="sm" c="dimmed">
            設置並管理您的常用存款銀行
          </Text>
        </div>

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
              <span className="material-symbols-outlined">add</span>
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
            <Text c="dimmed" ta="center" py="xl">
              尚未新增銀行
            </Text>
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

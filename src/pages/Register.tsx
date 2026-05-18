import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Card,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Center,
  Anchor,
} from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useAuthStore } from "../store/auth";

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registrationEnabled = import.meta.env.VITE_ENABLE_REGISTRATION === "true";

  const handleSubmit = async () => {
    setError("");
    if (!email || !password || !confirmPassword) {
      setError("請填寫所有欄位");
      return;
    }
    if (password !== confirmPassword) {
      setError("密碼不一致");
      return;
    }
    if (password.length < 6) {
      setError("密碼長度至少 6 個字元");
      return;
    }
    setLoading(true);
    const err = await signUp(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      void navigate("/");
    }
  };

  return (
    <Center style={{ minHeight: "100dvh" }}>
      <Container size="xs" w="100%">
        <Card padding="xl" radius="lg" shadow="sm">
          {registrationEnabled ? (
            <Stack gap="md">
              <Title order={2} ta="center">
                建立帳戶
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                註冊 YieldLog 開始記錄定存
              </Text>

              <TextInput
                label="電郵"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
              />

              <PasswordInput
                label="密碼"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />

              <PasswordInput
                label="確認密碼"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                required
              />

              {error && (
                <Text size="sm" c="red">
                  {error}
                </Text>
              )}

              <Button fullWidth loading={loading} onClick={handleSubmit}>
                註冊
              </Button>

              <Text size="sm" ta="center">
                已有帳戶？{" "}
                <Link
                  to="/login"
                  style={{ color: "var(--mantine-color-blue-6)", textDecoration: "none" }}
                >
                  登入
                </Link>
              </Text>
            </Stack>
          ) : (
            <Stack gap="md" align="center">
              <IconLock size={48} color="var(--mantine-color-gray-5)" />
              <Title order={2} ta="center">
                註冊已關閉
              </Title>
              <Text size="sm" c="dimmed" ta="center" maw={320}>
                此應用為個人使用，不開放公開註冊。如想自行部署，請前往 GitHub 查看說明。
              </Text>
              <Anchor href="https://github.com/kitckso/yield-log" target="_blank" size="sm">
                github.com/kitckso/yield-log
              </Anchor>
              <Text size="sm" ta="center" mt="sm">
                <Link
                  to="/login"
                  style={{ color: "var(--mantine-color-blue-6)", textDecoration: "none" }}
                >
                  返回登入
                </Link>
              </Text>
            </Stack>
          )}
        </Card>
      </Container>
    </Center>
  );
}

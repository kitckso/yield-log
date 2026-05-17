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
} from "@mantine/core";
import { useAuthStore } from "../store/auth";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError("請填寫所有欄位");
      return;
    }
    setLoading(true);
    const err = await signIn(email, password);
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
          <Stack gap="md">
            <Title order={2} ta="center">
              YieldLog
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              登入以管理您的定期存款
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

            {error && (
              <Text size="sm" c="red">
                {error}
              </Text>
            )}

            <Button fullWidth loading={loading} onClick={handleSubmit}>
              登入
            </Button>

            <Text size="sm" ta="center">
              還沒有帳戶？{" "}
              <Link
                to="/register"
                style={{ color: "var(--mantine-color-blue-6)", textDecoration: "none" }}
              >
                註冊
              </Link>
            </Text>
          </Stack>
        </Card>
      </Container>
    </Center>
  );
}

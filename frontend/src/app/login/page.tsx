"use client";
import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Alert,
  Stack,
  Box,
  Anchor,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      localStorage.setItem("access_token", data.access_token);
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      localStorage.setItem("user_role", payload.role);
      localStorage.setItem("user_email", payload.sub);
      router.push("/candidates");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <Box style={{ width: "100%", maxWidth: 400 }}>
        <Box mb="xl" style={{ textAlign: "center" }}>
          <Title order={2} fw={700} mb={4}>
            TechKraft
          </Title>
          <Text size="sm" c="dimmed">
            Recruitment Dashboard
          </Text>
        </Box>

        <Paper radius="md" p="xl" withBorder>
          <Title order={4} fw={600} mb={4}>
            Sign in to your account
          </Title>
          <Text size="sm" c="dimmed" mb="lg">
            Enter your credentials to continue
          </Text>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                size="sm"
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                size="sm"
              />

              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  variant="light"
                  radius="md"
                >
                  {error}
                </Alert>
              )}

              <Button type="submit" loading={loading} fullWidth size="sm" mt="xs">
                Sign In
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text size="xs" c="dimmed" ta="center" mt="md">
          TechKraft Recruitment © {new Date().getFullYear()}
        </Text>
      </Box>
    </Box>
  );
}
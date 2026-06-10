"use client";
import { useState, useEffect, JSX } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCandidate, submitScore, generateSummary, updateNotes } from "@/lib/api";
import {
  Paper, Title, Text, Badge, Button, Textarea, Loader,
  Group, Stack, Box, Avatar, ActionIcon, Divider,
  Alert, Tooltip, Select,
} from "@mantine/core";
import {
  IconArrowLeft, IconAlertCircle, IconCheck, IconSparkles,
} from "@tabler/icons-react";

interface Score {
  id: number;
  category: string;
  score: number;
  note?: string;
  reviewer?: { email: string };
}

interface Candidate {
  id: number;
  name: string;
  email: string;
  role_applied: string;
  skills: string[];
  status: "new" | "reviewed" | "hired" | "rejected" | "archived";
  internal_notes?: string;
  scores: Score[];
}

const STATUS_COLOR: Record<string, string> = {
  new: "blue", reviewed: "yellow", hired: "green", rejected: "red", archived: "gray",
};

const CATEGORIES = ["Technical", "Communication", "Culture Fit", "Problem Solving"];

export default function CandidateDetailPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");

  const [category, setCategory] = useState<string>("Technical");
  const [score, setScore] = useState<number>(3);
  const [note, setNote] = useState<string>("");
  const [scoreLoading, setScoreLoading] = useState<boolean>(false);
  const [scoreSuccess, setScoreSuccess] = useState<string>("");
  const [scoreError, setScoreError] = useState<string>("");

  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string>("");

  const [notes, setNotes] = useState<string>("");
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [notesSuccess, setNotesSuccess] = useState<string>("");

  useEffect(() => {
    if (!localStorage.getItem("access_token")) { router.push("/login"); return; }
    setUserRole(localStorage.getItem("user_role") || "");
    fetchCandidate();
  }, [id]);

  async function fetchCandidate(): Promise<void> {
    setLoading(true);
    try {
      const data: Candidate = await getCandidate(id);
      setCandidate(data);
      setNotes(data.internal_notes || "");
    } catch {
      setError("Failed to load candidate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitScore(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setScoreLoading(true);
    setScoreSuccess("");
    setScoreError("");
    try {
      await submitScore(id, { category, score, note });
      setScoreSuccess("Score submitted.");
      setNote("");
      fetchCandidate();
    } catch {
      setScoreError("Failed to submit score.");
    } finally {
      setScoreLoading(false);
    }
  }

  async function handleGenerateSummary(): Promise<void> {
    setSummaryLoading(true);
    setSummaryError("");
    setSummary("");
    try {
      const data = await generateSummary(id);
      setSummary(data.summary);
    } catch {
      setSummaryError("Failed to generate summary.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleSaveNotes(): Promise<void> {
    setNotesLoading(true);
    setNotesSuccess("");
    try {
      await updateNotes(id, notes);
      setNotesSuccess("Notes saved.");
    } catch {
      setNotesSuccess("Failed to save notes.");
    } finally {
      setNotesLoading(false);
    }
  }

  if (loading) {
    return (
      <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6" }}>
        <Loader size="md" />
      </Box>
    );
  }

  if (error || !candidate) {
    return (
      <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6" }}>
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
          {error || "Candidate not found."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
      {/* Navbar */}
      <Box
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text fw={700} size="lg">TechKraft</Text>
        <Group gap="sm">
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => router.push("/candidates")}
          >
            Back
          </Button>
          <Badge variant="light" size="sm">{userRole}</Badge>
        </Group>
      </Box>

      <Box style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px" }}>
        <Stack gap="md">

          {/* Profile */}
          <Paper withBorder radius="md" p="lg">
            <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
              <Group gap="md">
                <Avatar size={48} radius="xl" color="blue">
                  {candidate.name?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Title order={4} fw={600}>{candidate.name}</Title>
                  <Text size="sm" c="dimmed">{candidate.email}</Text>
                  <Text size="sm" mt={2}>{candidate.role_applied}</Text>
                </Box>
              </Group>
              <Badge
                color={STATUS_COLOR[candidate.status] || "gray"}
                variant="light"
                size="md"
                tt="capitalize"
              >
                {candidate.status}
              </Badge>
            </Group>

            {(candidate.skills || []).length > 0 && (
              <>
                <Divider my="md" />
                <Group gap={6}>
                  {candidate.skills.map((skill: string) => (
                    <Badge key={skill} variant="light" size="sm">{skill}</Badge>
                  ))}
                </Group>
              </>
            )}
          </Paper>

          {/* Scores */}
          <Paper withBorder radius="md" p="lg">
            <Title order={5} fw={600} mb="md">
              {userRole === "admin" ? "All Scores" : "Your Scores"}
            </Title>

            {candidate.scores.length === 0 ? (
              <Text size="sm" c="dimmed">No scores submitted yet.</Text>
            ) : (
              <Stack gap="xs">
                {candidate.scores.map((s: Score) => (
                  <Paper key={s.id} withBorder radius="sm" p="sm">
                    <Group justify="space-between" wrap="wrap" gap="sm">
                      <Box>
                        <Text size="sm" fw={500}>{s.category}</Text>
                        {s.note && <Text size="xs" c="dimmed" mt={2}>{s.note}</Text>}
                        {userRole === "admin" && s.reviewer && (
                          <Text size="xs" c="dimmed" mt={2}>by {s.reviewer.email}</Text>
                        )}
                      </Box>
                      <Group gap={4}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Box
                            key={n}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 600,
                              backgroundColor: n <= s.score ? "#228be6" : "#f1f3f5",
                              color: n <= s.score ? "white" : "#adb5bd",
                            }}
                          >
                            {n}
                          </Box>
                        ))}
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>

          {/* Submit Score */}
          <Paper withBorder radius="md" p="lg">
            <Title order={5} fw={600} mb="md">Submit a Score</Title>
            <form onSubmit={handleSubmitScore}>
              <Stack gap="sm">
                <Select
                  label="Category"
                  size="sm"
                  data={CATEGORIES}
                  value={category}
                  onChange={(val) => setCategory(val || "Technical")}
                />

                <Box>
                  <Text size="sm" fw={500} mb={6}>Score</Text>
                  <Group gap="sm">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Box
                        key={n}
                        onClick={() => setScore(n)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          backgroundColor: score === n ? "#228be6" : "white",
                          color: score === n ? "white" : "#495057",
                          border: score === n ? "2px solid #228be6" : "2px solid #dee2e6",
                          transition: "all 0.1s",
                          userSelect: "none",
                        }}
                      >
                        {n}
                      </Box>
                    ))}
                  </Group>
                </Box>

                <Textarea
                  label="Note"
                  description="Optional"
                  placeholder="Comment on this score..."
                  size="sm"
                  rows={2}
                  value={note}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                />

                {scoreSuccess && (
                  <Alert icon={<IconCheck size={14} />} color="green" variant="light" p="xs">
                    {scoreSuccess}
                  </Alert>
                )}
                {scoreError && (
                  <Alert icon={<IconAlertCircle size={14} />} color="red" variant="light" p="xs">
                    {scoreError}
                  </Alert>
                )}

                <Box>
                  <Button type="submit" size="sm" loading={scoreLoading}>
                    Submit Score
                  </Button>
                </Box>
              </Stack>
            </form>
          </Paper>

          {/* AI Summary */}
          <Paper withBorder radius="md" p="lg">
            <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
              <Title order={5} fw={600}>AI Summary</Title>
              <Button
                size="sm"
                variant="light"
                leftSection={<IconSparkles size={14} />}
                onClick={handleGenerateSummary}
                loading={summaryLoading}
              >
                {summary ? "Regenerate" : "Generate Summary"}
              </Button>
            </Group>

            {summaryError && (
              <Alert icon={<IconAlertCircle size={14} />} color="red" variant="light">
                {summaryError}
              </Alert>
            )}

            {summary ? (
              <Paper withBorder radius="sm" p="md" style={{ backgroundColor: "#f8f9fa" }}>
                <Text size="sm" style={{ lineHeight: 1.7 }}>{summary}</Text>
              </Paper>
            ) : !summaryLoading && (
              <Text size="sm" c="dimmed">
                Generate an AI-powered summary based on this candidate&apos;s scores and notes.
              </Text>
            )}
          </Paper>

          {/* Admin Notes */}
          {userRole === "admin" && (
            <Paper withBorder radius="md" p="lg" style={{ borderLeft: "3px solid #fd7e14" }}>
              <Title order={5} fw={600} mb={4}>Internal Notes</Title>
              <Text size="xs" c="dimmed" mb="md">Visible to admins only</Text>

              <Textarea
                placeholder="Add notes about this candidate..."
                size="sm"
                rows={4}
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                mb="sm"
              />

              {notesSuccess && (
                <Alert icon={<IconCheck size={14} />} color="green" variant="light" mb="sm" p="xs">
                  {notesSuccess}
                </Alert>
              )}

              <Button size="sm" color="orange" loading={notesLoading} onClick={handleSaveNotes}>
                Save Notes
              </Button>
            </Paper>
          )}

        </Stack>
      </Box>
    </Box>
  );
}
"use client";
import { useState, useEffect, useCallback, JSX } from "react";
import { useRouter } from "next/navigation";
import { getCandidates, createCandidate, updateCandidate, deleteCandidate } from "@/lib/api";
import {
  Table, Modal, Button, TextInput, Select, Textarea, Badge,
  Paper, Group, Text, Title, ActionIcon, ScrollArea, Loader,
  Stack, Avatar, Box, Divider, Tooltip, Menu,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconPlus, IconEdit, IconTrash, IconEye, IconSearch,
  IconLogout, IconChevronDown, IconDotsVertical,
} from "@tabler/icons-react";

const PAGE_SIZE = 10;

interface Candidate {
  id: number;
  name: string;
  email: string;
  role_applied: string;
  skills: string[];
  status: "new" | "reviewed" | "hired" | "rejected";
  internal_notes?: string;
}

interface CandidateForm {
  name: string;
  email: string;
  role_applied: string;
  skills: string;
  internal_notes: string;
}

const STATUS_COLOR: Record<string, string> = {
  hired: "green",
  rejected: "red",
  reviewed: "yellow",
  new: "blue",
};

export default function CandidatesPage(): JSX.Element {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  const [status, setStatus] = useState<string>("");
  const [roleApplied, setRoleApplied] = useState<string>("");
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [form, setForm] = useState<CandidateForm>({
    name: "", email: "", role_applied: "", skills: "", internal_notes: "",
  });
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  const [editModal, setEditModal] = useState<boolean>(false);
  const [editingCandidate, setEditingCandidate] = useState<(Omit<Candidate, "skills"> & { skills: string }) | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    setUserRole(localStorage.getItem("user_role") || "");
    setUserEmail(localStorage.getItem("user_email") || "");
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => { setKeyword(keywordInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const fetchCandidates = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const data = await getCandidates({
        status: status || undefined,
        role_applied: roleApplied || undefined,
        keyword: keyword || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setCandidates(data.results || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load candidates.");
    } finally {
      setLoading(false);
    }
  }, [status, roleApplied, keyword, page]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const openEditModal = (candidate: Candidate): void => {
    setEditingCandidate({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      role_applied: candidate.role_applied,
      skills: Array.isArray(candidate.skills) ? candidate.skills.join(", ") : String(candidate.skills || ""),
      status: candidate.status,
      internal_notes: candidate.internal_notes,
    });
    setEditModal(true);
  };

  const handleUpdateCandidate = async (): Promise<void> => {
    if (!editingCandidate) return;
    try {
      const skillsArray = editingCandidate.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
      await updateCandidate(editingCandidate.id, { ...editingCandidate, skills: skillsArray });
      setEditModal(false);
      fetchCandidates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      const skillsArray = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
      await createCandidate({ ...form, skills: skillsArray });
      setShowAddModal(false);
      setForm({ name: "", email: "", role_applied: "", skills: "", internal_notes: "" });
      fetchCandidates();
    } catch {
      setFormError("Failed to create candidate. Email may already exist.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: number): void => {
    modals.openConfirmModal({
      title: "Delete Candidate",
      children: <Text size="sm">This will permanently delete the candidate. This cannot be undone.</Text>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => { await deleteCandidate(id); fetchCandidates(); },
    });
  };

  const handleLogout = (): void => { localStorage.clear(); router.push("/login"); };
  const hasFilters = Boolean(status || roleApplied || keyword);

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
          <Avatar radius="xl" size="sm" color="blue">
            {userEmail?.[0]?.toUpperCase() || "U"}
          </Avatar>
          <Text size="sm">{userEmail}</Text>
          <Badge variant="light" size="sm">{userRole}</Badge>
          <Tooltip label="Sign out">
            <ActionIcon variant="subtle" color="gray" onClick={handleLogout}>
              <IconLogout size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Box>

      <Box style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        <Group justify="space-between" mb="lg">
          <Box>
            <Title order={3} fw={600}>Candidates</Title>
            <Text size="sm" c="dimmed">{total} total</Text>
          </Box>
          {userRole === "admin" && (
            <Button
              leftSection={<IconPlus size={16} />}
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              Add Candidate
            </Button>
          )}
        </Group>

        {/* Filters */}
        <Paper p="sm" withBorder mb="md" radius="md">
          <Group gap="sm" wrap="wrap">
            <TextInput
              placeholder="Search by name or email..."
              value={keywordInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeywordInput(e.target.value)}
              leftSection={<IconSearch size={14} />}
              size="sm"
              style={{ flex: 1, minWidth: 200 }}
            />
            <Select
              placeholder="All Statuses"
              value={status || null}
              onChange={(val) => { setStatus(val || ""); setPage(1); }}
              data={[
                { value: "new", label: "New" },
                { value: "reviewed", label: "Reviewed" },
                { value: "hired", label: "Hired" },
                { value: "rejected", label: "Rejected" },
              ]}
              size="sm"
              clearable
              style={{ width: 150 }}
            />
            <Select
              placeholder="All Roles"
              value={roleApplied || null}
              onChange={(val) => { setRoleApplied(val || ""); setPage(1); }}
              data={[
                { value: "Frontend Engineer", label: "Frontend Engineer" },
                { value: "Backend Engineer", label: "Backend Engineer" },
                { value: "Full Stack Engineer", label: "Full Stack Engineer" },
                { value: "Designer", label: "Designer" },
              ]}
              size="sm"
              clearable
              style={{ width: 170 }}
            />
            {hasFilters && (
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => { setStatus(""); setRoleApplied(""); setKeywordInput(""); setPage(1); }}
              >
                Clear
              </Button>
            )}
          </Group>
        </Paper>

        {error && <Text c="red" size="sm" mb="md">{error}</Text>}

        {loading ? (
          <Box style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
            <Loader size="md" />
          </Box>
        ) : candidates.length === 0 ? (
          <Paper p="xl" withBorder radius="md" ta="center">
            <Text c="dimmed" size="sm">
              {hasFilters ? "No candidates match your filters." : "No candidates yet. Add one to get started."}
            </Text>
          </Paper>
        ) : (
          <>
            <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
              <ScrollArea>
                <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Role</Table.Th>
                      <Table.Th>Skills</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {candidates.map((candidate) => (
                      <Table.Tr key={candidate.id}>
                        <Table.Td>
                          <Group gap="sm">
                            <Avatar size="sm" radius="xl" color="blue">
                              {candidate.name?.[0]?.toUpperCase()}
                            </Avatar>
                            <Text size="sm" fw={500}>{candidate.name}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{candidate.email}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{candidate.role_applied}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            {(candidate.skills || []).slice(0, 2).map((skill: string) => (
                              <Badge key={skill} variant="light" size="sm">{skill}</Badge>
                            ))}
                            {(candidate.skills || []).length > 2 && (
                              <Badge variant="light" color="gray" size="sm">
                                +{candidate.skills.length - 2}
                              </Badge>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={STATUS_COLOR[candidate.status] || "gray"}
                            variant="light"
                            size="sm"
                            tt="capitalize"
                          >
                            {candidate.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="flex-end">
                            <Tooltip label="View">
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="sm"
                                onClick={() => router.push(`/candidates/${candidate.id}`)}
                              >
                                <IconEye size={15} />
                              </ActionIcon>
                            </Tooltip>
                            {userRole === "admin" && (
                              <>
                                <Tooltip label="Edit">
                                  <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={() => openEditModal(candidate)}
                                  >
                                    <IconEdit size={15} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Delete">
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    size="sm"
                                    onClick={() => handleDelete(candidate.id)}
                                  >
                                    <IconTrash size={15} />
                                  </ActionIcon>
                                </Tooltip>
                              </>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>

            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} candidates
              </Text>
              <Group gap="xs">
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Text size="sm" c="dimmed">Page {page} of {totalPages || 1}</Text>
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </Group>
            </Group>
          </>
        )}
      </Box>

      {/* Add Modal */}
      <Modal
        opened={showAddModal}
        onClose={() => { setShowAddModal(false); setFormError(""); }}
        title="Add Candidate"
        centered
        size="md"
      >
        <form onSubmit={handleCreateCandidate}>
          <Stack gap="sm">
            <TextInput
              label="Full Name"
              placeholder="Alice Johnson"
              required
              size="sm"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
            />
            <TextInput
              label="Email"
              type="email"
              placeholder="alice@example.com"
              required
              size="sm"
              value={form.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
            />
            <Select
              label="Role Applied"
              placeholder="Select a role"
              size="sm"
              data={["Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "Designer"]}
              value={form.role_applied}
              onChange={(val) => setForm({ ...form, role_applied: val || "" })}
            />
            <TextInput
              label="Skills"
              placeholder="React, TypeScript, Node.js"
              description="Separate with commas"
              size="sm"
              value={form.skills}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, skills: e.target.value })}
            />
            <Textarea
              label="Internal Notes"
              placeholder="Admin-only notes..."
              size="sm"
              rows={3}
              value={form.internal_notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, internal_notes: e.target.value })}
            />
            {formError && <Text c="red" size="sm">{formError}</Text>}
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" size="sm" onClick={() => { setShowAddModal(false); setFormError(""); }}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={formLoading}>
                Create Candidate
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Candidate"
        centered
        size="md"
      >
        {editingCandidate && (
          <Stack gap="sm">
            <TextInput
              label="Name"
              size="sm"
              value={editingCandidate.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingCandidate({ ...editingCandidate, name: e.target.value })}
            />
            <TextInput
              label="Email"
              size="sm"
              value={editingCandidate.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingCandidate({ ...editingCandidate, email: e.target.value })}
            />
            <TextInput
              label="Role Applied"
              size="sm"
              value={editingCandidate.role_applied}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingCandidate({ ...editingCandidate, role_applied: e.target.value })}
            />
            <TextInput
              label="Skills"
              description="Separate with commas"
              size="sm"
              value={editingCandidate.skills}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingCandidate({ ...editingCandidate, skills: e.target.value })}
            />
            <Textarea
              label="Internal Notes"
              size="sm"
              rows={3}
              value={editingCandidate.internal_notes || ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setEditingCandidate({ ...editingCandidate, internal_notes: e.target.value })}
            />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" size="sm" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdateCandidate}>Save Changes</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
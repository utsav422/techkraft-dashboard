// Base URL for all API calls
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Attach JWT token to every request automatically
function getAuthHeader() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Auth ---

export async function login(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    // OAuth2 login needs form data, not JSON
    body: new URLSearchParams({ username: email, password }),
  });
  if (!response.ok) throw new Error("Invalid credentials");
  return response.json();
}

export async function register(email, password) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("Registration failed");
  return response.json();
}

// --- Candidates ---

export async function getCandidates(filters = {}) {
  // Build query string from filters object
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.role_applied) params.append("role_applied", filters.role_applied);
  if (filters.skill) params.append("skill", filters.skill);
  if (filters.keyword) params.append("keyword", filters.keyword);
  if (filters.page) params.append("page", filters.page);
  if (filters.page_size) params.append("page_size", filters.page_size);

  const response = await fetch(`${API_URL}/api/candidates/?${params}`, {
    headers: { ...getAuthHeader() },
  });
  if (!response.ok) throw new Error("Failed to fetch candidates");
  return response.json();
}

export async function getCandidate(id) {
  const response = await fetch(`${API_URL}/api/candidates/${id}`, {
    headers: { ...getAuthHeader() },
  });
  if (!response.ok) throw new Error("Failed to fetch candidate");
  return response.json();
}

export async function submitScore(id, data) {
  const response = await fetch(`${API_URL}/api/candidates/${id}/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to submit score");
  return response.json();
}

export async function generateSummary(id) {
  const response = await fetch(`${API_URL}/api/candidates/${id}/summary`, {
    method: "POST",
    headers: { ...getAuthHeader() },
  });
  if (!response.ok) throw new Error("Failed to generate summary");
  return response.json();
}

export async function updateNotes(id, internal_notes) {
  const response = await fetch(`${API_URL}/api/candidates/${id}/notes`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ internal_notes }),
  });
  if (!response.ok) throw new Error("Failed to update notes");
  return response.json();
}
export async function createCandidate(data) {
  const response = await fetch(`${API_URL}/api/candidates/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create candidate");
  return response.json();
}
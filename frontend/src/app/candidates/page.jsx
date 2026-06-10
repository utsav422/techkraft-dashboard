"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCandidates, createCandidate } from "@/lib/api";

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-yellow-100 text-yellow-700",
  hired: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-700",
};

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  // Filter state
  const [status, setStatus] = useState("");
  const [roleApplied, setRoleApplied] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", role_applied: "", skills: "", internal_notes: ""
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.push("/login");
      return;
    }
    setUserRole(localStorage.getItem("user_role") || "");
  }, []);

  // Debounce keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const fetchCandidates = useCallback(async () => {
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
      setCandidates(data.results);
      setTotal(data.total);
    } catch (err) {
      setError("Failed to load candidates.");
    } finally {
      setLoading(false);
    }
  }, [status, roleApplied, keyword, page]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  function handleLogout() {
    localStorage.clear();
    router.push("/login");
  }

  async function handleCreateCandidate(e) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      // Convert comma-separated skills string to array
      const skillsArray = form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createCandidate({
        name: form.name,
        email: form.email,
        role_applied: form.role_applied,
        skills: skillsArray,
        internal_notes: form.internal_notes,
      });

      // Close modal, reset form, refresh list
      setShowModal(false);
      setForm({ name: "", email: "", role_applied: "", skills: "", internal_notes: "" });
      fetchCandidates();
    } catch (err) {
      setFormError("Failed to create candidate. Email may already exist.");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">TechKraft Recruitment</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {typeof window !== "undefined" && localStorage.getItem("user_email")}
          </span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
            {userRole}
          </span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header row */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Candidates</h2>
          {/* Only admins can add candidates */}
          {userRole === "admin" && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              + Add Candidate
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={roleApplied}
            onChange={(e) => { setRoleApplied(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="Frontend Engineer">Frontend Engineer</option>
            <option value="Backend Engineer">Backend Engineer</option>
            <option value="Full Stack Engineer">Full Stack Engineer</option>
            <option value="Designer">Designer</option>
          </select>
          {(status || roleApplied || keyword) && (
            <button
              onClick={() => { setStatus(""); setRoleApplied(""); setKeywordInput(""); setPage(1); }}
              className="text-sm text-gray-500 hover:text-red-500 px-3 py-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading candidates...</div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No candidates found.</div>
        ) : (
          <>
            <div className="grid gap-4">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/candidates/${c.id}`)}
                  className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition flex justify-between items-start"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{c.email}</p>
                    <p className="text-sm text-gray-600 mt-1">{c.role_applied}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(c.skills || []).map((skill) => (
                        <span key={skill} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-gray-300 text-xl">→</span>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-gray-500">
                Showing {candidates.length} of {total} candidates
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Candidate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-800">Add New Candidate</h3>
              <button
                onClick={() => { setShowModal(false); setFormError(""); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCandidate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alice Johnson"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="alice@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Applied</label>
                <select
                  value={form.role_applied}
                  onChange={(e) => setForm({ ...form, role_applied: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a role</option>
                  <option value="Frontend Engineer">Frontend Engineer</option>
                  <option value="Backend Engineer">Backend Engineer</option>
                  <option value="Full Stack Engineer">Full Stack Engineer</option>
                  <option value="Designer">Designer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills <span className="text-gray-400">(comma separated)</span>
                </label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="React, TypeScript, Node.js"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Notes <span className="text-gray-400">(admin only)</span>
                </label>
                <textarea
                  value={form.internal_notes}
                  onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
                  rows={2}
                  placeholder="Private notes..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formError && (
                <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(""); }}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? "Creating..." : "Create Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

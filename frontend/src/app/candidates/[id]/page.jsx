"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCandidate, submitScore, generateSummary, updateNotes } from "@/lib/api";

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-yellow-100 text-yellow-700",
  hired: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-700",
};

const CATEGORIES = ["Technical", "Communication", "Culture Fit", "Problem Solving"];

export default function CandidateDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  // Score form state
  const [category, setCategory] = useState("Technical");
  const [score, setScore] = useState(3);
  const [note, setNote] = useState("");
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreSuccess, setScoreSuccess] = useState("");
  const [scoreError, setScoreError] = useState("");

  // AI Summary state
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  // Admin notes state
  const [notes, setNotes] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState("");

  // Load user role and candidate data
  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.push("/login");
      return;
    }
    setUserRole(localStorage.getItem("user_role") || "");
    fetchCandidate();
  }, [id]);

  async function fetchCandidate() {
    setLoading(true);
    try {
      const data = await getCandidate(id);
      setCandidate(data);
      setNotes(data.internal_notes || "");
    } catch (err) {
      setError("Failed to load candidate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitScore(e) {
    e.preventDefault();
    setScoreLoading(true);
    setScoreSuccess("");
    setScoreError("");
    try {
      await submitScore(id, { category, score: parseInt(score), note });
      setScoreSuccess("Score submitted successfully!");
      setNote("");
      // Refresh candidate to show new score
      fetchCandidate();
    } catch (err) {
      setScoreError("Failed to submit score. Try again.");
    } finally {
      setScoreLoading(false);
    }
  }

  async function handleGenerateSummary() {
    setSummaryLoading(true);
    setSummaryError("");
    setSummary("");
    try {
      const data = await generateSummary(id);
      setSummary(data.summary);
    } catch (err) {
      setSummaryError("Failed to generate summary. Try again.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleSaveNotes() {
    setNotesLoading(true);
    setNotesSuccess("");
    try {
      await updateNotes(id, notes);
      setNotesSuccess("Notes saved!");
    } catch (err) {
      setNotesSuccess("Failed to save notes.");
    } finally {
      setNotesLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading candidate...</p>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-400">{error || "Candidate not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => router.push("/candidates")}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to Candidates
        </button>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
          {userRole}
        </span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* SECTION 1 — Profile */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{candidate.name}</h2>
              <p className="text-gray-500 text-sm mt-1">{candidate.email}</p>
              <p className="text-gray-600 mt-1">{candidate.role_applied}</p>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[candidate.status] || "bg-gray-100 text-gray-600"}`}>
              {candidate.status}
            </span>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(candidate.skills || []).map((skill) => (
              <span key={skill} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* SECTION 2 — Scores */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {userRole === "admin" ? "All Scores" : "Your Scores"}
          </h3>

          {candidate.scores.length === 0 ? (
            <p className="text-gray-400 text-sm">No scores yet.</p>
          ) : (
            <div className="space-y-3">
              {candidate.scores.map((s) => (
                <div key={s.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-700">{s.category}</p>
                    {s.note && <p className="text-sm text-gray-400 mt-0.5">{s.note}</p>}
                    {/* Admin sees who gave the score */}
                    {userRole === "admin" && (
                      <p className="text-xs text-gray-400 mt-0.5">by {s.reviewer?.email}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold ${
                          n <= s.score
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3 — Score Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Submit a Score</h3>
          <form onSubmit={handleSubmitScore} className="space-y-4">

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Score radio buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Score</label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input
                      type="radio"
                      name="score"
                      value={n}
                      checked={score === n}
                      onChange={() => setScore(n)}
                      className="hidden"
                    />
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition ${
                      score === n
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-500 border-gray-300 hover:border-blue-400"
                    }`}>
                      {n}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a comment about this score..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {scoreSuccess && <p className="text-green-600 text-sm">{scoreSuccess}</p>}
            {scoreError && <p className="text-red-500 text-sm">{scoreError}</p>}

            <button
              type="submit"
              disabled={scoreLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {scoreLoading ? "Submitting..." : "Submit Score"}
            </button>
          </form>
        </div>

        {/* SECTION 4 — AI Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Summary</h3>

          <button
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
          >
            {summaryLoading ? "Generating..." : "Generate Summary"}
          </button>

          {/* Loading state */}
          {summaryLoading && (
            <div className="mt-4 flex items-center gap-3 text-purple-600">
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Generating AI summary...</span>
            </div>
          )}

          {/* Summary result */}
          {summary && (
            <div className="mt-4 bg-purple-50 border border-purple-100 rounded-lg px-4 py-3">
              <p className="text-sm text-purple-900">{summary}</p>
            </div>
          )}

          {/* Error */}
          {summaryError && (
            <p className="text-red-500 text-sm mt-3">{summaryError}</p>
          )}
        </div>

        {/* SECTION 5 — Admin Notes (only for admins) */}
        {userRole === "admin" && (
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-400">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Internal Notes</h3>
            <p className="text-xs text-gray-400 mb-4">Only visible to admins</p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add internal notes about this candidate..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />

            {notesSuccess && (
              <p className="text-green-600 text-sm mt-2">{notesSuccess}</p>
            )}

            <button
              onClick={handleSaveNotes}
              disabled={notesLoading}
              className="mt-3 bg-orange-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition"
            >
              {notesLoading ? "Saving..." : "Save Notes"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

// ✅ Step 1: Remove hardcoded localhost (deploy-safe)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:8000";

type Mode = "study" | "coding" | "admin";
type Intensity = "chill" | "normal" | "grind";

type PlanItem = {
  title: string;
  minutes: number;
  details: string;
  difficulty: string;
};

type PlanResponse = {
  id: string;
  task: string;
  created_at: string;
  total_minutes: number;
  focus_tip: string;
  energy_level: string;
  mode: Mode;
  intensity: Intensity;
  plan: PlanItem[];
};

type Plan = {
  id: string;
  task: string;
  created_at: string;
  total_minutes: number;
  mode: Mode;
  intensity: Intensity;
};

type Mood = "great" | "ok" | "tired";

type Reflection = {
  id: string;
  plan_id: string;
  mood: Mood;
  notes: string;
  created_at: string;
};

type WeeklySummary = {
  total_sessions: number;
  total_minutes: number;
  top_tasks: string[];
  themes: string[];
  suggestions: string[];
};

const MODE_LABEL: Record<string, string> = {
  study: "Study",
  coding: "Coding",
  admin: "Admin",
};

const INTENSITY_LABEL: Record<string, string> = {
  chill: "Chill",
  normal: "Normal",
  grind: "Grind",
};


export default function PlanPage() {
  const isDev = process.env.NODE_ENV !== "production";

  // ✅ Step 2: Raw JSON "dev only" (clean final UI)
  const [showRaw, setShowRaw] = useState(false);

  // form / current plan controls
  const [task, setTask] = useState("");
  const [totalMinutes, setTotalMinutes] = useState<number>(60);
  const [mode, setMode] = useState<Mode>("study");
  const [intensity, setIntensity] = useState<Intensity>("normal");

  // main plan result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<PlanResponse | null>(null);

  // history state
  const [history, setHistory] = useState<Plan[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // session timer state
  const [sessionActive, setSessionActive] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // session end + reflection state
  const [sessionHasEnded, setSessionHasEnded] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [reflectionNotes, setReflectionNotes] = useState("");
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);

  // weekly summary state
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // ------------------ API helpers ------------------

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const res = await fetch(`${API_BASE}/ai/history`, { method: "GET" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const json = await res.json();
      const plans: Plan[] = Array.isArray(json) ? json : (json.history as Plan[]);
      setHistory(plans);
    } catch (e: any) {
      setHistoryError(e?.message ?? "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const generatePlan = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      setSessionActive(false);
      setSessionHasEnded(false);
      setReflection(null);
      setSelectedMood(null);
      setReflectionNotes("");
      setReflectionError(null);

      const res = await fetch(`${API_BASE}/ai/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          total_minutes: totalMinutes,
          mode,
          intensity,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = (await res.json()) as PlanResponse;
      setResult(data);

      // keep UI in sync with backend response
      setMode(data.mode ?? mode);
      setIntensity(data.intensity ?? intensity);
      setTotalMinutes(data.total_minutes);
      setTask(data.task);

      // reload history after generating a plan
      await fetchHistory();
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const loadPlanById = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/ai/plan/${id}`, { method: "GET" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = (await res.json()) as PlanResponse;
      setResult(data);

      setMode(data.mode);
      setIntensity(data.intensity);
      setTotalMinutes(data.total_minutes);
      setTask(data.task);

      setSessionActive(false);
      setSessionHasEnded(false);
      setSecondsLeft(0);
      setCurrentBlockIndex(0);
      setReflection(null);
      setSelectedMood(null);
      setReflectionNotes("");
      setReflectionError(null);
    } catch (err) {
      console.error("Failed to load plan", err);
      setError("Failed to load plan");
    }
  };

  const submitReflection = async () => {
    if (!result || !selectedMood) return;

    try {
      setReflectionLoading(true);
      setReflectionError(null);

      const res = await fetch(`${API_BASE}/ai/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: result.id,
          mood: selectedMood,
          notes: reflectionNotes,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = (await res.json()) as Reflection;
      setReflection(data);
    } catch (e: any) {
      console.error("Failed to save reflection", e);
      setReflectionError(e?.message ?? "Failed to save reflection");
    } finally {
      setReflectionLoading(false);
    }
  };

  const generateSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);

      const res = await fetch(`${API_BASE}/ai/summary`, { method: "GET" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = (await res.json()) as WeeklySummary;
      setSummary(data);
    } catch (err: any) {
      console.error("Failed to load summary", err);
      setSummaryError(err?.message ?? "Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const clearAll = () => {
    setResult(null);
    setSessionActive(false);
    setSessionHasEnded(false);
    setSecondsLeft(0);
    setCurrentBlockIndex(0);

    setReflection(null);
    setSelectedMood(null);
    setReflectionNotes("");
    setReflectionError(null);

    setError("");
    setShowRaw(false);
  };

  const copyPlan = async () => {
    if (!result) return;
    const text = result.plan
      .map((p) => `- ${p.title} (${p.minutes}m): ${p.details}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    alert("Copied plan to clipboard!");
  };

  // fetch history on mount
  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------ Session timer logic ------------------

  useEffect(() => {
    if (!sessionActive) return;
    if (secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(id);
  }, [sessionActive, secondsLeft]);

  useEffect(() => {
    if (!sessionActive || !result) return;
    if (secondsLeft > 0) return;

    const nextIndex = currentBlockIndex + 1;
    if (nextIndex < result.plan.length) {
      const nextBlock = result.plan[nextIndex];
      setCurrentBlockIndex(nextIndex);
      setSecondsLeft(nextBlock.minutes * 60);
    } else {
      setSessionActive(false);
      setSessionHasEnded(true);
    }
  }, [secondsLeft, sessionActive, currentBlockIndex, result]);

  // ✅ Step 4: Plan progress (inside Session UI)
  const progress =
    result?.plan?.length ? Math.round((currentBlockIndex / result.plan.length) * 100) : 0;

  // ------------------ UI ------------------

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>FocusFlow</h1>

      {/* Form */}
      <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <label>
          <div style={{ marginBottom: 6 }}>What are you working on?</div>
          <input
            disabled={loading} // ✅ Step 3A: disable inputs while generating
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g., Study CPS 305 (Heaps + Hashing)"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #444",
              background: "transparent",
              color: "inherit",
              opacity: loading ? 0.7 : 1,
            }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Total minutes</div>
          <input
            disabled={loading} // ✅ Step 3A
            type="number"
            value={totalMinutes}
            min={5}
            onChange={(e) => setTotalMinutes(Number(e.target.value))}
            style={{
              width: 160,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #444",
              background: "transparent",
              color: "inherit",
              opacity: loading ? 0.7 : 1,
            }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Mode</div>
          <select
            disabled={loading} // ✅ Step 3A
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            style={{
              width: 200,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #444",
              background: "transparent",
              color: "inherit",
              opacity: loading ? 0.7 : 1,
            }}
          >
            <option value="study">Study</option>
            <option value="coding">Coding</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Intensity</div>
          <select
            disabled={loading} // ✅ Step 3A
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as Intensity)}
            style={{
              width: 200,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #444",
              background: "transparent",
              color: "inherit",
              opacity: loading ? 0.7 : 1,
            }}
          >
            <option value="chill">Chill</option>
            <option value="normal">Normal</option>
            <option value="grind">Grind</option>
          </select>
        </label>

        <button
          onClick={generatePlan}
          disabled={loading || task.trim().length === 0}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #444",
            cursor: loading ? "not-allowed" : "pointer",
            background: "transparent",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {/* ✅ Step 3B: spinner feel */}
          {loading ? "Generating plan..." : "Generate plan"}
        </button>

        {/* ✅ Step 3C: empty state */}
        {!result && !loading && !error && (
          <div style={{ marginTop: 8, padding: 12, border: "1px solid #333", borderRadius: 10 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No plan generated yet.</p>
            <p style={{ marginTop: 6, marginBottom: 0, opacity: 0.8 }}>
              Enter a task + minutes, then click <strong>Generate plan</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 12, border: "1px solid #ff6b6b", borderRadius: 8, marginBottom: 16 }}>
          <strong>Error</strong>
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{error}</div>
        </div>
      )}

      {/* Result (current plan display) */}
      {result && (
        <div style={{ marginTop: 8 }}>
          <h2 style={{ fontSize: 20, marginBottom: 4 }}>Plan for: {result.task}</h2>

          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            Created at:{" "}
            {new Date(result.created_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>

          <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>
            Mode: {MODE_LABEL[result.mode]} · Intensity: {INTENSITY_LABEL[result.intensity]}
          </p>

          <p style={{ fontSize: 14, marginBottom: 4 }}>
            <span style={{ opacity: 0.8 }}>Focus tip: </span>
            {result.focus_tip}
          </p>
          <p style={{ fontSize: 14, marginBottom: 14 }}>
            <span style={{ opacity: 0.8 }}>Energy level: </span>
            {result.energy_level}
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {result.plan.map((item, idx) => (
              <div key={idx} style={{ padding: 12, border: "1px solid #444", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <strong>{item.title}</strong>
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: "1px solid #666",
                      letterSpacing: 0.5,
                    }}
                  >
                    {item.difficulty}
                  </span>
                </div>

                <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>{item.minutes} min</div>
                <div style={{ marginTop: 6 }}>{item.details}</div>
              </div>
            ))}
          </div>

          {/* Start session */}
          <button
            onClick={() => {
              if (!result.plan.length) return;
              setSessionActive(true);
              setSessionHasEnded(false);
              setReflection(null);
              setSelectedMood(null);
              setReflectionNotes("");
              setReflectionError(null);
              setCurrentBlockIndex(0);
              setSecondsLeft(result.plan[0].minutes * 60);
            }}
            style={{
              marginTop: 16,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #444",
              cursor: "pointer",
              background: "transparent",
              fontSize: 14,
            }}
          >
            Start session with this plan
          </button>

          {/* ✅ Step 5: Quick Actions */}
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={copyPlan}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #444",
                cursor: "pointer",
                background: "transparent",
                fontSize: 13,
              }}
            >
              Copy plan
            </button>

            <button
              onClick={clearAll}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #444",
                cursor: "pointer",
                background: "transparent",
                fontSize: 13,
              }}
            >
              Clear
            </button>
          </div>

          {/* ✅ Step 2: Raw JSON toggle (dev-only) */}
          {isDev && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                style={{
                  fontSize: 12,
                  textDecoration: "underline",
                  border: "none",
                  padding: 0,
                  background: "transparent",
                  cursor: "pointer",
                  opacity: 0.8,
                }}
              >
                {showRaw ? "Hide" : "Show"} Raw JSON (debug)
              </button>

              {showRaw && (
                <pre
                  style={{
                    marginTop: 10,
                    padding: 12,
                    border: "1px solid #333",
                    borderRadius: 10,
                    overflowX: "auto",
                    maxHeight: 320,
                  }}
                >
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Session UI */}
      {sessionActive && result && result.plan.length > 0 && (
        <section style={{ marginTop: 24, padding: 16, borderRadius: 12, border: "1px solid #555" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Session in progress</h2>

          {/* ✅ Step 4: Progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 8, width: "100%", borderRadius: 999, background: "#2b2b2b" }}>
              <div
                style={{
                  height: 8,
                  width: `${progress}%`,
                  borderRadius: 999,
                  background: "#6d28d9", // change color here if you want
                  transition: "width 200ms ease",
                }}
              />
            </div>
          </div>

          <p style={{ marginBottom: 4 }}>
            Block {currentBlockIndex + 1} of {result.plan.length}
          </p>

          <p style={{ marginBottom: 4, fontWeight: 500 }}>
            {result.plan[currentBlockIndex].title} – {result.plan[currentBlockIndex].minutes} min
          </p>

          <p style={{ marginBottom: 12, fontSize: 14, opacity: 0.9 }}>{result.plan[currentBlockIndex].details}</p>

          <p style={{ marginBottom: 12, fontSize: 24, fontFamily: "monospace" }}>
            {Math.floor(secondsLeft / 60)
              .toString()
              .padStart(2, "0")}
            :
            {(secondsLeft % 60).toString().padStart(2, "0")}
          </p>

          <button
            onClick={() => {
              setSessionActive(false);
              setSessionHasEnded(true);
            }}
            style={{
              fontSize: 13,
              textDecoration: "underline",
              border: "none",
              padding: 0,
              background: "transparent",
              cursor: "pointer",
              opacity: 0.9,
            }}
          >
            End session
          </button>
        </section>
      )}

      {/* Reflection form */}
      {sessionHasEnded && result && !reflection && (
        <section style={{ marginTop: 24, padding: 16, borderRadius: 12, border: "1px solid #555" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Session reflection</h2>
          <p style={{ marginBottom: 8 }}>How did it go?</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {(["great", "ok", "tired"] as Mood[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMood(m)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: selectedMood === m ? "2px solid #fff" : "1px solid #555",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  textTransform: "capitalize",
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
            Any quick notes?
            <textarea
              value={reflectionNotes}
              onChange={(e) => setReflectionNotes(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                marginTop: 6,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #555",
                background: "transparent",
                color: "inherit",
                resize: "vertical",
              }}
              placeholder="What worked? What was hard?"
            />
          </label>

          {reflectionError && <p style={{ color: "#ff6b6b", marginBottom: 8 }}>{reflectionError}</p>}

          <button
            onClick={submitReflection}
            disabled={!selectedMood || reflectionLoading}
            style={{
              marginTop: 4,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #444",
              cursor: !selectedMood || reflectionLoading ? "not-allowed" : "pointer",
              background: "transparent",
              fontSize: 14,
            }}
          >
            {reflectionLoading ? "Saving..." : "Save reflection"}
          </button>
        </section>
      )}

      {/* Reflection display */}
      {reflection && (
        <section style={{ marginTop: 24, padding: 16, borderRadius: 12, border: "1px solid #555" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Session reflection</h2>
          <p style={{ marginBottom: 4 }}>
            Mood: <span style={{ textTransform: "capitalize" }}>{reflection.mood}</span>
          </p>
          <p style={{ marginBottom: 4, opacity: 0.9 }}>
            Notes: {reflection.notes && reflection.notes.trim().length > 0 ? reflection.notes : "No notes added."}
          </p>
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            Saved at{" "}
            {new Date(reflection.created_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </section>
      )}

      {/* Weekly summary */}
      <section style={{ marginTop: 32, padding: 16, borderRadius: 12, border: "1px solid #555" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Weekly summary</h2>
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #444",
              background: "transparent",
              cursor: summaryLoading ? "not-allowed" : "pointer",
              fontSize: 13,
              opacity: summaryLoading ? 0.8 : 1,
            }}
          >
            {summaryLoading ? "Generating..." : "Generate summary"}
          </button>
        </div>

        {summaryError && <p style={{ fontSize: 12, color: "#ff6b6b" }}>Error: {summaryError}</p>}

        {summary && (
          <div style={{ fontSize: 14, marginTop: 8 }}>
            <p style={{ marginBottom: 8 }}>
              Sessions: {summary.total_sessions} · Minutes: {summary.total_minutes}
            </p>

            <div style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Top tasks</p>
              <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                {summary.top_tasks.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Themes</p>
              <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                {summary.themes.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>

            <div>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Suggestions</p>
              <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                {summary.suggestions.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!summary && !summaryLoading && !summaryError && (
          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            Generate a summary after you&apos;ve done a few sessions.
          </p>
        )}
      </section>

      {/* History section */}
      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Past plans</h2>

        {historyLoading && <p>Loading history...</p>}

        {historyError && <p style={{ color: "#ff6b6b" }}>Error loading history: {historyError}</p>}

        {!historyLoading && !historyError && history.length === 0 && (
          <p style={{ opacity: 0.8 }}>No past plans yet. Generate one to get started.</p>
        )}

        {!historyLoading && !historyError && history.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
            {history
              .slice()
              .reverse()
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadPlanById(p.id)}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #333",
                    fontSize: 14,
                    textAlign: "left",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{p.task}</span>
                    <span style={{ opacity: 0.7, fontSize: 12 }}>
                      {new Date(p.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, opacity: 0.85 }}>
                    <span>
                      {p.total_minutes} min · Mode: {p.mode}
                    </span>
                    <span>Intensity: {p.intensity}</span>
                  </div>
                </button>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}

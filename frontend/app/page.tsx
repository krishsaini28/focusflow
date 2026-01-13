// frontend/app/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("http://localhost:8000/health", {
          method: "GET",
          // optional: if your backend uses cookies/sessions
          // credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        // Health endpoints often return JSON, but sometimes plain text.
        // We'll handle both safely:
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = await res.json();
          setData(JSON.stringify(json, null, 2));
        } else {
          const text = await res.text();
          setData(text);
        }
      } catch (e: any) {
        setError(e?.message ?? "Request failed");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Health Check</h1>

      <p style={{ marginBottom: 12 }}>
        Fetching: <code>http://localhost:8000/health</code>
      </p>

      {loading && <p>Loading...</p>}

      {!loading && error && (
        <div style={{ padding: 12, border: "1px solid #ff6b6b", borderRadius: 8 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Error</p>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{error}</pre>
        </div>
      )}

      {!loading && !error && (
        <div style={{ padding: 12, border: "1px solid #444", borderRadius: 8 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Response</p>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{data}</pre>
        </div>
      )}
    </main>
  );
}


"use client";
import { useEffect, useState } from "react";
export default function Tutor({
  context,
  code,
}: {
  context: string;
  code: string;
}) {
  const [available, setAvailable] = useState(false),
    [prompt, setPrompt] = useState(""),
    [response, setResponse] = useState(""),
    [busy, setBusy] = useState(false),
    [includeCode, setIncludeCode] = useState(false),
    [mode, setMode] = useState("Conceptual hint");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tutor", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => setAvailable(info?.available === true))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  async function ask() {
    setBusy(true);
    setResponse("");
    try {
      const r = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context,
          code: includeCode ? code : "",
          mode,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Tutor unavailable.");
      setResponse(data.answer);
    } catch (error) {
      setResponse(
        error instanceof Error ? error.message : "Tutor unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="hint-panel">
      <summary>Optional AI learning tutor</summary>
      <p>
        {available
          ? "A local Ollama proxy is enabled. Send only the question and lesson context you choose. Responses are advisory and cannot change results or rewards."
          : "AI is disabled: no configured local tutor backend. Built-in progressive hints work offline. To enable Ollama, follow the local proxy setup in the README; no API key is stored in the browser."}
      </p>
      {available && (
        <>
          <label>
            Teaching step
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              {[
                "Conceptual hint",
                "Specific hint",
                "Partial guidance",
                "Full explanation requested",
                "Review code",
                "Explain runtime error",
                "Interview practice",
              ].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Your question
            <textarea
              value={prompt}
              maxLength={4000}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <label className="answer-option">
            <input
              type="checkbox"
              checked={includeCode}
              onChange={(event) => setIncludeCode(event.target.checked)}
            />
            Include my current code (sent to the configured local model)
          </label>
          <button
            className="button"
            disabled={!prompt.trim() || busy}
            onClick={() => void ask()}
          >
            {busy ? "Asking local model…" : "Ask tutor"}
          </button>
          <p role="status" className="tutor-response">
            {response}
          </p>
        </>
      )}
    </details>
  );
}

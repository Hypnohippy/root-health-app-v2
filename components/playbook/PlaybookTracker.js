"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

function inputFor(field, value, setValue) {
  const common = { value: value ?? "", onChange: (event) => setValue(event.target.value), style: styles.input };
  if (field.type === "long_text") return <textarea {...common} style={{ ...styles.input, minHeight: 90 }} />;
  if (field.type === "single_choice") return <select {...common}><option value="">Choose…</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select>;
  if (field.type === "multi_choice") return <div style={styles.options}>{field.options.map((option) => <label key={option}><input type="checkbox" checked={(value || []).includes(option)} onChange={(event) => setValue(event.target.checked ? [...(value || []), option] : (value || []).filter((item) => item !== option))} /> {option}</label>)}</div>;
  if (field.type === "yes_no_not_sure") return <select {...common}><option value="">Choose…</option><option>Yes</option><option>No</option><option>Not sure</option></select>;
  if (field.type === "scale_1_10") return <input {...common} type="range" min="1" max="10" />;
  const type = { short_text: "text", date: "date", time: "time", datetime: "datetime-local", number: "number" }[field.type] || "text";
  return <input {...common} type={type} />;
}

export default function PlaybookTracker({ entry, profileKey }) {
  const fields = useMemo(() => entry?.tracker_definition?.fields || [], [entry]);
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");

  const loadHistory = async () => {
    const { data } = await supabase.from("playbook_tracker_entries").select("id, answers, created_at").eq("tracker_id", entry.id).eq("profile_key", profileKey).order("created_at", { ascending: false }).limit(20);
    setHistory(data || []);
  };
  useEffect(() => { loadHistory(); }, [entry.id, profileKey]);

  const submit = async () => {
    setStatus("saving");
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/personal-playbook", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token || ""}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit_tracker", profileKey, trackerId: entry.id, answers }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) { setStatus(result.error || "Root could not save this entry."); return; }
    setAnswers({}); setStatus("saved"); await loadHistory();
  };

  return <div style={styles.wrap}>
    <p>{entry.tracker_definition?.description}</p>
    {fields.map((field) => <label key={field.key} style={styles.field}><strong>{field.label}{field.required ? " *" : ""}</strong>{field.help_text && <small>{field.help_text}</small>}{inputFor(field, answers[field.key], (value) => setAnswers((current) => ({ ...current, [field.key]: value })))}</label>)}
    <button style={styles.button} disabled={status === "saving"} onClick={submit}>{status === "saving" ? "Saving…" : "Save entry"}</button>
    {status && status !== "saving" && <p role="status">{status === "saved" ? "Entry saved." : status}</p>}
    {history.length > 0 && <div><strong>Recent entries</strong>{history.map((item) => <div key={item.id} style={styles.history}><small>{new Date(item.created_at).toLocaleString("en-GB")}</small>{fields.map((field) => item.answers?.[field.key] !== undefined && <div key={field.key}>{field.label}: {Array.isArray(item.answers[field.key]) ? item.answers[field.key].join(", ") : String(item.answers[field.key])}</div>)}</div>)}</div>}
  </div>;
}

const styles = { wrap: { display: "grid", gap: 14, marginTop: 14 }, field: { display: "grid", gap: 6 }, input: { width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 14, border: "1px solid rgba(36,50,36,.2)", background: "rgba(255,255,255,.75)" }, options: { display: "grid", gap: 8 }, button: { justifySelf: "start", border: 0, borderRadius: 999, padding: "12px 18px", background: "#243224", color: "white", fontWeight: 700 }, history: { marginTop: 10, padding: 12, borderRadius: 14, background: "rgba(255,255,255,.45)" } };

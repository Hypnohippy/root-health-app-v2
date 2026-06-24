"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

function makeProfileKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function OrganisationProfilePage() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveProfile() {
    setSaving(true);
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      setSaving(false);
      return;
    }

    const organisation = JSON.parse(
      localStorage.getItem("root_organisation_v1") || "{}"
    );

    if (!organisation.organisation_id) {
      setError("Organisation not found. Please join your organisation again.");
      setSaving(false);
      return;
    }

    const profileKey =
      localStorage.getItem("root_profile_key_v1") || makeProfileKey();

    const { error } = await supabase.from("profiles").upsert(
      {
        profile_key: profileKey,
        name: name.trim(),
        age: age.trim(),
        department: department.trim(),
        organisation_id: organisation.organisation_id,
        organisation_name: organisation.organisation_name,
      },
      { onConflict: "profile_key" }
    );

    if (error) {
      setError(error.message || "Could not save profile.");
      setSaving(false);
      return;
    }

    localStorage.setItem("root_profile_key_v1", profileKey);

    localStorage.setItem(
      "root_profile_v1",
      JSON.stringify({
        profile_key: profileKey,
        name: name.trim(),
        age: age.trim(),
        department: department.trim(),
        organisation_id: organisation.organisation_id,
        organisation_name: organisation.organisation_name,
      })
    );

    setSaving(false);
    window.location.href = "/orientation";
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Root Workplace</p>

        <h1 style={styles.title}>Tell Root a little about yourself</h1>

        <p style={styles.text}>Your personal profile helps Root support you.</p>

        <p style={styles.text}>
          Your organisation only sees anonymous wellbeing trends.
        </p>

        <label style={styles.label}>Your name *</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. David Prince"
        />

        <label style={styles.label}>Age (optional)</label>
        <input
          style={styles.input}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="e.g. 61"
        />

        <label style={styles.label}>Department (optional)</label>
        <input
          style={styles.input}
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. HR, Finance, Operations"
        />

        {error ? <p style={styles.error}>{error}</p> : null}

        <button style={styles.button} onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Continue to Orientation"}
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px",
    background: "#EFE9DE",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: "720px",
    padding: "38px",
    borderRadius: "36px",
    background: "rgba(255,255,255,0.76)",
    border: "1px solid rgba(255,255,255,0.85)",
    boxShadow: "0 28px 90px rgba(20,18,15,0.14)",
  },
  kicker: {
    margin: "0 0 10px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    fontWeight: "800",
    color: "#776C5B",
  },
  title: {
    margin: "0 0 16px",
    fontSize: "42px",
    color: "#181818",
    letterSpacing: "-0.04em",
  },
  text: {
    color: "#4D463B",
    lineHeight: "1.8",
    fontSize: "16px",
  },
  label: {
    display: "block",
    marginTop: "18px",
    marginBottom: "8px",
    fontWeight: "800",
    color: "#181818",
  },
  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "16px",
    border: "1px solid rgba(24,24,24,0.16)",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "24px",
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "15px 22px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
  },
  error: {
    marginTop: "16px",
    color: "#9F1D1D",
    fontWeight: "800",
  },
};

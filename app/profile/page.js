"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../components/RootEnso";
const PROFILE_KEY = "main";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    profile_key: PROFILE_KEY,
    name: "",
    age: "",
    height: "",
    weight: "",
    goal: "",
    conditions: "",
    medications: "",
    allergies: "",
    diet: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("profile_key", PROFILE_KEY)
      .maybeSingle();

    if (error) {
      console.error("Load profile error:", error);
    }

    if (data) {
      setProfile({
        profile_key: PROFILE_KEY,
        name: data.name || "",
        age: data.age || "",
        height: data.height || "",
        weight: data.weight || "",
        goal: data.goal || "",
        conditions: data.conditions || "",
        medications: data.medications || "",
        allergies: data.allergies || "",
        diet: data.diet || "",
      });
    }

    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          profile_key: PROFILE_KEY,
          name: profile.name,
          age: profile.age,
          height: profile.height,
          weight: profile.weight,
          goal: profile.goal,
          conditions: profile.conditions,
          medications: profile.medications,
          allergies: profile.allergies,
          diet: profile.diet,
        },
        { onConflict: "profile_key" }
      );

    setSaving(false);

    if (error) {
      console.error("Save profile error:", error);
      alert(error.message);
      return;
    }

    alert("Profile saved");
  };

  const update = (key, value) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return <p style={{ padding: 40 }}>Loading profile...</p>;
  }

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
  <RootEnso size={86} />
</div>

          <h1 style={styles.title}>Your Profile</h1>
          <p style={styles.subtitle}>
            This helps Root Coach tailor everything to you.
          </p>

          <div style={styles.grid}>
            <input style={styles.input} placeholder="Name" value={profile.name} onChange={(e) => update("name", e.target.value)} />
            <input style={styles.input} placeholder="Age" value={profile.age} onChange={(e) => update("age", e.target.value)} />
            <input style={styles.input} placeholder="Height" value={profile.height} onChange={(e) => update("height", e.target.value)} />
            <input style={styles.input} placeholder="Weight" value={profile.weight} onChange={(e) => update("weight", e.target.value)} />
            <input style={styles.input} placeholder="Goal" value={profile.goal} onChange={(e) => update("goal", e.target.value)} />
            <input style={styles.input} placeholder="Conditions" value={profile.conditions} onChange={(e) => update("conditions", e.target.value)} />
            <input style={styles.input} placeholder="Medications" value={profile.medications} onChange={(e) => update("medications", e.target.value)} />
            <input style={styles.input} placeholder="Allergies / intolerances" value={profile.allergies} onChange={(e) => update("allergies", e.target.value)} />
            <input style={styles.input} placeholder="Diet style" value={profile.diet} onChange={(e) => update("diet", e.target.value)} />
          </div>

          <button style={styles.button} onClick={saveProfile}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </section>
      </main>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #F7F5F2 0%, #E6E2DA 100%)",
    display: "flex",
    justifyContent: "center",
    padding: "24px",
  },
  logoWrap: {
  display: "flex",
  justifyContent: "center",
  marginBottom: "10px",
},
  shell: {
    width: "100%",
    maxWidth: "760px",
    background: "rgba(255,255,255,0.86)",
    borderRadius: "32px",
    padding: "34px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  brandMark: {
    fontSize: "40px",
    marginBottom: "8px",
  },
  title: {
    fontSize: "34px",
    margin: "0 0 8px",
    color: "#1A1A1A",
  },
  subtitle: {
    color: "#555",
    fontSize: "16px",
    marginBottom: "24px",
  },
  grid: {
    display: "grid",
    gap: "12px",
  },
  input: {
    border: "1px solid #E6E2DA",
    borderRadius: "16px",
    padding: "14px 16px",
    fontSize: "15px",
    outline: "none",
    background: "#FFFFFF",
  },
  button: {
    marginTop: "22px",
    padding: "14px 22px",
    borderRadius: "16px",
    border: "none",
    background: "#1A1A1A",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },
};

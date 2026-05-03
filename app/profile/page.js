"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
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
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setProfile(data);
    }

    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      ...profile,
    });

    setSaving(false);

    if (error) {
      alert("Error saving profile");
    } else {
      alert("Profile saved");
    }
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
          <h1 style={styles.title}>Your Profile</h1>
          <p style={styles.subtitle}>
            This helps Root Coach tailor everything to you.
          </p>

          <div style={styles.grid}>
            <input placeholder="Name" value={profile.name} onChange={(e) => update("name", e.target.value)} />
            <input placeholder="Age" value={profile.age} onChange={(e) => update("age", e.target.value)} />
            <input placeholder="Height (e.g. 5ft7)" value={profile.height} onChange={(e) => update("height", e.target.value)} />
            <input placeholder="Weight" value={profile.weight} onChange={(e) => update("weight", e.target.value)} />
            <input placeholder="Goal (e.g. weight loss, energy, recovery)" value={profile.goal} onChange={(e) => update("goal", e.target.value)} />
            <input placeholder="Conditions (e.g. diabetes)" value={profile.conditions} onChange={(e) => update("conditions", e.target.value)} />
            <input placeholder="Medications" value={profile.medications} onChange={(e) => update("medications", e.target.value)} />
            <input placeholder="Allergies / intolerances" value={profile.allergies} onChange={(e) => update("allergies", e.target.value)} />
            <input placeholder="Diet style (e.g. low carb, Mediterranean)" value={profile.diet} onChange={(e) => update("diet", e.target.value)} />
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
  shell: {
    width: "100%",
    maxWidth: "700px",
    background: "#fff",
    borderRadius: "28px",
    padding: "30px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
  },
  title: {
    fontSize: "28px",
    marginBottom: "10px",
  },
  subtitle: {
    color: "#666",
    marginBottom: "20px",
  },
  grid: {
    display: "grid",
    gap: "12px",
  },
  button: {
    marginTop: "20px",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "#1A1A1A",
    color: "#fff",
    cursor: "pointer",
  },
};

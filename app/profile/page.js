"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";
import { resolvePersonalRootContext } from "../../lib/personalRootContext";
import {
  assessPersonalHealthContext,
  HEALTH_CONTEXT_FIELDS,
} from "../../lib/personalHealthContext";

function HealthContextField({ field, value, onChange }) {
  return (
    <div style={styles.healthField}>
      <label style={styles.healthLabel}>{field.label}</label>
      <input
        style={styles.input}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div style={styles.healthOptions}>
        {field.options.map((option) => (
          <button key={option} type="button" style={styles.healthOption} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personalContext, setPersonalContext] = useState(null);
  const [healthContextMessage, setHealthContextMessage] = useState("");

  const [profile, setProfile] = useState({
   profile_key: "",
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
    const identityResult = await resolvePersonalRootContext({ client: supabase });

    if (!identityResult.ok) {
      console.error("Load profile identity error:", identityResult.error || identityResult.reason);
      setLoading(false);
      return;
    }

    setPersonalContext(identityResult.context);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", identityResult.context.userId)
      .maybeSingle();

    if (error) {
      console.error("Load profile error:", error);
    }

    if (data) {
      setProfile({
        profile_key: identityResult.context.profileKey,
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
      if (!assessPersonalHealthContext(data).complete) {
        setHealthContextMessage(
          "Please complete the health context below. Blank answers remain unknown; you can choose an explicit none or prefer-not-to-say response."
        );
      }
    }

    setLoading(false);
  };

  const saveProfile = async () => {
  const healthContext = assessPersonalHealthContext(profile);
  if (!healthContext.complete) {
    setHealthContextMessage(
      "Please give an explicit response for health conditions, medications and allergies/intolerances. Choose a clear none or prefer-not-to-say option where appropriate."
    );
    return;
  }
  setHealthContextMessage("");
  setSaving(true);

  try {
  const profileKey = personalContext?.profileKey;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !profileKey || user.id !== personalContext?.userId) {
    alert("Root could not confirm your signed-in account.");
    return;
  }

    const { error } = await supabase
  .from("profiles")
  .upsert(
    {
      user_id: user.id,
      profile_key: profileKey,
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

    if (error) {
      console.error("Save profile error:", error);
      alert(error.message);
      return;
    }

    alert("Profile saved");
  } catch (error) {
    console.error(error);
    alert("Unexpected error saving profile.");
  } finally {
    setSaving(false);
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
   <RootAtmosphere type="coach">
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
            {HEALTH_CONTEXT_FIELDS.map((field) => (
              <HealthContextField
                key={field.key}
                field={field}
                value={profile[field.key]}
                onChange={(value) => update(field.key, value)}
              />
            ))}
            <input style={styles.input} placeholder="Diet style" value={profile.diet} onChange={(e) => update("diet", e.target.value)} />
          </div>

          {healthContextMessage && <p style={styles.healthMessage}>{healthContextMessage}</p>}

          <button
  style={{
    ...styles.button,
    opacity: saving ? 0.65 : 1,
    cursor: saving ? "not-allowed" : "pointer",
  }}
  onClick={saveProfile}
  disabled={saving}
>
  {saving ? "Saving..." : "Save profile"}
</button>
        </section>
         </main>
</RootAtmosphere>
);
}

const styles = {
  page: {
    minHeight: "100vh",
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
  maxWidth: "780px",
  background: "rgba(255,255,255,0.20)",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(30px)",
  borderRadius: "42px",
  padding: "42px",
  boxShadow: "0 34px 100px rgba(20,18,15,0.14)",
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
    color: "rgba(26,26,26,0.72)",
    fontSize: "16px",
    marginBottom: "24px",
  },
  grid: {
    marginTop: "28px",
    display: "grid",
    gap: "12px",
  },
  input: {
  border: "1px solid rgba(255,255,255,0.30)",
  borderRadius: "22px",
  padding: "16px 18px",
  fontSize: "15px",
  outline: "none",
  background: "rgba(255,255,255,0.18)",
  backdropFilter: "blur(16px)",
  color: "#1A1A1A",
  boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
},
  healthField: {
    display: "grid",
    gap: "8px",
    textAlign: "left",
  },
  healthLabel: {
    paddingLeft: "8px",
    color: "rgba(26,26,26,0.76)",
    fontSize: "13px",
    fontWeight: 700,
  },
  healthOptions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    paddingLeft: "8px",
  },
  healthOption: {
    border: "1px solid rgba(26,26,26,0.14)",
    borderRadius: "999px",
    padding: "7px 11px",
    background: "rgba(255,255,255,0.34)",
    color: "#333333",
    cursor: "pointer",
    fontSize: "12px",
  },
  healthMessage: {
    margin: "18px 0 0",
    color: "#6d352f",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  button: {
  marginTop: "28px",
  padding: "15px 24px",
  borderRadius: "22px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "linear-gradient(135deg, rgba(24,24,24,0.72), rgba(42,38,34,0.58))",
  color: "#FFFFFF",
  cursor: "pointer",
  fontSize: "15px",
  backdropFilter: "blur(14px)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.14)",
},
};

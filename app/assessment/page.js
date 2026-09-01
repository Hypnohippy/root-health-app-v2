"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";

const questions = [
  ["stress_score", "Stress", "0 = calm, 10 = overwhelmed"],

  [
    "sleep_score",
    "Sleep Difficulties",
    "0 = sleeping well, 10 = severe sleep difficulties",
  ],

  [
    "recovery_score",
    "Recovery Difficulty",
    "0 = well recovered, 10 = exhausted",
  ],

  [
    "energy_score",
    "Low Energy",
    "0 = energised, 10 = completely drained",
  ],

  [
    "mood_score",
    "Low Mood",
    "0 = positive, 10 = very low",
  ],

  [
    "focus_score",
    "Focus Difficulties",
    "0 = clear focus, 10 = unable to focus",
  ],

  ["burnout_score", "Burnout", "0 = none, 10 = severe"],
];
export default function AssessmentPage() {
  const [scores, setScores] = useState({
    stress_score: 5,
    sleep_score: 5,
    recovery_score: 5,
    energy_score: 5,
    mood_score: 5,
    focus_score: 5,
    burnout_score: 5,
  });

  
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveAssessment = async () => {
    if (saving) return;

    setSaving(true);
    setSaved(false);

  const activeExperience =
  localStorage.getItem("root_active_experience_v1") ||
  "personal";

const organisation = JSON.parse(
  localStorage.getItem("root_organisation_v1") || "{}"
);

let profileKey = null;
let organisationId =
  organisation.organisation_id || null;

if (activeExperience === "workplace") {
  profileKey =
    organisation.profile_key ||
    localStorage.getItem("root_profile_key_v1") ||
    null;
} else {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "ASSESSMENT IDENTITY ERROR:",
      userError
    );

    alert(
      "Root could not confirm your personal profile."
    );

    setSaving(false);
    return;
  }

  const {
    data: existingPersonalProfile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("profile_key, organisation_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "PERSONAL PROFILE ERROR:",
      profileError
    );

    alert(
      "Root could not find your personal profile."
    );

    setSaving(false);
    return;
  }

  let personalProfile = existingPersonalProfile;

  if (!personalProfile) {
    const profileKey = crypto.randomUUID();
    const userName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      "";

    const {
      data: createdProfile,
      error: profileCreateError,
    } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        profile_key: profileKey,
        name: userName,
        email: user.email || "",
        orientation_completed: false,
      })
      .select("profile_key, organisation_id")
      .single();

    if (profileCreateError || !createdProfile?.profile_key) {
      console.error(
        "PERSONAL PROFILE CREATION ERROR:",
        profileCreateError
      );

      alert(
        "Root could not create your personal profile."
      );

      setSaving(false);
      return;
    }

    personalProfile = createdProfile;
  }

  profileKey = personalProfile.profile_key;

  localStorage.setItem(
    "root_profile_key_v1",
    profileKey
  );

  organisationId =
    personalProfile.organisation_id ||
    organisation.organisation_id ||
    null;
}
/*
 * ROOT ASSESSMENT TYPE
 *
 * The employee does not decide whether an assessment
 * is a baseline or a check-in.
 *
 * The first assessment for this profile within this
 * organisation becomes the baseline automatically.
 *
 * Every later assessment becomes a check-in.
 */

let baselineQuery = supabase
  .from("wellbeing_assessments")
  .select("id")
  .eq("profile_key", profileKey)
  .eq("assessment_type", "baseline");

if (organisationId) {
  baselineQuery = baselineQuery.eq(
    "organisation_id",
    organisationId
  );
} else {
  baselineQuery = baselineQuery.is(
    "organisation_id",
    null
  );
}

const {
  data: existingBaselines,
  error: baselineLookupError,
} = await baselineQuery.limit(1);

if (baselineLookupError) {
  console.error(
    "BASELINE LOOKUP ERROR:",
    baselineLookupError
  );

  alert(
    "Root could not confirm whether this is your first assessment. Please try again."
  );

  setSaving(false);
  return;
}

const assessmentType =
  Array.isArray(existingBaselines) &&
  existingBaselines.length > 0
    ? "checkin"
    : "baseline";

const { error } = await supabase
  .from("wellbeing_assessments")
  .insert([
    {
      profile_key: profileKey,
      organisation_id: organisationId,
      assessment_type: assessmentType,
      ...scores,
      notes: notes.trim(),
    },
  ]);
  
    if (error) {
  console.error("ASSESSMENT SAVE ERROR:", error);

  alert(
    error.message ||
      "Something went wrong saving this check-in."
  );

  setSaving(false);
  return;
}

/*
 * The assessment has now been saved successfully.
 *
 * IMPORTANT:
 * Use the same profileKey that was used for the assessment.
 * Do not re-read it from localStorage here because Workplace
 * employees may have a different personal/workplace identity.
 */

const {
  error: baselineError,
} = await supabase
  .from("organisation_members")
  .update({
    baseline_completed_at: new Date().toISOString(),
  })
  .eq("profile_key", profileKey)
  .is("baseline_completed_at", null);

if (baselineError) {
  console.error(
    "BASELINE COMPLETION ERROR:",
    baselineError
  );
}

setSaved(true);
setNotes("");

if (typeof window !== "undefined") {
  const params = new URLSearchParams(
    window.location.search
  );

  const fromOrientation =
    params.get("from") === "orientation";

  if (fromOrientation) {
    /*
     * Mark the actual profile that completed
     * this assessment as orientation complete.
     */

    const {
      error: orientationError,
    } = await supabase
      .from("profiles")
      .update({
        orientation_completed: true,
      })
      .eq("profile_key", profileKey);

    if (orientationError) {
      console.error(
        "ORIENTATION COMPLETION ERROR:",
        orientationError
      );

      alert(
        "Your wellbeing picture was saved, but Root could not complete your onboarding. Please try again."
      );

      setSaving(false);
      return;
    }

    localStorage.setItem(
      "root_orientation_complete_v1",
      "true"
    );

    setTimeout(() => {
      window.location.href =
        "/onboarding-complete";
    }, 900);
  }
}

setSaving(false);
  };

  return (
    <RootAtmosphere type="reflection">
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
            <RootEnso size={92} />
          </div>

          <div style={styles.header}>
            <p style={styles.kicker}>Root Check-In</p>

            <h1 style={styles.title}>How are you arriving today?</h1>

            <p style={styles.subtitle}>
              A quiet moment to notice your current state. There are no right
              answers. Root uses these signals to understand where you are now
              and how things change over time.
            </p>
          </div>

          <section style={styles.card}>
            <div style={styles.introPanel}>
              <p style={styles.introLabel}>Your progress picture begins here</p>

              <p style={styles.introText}>
                These scores help Root remember your starting point, recognise
                shifts over time, and guide you with more care.
              </p>
            </div>

            <div style={styles.questionStack}>
              {questions.map(([key, label, help]) => (
                <div key={key} style={styles.question}>
                  <div style={styles.questionTop}>
                    <div>
                      <p style={styles.questionLabel}>{label}</p>
                      <p style={styles.helpText}>{help}</p>
                    </div>

                    <div style={styles.scoreBubble}>{scores[key]}</div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={scores[key]}
                    onChange={(event) =>
                      setScores((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                    style={styles.slider}
                  />
                </div>
              ))}
            </div>

            <textarea
              style={styles.textarea}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional reflection: what feels most important today?"
            />

            <button
              style={{
                ...styles.saveButton,
                opacity: saving ? 0.7 : 1,
              }}
              onClick={saveAssessment}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Root Check-In"}
            </button>

            {saved && (
              <p style={styles.savedText}>
                Saved. Root can now use this as part of your progress picture.
              </p>
            )}
          </section>
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
    padding: "120px 28px 42px",
    fontFamily: "Inter, sans-serif",
  },

  shell: {
    width: "100%",
    maxWidth: "960px",
    background: "rgba(255,255,255,0.22)",
    border: "1px solid rgba(255,255,255,0.34)",
    backdropFilter: "blur(30px)",
    WebkitBackdropFilter: "blur(30px)",
    borderRadius: "42px",
    padding: "42px",
    boxShadow: "0 34px 100px rgba(20,18,15,0.14)",
  },

  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "14px",
  },

  header: {
    textAlign: "center",
    marginBottom: "28px",
  },

  kicker: {
    margin: "0 0 10px",
    textAlign: "center",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "rgba(255,255,255,0.82)",
    fontWeight: "800",
  },

  title: {
    margin: "0 0 18px",
    textAlign: "center",
    fontSize: "clamp(42px, 7vw, 64px)",
    lineHeight: "1.05",
    color: "#FFFFFF",
    fontFamily: "Georgia, serif",
    fontWeight: "500",
    letterSpacing: "-0.04em",
  },

  subtitle: {
    maxWidth: "760px",
    margin: "0 auto",
    textAlign: "center",
    color: "rgba(255,255,255,0.84)",
    lineHeight: "1.85",
    fontSize: "18px",
  },

  card: {
    padding: "28px",
    borderRadius: "34px",
    background: "rgba(20,20,20,0.26)",
    border: "1px solid rgba(255,255,255,0.18)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    color: "#FFFFFF",
  },

  introPanel: {
    padding: "22px",
    borderRadius: "26px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    marginBottom: "22px",
  },

  introLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "rgba(255,255,255,0.72)",
    fontWeight: "800",
  },

  introText: {
    margin: 0,
    lineHeight: "1.8",
    color: "rgba(255,255,255,0.84)",
    fontSize: "16px",
  },

  label: {
    display: "block",
    marginBottom: "10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "rgba(255,255,255,0.72)",
    fontWeight: "800",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: "20px",
    padding: "15px 16px",
    background: "rgba(255,255,255,0.16)",
    color: "#FFFFFF",
    fontSize: "15px",
    outline: "none",
    marginBottom: "22px",
  },

  questionStack: {
    display: "grid",
    gap: "18px",
  },

  question: {
    padding: "18px",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
  },

  questionTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    alignItems: "center",
    marginBottom: "12px",
  },

  questionLabel: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
    color: "#FFFFFF",
  },

  helpText: {
    margin: "5px 0 0",
    color: "rgba(255,255,255,0.68)",
    fontSize: "14px",
  },

  scoreBubble: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "18px",
    flexShrink: 0,
  },

  slider: {
    width: "100%",
    accentColor: "#FFFFFF",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "120px",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: "22px",
    padding: "16px",
    background: "rgba(255,255,255,0.14)",
    color: "#FFFFFF",
    fontSize: "15px",
    lineHeight: "1.7",
    resize: "vertical",
    outline: "none",
    marginTop: "22px",
  },

  saveButton: {
    marginTop: "18px",
    border: "none",
    borderRadius: "999px",
    padding: "16px 24px",
    background: "#FFFFFF",
    color: "#181818",
    fontWeight: "800",
    fontSize: "15px",
    cursor: "pointer",
  },

  savedText: {
    margin: "16px 0 0",
    color: "rgba(255,255,255,0.86)",
    fontWeight: "800",
  },
};

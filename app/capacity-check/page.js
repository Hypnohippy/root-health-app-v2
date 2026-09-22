"use client";

import { useMemo, useState } from "react";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";
import RootInUseFilm from "../../components/RootInUseFilm";

const questions = [
  ["stress_score", "Stress", "0 = calm, 10 = overwhelmed"],
  ["sleep_score", "Sleep difficulties", "0 = sleeping well, 10 = severe difficulty"],
  ["recovery_score", "Recovery difficulty", "0 = restored, 10 = exhausted"],
  ["energy_score", "Low energy", "0 = energised, 10 = completely drained"],
  ["mood_score", "Low mood", "0 = positive, 10 = very low"],
  ["focus_score", "Focus difficulties", "0 = clear, 10 = unable to focus"],
  ["burnout_score", "Burnout", "0 = none, 10 = severe"],
];

const initialScores = Object.fromEntries(questions.map(([key]) => [key, 5]));

function buildSnapshot(scores) {
  const entries = questions
    .map(([key, label]) => ({ key, label, value: Number(scores[key] || 0) }))
    .sort((a, b) => b.value - a.value);

  const average =
    entries.reduce((total, item) => total + item.value, 0) / entries.length;
  const top = entries[0];

  let band = "steady";
  let headline = "Your capacity looks fairly steady today.";
  let guidance =
    "There may still be useful things to notice, but your overall load is not showing as heavily elevated.";

  if (average >= 7) {
    band = "high";
    headline = "Your system looks heavily loaded right now.";
    guidance =
      "The useful next step is not to fix everything at once. Start by reducing pressure around the area that is costing you the most capacity.";
  } else if (average >= 5) {
    band = "stretched";
    headline = "You look stretched rather than fully recovered.";
    guidance =
      "There is enough strain here to make recovery intentional. Small changes are more useful than waiting until you hit empty.";
  } else if (average >= 3) {
    band = "watch";
    headline = "There are a few signs worth paying attention to.";
    guidance =
      "This is a good point to notice patterns early, before they become harder to shift.";
  }

  return {
    average: Number(average.toFixed(1)),
    top,
    band,
    headline,
    guidance,
  };
}

export default function CapacityCheckPage() {
  const [scores, setScores] = useState(initialScores);
  const [stage, setStage] = useState("check");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const snapshot = useMemo(() => buildSnapshot(scores), [scores]);

  const reveal = () => {
    setError("");
    setStage("result");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const saveResult = async () => {
    if (saving) return;
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Add a valid email address so Root can send and remember your result.");
      return;
    }

    if (!consent) {
      setError("Please confirm that Root may email your result and useful follow-up support.");
      return;
    }

    setSaving(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch("/api/capacity-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          consent: true,
          scores,
          snapshot,
          source: params.get("source") || params.get("utm_source") || "direct",
          campaign: params.get("utm_campaign") || "",
          medium: params.get("utm_medium") || "",
          referrer: document.referrer || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Root could not save your result.");
      }

      setStage("saved");
    } catch (saveError) {
      setError(saveError.message || "Root could not save your result. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RootAtmosphere type="reflection">
      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
            <RootEnso size={82} />
          </div>

          {stage === "check" && (
            <>
              <header style={styles.header}>
                <p style={styles.kicker}>A private 2-minute Root check</p>
                <h1 style={styles.title}>What is draining your capacity?</h1>
                <p style={styles.subtitle}>
                  Seven simple signals. No diagnosis, no judgement and no need to
                  explain yourself. Just a clearer picture of where the pressure is
                  landing today.
                </p>
              </header>

              <section style={styles.card}>
                <div style={styles.questionStack}>
                  {questions.map(([key, label, help]) => (
                    <div key={key} style={styles.question}>
                      <div style={styles.questionTop}>
                        <div>
                          <p style={styles.questionLabel}>{label}</p>
                          <p style={styles.help}>{help}</p>
                        </div>
                        <div style={styles.score}>{scores[key]}</div>
                      </div>

                      <input
                        aria-label={label}
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

                <button style={styles.primaryButton} onClick={reveal}>
                  Show me my Root snapshot
                </button>

                <p style={styles.smallPrint}>
                  This is a wellbeing reflection, not a medical assessment or diagnosis.
                </p>
              </section>
            </>
          )}

          {stage !== "check" && (
            <>
              <header style={styles.header}>
                <p style={styles.kicker}>Your Root snapshot</p>
                <h1 style={styles.resultTitle}>{snapshot.headline}</h1>
                <p style={styles.subtitle}>{snapshot.guidance}</p>
              </header>

              <section style={styles.card}>
                <div style={styles.resultGrid}>
                  <div style={styles.resultPanel}>
                    <p style={styles.resultLabel}>Overall load</p>
                    <p style={styles.resultNumber}>{snapshot.average}/10</p>
                    <p style={styles.resultText}>
                      An average across your seven signals. Higher means more strain.
                    </p>
                  </div>

                  <div style={styles.resultPanel}>
                    <p style={styles.resultLabel}>Strongest signal</p>
                    <p style={styles.resultName}>{snapshot.top.label}</p>
                    <p style={styles.resultNumberSmall}>{snapshot.top.value}/10</p>
                  </div>
                </div>

                <div style={styles.nextPanel}>
                  <p style={styles.nextLabel}>What Root would start with</p>
                  <p style={styles.nextText}>
                    Give the strongest signal a little more attention before trying to
                    optimise everything else. Capacity usually improves when the biggest
                    drain stops being ignored.
                  </p>
                </div>

                <RootInUseFilm />

                {stage === "result" && (
                  <div style={styles.capturePanel}>
                    <h2 style={styles.captureTitle}>Keep your snapshot</h2>
                    <p style={styles.captureCopy}>
                      Root can email this result and send occasional useful follow-up
                      support based on the same approach.
                    </p>

                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      style={styles.emailInput}
                    />

                    <label style={styles.consentRow}>
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                      />
                      <span>
                        Yes — email me my Root result and useful follow-up support. I can
                        unsubscribe at any time.
                      </span>
                    </label>

                    {error && <p style={styles.error}>{error}</p>}

                    <button
                      style={{ ...styles.primaryButton, opacity: saving ? 0.7 : 1 }}
                      onClick={saveResult}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Email and remember my result"}
                    </button>

                    <p style={styles.privacy}>
                      Root does not sell your personal information. See our{" "}
                      <a href="/privacy" style={styles.link}>privacy information</a>.
                    </p>
                  </div>
                )}

                {stage === "saved" && (
                  <div style={styles.savedPanel}>
                    <p style={styles.savedEyebrow}>Saved</p>
                    <h2 style={styles.captureTitle}>Your Root journey can start here.</h2>
                    <p style={styles.captureCopy}>
                      Your snapshot is stored with your consent. When you are ready, you
                      can explore the fuller personal Root experience.
                    </p>
                    <a href="/capacity-check/continue" style={styles.ctaLink}>Explore Root</a>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </RootAtmosphere>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "48px 20px",
    display: "flex",
    justifyContent: "center",
    fontFamily: "Inter, sans-serif",
  },
  shell: {
    width: "100%",
    maxWidth: "920px",
    margin: "0 auto",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "10px",
  },
  header: {
    textAlign: "center",
    maxWidth: "760px",
    margin: "0 auto 24px",
  },
  kicker: {
    margin: "0 0 10px",
    color: "rgba(255,255,255,.78)",
    textTransform: "uppercase",
    letterSpacing: ".16em",
    fontWeight: 800,
    fontSize: "12px",
  },
  title: {
    margin: "0 0 16px",
    color: "#fff",
    fontFamily: "Georgia, serif",
    fontWeight: 500,
    letterSpacing: "-.04em",
    lineHeight: 1.02,
    fontSize: "clamp(44px,8vw,76px)",
  },
  resultTitle: {
    margin: "0 0 16px",
    color: "#fff",
    fontFamily: "Georgia, serif",
    fontWeight: 500,
    letterSpacing: "-.035em",
    lineHeight: 1.06,
    fontSize: "clamp(38px,6vw,62px)",
  },
  subtitle: {
    margin: 0,
    color: "rgba(255,255,255,.84)",
    fontSize: "18px",
    lineHeight: 1.75,
  },
  card: {
    padding: "clamp(20px,4vw,34px)",
    borderRadius: "34px",
    background: "rgba(18,18,18,.30)",
    border: "1px solid rgba(255,255,255,.18)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: "0 30px 90px rgba(0,0,0,.16)",
    color: "#fff",
  },
  questionStack: { display: "grid", gap: "14px" },
  question: {
    padding: "18px",
    borderRadius: "22px",
    background: "rgba(255,255,255,.11)",
    border: "1px solid rgba(255,255,255,.14)",
  },
  questionTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    marginBottom: "10px",
  },
  questionLabel: { margin: 0, fontSize: "18px", fontWeight: 800 },
  help: {
    margin: "5px 0 0",
    color: "rgba(255,255,255,.66)",
    fontSize: "13px",
  },
  score: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.16)",
    fontWeight: 900,
    flexShrink: 0,
  },
  slider: { width: "100%", accentColor: "#fff" },
  primaryButton: {
    width: "100%",
    marginTop: "22px",
    border: 0,
    borderRadius: "999px",
    padding: "16px 22px",
    background: "#fff",
    color: "#171717",
    fontWeight: 900,
    fontSize: "15px",
    cursor: "pointer",
  },
  smallPrint: {
    margin: "14px 0 0",
    textAlign: "center",
    color: "rgba(255,255,255,.58)",
    fontSize: "12px",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "14px",
  },
  resultPanel: {
    padding: "22px",
    borderRadius: "24px",
    background: "rgba(255,255,255,.11)",
    border: "1px solid rgba(255,255,255,.14)",
  },
  resultLabel: {
    margin: "0 0 8px",
    textTransform: "uppercase",
    letterSpacing: ".12em",
    fontSize: "11px",
    fontWeight: 800,
    color: "rgba(255,255,255,.66)",
  },
  resultNumber: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "48px",
  },
  resultName: { margin: "0 0 4px", fontSize: "24px", fontWeight: 800 },
  resultNumberSmall: { margin: 0, fontSize: "20px", fontWeight: 900 },
  resultText: {
    margin: "8px 0 0",
    color: "rgba(255,255,255,.72)",
    lineHeight: 1.6,
  },
  nextPanel: {
    marginTop: "14px",
    padding: "22px",
    borderRadius: "24px",
    background: "rgba(255,255,255,.08)",
  },
  nextLabel: {
    margin: "0 0 8px",
    fontWeight: 900,
    fontSize: "13px",
  },
  nextText: {
    margin: 0,
    color: "rgba(255,255,255,.82)",
    lineHeight: 1.7,
  },
  capturePanel: {
    marginTop: "20px",
    paddingTop: "22px",
    borderTop: "1px solid rgba(255,255,255,.14)",
  },
  captureTitle: {
    margin: "0 0 8px",
    fontFamily: "Georgia, serif",
    fontSize: "30px",
    fontWeight: 500,
  },
  captureCopy: {
    margin: "0 0 16px",
    color: "rgba(255,255,255,.76)",
    lineHeight: 1.7,
  },
  emailInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(255,255,255,.22)",
    borderRadius: "18px",
    padding: "15px 16px",
    background: "rgba(255,255,255,.12)",
    color: "#fff",
    outline: "none",
    fontSize: "16px",
  },
  consentRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    marginTop: "14px",
    color: "rgba(255,255,255,.78)",
    lineHeight: 1.55,
    fontSize: "13px",
  },
  error: { color: "#ffd6d6", fontWeight: 800, margin: "14px 0 0" },
  privacy: {
    margin: "12px 0 0",
    color: "rgba(255,255,255,.56)",
    fontSize: "12px",
    textAlign: "center",
  },
  link: { color: "#fff" },
  savedPanel: {
    marginTop: "20px",
    padding: "24px",
    borderRadius: "24px",
    background: "rgba(255,255,255,.11)",
    textAlign: "center",
  },
  savedEyebrow: {
    margin: "0 0 8px",
    textTransform: "uppercase",
    letterSpacing: ".15em",
    fontSize: "11px",
    fontWeight: 900,
  },
  ctaLink: {
    display: "inline-block",
    marginTop: "8px",
    padding: "14px 22px",
    borderRadius: "999px",
    background: "#fff",
    color: "#171717",
    textDecoration: "none",
    fontWeight: 900,
  },
};

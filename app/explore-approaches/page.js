"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

const RECOMMENDATIONS = {
  stress: {
    label: "Workforce Pressure",
    title: "Pressure & Performance Support",
    summary:
      "Root is seeing signs that workforce pressure may be affecting sustainable performance, recovery or day-to-day resilience.",
    whyItMatters:
      "Persistent pressure can gradually affect concentration, energy, decision-making and the ability to recover between working days.",
    primaryResponse: "Pressure & Performance Briefing",
    responseDescription:
      "A practical session exploring sustainable performance, pressure awareness and ways of reducing burnout risk without lowering organisational ambition.",
    approaches: [
      "Pressure & Performance Briefing",
      "Manager Awareness Session",
      "Workforce Resilience Workshop",
      "Leadership Briefing",
    ],
    audience:
      "Suitable for employees, managers or leadership teams depending on where pressure is appearing most strongly.",
    outcome:
      "Greater awareness of pressure patterns, earlier recognition of strain and practical approaches that support sustainable performance.",
  },

  burnout: {
    label: "Burnout Risk",
    title: "Burnout Prevention & Recovery",
    summary:
      "Root is seeing a pattern that may indicate sustained strain, reduced recovery or increasing burnout risk across the workforce.",
    whyItMatters:
      "Burnout rarely appears suddenly. It often develops through prolonged pressure, depleted energy and insufficient recovery.",
    primaryResponse: "Recovery & Resilience Workshop",
    responseDescription:
      "A practical workshop helping employees recognise cumulative strain, understand recovery and use realistic strategies before exhaustion becomes entrenched.",
    approaches: [
      "Recovery & Resilience Workshop",
      "Burnout Prevention Session",
      "Manager Early-Warning Training",
      "Leadership Risk Briefing",
    ],
    audience:
      "Suitable for whole-workforce delivery, management groups or teams experiencing sustained demand.",
    outcome:
      "Improved recognition of burnout risk, clearer recovery practices and stronger organisational conversations about sustainable workload.",
  },

  recovery: {
    label: "Recovery Difficulty",
    title: "Workforce Recovery Support",
    summary:
      "Root is seeing signs that employees may be finding it difficult to recover fully from ongoing work and life demands.",
    whyItMatters:
      "When recovery remains limited, pressure can accumulate even when employees continue to perform and appear outwardly capable.",
    primaryResponse: "Recovery & Resilience Workshop",
    responseDescription:
      "A practical session focused on nervous-system recovery, energy restoration and small sustainable changes employees can use in everyday life.",
    approaches: [
      "Recovery & Resilience Workshop",
      "Wellbeing Education Session",
      "Manager Awareness Session",
      "Internal Recovery Initiative",
    ],
    audience:
      "Suitable for employees, operational teams, managers and workforces experiencing sustained demand.",
    outcome:
      "Greater understanding of recovery, practical self-management strategies and earlier recognition of depleted capacity.",
  },

  sleep: {
    label: "Sleep Difficulty",
    title: "Sleep, Fatigue & Recovery Support",
    summary:
      "Root is seeing a pattern suggesting that sleep difficulty or fatigue may be affecting workforce wellbeing and recovery.",
    whyItMatters:
      "Poor sleep can influence mood, concentration, decision-making, emotional regulation and the capacity to manage pressure.",
    primaryResponse: "Sleep & Recovery Workshop",
    responseDescription:
      "An accessible session explaining the relationship between sleep, stress and recovery, with practical strategies employees can apply without unrealistic routines.",
    approaches: [
      "Sleep & Recovery Workshop",
      "Fatigue Awareness Session",
      "Manager Briefing",
      "Workforce Wellbeing Education",
    ],
    audience:
      "Suitable for general workforces, shift-based teams, managers and employees working under sustained demand.",
    outcome:
      "Improved understanding of sleep and fatigue, more realistic recovery habits and better awareness of when additional support may be needed.",
  },

  mood: {
    label: "Mood Difficulty",
    title: "Emotional Resilience Support",
    summary:
      "Root is seeing a workforce pattern that may reflect emotional strain, reduced mood or difficulty maintaining psychological resilience.",
    whyItMatters:
      "Changes in mood can affect motivation, relationships, confidence, engagement and an employee's ability to manage ordinary workplace pressure.",
    primaryResponse: "Emotional Resilience Workshop",
    responseDescription:
      "A supportive session helping employees understand emotional load, recognise patterns and develop practical approaches to regulation and resilience.",
    approaches: [
      "Emotional Resilience Workshop",
      "Manager Awareness Session",
      "Wellbeing Education",
      "Leadership Briefing",
    ],
    audience:
      "Suitable for employees, managers and teams navigating change, uncertainty or sustained emotional demand.",
    outcome:
      "Improved emotional awareness, practical regulation strategies and more confident conversations around workforce wellbeing.",
  },

  energy: {
    label: "Reduced Energy",
    title: "Energy & Sustainable Performance",
    summary:
      "Root is seeing signs that depleted energy may be affecting employee capacity, recovery or sustainable performance.",
    whyItMatters:
      "Reduced energy can be an early indication of cumulative workload, poor recovery, sleep disruption or increasing emotional strain.",
    primaryResponse: "Energy & Recovery Workshop",
    responseDescription:
      "A practical session examining the relationship between workload, energy, recovery and sustainable performance.",
    approaches: [
      "Energy & Recovery Workshop",
      "Pressure & Performance Briefing",
      "Manager Awareness Session",
      "Internal Wellbeing Initiative",
    ],
    audience:
      "Suitable for whole teams, managers and employees working within demanding or rapidly changing environments.",
    outcome:
      "Greater understanding of energy depletion, more sustainable working practices and earlier recognition of declining capacity.",
  },

  focus: {
    label: "Focus Difficulty",
    title: "Focus, Pressure & Mental Load",
    summary:
      "Root is seeing indications that mental load or sustained pressure may be affecting concentration and clarity.",
    whyItMatters:
      "Difficulty focusing can develop when employees are overloaded, fatigued, emotionally strained or unable to recover effectively.",
    primaryResponse: "Mental Load & Focus Session",
    responseDescription:
      "A practical session exploring attention, cognitive load, pressure and realistic ways of restoring clarity during demanding periods.",
    approaches: [
      "Mental Load & Focus Session",
      "Manager Development",
      "Pressure & Performance Briefing",
      "Leadership Briefing",
    ],
    audience:
      "Suitable for knowledge workers, managers, leadership groups and teams experiencing competing priorities.",
    outcome:
      "Better awareness of cognitive load, practical focus strategies and more sustainable approaches to prioritisation.",
  },

  baseline: {
    label: "Developing Workforce Baseline",
    title: "Building a Reliable Wellbeing Baseline",
    summary:
      "Root is still gathering sufficient repeat evidence to identify the strongest workforce pattern with confidence.",
    whyItMatters:
      "A trustworthy baseline helps an organisation distinguish isolated responses from patterns that may require meaningful action.",
    primaryResponse: "Workforce Insight Briefing",
    responseDescription:
      "A focused conversation about participation, measurement and how to establish a reliable picture of workforce wellbeing before selecting an intervention.",
    approaches: [
      "Workforce Insight Briefing",
      "Participation Initiative",
      "Manager Awareness Session",
      "Leadership Briefing",
    ],
    audience:
      "Suitable for HR, People teams, wellbeing leads and senior leaders responsible for organisational health.",
    outcome:
      "A clearer measurement strategy, stronger participation and greater confidence in future organisational recommendations.",
  },
};

function normaliseTheme(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  if (
    text.includes("burnout") ||
    text.includes("exhaust") ||
    text.includes("overwhelm")
  ) {
    return "burnout";
  }

  if (
    text.includes("sleep") ||
    text.includes("fatigue") ||
    text.includes("tired")
  ) {
    return "sleep";
  }

  if (
    text.includes("recovery") ||
    text.includes("recover")
  ) {
    return "recovery";
  }

  if (
    text.includes("mood") ||
    text.includes("emotional") ||
    text.includes("emotion")
  ) {
    return "mood";
  }

  if (
    text.includes("focus") ||
    text.includes("concentration") ||
    text.includes("mental load")
  ) {
    return "focus";
  }

  if (
    text.includes("energy") ||
    text.includes("drained")
  ) {
    return "energy";
  }

  if (
    text.includes("stress") ||
    text.includes("pressure") ||
    text.includes("strain")
  ) {
    return "stress";
  }

  return "baseline";
}

function formatConfidence(value) {
  const text = String(value || "").trim();

  if (!text) return "Developing";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function ExploreApproachesPage() {
  const [pageContext, setPageContext] = useState({
    theme: "baseline",
    confidence: "Developing",
    evidence: "",
    organisation: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const rawTheme =
      params.get("theme") ||
      params.get("concern") ||
      params.get("focus") ||
      params.get("pattern") ||
      "";

    setPageContext({
      theme: normaliseTheme(rawTheme),
      confidence: formatConfidence(params.get("confidence")),
      evidence: params.get("evidence") || "",
      organisation: params.get("organisation") || "",
    });
  }, []);

  const recommendation = useMemo(() => {
    return (
      RECOMMENDATIONS[pageContext.theme] ||
      RECOMMENDATIONS.baseline
    );
  }, [pageContext.theme]);

  const emailHref = useMemo(() => {
    const organisationText = pageContext.organisation
      ? ` for ${pageContext.organisation}`
      : "";

    const subject =
      `Root Health conversation${organisationText}: ` +
      recommendation.primaryResponse;

    const body = [
      "Hi David,",
      "",
      `I would like to discuss Root's recommendation: ${recommendation.primaryResponse}.`,
      "",
      `Current workforce theme: ${recommendation.label}`,
      `Confidence: ${pageContext.confidence}`,
      "",
      "Please contact me to continue the conversation.",
    ].join("\n");

    return `mailto:david@fuelgeist.co.uk?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }, [
    pageContext.confidence,
    pageContext.organisation,
    recommendation,
  ]);

  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <article style={styles.card}>
          <header style={styles.header}>
            <RootEnso size={80} />

            <p style={styles.kicker}>
              Root Organisational Recommendation
            </p>

            <h1 style={styles.title}>
              Why Root Recommended This
            </h1>

            <p style={styles.intro}>
              This recommendation reflects the current anonymous
              workforce pattern. It is intended to help the
              organisation move from insight towards an appropriate
              and proportionate response.
            </p>
          </header>

          <section style={styles.patternCard}>
            <div style={styles.patternHeading}>
              <div>
                <p style={styles.eyebrow}>
                  Current Workforce Theme
                </p>

                <h2 style={styles.patternTitle}>
                  {recommendation.label}
                </h2>
              </div>

              <div style={styles.confidenceBadge}>
                <span style={styles.confidenceLabel}>
                  Confidence
                </span>

                <strong>
                  {pageContext.confidence}
                </strong>
              </div>
            </div>

            <p style={styles.patternText}>
              {recommendation.summary}
            </p>

            {pageContext.evidence ? (
              <div style={styles.evidenceBox}>
                <strong>What Root is seeing</strong>

                <p style={styles.evidenceText}>
                  {pageContext.evidence}
                </p>
              </div>
            ) : null}
          </section>

          <section style={styles.section}>
            <p style={styles.eyebrow}>
              Why This Matters
            </p>

            <h2 style={styles.sectionTitle}>
              Understanding the organisational significance
            </h2>

            <p style={styles.text}>
              {recommendation.whyItMatters}
            </p>
          </section>

          <section style={styles.recommendationCard}>
            <p style={styles.eyebrow}>
              Suggested Organisational Response
            </p>

            <h2 style={styles.recommendationTitle}>
              {recommendation.primaryResponse}
            </h2>

            <p style={styles.text}>
              {recommendation.responseDescription}
            </p>

            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>
                  Suitable for
                </span>

                <p style={styles.detailText}>
                  {recommendation.audience}
                </p>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>
                  Intended outcome
                </span>

                <p style={styles.detailText}>
                  {recommendation.outcome}
                </p>
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <p style={styles.eyebrow}>
              Approaches Organisations Often Explore
            </p>

            <h2 style={styles.sectionTitle}>
              The response can be shaped around your people,
              culture and goals
            </h2>

            <div style={styles.grid}>
              {recommendation.approaches.map((approach) => (
                <div
                  key={approach}
                  style={styles.item}
                >
                  {approach}
                </div>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <p style={styles.eyebrow}>
              How Root Can Help
            </p>

            <h2 style={styles.sectionTitle}>
              From workforce insight to meaningful action
            </h2>

            <p style={styles.text}>
              Root Health works with organisations to understand
              workforce wellbeing, resilience, performance and
              recovery.
            </p>

            <p style={styles.text}>
              The next step may be a leadership conversation,
              manager education, a workforce workshop, coaching or
              an internally delivered initiative. Root helps the
              organisation consider what is proportionate to the
              evidence currently available.
            </p>

            <p style={styles.text}>
              Repeat check-ins can then help the organisation
              understand whether the chosen response was followed
              by meaningful workforce movement.
            </p>
          </section>

          <section style={styles.authorCard}>
            <div>
              <p style={styles.eyebrow}>
                Continue the Conversation
              </p>

              <h3 style={styles.authorName}>
                David Prince
              </h3>

              <p style={styles.authorLine}>
                PhD (c), Preventative Care
              </p>

              <p style={styles.authorLine}>
                Former Soldier
              </p>

              <p style={styles.authorLine}>
                Trauma-Informed Hypnotherapist
              </p>

              <p style={styles.authorLine}>
                Founder, Root Health
              </p>
            </div>

            <div style={styles.authorAction}>
              <p style={styles.authorActionText}>
                Discuss the workforce pattern, the recommendation
                and the most appropriate next step for your
                organisation.
              </p>

              <a
                href={emailHref}
                style={styles.primaryButton}
              >
                Talk to David
              </a>

              <a
                href="mailto:david@fuelgeist.co.uk"
                style={styles.emailLink}
              >
                david@fuelgeist.co.uk
              </a>
            </div>
          </section>

          <footer style={styles.footer}>
            Root Health Workforce Intelligence
          </footer>
        </article>
      </main>
    </RootAtmosphere>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    display: "flex",
    justifyContent: "center",
  },

  card: {
    width: "100%",
    maxWidth: "980px",
    padding: "clamp(24px, 5vw, 48px)",
    borderRadius: "42px",
    background: "rgba(255,255,255,0.42)",
    border: "1px solid rgba(255,255,255,0.62)",
    backdropFilter: "blur(24px)",
    boxSizing: "border-box",
  },

  header: {
    textAlign: "center",
  },

  kicker: {
    marginTop: "18px",
    marginBottom: "14px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    fontWeight: "800",
    color: "#746B5E",
  },

  title: {
    fontSize: "clamp(38px, 6vw, 58px)",
    lineHeight: "1.05",
    letterSpacing: "-0.045em",
    margin: "0 0 20px",
  },

  intro: {
    fontSize: "clamp(17px, 2.4vw, 20px)",
    lineHeight: "1.75",
    maxWidth: "760px",
    margin: "0 auto",
    color: "#4A433A",
  },

  eyebrow: {
    margin: "0 0 8px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "11px",
    fontWeight: "800",
    color: "#746B5E",
  },

  patternCard: {
    marginTop: "46px",
    padding: "clamp(22px, 4vw, 32px)",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(255,255,255,0.78)",
  },

  patternHeading: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "18px",
  },

  patternTitle: {
    margin: 0,
    fontSize: "clamp(28px, 4vw, 38px)",
    letterSpacing: "-0.035em",
  },

  patternText: {
    margin: "22px 0 0",
    fontSize: "18px",
    lineHeight: "1.75",
    color: "#3F392F",
  },

  confidenceBadge: {
    minWidth: "120px",
    padding: "12px 16px",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    background: "rgba(220,230,210,0.55)",
    color: "#3F493B",
  },

  confidenceLabel: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  evidenceBox: {
    marginTop: "22px",
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(242,238,228,0.68)",
  },

  evidenceText: {
    margin: "8px 0 0",
    lineHeight: "1.7",
    color: "#4A433A",
  },

  section: {
    marginTop: "46px",
  },

  sectionTitle: {
    margin: "0 0 16px",
    fontSize: "clamp(24px, 3.5vw, 32px)",
    letterSpacing: "-0.025em",
  },

  text: {
    margin: "0 0 14px",
    lineHeight: "1.8",
    fontSize: "17px",
    color: "#4A433A",
  },

  recommendationCard: {
    marginTop: "46px",
    padding: "clamp(24px, 4vw, 36px)",
    borderRadius: "30px",
    background: "rgba(220,230,210,0.42)",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  recommendationTitle: {
    margin: "0 0 16px",
    fontSize: "clamp(30px, 4.5vw, 42px)",
    letterSpacing: "-0.04em",
  },

  detailGrid: {
    marginTop: "24px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
  },

  detailItem: {
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.52)",
  },

  detailLabel: {
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#746B5E",
  },

  detailText: {
    margin: "8px 0 0",
    lineHeight: "1.65",
    color: "#4A433A",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "12px",
  },

  item: {
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.55)",
    border: "1px solid rgba(255,255,255,0.72)",
    fontWeight: "700",
    lineHeight: "1.45",
  },

  authorCard: {
    marginTop: "48px",
    padding: "clamp(24px, 4vw, 34px)",
    borderRadius: "28px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "28px",
    background: "rgba(255,255,255,0.48)",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  authorName: {
    margin: "0 0 12px",
    fontSize: "28px",
  },

  authorLine: {
    margin: "6px 0",
    color: "#4A433A",
  },

  authorAction: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
  },

  authorActionText: {
    margin: "0 0 18px",
    lineHeight: "1.7",
    color: "#4A433A",
  },

  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 22px",
    borderRadius: "999px",
    background: "#26352D",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: "800",
  },

  emailLink: {
    marginTop: "14px",
    color: "#4A433A",
    textDecoration: "none",
    fontWeight: "700",
  },

  footer: {
    marginTop: "30px",
    textAlign: "center",
    fontSize: "13px",
    color: "#746B5E",
  },
};
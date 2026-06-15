"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function average(items, key) {
  const values = items.map((i) => Number(i[key])).filter((v) => !Number.isNaN(v));
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function format(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Number(v).toFixed(1);
}

function scoreFromAssessments(items) {
  if (!items.length) return null;

  const keys = [
    "stress_score",
    "burnout_score",
    "sleep_score",
    "recovery_score",
    "mood_score",
    "focus_score",
  ];

  const values = keys.map((k) => average(items, k)).filter((v) => v !== null);
  if (!values.length) return null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(100 - avg * 10);
}

function mapChallengeTheme(theme = "") {
  const value = String(theme).toLowerCase();

  if (value.includes("bullying") || value.includes("job security") || value.includes("work")) {
    return "Workplace Pressure";
  }

  if (value.includes("relationship") || value.includes("trust") || value.includes("commitment")) {
    return "Relationship Stress";
  }

  if (value.includes("failure") || value.includes("performance") || value.includes("perfect")) {
    return "Performance Pressure";
  }

  if (value.includes("shame") || value.includes("self")) return "Self-Criticism";
  if (value.includes("unclear")) return "Emotional Uncertainty";

  return theme || "Other";
}

function countBy(items, key) {
  const counts = {};
  items.forEach((item) => {
    const value = item[key];
    if (!value) return;
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function change(start, current) {
  if (start === null || current === null) return null;
  return current - start;
}

function buildNarrative({ metricResults, currentScore, mostCommonTheme, supportInteractions }) {
  const improved = metricResults
    .filter((m) => m.change !== null && m.change < 0)
    .sort((a, b) => a.change - b.change);

  const worsened = metricResults
    .filter((m) => m.change !== null && m.change > 0)
    .sort((a, b) => b.change - a.change);

  const strongest = improved[0];
  const watch = worsened[0];

  return {
    insight: strongest
      ? `${strongest.label} showed the strongest improvement during the review period, moving from ${format(
          strongest.start
        )} to ${format(strongest.current)}. ${
          watch
            ? `${watch.label} increased during the same period and should be monitored during the next review period.`
            : "Several indicators are beginning to show a healthier direction of travel."
        } Overall, current data suggests early positive movement, although a longer review period will give greater confidence.`
      : "Root is still gathering enough follow-up data to identify reliable workforce movement.",

    summary: `Early workforce wellbeing data indicates a current wellbeing score of ${
      currentScore ?? "—"
    }. ${
      strongest
        ? `${strongest.label} is currently the strongest area of improvement.`
        : "More follow-up data is needed before improvement patterns can be confirmed."
    } The most common anonymous workforce challenge is ${mostCommonTheme}. Support engagement currently stands at ${supportInteractions} recorded interactions.`,

    actions: [
      "Encourage weekly wellbeing check-ins so movement can be tracked more reliably.",
      "Promote Voice Coach and Thought Work as practical support routes between formal reviews.",
      "Use team conversations to normalise recovery, sleep, stress and burnout awareness.",
    ],

    learning: [
      "Stress Management and Workplace Resilience",
      "Burnout Prevention and Recovery Habits",
      "Sleep, Energy and Recovery Foundations",
      "Practical Lifestyle Coaching Principles",
    ],

    development: [
      "Lifestyle Coaching",
      "Wellbeing Workshops",
      "Manager Awareness Training",
      "Resilience Programmes",
    ],
  };
}

function LineChart({ rows }) {
  const width = 900;
  const height = 300;
  const pad = 46;

  const series = [
    { key: "stress", label: "Stress", color: "#d33" },
    { key: "burnout", label: "Burnout", color: "#e88419" },
    { key: "sleep", label: "Sleep difficulty", color: "#2563eb" },
    { key: "recovery", label: "Recovery difficulty", color: "#16a34a" },
  ];

  const xFor = (i) => pad + (i / Math.max(rows.length - 1, 1)) * (width - pad * 2);
  const yFor = (v) => height - pad - (Number(v || 0) / 10) * (height - pad * 2);

  const pathFor = (key) =>
    rows
      .map((row, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(row[key])}`)
      .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.chart}>
        {[0, 2, 4, 6, 8, 10].map((tick) => (
          <g key={tick}>
            <line
              x1={pad}
              x2={width - pad}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="#ddd"
              strokeWidth="1"
            />
            <text x={pad - 22} y={yFor(tick) + 4} fontSize="11" fill="#333">
              {tick}
            </text>
          </g>
        ))}

        {series.map((s) => (
          <path
            key={s.key}
            d={pathFor(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {rows.map((row, rowIndex) =>
          series.map((s) => (
            <circle
              key={`${s.key}-${rowIndex}`}
              cx={xFor(rowIndex)}
              cy={yFor(row[s.key])}
              r="4"
              fill={s.color}
            />
          ))
        )}

        {rows.map((row, i) => (
          <text
            key={row.label}
            x={xFor(i)}
            y={height - 14}
            textAnchor="middle"
            fontSize="11"
            fill="#333"
          >
            {row.label}
          </text>
        ))}
      </svg>

      <div style={styles.legend}>
        {series.map((s) => (
          <span key={s.key}>
            <b style={{ color: s.color }}>●</b> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ExecutiveReviewPage() {
  const [loading, setLoading] = useState(true);
  const [organisation, setOrganisation] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [voiceSessions, setVoiceSessions] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: orgs } = await supabase
      .from("organisations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    const org = Array.isArray(orgs) ? orgs[0] : null;
    const orgId = org?.id || null;

    const orgFilter = orgId
      ? `organisation_id.eq.${orgId},organisation_id.is.null`
      : "organisation_id.is.null";

    const { data: assessmentData } = await supabase
      .from("wellbeing_assessments")
      .select("*")
      .or(orgFilter)
      .order("created_at", { ascending: true });

    const { data: mindData } = await supabase
      .from("mind_entries")
      .select("*")
      .or(orgFilter)
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: journalData } = await supabase
      .from("journal_entries")
      .select("*")
      .or(orgFilter)
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: voiceData } = await supabase
      .from("voice_sessions")
      .select("*")
      .or(orgFilter)
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: memberData } = await supabase
      .from("organisation_members")
      .select("*")
      .order("created_at", { ascending: false });

    setOrganisation(org || null);
    setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
    setMindEntries(Array.isArray(mindData) ? mindData : []);
    setJournalEntries(Array.isArray(journalData) ? journalData : []);
    setVoiceSessions(Array.isArray(voiceData) ? voiceData : []);
    setMembers(Array.isArray(memberData) ? memberData : []);

    setLoading(false);
  };

  if (loading) return <main style={styles.page}>Loading executive review...</main>;

  const baseline = assessments.filter((a) => a.assessment_type === "baseline");
  const latest = assessments.length ? [assessments[assessments.length - 1]] : [];

  const metrics = [
    ["Stress", "stress_score"],
    ["Burnout", "burnout_score"],
    ["Sleep difficulty", "sleep_score"],
    ["Recovery difficulty", "recovery_score"],
    ["Mood difficulty", "mood_score"],
    ["Focus difficulty", "focus_score"],
  ];

  const metricResults = metrics.map(([label, key]) => {
    const start = average(baseline, key);
    const current = average(latest, key);
    return { label, key, start, current, change: change(start, current) };
  });

  const mostImproved = metricResults
    .filter((m) => m.change !== null && m.change < 0)
    .sort((a, b) => a.change - b.change)[0];

  const mappedThemes = countBy(
    mindEntries
      .filter((e) => e.thought_theme)
      .map((e) => ({ challenge: mapChallengeTheme(e.thought_theme) })),
    "challenge"
  );

  const mostCommonTheme = mappedThemes[0]?.[0] || "No challenge data yet";
  const supportInteractions =
    mindEntries.length + journalEntries.length + voiceSessions.length;

  const currentScore = scoreFromAssessments(latest);
  const baselineScore = scoreFromAssessments(baseline);

  const activated = members.filter((m) => m.activated_at).length;

  const confidenceScore = Math.min(
    100,
    Math.round(assessments.length * 8 + supportInteractions * 0.4 + activated * 5)
  );

  const confidenceLabel =
    confidenceScore >= 80
      ? "High"
      : confidenceScore >= 60
      ? "Established"
      : confidenceScore >= 40
      ? "Developing"
      : "Early";

  const trendRows = assessments.map((entry, index) => ({
    label: entry.assessment_type === "baseline" ? "Baseline" : `Check-in ${index}`,
    stress: Number(entry.stress_score),
    burnout: Number(entry.burnout_score),
    sleep: Number(entry.sleep_score),
    recovery: Number(entry.recovery_score),
  }));

  const narrative = buildNarrative({
    metricResults,
    currentScore,
    mostCommonTheme,
    supportInteractions,
  });

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main style={styles.page}>
      <section style={styles.cover}>
        <p style={styles.kicker}>Root Health</p>
        <h1 style={styles.coverTitle}>Executive Wellbeing Review</h1>
        <p style={styles.coverSubtitle}>Generated from anonymised workforce wellbeing data.</p>

        <div style={styles.coverGrid}>
          <div>
            <strong>Organisation</strong>
            <span>{organisation?.name || "Root Health Trial Company"}</span>
          </div>
          <div>
            <strong>Review date</strong>
            <span>{today}</span>
          </div>
          <div>
            <strong>Review period</strong>
            <span>Trial review period</span>
          </div>
          <div>
            <strong>Current wellbeing score</strong>
            <span>{currentScore ?? "—"}</span>
          </div>
        </div>

        <p style={styles.confidential}>Confidential · For internal organisational review</p>
      </section>

      <section style={styles.section}>
        <p style={styles.kicker}>Executive Snapshot</p>
        <h2>Current organisational picture</h2>

        <div style={styles.snapshotGrid}>
          <div style={styles.snapshotCard}>
            <span>Wellbeing score</span>
            <strong>{currentScore ?? "—"}</strong>
            <small>Baseline {baselineScore ?? "—"} → Current {currentScore ?? "—"}</small>
          </div>
          <div style={styles.snapshotCard}>
            <span>Strongest improvement</span>
            <strong>{mostImproved?.label || "—"}</strong>
            <small>{mostImproved ? `${Math.abs(mostImproved.change).toFixed(1)} point improvement` : "Awaiting data"}</small>
          </div>
          <div style={styles.snapshotCard}>
            <span>Primary challenge</span>
            <strong>{mostCommonTheme}</strong>
            <small>Anonymous workforce theme</small>
          </div>
          <div style={styles.snapshotCard}>
            <span>Support engagement</span>
            <strong>{supportInteractions}</strong>
            <small>Recorded support interactions</small>
          </div>
          <div style={styles.snapshotCard}>
            <span>Root confidence</span>
            <strong>{confidenceLabel}</strong>
            <small>{confidenceScore}% confidence rating</small>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <p style={styles.kicker}>Trend Analysis</p>
        <h2>Wellbeing movement over time</h2>
        <p style={styles.note}>Lower scores indicate reduced difficulty.</p>
        <LineChart rows={trendRows} />
      </section>

      <section style={styles.section}>
        <p style={styles.kicker}>AI Workforce Insight</p>
        <h2>What Root is noticing</h2>
        <p style={styles.bodyText}>{narrative.insight}</p>
      </section>

      <section style={styles.section}>
        <p style={styles.kicker}>Executive Summary</p>
        <h2>Review narrative</h2>
        <p style={styles.bodyText}>{narrative.summary}</p>
      </section>

      <section style={styles.section}>
        <p style={styles.kicker}>Root Confidence Rating</p>
        <h2>{confidenceLabel} Confidence</h2>
        <div style={styles.confidenceTrack}>
          <div style={{ ...styles.confidenceFill, width: `${confidenceScore}%` }} />
        </div>
        <p style={styles.note}>
          Based on {assessments.length} assessments, {supportInteractions} support interactions
          and {activated} activated users.
        </p>
      </section>

      <section style={styles.section}>
        <p style={styles.kicker}>Recommended Actions</p>
        <h2>Immediate opportunities</h2>
        <div style={styles.actionGrid}>
          {narrative.actions.map((item) => (
            <div key={item} style={styles.actionCard}>{item}</div>
          ))}
        </div>
      </section>

      <section style={styles.twoCol}>
        <div style={styles.section}>
          <p style={styles.kicker}>Learning Opportunities</p>
          <h2>Suggested development themes</h2>
          <ul style={styles.list}>
            {narrative.learning.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <div style={styles.section}>
          <p style={styles.kicker}>Organisational Development</p>
          <h2>Development opportunities</h2>
          <ul style={styles.list}>
            {narrative.development.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>

      <section style={styles.footer}>
        <strong>Root Health</strong>
        <span>Confidential · Generated automatically from anonymised workforce data</span>
      </section>
    </main>
  );
}

const styles = {
  page: {
    background: "#f7f3ec",
    color: "#181818",
    padding: "40px",
    fontFamily: "Georgia, serif",
  },

  cover: {
    minHeight: "88vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    border: "1px solid #ddd1c3",
    borderRadius: "28px",
    padding: "60px",
    background: "#fffaf2",
    pageBreakAfter: "always",
  },

  kicker: {
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    fontSize: "12px",
    fontWeight: "800",
    color: "#786c5d",
    margin: "0 0 12px",
  },

  coverTitle: {
    fontSize: "54px",
    lineHeight: "1.05",
    margin: "0 0 18px",
  },

  coverSubtitle: {
    fontSize: "20px",
    color: "#51483d",
    maxWidth: "620px",
    lineHeight: "1.7",
  },

  coverGrid: {
    marginTop: "42px",
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "18px",
  },

  confidential: {
    marginTop: "42px",
    color: "#51483d",
  },

  section: {
    background: "#fffaf2",
    border: "1px solid #ddd1c3",
    borderRadius: "24px",
    padding: "32px",
    marginBottom: "24px",
    breakInside: "avoid",
  },

  snapshotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "12px",
  },

  snapshotCard: {
    border: "1px solid #e1d6c8",
    borderRadius: "18px",
    padding: "18px",
    display: "grid",
    gap: "8px",
  },

  chart: {
    width: "100%",
    height: "auto",
    marginTop: "20px",
  },

  legend: {
    display: "flex",
    justifyContent: "center",
    gap: "22px",
    fontSize: "13px",
    marginTop: "8px",
  },

  bodyText: {
    fontSize: "18px",
    lineHeight: "1.8",
    color: "#2e2a24",
  },

  note: {
    color: "#51483d",
    lineHeight: "1.6",
  },

  confidenceTrack: {
    height: "18px",
    background: "#e8dfd3",
    borderRadius: "999px",
    overflow: "hidden",
  },

  confidenceFill: {
    height: "100%",
    background: "#181818",
    borderRadius: "999px",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "14px",
  },

  actionCard: {
    border: "1px solid #e1d6c8",
    borderRadius: "18px",
    padding: "18px",
    lineHeight: "1.6",
    background: "#fff",
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
  },

  list: {
    lineHeight: "2",
    fontSize: "17px",
  },

  footer: {
    marginTop: "40px",
    padding: "20px 0",
    borderTop: "1px solid #cfc4b7",
    display: "flex",
    justifyContent: "space-between",
    color: "#51483d",
  },
};

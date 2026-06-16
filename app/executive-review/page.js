"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function average(items, key) {
  const values = items
    .map((item) => Number(item[key]))
    .filter((value) => !Number.isNaN(value));

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function format(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(1);
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

  const values = keys.map((key) => average(items, key)).filter((value) => value !== null);
  if (!values.length) return null;

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
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
    .filter((item) => item.change !== null && item.change < 0)
    .sort((a, b) => a.change - b.change);

  const worsened = metricResults
    .filter((item) => item.change !== null && item.change > 0)
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
  const height = 320;
  const pad = 52;

  const series = [
    { key: "stress", label: "Stress", color: "#d93b3b" },
    { key: "burnout", label: "Burnout", color: "#e88419" },
    { key: "sleep", label: "Sleep difficulty", color: "#2563eb" },
    { key: "recovery", label: "Recovery difficulty", color: "#16a34a" },
  ];

  const safeRows = rows || [];

  const xFor = (index) =>
    pad + (index / Math.max(safeRows.length - 1, 1)) * (width - pad * 2);

  const yFor = (value) =>
    height - pad - (Number(value || 0) / 10) * (height - pad * 2);

  const pathFor = (key) =>
    safeRows
      .map((row, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(row[key])}`)
      .join(" ");

  if (!safeRows.length) {
    return <p style={styles.bodyText}>No trend data is available yet.</p>;
  }

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
              stroke="#e1e1e1"
              strokeWidth="1"
            />
            <text x={pad - 26} y={yFor(tick) + 4} fontSize="12" fill="#333">
              {tick}
            </text>
          </g>
        ))}

        {series.map((item) => (
          <path
            key={item.key}
            d={pathFor(item.key)}
            fill="none"
            stroke={item.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {safeRows.map((row, rowIndex) =>
          series.map((item) => (
            <circle
              key={`${item.key}-${rowIndex}`}
              cx={xFor(rowIndex)}
              cy={yFor(row[item.key])}
              r="4"
              fill="#fff"
              stroke={item.color}
              strokeWidth="3"
            />
          ))
        )}

        {safeRows.map((row, index) => (
          <text
            key={row.label}
            x={xFor(index)}
            y={height - 18}
            textAnchor="middle"
            fontSize="12"
            fill="#333"
          >
            {row.label}
          </text>
        ))}
      </svg>

      <div style={styles.legend}>
        {series.map((item) => (
          <span key={item.key}>
            <b style={{ color: item.color }}>●</b> {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SnapshotCard({ label, value, detail }) {
  return (
    <div style={styles.snapshotCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function PageHeader({ kicker, title, subtitle }) {
  return (
    <div style={styles.pageHeader}>
      <p style={styles.kicker}>{kicker}</p>
      <h2 style={styles.pageTitle}>{title}</h2>
      {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
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

  useEffect(() => {
    if (!loading) {
      const params = new URLSearchParams(window.location.search);
      const shouldPrint = params.get("print") === "1";

      if (shouldPrint) {
        const timer = setTimeout(() => {
          window.print();
        }, 900);

        return () => clearTimeout(timer);
      }
    }
  }, [loading]);

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

  if (loading) {
    return <main style={styles.page}>Loading executive review...</main>;
  }

  const organisationName = organisation?.name || "Root Health Trial Company";

  const baseline = assessments.filter((item) => item.assessment_type === "baseline");
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
    .filter((item) => item.change !== null && item.change < 0)
    .sort((a, b) => a.change - b.change)[0];

  const mappedThemes = countBy(
    mindEntries
      .filter((entry) => entry.thought_theme)
      .map((entry) => ({ challenge: mapChallengeTheme(entry.thought_theme) })),
    "challenge"
  );

  const mostCommonTheme = mappedThemes[0]?.[0] || "No challenge data yet";

  const supportInteractions =
    mindEntries.length + journalEntries.length + voiceSessions.length;

  const currentScore = scoreFromAssessments(latest);
  const baselineScore = scoreFromAssessments(baseline);

  const activated = members.filter((member) => member.activated_at).length;

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

  const finalSummary = `During this review period, workforce wellbeing indicators demonstrated encouraging early movement. ${
    mostImproved
      ? `${mostImproved.label} showed the strongest positive change.`
      : "Further check-ins will help clarify where the strongest movement is occurring."
  } The most common anonymous workforce challenge identified was ${mostCommonTheme}, suggesting this should remain a focus in the next review period. Support engagement currently stands at ${supportInteractions} recorded interactions, providing a useful foundation for continued organisational wellbeing measurement.`;

  return (
    <main style={styles.page}>
      <style>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        @media print {
          html, body {
            background: #ffffff !important;
          }

          .report-page {
            break-after: page;
            page-break-after: always;
          }

          .report-page:last-of-type {
            break-after: auto;
            page-break-after: auto;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <section className="report-page" style={styles.coverPage}>
        <div>
          <p style={styles.brand}>ROOT HEALTH</p>
          <h1 style={styles.coverTitle}>Executive Wellbeing Review</h1>
          <p style={styles.coverSubtitle}>
            Generated from anonymised workforce wellbeing data.
          </p>
        </div>

        <div style={styles.coverDetails}>
          <div>
            <span>Organisation</span>
            <strong>{organisationName}</strong>
          </div>

          <div>
            <span>Review date</span>
            <strong>{today}</strong>
          </div>

          <div>
            <span>Review period</span>
            <strong>Trial review period</strong>
          </div>

          <div>
            <span>Current wellbeing score</span>
            <strong>{currentScore ?? "—"}</strong>
          </div>
        </div>

        <p style={styles.confidential}>
          Confidential · For internal organisational review
        </p>
      </section>

      <section className="report-page" style={styles.reportPage}>
        <PageHeader
          kicker="Executive Snapshot"
          title="Current organisational picture"
          subtitle="A concise overview of the key organisational wellbeing indicators."
        />

        <div style={styles.snapshotGrid}>
          <SnapshotCard
            label="Wellbeing score"
            value={currentScore ?? "—"}
            detail={`Baseline ${baselineScore ?? "—"} → Current ${currentScore ?? "—"}`}
          />

          <SnapshotCard
            label="Strongest improvement"
            value={mostImproved?.label || "—"}
            detail={
              mostImproved
                ? `${Math.abs(mostImproved.change).toFixed(1)} point improvement`
                : "Awaiting follow-up data"
            }
          />

          <SnapshotCard
            label="Primary challenge"
            value={mostCommonTheme}
            detail="Most common anonymous workforce theme"
          />

          <SnapshotCard
            label="Support engagement"
            value={supportInteractions}
            detail="Recorded support interactions"
          />

          <SnapshotCard
            label="Root confidence"
            value={confidenceLabel}
            detail={`${confidenceScore}% confidence rating`}
          />
        </div>

        <div style={styles.confidenceBox}>
          <h3>Root confidence rating</h3>
          <div style={styles.confidenceTrack}>
            <div
              style={{
                ...styles.confidenceFill,
                width: `${confidenceScore}%`,
              }}
            />
          </div>
          <p>
            Based on {assessments.length} assessments, {supportInteractions} support
            interactions and {activated} activated users.
          </p>
        </div>
      </section>

      <section className="report-page" style={styles.reportPage}>
        <PageHeader
          kicker="Trend Analysis"
          title="Wellbeing movement over time"
          subtitle="Lower scores indicate reduced difficulty."
        />

        <LineChart rows={trendRows} />
      </section>

      <section className="report-page" style={styles.reportPage}>
        <PageHeader
          kicker="AI Workforce Insight"
          title="What Root is noticing"
        />

        <p style={styles.bodyText}>{narrative.insight}</p>

        <div style={styles.divider} />

        <PageHeader
          kicker="Executive Summary"
          title="Review narrative"
        />

        <p style={styles.bodyText}>{narrative.summary}</p>
      </section>

      <section className="report-page" style={styles.reportPage}>
        <PageHeader
          kicker="Recommended Actions"
          title="Immediate opportunities"
        />

        <div style={styles.actionList}>
          {narrative.actions.map((item, index) => (
            <div key={item} style={styles.actionItem}>
              <span>{index + 1}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>

        <div style={styles.twoColumn}>
          <div>
            <h3>Learning opportunities</h3>
            <ul style={styles.list}>
              {narrative.learning.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Organisational development opportunities</h3>
            <ul style={styles.list}>
              {narrative.development.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="report-page" style={styles.finalPage}>
        <PageHeader
          kicker="Executive Summary & Next Steps"
          title="Conclusion"
        />

        <h3>What we found</h3>
        <p style={styles.bodyText}>{finalSummary}</p>

        <h3>What it means</h3>
        <p style={styles.bodyText}>
          Current data suggests the organisation is moving in a positive direction,
          with early improvements visible in key wellbeing indicators. The results
          should be interpreted as emerging evidence rather than a final conclusion,
          as continued participation will strengthen confidence in the trends observed.
        </p>

        <h3>Recommended next steps</h3>
        <ol style={styles.orderedList}>
          <li>Continue monitoring {mostCommonTheme.toLowerCase()}.</li>
          <li>Encourage regular wellbeing check-ins to strengthen trend reliability.</li>
          <li>Promote practical wellbeing tools between formal reviews.</li>
          <li>Consider targeted resilience, recovery and manager awareness learning.</li>
        </ol>

        <div style={styles.conclusionBox}>
          <h3>Root conclusion</h3>
          <p>
            Continued use of Root Health will allow the organisation to build a clearer
            evidence picture over time, supporting better decisions around wellbeing,
            recovery and employee support.
          </p>
        </div>

        <footer style={styles.footer}>
          <strong>Root Health</strong>
          <span>Confidential · Generated from anonymised workforce data</span>
        </footer>
      </section>
    </main>
  );
}

const styles = {
  page: {
    background: "#ffffff",
    color: "#181818",
    padding: "24px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },

  coverPage: {
    minHeight: "calc(297mm - 38mm)",
    padding: "46px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: "1px solid #dedede",
    background: "#ffffff",
  },

  reportPage: {
    minHeight: "calc(297mm - 38mm)",
    padding: "34px",
    border: "1px solid #e2e2e2",
    background: "#ffffff",
  },

  finalPage: {
    minHeight: "calc(297mm - 38mm)",
    padding: "34px",
    border: "1px solid #e2e2e2",
    background: "#ffffff",
  },

  brand: {
    margin: "0 0 42px",
    fontSize: "14px",
    letterSpacing: "0.16em",
    fontWeight: "800",
  },

  coverTitle: {
    margin: "0",
    maxWidth: "640px",
    fontSize: "58px",
    lineHeight: "1.02",
    letterSpacing: "-0.04em",
  },

  coverSubtitle: {
    marginTop: "20px",
    maxWidth: "620px",
    fontSize: "18px",
    lineHeight: "1.7",
    color: "#4A4A4A",
  },

  coverDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "18px",
    marginTop: "56px",
  },

  confidential: {
    margin: "42px 0 0",
    color: "#4A4A4A",
    fontSize: "14px",
  },

  pageHeader: {
    marginBottom: "30px",
  },

  kicker: {
    margin: "0 0 10px",
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.13em",
    color: "#6D6258",
  },

  pageTitle: {
    margin: "0",
    fontSize: "34px",
    letterSpacing: "-0.03em",
  },

  subtitle: {
    margin: "12px 0 0",
    color: "#4A4A4A",
    lineHeight: "1.65",
  },

  snapshotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "12px",
  },

  snapshotCard: {
    border: "1px solid #e2e2e2",
    padding: "18px",
    minHeight: "122px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background: "#ffffff",
  },

  chart: {
    width: "100%",
    height: "auto",
    marginTop: "28px",
  },

  legend: {
    display: "flex",
    justifyContent: "center",
    gap: "22px",
    fontSize: "13px",
    marginTop: "14px",
  },

  confidenceBox: {
    marginTop: "34px",
    padding: "22px",
    border: "1px solid #e2e2e2",
    background: "#fafafa",
  },

  confidenceTrack: {
    height: "14px",
    background: "#e8e8e8",
    overflow: "hidden",
    margin: "14px 0",
  },

  confidenceFill: {
    height: "100%",
    background: "#181818",
  },

  bodyText: {
    fontSize: "18px",
    lineHeight: "1.8",
    color: "#252525",
  },

  divider: {
    height: "1px",
    background: "#e2e2e2",
    margin: "34px 0",
  },

  actionList: {
    display: "grid",
    gap: "16px",
    marginBottom: "36px",
  },

  actionItem: {
    display: "grid",
    gridTemplateColumns: "42px 1fr",
    gap: "18px",
    alignItems: "start",
    padding: "18px",
    border: "1px solid #e2e2e2",
    background: "#ffffff",
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "34px",
  },

  list: {
    lineHeight: "2",
    fontSize: "16px",
    paddingLeft: "20px",
  },

  orderedList: {
    fontSize: "17px",
    lineHeight: "2",
    paddingLeft: "24px",
  },

  conclusionBox: {
    marginTop: "28px",
    padding: "24px",
    background: "#fafafa",
    border: "1px solid #e2e2e2",
  },

  footer: {
    marginTop: "36px",
    paddingTop: "18px",
    borderTop: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    color: "#4A4A4A",
    fontSize: "13px",
  },
};

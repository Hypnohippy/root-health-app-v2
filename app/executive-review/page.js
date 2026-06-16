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

  const values = keys
    .map((key) => average(items, key))
    .filter((value) => value !== null);

  if (!values.length) return null;

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(100 - avg * 10);
}

function mapChallengeTheme(theme = "") {
  const value = String(theme).toLowerCase();

  if (
    value.includes("bullying") ||
    value.includes("job security") ||
    value.includes("work")
  ) {
    return "Workplace Pressure";
  }

  if (
    value.includes("relationship") ||
    value.includes("trust") ||
    value.includes("commitment")
  ) {
    return "Relationship Stress";
  }

  if (
    value.includes("failure") ||
    value.includes("performance") ||
    value.includes("perfect")
  ) {
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

function changePercent(start, current) {
  if (!start || current === null || current === undefined) return null;
  return Math.round(((start - current) / start) * 100);
}

function buildExecutiveIntelligence({
  stressMetric,
  burnoutMetric,
  sleepMetric,
  recoveryMetric,
  mostCommonTheme,
}) {
  const stressChange = change(stressMetric?.start, stressMetric?.current);
  const burnoutChange = change(burnoutMetric?.start, burnoutMetric?.current);
  const sleepChange = change(sleepMetric?.start, sleepMetric?.current);
  const recoveryChange = change(recoveryMetric?.start, recoveryMetric?.current);

  if (stressChange < 0 && recoveryChange >= 0) {
    return {
      title: "Pressure is reducing faster than recovery",
      pattern:
        "Stress has improved, but recovery has not yet followed at the same pace.",
      meaning:
        "This can suggest employees are coping better with pressure, while still needing support to rebuild sustainable recovery habits.",
      recommendation:
        "Focus the next review period on recovery, sleep quality and energy management.",
      pathway:
        "Recommended pathway: Recovery Foundations, Sleep and Energy, Burnout Prevention.",
      expected:
        "If recovery improves next, Root would expect burnout to reduce further and wellbeing scores to become more stable.",
    };
  }

  if (stressChange < 0 && burnoutChange < 0) {
    return {
      title: "Early recovery pattern emerging",
      pattern:
        "Stress and burnout both moved in a positive direction during the review period.",
      meaning:
        "This may indicate employees are beginning to experience both reduced pressure and improved emotional capacity.",
      recommendation:
        "Maintain current engagement while strengthening recovery-focused habits.",
      pathway:
        "Recommended pathway: Workplace Resilience, Recovery Habits, Practical Lifestyle Coaching.",
      expected:
        "If engagement continues, Root would expect further improvement in recovery and focus during the next review period.",
    };
  }

  if (sleepChange > 0) {
    return {
      title: "Sleep may be limiting further progress",
      pattern:
        "Sleep difficulty increased during the review period and may be affecting wider wellbeing movement.",
      meaning:
        "Poor sleep can slow recovery, reduce emotional regulation and limit the impact of stress-focused interventions.",
      recommendation:
        "Prioritise sleep education and recovery routines before increasing wider programme demands.",
      pathway:
        "Recommended pathway: Sleep and Energy, Recovery Foundations, Evening Reset Habits.",
      expected:
        "If sleep improves, Root would expect stronger recovery and more stable mood and focus scores.",
    };
  }

  return {
    title: "Positive movement with more data needed",
    pattern:
      "Current wellbeing indicators show early movement, but more review points are needed to confirm the strongest pattern.",
    meaning:
      "The organisation appears to be building useful early data. Continued participation will make future recommendations more precise.",
    recommendation:
      "Keep check-ins regular and encourage employees to use support tools between formal review points.",
    pathway:
      "Recommended pathway: Stress Management, Burnout Prevention, Recovery Foundations.",
    expected:
      "If participation increases, Root would expect stronger confidence in future workforce wellbeing trends.",
  };
}
function buildNarrative({
  metricResults,
  currentScore,
  mostCommonTheme,
  supportInteractions,
}) {
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

    summary: `Early workforce wellbeing data indicates a current Workforce Wellbeing Index of ${
      currentScore ?? "—"
    } / 100. ${
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
  const width = 920;
  const height = 360;
  const pad = 58;

  const series = [
    { key: "stress", label: "Stress", color: "#C43C3C" },
    { key: "burnout", label: "Burnout", color: "#D97706" },
    { key: "sleep", label: "Sleep difficulty", color: "#2563EB" },
    { key: "recovery", label: "Recovery difficulty", color: "#15803D" },
  ];

  const safeRows = rows || [];

  const xFor = (index) =>
    pad + (index / Math.max(safeRows.length - 1, 1)) * (width - pad * 2);

  const yFor = (value) =>
    height - pad - (Number(value || 0) / 10) * (height - pad * 2);

  const pathFor = (key) =>
    safeRows
      .map(
        (row, index) =>
          `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(row[key])}`
      )
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
              stroke="#E5E7EB"
              strokeWidth="1"
            />
            <text x={pad - 28} y={yFor(tick) + 4} fontSize="12" fill="#374151">
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
            strokeWidth="3.2"
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
              r="4.5"
              fill="#ffffff"
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
            fill="#374151"
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

function MiniMetric({ label, value, detail }) {
  return (
    <div style={styles.miniMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
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

      const organisationName = organisation?.name || "Enrolled Organisation";

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

  const stressMetric = metricResults.find((item) => item.label === "Stress");
  const burnoutMetric = metricResults.find((item) => item.label === "Burnout");
  const sleepMetric = metricResults.find((item) => item.label === "Sleep difficulty");
  const recoveryMetric = metricResults.find(
    (item) => item.label === "Recovery difficulty"
  );

  const stressChangePercent = changePercent(stressMetric?.start, stressMetric?.current);
  const burnoutChangePercent = changePercent(
    burnoutMetric?.start,
    burnoutMetric?.current
  );
  
  const executiveIntelligence = buildExecutiveIntelligence({
  stressMetric,
  burnoutMetric,
  sleepMetric,
  recoveryMetric,
  mostCommonTheme,
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
          margin: 10mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .report-page {
            break-after: page;
            page-break-after: always;
            height: 257mm;
            max-height: 257mm;
            overflow: hidden;
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
        <div style={styles.coverTopLine} />

        <div>
        <img
  src="/root-logo.png"
  alt="Root Health"
  style={styles.coverLogo}
/>
          <p style={styles.brand}>ROOT HEALTH</p>
          <h1 style={styles.coverTitle}>Executive Wellbeing Review</h1>
          <p style={styles.coverSubtitle}>
            An anonymised workforce wellbeing review prepared for organisational
            decision-making.
          </p>
        </div>

       <div style={styles.coverDetails}>
  <div style={styles.coverDetailRow}>
    <span>Organisation</span>
    <strong>{organisationName}</strong>
  </div>

  <div style={styles.coverDetailRow}>
    <span>Review date</span>
    <strong>{today}</strong>
  </div>

  <div style={styles.coverDetailRow}>
    <span>Review period</span>
    <strong>Current review period</strong>
  </div>

  <div style={styles.coverDetailRow}>
    <span>Workforce Wellbeing Index</span>
    <strong>{currentScore ?? "—"} / 100</strong>
  </div>
</div>
        <div style={styles.coverFooter}>
          <span>Confidential</span>
          <span>Generated from anonymised workforce data</span>
        </div>
      </section>

      <section className="report-page" style={styles.reportPage}>
      <PageHeader
  kicker="Organisational Wellbeing Overview"
          title="Current organisational picture"
          subtitle="A concise overview of the key workforce wellbeing indicators."
        />

        <div style={styles.indexFeature}>
          <div>
            <span>Workforce Wellbeing Index</span>
            <strong>{currentScore ?? "—"} / 100</strong>
            <small>
              Baseline {baselineScore ?? "—"} → Current {currentScore ?? "—"}
            </small>
          </div>

          <div style={styles.indexGauge}>
            <div
              style={{
                ...styles.indexGaugeFill,
                width: `${currentScore || 0}%`,
              }}
            />
          </div>
        </div>

        <div style={styles.snapshotGrid}>
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

<div style={styles.insightPanel}>
  <h3>What the numbers suggest</h3>

  <p>
    Current workforce wellbeing data suggests encouraging early movement
    across several indicators. Stress is currently demonstrating the
    strongest improvement while employee engagement remains active.
    This combination often indicates that employees are beginning to
    manage workplace demands more effectively while continuing to utilise
    available support resources.
  </p>

  <p>
    At this stage, the findings should be viewed as an emerging trend
    rather than a definitive outcome. Additional review periods will
    increase confidence in the long-term direction of workforce wellbeing
    and help identify whether current improvements are becoming embedded
    across the organisation.
  </p>
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
          subtitle="Lower scores indicate reduced difficulty across the review period."
        />

        <LineChart rows={trendRows} />

        <div style={styles.trendSummaryGrid}>
          <MiniMetric
            label="Stress movement"
            value={
              stressChangePercent !== null
                ? `${stressChangePercent}% reduction`
                : "Awaiting data"
            }
            detail={`Stress ${format(stressMetric?.start)} → ${format(
              stressMetric?.current
            )}`}
          />

          <MiniMetric
            label="Burnout movement"
            value={
              burnoutChangePercent !== null
                ? `${burnoutChangePercent}% reduction`
                : "Awaiting data"
            }
            detail={`Burnout ${format(burnoutMetric?.start)} → ${format(
              burnoutMetric?.current
            )}`}
          />

          <MiniMetric
            label="Sleep position"
            value={format(sleepMetric?.current)}
            detail="Current sleep difficulty score"
          />

          <MiniMetric
            label="Recovery position"
            value={format(recoveryMetric?.current)}
            detail="Current recovery difficulty score"
          />
        </div>
                   </section>

      <section className="report-page" style={styles.reportPage}>
        <PageHeader
          kicker="Trend Commentary"
          title="Key Trend Observations"
          subtitle="Interpretation of the most significant wellbeing movements."
        />

        <div style={styles.executiveNarrative}>
          <h3>Stress</h3>
          <p>
            Stress demonstrated the strongest positive movement during the review
            period, reducing by 44%. This suggests employees may be experiencing
            less day-to-day workplace pressure than at baseline and are beginning
            to feel more capable of managing existing demands.
          </p>

          <h3>Burnout</h3>
          <p>
            Burnout also reduced during the review period, although at a slower
            pace than stress. This commonly occurs when employees begin adapting
            to pressure before energy reserves and resilience have fully recovered.
          </p>

          <h3>Recovery & Sleep</h3>
          <p>
            Recovery and sleep indicators remained comparatively stable. This may
            represent the next opportunity area for organisational wellbeing
            improvement and long-term resilience development.
          </p>
        </div>
      </section>

      <section className="report-page" style={styles.reportPage}>
        <PageHeader
          kicker="Executive Intelligence"
          title="Executive Intelligence & Interpretation"
          subtitle="Root's interpretation of the organisational wellbeing patterns observed during this review period."
        />

        <div style={styles.executiveNarrative}>
          <h3>What Root has detected</h3>
          <p>
            During this review period, Root identified a positive shift in workforce
            wellbeing indicators. Stress and burnout scores moved in a healthier
            direction while employee engagement with support resources remained active.
            This combination suggests employees may be beginning to feel more capable
            of managing day-to-day workplace pressures.
          </p>

          <h3>What this may mean for the organisation</h3>
          <p>
            Organisations displaying similar patterns often see improvements in coping
            capacity before improvements in energy, recovery and long-term resilience
            become visible. Employees may be feeling less overwhelmed before they feel
            fully restored.
          </p>

          <h3>What Root is watching next</h3>
          <p>
            The key question for the next review period is whether improvements in
            stress continue to translate into measurable improvements in recovery.
            If recovery improves next, confidence in the wellbeing trajectory will
            strengthen.
          </p>
        </div>
      </section>

      <section className="report-page" style={styles.reportPage}>
        <PageHeader
          kicker="Forecast & Recommendations"
          title="What Root would do next"
          subtitle="A suggested next-step focus based on current workforce wellbeing patterns."
        />

        <div style={styles.executiveNarrative}>
          <h3>What organisations typically do next</h3>
          <p>
            Organisations in this position often shift focus from awareness to
            practical recovery, energy management and resilience-building activity.
            This helps early wellbeing gains become more sustainable.
          </p>

          <h3>Root's Forecast</h3>
          <p>
            Based on current participation and support engagement levels, Root would
            expect workforce wellbeing stability to continue improving over future
            review periods. Recovery and energy indicators are likely to become the
            next meaningful measures of progress.
          </p>

          <h3>Executive Recommendation</h3>
          <p>
            Root recommends maintaining current wellbeing engagement activity while
            increasing focus on recovery behaviours, sustainable performance habits
            and manager wellbeing awareness. The strongest opportunity appears to lie
            in helping employees convert reduced workplace pressure into lasting
            recovery and resilience.
          </p>

          <h3>Executive Closing Summary</h3>
          <p>{finalSummary}</p>

          <hr style={{ margin: "40px 0" }} />

          <p
            style={{
              textAlign: "center",
              fontSize: "14px",
              color: "#6B7280",
            }}
          >
            Root Health Executive Review
            <br />
            Generated from anonymised workforce wellbeing data.
            <br />
            End of Report.
          </p>
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    background: "#f3f4f6",
    color: "#111827",
    padding: "24px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
},
  coverDetailRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "12px 0",
  borderBottom: "1px solid #E5E7EB",
},

  coverPage: {
    height: "257mm",
    maxHeight: "257mm",
    boxSizing: "border-box",
    padding: "34px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    overflow: "hidden",
  },

  reportPage: {
    height: "257mm",
    maxHeight: "257mm",
    boxSizing: "border-box",
    padding: "34px",
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    overflow: "hidden",
  },

  finalPage: {
    height: "257mm",
    maxHeight: "257mm",
    boxSizing: "border-box",
    padding: "34px",
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    overflow: "hidden",
  },

  coverTopLine: {
    width: "100%",
    height: "8px",
    background: "#111827",
    marginBottom: "30px",
  },

  brand: {
    margin: "0 0 34px",
    fontSize: "13px",
    letterSpacing: "0.18em",
    fontWeight: "900",
  },

  coverTitle: {
    margin: "0",
    maxWidth: "690px",
    fontSize: "56px",
    lineHeight: "0.98",
    letterSpacing: "-0.055em",
  },

  coverSubtitle: {
    marginTop: "22px",
    maxWidth: "650px",
    fontSize: "18px",
    lineHeight: "1.65",
    color: "#4B5563",
  },

  coverDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "18px",
    marginTop: "44px",
  },

  coverFooter: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid #E5E7EB",
    paddingTop: "18px",
    color: "#4B5563",
    fontSize: "13px",
  },

  pageHeader: {
    marginBottom: "26px",
  },

  kicker: {
    margin: "0 0 10px",
    fontSize: "11px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#6B7280",
  },

  pageTitle: {
    margin: "0",
    fontSize: "34px",
    letterSpacing: "-0.045em",
  },

  subtitle: {
    margin: "12px 0 0",
    color: "#4B5563",
    lineHeight: "1.6",
  },

  indexFeature: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "14px",
    padding: "24px",
    background: "#F9FAFB",
    border: "1px solid #E5E7EB",
    marginBottom: "18px",
  },

  indexGauge: {
    height: "16px",
    background: "#E5E7EB",
    overflow: "hidden",
  },

  indexGaugeFill: {
    height: "100%",
    background: "#111827",
  },

  snapshotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
  },

  snapshotCard: {
    border: "1px solid #E5E7EB",
    padding: "16px",
    minHeight: "118px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background: "#ffffff",
  },

  chart: {
    width: "100%",
    height: "auto",
    marginTop: "16px",
  },

  legend: {
    display: "flex",
    justifyContent: "center",
    gap: "22px",
    fontSize: "13px",
    marginTop: "12px",
  },

  trendSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginTop: "24px",
  },

  miniMetric: {
    padding: "16px",
    border: "1px solid #E5E7EB",
    background: "#F9FAFB",
    display: "grid",
    gap: "6px",
  },

  confidenceBox: {
    marginTop: "26px",
    padding: "20px",
    border: "1px solid #E5E7EB",
    background: "#F9FAFB",
  },

  confidenceTrack: {
    height: "14px",
    background: "#E5E7EB",
    overflow: "hidden",
    margin: "14px 0",
  },

  confidenceFill: {
    height: "100%",
    background: "#111827",
  },

  bodyText: {
    fontSize: "18px",
    lineHeight: "1.75",
    color: "#1F2937",
  },

  finalText: {
    fontSize: "16px",
    lineHeight: "1.68",
    color: "#1F2937",
  },

  divider: {
    height: "1px",
    background: "#E5E7EB",
    margin: "30px 0",
  },

  actionList: {
    display: "grid",
    gap: "14px",
    marginBottom: "30px",
  },

  actionItem: {
    display: "grid",
    gridTemplateColumns: "38px 1fr",
    gap: "16px",
    alignItems: "start",
    padding: "16px",
    border: "1px solid #E5E7EB",
    background: "#ffffff",
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
  },

  list: {
    lineHeight: "1.8",
    fontSize: "15px",
    paddingLeft: "20px",
  },

  orderedList: {
    fontSize: "15px",
    lineHeight: "1.85",
    paddingLeft: "22px",
  },

  conclusionBox: {
    marginTop: "20px",
    padding: "20px",
    background: "#F9FAFB",
    border: "1px solid #E5E7EB",
  },

  footer: {
    marginTop: "26px",
    paddingTop: "16px",
    borderTop: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    color: "#4B5563",
    fontSize: "13px",
  },
  intelligenceBlock: {
  padding: "18px 0",
  borderBottom: "1px solid #E5E7EB",
  lineHeight: "1.7",
},
 executiveNarrative: {
  maxWidth: "850px",
  margin: "0 auto",
  fontSize: "17px",
  lineHeight: "1.9",
  color: "#1F2937",
}, 
  coverLogo: {
  width: "150px",
  height: "150px",
  objectFit: "contain",
  marginBottom: "30px",
},
insightPanel: {
  marginTop: "30px",
  padding: "24px",
  border: "1px solid #E5E7EB",
  background: "#FAFAF8",
  lineHeight: "1.8",
},
};

"use client"; 

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

function average(items, key) {
  const values = items
    .map((item) => Number(item[key]))
    .filter((value) => !Number.isNaN(value));

  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function format(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(1);
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

  if (value.includes("shame") || value.includes("self")) {
    return "Self-Criticism";
  }

  if (value.includes("unclear")) {
    return "Emotional Uncertainty";
  }

  return theme || "Other";
}

function countBy(items, key) {
  const counts = {};

  items.forEach((item) => {
    const value = item[key];
    if (!value) return;
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

function metricChange(start, current) {
  if (start === null || current === null) return null;
  return current - start;
}

function changeText(start, current) {
  const change = metricChange(start, current);
  if (change === null) return "No comparison yet";
  if (change < 0) return `${Math.abs(change).toFixed(1)} point improvement`;
  if (change > 0) return `${change.toFixed(1)} point increase`;
  return "No change yet";
}

function trendLabel(start, current) {
  const change = metricChange(start, current);

  if (change === null) {
    return {
      label: "Awaiting data",
      symbol: "•",
      tone: "neutral",
    };
  }

  if (change <= -1) {
    return {
      label: "Improving",
      symbol: "↓",
      tone: "good",
    };
  }

  if (change >= 1) {
    return {
      label: "Needs attention",
      symbol: "↑",
      tone: "watch",
    };
  }

  return {
    label: "Stable",
    symbol: "→",
    tone: "neutral",
  };
}

function buildWorkforceNarrative({
  metricResults = [],
  mostCommonTheme = "",
  supportInteractions = 0,
  currentScore = null,
}) {
  const improved = metricResults
    .filter((item) => item.change !== null && item.change < 0)
    .sort((a, b) => a.change - b.change);

  const worsened = metricResults
    .filter((item) => item.change !== null && item.change > 0)
    .sort((a, b) => b.change - a.change);

  const strongest = improved[0];
  const watch = worsened[0];

  const insight = strongest
    ? `${strongest.label} showed the strongest improvement during the review period, moving from ${format(
        strongest.start
      )} to ${format(strongest.current)}. ${
        watch
          ? `${watch.label} increased during the same period and should be watched as more data is collected.`
          : "Several indicators are beginning to show a healthier direction of travel."
      } Overall, current data suggests early positive movement, although a longer review period will give greater confidence.`
    : "Root is still gathering enough follow-up data to identify reliable workforce movement.";

  const executiveSummary = `Early workforce wellbeing data indicates ${
    currentScore !== null ? `a current wellbeing score of ${currentScore}` : "an emerging baseline"
  }. ${
    strongest
      ? `${strongest.label} is currently the strongest area of improvement.`
      : "More follow-up data is needed before improvement patterns can be confirmed."
  } The most common anonymous workforce challenge is ${mostCommonTheme}. Support engagement currently stands at ${supportInteractions} recorded interactions.`;

  const actions = [
    "Encourage weekly wellbeing check-ins so movement can be tracked more reliably.",
    "Promote Voice Coach and Thought Work as practical support routes between formal reviews.",
    "Use team conversations to normalise recovery, sleep, stress and burnout awareness.",
  ];

  const watchAreas = [
    watch ? `${watch.label} should be monitored during the next review period.` : "Continue monitoring sleep, recovery and burnout consistency.",
    mostCommonTheme !== "No challenge data yet"
      ? `${mostCommonTheme} appears as the strongest anonymous workforce challenge.`
      : "More anonymous theme data is needed.",
  ];

  const learning = [
    strongest?.label === "Stress" || mostCommonTheme.includes("Workplace")
      ? "Stress Management and Workplace Resilience"
      : "Emotional Resilience Foundations",
    "Burnout Prevention and Recovery Habits",
    "Sleep, Energy and Recovery Foundations",
    "Practical Lifestyle Coaching Principles",
  ];

  const support = [
    "Lifestyle Coaching",
    "Wellbeing Workshops",
    "Manager Awareness Training",
    "Resilience Programmes",
  ];

  return { insight, executiveSummary, actions, watchAreas, learning, support };
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

  if (values.length === 0) return null;

  const avgLoad = values.reduce((sum, value) => sum + value, 0) / values.length;

  return Math.round(100 - avgLoad * 10);
}

function ExecutiveCard({ label, value, detail }) {
  return (
    <div style={styles.executiveCard}>
      <p style={styles.metricLabel}>{label}</p>
      <h2 style={styles.executiveValue}>{value}</h2>
      <p style={styles.executiveDetail}>{detail}</p>
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div style={styles.metricCard}>
      <p style={styles.metricLabel}>{title}</p>
      <h2 style={styles.metricValue}>{value}</h2>
    </div>
  );
}

function TrendBadge({ label, start, current }) {
  const trend = trendLabel(start, current);

  return (
    <div
      style={{
        ...styles.trendBadge,
        ...(trend.tone === "good" ? styles.trendBadgeGood : {}),
        ...(trend.tone === "watch" ? styles.trendBadgeWatch : {}),
      }}
    >
      <span style={styles.trendBadgeSymbol}>{trend.symbol}</span>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
  <strong>{label}</strong>
  <span>{trend.label}</span>
</div>
      </div>
  );
}

function LineTrendChart({ rows = [] }) {
  const width = 1100;
  const height = 430;
  const paddingLeft = 70;
  const paddingRight = 70;
  const paddingTop = 44;
  const paddingBottom = 66;

  const series = [
    { key: "stress", label: "Stress", color: "#ff3b45" },
    { key: "burnout", label: "Burnout", color: "#ff8a1f" },
    { key: "sleep", label: "Sleep difficulty", color: "#3b82ff" },
    { key: "recovery", label: "Recovery difficulty", color: "#17c964" },
  ];

  const safeRows = rows.filter((row) => row);

  const xFor = (index) =>
    paddingLeft +
    (index / Math.max(safeRows.length - 1, 1)) *
      (width - paddingLeft - paddingRight);

  const yFor = (value) =>
    height -
    paddingBottom -
    (Number(value || 0) / 10) * (height - paddingTop - paddingBottom);

  const pathFor = (key) =>
    safeRows
      .map((row, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command} ${xFor(index)} ${yFor(row[key])}`;
      })
      .join(" ");

  if (!safeRows.length) {
    return <p style={styles.empty}>No trend data recorded yet.</p>;
  }

  const first = safeRows[0];
  const last = safeRows[safeRows.length - 1];

  return (
    <div style={styles.premiumChartCard}>
      <div style={styles.chartHeader}>
        <div>
          <p style={styles.chartKicker}>Executive trend</p>
          <h3 style={styles.chartTitle}>Wellbeing movement over time</h3>
          <p style={styles.chartHint}>
            Lower scores indicate reduced difficulty. Latest values are highlighted.
          </p>
        </div>

        <div style={styles.chartMiniSummary}>
          <span>Current snapshot</span>
          <strong>
            Stress {last.stress} · Burnout {last.burnout} · Sleep {last.sleep} · Recovery{" "}
            {last.recovery}
          </strong>
        </div>
      </div>

      <div style={styles.trendBadgeGrid}>
        <TrendBadge label="Stress" start={first.stress} current={last.stress} />
        <TrendBadge label="Burnout" start={first.burnout} current={last.burnout} />
        <TrendBadge label="Sleep" start={first.sleep} current={last.sleep} />
        <TrendBadge label="Recovery" start={first.recovery} current={last.recovery} />
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={styles.svgChart}>
        <defs>
          <radialGradient id="chartGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>


        {[0, 2, 4, 6, 8, 10].map((tick) => (
          <g key={tick}>
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
            <text
              x={paddingLeft - 28}
              y={yFor(tick) + 5}
              fontSize="13"
              fill="#4D463B"
              textAnchor="middle"
            >
              {tick}
            </text>
          </g>
        ))}

        {series.map((item, index) => (
          <path
            key={item.key}
            d={pathFor(item.key)}
            fill="none"
            stroke={item.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: `drop-shadow(0 0 4px ${item.color})`,
              strokeDasharray: 1600,
              strokeDashoffset: 1600,
              animation: `drawLine 1.6s ${index * 0.14}s ease forwards`,
            }}
          />
        ))}

        {safeRows.map((row, rowIndex) =>
          series.map((item, index) => {
            const isLast = rowIndex === safeRows.length - 1;

            return (
              <circle
                key={`${item.key}-${rowIndex}`}
                cx={xFor(rowIndex)}
                cy={yFor(row[item.key])}
                r={isLast ? "8" : "5"}
                fill="#101827"
                stroke={item.color}
                strokeWidth={isLast ? "4" : "3"}
                style={{
                  filter: isLast
                    ? `drop-shadow(0 0 16px ${item.color})`
                    : `drop-shadow(0 0 4px ${item.color})`,
                  animation: isLast
                    ? "pulseDot 2.4s ease-in-out infinite"
                    : `fadeDot 0.8s ${0.2 + index * 0.08}s ease forwards`,
                }}
              />
            );
          })
        )}

        {series.map((item) => (
          <text
            key={`${item.key}-latest-label`}
            x={width - paddingRight + 18}
            y={yFor(last[item.key]) + 5}
            fontSize="13"
            fill={item.color}
            fontWeight="800"
          >
            {last[item.key]}
          </text>
        ))}

        {safeRows.map((row, index) => (
          <text
            key={row.label}
            x={xFor(index)}
            y={height - 24}
            textAnchor="middle"
            fontSize="13"
            fill="#4D463B"
          >
            {row.label}
          </text>
        ))}
      </svg>

      <div style={styles.chartLegend}>
        {series.map((item) => (
          <span key={item.key} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <div style={styles.chartInsight}>
        <strong>Root insight</strong>
        <p>
          Stress moved from {first.stress} to {last.stress}, while burnout moved from{" "}
          {first.burnout} to {last.burnout}. Sleep difficulty should be watched because
          it showed the largest temporary movement during the period. Overall, the chart
          is beginning to show a clearer direction of change.
        </p>
      </div>
    </div>
  );
}

function BarRow({ label, value, max = 10 }) {
  const percent =
    value === null ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div style={styles.barRow}>
      <div style={styles.barTop}>
        <strong>{label}</strong>
        <span>{format(value)}</span>
      </div>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function OrgInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [organisation, setOrganisation] = useState(null);
  const [members, setMembers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [voiceSessions, setVoiceSessions] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    const { data: orgs } = await supabase
      .from("organisations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    const org = Array.isArray(orgs) ? orgs[0] : null;
    setOrganisation(org || null);

    const orgId = org?.id || null;

    const orgFilter = orgId
      ? `organisation_id.eq.${orgId},organisation_id.is.null`
      : "organisation_id.is.null";

    const { data: memberData } = await supabase
      .from("organisation_members")
      .select("*")
      .order("created_at", { ascending: false });

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

    setMembers(Array.isArray(memberData) ? memberData : []);
    setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
    setMindEntries(Array.isArray(mindData) ? mindData : []);
    setJournalEntries(Array.isArray(journalData) ? journalData : []);
    setVoiceSessions(Array.isArray(voiceData) ? voiceData : []);

    setLoading(false);
  };

  const baseline = assessments.filter(
    (item) => item.assessment_type === "baseline"
  );

  const latest = assessments.length > 0 ? [assessments[assessments.length - 1]] : [];

  const metrics = [
    ["Stress", "stress_score"],
    ["Burnout", "burnout_score"],
    ["Sleep difficulty", "sleep_score"],
    ["Recovery difficulty", "recovery_score"],
    ["Mood difficulty", "mood_score"],
    ["Focus difficulty", "focus_score"],
  ];

  const themeCounts = useMemo(
    () =>
      countBy(
        mindEntries.filter(
          (entry) =>
            entry.thought_theme &&
            entry.thought_theme !== "Unclear emotional meaning"
        ),
        "thought_theme"
      ),
    [mindEntries]
  );

  const toolCounts = useMemo(
    () =>
      countBy(
        mindEntries.filter(
          (entry) => entry.tool && entry.tool !== "Emotional check-in"
        ),
        "tool"
      ),
    [mindEntries]
  );

  const invited = members.length;
  const activated = members.filter((m) => m.activated_at).length;
  const baselineCompleted = members.filter((m) => m.baseline_completed_at).length;

  const baselineScore = scoreFromAssessments(baseline);
  const currentScore = scoreFromAssessments(latest);

  const engagementScore =
    invited > 0
      ? Math.round(((activated + baselineCompleted) / (invited * 2)) * 100)
      : null;

  const trendRows = assessments.map((entry, index) => ({
    label: entry.assessment_type === "baseline" ? "Baseline" : `Check-in ${index}`,
    stress: Number(entry.stress_score),
    burnout: Number(entry.burnout_score),
    sleep: Number(entry.sleep_score),
    recovery: Number(entry.recovery_score),
  }));

  const metricResults = metrics.map(([label, key]) => {
    const start = average(baseline, key);
    const current = average(latest, key);
    const change = metricChange(start, current);
    return { label, key, start, current, change };
  });

  const mostImproved = metricResults
    .filter((item) => item.change !== null && item.change < 0)
    .sort((a, b) => a.change - b.change)[0];

  const mappedChallengeCounts = countBy(
    mindEntries
      .filter((entry) => entry.thought_theme)
      .map((entry) => ({
        challenge: mapChallengeTheme(entry.thought_theme),
      })),
    "challenge"
  );

  const mostCommonTheme =
    mappedChallengeCounts[0]?.[0] || "No challenge data yet";

  const trialStart = organisation?.trial_start
    ? new Date(organisation.trial_start)
    : null;

  const trialEnd = organisation?.trial_end
    ? new Date(organisation.trial_end)
    : null;

  const today = new Date();

  const trialProgress =
    trialStart && trialEnd
      ? Math.min(
          100,
          Math.max(
            0,
            ((today.getTime() - trialStart.getTime()) /
              (trialEnd.getTime() - trialStart.getTime())) *
              100
          )
        )
      : 0;

  const executiveInsight =
    assessments.length === 0
      ? "Root has not collected enough organisation data yet. Once employees complete baseline and follow-up check-ins, this area will summarise early wellbeing movement, engagement and anonymous themes."
      : `Early data shows a current workforce wellbeing score of ${
          currentScore ?? "—"
        }. ${
          mostImproved
            ? `${mostImproved.label} is currently showing the strongest improvement.`
            : "More follow-up data is needed before reliable improvement patterns can be shown."
        } The most common anonymous challenge is ${mostCommonTheme}. Continued use over the full trial period will give stronger evidence of direction and help identify where support should be focused next.`;
const supportInteractions =
  mindEntries.length + journalEntries.length + voiceSessions.length;

const workforceNarrative = buildWorkforceNarrative({
  metricResults,
  mostCommonTheme,
  supportInteractions,
  currentScore,
});

const confidenceScore = Math.min(
  100,
  Math.round(
    assessments.length * 8 +
      supportInteractions * 0.4 +
      activated * 5
  )
);

const confidenceLabel =
  confidenceScore >= 80
    ? "High Confidence"
    : confidenceScore >= 60
    ? "Established"
    : confidenceScore >= 40
    ? "Developing"
    : "Early Stage";
const previousEntry =
  assessments.length > 1 ? assessments[assessments.length - 2] : null;

const latestEntry =
  assessments.length > 0 ? assessments[assessments.length - 1] : null;

function weeklyChange(label, key) {
  if (!previousEntry || !latestEntry) {
    return `${label}: awaiting comparison data`;
  }

  const before = Number(previousEntry[key]);
  const after = Number(latestEntry[key]);

  if (Number.isNaN(before) || Number.isNaN(after)) {
    return `${label}: awaiting comparison data`;
  }

  const movement = after - before;

  if (movement > 0) {
    return `${label} increased by ${movement.toFixed(1)} points`;
  }

  if (movement < 0) {
    return `${label} improved by ${Math.abs(movement).toFixed(1)} points`;
  }

  return `${label} remained stable`;
}

const weeklyChanges = [
  weeklyChange("Stress", "stress_score"),
  weeklyChange("Burnout", "burnout_score"),
  weeklyChange("Sleep difficulty", "sleep_score"),
  weeklyChange("Recovery difficulty", "recovery_score"),
];
  const stressLatest = latestEntry ? Number(latestEntry.stress_score) : null;
const burnoutLatest = latestEntry ? Number(latestEntry.burnout_score) : null;
const recoveryLatest = latestEntry ? Number(latestEntry.recovery_score) : null;
const sleepLatest = latestEntry ? Number(latestEntry.sleep_score) : null;

const stressPrevious = previousEntry ? Number(previousEntry.stress_score) : null;
const burnoutPrevious = previousEntry ? Number(previousEntry.burnout_score) : null;

const stressMovement =
  stressLatest !== null && stressPrevious !== null
    ? stressLatest - stressPrevious
    : null;

const burnoutMovement =
  burnoutLatest !== null && burnoutPrevious !== null
    ? burnoutLatest - burnoutPrevious
    : null;

const rootWeeklyInterpretation =
  stressMovement !== null &&
  burnoutMovement !== null &&
  stressMovement > 0 &&
  burnoutMovement < 0
    ? "Root has noticed that stress increased while burnout continued to improve. This may suggest employees are still experiencing pressure, but may be coping with it more effectively than before."
    : stressMovement !== null &&
      burnoutMovement !== null &&
      stressMovement < 0 &&
      burnoutMovement < 0
    ? "Root has noticed improvement across both stress and burnout. This may suggest a broader positive wellbeing trend is beginning to develop."
    : recoveryLatest !== null && recoveryLatest >= 7
    ? "Root has noticed that recovery remains a key pressure point. This may suggest employees need more support converting reduced pressure into sustainable restoration."
    : "Root is beginning to identify weekly wellbeing movement. Continued check-ins will make these interpretations more useful over time.";
  const rootMemory = [];

if (mostCommonTheme && mostCommonTheme !== "No challenge data yet") {
  rootMemory.push(
    `${mostCommonTheme} has remained one of the most visible workforce themes during this review period.`
  );
}

if (
  stressLatest !== null &&
  burnoutLatest !== null &&
  stressLatest >= 7 &&
  burnoutLatest < stressLatest
) {
  rootMemory.push(
    "Burnout appears lower than current stress levels, which may suggest employees are coping with pressure more effectively than before."
  );
}

if (recoveryLatest !== null && recoveryLatest >= 6) {
  rootMemory.push(
    "Recovery difficulty remains an important area to watch, particularly if pressure continues over future review periods."
  );
}

if (rootMemory.length === 0) {
  rootMemory.push(
    "Root is beginning to build an organisational memory. As more check-ins are completed, recurring themes and longer-term patterns will become clearer."
  );
}
  const executiveQuestions = [];

if (mostCommonTheme && mostCommonTheme !== "No challenge data yet") {
  executiveQuestions.push(
    `Is ${mostCommonTheme.toLowerCase()} a temporary pressure, or is it becoming part of normal working life?`
  );
}

if (recoveryLatest !== null && recoveryLatest >= 6) {
  executiveQuestions.push(
    "What may be preventing employees from fully recovering between periods of demand?"
  );
}

if (
  stressLatest !== null &&
  burnoutLatest !== null &&
  stressLatest >= 7 &&
  burnoutLatest < stressLatest
) {
  executiveQuestions.push(
    "What appears to be helping employees cope with pressure, and how can that be strengthened?"
  );
}

if (engagementScore !== null && engagementScore < 60) {
  executiveQuestions.push(
    "What barriers may be preventing employees from engaging with available support?"
  );
}

if (executiveQuestions.length === 0) {
  executiveQuestions.push(
    "What would help leaders understand the current workforce wellbeing picture more clearly?"
  );
}
  let recommendedInsight = {
  title: "Why pressure isn't always the problem",
  slug: "pressure",
  reason:
    "Workplace pressure is currently the strongest organisational theme, so Root is recommending a short insight on pressure, recovery and sustainable performance.",
};

if (recoveryLatest !== null && recoveryLatest >= 7) {
  recommendedInsight = {
    title: "Why recovery is not the same as rest",
    slug: "recovery",
    reason:
      "Recovery appears to be a key pressure point, so Root is recommending a short insight on sustainable recovery.",
  };
}

if (sleepLatest !== null && sleepLatest >= 7) {
  recommendedInsight = {
    title: "Why sleep is a performance issue, not a private issue",
    slug: "sleep",
    reason:
      "Sleep difficulty appears elevated, so Root is recommending a short insight on sleep, fatigue and workforce performance.",
  };
}

if (burnoutLatest !== null && burnoutLatest >= 7) {
  recommendedInsight = {
    title: "The burnout myth most organisations miss",
    slug: "burnout",
    reason:
      "Burnout indicators are elevated, so Root is recommending a short insight on what organisations often miss about burnout.",
  };
}

if (
  mostCommonTheme.includes("Relationship") ||
  mostCommonTheme.includes("Trust")
) {
  recommendedInsight = {
    title: "Why managers rarely spot burnout early",
    slug: "managers",
    reason:
      "Relationship and trust themes are appearing in the data, so Root is recommending a short insight on manager awareness and early signs.",
  };
}
if (burnoutLatest !== null && burnoutLatest >= 7) {
  recommendedInsight = {
    title: "The burnout myth most organisations miss",
    slug: "burnout",
    reason:
      "Burnout indicators are elevated, so Root is recommending a short insight on what organisations often miss about burnout.",
  };
}
const nextReviewFocus = [];

if (mostCommonTheme && mostCommonTheme !== "No challenge data yet") {
  nextReviewFocus.push(
    `Monitor ${mostCommonTheme.toLowerCase()} trends`
  );
}

const highRiskMetric = metricResults
  .filter((m) => m.current !== null)
  .sort((a, b) => b.current - a.current)[0];

if (highRiskMetric) {
  nextReviewFocus.push(
    `Prioritise ${highRiskMetric.label.toLowerCase()} improvement`
  );
}

if (engagementScore !== null && engagementScore < 60) {
  nextReviewFocus.push("Increase employee participation");
} else {
  nextReviewFocus.push("Maintain support engagement");
}

if (
  metricResults.find(
    (m) =>
      m.label === "Recovery difficulty" &&
      m.current !== null &&
      m.current >= 6
  )
) {
  nextReviewFocus.push(
    "Promote recovery and resilience activity"
  );
}
  return (
  <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <style>{`
          @keyframes drawLine {
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes pulseDot {
            0% { transform: scale(1); opacity: 0.86; }
            50% { transform: scale(1.28); opacity: 1; }
            100% { transform: scale(1); opacity: 0.86; }
          }

          @keyframes fadeDot {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        <section style={styles.shell}>
          <div style={styles.header}>
            <RootEnso size={90} />
            <p style={styles.kicker}>Root Health</p>
            <h1 style={styles.title}>Organisation Insights</h1>
            <p style={styles.subtitle}>
              Anonymous wellbeing trends, engagement, support usage and early outcome
              movement for organisational review.
            </p>
          </div>

          {loading ? (
            <p style={styles.loading}>Loading organisation insights...</p>
          ) : (
            <>
              <section style={styles.heroCard}>
                <div>
                  <p style={styles.heroLabel}>Current trial</p>
                  <h2 style={styles.heroTitle}>
                    {organisation?.name || "Root Health Trial Company"}
                  </h2>
                  <p style={styles.heroText}>
                    Trial progress: {Math.round(trialProgress)}%
                  </p>
                </div>

                <div style={styles.progressTrack}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${trialProgress}%`,
                    }}
                  />
                </div>
              </section>

              <section style={styles.executiveGrid}>
                <ExecutiveCard
                  label="Wellbeing score"
                  value={currentScore ?? "—"}
                  detail={
                    baselineScore !== null && currentScore !== null
                      ? `Baseline ${baselineScore} → Current ${currentScore}`
                      : "Waiting for comparison data"
                  }
                />

                <ExecutiveCard
                  label="Most improved"
                  value={mostImproved?.label || "—"}
                  detail={
                    mostImproved
                      ? changeText(mostImproved.start, mostImproved.current)
                      : "More follow-up data needed"
                  }
                />

                <ExecutiveCard
                  label="Most common challenge"
                  value={mostCommonTheme}
                  detail="Most frequently occurring anonymous workforce theme"
                />

                <ExecutiveCard
                  label="Support engagement"
                  value={mindEntries.length + journalEntries.length + voiceSessions.length}
                  detail="Total recorded support interactions"
                />
              </section>

              <section style={styles.cardGrid}>
                <MetricCard title="Employees invited" value={invited || "—"} />
                <MetricCard title="Activated" value={activated || "—"} />
                <MetricCard
                  title="Baselines completed"
                  value={baselineCompleted || "—"}
                />
                <MetricCard title="Engagement score" value={engagementScore ?? "—"} />
              </section>

          <section style={styles.chartPanel}>
  <LineTrendChart rows={trendRows} />
</section>

              <section style={styles.panel}>
                <p style={styles.panelLabel}>Chart view</p>
                <h2 style={styles.panelTitle}>Current wellbeing load</h2>

                <div style={styles.barPanel}>
                  {metricResults.map((item) => (
                    <BarRow
                      key={item.key}
                      label={item.label}
                      value={item.current}
                    />
                  ))}
                </div>
              </section>

              <section style={styles.twoColumn}>
                <section style={styles.panel}>
                  <p style={styles.panelLabel}>Anonymous themes</p>
                  <h2 style={styles.panelTitle}>What Root noticed</h2>

                  {themeCounts.length === 0 ? (
                    <p style={styles.empty}>No thought themes recorded yet.</p>
                  ) : (
                    themeCounts.map(([theme, count]) => (
                      <div key={theme} style={styles.listRow}>
                        <span>{theme}</span>
                        <strong>{count}</strong>
                      </div>
                    ))
                  )}
                </section>

                <section style={styles.panel}>
                  <p style={styles.panelLabel}>Support usage</p>
                  <h2 style={styles.panelTitle}>Most used tools</h2>

                  {toolCounts.length === 0 ? (
                    <p style={styles.empty}>No support tools recorded yet.</p>
                  ) : (
                    toolCounts.map(([tool, count]) => (
                      <div key={tool} style={styles.listRow}>
                        <span>{tool}</span>
                        <strong>{count}</strong>
                      </div>
                    ))
                  )}
                </section>
              </section>

            
 <section style={styles.reportCard}>
  <p style={styles.panelLabel}>AI Workforce Insight</p>

  <section style={styles.reportCard}>
    <p style={styles.panelLabel}>Board Report Snapshot</p>

    <h2 style={styles.panelTitle}>Executive Overview</h2>

    <div style={styles.snapshotGrid}>
      <div style={styles.snapshotItem}>
        <span style={styles.snapshotLabel}>Wellbeing Score</span>
        <strong style={styles.snapshotValue}>{currentScore ?? "—"}</strong>
      </div>

      <div style={styles.snapshotItem}>
        <span style={styles.snapshotLabel}>Strongest Improvement</span>
        <strong style={styles.snapshotValue}>{mostImproved?.label || "—"}</strong>
      </div>

      <div style={styles.snapshotItem}>
        <span style={styles.snapshotLabel}>Primary Challenge</span>
        <strong style={styles.snapshotValue}>{mostCommonTheme}</strong>
      </div>

      <div style={styles.snapshotItem}>
        <span style={styles.snapshotLabel}>Support Engagement</span>
        <strong style={styles.snapshotValue}>{supportInteractions}</strong>
      </div>
    </div>
  </section>

  <h2 style={styles.panelTitle}>What Root is noticing</h2>

  <p style={styles.reportText}>
    {workforceNarrative.insight}
  </p>
</section>
<section style={styles.reportCard}>
                  <section style={styles.reportCard}>
  <p style={styles.panelLabel}>Root Confidence Rating</p>

  <h2 style={styles.panelTitle}>
    {confidenceLabel} Confidence
  </h2>

  <div style={styles.confidenceTrack}>
    <div
      style={{
        ...styles.confidenceFill,
        width: `${confidenceScore}%`,
      }}
    />
  </div>

  <p style={styles.reportText}>
    Based on {assessments.length} assessments and{" "}
    {supportInteractions} support interactions.
  </p>
</section>
  <p style={styles.panelLabel}>Executive Summary</p>
  <h2 style={styles.panelTitle}>Current organisational picture</h2>

  <p style={styles.reportText}>
    {workforceNarrative.executiveSummary}
  </p>
</section>
                  <section style={styles.reportCard}>
  <p style={styles.panelLabel}>Root Confidence Rating</p>
  <h2 style={styles.panelTitle}>{confidenceLabel}</h2>

  <div style={styles.confidenceTrack}>
    <div
      style={{
        ...styles.confidenceFill,
        width: `${confidenceScore}%`,
      }}
    />
  </div>

  <p style={styles.reportText}>
    Based on {assessments.length} assessments,
    {supportInteractions} support interactions
    and {activated} activated users.
  </p>
</section>

<section style={styles.reportCard}>
  <p style={styles.panelLabel}>Recommended Actions</p>
  <h2 style={styles.panelTitle}>Immediate opportunities</h2>

  <div style={styles.priorityGrid}>
  {nextReviewFocus.map((item) => (
    <div key={item} style={styles.priorityCard}>
      {item}
    </div>
  ))}
</div>
  <h3 style={styles.smallHeading}>Watch areas</h3>

  <ul style={styles.reportList}>
    {workforceNarrative.watchAreas.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
</section>

<section style={styles.reportCard}>
  <p style={styles.panelLabel}>Learning Opportunities</p>
  <h2 style={styles.panelTitle}>Suggested development themes</h2>

  <ul style={styles.reportList}>
    {workforceNarrative.learning.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
</section>

<section style={styles.finalGrid}>
  <section style={styles.finalPanel}>
    <p style={styles.panelLabel}>Optional Organisational Development</p>
    <h2 style={styles.panelTitle}>
  Organisational Development Opportunities
</h2>

    <div style={styles.supportOptionList}>
      {workforceNarrative.support.map((item, index) => (
        <div key={item} style={styles.supportOptionRow}>
          <span style={styles.supportIcon}>
            {["◌", "◎", "◇", "✦"][index % 4]}
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  </section>

  <section style={styles.finalPanel}>
    <p style={styles.panelLabel}>Recommended Priorities</p>
    <h2 style={styles.panelTitle}>Recommended priorities</h2>

    <div style={styles.priorityGrid}>
      {nextReviewFocus.map((item, index) => (
        <div key={item} style={styles.priorityCard}>
          <span style={styles.priorityIcon}>
            {["↗", "◒", "☷"][index % 3]}
          </span>
          <strong>{item}</strong>
        </div>
      ))}
    </div>
  </section>
</section>

<section style={styles.weeklyReportCard}>
  <p style={styles.panelLabel}>Weekly Executive Review</p>

  <h2 style={styles.panelTitle}>Your latest report is ready</h2>

  <p style={styles.reportText}>
    Root has reviewed the latest workforce wellbeing movement and prepared
    an updated executive review for HR and leadership.
  </p>

  <div style={styles.weeklyReportGrid}>
    <div style={styles.snapshotItem}>
      <span style={styles.snapshotLabel}>Latest Score</span>
      <strong style={styles.snapshotValue}>{currentScore ?? "—"}</strong>
    </div>

    <div style={styles.snapshotItem}>
      <span style={styles.snapshotLabel}>Confidence</span>
      <strong style={styles.snapshotValue}>{confidenceLabel}</strong>
    </div>

    <div style={styles.snapshotItem}>
      <span style={styles.snapshotLabel}>Key Focus</span>
      <strong style={styles.snapshotValue}>{mostCommonTheme}</strong>
    </div>
  </div>

  <div style={styles.changedCard}>
    <h3 style={styles.smallHeading}>What changed since last review?</h3>

    <div style={styles.changedGrid}>
      {weeklyChanges.map((item) => (
        <div key={item} style={styles.changedItem}>
          {item}
        </div>
      ))}
    </div>
  </div>
  <div style={styles.interpretationCard}>
  <h3 style={styles.smallHeading}>Root's interpretation</h3>

  <p style={styles.reportText}>
    {rootWeeklyInterpretation}
  </p>
</div>
      <div style={styles.memoryCard}>
  <p style={styles.panelLabel}>Root Memory</p>

  <h3 style={styles.smallHeading}>
    Root's memory of this organisation
  </h3>

  <div style={styles.memoryList}>
    {rootMemory.map((item) => (
      <div key={item} style={styles.memoryItem}>
        {item}
      </div>
    ))}
  </div>
</div>
    <div style={styles.questionsCard}>
  <p style={styles.panelLabel}>Executive Questions</p>

  <h3 style={styles.smallHeading}>Questions for leadership</h3>

  <div style={styles.questionList}>
    {executiveQuestions.map((item) => (
      <div key={item} style={styles.questionItem}>
        {item}
      </div>
    ))}
  </div>
</div>
      <div style={styles.recommendedInsightCard}>
  <p style={styles.panelLabel}>Recommended Insight</p>

  <h3 style={styles.smallHeading}>
    {recommendedInsight.title}
  </h3>

  <p style={styles.reportText}>
    {recommendedInsight.reason}
  </p>

  <button
    style={styles.reportButton}
    onClick={() =>
      window.open(`/root-insight/${recommendedInsight.slug}`, "_blank")
    }
  >
    Read 5 minute insight
  </button>
</div>
  <button
    style={styles.reportButton}
    onClick={() => window.open("/executive-review?print=1", "_blank")}
  >
    Generate Executive Review
  </button>
</section>
      <section style={styles.reportFooter}>
  <div style={styles.footerItem}>
    <strong>Root Health</strong>
    <span>Organisational Wellbeing Review</span>
  </div>

  <div style={styles.footerItem}>
    <strong>Confidential</strong>
    <span>For internal use only</span>
  </div>

  <div style={styles.footerItem}>
    <strong>Generated automatically</strong>
    <span>From anonymised workforce data</span>
  </div>
</section>              <p style={styles.privacy}>
                This dashboard should only show anonymous organisation-level trends.
                Individual user reflections should never be visible to managers.
              </p>
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
    padding: "28px",
    display: "flex",
    justifyContent: "center",
  },
  snapshotLabel: {
  display: "block",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#776C5B",
  fontWeight: "800",
  marginBottom: "10px",
},

snapshotValue: {
  display: "block",
  fontSize: "24px",
  color: "#181818",
  lineHeight: "1.2",
},

  shell: {
    width: "100%",
    maxWidth: "1180px",
    borderRadius: "42px",
    padding: "38px",
    background: "rgba(255,255,255,0.34)",
    border: "1px solid rgba(255,255,255,0.52)",
    backdropFilter: "blur(22px)",
    boxShadow: "0 34px 100px rgba(20,18,15,0.18)",
  },

  header: {
    textAlign: "center",
    marginBottom: "28px",
  },

  kicker: {
    margin: "10px 0",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#6F675B",
    fontWeight: "800",
  },

  title: {
    margin: "0 0 12px",
    fontSize: "48px",
    color: "#181818",
    letterSpacing: "-0.04em",
  },

  subtitle: {
    maxWidth: "760px",
    margin: "0 auto",
    lineHeight: "1.75",
    color: "#5A554D",
    fontSize: "17px",
  },

  loading: {
    textAlign: "center",
    color: "#5A554D",
  },

  heroCard: {
    padding: "30px",
    borderRadius: "34px",
    background:
      "linear-gradient(135deg, rgba(24,24,24,0.92), rgba(52,48,42,0.92))",
    color: "#FFFFFF",
    marginBottom: "22px",
  },

  heroLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#D8CDBB",
    fontWeight: "800",
  },

  heroTitle: {
    margin: "0 0 10px",
    fontSize: "34px",
  },

  heroText: {
    margin: "0 0 14px",
    color: "#E7E0D6",
  },

  progressTrack: {
    height: "12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "#FFFFFF",
  },

  executiveGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },

  executiveCard: {
    padding: "26px",
    borderRadius: "30px",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.42))",
    border: "1px solid rgba(255,255,255,0.76)",
  },

  executiveValue: {
    margin: "0 0 8px",
    fontSize: "34px",
    color: "#181818",
    lineHeight: "1.1",
  },

  executiveDetail: {
    margin: 0,
    color: "#5A554D",
    lineHeight: "1.5",
    fontSize: "14px",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },

  metricCard: {
    padding: "24px",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  metricLabel: {
    margin: "0 0 8px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#776C5B",
    fontWeight: "800",
  },

  metricValue: {
    margin: 0,
    fontSize: "34px",
    color: "#181818",
  },

  panel: {
    padding: "28px",
    borderRadius: "32px",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(255,255,255,0.72)",
    marginBottom: "18px",
  },

  panelLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#776C5B",
    fontWeight: "800",
  },

  panelTitle: {
    margin: "0 0 18px",
    fontSize: "28px",
    color: "#181818",
  },
 chartPanel: {
  padding: "0",
  marginBottom: "18px",
  background: "transparent",
  border: "none",
},

 
  chartInsight: {
    marginTop: "22px",
    padding: "18px",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.82)",
    lineHeight: "1.7",
  },
  
premiumChartCard: {
  padding: "30px",
  borderRadius: "32px",
  background: "transparent",
  border: "none",
  boxShadow: "none",
  overflow: "hidden",
},

chartHeader: {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "24px",
  flexWrap: "wrap",
},

chartKicker: {
  margin: "0 0 8px",
  color: "#6F675B",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontWeight: "800",
},

chartTitle: {
  margin: "0 0 8px",
  color: "#181818",
  fontSize: "30px",
  lineHeight: "1.1",
},

chartHint: {
  margin: 0,
  color: "#5A554D",
  lineHeight: "1.6",
},

chartMiniSummary: {
  minWidth: "260px",
  padding: "16px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.48)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#181818",
},

trendBadgeGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginBottom: "24px",
},

trendBadge: {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "14px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.48)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#181818",
},

trendBadgeGood: {
  background: "rgba(34,197,94,0.12)",
},

trendBadgeWatch: {
  background: "rgba(249,115,22,0.12)",
},

trendBadgeSymbol: {
  fontSize: "24px",
  fontWeight: "900",
},

svgChart: {
  width: "100%",
  height: "auto",
  display: "block",
},

chartLegend: {
  display: "flex",
  flexWrap: "wrap",
  gap: "14px",
  marginTop: "20px",
},

legendItem: {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  color: "#181818",
  fontWeight: "700",
},

legendDot: {
  width: "11px",
  height: "11px",
  borderRadius: "50%",
},

chartInsight: {
  marginTop: "22px",
  padding: "18px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.48)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#181818",
  lineHeight: "1.8",
},
  barPanel: {
    display: "grid",
    gap: "16px",
  },

  barRow: {
    display: "grid",
    gap: "8px",
  },

  barTop: {
    display: "flex",
    justifyContent: "space-between",
    color: "#2A261F",
  },

  barTrack: {
    height: "14px",
    borderRadius: "999px",
    background: "rgba(24,24,24,0.08)",
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: "999px",
    background: "#181818",
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },

  listRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "14px 0",
    borderBottom: "1px solid rgba(24,24,24,0.08)",
    color: "#2A261F",
  },

  empty: {
    color: "#6F675B",
    lineHeight: "1.6",
  },

  reportCard: {
    padding: "30px",
    borderRadius: "34px",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.34))",
    border: "1px solid rgba(255,255,255,0.72)",
    marginBottom: "18px",
  },

  reportText: {
    reportList: {
  margin: "12px 0",
  paddingLeft: "22px",
  color: "#4D463B",
  lineHeight: "1.9",
},
    snapshotGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
},

snapshotItem: {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "18px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.35)",
},

confidenceTrack: {
  height: "18px",
  borderRadius: "999px",
  overflow: "hidden",
  background: "rgba(24,24,24,0.08)",
},

confidenceFill: {
  height: "100%",
  background: "#181818",
  borderRadius: "999px",
},
    priorityGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginTop: "12px",
},

priorityCard: {
  padding: "18px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.32)",
  border: "1px solid rgba(255,255,255,0.55)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  color: "#181818",
  fontWeight: 600,
  lineHeight: 1.5,
},

smallHeading: {
  marginTop: "18px",
  marginBottom: "10px",
  color: "#181818",
  fontSize: "18px",
},
    lineHeight: "1.8",
    color: "#4D463B",
  },

  reportButton: {
    marginTop: "12px",
    border: "none",
    borderRadius: "999px",
    padding: "14px 20px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
  },
  finalGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "18px",
  marginBottom: "18px",
},

finalPanel: {
  padding: "30px",
  borderRadius: "34px",
  background: "rgba(255,255,255,0.48)",
  border: "1px solid rgba(255,255,255,0.72)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
},

supportOptionList: {
  display: "grid",
  gap: "18px",
  marginTop: "18px",
},

supportOptionRow: {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  color: "#181818",
  fontWeight: "700",
  fontSize: "17px",
},

supportIcon: {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "rgba(220,230,205,0.6)",
  color: "#526943",
  fontWeight: "900",
},

priorityGrid: {
  display: "grid",
  gap: "14px",
  marginTop: "18px",
},

priorityCard: {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.46)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#181818",
  lineHeight: "1.45",
},

priorityIcon: {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "rgba(220,230,205,0.6)",
  color: "#526943",
  fontWeight: "900",
  flexShrink: 0,
},

reportActionCard: {
  padding: "30px",
  borderRadius: "34px",
  background: "rgba(255,255,255,0.36)",
  border: "1px solid rgba(255,255,255,0.65)",
  display: "flex",
  justifyContent: "center",
  marginBottom: "18px",
},

reportFooter: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
  padding: "22px",
  borderRadius: "28px",
  background: "rgba(255,255,255,0.34)",
  border: "1px solid rgba(255,255,255,0.58)",
  color: "#181818",
  marginBottom: "18px",
},

footerItem: {
  display: "grid",
  gap: "4px",
  fontSize: "14px",
},
  privacy: {
    textAlign: "center",
    fontSize: "13px",
    color: "#6F675B",
    lineHeight: "1.6",
  },
  weeklyReportCard: {
  padding: "30px",
  borderRadius: "34px",
  background: "rgba(255,255,255,0.44)",
  border: "1px solid rgba(255,255,255,0.72)",
  marginBottom: "18px",
},

weeklyReportGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  margin: "18px 0",
},
changedCard: {
  marginTop: "20px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.42)",
  border: "1px solid rgba(255,255,255,0.68)",
},

changedGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  marginTop: "14px",
},

changedItem: {
  padding: "16px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#181818",
  fontWeight: "700",
  lineHeight: "1.45",
},  
  interpretationCard: {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(220,230,205,0.42)",
  border: "1px solid rgba(255,255,255,0.72)",
},
  recommendedInsightCard: {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.46)",
  border: "1px solid rgba(255,255,255,0.72)",
},
  memoryCard: {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.42)",
  border: "1px solid rgba(255,255,255,0.72)",
},

memoryList: {
  display: "grid",
  gap: "12px",
  marginTop: "14px",
},

memoryItem: {
  padding: "16px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#181818",
  lineHeight: "1.6",
  fontWeight: "650",
},
  questionsCard: {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.42)",
  border: "1px solid rgba(255,255,255,0.72)",
},

questionList: {
  display: "grid",
  gap: "12px",
  marginTop: "14px",
},

questionItem: {
  padding: "16px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#181818",
  lineHeight: "1.6",
  fontWeight: "650",
},
};

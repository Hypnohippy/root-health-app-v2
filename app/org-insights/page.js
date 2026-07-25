"use client"; 

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";
import { ROOT_PUBLIC_URL } from "../../lib/config";
import { buildOrganisationSnapshot } from "../../lib/rootOrganisationEngine";

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
function openEmployeeEmail({ organisation, initiative }) {
  const organisationName =
    organisation?.name || "our organisation";

  const initiativeTitle =
    initiative?.title || "Workplace Wellbeing Initiative";

  const subject = `Introducing ${initiativeTitle}`;

  const body = `Hello everyone,

We are pleased to introduce ${initiativeTitle} as part of our ongoing commitment to supporting employee wellbeing at ${organisationName}.

Why are we introducing this?

${initiative?.reason || "Root has identified this as a useful area of focus based on anonymous workforce wellbeing trends."}

What will this involve?

${initiative?.introduction || "Over the coming weeks, employees will receive practical information and opportunities to support their wellbeing, resilience and recovery."}

What we hope to achieve

${initiative?.expectedOutcome || "The aim is to support healthier working practices, greater awareness and sustainable wellbeing across the organisation."}

Your privacy

Root only provides anonymous organisational trends. Your employer cannot see your individual responses, personal reflections, conversations or health information.

Further information about the initiative will be shared shortly.

Kind regards,

${organisationName}`;

  const mailtoLink = `mailto:?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoLink;
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
function normaliseOrganisationTheme(value = "") {
  const text = String(value).trim().toLowerCase();

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
    text.includes("emotion") ||
    text.includes("emotional")
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
    text.includes("strain") ||
    text.includes("workplace")
  ) {
    return "stress";
  }

  return "baseline";
}

const ORGANISATIONAL_RESPONSES = {
  stress: [
    {
      title: "Manager Awareness Session",
      description:
        "Helping managers recognise pressure, workload strain and early warning signs.",
    },
    {
      title: "Pressure & Performance Briefing",
      description:
        "Exploring sustainable performance without increasing burnout risk.",
    },
    {
      title: "Workforce Resilience Workshop",
      description:
        "Practical approaches employees can use to manage pressure and maintain recovery.",
    },
    {
      title: "Leadership Briefing",
      description:
        "A leadership discussion exploring workforce pressure, organisational risk and proportionate responses.",
    },
  ],

  burnout: [
    {
      title: "Recovery & Resilience Workshop",
      description:
        "Helping employees recognise cumulative strain and build practical recovery habits.",
    },
    {
      title: "Burnout Prevention Session",
      description:
        "Exploring the early signs of burnout and how sustained pressure develops over time.",
    },
    {
      title: "Manager Early-Warning Training",
      description:
        "Helping managers notice changes in capacity, energy and sustainable performance.",
    },
    {
      title: "Leadership Risk Briefing",
      description:
        "Examining burnout risk, workload conditions and appropriate organisational responses.",
    },
  ],

  recovery: [
    {
      title: "Recovery & Resilience Workshop",
      description:
        "Practical strategies supporting restoration, energy and sustainable wellbeing.",
    },
    {
      title: "Manager Awareness Session",
      description:
        "Helping managers understand how limited recovery can affect workforce capacity.",
    },
    {
      title: "Wellbeing Education",
      description:
        "Building practical understanding of recovery, pressure and nervous-system regulation.",
    },
    {
      title: "Internal Recovery Initiative",
      description:
        "A focused internal campaign encouraging realistic recovery practices.",
    },
  ],

  sleep: [
    {
      title: "Sleep & Recovery Workshop",
      description:
        "Exploring the relationship between sleep, fatigue, pressure and recovery.",
    },
    {
      title: "Fatigue Awareness Session",
      description:
        "Helping employees and managers recognise fatigue and its effect on performance.",
    },
    {
      title: "Manager Briefing",
      description:
        "Supporting managers to identify patterns associated with depleted capacity.",
    },
    {
      title: "Workforce Wellbeing Education",
      description:
        "Practical education around healthier and more realistic recovery habits.",
    },
  ],

  mood: [
    {
      title: "Emotional Resilience Workshop",
      description:
        "Helping employees understand emotional load and develop practical regulation strategies.",
    },
    {
      title: "Manager Awareness Session",
      description:
        "Helping managers recognise emotional strain and respond appropriately.",
    },
    {
      title: "Wellbeing Education",
      description:
        "Improving understanding of mood, resilience and psychological recovery.",
    },
    {
      title: "Leadership Briefing",
      description:
        "Exploring anonymous mood patterns and proportionate organisational support.",
    },
  ],

  energy: [
    {
      title: "Energy & Recovery Workshop",
      description:
        "Exploring the relationship between workload, energy and sustainable performance.",
    },
    {
      title: "Pressure & Performance Briefing",
      description:
        "Helping employees maintain performance without allowing pressure to become depletion.",
    },
    {
      title: "Manager Awareness Session",
      description:
        "Helping managers recognise reduced capacity and accumulating strain.",
    },
    {
      title: "Internal Wellbeing Initiative",
      description:
        "A focused initiative encouraging practical energy and recovery habits.",
    },
  ],

  focus: [
    {
      title: "Mental Load & Focus Session",
      description:
        "Exploring cognitive load, competing priorities and practical ways to restore clarity.",
    },
    {
      title: "Manager Development",
      description:
        "Helping managers understand how workload and pressure can affect concentration.",
    },
    {
      title: "Pressure & Performance Briefing",
      description:
        "Supporting sustainable performance during periods of high mental demand.",
    },
    {
      title: "Leadership Briefing",
      description:
        "Examining workload, prioritisation and organisational conditions affecting focus.",
    },
  ],

  baseline: [
    {
      title: "Workforce Insight Briefing",
      description:
        "Reviewing participation, measurement and the development of a reliable wellbeing baseline.",
    },
    {
      title: "Participation Initiative",
      description:
        "Encouraging sufficient anonymous engagement to strengthen organisational insight.",
    },
    {
      title: "Manager Awareness Session",
      description:
        "Helping managers understand the purpose of anonymous wellbeing measurement.",
    },
    {
      title: "Leadership Briefing",
      description:
        "Clarifying what the current evidence supports and what should be measured next.",
    },
  ],
};

function buildOrganisationalRecommendation({
  primaryConcern,
  recommendedFocus,
  mostCommonTheme,
  confidenceLabel,
  confidenceReasons,
  rootHypothesis,
  recommendedInsight,
  initiative,
}) {
  const rawTheme =
    recommendedFocus ||
    primaryConcern ||
    mostCommonTheme ||
    "Developing Workforce Baseline";

  const themeKey = normaliseOrganisationTheme(rawTheme);

  const fallbackExplanation =
    themeKey === "baseline"
      ? "Root is still gathering sufficient repeat evidence to identify a reliable workforce pattern."
      : `${rawTheme} is currently emerging as the strongest anonymous workforce pattern. Continued check-ins will help Root determine whether this represents sustained organisational movement.`;

  const insight = {
    title:
      recommendedInsight?.title ||
      "Building a reliable workforce wellbeing baseline",

    reason:
      recommendedInsight?.reason ||
      fallbackExplanation,

    slug:
      recommendedInsight?.slug ||
      "building-a-reliable-workforce-wellbeing-baseline",
  };

  return {
    themeKey,
    themeLabel: rawTheme,
    confidence: confidenceLabel || "Developing",

    explanation:
      themeKey !== "baseline"
    ? fallbackExplanation
    : insight.reason ||
      rootHypothesis ||
      fallbackExplanation,

    hypothesis:
      rootHypothesis ||
      "Root is continuing to gather evidence before forming a stronger organisational hypothesis.",

    evidence:
      Array.isArray(confidenceReasons)
        ? confidenceReasons
        : [],

    insight,

    initiative: {
      key: initiative?.key || themeKey,

      title:
        initiative?.title ||
        ORGANISATIONAL_RESPONSES[themeKey]?.[0]?.title ||
        "Workforce Insight Briefing",

      reason:
        initiative?.reason ||
        fallbackExplanation,

      expectedOutcome:
        initiative?.expectedOutcome ||
        "Greater clarity, stronger participation and more confident organisational decision-making.",
    },

    responses:
      ORGANISATIONAL_RESPONSES[themeKey] ||
      ORGANISATIONAL_RESPONSES.baseline,
  };
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

function TrendBadge({ label, start, current, hasComparison }) {
  const severity =
    current >= 8
      ? {
          label: "High concern",
          symbol: "!",
          tone: "watch",
        }
      : current >= 6
      ? {
          label: "Elevated",
          symbol: "↑",
          tone: "watch",
        }
      : current >= 4
      ? {
          label: "Moderate",
          symbol: "•",
          tone: "neutral",
        }
      : {
          label: "Lower difficulty",
          symbol: "✓",
          tone: "good",
        };

  const display = hasComparison
    ? trendLabel(start, current)
    : severity;

  return (
    <div
      style={{
        ...styles.trendBadge,
        ...(display.tone === "good" ? styles.trendBadgeGood : {}),
        ...(display.tone === "watch" ? styles.trendBadgeWatch : {}),
      }}
    >
      <span style={styles.trendBadgeSymbol}>{display.symbol}</span>

      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <strong>{label}</strong>
        <span>{display.label}</span>
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
const hasComparison = safeRows.length > 1;

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
          <span>Current snapshot </span>
          <strong>
            Stress {last.stress} · Burnout {last.burnout} · Sleep {last.sleep} · Recovery{" "}
            {last.recovery}
          </strong>
        </div>
      </div>

      <div style={styles.trendBadgeGrid}>
        <TrendBadge
  label="Stress"
  start={first.stress}
  current={last.stress}
  hasComparison={hasComparison}
/>

<TrendBadge
  label="Burnout"
  start={first.burnout}
  current={last.burnout}
  hasComparison={hasComparison}
/>

<TrendBadge
  label="Sleep"
  start={first.sleep}
  current={last.sleep}
  hasComparison={hasComparison}
/>

<TrendBadge
  label="Recovery"
  start={first.recovery}
  current={last.recovery}
  hasComparison={hasComparison}
/>
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
    Stress moved from {format(first.stress)} to {format(last.stress)}, while
    burnout moved from {format(first.burnout)} to {format(last.burnout)}. Sleep
    difficulty should be watched because it showed the largest temporary movement
    during the period. Overall, the chart is beginning to show a clearer direction
    of change.
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
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  window.location.href = "/login";
  return;
}

const { data: membership, error: membershipError } = await supabase
  .from("organisation_members")
  .select(
    "id, organisation_id, profile_key, email, name, department, role"
  )
  .eq("user_id", user.id)
  .maybeSingle();

if (membershipError || !membership) {
  await supabase.auth.signOut();
  window.location.href = "/login";
  return;
}

const allowedRoles = ["hr_admin", "organisation_admin"];

if (!allowedRoles.includes(membership.role)) {
  window.location.href = "/";
  return;
}

const orgId = membership.organisation_id;

localStorage.setItem("root_profile_key_v1", membership.profile_key);

localStorage.setItem(
  "root_hr_org_v1",
  JSON.stringify({
    organisation_id: membership.organisation_id,
    role: membership.role,
  })
);


const { data: org } = await supabase
  .from("organisations")
  .select("*")
  .eq("id", orgId)
  .maybeSingle();

setOrganisation(org || null);

    const orgFilter = orgId
  ? `organisation_id.eq.${orgId}`
  : "organisation_id.eq.__never_match__";
    
    const { data: memberData } = await supabase
  .from("organisation_members")
  .select("*")
  .eq("organisation_id", orgId)
  .order("created_at", { ascending: false });

    const { data: assessmentData, error: assessmentError } = await supabase
  .from("wellbeing_assessments")
  .select("*")
  .eq("organisation_id", orgId)
  .order("created_at", { ascending: true });

console.log("Assessment Error:", assessmentError);
console.log("Assessment Data:", assessmentData);

    const { data: mindData } = await supabase
      .from("mind_entries")
      .select("*")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: journalData } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: voiceData } = await supabase
      .from("voice_sessions")
      .select("*")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);

    setMembers(Array.isArray(memberData) ? memberData : []);
    setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
    console.log("Organisation ID:", orgId);
    console.log("Assessments returned:", assessmentData);
    console.log("Assessments state:", assessments);
    setMindEntries(Array.isArray(mindData) ? mindData : []);
    setJournalEntries(Array.isArray(journalData) ? journalData : []);
    setVoiceSessions(Array.isArray(voiceData) ? voiceData : []);

    setLoading(false);
  };

  const snapshot = buildOrganisationSnapshot({
  organisation,
  members,
  assessments,
  mindEntries,
  journalEntries,
  voiceSessions,
});

const {
  invited,
  activated,
  baselineCompleted,
  engagementScore,
  supportInteractions,
  baselineScore,
  currentScore,
  metricResults,
  trendRows,
  mostImproved,
  highRiskMetric,
  mostCommonTheme,
  primaryConcern,
  recommendedFocus,
  confidenceScore,
  confidenceLabel,
  executiveStatus,
  initiative,
  nextReviewFocus,
  workforceNarrative,
  executiveEvidence,
  organisationMemory: rootMemory,
  executiveQuestions,
  rootHypothesis,
  recommendedInsight,
  confidenceReasons,
  boardCase,
} = snapshot;
const organisationalRecommendation =
  buildOrganisationalRecommendation({
    primaryConcern,
    recommendedFocus,
    mostCommonTheme,
    confidenceLabel,
    confidenceReasons,
    rootHypothesis,
    recommendedInsight,
    initiative,
  });

  const baselineRows = assessments.filter(
  (item) => item.assessment_type === "baseline"
);

const baseline =
  baselineRows.length > 0
    ? baselineRows
    : assessments.length > 0
    ? [assessments[0]]
    : [];

const latest =
  assessments.length > 0
    ? [assessments[assessments.length - 1]]
    : [];
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



  const mappedChallengeCounts = countBy(
    mindEntries
      .filter((entry) => entry.thought_theme)
      .map((entry) => ({
        challenge: mapChallengeTheme(entry.thought_theme),
      })),
    "challenge"
  );

 
  const fallbackTrialStart = assessments.length
  ? new Date(assessments[0].created_at)
  : null;

const trialStart = organisation?.trial_start
  ? new Date(organisation.trial_start)
  : fallbackTrialStart;

const trialEnd = organisation?.trial_end
  ? new Date(organisation.trial_end)
  : trialStart
  ? new Date(trialStart.getTime() + 60 * 24 * 60 * 60 * 1000)
  : null;

const today = new Date();

const totalTrialDays =
  trialStart && trialEnd
    ? Math.max(
        1,
        Math.ceil(
          (trialEnd.getTime() - trialStart.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 60;

const daysElapsed =
  trialStart
    ? Math.max(
        1,
        Math.ceil(
          (today.getTime() - trialStart.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

const daysRemaining =
  trialEnd
    ? Math.max(
        0,
        Math.ceil(
          (trialEnd.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : totalTrialDays;

const trialProgress =
  trialStart && trialEnd
    ? Math.min(100, Math.max(0, (daysElapsed / totalTrialDays) * 100))
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
                <section style={styles.controlCentre}>

  <div style={styles.controlHeader}>
    <div>
      <h2 style={styles.controlTitle}>HR Action Centre</h2>

      <p style={styles.controlText}>
        Invite employees, launch initiatives and prepare executive reports.
      </p>
    </div>

    <div style={styles.controlButtons}>

      <button
  style={styles.controlButton}
  onClick={() => setShowInvite(!showInvite)}
>
  👥 Invite Employees
</button>
     <button
  style={styles.controlButton}
  onClick={() => {
    const joinLink = `${ROOT_PUBLIC_URL}/organisation/join`;

    navigator.clipboard.writeText(joinLink);

    alert("Employee join link copied.");
  }}
>
  📋 Copy Join Link
</button>

      <button
  style={styles.controlButton}
  onClick={() =>
    window.open("/executive-review?print=1", "_blank")
  }
>
  📄 View Executive Report
</button>

      <button
  style={styles.controlButton}
  onClick={() => (window.location.href = "/hr-coach")}
>
  💬 Ask Root
</button>

    </div>

  </div>
{showInvite && (
  <div style={styles.invitePanel}>

    <h3 style={styles.inviteTitle}>
      Invite Employees
    </h3>

    <p style={styles.inviteText}>
      Copy the message below and send it to your employees.
    </p>

    <textarea
      readOnly
      style={styles.inviteBox}
     value={`You're invited to take part in the ${organisation?.name} Root Health Workplace Wellbeing Pilot.

${organisation?.name} has introduced Root to support the wellbeing of its people by helping everyone better understand themselves, build resilience and develop healthier habits.

Taking part takes just a few minutes to begin and starts with a short orientation and your personal wellbeing baseline.

Throughout the pilot, Root will help you recognise patterns in your wellbeing, understand how stress, sleep, recovery and lifestyle affect you, and gently support you in making small, positive choices that can improve your health and wellbeing over time.

Join here:

${ROOT_PUBLIC_URL}/organisation/join

Organisation Code:

${organisation?.organisation_code}

Root's Promise to You

Everything you share with Root belongs to you.

Your employer will never see your individual responses, conversations or personal health information.

Root only shares anonymous organisational wellbeing trends to help create a healthier, more supportive workplace for everyone.

We look forward to welcoming you.

— The Root Team`}
    />

  </div>
)}
</section>
          </div>

          {!loading && (
  <section style={styles.pilotProgressCard}>
    <div>
      <p style={styles.panelLabel}>Pilot Progress</p>
      <h2 style={styles.panelTitle}>
        {organisation?.name || "Organisation"} is on Day {daysElapsed} of {totalTrialDays}
      </h2>
      <p style={styles.panelDescription}>
        Root is tracking participation, activation and baseline completion so HR can see whether the pilot is gaining momentum.
      </p>
    </div>

    <div style={styles.pilotProgressGrid}>
      <div style={styles.pilotProgressItem}>
        <span>Invited</span>
        <strong>{invited}</strong>
      </div>

      <div style={styles.pilotProgressItem}>
        <span>Activated</span>
        <strong>{activated}</strong>
      </div>

      <div style={styles.pilotProgressItem}>
        <span>Baselines</span>
        <strong>{baselineCompleted}</strong>
      </div>

      <div style={styles.pilotProgressItem}>
        <span>Engagement</span>
        <strong>{engagementScore !== null ? `${engagementScore}%` : "—"}</strong>
      </div>
    </div>

    <div style={styles.pilotTrack}>
      <div
        style={{
          ...styles.pilotFill,
          width: `${engagementScore !== null ? engagementScore : 0}%`,
        }}
      />
    </div>
  </section>
)}
          {loading ? (
            <p style={styles.loading}>Loading organisation insights...</p>
          ) : (
            <>
            <section style={styles.executiveBrief}>
          <section style={styles.participantsCard}>
  <div style={styles.participationHeader}>
    <div>
      <p style={styles.panelLabel}>Anonymous Participation</p>

      <h2 style={styles.panelTitle}>
        Workforce participation overview
      </h2>

      <p style={styles.participationIntro}>
        A clear view of participation, baseline completion and the
        strength of the organisation&apos;s follow-up evidence.
      </p>
    </div>

    <div style={styles.participationStatusPill}>
      {snapshot?.participation?.outcomeSuppressed
        ? "Evidence developing"
        : "Movement available"}
    </div>
  </div>

  {!snapshot?.participation ? (
    <p style={styles.panelDescription}>
      Participation information is still being prepared.
    </p>
  ) : (
    <>
      <div style={styles.participationGrid}>
        <div style={styles.participantRow}>
          <div style={styles.participantTitle}>
            Invited
          </div>

          <strong style={styles.participantValue}>
            {snapshot.participation.invited}
          </strong>

          <div style={styles.participantDescription}>
            Employees invited to take part
          </div>
        </div>

        <div style={styles.participantRow}>
          <div style={styles.participantTitle}>
            Joined
          </div>

          <strong style={styles.participantValue}>
            {snapshot.participation.joined}
          </strong>

          <div style={styles.participantDescription}>
            {snapshot.participation.participationRate !== null
              ? `${snapshot.participation.participationRate}% activated their Root account`
              : "Awaiting employee activation"}
          </div>
        </div>

        <div style={styles.participantRow}>
          <div style={styles.participantTitle}>
            Baseline complete
          </div>

          <strong style={styles.participantValue}>
            {snapshot.participation.baselineCompleted}
          </strong>

          <div style={styles.participantDescription}>
            {snapshot.participation.baselineCompletionRate !== null
              ? `${snapshot.participation.baselineCompletionRate}% completed their first assessment`
              : "Awaiting baseline participation"}
          </div>
        </div>

        <div style={styles.participantRow}>
          <div style={styles.participantTitle}>
            Matched follow-ups
          </div>

          <strong style={styles.participantValue}>
            {snapshot.participation.matchedParticipants}
          </strong>

          <div style={styles.participantDescription}>
            {snapshot.participation.followUpRate !== null
              ? `${snapshot.participation.followUpRate}% completed a baseline and later check-in`
              : "No matched follow-ups yet"}
          </div>
        </div>

        <div style={styles.participantRow}>
          <div style={styles.participantTitle}>
            Baseline only
          </div>

          <strong style={styles.participantValue}>
            {snapshot.participation.baselineOnlyParticipants}
          </strong>

          <div style={styles.participantDescription}>
            Completed a baseline but not yet a later check-in
          </div>
        </div>

        <div style={styles.participantRow}>
          <div style={styles.participantTitle}>
            Departments
          </div>

          <strong style={styles.participantValue}>
            {snapshot.participation.departmentsRepresented}
          </strong>

          <div style={styles.participantDescription}>
            Departments represented in the wellbeing evidence
          </div>
        </div>
      </div>

      <div style={styles.participationLowerGrid}>
        <div style={styles.movementStatusCard}>
          <div style={styles.movementIcon}>
            {snapshot.participation.outcomeSuppressed ? "🔒" : "✓"}
          </div>

          <div>
            <p style={styles.movementLabel}>
              Participant movement
            </p>

            <h3 style={styles.movementTitle}>
              {snapshot.participation.outcomeSuppressed
                ? "Movement remains protected"
                : "Anonymous movement is available"}
            </h3>

            <p style={styles.movementText}>
              {snapshot.participation.outcomeSuppressed
                ? `Root will release organisation-level movement once at least ${snapshot.participation.privacyMinimum} people have completed both a baseline and a follow-up check-in.`
                : "The anonymous reporting threshold has been reached and Root can now show organisation-level movement."}
            </p>
          </div>
        </div>

        <div style={styles.rootParticipationComment}>
          <p style={styles.movementLabel}>
            Root comment
          </p>

          <p style={styles.rootParticipationText}>
            {snapshot.participation.baselineCompleted === 0
              ? "Participation has begun, but Root is still waiting for completed baselines before establishing an organisation-level wellbeing picture."
              : snapshot.participation.matchedParticipants === 0
              ? `Root has established a baseline from ${snapshot.participation.baselineCompleted} participant${
                  snapshot.participation.baselineCompleted === 1 ? "" : "s"
                }. Follow-up check-ins are now needed before movement can be measured.`
              : snapshot.participation.outcomeSuppressed
              ? `Participation is progressing well. ${snapshot.participation.matchedParticipants} participant${
                  snapshot.participation.matchedParticipants === 1 ? " has" : "s have"
                } completed a matched follow-up. ${
                  snapshot.participation.privacyMinimum -
                  snapshot.participation.matchedParticipants
                } more ${
                  snapshot.participation.privacyMinimum -
                    snapshot.participation.matchedParticipants ===
                  1
                    ? "matched journey is"
                    : "matched journeys are"
                } needed before anonymous movement reporting becomes available.`
              : `The anonymous reporting threshold has been reached. Root can now compare matched follow-ups with the organisation's baseline while continuing to protect individual privacy.`}
          </p>
        </div>
      </div>

      {!snapshot.participation.outcomeSuppressed && (
        <div style={styles.participantMovementResults}>
          <span>
            ↑ {snapshot.participation.improvedParticipants} improved
          </span>

          <span>
            → {snapshot.participation.stableParticipants} stable
          </span>

          <span>
            ↓ {snapshot.participation.worsenedParticipants} worsened
          </span>
        </div>
      )}
    </>
  )}
</section>

  <p style={styles.panelLabel}>Root Executive Brief</p>

  <div style={styles.briefTopLine}>
    <div>
      <h2 style={styles.briefStatus}>
        {executiveStatus.dot} {executiveStatus.label}
      </h2>
      <p style={styles.reportText}>{executiveStatus.detail}</p>
    </div>

    <button
      style={styles.reportButton}
      onClick={() => window.open("/executive-review?print=1", "_blank")}
    >
      Generate Executive Review
    </button>
  </div>

  <div style={styles.briefGrid}>
    <div style={styles.briefItem}>
      <span>Primary Concern</span>
      <strong>{primaryConcern}</strong>
    </div>

    <div style={styles.briefItem}>
      <span>Recommended Focus</span>
      <strong>{recommendedFocus}</strong>
    </div>

    <div style={styles.briefItem}>
      <span>Confidence</span>
      <strong>{confidenceLabel}</strong>
    </div>

    <div style={styles.briefItem}>
      <span>Evidence</span>
      <strong>{executiveEvidence}</strong>
    </div>
  </div>

  <button
    style={styles.secondaryButton}
    onClick={() =>
      document.getElementById("full-analysis")?.scrollIntoView({
        behavior: "smooth",
      })
    }
  >
    Jump To Board Review →
  </button>
</section>

<section style={styles.initiativeCard}>
  <p style={styles.panelLabel}>
    This Month&apos;s Recommended Initiative
  </p>

  <h2 style={styles.panelTitle}>{initiative.title}</h2>

  <p style={styles.reportText}>
    {initiative.introduction}
  </p>

  <div style={styles.initiativeGrid}>
    <div style={styles.initiativeItem}>
      <strong>Why Root recommended this</strong>
      <span>{initiative.reason}</span>
    </div>

    <div style={styles.initiativeItem}>
      <strong>Current status</strong>
      <span>{initiative.status}</span>
    </div>

    <div style={styles.initiativeItem}>
      <strong>Expected outcome</strong>
      <span>{initiative.expectedOutcome}</span>
    </div>
  </div>

  <div style={styles.launchKitCard}>
    <p style={styles.panelLabel}>Root Launch Kit</p>

    <p style={styles.panelDescription}>
      Root can prepare the practical materials HR needs to introduce this
      initiative internally.
    </p>

    <div style={styles.launchKitGrid}>
  <button
  style={styles.launchKitButton}
  onClick={() =>
    openEmployeeEmail({
      organisation,
      initiative,
    })
  }
>
  Send Employee Email
</button>

  <button
    style={styles.launchKitButton}
    onClick={() =>
      window.open(
        "/launch-kit?type=manager-briefing",
        "_self"
      )
    }
  >
    Manager Briefing
  </button>

  <button
    style={styles.launchKitButton}
    onClick={() =>
      window.open(
        "/launch-kit?type=launch-poster",
        "_self"
      )
    }
  >
    Launch Poster
  </button>

  <button
    style={styles.launchKitButton}
    onClick={() =>
      window.open(
        "/launch-kit?type=leadership-talking-points",
        "_self"
      )
    }
  >
    Leadership Talking Points
  </button>
</div>
  </div>

  <div style={styles.specialistSupportCard}>
    <p style={styles.panelLabel}>Specialist Support Available</p>

    <h3 style={styles.smallHeading}>
      {initiative.workshopTitle}
    </h3>

    <p style={styles.reportText}>
      {initiative.workshopDescription}
    </p>

    <button
      style={styles.reportButton}
      onClick={() =>
        window.open(
          `/presentation-support?initiative=${initiative.key}`,
          "_self"
        )
      }
    >
      Request Workshop Proposal
    </button>
  </div>
</section>        
              <section style={styles.heroCard}>
                <div>
                  <p style={styles.heroLabel}>Organisation Review Period</p>
                 <h2 style={styles.heroTitle}>
  {organisation?.name || "Workforce Wellbeing Review"}
</h2>
                  <p style={styles.heroText}>
  Day {daysElapsed} of {totalTrialDays}
</p>

<p style={styles.heroText}>
  {daysRemaining} days remaining
</p>

<p style={styles.heroText}>
  Review cycle progress: {Math.round(trialProgress)}%
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
  <p style={styles.panelDescription}>
  Patterns and changes that stand out in the latest workforce data.
</p>

  <p style={styles.reportText}>
    {workforceNarrative.insight}
  </p>

                    <p style={styles.panelLabel}>Executive Summary</p>
  <h2 style={styles.panelTitle}>Current organisational picture</h2>

  <p style={styles.reportText}>
    {workforceNarrative.executiveSummary}
  </p>
</section>
                  <section style={styles.reportCard}>
  <p style={styles.panelLabel}>Evidence Strength</p>
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
  Root's confidence is based on the volume and consistency of workforce data currently available.
</p>

<div style={styles.confidenceReasonList}>
  <div style={styles.confidenceReason}>
    {assessments.length} assessments analysed
  </div>

  <div style={styles.confidenceReason}>
    {supportInteractions} support interactions recorded
  </div>

  <div style={styles.confidenceReason}>
    {activated} activated users
  </div>
</div>
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

<section id="full-analysis" style={styles.weeklyReportCard}>
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

  <p style={styles.panelDescription}>
    Patterns Root has continued to observe over time.
  </p>

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
    <p style={styles.panelDescription}>
  Discussion points leadership may wish to explore.
</p>

  <h3 style={styles.smallHeading}>Questions for leadership</h3>

  <div style={styles.questionList}>
    {executiveQuestions.map((item) => (
      <div key={item} style={styles.questionItem}>
        {item}
      </div>
    ))}
  </div>
</div>
    <div style={styles.hypothesisCard}>
  <p style={styles.panelLabel}>Root Hypothesis</p>

  <p style={styles.panelDescription}>
    What Root currently suspects may be contributing to the
    workforce pattern.
  </p>

  <h3 style={styles.smallHeading}>
    What Root currently suspects
  </h3>

  <p style={styles.reportText}>
    {organisationalRecommendation.hypothesis}
  </p>
</div>

<div style={styles.confidenceCard}>
  <p style={styles.panelLabel}>
    Why Root Believes This
  </p>

  <p style={styles.panelDescription}>
    The evidence supporting Root&apos;s current assessment.
  </p>

  <h3 style={styles.smallHeading}>
    Confidence Assessment
  </h3>

  <p style={styles.reportText}>
    {organisationalRecommendation.confidence}
  </p>

  <div style={styles.confidenceReasonList}>
    {organisationalRecommendation.evidence.length > 0 ? (
      organisationalRecommendation.evidence.map((reason) => (
        <div
          key={reason}
          style={styles.confidenceReason}
        >
          {reason}
        </div>
      ))
    ) : (
      <div style={styles.confidenceReason}>
        Root is still gathering sufficient repeat evidence.
      </div>
    )}
  </div>
</div>

<div style={styles.recommendedInsightCard}>
  <p style={styles.panelLabel}>
    Recommended Insight
  </p>

  <p style={styles.panelDescription}>
    A short article selected because it relates directly to the
    current workforce theme.
  </p>

  <h3 style={styles.smallHeading}>
    {organisationalRecommendation.insight.title}
  </h3>

  <p style={styles.reportText}>
    {organisationalRecommendation.insight.reason}
  </p>

  <button
    style={styles.reportButton}
    onClick={() =>
      window.open(
        `/root-insight/${organisationalRecommendation.insight.slug}`,
        "_blank"
      )
    }
  >
    Read 5 minute insight
  </button>
</div>

<div style={styles.responsesCard}>
  <p style={styles.panelLabel}>
    Suggested Organisational Responses
  </p>

  <p style={styles.panelDescription}>
    Based on the current workforce pattern, organisations often
    explore the following approaches.
  </p>

  <div style={styles.responseGrid}>
    {organisationalRecommendation.responses.map((response) => (
      <div
        key={response.title}
        style={styles.responseItem}
      >
        <strong>{response.title}</strong>

        <p>{response.description}</p>
      </div>
    ))}
  </div>

  <button
    style={styles.reportButton}
    onClick={() => {
      const params = new URLSearchParams({
        theme:
          organisationalRecommendation.themeKey ||
          "baseline",

        confidence:
          organisationalRecommendation.confidence ||
          "Developing",

        evidence:
          organisationalRecommendation.explanation ||
          organisationalRecommendation.hypothesis ||
          "",

        organisation:
          organisation?.name || "",
      });

      window.open(
        `/explore-approaches?${params.toString()}`,
        "_self"
      );
    }}
  >
    Explore This Recommendation
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
  panelDescription: {
  margin: "0 0 14px",
  color: "#5A554D",
  fontSize: "14px",
  lineHeight: "1.6",
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
  hypothesisCard: {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(235,245,230,0.42)",
  border: "1px solid rgba(255,255,255,0.72)",
},
  confidenceCard: {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.42)",
  border: "1px solid rgba(255,255,255,0.72)",
},

confidenceReasonList: {
  display: "grid",
  gap: "12px",
  marginTop: "14px",
},

confidenceReason: {
  padding: "14px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.72)",
  lineHeight: "1.6",
  color: "#181818",
},
  executiveBrief: {
  padding: "34px",
  borderRadius: "36px",
  background: "linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))",
  border: "1px solid rgba(255,255,255,0.78)",
  marginBottom: "22px",
  boxShadow: "0 24px 70px rgba(20,18,15,0.12)",
},

briefTopLine: {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "flex-start",
  flexWrap: "wrap",
},

briefStatus: {
  margin: "0 0 8px",
  fontSize: "38px",
  color: "#181818",
  letterSpacing: "-0.04em",
},

briefGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginTop: "22px",
},

briefItem: {
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.58)",
  border: "1px solid rgba(255,255,255,0.72)",
  display: "grid",
  gap: "8px",
},

secondaryButton: {
  marginTop: "20px",
  border: "1px solid rgba(24,24,24,0.14)",
  borderRadius: "999px",
  padding: "13px 18px",
  background: "rgba(255,255,255,0.55)",
  cursor: "pointer",
  fontWeight: "800",
},
  responsesCard: {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.42)",
  border: "1px solid rgba(255,255,255,0.72)",
},

responseGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginTop: "16px",
},

responseItem: {
  padding: "18px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#181818",
  lineHeight: "1.55",
},

responseItemText: {
  margin: "8px 0 0",
  color: "#5A554D",
  lineHeight: "1.6",
},
  initiativeCard: {
  padding: "30px",
  borderRadius: "34px",
  background: "rgba(255,255,255,0.48)",
  border: "1px solid rgba(255,255,255,0.72)",
  marginBottom: "22px",
},

initiativeGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginTop: "18px",
},

initiativeItem: {
  padding: "18px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.72)",
  display: "grid",
  gap: "8px",
  color: "#181818",
  lineHeight: "1.55",
},

launchKitCard: {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(220,230,205,0.34)",
  border: "1px solid rgba(255,255,255,0.72)",
},

launchKitGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginTop: "14px",
},
  launchKitButton: {
  padding: "14px 18px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.7)",
  background: "rgba(255,255,255,0.7)",
  cursor: "pointer",
  fontWeight: "700",
  color: "#181818",
  transition: "all 0.2s ease",
},

specialistSupportCard: {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.72)",
},
 controlCentre: {
  marginBottom: 32,
  padding: 28,
  borderRadius: 28,
  background: "rgba(255,255,255,0.18)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.28)",
},

controlHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 20,
},

controlTitle: {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
},

controlText: {
  marginTop: 8,
  opacity: 0.75,
  maxWidth: 520,
},

controlButtons: {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
},

controlButton: {
  padding: "14px 20px",
  borderRadius: 18,
  border: "none",
  cursor: "pointer",
  background: "#181818",
  color: "#fff",
  fontWeight: 600,
}, 
  invitePanel: {
  marginTop: 24,
  padding: 24,
  borderRadius: 22,
  background: "rgba(255,255,255,0.12)",
},

inviteTitle: {
  marginTop: 0,
  marginBottom: 12,
},

inviteText: {
  opacity: 0.75,
  marginBottom: 16,
},

inviteBox: {
  width: "100%",
  minHeight: 220,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.25)",
  padding: 18,
  fontSize: 15,
  resize: "vertical",
},
  pilotProgressCard: {
  marginBottom: "22px",
  padding: "28px",
  borderRadius: "32px",
  background: "rgba(255,255,255,0.54)",
  border: "1px solid rgba(255,255,255,0.72)",
},

pilotProgressGrid: {
  marginTop: "18px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "14px",
},

pilotProgressItem: {
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.48)",
  border: "1px solid rgba(255,255,255,0.72)",
  display: "grid",
  gap: "8px",
},

pilotTrack: {
  marginTop: "18px",
  height: "12px",
  borderRadius: "999px",
  background: "rgba(24,24,24,0.08)",
  overflow: "hidden",
},

pilotFill: {
  height: "100%",
  borderRadius: "999px",
  background: "#181818",
},
  participantsCard: {
  marginBottom: "22px",
  padding: "30px",
  borderRadius: "32px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.68), rgba(255,255,255,0.46))",
  border: "1px solid rgba(255,255,255,0.76)",
  boxShadow: "0 20px 60px rgba(35, 29, 21, 0.08)",
},

participationHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  flexWrap: "wrap",
},

participationIntro: {
  maxWidth: "720px",
  margin: "-6px 0 0",
  color: "#5A554D",
  fontSize: "14px",
  lineHeight: "1.65",
},

participationStatusPill: {
  padding: "10px 15px",
  borderRadius: "999px",
  background: "rgba(24,24,24,0.07)",
  border: "1px solid rgba(24,24,24,0.08)",
  color: "#3F392F",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
},

participationGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
  gap: "14px",
  marginTop: "24px",
  alignItems: "stretch",
},

participantRow: {
  minHeight: "190px",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.62)",
  border: "1px solid rgba(255,255,255,0.82)",
  boxShadow: "0 12px 30px rgba(35,29,21,0.05)",
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  alignItems: "start",
},

participantTitle: {
  minHeight: "38px",
  color: "#5F574B",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: "1.35",
},

participantValue: {
  alignSelf: "center",
  display: "block",
  margin: "10px 0",
  color: "#181818",
  fontSize: "42px",
  lineHeight: "1",
  letterSpacing: "-0.04em",
},

participantDescription: {
  minHeight: "56px",
  color: "#6A6256",
  fontSize: "13px",
  lineHeight: "1.45",
},

participationLowerGrid: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
  gap: "16px",
  marginTop: "18px",
},

movementStatusCard: {
  display: "flex",
  gap: "16px",
  alignItems: "flex-start",
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(24,24,24,0.055)",
  border: "1px solid rgba(24,24,24,0.07)",
},

movementIcon: {
  width: "44px",
  height: "44px",
  flex: "0 0 44px",
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.72)",
  fontSize: "19px",
},

movementLabel: {
  margin: "0 0 7px",
  color: "#776C5B",
  fontSize: "11px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
},

movementTitle: {
  margin: "0 0 8px",
  color: "#181818",
  fontSize: "19px",
  lineHeight: "1.25",
},

movementText: {
  margin: 0,
  color: "#5A554D",
  fontSize: "14px",
  lineHeight: "1.6",
},

rootParticipationComment: {
  padding: "22px",
  borderRadius: "24px",
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.92), rgba(55,49,41,0.92))",
  color: "#FFFFFF",
},

rootParticipationText: {
  margin: 0,
  color: "rgba(255,255,255,0.84)",
  fontSize: "14px",
  lineHeight: "1.65",
},

participantMovementResults: {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "16px",
  padding: "16px 20px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.48)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#3F392F",
  fontSize: "14px",
  fontWeight: "700",
},

participantDept: {
  marginTop: "6px",
  fontSize: "13px",
  opacity: 0.7,
},

participantStatus: {
  display: "grid",
  gap: "6px",
  textAlign: "right",
},
};

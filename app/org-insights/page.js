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

  if (
    value.includes("shame") ||
    value.includes("self")
  ) {
    return "Self-Criticism";
  }

  if (
    value.includes("unclear")
  ) {
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

  const avgLoad =
    keys
      .map((key) => average(items, key))
      .filter((value) => value !== null)
      .reduce((sum, value, index, arr) => sum + value / arr.length, 0) || null;

  if (avgLoad === null) return null;

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

function MiniBar({ label, value }) {
  const percent =
    Number.isNaN(Number(value)) ? 0 : Math.min(100, Math.max(0, Number(value) * 10));

  return (
    <div style={styles.miniBarWrap}>
      <span style={styles.miniBarLabel}>{label}</span>
      <div style={styles.miniBarTrack}>
        <div style={{ ...styles.miniBarFill, width: `${percent}%` }} />
      </div>
      <span style={styles.miniBarValue}>{Number.isNaN(Number(value)) ? "—" : value}</span>
    </div>
  );
}
function LineTrendChart({ rows = [] }) {
  const width = 900;
  const height = 320;
  const padding = 46;

  const series = [
    { key: "stress", label: "Stress" },
    { key: "burnout", label: "Burnout" },
    { key: "sleep", label: "Sleep difficulty" },
    { key: "recovery", label: "Recovery difficulty" },
  ];

  const xFor = (index) =>
    padding + (index / Math.max(rows.length - 1, 1)) * (width - padding * 2);

  const yFor = (value) =>
    height - padding - (Number(value || 0) / 10) * (height - padding * 2);

  const pathFor = (key) =>
    rows
      .map((row, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command} ${xFor(index)} ${yFor(row[key])}`;
      })
      .join(" ");

  if (!rows.length) {
    return <p style={styles.empty}>No trend data recorded yet.</p>;
  }

  return (
    <div style={styles.svgChartWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.svgChart}>
        {[0, 2, 4, 6, 8, 10].map((tick) => (
          <line
            key={tick}
            x1={padding}
            x2={width - padding}
            y1={yFor(tick)}
            y2={yFor(tick)}
            stroke="rgba(24,24,24,0.08)"
            strokeWidth="1"
          />
        ))}

        {series.map((item, index) => (
          <path
            key={item.key}
            d={pathFor(item.key)}
            fill="none"
            stroke={
              ["#181818", "#6F675B", "#9B8A6A", "#C1A46B"][index]
            }
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {rows.map((row, rowIndex) =>
          series.map((item, index) => (
            <circle
              key={`${item.key}-${rowIndex}`}
              cx={xFor(rowIndex)}
              cy={yFor(row[item.key])}
              r="5"
              fill={["#181818", "#6F675B", "#9B8A6A", "#C1A46B"][index]}
            />
          ))
        )}

        {rows.map((row, index) => (
          <text
            key={row.label}
            x={xFor(index)}
            y={height - 12}
            textAnchor="middle"
            fontSize="13"
            fill="#5A554D"
          >
            {row.label}
          </text>
        ))}
      </svg>

      <div style={styles.chartLegend}>
        {series.map((item, index) => (
          <span key={item.key} style={styles.legendItem}>
            <span
              style={{
                ...styles.legendDot,
                background: ["#181818", "#6F675B", "#9B8A6A", "#C1A46B"][
                  index
                ],
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
function BarRow({ label, value, max = 10 }) {
  const percent = value === null ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

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

  const baseline = assessments.filter((item) => item.assessment_type === "baseline");
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
        (entry) =>
          entry.tool &&
          entry.tool !== "Emotional check-in"
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
    invited > 0 ? Math.round(((activated + baselineCompleted) / (invited * 2)) * 100) : null;
  
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
  const mostUsedTool = toolCounts[0]?.[0] || "No tool data yet";

  const trialStart = organisation?.trial_start ? new Date(organisation.trial_start) : null;
  const trialEnd = organisation?.trial_end ? new Date(organisation.trial_end) : null;
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
        } The most common anonymous theme is ${mostCommonTheme}. Continued use over the full trial period will give stronger evidence of direction and help identify where support should be focused next.`;

  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.header}>
            <RootEnso size={90} />
            <p style={styles.kicker}>Root Health</p>
            <h1 style={styles.title}>Organisation Insights</h1>
            <p style={styles.subtitle}>
              Anonymous wellbeing trends, engagement, support usage and early outcome movement for organisational review.
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
                  <p style={styles.heroText}>Trial progress: {Math.round(trialProgress)}%</p>
                </div>

                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${trialProgress}%` }} />
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
/>              </section>

              <section style={styles.cardGrid}>
                <MetricCard title="Employees invited" value={invited || "—"} />
                <MetricCard title="Activated" value={activated || "—"} />
                <MetricCard title="Baselines completed" value={baselineCompleted || "—"} />
                <MetricCard title="Engagement score" value={engagementScore ?? "—"} />
              </section>

             <section style={styles.panel}>
  <p style={styles.panelLabel}>Trend view</p>
  <h2 style={styles.panelTitle}>Wellbeing movement over time</h2>
  <LineTrendChart rows={trendRows} />
</section>
              <section style={styles.panel}>
  <p style={styles.panelLabel}>Trend view</p>
  <h2 style={styles.panelTitle}>Wellbeing movement over time</h2>

  <div style={styles.trendPanel}>
    {trendRows.length === 0 ? (
      <p style={styles.empty}>No trend data recorded yet.</p>
    ) : (
      trendRows.map((row) => (
        <div key={row.label} style={styles.trendRow}>
          <strong style={styles.trendLabel}>{row.label}</strong>

          <div style={styles.trendBars}>
            <MiniBar label="Stress" value={row.stress} />
            <MiniBar label="Burnout" value={row.burnout} />
            <MiniBar label="Sleep" value={row.sleep} />
            <MiniBar label="Recovery" value={row.recovery} />
          </div>
        </div>
      ))
    )}
  </div>
</section>
              <section style={styles.panel}>
                <p style={styles.panelLabel}>Chart view</p>
                <h2 style={styles.panelTitle}>Current wellbeing load</h2>

                <div style={styles.barPanel}>
                  {metricResults.map((item) => (
                    <BarRow key={item.key} label={item.label} value={item.current} />
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
                <p style={styles.panelLabel}>Automated executive summary</p>
                <h2 style={styles.panelTitle}>Draft review narrative</h2>

                <p style={styles.reportText}>{executiveInsight}</p>

                <button style={styles.reportButton}>Generate PDF soon</button>
              </section>

              <p style={styles.privacy}>
                This dashboard should only show anonymous organisation-level trends. Individual user reflections should never be visible to managers.
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

  metricRows: {
    display: "grid",
    gap: "10px",
  },

  metricRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1.3fr",
    gap: "12px",
    padding: "14px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.62)",
    color: "#2A261F",
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

  privacy: {
    textAlign: "center",
    fontSize: "13px",
    color: "#6F675B",
    lineHeight: "1.6",
  },
  trendPanel: {
  display: "grid",
  gap: "18px",
},

trendRow: {
  padding: "18px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.62)",
  border: "1px solid rgba(255,255,255,0.68)",
},

trendLabel: {
  display: "block",
  marginBottom: "14px",
  color: "#181818",
},

trendBars: {
  display: "grid",
  gap: "10px",
},

miniBarWrap: {
  display: "grid",
  gridTemplateColumns: "90px 1fr 36px",
  gap: "10px",
  alignItems: "center",
},

miniBarLabel: {
  fontSize: "13px",
  color: "#5A554D",
  fontWeight: "700",
},

miniBarTrack: {
  height: "10px",
  borderRadius: "999px",
  background: "rgba(24,24,24,0.08)",
  overflow: "hidden",
},

miniBarFill: {
  height: "100%",
  borderRadius: "999px",
  background: "#181818",
},

miniBarValue: {
  fontSize: "13px",
  color: "#181818",
  fontWeight: "800",
},
  svgChartWrap: {
  padding: "20px",
  borderRadius: "28px",
  background: "rgba(255,255,255,0.62)",
  border: "1px solid rgba(255,255,255,0.72)",
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
  marginTop: "18px",
},

legendItem: {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  color: "#4D463B",
  fontWeight: "700",
},

legendDot: {
  width: "11px",
  height: "11px",
  borderRadius: "50%",
},
};

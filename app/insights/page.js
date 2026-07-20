"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";
import { buildRootReflection } from "../../lib/rootReflectionEngine";
import { getCurrentProfileKey } from "../../lib/currentUser";

import {
  getInsightsPageModel,
} from "../../lib/rootCore/rootInsightEngine";

function countBy(items, key) {
  const counts = {};

  items.forEach((item) => {
    const value = item?.[key] || "Unknown";
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatLabel(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);

  const [bodySignals, setBodySignals] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);

  const [journey, setJourney] = useState(null);
  const [rootReflection, setRootReflection] = useState(null);

  const [rootCoreModel, setRootCoreModel] = useState(null);
  const [rootCoreError, setRootCoreError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInsights() {
      setLoading(true);
      setRootCoreError("");

      let storedJourney = null;

      try {
        const stored = localStorage.getItem(
          "root_journey_v1"
        );

        if (stored) {
          storedJourney = JSON.parse(stored);

          if (active) {
            setJourney(storedJourney);
          }
        }
      } catch (error) {
        console.error(
          "Could not read Root journey:",
          error
        );
      }

      const profileKey = getCurrentProfileKey();

      if (!profileKey) {
        if (active) {
          setLoading(false);
        }

        return;
      }

      try {
        const [
          bodyResult,
          mindResult,
          journalResult,
          rootCoreResult,
        ] = await Promise.all([
          supabase
            .from("body_signals")
            .select("*")
            .eq("profile_key", profileKey)
            .order("created_at", {
              ascending: false,
            })
            .limit(30),

          supabase
            .from("mind_entries")
            .select("*")
            .eq("profile_key", profileKey)
            .order("created_at", {
              ascending: false,
            })
            .limit(30),

          supabase
            .from("journal_entries")
            .select("*")
            .eq("profile_key", profileKey)
            .order("created_at", {
              ascending: false,
            })
            .limit(30),

          getInsightsPageModel({
            limit: 6,

            /*
             * Keep insights visible during integration testing.
             *
             * Once we are happy with the behaviour, we can
             * switch this to false and begin recording when
             * an insight has been shown.
             */
            includeRecentlyShown: true,
          }).catch((error) => {
            console.error(
              "Root Core insight error:",
              error
            );

            return {
              __rootCoreError:
                error?.message ||
                "Root Core could not build insights.",
            };
          }),
        ]);

        const nextBodySignals = Array.isArray(
          bodyResult?.data
        )
          ? bodyResult.data
          : [];

        const nextMindEntries = Array.isArray(
          mindResult?.data
        )
          ? mindResult.data
          : [];

        const nextJournalEntries = Array.isArray(
          journalResult?.data
        )
          ? journalResult.data
          : [];

        if (!active) {
          return;
        }

        setBodySignals(nextBodySignals);
        setMindEntries(nextMindEntries);
        setJournalEntries(nextJournalEntries);

        /*
         * The original reflection now runs after the data
         * has loaded, rather than against empty state arrays.
         */
        try {
          const reflection =
            buildRootReflection({
              bodySignals: nextBodySignals,

              journalEntries:
                nextJournalEntries,

              mindEntries:
                nextMindEntries,

              journey: storedJourney,
            });

          setRootReflection(reflection);
        } catch (error) {
          console.error(
            "Could not build Root reflection:",
            error
          );

          setRootReflection(null);
        }

        if (
          rootCoreResult?.__rootCoreError
        ) {
          setRootCoreModel(null);

          setRootCoreError(
            rootCoreResult.__rootCoreError
          );
        } else {
          setRootCoreModel(rootCoreResult);
          setRootCoreError("");
        }
      } catch (error) {
        console.error(
          "Could not load insights:",
          error
        );

        if (active) {
          setRootCoreError(
            "Root could not load your insight history."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInsights();

    return () => {
      active = false;
    };
  }, []);

  const insights = useMemo(() => {
    const commonSignals = countBy(
      bodySignals,
      "signal"
    );

    const commonContexts = countBy(
      bodySignals,
      "context"
    );

    const emotionalThemes = countBy(
      journalEntries,
      "emotional_theme"
    );

    const recommendedModes = countBy(
      journalEntries,
      "recommended_coach_mode"
    );

    const toolsUsed = countBy(
      mindEntries,
      "tool"
    );

    const recentBody = bodySignals[0];
    const recentJournal =
      journalEntries[0];
    const recentMind = mindEntries[0];

    let mainObservation =
      "Start adding body signals, journal reflections, and tools to build your pattern map.";

    if (
      emotionalThemes.length > 0 &&
      commonSignals.length > 0
    ) {
      mainObservation =
        `${emotionalThemes[0][0]} and ` +
        `${commonSignals[0][0]} have both shown up recently. ` +
        "That may be worth watching as a mind-body pattern.";
    } else if (
      emotionalThemes.length > 0
    ) {
      mainObservation =
        `${emotionalThemes[0][0]} has appeared in your recent reflections. ` +
        "This may be a useful place to focus next.";
    } else if (
      commonSignals.length > 0
    ) {
      mainObservation =
        `${commonSignals[0][0]} has appeared in your recent body signals. ` +
        "Tracking when it shows up may help reveal the pattern.";
    }

    let suggestedFocus =
      "Use Coach to explore what feels most relevant today.";

    if (recommendedModes.length > 0) {
      suggestedFocus =
        `${recommendedModes[0][0]} may be the most useful ` +
        "coach mode right now.";
    } else if (toolsUsed.length > 0) {
      suggestedFocus =
        `${toolsUsed[0][0]} has been used recently. ` +
        "It may be worth checking whether it helped.";
    }

    return {
      commonSignals,
      commonContexts,
      emotionalThemes,
      recommendedModes,
      toolsUsed,
      recentBody,
      recentJournal,
      recentMind,
      mainObservation,
      suggestedFocus,
    };
  }, [
    bodySignals,
    mindEntries,
    journalEntries,
  ]);

  const rootCoreInsights =
    rootCoreModel?.allInsights || [];

  const rootCoreGroups =
    rootCoreModel?.groups || {
      encouraging: [],
      attention: [],
      reflective: [],
    };

  if (loading) {
    return (
      <RootAtmosphere type="reflection">
        <Nav />

        <main style={styles.page}>
          <section style={styles.shell}>
            <div style={styles.loadingWrap}>
              <RootEnso size={72} />

              <p style={styles.loadingText}>
                Root is gathering your insights...
              </p>
            </div>
          </section>
        </main>
      </RootAtmosphere>
    );
  }

  return (
    <RootAtmosphere type="reflection">
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
            <RootEnso size={86} />
          </div>

          <h1 style={styles.title}>
            Insights
          </h1>

          <p style={styles.subtitle}>
            A gentle pattern map built from
            your body signals, mind tools,
            measurements and journal
            reflections.
          </p>

          {journey?.currentStage ===
            "insights" && (
            <div style={styles.journeyReveal}>
              <p style={styles.journeyLabel}>
                Your first Root journey
              </p>

              <h2 style={styles.journeyTitle}>
                Root is beginning to connect
                the signals from your journey.
              </h2>

              <p style={styles.journeyText}>
                Your body signals, emotional
                reflections, nervous system
                patterns and support tools are
                beginning to form a gentle
                wellbeing map.
              </p>
            </div>
          )}

          {rootReflection && (
            <div style={styles.heroCard}>
              <p style={styles.heroLabel}>
                Root reflection
              </p>

              <h2 style={styles.heroTitle}>
                {rootReflection.title}
              </h2>

              <p style={styles.heroText}>
                {rootReflection.reflection}
              </p>

              {rootReflection
                ?.suggestedAction?.href &&
                rootReflection
                  ?.suggestedAction
                  ?.title && (
                  <a
                    href={
                      rootReflection
                        .suggestedAction.href
                    }
                    style={styles.heroButton}
                  >
                    {
                      rootReflection
                        .suggestedAction.title
                    }{" "}
                    →
                  </a>
                )}
            </div>
          )}

          <RootCoreInsightSection
            model={rootCoreModel}
            groups={rootCoreGroups}
            insights={rootCoreInsights}
            error={rootCoreError}
          />

          <div style={styles.sectionDivider}>
            <span
              style={
                styles.sectionDividerLine
              }
            />

            <p
              style={
                styles.sectionDividerLabel
              }
            >
              Your wider pattern map
            </p>

            <span
              style={
                styles.sectionDividerLine
              }
            />
          </div>

          <div style={styles.grid}>
            <InsightCard
              title="Body signals"
              empty="No body signals yet."
              rows={insights.commonSignals}
            />

            <InsightCard
              title="When they show up"
              empty="No context patterns yet."
              rows={insights.commonContexts}
            />

            <InsightCard
              title="Emotional themes"
              empty="No journal themes yet."
              rows={insights.emotionalThemes}
            />

            <InsightCard
              title="Tools used"
              empty="No mind tools used yet."
              rows={insights.toolsUsed}
            />
          </div>

          <div style={styles.timelinePanel}>
            <h2 style={styles.sectionTitle}>
              Recent activity
            </h2>

            <div style={styles.timelineGrid}>
              <RecentCard
                label="Latest body signal"
                title={
                  insights.recentBody
                    ?.signal || "None yet"
                }
                meta={
                  insights.recentBody
                    ? `${
                        insights.recentBody
                          .context ||
                        "context unknown"
                      } · ${
                        insights.recentBody
                          .intensity || "?"
                      }/10 · ${formatDate(
                        insights.recentBody
                          .created_at
                      )}`
                    : "Log a body signal to begin."
                }
              />

              <RecentCard
                label="Latest mind tool"
                title={
                  insights.recentMind?.tool ||
                  "None yet"
                }
                meta={
                  insights.recentMind
                    ? `${
                        insights.recentMind
                          .emotion ||
                        "saved tool"
                      } · ${formatDate(
                        insights.recentMind
                          .created_at
                      )}`
                    : "Use a Mind & Emotions tool to build memory."
                }
              />

              <RecentCard
                label="Latest reflection"
                title={
                  insights.recentJournal
                    ?.title || "None yet"
                }
                meta={
                  insights.recentJournal
                    ? `${
                        insights.recentJournal
                          .emotional_theme ||
                        "general reflection"
                      } · ${formatDate(
                        insights.recentJournal
                          .created_at
                      )}`
                    : "Add a journal reflection to see themes."
                }
              />
            </div>
          </div>

          <div style={styles.coachCard}>
            <p style={styles.kicker}>
              Suggested next step
            </p>

            <h2 style={styles.coachTitle}>
              Take this into Coach
            </h2>

            <p style={styles.coachText}>
              {rootCoreInsights[0]
                ?.coachText ||
                rootCoreInsights[0]
                  ?.reflectiveQuestion ||
                "Ask Root Coach: “What patterns do you notice recently?” Root can use your body signals, mind tools, journal reflections and completed measurements together."}
            </p>

            <a
              href="/coach"
              style={styles.coachButton}
            >
              Open Root Coach →
            </a>
          </div>

          {journey?.currentStage ===
            "insights" && (
            <div style={styles.completePanel}>
              <p style={styles.completeLabel}>
                Root journey complete
              </p>

              <h2 style={styles.completeTitle}>
                Your Root homepage is ready.
              </h2>

              <p style={styles.completeText}>
                Root will now continue learning
                gently from your body check-ins,
                emotional reflections, nervous
                system patterns and recovery
                journey over time.
              </p>

              <a
                href="/"
                style={styles.completeButton}
                onClick={() => {
                  const updatedJourney = {
                    ...journey,

                    completedInsights: true,

                    onboardingComplete: true,

                    currentStage: "complete",
                  };

                  localStorage.setItem(
                    "root_journey_v1",
                    JSON.stringify(
                      updatedJourney
                    )
                  );

                  localStorage.setItem(
                    "root_orientation_complete_v1",
                    "true"
                  );
                }}
              >
                Enter My Root Homepage →
              </a>
            </div>
          )}
        </section>
      </main>
    </RootAtmosphere>
  );
}

function RootCoreInsightSection({
  model,
  groups,
  insights,
  error,
}) {
  const hasInsights =
    Array.isArray(insights) &&
    insights.length > 0;

  return (
    <section style={styles.rootCorePanel}>
      <div style={styles.rootCoreHeader}>
        <div>
          <p style={styles.rootCoreEyebrow}>
            Root Memory
          </p>

          <h2 style={styles.rootCoreTitle}>
            {model?.headline ||
              "What Root noticed"}
          </h2>
        </div>

        <span style={styles.liveBadge}>
          Root Core
        </span>
      </div>

      <p style={styles.rootCoreIntroduction}>
        {model?.introduction ||
          "Root is beginning to compare your recorded experiences and learn which patterns may be worth remembering."}
      </p>

      {error && (
        <div style={styles.engineNotice}>
          <strong>
            Root Core is connected.
          </strong>

          <span>
            It could not build a complete
            insight yet: {error}
          </span>
        </div>
      )}

      {!error && !hasInsights && (
        <div style={styles.learningCard}>
          <div style={styles.learningOrb}>
            <span />
          </div>

          <div>
            <h3 style={styles.learningTitle}>
              Root is still learning your
              patterns
            </h3>

            <p style={styles.learningText}>
              Complete before-and-after
              measurements when using support
              tools. As repeated observations
              build, Root will begin to notice
              what appears helpful, mixed or
              worth reviewing.
            </p>
          </div>
        </div>
      )}

      {hasInsights && (
        <div style={styles.rootCoreGroups}>
          <InsightGroup
            title="What may be helping"
            description="Personal patterns associated with improvement."
            items={groups.encouraging}
            tone="encouraging"
          />

          <InsightGroup
            title="What may need attention"
            description="Patterns Root believes may be worth exploring gently."
            items={groups.attention}
            tone="attention"
          />

          <InsightGroup
            title="Worth reflecting on"
            description="Mixed or developing patterns where context may matter."
            items={groups.reflective}
            tone="reflective"
          />
        </div>
      )}

      {model?.summary && (
        <div style={styles.engineSummary}>
          <SummaryItem
            value={
              model.summary
                .totalCompletedMeasurements ||
              0
            }
            label="Completed observations"
          />

          <SummaryItem
            value={
              model.summary.constructCount ||
              0
            }
            label="Areas observed"
          />

          <SummaryItem
            value={
              model.summary
                .interventionPatternCount ||
              0
            }
            label="Patterns considered"
          />
        </div>
      )}

      <p style={styles.safetyNote}>
        Root describes associations in your
        records. It does not diagnose or claim
        that one event caused another.
      </p>
    </section>
  );
}

function InsightGroup({
  title,
  description,
  items,
  tone,
}) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return null;
  }

  return (
    <div style={styles.insightGroup}>
      <div style={styles.insightGroupHeader}>
        <div>
          <h3
            style={styles.insightGroupTitle}
          >
            {title}
          </h3>

          <p
            style={
              styles.insightGroupDescription
            }
          >
            {description}
          </p>
        </div>

        <span
          style={{
            ...styles.groupCount,
            ...getToneStyle(tone),
          }}
        >
          {items.length}
        </span>
      </div>

      <div style={styles.insightList}>
        {items.map((insight) => (
          <RootCoreInsightCard
            key={
              insight.key ||
              insight.id ||
              insight.title
            }
            insight={insight}
            tone={tone}
          />
        ))}
      </div>
    </div>
  );
}

function RootCoreInsightCard({
  insight,
  tone,
}) {
  return (
    <details
      style={{
        ...styles.rootInsightCard,
        ...getToneBorderStyle(tone),
      }}
    >
      <summary
        style={styles.rootInsightSummary}
      >
        <div style={styles.insightSummaryText}>
          <span
            style={{
              ...styles.insightDot,
              ...getToneStyle(tone),
            }}
          />

          <span>
            <strong
              style={styles.rootInsightTitle}
            >
              {insight.title}
            </strong>

            {insight.constructLabel && (
              <span
                style={
                  styles.constructLabel
                }
              >
                {insight.constructLabel}
              </span>
            )}
          </span>
        </div>

        <span style={styles.expandMark}>
          +
        </span>
      </summary>

      <div style={styles.rootInsightBody}>
        <p style={styles.rootInsightText}>
          {insight.text}
        </p>

        {insight.reflectiveQuestion && (
          <div style={styles.reflectionPrompt}>
            <p
              style={
                styles.reflectionPromptLabel
              }
            >
              A question to consider
            </p>

            <p
              style={
                styles.reflectionPromptText
              }
            >
              {insight.reflectiveQuestion}
            </p>
          </div>
        )}

        <div style={styles.insightMetadata}>
          {insight.confidence && (
            <span style={styles.metadataPill}>
              {formatLabel(
                insight.confidence
              )}
            </span>
          )}

          {insight.evidenceCount > 0 && (
            <span style={styles.metadataPill}>
              {insight.evidenceCount}{" "}
              observation
              {insight.evidenceCount === 1
                ? ""
                : "s"}
            </span>
          )}

          {insight.interventionLabel && (
            <span style={styles.metadataPill}>
              {insight.interventionLabel}
            </span>
          )}
        </div>
      </div>
    </details>
  );
}

function SummaryItem({ value, label }) {
  return (
    <div style={styles.summaryItem}>
      <strong style={styles.summaryValue}>
        {value}
      </strong>

      <span style={styles.summaryLabel}>
        {label}
      </span>
    </div>
  );
}

function InsightCard({
  title,
  rows,
  empty,
}) {
  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>
        {title}
      </h2>

      {rows.length === 0 ? (
        <p style={styles.emptyText}>
          {empty}
        </p>
      ) : (
        rows.map(([label, count]) => (
          <div
            key={label}
            style={styles.row}
          >
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))
      )}
    </div>
  );
}

function RecentCard({
  label,
  title,
  meta,
}) {
  return (
    <div style={styles.recentCard}>
      <p style={styles.kicker}>
        {label}
      </p>

      <h3 style={styles.recentTitle}>
        {title}
      </h3>

      <p style={styles.recentMeta}>
        {meta}
      </p>
    </div>
  );
}

function getToneStyle(tone) {
  if (tone === "encouraging") {
    return {
      background:
        "rgba(119, 143, 106, 0.18)",
      color: "#53644A",
    };
  }

  if (tone === "attention") {
    return {
      background:
        "rgba(169, 121, 80, 0.17)",
      color: "#7A5131",
    };
  }

  return {
    background:
      "rgba(111, 101, 136, 0.14)",
    color: "#5F5770",
  };
}

function getToneBorderStyle(tone) {
  if (tone === "encouraging") {
    return {
      borderLeft:
        "4px solid rgba(101,126,88,0.55)",
    };
  }

  if (tone === "attention") {
    return {
      borderLeft:
        "4px solid rgba(158,105,64,0.55)",
    };
  }

  return {
    borderLeft:
      "4px solid rgba(99,88,128,0.42)",
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "24px",
  },

  shell: {
    width: "100%",
    maxWidth: "1080px",
    background:
      "rgba(255,255,255,0.24)",
    border:
      "1px solid rgba(255,255,255,0.42)",
    backdropFilter: "blur(28px)",
    borderRadius: "42px",
    padding: "38px",
    boxShadow:
      "0 30px 90px rgba(20,18,15,0.16)",
  },

  loadingWrap: {
    minHeight: "420px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "18px",
  },

  loadingText: {
    margin: 0,
    color: "#655F56",
    lineHeight: "1.7",
  },

  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "10px",
  },

  title: {
    textAlign: "center",
    fontSize: "38px",
    marginBottom: "10px",
    color: "#1A1A1A",
  },

  subtitle: {
    textAlign: "center",
    maxWidth: "720px",
    margin: "0 auto 30px",
    color: "#666",
    lineHeight: "1.7",
  },

  heroCard: {
    background:
      "linear-gradient(135deg, rgba(24,24,24,0.54), rgba(42,38,34,0.42))",
    backdropFilter: "blur(18px)",
    border:
      "1px solid rgba(255,255,255,0.18)",
    color: "#FFFFFF",
    borderRadius: "30px",
    padding: "30px",
    marginBottom: "24px",
    boxShadow:
      "0 18px 50px rgba(0,0,0,0.12)",
  },

  heroLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.13em",
    color: "rgba(255,255,255,0.68)",
    fontWeight: "800",
  },

  heroTitle: {
    margin: "0 0 12px",
    fontFamily: "Georgia, serif",
    fontSize: "31px",
    lineHeight: "1.25",
    fontWeight: "500",
  },

  heroText: {
    margin: "0",
    fontSize: "17px",
    lineHeight: "1.75",
    color: "rgba(255,255,255,0.88)",
  },

  heroButton: {
    marginTop: "18px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    background: "#181818",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "14px 20px",
    fontSize: "14px",
    fontWeight: "700",
  },

  rootCorePanel: {
    marginBottom: "28px",
    padding: "30px",
    borderRadius: "34px",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.52), rgba(245,240,232,0.30))",
    border:
      "1px solid rgba(255,255,255,0.66)",
    backdropFilter: "blur(22px)",
    boxShadow:
      "0 20px 58px rgba(31,27,22,0.10)",
  },

  rootCoreHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "18px",
    marginBottom: "12px",
  },

  rootCoreEyebrow: {
    margin: "0 0 8px",
    fontSize: "11px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color: "#776C5B",
  },

  rootCoreTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "31px",
    lineHeight: "1.25",
    fontWeight: "500",
    color: "#29251F",
  },

  liveBadge: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "8px 12px",
    background:
      "rgba(45,58,42,0.10)",
    color: "#53604E",
    fontSize: "11px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  rootCoreIntroduction: {
    margin: "0 0 22px",
    maxWidth: "760px",
    lineHeight: "1.75",
    color: "#5D574E",
  },

  engineNotice: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "18px",
    borderRadius: "20px",
    background:
      "rgba(255,249,239,0.72)",
    border:
      "1px solid rgba(151,118,78,0.20)",
    color: "#6F563D",
    lineHeight: "1.6",
  },

  learningCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "22px",
    borderRadius: "24px",
    background:
      "rgba(255,255,255,0.42)",
    border:
      "1px solid rgba(255,255,255,0.60)",
  },

  learningOrb: {
    flexShrink: 0,
    width: "56px",
    height: "56px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background:
      "rgba(78,74,66,0.08)",
    border:
      "1px solid rgba(78,74,66,0.12)",
  },

  learningTitle: {
    margin: "0 0 7px",
    color: "#29251F",
    fontSize: "19px",
  },

  learningText: {
    margin: 0,
    color: "#665F55",
    lineHeight: "1.7",
  },

  rootCoreGroups: {
    display: "grid",
    gap: "18px",
  },

  insightGroup: {
    padding: "20px",
    borderRadius: "25px",
    background:
      "rgba(255,255,255,0.30)",
    border:
      "1px solid rgba(255,255,255,0.52)",
  },

  insightGroupHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "14px",
    marginBottom: "14px",
  },

  insightGroupTitle: {
    margin: "0 0 5px",
    fontSize: "19px",
    color: "#29251F",
  },

  insightGroupDescription: {
    margin: 0,
    color: "#746D63",
    lineHeight: "1.55",
    fontSize: "14px",
  },

  groupCount: {
    minWidth: "30px",
    height: "30px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    fontSize: "12px",
    fontWeight: "800",
  },

  insightList: {
    display: "grid",
    gap: "10px",
  },

  rootInsightCard: {
    background:
      "rgba(255,255,255,0.48)",
    borderRadius: "18px",
    borderTop:
      "1px solid rgba(255,255,255,0.64)",
    borderRight:
      "1px solid rgba(255,255,255,0.64)",
    borderBottom:
      "1px solid rgba(255,255,255,0.64)",
    overflow: "hidden",
  },

  rootInsightSummary: {
    listStyle: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    padding: "17px 18px",
  },

  insightSummaryText: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },

  insightDot: {
    flexShrink: 0,
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    marginTop: "5px",
  },

  rootInsightTitle: {
    display: "block",
    color: "#2B2721",
    lineHeight: "1.45",
  },

  constructLabel: {
    display: "block",
    marginTop: "3px",
    color: "#7B746A",
    fontSize: "12px",
  },

  expandMark: {
    flexShrink: 0,
    color: "#6D665C",
    fontSize: "22px",
    fontWeight: "400",
  },

  rootInsightBody: {
    padding: "0 18px 18px 40px",
  },

  rootInsightText: {
    margin: 0,
    lineHeight: "1.72",
    color: "#575148",
  },

  reflectionPrompt: {
    marginTop: "15px",
    padding: "14px 16px",
    borderRadius: "16px",
    background:
      "rgba(55,50,44,0.05)",
  },

  reflectionPromptLabel: {
    margin: "0 0 6px",
    color: "#81796E",
    fontSize: "10px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.11em",
  },

  reflectionPromptText: {
    margin: 0,
    color: "#423D36",
    lineHeight: "1.6",
    fontStyle: "italic",
  },

  insightMetadata: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginTop: "15px",
  },

  metadataPill: {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "6px 9px",
    background:
      "rgba(48,44,39,0.06)",
    color: "#6A635A",
    fontSize: "10px",
    fontWeight: "700",
  },

  engineSummary: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    marginTop: "20px",
  },

  summaryItem: {
    padding: "14px",
    borderRadius: "17px",
    background:
      "rgba(255,255,255,0.34)",
    border:
      "1px solid rgba(255,255,255,0.52)",
  },

  summaryValue: {
    display: "block",
    marginBottom: "3px",
    color: "#302B25",
    fontSize: "20px",
  },

  summaryLabel: {
    color: "#766F65",
    fontSize: "11px",
    lineHeight: "1.4",
  },

  safetyNote: {
    margin: "18px 0 0",
    color: "#817A70",
    fontSize: "11px",
    lineHeight: "1.6",
  },

  sectionDivider: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    margin: "28px 0 20px",
  },

  sectionDividerLine: {
    height: "1px",
    flex: 1,
    background:
      "rgba(77,69,59,0.14)",
  },

  sectionDividerLabel: {
    margin: 0,
    color: "#776F64",
    fontSize: "11px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  card: {
    background:
      "rgba(255,255,255,0.22)",
    borderRadius: "28px",
    padding: "24px",
    boxShadow:
      "0 14px 40px rgba(0,0,0,0.08)",
    border:
      "1px solid rgba(255,255,255,0.34)",
    backdropFilter: "blur(18px)",
  },

  cardTitle: {
    fontSize: "20px",
    margin: "0 0 16px",
    color: "#1A1A1A",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "10px 0",
    borderBottom:
      "1px solid rgba(49,44,38,0.08)",
    color: "#333",
    textTransform: "capitalize",
  },

  emptyText: {
    color: "#777",
    lineHeight: "1.6",
  },

  timelinePanel: {
    background:
      "rgba(255,255,255,0.20)",
    borderRadius: "34px",
    padding: "30px",
    backdropFilter: "blur(20px)",
    border:
      "1px solid rgba(255,255,255,0.34)",
    boxShadow:
      "0 14px 44px rgba(0,0,0,0.08)",
    marginBottom: "24px",
  },

  sectionTitle: {
    margin: "0 0 18px",
    fontSize: "24px",
    color: "#1A1A1A",
  },

  timelineGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
  },

  recentCard: {
    background:
      "rgba(255,255,255,0.18)",
    borderRadius: "24px",
    padding: "22px",
    border:
      "1px solid rgba(255,255,255,0.28)",
    backdropFilter: "blur(14px)",
  },

  kicker: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    opacity: 0.7,
    fontWeight: "700",
  },

  recentTitle: {
    margin: "0 0 8px",
    color: "#1A1A1A",
    textTransform: "capitalize",
  },

  recentMeta: {
    margin: 0,
    color: "#666",
    lineHeight: "1.6",
  },

  coachCard: {
    background:
      "rgba(255,255,255,0.20)",
    borderRadius: "30px",
    padding: "28px",
    border:
      "1px solid rgba(255,255,255,0.34)",
    backdropFilter: "blur(18px)",
  },

  coachTitle: {
    margin: "0 0 10px",
    fontSize: "24px",
    color: "#1A1A1A",
  },

  coachText: {
    margin: "0 0 18px",
    color: "#555",
    lineHeight: "1.7",
  },

  coachButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    background: "#181818",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "13px 19px",
    fontSize: "13px",
    fontWeight: "700",
  },

  journeyReveal: {
    marginBottom: "24px",
    background:
      "rgba(24,24,24,0.44)",
    borderRadius: "34px",
    padding: "32px",
    color: "#FFFFFF",
    border:
      "1px solid rgba(255,255,255,0.16)",
    backdropFilter: "blur(18px)",
  },

  journeyLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color:
      "rgba(255,255,255,0.72)",
    fontWeight: "800",
  },

  journeyTitle: {
    margin: "0 0 14px",
    fontFamily: "Georgia, serif",
    fontSize: "34px",
    lineHeight: "1.25",
    fontWeight: "500",
  },

  journeyText: {
    margin: 0,
    lineHeight: "1.85",
    color:
      "rgba(255,255,255,0.82)",
  },

  completePanel: {
    marginTop: "24px",
    background:
      "rgba(255,255,255,0.56)",
    borderRadius: "34px",
    padding: "30px",
    border:
      "1px solid rgba(255,255,255,0.72)",
    boxShadow:
      "0 18px 48px rgba(20,18,15,0.08)",
  },

  completeLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#776C5B",
    fontWeight: "800",
  },

  completeTitle: {
    margin: "0 0 14px",
    fontFamily: "Georgia, serif",
    fontSize: "32px",
    fontWeight: "500",
    color: "#2A261F",
  },

  completeText: {
    margin: "0 0 20px",
    lineHeight: "1.8",
    color: "#4D463B",
  },

  completeButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    background: "#181818",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "14px 22px",
    fontSize: "14px",
    fontWeight: "700",
  },
};

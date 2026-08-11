"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase";
import RootEnso from "../../../components/RootEnso";

import {
  buildOrganisationSnapshot,
} from "../../../lib/rootOrganisationEngine";

import {
  buildRootTrialStatus,
} from "../../../lib/rootTrialStatus";

import {
  buildRootExecutiveMeetingContext,
} from "../../../lib/rootExecutiveMeetingContext";

import {
  buildRootExecutiveReasoning,
  buildRootMeetingCloseFrame,
} from "../../../lib/rootExecutiveReasoningEngine";

const STEPS = [
  {
    key: "preparation",
    label: "Preparation",
  },
  {
    key: "opening",
    label: "Opening",
  },
  {
    key: "discovery",
    label: "Discovery",
  },
  {
    key: "evidence",
    label: "Evidence",
  },
  {
    key: "objections",
    label: "Conversation",
  },
  {
    key: "recommendation",
    label: "Recommendation",
  },
  {
    key: "decision",
    label: "Decision",
  },
  {
    key: "close",
    label: "Close",
  },
  {
    key: "reflection",
    label: "Reflection",
  },
];

function formatPercent(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return `${Math.round(Number(value))}%`;
}

function formatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return String(value);
}

export default function FounderCompanionPage() {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    organisation,
    setOrganisation,
  ] = useState(null);

  const [
    currentMembership,
    setCurrentMembership,
  ] = useState(null);

  const [members, setMembers] =
    useState([]);

  const [
    assessments,
    setAssessments,
  ] = useState([]);

  const [
    mindEntries,
    setMindEntries,
  ] = useState([]);

  const [
    journalEntries,
    setJournalEntries,
  ] = useState([]);

  const [
    voiceSessions,
    setVoiceSessions,
  ] = useState([]);

  const [
    organisationReviews,
    setOrganisationReviews,
  ] = useState([]);

  const [
    stepIndex,
    setStepIndex,
  ] = useState(0);

  const [
    meetingType,
    setMeetingType,
  ] = useState(
    "Subscription review"
  );

  const [
    contactName,
    setContactName,
  ] = useState("");

  const [
    discoveryNotes,
    setDiscoveryNotes,
  ] = useState("");

  const [
    whatTheySaid,
    setWhatTheySaid,
  ] = useState("");

  const [
    reasoningResult,
    setReasoningResult,
  ] = useState(null);

  const [
    meetingHistory,
    setMeetingHistory,
  ] = useState([]);

  const [
    recommendation,
    setRecommendation,
  ] = useState(
    "continue"
  );

  const [
    decision,
    setDecision,
  ] = useState("");

  const [
    reflection,
    setReflection,
  ] = useState("");

  useEffect(() => {
    loadCompanion();
  }, []);

  async function loadCompanion() {
    setLoading(true);
    setError("");

    try {
      const {
        data: {
          user,
        },
        error:
          authError,
      } =
        await supabase.auth.getUser();

      if (
        authError ||
        !user
      ) {
        window.location.href =
          "/login";

        return;
      }

      const {
        data:
          membership,
        error:
          membershipError,
      } =
        await supabase
          .from(
            "organisation_members"
          )
          .select(
            `
              id,
              organisation_id,
              profile_key,
              email,
              name,
              department,
              role
            `
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (
        membershipError ||
        !membership
      ) {
        throw new Error(
          "Root could not identify your organisation membership."
        );
      }

      setCurrentMembership(
        membership
      );

      const orgId =
        membership.organisation_id;

      const [
        organisationResult,
        membersResult,
        assessmentsResult,
        mindResult,
        journalResult,
        voiceResult,
        reviewsResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "organisations"
            )
            .select("*")
            .eq(
              "id",
              orgId
            )
            .maybeSingle(),

          supabase
            .from(
              "organisation_members"
            )
            .select("*")
            .eq(
              "organisation_id",
              orgId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            ),

          supabase
            .from(
              "wellbeing_assessments"
            )
            .select("*")
            .eq(
              "organisation_id",
              orgId
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            ),

          supabase
            .from(
              "mind_entries"
            )
            .select("*")
            .eq(
              "organisation_id",
              orgId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(200),

          supabase
            .from(
              "journal_entries"
            )
            .select("*")
            .eq(
              "organisation_id",
              orgId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(200),

          supabase
            .from(
              "voice_sessions"
            )
            .select("*")
            .eq(
              "organisation_id",
              orgId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(200),

          supabase
            .from(
              "organisation_learning_reviews"
            )
            .select("*")
            .eq(
              "organisation_id",
              orgId
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            )
            .limit(24),
        ]);

      if (
        organisationResult
          .error
      ) {
        throw organisationResult.error;
      }

      if (
        assessmentsResult
          .error
      ) {
        console.error(
          "Companion assessment load error:",
          assessmentsResult.error
        );
      }

      if (
        reviewsResult
          .error
      ) {
        console.error(
          "Companion organisation review load error:",
          reviewsResult.error
        );
      }

      setOrganisation(
        organisationResult
          .data ||
          null
      );

      setMembers(
        Array.isArray(
          membersResult.data
        )
          ? membersResult.data
          : []
      );

      setAssessments(
        Array.isArray(
          assessmentsResult.data
        )
          ? assessmentsResult.data
          : []
      );

      setMindEntries(
        Array.isArray(
          mindResult.data
        )
          ? mindResult.data
          : []
      );

      setJournalEntries(
        Array.isArray(
          journalResult.data
        )
          ? journalResult.data
          : []
      );

      setVoiceSessions(
        Array.isArray(
          voiceResult.data
        )
          ? voiceResult.data
          : []
      );

      setOrganisationReviews(
        Array.isArray(
          reviewsResult.data
        )
          ? reviewsResult.data
          : []
      );
    } catch (
      loadError
    ) {
      console.error(
        "Executive Companion load error:",
        loadError
      );

      setError(
        loadError?.message ||
          "Root could not prepare the meeting evidence."
      );
    } finally {
      setLoading(false);
    }
  }

  const snapshot =
    useMemo(() => {
      return buildOrganisationSnapshot({
        organisation,
        members,
        assessments,
        mindEntries,
        journalEntries,
        voiceSessions,
        organisationReviews,
      });
    }, [
      organisation,
      members,
      assessments,
      mindEntries,
      journalEntries,
      voiceSessions,
      organisationReviews,
    ]);

  const trialStatus =
    useMemo(() => {
      return buildRootTrialStatus({
        organisation,
      });
    }, [
      organisation,
    ]);

  const meetingContext =
    useMemo(() => {
      return buildRootExecutiveMeetingContext({
        organisation,
        members,
        assessments,
        mindEntries,
        journalEntries,
        voiceSessions,
        organisationReviews,
        snapshot,
        trialStatus,
      });
    }, [
      organisation,
      members,
      assessments,
      mindEntries,
      journalEntries,
      voiceSessions,
      organisationReviews,
      snapshot,
      trialStatus,
    ]);

  const closeFrame =
    useMemo(() => {
      return buildRootMeetingCloseFrame({
        context:
          meetingContext,

        meetingHistory,
      });
    }, [
      meetingContext,
      meetingHistory,
    ]);

  const currentStep =
    STEPS[
      stepIndex
    ];

  const progress =
    Math.round(
      ((stepIndex + 1) /
        STEPS.length) *
        100
    );

  const likelyQuestions =
    meetingContext
      ?.meetingIntelligence
      ?.likelyQuestions ||
    [];

  const participation =
    meetingContext
      ?.participation ||
    {};

  const headline =
    meetingContext
      ?.meetingIntelligence
      ?.executiveHeadline ||
    {};

  const confidence =
    meetingContext
      ?.rootIntelligence
      ?.confidenceLabel ||
    "Developing";

  const organisationName =
    organisation?.name ||
    "Organisation";

  const strongestPositive =
    meetingContext
      ?.meetingIntelligence
      ?.strongestDefensiblePositive ||
    "Root is still establishing the strongest defensible positive signal.";

  const strongestConcern =
    meetingContext
      ?.meetingIntelligence
      ?.strongestDefensibleConcern ||
    "Root is still establishing the strongest organisational concern.";

  function nextStep() {
    setStepIndex(
      (current) =>
        Math.min(
          STEPS.length -
            1,
          current + 1
        )
    );
  }

  function previousStep() {
    setStepIndex(
      (current) =>
        Math.max(
          0,
          current - 1
        )
    );
  }

  function analyseStatement(
    statement =
      whatTheySaid
  ) {
    const cleaned =
      String(
        statement || ""
      ).trim();

    if (!cleaned) {
      return;
    }

    const result =
      buildRootExecutiveReasoning({
        context:
          meetingContext,

        statement:
          cleaned,

        meetingHistory,
      });

    setWhatTheySaid(
      cleaned
    );

    setReasoningResult(
      result
    );
  }

  function useLikelyQuestion(
    question
  ) {
    const text =
      question?.question ||
      "";

    setWhatTheySaid(
      text
    );

    analyseStatement(
      text
    );
  }

  function recordConcern(
    resolved
  ) {
    if (
      !reasoningResult
        ?.reasoning
    ) {
      return;
    }

    const entry = {
      id:
        `${Date.now()}-${Math.random()}`,

      createdAt:
        new Date()
          .toISOString(),

      statement:
        whatTheySaid,

      reasoning:
        reasoningResult.reasoning,

      resolved,
    };

    setMeetingHistory(
      (current) => [
        ...current,
        entry,
      ]
    );

    setWhatTheySaid(
      ""
    );

    setReasoningResult(
      null
    );
  }

  if (loading) {
    return (
      <main
        style={
          styles.loadingPage
        }
      >
        <RootEnso
          size={100}
        />

        <p>
          Root is preparing
          the case file...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={
          styles.loadingPage
        }
      >
        <RootEnso
          size={90}
        />

        <h1>
          Companion could
          not prepare the
          meeting.
        </h1>

        <p>
          {error}
        </p>
      </main>
    );
  }

  return (
    <main
      style={
        styles.page
      }
    >
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #F4EFE6;
        }

        button,
        textarea,
        input,
        select {
          font: inherit;
        }

        button {
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        button:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 1120px) {
          .companion-layout {
            grid-template-columns:
              220px minmax(0, 1fr) !important;
          }

          .companion-intelligence {
            grid-column:
              1 / -1;
          }
        }

        @media (max-width: 780px) {
          .companion-layout {
            grid-template-columns:
              1fr !important;
          }

          .companion-header {
            flex-direction:
              column !important;
            align-items:
              flex-start !important;
          }

          .companion-step-list {
            display: grid !important;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .companion-actions {
            flex-direction:
              column !important;
          }
        }
      `}</style>

      <header
        style={
          styles.header
        }
      >
        <div
          className="companion-header"
          style={
            styles.headerInner
          }
        >
          <div
            style={
              styles.brand
            }
          >
            <RootEnso
              size={48}
            />

            <div>
              <strong
                style={
                  styles.brandName
                }
              >
                ROOT
              </strong>

              <span
                style={
                  styles.brandSub
                }
              >
                Executive
                Companion
              </span>
            </div>
          </div>

          <div
            style={
              styles.headerRight
            }
          >
            <span
              style={
                styles.founderBadge
              }
            >
              Founder view
            </span>

            <a
              href="/org-insights"
              style={
                styles.exit
              }
            >
              Exit Companion
            </a>
          </div>
        </div>
      </header>

      <section
        style={
          styles.hero
        }
      >
        <div
          style={
            styles.heroInner
          }
        >
          <p
            style={
              styles.eyebrow
            }
          >
            EXECUTIVE
            INTELLIGENCE
          </p>

          <h1
            style={
              styles.heroTitle
            }
          >
            Stay present.
            <br />

            <span
              style={
                styles.heroAccent
              }
            >
              Root will carry
              the evidence.
            </span>
          </h1>

          <p
            style={
              styles.heroText
            }
          >
            {organisationName}
            {" · "}
            {confidence}
            {" confidence"}
          </p>
        </div>
      </section>

      <section
        style={
          styles.workspace
        }
      >
        <div
          className="companion-layout"
          style={
            styles.layout
          }
        >
          <aside
            style={
              styles.sidebar
            }
          >
            <p
              style={
                styles.panelLabel
              }
            >
              Meeting progress
            </p>

            <div
              style={
                styles.progressTrack
              }
            >
              <div
                style={{
                  ...styles.progressFill,

                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <div
              style={
                styles.progressMeta
              }
            >
              <strong>
                Step{" "}
                {stepIndex +
                  1}
              </strong>

              <span>
                {progress}%
              </span>
            </div>

            <div
              className="companion-step-list"
              style={
                styles.stepList
              }
            >
              {STEPS.map(
                (
                  step,
                  index
                ) => {
                  const active =
                    index ===
                    stepIndex;

                  const complete =
                    index <
                    stepIndex;

                  return (
                    <button
                      key={
                        step.key
                      }
                      type="button"
                      onClick={() =>
                        setStepIndex(
                          index
                        )
                      }
                      style={{
                        ...styles.stepButton,

                        ...(active
                          ? styles.stepButtonActive
                          : {}),
                      }}
                    >
                      <span
                        style={
                          styles.stepNumber
                        }
                      >
                        {complete
                          ? "✓"
                          : index +
                            1}
                      </span>

                      {step.label}
                    </button>
                  );
                }
              )}
            </div>

            {meetingHistory.length >
              0 && (
              <div
                style={
                  styles.historyMini
                }
              >
                <p
                  style={
                    styles.panelLabel
                  }
                >
                  Concerns heard
                </p>

                <strong>
                  {
                    meetingHistory.length
                  }
                </strong>

                <span>
                  {
                    meetingHistory.filter(
                      (item) =>
                        item.resolved
                    ).length
                  }{" "}
                  resolved
                </span>
              </div>
            )}
          </aside>

          <section
            style={
              styles.mainCard
            }
          >
            <div
              style={
                styles.stageHeader
              }
            >
              <div>
                <p
                  style={
                    styles.panelLabel
                  }
                >
                  {
                    currentStep.label
                  }
                </p>

                <span
                  style={
                    styles.stageNumber
                  }
                >
                  {String(
                    stepIndex +
                      1
                  ).padStart(
                    2,
                    "0"
                  )}
                </span>
              </div>

              <span
                style={
                  styles.meetingBadge
                }
              >
                {
                  meetingType
                }
              </span>
            </div>

            {currentStep.key ===
              "preparation" && (
              <>
                <Title>
                  Before you go
                  in.
                </Title>

                <Lead>
                  Root has already
                  read the case
                  file. You do not
                  need to remember
                  the numbers.
                </Lead>

                <div
                  style={
                    styles.formGrid
                  }
                >
                  <Field
                    label="Organisation"
                    value={
                      organisationName
                    }
                    disabled
                  />

                  <Field
                    label="Who are you speaking with?"
                    value={
                      contactName
                    }
                    onChange={
                      setContactName
                    }
                    placeholder="e.g. Sarah"
                  />

                  <label
                    style={
                      styles.field
                    }
                  >
                    <span
                      style={
                        styles.fieldLabel
                      }
                    >
                      Meeting type
                    </span>

                    <select
                      value={
                        meetingType
                      }
                      onChange={(
                        event
                      ) =>
                        setMeetingType(
                          event
                            .target
                            .value
                        )
                      }
                      style={
                        styles.input
                      }
                    >
                      <option>
                        Subscription
                        review
                      </option>

                      <option>
                        Objection
                        handling
                      </option>

                      <option>
                        Executive
                        review
                      </option>

                      <option>
                        Renewal
                        conversation
                      </option>
                    </select>
                  </label>
                </div>

                <div
                  style={
                    styles.caseHeadline
                  }
                >
                  <p
                    style={
                      styles.panelLabel
                    }
                  >
                    ROOT'S FIRST
                    IMPRESSION
                  </p>

                  <h3>
                    {
                      headline.headline
                    }
                  </h3>

                  <p>
                    {
                      headline.detail
                    }
                  </p>
                </div>

                <Quiet>
                  Today is not
                  about convincing
                  them. Find out
                  whether their
                  interpretation
                  survives their
                  own evidence.
                </Quiet>
              </>
            )}

            {currentStep.key ===
              "opening" && (
              <>
                <Title>
                  Give them the
                  floor first.
                </Title>

                <Lead>
                  Do not begin by
                  presenting Root's
                  version of the
                  trial.
                </Lead>

                <Script>
                  Good afternoon{" "}
                  {contactName ||
                    "there"}.
                  <br />
                  <br />
                  Firstly, thank
                  you for giving
                  Root the
                  opportunity to
                  work with{" "}
                  {
                    organisationName
                  }.
                  <br />
                  <br />
                  Before we look
                  at any of the
                  evidence, I'd
                  really like to
                  hear your view.
                  <br />
                  <br />
                  <strong>
                    How has the
                    experience felt
                    from your
                    perspective?
                  </strong>
                </Script>

                <Quiet>
                  Ask it. Then shut
                  up. Sherlock
                  cannot investigate
                  while David is
                  still talking.
                  🤣
                </Quiet>
              </>
            )}

            {currentStep.key ===
              "discovery" && (
              <>
                <Title>
                  Build their case
                  before answering
                  it.
                </Title>

                <Lead>
                  Capture what
                  matters to them
                  in their words,
                  not yours.
                </Lead>

                <Question>
                  What stood out to
                  you during the
                  trial?
                </Question>

                <Question>
                  Was there
                  anything you
                  expected Root to
                  show that it
                  didn't?
                </Question>

                <Question>
                  If you had one
                  concern about
                  continuing, what
                  would it be?
                </Question>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.fieldLabel
                    }
                  >
                    What are you
                    hearing?
                  </span>

                  <textarea
                    value={
                      discoveryNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setDiscoveryNotes(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="A few words are enough..."
                    style={
                      styles.textarea
                    }
                  />
                </label>
              </>
            )}

            {currentStep.key ===
              "evidence" && (
              <>
                <Title>
                  Here is the case
                  file.
                </Title>

                <Lead>
                  These are the
                  numbers Root will
                  use if the
                  conversation
                  turns towards
                  success, failure
                  or representation.
                </Lead>

                <div
                  style={
                    styles.factGrid
                  }
                >
                  <Fact
                    label="Workforce"
                    value={
                      formatNumber(
                        participation
                          .workforceDenominator
                      )
                    }
                  />

                  <Fact
                    label="Baseline"
                    value={
                      formatNumber(
                        participation
                          .baselineParticipants
                      )
                    }
                  />

                  <Fact
                    label="Repeat evidence"
                    value={
                      formatNumber(
                        participation
                          .repeatParticipants
                      )
                    }
                  />

                  <Fact
                    label="Repeat rate"
                    value={
                      formatPercent(
                        participation
                          .repeatRateFromBaseline
                      )
                    }
                  />

                  <Fact
                    label="Missing follow-ups"
                    value={
                      formatNumber(
                        participation
                          .missingFollowUps
                      )
                    }
                  />

                  <Fact
                    label="Evidence confidence"
                    value={
                      confidence
                    }
                  />
                </div>

                <div
                  style={
                    styles.splitEvidence
                  }
                >
                  <EvidenceBlock
                    label="Strongest defensible positive"
                    text={
                      strongestPositive
                    }
                    good
                  />

                  <EvidenceBlock
                    label="Strongest defensible concern"
                    text={
                      strongestConcern
                    }
                  />
                </div>

                <div
                  style={
                    styles.caseHeadline
                  }
                >
                  <p
                    style={
                      styles.panelLabel
                    }
                  >
                    INTERPRETATION
                  </p>

                  <h3>
                    {
                      participation
                        ?.participationInterpretation
                        ?.headline
                    }
                  </h3>

                  <p>
                    {
                      participation
                        ?.participationInterpretation
                        ?.meaning
                    }
                  </p>
                </div>
              </>
            )}

            {currentStep.key ===
              "objections" && (
              <>
                <Title>
                  They said
                  something.
                  Good.
                </Title>

                <Lead>
                  No canned
                  objections now.
                  Root will use
                  their words and
                  this organisation's
                  evidence.
                </Lead>

                {likelyQuestions.length >
                  0 && (
                  <div
                    style={
                      styles.predictedBox
                    }
                  >
                    <p
                      style={
                        styles.panelLabel
                      }
                    >
                      ROOT THINKS
                      THESE MAY COME
                      UP
                    </p>

                    <div
                      style={
                        styles.predictedButtons
                      }
                    >
                      {likelyQuestions.map(
                        (
                          item,
                          index
                        ) => (
                          <button
                            key={
                              `${item.key}-${index}`
                            }
                            type="button"
                            onClick={() =>
                              useLikelyQuestion(
                                item
                              )
                            }
                            style={
                              styles.predictedButton
                            }
                          >
                            {
                              item.question
                            }
                          </button>
                        )
                      )}
                    </div>

                    <span
                      style={
                        styles.microText
                      }
                    >
                      Two-finger
                      typing
                      protection
                      enabled. 🤣
                    </span>
                  </div>
                )}

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.fieldLabel
                    }
                  >
                    They said...
                  </span>

                  <textarea
                    value={
                      whatTheySaid
                    }
                    onChange={(
                      event
                    ) =>
                      setWhatTheySaid(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder={'e.g. "Burnout hasn’t really improved, has it?"'}
                    style={
                      styles.textarea
                    }
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    analyseStatement()
                  }
                  style={
                    styles.primaryButton
                  }
                >
                  Ask Root to
                  interpret →
                </button>

                {reasoningResult
                  ?.reasoning && (
                  <ReasoningPanel
                    reasoning={
                      reasoningResult.reasoning
                    }
                    onResolved={() =>
                      recordConcern(
                        true
                      )
                    }
                    onUnresolved={() =>
                      recordConcern(
                        false
                      )
                    }
                  />
                )}

                {meetingHistory.length >
                  0 && (
                  <div
                    style={
                      styles.conversationMemory
                    }
                  >
                    <p
                      style={
                        styles.panelLabel
                      }
                    >
                      CONVERSATION
                      MEMORY
                    </p>

                    {meetingHistory.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          style={
                            styles.memoryRow
                          }
                        >
                          <span>
                            {item.resolved
                              ? "✓"
                              : "○"}
                          </span>

                          <div>
                            <strong>
                              Concern{" "}
                              {index +
                                1}
                            </strong>

                            <p>
                              {
                                item.statement
                              }
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            )}

            {currentStep.key ===
              "recommendation" && (
              <>
                <Title>
                  What has this
                  conversation
                  earned?
                </Title>

                <Lead>
                  The recommendation
                  should follow the
                  evidence and the
                  concerns actually
                  discussed.
                </Lead>

                <Recommendation
                  active={
                    recommendation ===
                    "continue"
                  }
                  onClick={() =>
                    setRecommendation(
                      "continue"
                    )
                  }
                  title="Continue membership"
                  text="Continue building the longitudinal organisation picture."
                />

                <Recommendation
                  active={
                    recommendation ===
                    "evidence"
                  }
                  onClick={() =>
                    setRecommendation(
                      "evidence"
                    )
                  }
                  title="Strengthen evidence first"
                  text="Agree exactly what additional participation or context is required."
                />

                <Recommendation
                  active={
                    recommendation ===
                    "session"
                  }
                  onClick={() =>
                    setRecommendation(
                      "session"
                    )
                  }
                  title="Executive / engagement session"
                  text="Use a focused session where understanding or participation is limiting confidence."
                />

                <div
                  style={
                    styles.caseHeadline
                  }
                >
                  <p
                    style={
                      styles.panelLabel
                    }
                  >
                    CLOSE READINESS
                  </p>

                  <h3>
                    {
                      closeFrame.headline
                    }
                  </h3>

                  <p>
                    {
                      closeFrame.reason
                    }
                  </p>

                  {!closeFrame.readyToClose &&
                    closeFrame.suggestedNextQuestion && (
                      <strong>
                        Ask next:{" "}
                        {
                          closeFrame.suggestedNextQuestion
                        }
                      </strong>
                    )}
                </div>
              </>
            )}

            {currentStep.key ===
              "decision" && (
              <>
                <Title>
                  Ask for the
                  decision.
                </Title>

                <Lead>
                  Don't explain
                  what you've
                  already explained.
                </Lead>

                <div
                  style={
                    styles.decisionCard
                  }
                >
                  {closeFrame.readyToClose ? (
                    <>
                      <p>
                        {
                          closeFrame.personalisedFrame
                        }
                      </p>

                      <h3>
                        {
                          closeFrame.suggestedClose
                        }
                      </h3>
                    </>
                  ) : (
                    <>
                      <p>
                        Root thinks
                        the decision
                        has not been
                        fully earned
                        yet.
                      </p>

                      <h3>
                        {
                          closeFrame.suggestedNextQuestion
                        }
                      </h3>
                    </>
                  )}
                </div>

                <div
                  style={
                    styles.outcomes
                  }
                >
                  <Outcome
                    active={
                      decision ===
                      "yes"
                    }
                    onClick={() =>
                      setDecision(
                        "yes"
                      )
                    }
                    title="Yes"
                    text="They continue"
                  />

                  <Outcome
                    active={
                      decision ===
                      "not_yet"
                    }
                    onClick={() =>
                      setDecision(
                        "not_yet"
                      )
                    }
                    title="Not yet"
                    text="Something remains"
                  />

                  <Outcome
                    active={
                      decision ===
                      "no"
                    }
                    onClick={() =>
                      setDecision(
                        "no"
                      )
                    }
                    title="No"
                    text="Understand why"
                  />
                </div>
              </>
            )}

            {currentStep.key ===
              "close" && (
              <div
                style={
                  styles.close
                }
              >
                <p
                  style={
                    styles.panelLabel
                  }
                >
                  DECISION TIME
                </p>

                {closeFrame.readyToClose ? (
                  <>
                    <h2
                      style={
                        styles.closeTitle
                      }
                    >
                      You have
                      earned the
                      right to ask.
                    </h2>

                    <p
                      style={
                        styles.closeCopy
                      }
                    >
                      You understood
                      the concern.
                      <br />
                      You used their
                      evidence.
                      <br />
                      You made the
                      recommendation.
                    </p>

                    <div
                      style={
                        styles.windows
                      }
                    >
                      <span
                        style={
                          styles.rule
                        }
                      />

                      <p>
                        The next
                        person to
                        speak...
                        <br />

                        <strong>
                          takes the
                          windows
                          home.
                        </strong>
                      </p>

                      <span
                        style={
                          styles.rule
                        }
                      />
                    </div>

                    <h3
                      style={
                        styles.silence
                      }
                    >
                      Pause.
                      <br />
                      Don't rescue
                      the silence.
                    </h3>
                  </>
                ) : (
                  <>
                    <h2
                      style={
                        styles.closeTitle
                      }
                    >
                      Not yet.
                    </h2>

                    <p
                      style={
                        styles.closeCopy
                      }
                    >
                      Root still sees
                      something
                      unresolved.
                    </p>

                    <div
                      style={
                        styles.windows
                      }
                    >
                      <p>
                        {
                          closeFrame.suggestedNextQuestion
                        }
                      </p>
                    </div>
                  </>
                )}

                <div
                  style={
                    styles.fearNaught
                  }
                >
                  <RootEnso
                    size={42}
                  />

                  Fear Naught.
                </div>
              </div>
            )}

            {currentStep.key ===
              "reflection" && (
              <>
                <Title>
                  What did Root
                  learn?
                </Title>

                <Lead>
                  We will use this
                  conversation when
                  we build the
                  Executive Record
                  next.
                </Lead>

                <div
                  style={
                    styles.reflectionSummary
                  }
                >
                  <span>
                    Outcome
                  </span>

                  <strong>
                    {decision ===
                    "yes"
                      ? "Continued"
                      : decision ===
                        "no"
                      ? "Did not continue"
                      : decision ===
                        "not_yet"
                      ? "Decision delayed"
                      : "Not recorded"}
                  </strong>
                </div>

                <div
                  style={
                    styles.reflectionSummary
                  }
                >
                  <span>
                    Concerns
                    explored
                  </span>

                  <strong>
                    {
                      meetingHistory.length
                    }
                  </strong>
                </div>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.fieldLabel
                    }
                  >
                    What did you
                    learn today?
                  </span>

                  <textarea
                    value={
                      reflection
                    }
                    onChange={(
                      event
                    ) =>
                      setReflection(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="A few words are enough..."
                    style={{
                      ...styles.textarea,
                      minHeight:
                        "170px",
                    }}
                  />
                </label>

                <Quiet>
                  Win, lose or
                  delay — preserve
                  the reasoning.
                  Next time Root
                  should know where
                  this conversation
                  left off.
                </Quiet>
              </>
            )}

            <div
              className="companion-actions"
              style={
                styles.actions
              }
            >
              <button
                type="button"
                disabled={
                  stepIndex ===
                  0
                }
                onClick={
                  previousStep
                }
                style={{
                  ...styles.secondaryButton,

                  opacity:
                    stepIndex ===
                    0
                      ? 0.35
                      : 1,
                }}
              >
                ← Previous
              </button>

              {stepIndex <
                STEPS.length -
                  1 && (
                <button
                  type="button"
                  onClick={
                    nextStep
                  }
                  style={
                    styles.primaryButton
                  }
                >
                  Continue →
                </button>
              )}
            </div>
          </section>

          <aside
            className="companion-intelligence"
            style={
              styles.intelligence
            }
          >
            <p
              style={
                styles.panelLabel
              }
            >
              ROOT BESIDE YOU
            </p>

            <h2
              style={
                styles.orgName
              }
            >
              {organisationName}
            </h2>

            <Intel
              label="Trial"
              value={
                trialStatus?.label ||
                "—"
              }
            />

            <Intel
              label="Workforce"
              value={
                formatNumber(
                  participation
                    .workforceDenominator
                )
              }
            />

            <Intel
              label="Baseline"
              value={
                formatNumber(
                  participation
                    .baselineParticipants
                )
              }
            />

            <Intel
              label="Repeat"
              value={
                formatNumber(
                  participation
                    .repeatParticipants
                )
              }
            />

            <Intel
              label="Repeat rate"
              value={
                formatPercent(
                  participation
                    .repeatRateFromBaseline
                )
              }
            />

            <Intel
              label="Confidence"
              value={
                confidence
              }
            />

            <div
              style={
                styles.watch
              }
            >
              <p
                style={
                  styles.panelLabelLight
                }
              >
                ROOT'S WATCHPOINT
              </p>

              <strong>
                {
                  headline.headline
                }
              </strong>

              <p>
                {
                  meetingContext
                    ?.meetingIntelligence
                    ?.caution
                }
              </p>
            </div>

            <div
              style={
                styles.rootWhisper
              }
            >
              <RootEnso
                size={36}
              />

              <p>
                Listen first.
                <br />
                Evidence second.
                <br />
                Close last.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ReasoningPanel({
  reasoning,
  onResolved,
  onUnresolved,
}) {
  return (
    <div
      style={
        styles.reasoningPanel
      }
    >
      <p
        style={
          styles.reasoningHeader
        }
      >
        ROOT HAS READ THE
        EVIDENCE
      </p>

      <Reason
        number="01"
        label="You said"
      >
        “
        {
          reasoning.originalStatement
        }
        ”
      </Reason>

      <Reason
        number="02"
        label="What your evidence actually shows"
      >
        {reasoning.evidence?.length ? (
          <div
            style={
              styles.evidenceLines
            }
          >
            {reasoning.evidence.map(
              (
                line,
                index
              ) => (
                <p
                  key={
                    index
                  }
                >
                  {line}
                </p>
              )
            )}
          </div>
        ) : (
          "Root does not have enough measured evidence to quantify this point."
        )}
      </Reason>

      {reasoning
        .supportingFacts
        ?.length >
        0 && (
        <div
          style={
            styles.supportFacts
          }
        >
          {reasoning.supportingFacts.map(
            (
              fact,
              index
            ) => (
              <div
                key={
                  `${fact.label}-${index}`
                }
              >
                <span>
                  {
                    fact.label
                  }
                </span>

                <strong>
                  {
                    fact.value
                  }
                </strong>
              </div>
            )
          )}
        </div>
      )}

      <Reason
        number="03"
        label="What that means"
        dark
      >
        {
          reasoning.interpretation
        }
      </Reason>

      <Reason
        number="04"
        label="What it does not mean"
      >
        {
          reasoning.doesNotMean
        }
      </Reason>

      <Reason
        number="05"
        label="Ask permission"
        quote
      >
        {
          reasoning.permission
        }
      </Reason>

      <Reason
        number="06"
        label="How I would answer"
        quote
        accent
      >
        {
          reasoning.suggestedResponse
        }
      </Reason>

      <Reason
        number="07"
        label="Best question back"
        quote
      >
        {
          reasoning.questionBack
        }
      </Reason>

      <Reason
        number="08"
        label="What this may mean commercially"
      >
        {
          reasoning.commercialImplication
        }
      </Reason>

      <div
        style={
          styles.resolutionBox
        }
      >
        <div>
          <p
            style={
              styles.panelLabel
            }
          >
            AFTER THEIR RESPONSE
          </p>

          <strong>
            Did that resolve the
            concern?
          </strong>
        </div>

        <div
          style={
            styles.resolutionButtons
          }
        >
          <button
            type="button"
            onClick={
              onResolved
            }
            style={
              styles.resolvedButton
            }
          >
            ✓ Yes
          </button>

          <button
            type="button"
            onClick={
              onUnresolved
            }
            style={
              styles.unresolvedButton
            }
          >
            ○ Not yet
          </button>
        </div>
      </div>
    </div>
  );
}

function Title({
  children,
}) {
  return (
    <h2
      style={
        styles.title
      }
    >
      {children}
    </h2>
  );
}

function Lead({
  children,
}) {
  return (
    <p
      style={
        styles.lead
      }
    >
      {children}
    </p>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}) {
  return (
    <label
      style={
        styles.field
      }
    >
      <span
        style={
          styles.fieldLabel
        }
      >
        {label}
      </span>

      <input
        value={
          value || ""
        }
        disabled={
          disabled
        }
        onChange={(
          event
        ) =>
          onChange?.(
            event.target
              .value
          )
        }
        placeholder={
          placeholder
        }
        style={
          styles.input
        }
      />
    </label>
  );
}

function Script({
  children,
}) {
  return (
    <div
      style={
        styles.script
      }
    >
      <p
        style={
          styles.panelLabelLight
        }
      >
        SAY IT YOUR WAY
      </p>

      <div>
        {children}
      </div>
    </div>
  );
}

function Quiet({
  children,
}) {
  return (
    <div
      style={
        styles.quiet
      }
    >
      <RootEnso
        size={32}
      />

      <p>
        {children}
      </p>
    </div>
  );
}

function Question({
  children,
}) {
  return (
    <div
      style={
        styles.question
      }
    >
      <span>?</span>

      <p>
        {children}
      </p>
    </div>
  );
}

function Fact({
  label,
  value,
}) {
  return (
    <div
      style={
        styles.fact
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function EvidenceBlock({
  label,
  text,
  good = false,
}) {
  return (
    <div
      style={{
        ...styles.evidenceBlock,

        ...(good
          ? styles.evidenceBlockGood
          : {}),
      }}
    >
      <span>
        {label}
      </span>

      <p>
        {text}
      </p>
    </div>
  );
}

function Reason({
  number,
  label,
  children,
  dark = false,
  accent = false,
  quote = false,
}) {
  return (
    <div
      style={{
        ...styles.reason,

        ...(dark
          ? styles.reasonDark
          : {}),

        ...(accent
          ? styles.reasonAccent
          : {}),
      }}
    >
      <div
        style={
          styles.reasonTop
        }
      >
        <span>
          {number}
        </span>

        <strong>
          {label}
        </strong>
      </div>

      <div
        style={{
          ...styles.reasonBody,

          ...(quote
            ? styles.reasonQuote
            : {}),
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Recommendation({
  active,
  onClick,
  title,
  text,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      style={{
        ...styles.recommendation,

        ...(active
          ? styles.recommendationActive
          : {}),
      }}
    >
      <span>
        {active
          ? "✓"
          : "○"}
      </span>

      <div>
        <strong>
          {title}
        </strong>

        <p>
          {text}
        </p>
      </div>
    </button>
  );
}

function Outcome({
  active,
  onClick,
  title,
  text,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      style={{
        ...styles.outcome,

        ...(active
          ? styles.outcomeActive
          : {}),
      }}
    >
      <strong>
        {title}
      </strong>

      <span>
        {text}
      </span>
    </button>
  );
}

function Intel({
  label,
  value,
}) {
  return (
    <div
      style={
        styles.intel
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F4EFE6",
    color: "#172018",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
  },

  loadingPage: {
    minHeight: "100vh",
    background: "#F4EFE6",
    color: "#465346",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: "18px",
    padding: "30px",
    textAlign: "center",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background:
      "rgba(244,239,230,0.9)",
    borderBottom:
      "1px solid rgba(38,52,39,0.08)",
    backdropFilter:
      "blur(22px)",
  },

  headerInner: {
    width: "100%",
    maxWidth: "1420px",
    minHeight: "80px",
    margin: "0 auto",
    padding: "14px 28px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  brandName: {
    display: "block",
    fontSize: "13px",
    letterSpacing: "0.17em",
  },

  brandSub: {
    display: "block",
    marginTop: "3px",
    color: "#657064",
    fontSize: "11px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  founderBadge: {
    padding: "8px 11px",
    borderRadius: "999px",
    background:
      "rgba(76,103,75,0.1)",
    color: "#52664F",
    fontSize: "10px",
    fontWeight: "900",
    textTransform:
      "uppercase",
  },

  exit: {
    color: "#485448",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "800",
  },

  hero: {
    padding:
      "58px 28px 44px",
    background:
      "radial-gradient(circle at 76% 26%, rgba(121,151,115,0.20), transparent 30%), linear-gradient(145deg, #F5F0E7 0%, #E8EEE4 100%)",
  },

  heroInner: {
    width: "100%",
    maxWidth: "1420px",
    margin: "0 auto",
  },

  eyebrow: {
    margin: "0 0 14px",
    color: "#5F705B",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  heroTitle: {
    margin: 0,
    maxWidth: "950px",
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(43px, 5.7vw, 76px)",
    fontWeight: "500",
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
  },

  heroAccent: {
    color: "#526D55",
  },

  heroText: {
    margin: "20px 0 0",
    color: "#5B665B",
    fontSize: "16px",
  },

  workspace: {
    padding: "28px",
  },

  layout: {
    width: "100%",
    maxWidth: "1420px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "220px minmax(0, 1fr) 300px",
    gap: "18px",
    alignItems: "start",
  },

  sidebar: {
    position: "sticky",
    top: "102px",
    padding: "22px",
    borderRadius: "26px",
    background:
      "rgba(255,255,255,0.55)",
    border:
      "1px solid rgba(255,255,255,0.86)",
    boxShadow:
      "0 18px 50px rgba(41,55,40,0.06)",
  },

  panelLabel: {
    margin: "0 0 12px",
    color: "#71806F",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "0.14em",
    textTransform:
      "uppercase",
  },

  panelLabelLight: {
    margin: "0 0 12px",
    color:
      "rgba(255,255,255,0.52)",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "0.14em",
    textTransform:
      "uppercase",
  },

  progressTrack: {
    height: "6px",
    overflow: "hidden",
    borderRadius: "999px",
    background:
      "rgba(61,82,59,0.09)",
  },

  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "#526D55",
    transition:
      "width 300ms ease",
  },

  progressMeta: {
    marginTop: "9px",
    display: "flex",
    justifyContent:
      "space-between",
    color: "#667164",
    fontSize: "10px",
  },

  stepList: {
    marginTop: "22px",
    display: "grid",
    gap: "7px",
  },

  stepButton: {
    width: "100%",
    padding: "10px",
    border: "none",
    borderRadius: "15px",
    background: "transparent",
    color: "#657064",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "700",
  },

  stepButtonActive: {
    background: "#263B2B",
    color: "#FFFFFF",
    boxShadow:
      "0 12px 28px rgba(38,59,43,0.16)",
  },

  stepNumber: {
    width: "24px",
    height: "24px",
    display: "grid",
    placeItems: "center",
    borderRadius: "999px",
    background:
      "rgba(105,124,103,0.10)",
    fontSize: "9px",
    fontWeight: "900",
  },

  historyMini: {
    marginTop: "22px",
    paddingTop: "18px",
    borderTop:
      "1px solid rgba(50,68,49,0.08)",
    display: "grid",
    gap: "5px",
    color: "#536153",
  },

  mainCard: {
    minHeight: "720px",
    padding: "36px",
    borderRadius: "32px",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.74), rgba(248,245,238,0.75))",
    border:
      "1px solid rgba(255,255,255,0.9)",
    boxShadow:
      "0 26px 76px rgba(40,54,39,0.09)",
  },

  stageHeader: {
    marginBottom: "30px",
    paddingBottom: "20px",
    borderBottom:
      "1px solid rgba(51,66,50,0.08)",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
  },

  stageNumber: {
    color: "#A0A99E",
    fontFamily:
      "Georgia, serif",
    fontSize: "24px",
  },

  meetingBadge: {
    padding: "9px 12px",
    borderRadius: "999px",
    background:
      "rgba(76,103,75,0.08)",
    color: "#52644F",
    fontSize: "10px",
    fontWeight: "900",
  },

  title: {
    margin: 0,
    maxWidth: "760px",
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(35px, 4vw, 53px)",
    fontWeight: "500",
    lineHeight: 1.08,
    letterSpacing: "-0.04em",
  },

  lead: {
    maxWidth: "720px",
    margin: "17px 0 28px",
    color: "#606961",
    fontSize: "16px",
    lineHeight: 1.75,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "13px",
  },

  field: {
    display: "grid",
    gap: "8px",
    marginBottom: "16px",
  },

  fieldLabel: {
    color: "#667164",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.09em",
    textTransform:
      "uppercase",
  },

  input: {
    width: "100%",
    minHeight: "50px",
    padding: "12px 14px",
    border:
      "1px solid rgba(47,66,47,0.11)",
    borderRadius: "15px",
    outline: "none",
    background:
      "rgba(255,255,255,0.72)",
    color: "#263026",
  },

  textarea: {
    width: "100%",
    minHeight: "125px",
    padding: "15px",
    border:
      "1px solid rgba(47,66,47,0.11)",
    borderRadius: "18px",
    outline: "none",
    resize: "vertical",
    background:
      "rgba(255,255,255,0.74)",
    color: "#263026",
    lineHeight: 1.65,
  },

  caseHeadline: {
    marginTop: "22px",
    padding: "25px",
    borderRadius: "23px",
    background:
      "linear-gradient(145deg, #E5EDDF, #F6F2EA)",
    border:
      "1px solid rgba(74,99,72,0.11)",
  },

  script: {
    marginTop: "24px",
    padding: "28px",
    borderRadius: "25px",
    background: "#263B2B",
    color: "#FFFFFF",
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(19px, 2vw, 24px)",
    lineHeight: 1.6,
  },

  quiet: {
    marginTop: "22px",
    padding: "17px 19px",
    borderRadius: "19px",
    background:
      "rgba(229,236,224,0.72)",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    color: "#596456",
    fontSize: "13px",
  },

  question: {
    marginBottom: "9px",
    padding: "16px 18px",
    borderRadius: "18px",
    background:
      "rgba(255,255,255,0.58)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#3D493C",
    fontFamily:
      "Georgia, serif",
    fontSize: "17px",
  },

  factGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "10px",
  },

  fact: {
    padding: "18px",
    borderRadius: "19px",
    background:
      "rgba(255,255,255,0.58)",
    display: "grid",
    gap: "12px",
  },

  splitEvidence: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "12px",
  },

  evidenceBlock: {
    padding: "20px",
    borderRadius: "20px",
    background: "#F3EDE3",
  },

  evidenceBlockGood: {
    background: "#E4EDDF",
  },

  predictedBox: {
    marginBottom: "20px",
    padding: "20px",
    borderRadius: "21px",
    background:
      "rgba(229,236,224,0.72)",
  },

  predictedButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },

  predictedButton: {
    padding: "10px 12px",
    border:
      "1px solid rgba(61,86,60,0.12)",
    borderRadius: "999px",
    background:
      "rgba(255,255,255,0.70)",
    color: "#41513F",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "800",
  },

  microText: {
    display: "block",
    marginTop: "12px",
    color: "#748071",
    fontSize: "9px",
  },

  primaryButton: {
    minHeight: "50px",
    padding: "13px 20px",
    border: "none",
    borderRadius: "16px",
    background: "#263B2B",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "900",
  },

  secondaryButton: {
    minHeight: "50px",
    padding: "13px 18px",
    border:
      "1px solid rgba(49,67,49,0.11)",
    borderRadius: "16px",
    background:
      "rgba(255,255,255,0.54)",
    color: "#4D594C",
    cursor: "pointer",
    fontWeight: "800",
  },

  reasoningPanel: {
    marginTop: "24px",
    paddingTop: "24px",
    borderTop:
      "1px solid rgba(51,69,51,0.09)",
  },

  reasoningHeader: {
    color: "#52684F",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  reason: {
    marginTop: "10px",
    padding: "19px 21px",
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.62)",
    border:
      "1px solid rgba(58,76,57,0.08)",
  },

  reasonDark: {
    background: "#293D2D",
    color: "#FFFFFF",
  },

  reasonAccent: {
    background: "#E1EBDD",
  },

  reasonTop: {
    display: "flex",
    gap: "11px",
    fontSize: "9px",
    letterSpacing: "0.09em",
    textTransform:
      "uppercase",
    opacity: 0.7,
  },

  reasonBody: {
    marginTop: "11px",
    fontSize: "14px",
    lineHeight: 1.72,
  },

  reasonQuote: {
    fontFamily:
      "Georgia, serif",
    fontSize: "17px",
  },

  evidenceLines: {
    display: "grid",
    gap: "8px",
  },

  supportFacts: {
    marginTop: "10px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "8px",
  },

  resolutionBox: {
    marginTop: "14px",
    padding: "20px",
    borderRadius: "20px",
    background:
      "rgba(231,237,226,0.76)",
    display: "flex",
    justifyContent:
      "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },

  resolutionButtons: {
    display: "flex",
    gap: "8px",
  },

  resolvedButton: {
    padding: "11px 14px",
    border: "none",
    borderRadius: "14px",
    background: "#526D55",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "900",
  },

  unresolvedButton: {
    padding: "11px 14px",
    border:
      "1px solid rgba(62,81,61,0.13)",
    borderRadius: "14px",
    background: "#FFFFFF",
    color: "#526052",
    cursor: "pointer",
    fontWeight: "900",
  },

  conversationMemory: {
    marginTop: "24px",
    padding: "20px",
    borderRadius: "21px",
    background:
      "rgba(255,255,255,0.55)",
  },

  memoryRow: {
    padding: "10px 0",
    display: "flex",
    gap: "10px",
    borderBottom:
      "1px solid rgba(50,68,49,0.06)",
  },

  recommendation: {
    width: "100%",
    marginBottom: "9px",
    padding: "18px",
    border:
      "1px solid rgba(55,75,54,0.09)",
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.54)",
    display: "grid",
    gridTemplateColumns:
      "30px 1fr",
    gap: "12px",
    textAlign: "left",
    cursor: "pointer",
  },

  recommendationActive: {
    background: "#E1EBDD",
  },

  decisionCard: {
    padding: "28px",
    borderRadius: "25px",
    background: "#263B2B",
    color: "#FFFFFF",
    textAlign: "center",
  },

  outcomes: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
  },

  outcome: {
    padding: "18px",
    border:
      "1px solid rgba(52,71,51,0.09)",
    borderRadius: "18px",
    background:
      "rgba(255,255,255,0.58)",
    display: "grid",
    gap: "6px",
    cursor: "pointer",
  },

  outcomeActive: {
    background: "#E2ECDF",
  },

  close: {
    textAlign: "center",
    padding: "18px 0",
  },

  closeTitle: {
    margin: 0,
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(40px, 5vw, 58px)",
    fontWeight: "500",
  },

  closeCopy: {
    color: "#636C63",
    lineHeight: 1.8,
  },

  windows: {
    maxWidth: "590px",
    margin: "34px auto",
    padding: "30px",
    borderRadius: "26px",
    background: "#263B2B",
    color: "#FFFFFF",
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(24px, 3.2vw, 36px)",
    lineHeight: 1.4,
  },

  rule: {
    display: "block",
    height: "1px",
    background:
      "rgba(255,255,255,0.18)",
  },

  silence: {
    color: "#4E5D4D",
    fontFamily:
      "Georgia, serif",
    fontSize: "22px",
    lineHeight: 1.7,
  },

  fearNaught: {
    marginTop: "24px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    color: "#697367",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.1em",
    textTransform:
      "uppercase",
  },

  reflectionSummary: {
    marginBottom: "10px",
    padding: "18px",
    borderRadius: "18px",
    background: "#E4ECDF",
    display: "flex",
    justifyContent:
      "space-between",
  },

  actions: {
    marginTop: "34px",
    paddingTop: "22px",
    borderTop:
      "1px solid rgba(53,70,52,0.08)",
    display: "flex",
    justifyContent:
      "space-between",
    gap: "12px",
  },

  intelligence: {
    position: "sticky",
    top: "102px",
    padding: "24px",
    borderRadius: "26px",
    background:
      "rgba(255,255,255,0.56)",
    border:
      "1px solid rgba(255,255,255,0.88)",
    boxShadow:
      "0 18px 50px rgba(41,55,40,0.06)",
  },

  orgName: {
    margin: "0 0 20px",
    fontFamily:
      "Georgia, serif",
    fontSize: "26px",
    fontWeight: "500",
  },

  intel: {
    padding: "11px 0",
    borderBottom:
      "1px solid rgba(50,68,49,0.07)",
    display: "grid",
    gap: "4px",
  },

  watch: {
    marginTop: "18px",
    padding: "18px",
    borderRadius: "19px",
    background: "#263B2B",
    color: "#FFFFFF",
    fontSize: "12px",
    lineHeight: 1.65,
  },

  rootWhisper: {
    marginTop: "17px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#6D766B",
    fontFamily:
      "Georgia, serif",
    fontSize: "12px",
  },
};
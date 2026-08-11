"use client";

import {
  useMemo,
  useState,
} from "react";

import RootEnso from "../../../components/RootEnso";

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
    label: "Objections",
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

const OBJECTIONS = {
  participation: {
    label: "Participation was too low",

    evidence:
      "Current participation should be separated from programme effectiveness. A lower follow-up rate reduces confidence in organisation-wide conclusions, but it does not automatically mean the employees who used Root failed to benefit.",

    interpretation:
      "The useful question is not simply how many people did not return. It is whether repeat participants changed, whether engagement varied by team, and whether the missing follow-up evidence could materially alter the organisation picture.",

    permission:
      "Would it be useful if I showed you what the current participation does — and does not — allow us to conclude?",

    response:
      "I think that concern is completely reasonable. The important distinction is between evidence of failure and incomplete evidence. Root is deliberately cautious here. Where follow-up participation is lower, confidence comes down rather than Root pretending the result represents everybody.",

    question:
      "What do you think was the biggest reason people did not come back for the follow-up assessment?",

    opportunity:
      "If understanding, trust or confidence in using Root limited participation, a short employee re-engagement session may strengthen the next evidence period.",
  },

  no_change: {
    label: "The headline score did not improve",

    evidence:
      "An unchanged headline can conceal movement underneath it. Repeat participation, team mix and the number of employees represented at each measurement point need to be checked before treating an unchanged percentage as evidence of no improvement.",

    interpretation:
      "If the initial assessment included 60 people but only 20 completed a follow-up, the two headline figures are not necessarily describing the same population. Root should not call that success or failure without checking who actually contributed to each figure.",

    permission:
      "Can I unpack that number for a moment? There is an important difference between 'the score did not move' and 'the evidence shows nothing changed.'",

    response:
      "The headline is useful, but I would not make the decision from that number alone. We need to look at repeat responders, participation and whether the people who returned show a consistent direction of travel. Root deliberately reports uncertainty where those populations differ.",

    question:
      "Would your view change if the repeat-participant evidence was improving but the organisation-wide follow-up sample was still too small to confirm it?",

    opportunity:
      "Increase repeat participation before making a stronger organisation-wide conclusion.",
  },

  cost: {
    label: "The cost feels difficult to justify",

    evidence:
      "The commercial question should be connected to what Root has actually created: employee support, organisational evidence, executive interpretation and the ability to observe movement over time.",

    interpretation:
      "A price objection can mean several different things: insufficient perceived value, lack of budget, uncertainty about evidence, or inability to explain the purchase internally. Those require different conversations.",

    permission:
      "That's fair. Before I try to answer the cost point, may I ask what part feels hardest to justify?",

    response:
      "I would rather understand the concern than defend the price. If the issue is that Root has not demonstrated enough value, that is different from Root demonstrating value but the budget not being available.",

    question:
      "Is the concern primarily the amount itself, or whether you have enough evidence to defend continuing internally?",

    opportunity:
      "Clarify whether the objection is value, budget, timing or internal approval before recommending a next step.",
  },

  trust: {
    label: "Employees may not trust it",

    evidence:
      "Participation alone cannot tell us why an employee did not use Root. Possible explanations include awareness, competing priorities, confidence, trust, local communication and organisational circumstances.",

    interpretation:
      "Root should never convert non-participation into an unsupported claim about employee trust. It can identify the evidence gap and help the organisation investigate it.",

    permission:
      "Would you mind if we separate what we know from what we suspect here?",

    response:
      "Trust could absolutely be part of it, but the current evidence does not prove that. I would be uncomfortable telling you it does. What we can say is that participation gives us an opportunity to understand the barriers more clearly.",

    question:
      "What were employees actually told about privacy, anonymity and how their information would be used?",

    opportunity:
      "Consider a short trust, privacy and 'how Root works' session if communication appears to be a barrier.",
  },

  privacy: {
    label: "I am worried about employee privacy",

    evidence:
      "Root's organisational intelligence is designed around anonymous organisation-level evidence rather than exposing private employee conversations, reflections or health information.",

    interpretation:
      "A privacy concern is not an objection to overcome quickly. It deserves a clear explanation of separation between private employee support and organisational evidence.",

    permission:
      "Absolutely — may I explain exactly what leadership can and cannot see?",

    response:
      "The employee side and organisation side are deliberately separated. Leadership receives organisation-level patterns and evidence. Private conversations and personal reflections are not provided to the employer.",

    question:
      "Is there a particular type of employee information you are concerned the organisation might be able to see?",

    opportunity:
      "Offer a privacy and governance walkthrough rather than trying to reassure with general statements.",
  },

  managers: {
    label: "Managers did not really use it",

    evidence:
      "Manager engagement can influence communication, participation and whether organisational learning is acted upon, but low manager activity should not automatically be treated as evidence that employee support failed.",

    interpretation:
      "The issue may be adoption rather than product value. The next question is whether managers understood their role in the Root programme.",

    permission:
      "Can I explore the manager side separately from the employee evidence?",

    response:
      "That is worth looking at. Root does not require managers to become wellbeing experts, but they do need to understand what the programme is for and how to support participation appropriately.",

    question:
      "How were managers introduced to Root, and what were they expected to do during the pilot?",

    opportunity:
      "A manager briefing may improve programme understanding without asking managers to handle private employee wellbeing information.",
  },

  approval: {
    label: "I need approval from someone else",

    evidence:
      "This usually means the conversation has moved from product understanding to internal decision support.",

    interpretation:
      "Do not push for an artificial decision. Identify who needs confidence, what evidence they will need, and what objection is likely to appear when the proposal reaches them.",

    permission:
      "Of course. Would it help if we worked out what they are most likely to want to see before you take it to them?",

    response:
      "Rather than send you away with another generic brochure, I would rather make sure you have the evidence and explanation you need to have that conversation confidently.",

    question:
      "Who needs to be comfortable with the decision, and what do you think their first question will be?",

    opportunity:
      "Prepare a concise board or executive decision brief using the organisation's own evidence.",
  },

  wait: {
    label: "We would rather wait",

    evidence:
      "Waiting may be sensible if the evidence is genuinely too immature. It may be less sensible if the organisation has enough evidence but is avoiding the decision because one uncertainty feels uncomfortable.",

    interpretation:
      "Clarify what new information the waiting period is expected to produce.",

    permission:
      "That's completely possible. Can I ask what you would hope to know after waiting that we do not know today?",

    response:
      "If more evidence would materially improve the decision, waiting may be the right thing to do. If nothing new is likely to be measured, waiting may simply postpone the same conversation.",

    question:
      "What specific evidence would make you feel ready to decide?",

    opportunity:
      "Agree the evidence threshold and a review date rather than leaving the decision open-ended.",
  },
};

function inferObjection(text) {
  const value =
    String(text || "")
      .toLowerCase();

  if (
    value.includes("particip") ||
    value.includes("engage") ||
    value.includes("response rate") ||
    value.includes("assessment")
  ) {
    return "participation";
  }

  if (
    value.includes("burnout") ||
    value.includes("no change") ||
    value.includes("same") ||
    value.includes("didn't improve") ||
    value.includes("did not improve")
  ) {
    return "no_change";
  }

  if (
    value.includes("cost") ||
    value.includes("price") ||
    value.includes("expensive") ||
    value.includes("budget")
  ) {
    return "cost";
  }

  if (
    value.includes("privacy") ||
    value.includes("confidential") ||
    value.includes("data")
  ) {
    return "privacy";
  }

  if (
    value.includes("trust") ||
    value.includes("suspicious")
  ) {
    return "trust";
  }

  if (
    value.includes("manager")
  ) {
    return "managers";
  }

  if (
    value.includes("approval") ||
    value.includes("board") ||
    value.includes("boss") ||
    value.includes("sign off")
  ) {
    return "approval";
  }

  if (
    value.includes("wait") ||
    value.includes("later") ||
    value.includes("think about")
  ) {
    return "wait";
  }

  return "";
}

export default function FounderCompanionPage() {
  const [stepIndex, setStepIndex] =
    useState(0);

  const [meetingType, setMeetingType] =
    useState("Subscription review");

  const [organisationName, setOrganisationName] =
    useState("Final Test Ltd");

  const [contactName, setContactName] =
    useState("");

  const [discoveryNotes, setDiscoveryNotes] =
    useState("");

  const [whatTheySaid, setWhatTheySaid] =
    useState("");

  const [selectedObjection, setSelectedObjection] =
    useState("");

  const [objectionReady, setObjectionReady] =
    useState(false);

  const [recommendation, setRecommendation] =
    useState("continue");

  const [decision, setDecision] =
    useState("");

  const [reflection, setReflection] =
    useState("");

  const currentStep =
    STEPS[stepIndex];

  const progress =
    Math.round(
      ((stepIndex + 1) /
        STEPS.length) *
        100
    );

  const currentObjection =
    selectedObjection
      ? OBJECTIONS[
          selectedObjection
        ]
      : null;

  const meetingHeadline =
    meetingType ===
    "Subscription review"
      ? "Decide whether Root has earned the right to continue."
      : "Understand the concern before deciding what happens next.";

  const evidenceSummary =
    useMemo(
      () => ({
        status:
          "Trial complete",

        workforce:
          "100 employees",

        assessments:
          "11 recorded",

        participation:
          "Follow-up participation needs interpretation",

        confidence:
          "Emerging",

        subscription:
          "Active in sandbox",

        strongestMessage:
          "Do not confuse incomplete evidence with evidence of failure.",
      }),
      []
    );

  function nextStep() {
    setStepIndex((current) =>
      Math.min(
        STEPS.length - 1,
        current + 1
      )
    );
  }

  function previousStep() {
    setStepIndex((current) =>
      Math.max(
        0,
        current - 1
      )
    );
  }

  function analyseConcern() {
    const inferred =
      inferObjection(
        whatTheySaid
      );

    if (inferred) {
      setSelectedObjection(
        inferred
      );
    }

    setObjectionReady(
      Boolean(
        inferred ||
          selectedObjection
      )
    );
  }

  function selectObjection(
    value
  ) {
    setSelectedObjection(
      value
    );

    setObjectionReady(
      Boolean(value)
    );
  }

  return (
    <main style={styles.page}>
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
            box-shadow 160ms ease,
            background 160ms ease;
        }

        button:hover {
          transform: translateY(-1px);
        }

        .companion-step-button:hover {
          background: rgba(255,255,255,0.72) !important;
        }

        .companion-primary:hover {
          box-shadow:
            0 18px 42px rgba(33,51,37,0.18);
        }

        @media (max-width: 1120px) {
          .companion-layout {
            grid-template-columns:
              220px minmax(0, 1fr) !important;
          }

          .companion-intelligence {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 780px) {
          .companion-layout {
            grid-template-columns:
              1fr !important;
          }

          .companion-progress {
            order: 2;
          }

          .companion-centre {
            order: 1;
          }

          .companion-intelligence {
            order: 3;
          }

          .companion-header {
            align-items:
              flex-start !important;
            flex-direction:
              column !important;
          }

          .companion-step-list {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            display: grid !important;
          }

          .companion-footer-actions {
            flex-direction:
              column !important;
            align-items:
              stretch !important;
          }
        }

        @media (max-width: 520px) {
          .companion-step-list {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>

      <header style={styles.header}>
        <div
          className="companion-header"
          style={
            styles.headerInner
          }
        >
          <div
            style={
              styles.brandWrap
            }
          >
            <RootEnso size={50} />

            <div>
              <div
                style={
                  styles.brandName
                }
              >
                ROOT
              </div>

              <div
                style={
                  styles.brandDescriptor
                }
              >
                Meeting Companion
              </div>
            </div>
          </div>

          <div
            style={
              styles.headerMeta
            }
          >
            <span
              style={
                styles.privateBadge
              }
            >
              Founder view
            </span>

            <a
              href="/org-insights"
              style={
                styles.exitLink
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
              styles.heroEyebrow
            }
          >
            ONE CONVERSATION AT A TIME
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
              Root will carry the structure.
            </span>
          </h1>

          <p
            style={
              styles.heroText
            }
          >
            {meetingHeadline}
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
            className="companion-progress"
            style={
              styles.sidebar
            }
          >
            <p
              style={
                styles.panelEyebrow
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
                {stepIndex + 1}
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
                      className="companion-step-button"
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

                        ...(complete
                          ? styles.stepButtonComplete
                          : {}),
                      }}
                    >
                      <span
                        style={{
                          ...styles.stepDot,

                          ...(active
                            ? styles.stepDotActive
                            : {}),

                          ...(complete
                            ? styles.stepDotComplete
                            : {}),
                        }}
                      >
                        {complete
                          ? "✓"
                          : index +
                            1}
                      </span>

                      <span>
                        {step.label}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </aside>

          <section
            className="companion-centre"
            style={
              styles.centre
            }
          >
            <div
              style={
                styles.stageCard
              }
            >
              <div
                style={
                  styles.stageTop
                }
              >
                <div>
                  <p
                    style={
                      styles.stageEyebrow
                    }
                  >
                    {currentStep.label}
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
                  {meetingType}
                </span>
              </div>

              {currentStep.key ===
                "preparation" && (
                <PreparationStep
                  organisationName={
                    organisationName
                  }
                  setOrganisationName={
                    setOrganisationName
                  }
                  contactName={
                    contactName
                  }
                  setContactName={
                    setContactName
                  }
                  meetingType={
                    meetingType
                  }
                  setMeetingType={
                    setMeetingType
                  }
                />
              )}

              {currentStep.key ===
                "opening" && (
                <OpeningStep
                  contactName={
                    contactName
                  }
                  organisationName={
                    organisationName
                  }
                />
              )}

              {currentStep.key ===
                "discovery" && (
                <DiscoveryStep
                  discoveryNotes={
                    discoveryNotes
                  }
                  setDiscoveryNotes={
                    setDiscoveryNotes
                  }
                />
              )}

              {currentStep.key ===
                "evidence" && (
                <EvidenceStep
                  evidence={
                    evidenceSummary
                  }
                />
              )}

              {currentStep.key ===
                "objections" && (
                <ObjectionsStep
                  whatTheySaid={
                    whatTheySaid
                  }
                  setWhatTheySaid={
                    setWhatTheySaid
                  }
                  selectedObjection={
                    selectedObjection
                  }
                  selectObjection={
                    selectObjection
                  }
                  analyseConcern={
                    analyseConcern
                  }
                  objectionReady={
                    objectionReady
                  }
                  objection={
                    currentObjection
                  }
                />
              )}

              {currentStep.key ===
                "recommendation" && (
                <RecommendationStep
                  recommendation={
                    recommendation
                  }
                  setRecommendation={
                    setRecommendation
                  }
                />
              )}

              {currentStep.key ===
                "decision" && (
                <DecisionStep
                  decision={
                    decision
                  }
                  setDecision={
                    setDecision
                  }
                />
              )}

              {currentStep.key ===
                "close" && (
                <CloseStep />
              )}

              {currentStep.key ===
                "reflection" && (
                <ReflectionStep
                  decision={
                    decision
                  }
                  reflection={
                    reflection
                  }
                  setReflection={
                    setReflection
                  }
                />
              )}

              <div
                className="companion-footer-actions"
                style={
                  styles.footerActions
                }
              >
                <button
                  type="button"
                  onClick={
                    previousStep
                  }
                  disabled={
                    stepIndex === 0
                  }
                  style={{
                    ...styles.secondaryButton,

                    opacity:
                      stepIndex ===
                      0
                        ? 0.38
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
                    className="companion-primary"
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
                styles.panelEyebrow
              }
            >
              Root beside you
            </p>

            <h2
              style={
                styles.intelligenceTitle
              }
            >
              {organisationName}
            </h2>

            <div
              style={
                styles.intelligenceList
              }
            >
              <IntelRow
                label="Status"
                value={
                  evidenceSummary.status
                }
              />

              <IntelRow
                label="Workforce"
                value={
                  evidenceSummary.workforce
                }
              />

              <IntelRow
                label="Evidence"
                value={
                  evidenceSummary.assessments
                }
              />

              <IntelRow
                label="Confidence"
                value={
                  evidenceSummary.confidence
                }
                accent
              />

              <IntelRow
                label="Membership"
                value={
                  evidenceSummary.subscription
                }
              />
            </div>

            <div
              style={
                styles.watchCard
              }
            >
              <p
                style={
                  styles.watchLabel
                }
              >
                ROOT'S WATCHPOINT
              </p>

              <strong
                style={
                  styles.watchTitle
                }
              >
                Don't let one headline
                become the whole story.
              </strong>

              <p
                style={
                  styles.watchText
                }
              >
                {
                  evidenceSummary.strongestMessage
                }
              </p>
            </div>

            <div
              style={
                styles.companionNote
              }
            >
              <RootEnso
                size={40}
              />

              <p>
                Listen first.
                <br />
                Answer what they
                actually said.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function PreparationStep({
  organisationName,
  setOrganisationName,
  contactName,
  setContactName,
  meetingType,
  setMeetingType,
}) {
  return (
    <div>
      <h2
        style={
          styles.sectionTitle
        }
      >
        Before you go in.
      </h2>

      <p
        style={
          styles.sectionLead
        }
      >
        Today is not about
        convincing them. Your job
        is to understand what they
        believe the evidence says,
        then help them interpret it
        accurately.
      </p>

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
          onChange={
            setOrganisationName
          }
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
            styles.fieldWrap
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
            onChange={(event) =>
              setMeetingType(
                event.target
                  .value
              )
            }
            style={
              styles.input
            }
          >
            <option>
              Subscription review
            </option>

            <option>
              Objection handling
            </option>

            <option>
              Executive review
            </option>

            <option>
              Renewal conversation
            </option>
          </select>
        </label>
      </div>

      <QuietPrompt>
        You don't need to remember
        the whole meeting. Root will
        give you the next step.
      </QuietPrompt>
    </div>
  );
}

function OpeningStep({
  contactName,
  organisationName,
}) {
  const person =
    contactName || "there";

  return (
    <div>
      <h2
        style={
          styles.sectionTitle
        }
      >
        Open the conversation.
      </h2>

      <p
        style={
          styles.sectionLead
        }
      >
        Don't start by defending
        Root. Start by giving them
        the floor.
      </p>

      <ScriptCard>
        Good afternoon{" "}
        {person}.
        <br />
        <br />
        Firstly, thank you for
        giving Root the opportunity
        to work with{" "}
        {organisationName}.
        <br />
        <br />
        Before we look at any of
        the numbers, I'd really like
        to hear your own view.
        <br />
        <br />
        <strong>
          How has the experience
          felt from your
          perspective?
        </strong>
      </ScriptCard>

      <QuietPrompt>
        Ask the question. Then
        listen. Don't start solving
        while they're still
        talking.
      </QuietPrompt>
    </div>
  );
}

function DiscoveryStep({
  discoveryNotes,
  setDiscoveryNotes,
}) {
  return (
    <div>
      <h2
        style={
          styles.sectionTitle
        }
      >
        Understand their version
        first.
      </h2>

      <p
        style={
          styles.sectionLead
        }
      >
        You are looking for what
        they noticed, what
        disappointed them and what
        they are worried you might
        say next.
      </p>

      <div
        style={
          styles.questionStack
        }
      >
        <QuestionCard>
          What stood out to you
          during the trial?
        </QuestionCard>

        <QuestionCard>
          Was there anything you
          expected Root to show
          that it didn't?
        </QuestionCard>

        <QuestionCard>
          If you had one concern
          about continuing, what
          would it be?
        </QuestionCard>
      </div>

      <label
        style={
          styles.fieldWrap
        }
      >
        <span
          style={
            styles.fieldLabel
          }
        >
          What are you hearing?
        </span>

        <textarea
          value={
            discoveryNotes
          }
          onChange={(event) =>
            setDiscoveryNotes(
              event.target
                .value
            )
          }
          placeholder="Capture their words, not your interpretation yet..."
          style={
            styles.textarea
          }
        />
      </label>

      <QuietPrompt>
        Their words are evidence
        too. Don't translate them
        too early.
      </QuietPrompt>
    </div>
  );
}

function EvidenceStep({
  evidence,
}) {
  return (
    <div>
      <h2
        style={
          styles.sectionTitle
        }
      >
        Now look at what Root
        actually knows.
      </h2>

      <p
        style={
          styles.sectionLead
        }
      >
        Separate measurement,
        interpretation and
        uncertainty before you
        answer anything.
      </p>

      <div
        style={
          styles.evidenceGrid
        }
      >
        <EvidenceCard
          label="Measured"
          title={
            evidence.assessments
          }
          text="This is recorded evidence. It does not require interpretation."
        />

        <EvidenceCard
          label="Confidence"
          title={
            evidence.confidence
          }
          text="The evidence is useful, but Root should remain cautious about organisation-wide conclusions."
        />

        <EvidenceCard
          label="Participation"
          title="Needs context"
          text={
            evidence.participation
          }
        />
      </div>

      <div
        style={
          styles.sherlockCard
        }
      >
        <p
          style={
            styles.sherlockLabel
          }
        >
          ROOT INTERPRETATION
        </p>

        <h3
          style={
            styles.sherlockTitle
          }
        >
          The first headline may
          not be the right
          conclusion.
        </h3>

        <p
          style={
            styles.sherlockText
          }
        >
          Ask whether the same
          people contributed at
          both measurement points,
          whether participation
          changed, and whether the
          current sample is large
          enough to support the
          conclusion being made.
        </p>

        <strong
          style={
            styles.sherlockBottom
          }
        >
          Root's job is not to win
          the argument. It is to
          stop the wrong conclusion
          winning.
        </strong>
      </div>
    </div>
  );
}

function ObjectionsStep({
  whatTheySaid,
  setWhatTheySaid,
  selectedObjection,
  selectObjection,
  analyseConcern,
  objectionReady,
  objection,
}) {
  return (
    <div>
      <h2
        style={
          styles.sectionTitle
        }
      >
        They said something.
        Good.
      </h2>

      <p
        style={
          styles.sectionLead
        }
      >
        Don't fire an answer back.
        Capture what they actually
        said, understand it, ask
        permission, then respond.
      </p>

      <label
        style={
          styles.fieldWrap
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
          onChange={(event) =>
            setWhatTheySaid(
              event.target
                .value
            )
          }
          placeholder={'e.g. "Only 20% completed a second assessment, so I am not convinced it worked."'}
          style={
            styles.textarea
          }
        />
      </label>

      <div
        style={
          styles.objectionTools
        }
      >
        <label
          style={{
            ...styles.fieldWrap,

            flex: 1,
          }}
        >
          <span
            style={
              styles.fieldLabel
            }
          >
            Or choose the concern
          </span>

          <select
            value={
              selectedObjection
            }
            onChange={(event) =>
              selectObjection(
                event.target
                  .value
              )
            }
            style={
              styles.input
            }
          >
            <option value="">
              Select an objection...
            </option>

            {Object.entries(
              OBJECTIONS
            ).map(
              ([
                key,
                item,
              ]) => (
                <option
                  key={key}
                  value={key}
                >
                  {item.label}
                </option>
              )
            )}
          </select>
        </label>

        <button
          type="button"
          className="companion-primary"
          onClick={
            analyseConcern
          }
          style={
            styles.analyseButton
          }
        >
          Interpret concern →
        </button>
      </div>

      {objectionReady &&
        objection && (
          <div
            style={
              styles.objectionResult
            }
          >
            <ReasoningBlock
              number="01"
              label="What the evidence says"
              text={
                objection.evidence
              }
            />

            <ReasoningBlock
              number="02"
              label="Root's interpretation"
              text={
                objection.interpretation
              }
              dark
            />

            <ReasoningBlock
              number="03"
              label="Ask permission"
              text={
                objection.permission
              }
              quote
            />

            <ReasoningBlock
              number="04"
              label="How to respond"
              text={
                objection.response
              }
              quote
            />

            <ReasoningBlock
              number="05"
              label="Question back"
              text={
                objection.question
              }
              accent
            />

            <ReasoningBlock
              number="06"
              label="Commercial opportunity"
              text={
                objection.opportunity
              }
            />
          </div>
        )}

      {!objectionReady && (
        <QuietPrompt>
          You don't need the clever
          answer yet. First find out
          what the objection really
          is.
        </QuietPrompt>
      )}
    </div>
  );
}

function RecommendationStep({
  recommendation,
  setRecommendation,
}) {
  const recommendations = [
    {
      key: "continue",
      title:
        "Continue membership",
      text:
        "Root has earned the right to continue and the next evidence period should strengthen the organisation picture.",
    },

    {
      key: "interpretation",
      title:
        "Executive interpretation session",
      text:
        "The organisation needs greater confidence in what the evidence means before making the subscription decision.",
    },

    {
      key: "engagement",
      title:
        "Employee / manager re-engagement",
      text:
        "Participation or understanding appears to be limiting the strength of future evidence.",
    },

    {
      key: "review",
      title:
        "Agree another review point",
      text:
        "More evidence is genuinely required before making a responsible recommendation.",
    },
  ];

  return (
    <div>
      <h2
        style={
          styles.sectionTitle
        }
      >
        Make one clear
        recommendation.
      </h2>

      <p
        style={
          styles.sectionLead
        }
      >
        Don't give them four
        conclusions. Decide what
        the conversation and the
        evidence support.
      </p>

      <div
        style={
          styles.recommendationList
        }
      >
        {recommendations.map(
          (item) => {
            const active =
              recommendation ===
              item.key;

            return (
              <button
                key={
                  item.key
                }
                type="button"
                onClick={() =>
                  setRecommendation(
                    item.key
                  )
                }
                style={{
                  ...styles.recommendationButton,

                  ...(active
                    ? styles.recommendationButtonActive
                    : {}),
                }}
              >
                <span
                  style={
                    styles.recommendationCheck
                  }
                >
                  {active
                    ? "✓"
                    : "○"}
                </span>

                <span>
                  <strong
                    style={
                      styles.recommendationTitle
                    }
                  >
                    {item.title}
                  </strong>

                  <span
                    style={
                      styles.recommendationText
                    }
                  >
                    {item.text}
                  </span>
                </span>
              </button>
            );
          }
        )}
      </div>

      <ScriptCard>
        From everything we've
        discussed, I think the most
        sensible next step is to
        continue from the evidence
        we have rather than restart
        the conversation from zero.
        <br />
        <br />
        <strong>
          Does that feel like a
          fair reflection of where
          we have got to?
        </strong>
      </ScriptCard>
    </div>
  );
}

function DecisionStep({
  decision,
  setDecision,
}) {
  return (
    <div>
      <h2
        style={
          styles.sectionTitle
        }
      >
        Ask for the decision.
      </h2>

      <p
        style={
          styles.sectionLead
        }
      >
        You have listened. You have
        interpreted the evidence.
        You have made the
        recommendation.
      </p>

      <div
        style={
          styles.decisionCard
        }
      >
        <p
          style={
            styles.decisionPrompt
          }
        >
          "Shall we continue?"
        </p>

        <p
          style={
            styles.decisionSub
          }
        >
          That's enough.
        </p>
      </div>

      <div
        style={
          styles.outcomeGrid
        }
      >
        {[
          [
            "yes",
            "Yes",
            "Continue membership",
          ],

          [
            "not_yet",
            "Not yet",
            "Understand what remains unresolved",
          ],

          [
            "no",
            "No",
            "Learn why without trying to rescue it",
          ],
        ].map(
          ([
            key,
            title,
            text,
          ]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setDecision(
                  key
                )
              }
              style={{
                ...styles.outcomeButton,

                ...(decision ===
                key
                  ? styles.outcomeButtonActive
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
          )
        )}
      </div>
    </div>
  );
}

function CloseStep() {
  return (
    <div
      style={
        styles.closeWrap
      }
    >
      <p
        style={
          styles.closeEyebrow
        }
      >
        DECISION TIME
      </p>

      <h2
        style={
          styles.closeTitle
        }
      >
        You have answered the
        questions.
      </h2>

      <p
        style={
          styles.closeText
        }
      >
        You have understood the
        concern.
        <br />
        You have made the
        recommendation.
        <br />
        You have asked for the
        decision.
      </p>

      <div
        style={
          styles.windowsCard
        }
      >
        <span
          style={
            styles.windowsRule
          }
        />

        <p
          style={
            styles.windowsQuote
          }
        >
          The next person to
          speak...
          <br />
          <strong>
            takes the windows
            home.
          </strong>
        </p>

        <span
          style={
            styles.windowsRule
          }
        />
      </div>

      <p
        style={
          styles.closeInstruction
        }
      >
        Pause.
        <br />
        Don't rescue the silence.
      </p>

      <div
        style={
          styles.fearNaught
        }
      >
        <RootEnso size={46} />

        <span>
          Fear Naught.
        </span>
      </div>
    </div>
  );
}

function ReflectionStep({
  decision,
  reflection,
  setReflection,
}) {
  const outcome =
    decision === "yes"
      ? "Won"

      : decision ===
        "not_yet"
      ? "Delayed"

      : decision === "no"
      ? "Lost"

      : "Not recorded";

  return (
    <div>
      <h2
        style={
          styles.sectionTitle
        }
      >
        What did you learn?
      </h2>

      <p
        style={
          styles.sectionLead
        }
      >
        The meeting is over. Don't
        grade yourself. Capture the
        lesson while it is still
        fresh.
      </p>

      <div
        style={
          styles.reflectionOutcome
        }
      >
        <span>
          Outcome
        </span>

        <strong>
          {outcome}
        </strong>
      </div>

      <label
        style={
          styles.fieldWrap
        }
      >
        <span
          style={
            styles.fieldLabel
          }
        >
          What did you learn today?
        </span>

        <textarea
          value={
            reflection
          }
          onChange={(event) =>
            setReflection(
              event.target
                .value
            )
          }
          placeholder="What mattered? What surprised you? What would you do differently next time?"
          style={{
            ...styles.textarea,

            minHeight:
              "180px",
          }}
        />
      </label>

      <QuietPrompt>
        Win, lose or delay — the
        conversation has value if
        Root learns from it.
      </QuietPrompt>
    </div>
  );
}

function IntelRow({
  label,
  value,
  accent = false,
}) {
  return (
    <div
      style={
        styles.intelRow
      }
    >
      <span
        style={
          styles.intelLabel
        }
      >
        {label}
      </span>

      <strong
        style={{
          ...styles.intelValue,

          ...(accent
            ? styles.intelValueAccent
            : {}),
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
}) {
  return (
    <label
      style={
        styles.fieldWrap
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
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
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

function ScriptCard({
  children,
}) {
  return (
    <div
      style={
        styles.scriptCard
      }
    >
      <p
        style={
          styles.scriptLabel
        }
      >
        SAY IT YOUR WAY
      </p>

      <div
        style={
          styles.scriptText
        }
      >
        {children}
      </div>
    </div>
  );
}

function QuestionCard({
  children,
}) {
  return (
    <div
      style={
        styles.questionCard
      }
    >
      <span
        style={
          styles.questionMark
        }
      >
        ?
      </span>

      <span>
        {children}
      </span>
    </div>
  );
}

function QuietPrompt({
  children,
}) {
  return (
    <div
      style={
        styles.quietPrompt
      }
    >
      <RootEnso size={34} />

      <p>
        {children}
      </p>
    </div>
  );
}

function EvidenceCard({
  label,
  title,
  text,
}) {
  return (
    <article
      style={
        styles.evidenceCard
      }
    >
      <p
        style={
          styles.evidenceLabel
        }
      >
        {label}
      </p>

      <h3
        style={
          styles.evidenceTitle
        }
      >
        {title}
      </h3>

      <p
        style={
          styles.evidenceText
        }
      >
        {text}
      </p>
    </article>
  );
}

function ReasoningBlock({
  number,
  label,
  text,
  dark = false,
  accent = false,
  quote = false,
}) {
  return (
    <div
      style={{
        ...styles.reasoningBlock,

        ...(dark
          ? styles.reasoningBlockDark
          : {}),

        ...(accent
          ? styles.reasoningBlockAccent
          : {}),
      }}
    >
      <div
        style={
          styles.reasoningTop
        }
      >
        <span>
          {number}
        </span>

        <strong>
          {label}
        </strong>
      </div>

      <p
        style={{
          ...styles.reasoningText,

          ...(quote
            ? styles.reasoningQuote
            : {}),
        }}
      >
        {text}
      </p>
    </div>
  );
}

const styles = {
  page: {
    minHeight:
      "100vh",

    background:
      "#F4EFE6",

    color:
      "#172018",

    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
  },

  header: {
    position:
      "sticky",

    top: 0,

    zIndex: 40,

    background:
      "rgba(244,239,230,0.88)",

    borderBottom:
      "1px solid rgba(38,52,39,0.08)",

    backdropFilter:
      "blur(22px)",
  },

  headerInner: {
    width:
      "100%",

    maxWidth:
      "1420px",

    minHeight:
      "80px",

    margin:
      "0 auto",

    padding:
      "14px 28px",

    display:
      "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    gap:
      "24px",
  },

  brandWrap: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "13px",
  },

  brandName: {
    fontSize:
      "13px",

    fontWeight:
      "900",

    letterSpacing:
      "0.17em",
  },

  brandDescriptor: {
    marginTop:
      "3px",

    color:
      "#657064",

    fontSize:
      "11px",
  },

  headerMeta: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "16px",
  },

  privateBadge: {
    padding:
      "8px 11px",

    borderRadius:
      "999px",

    background:
      "rgba(76,103,75,0.10)",

    color:
      "#52664F",

    fontSize:
      "10px",

    fontWeight:
      "900",

    letterSpacing:
      "0.08em",

    textTransform:
      "uppercase",
  },

  exitLink: {
    color:
      "#485448",

    fontSize:
      "13px",

    fontWeight:
      "800",

    textDecoration:
      "none",
  },

  hero: {
    padding:
      "62px 28px 46px",

    background:
      "radial-gradient(circle at 76% 26%, rgba(121,151,115,0.20), transparent 30%), linear-gradient(145deg, #F5F0E7 0%, #E8EEE4 100%)",
  },

  heroInner: {
    width:
      "100%",

    maxWidth:
      "1420px",

    margin:
      "0 auto",
  },

  heroEyebrow: {
    margin:
      "0 0 16px",

    color:
      "#5F705B",

    fontSize:
      "11px",

    fontWeight:
      "900",

    letterSpacing:
      "0.17em",
  },

  heroTitle: {
    margin:
      0,

    maxWidth:
      "950px",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "clamp(44px, 5.8vw, 78px)",

    fontWeight:
      "500",

    lineHeight:
      1.02,

    letterSpacing:
      "-0.05em",
  },

  heroAccent: {
    color:
      "#526D55",
  },

  heroText: {
    maxWidth:
      "720px",

    margin:
      "22px 0 0",

    color:
      "#59635A",

    fontSize:
      "17px",

    lineHeight:
      1.7,
  },

  workspace: {
    padding:
      "28px",
  },

  layout: {
    width:
      "100%",

    maxWidth:
      "1420px",

    margin:
      "0 auto",

    display:
      "grid",

    gridTemplateColumns:
      "220px minmax(0, 1fr) 300px",

    gap:
      "18px",

    alignItems:
      "start",
  },

  sidebar: {
    position:
      "sticky",

    top:
      "102px",

    padding:
      "22px",

    borderRadius:
      "26px",

    background:
      "rgba(255,255,255,0.54)",

    border:
      "1px solid rgba(255,255,255,0.86)",

    boxShadow:
      "0 18px 50px rgba(41,55,40,0.06)",
  },

  panelEyebrow: {
    margin:
      "0 0 14px",

    color:
      "#71806F",

    fontSize:
      "9px",

    fontWeight:
      "900",

    letterSpacing:
      "0.14em",

    textTransform:
      "uppercase",
  },

  progressTrack: {
    height:
      "6px",

    overflow:
      "hidden",

    borderRadius:
      "999px",

    background:
      "rgba(61,82,59,0.09)",
  },

  progressFill: {
    height:
      "100%",

    borderRadius:
      "999px",

    background:
      "#526D55",

    transition:
      "width 300ms ease",
  },

  progressMeta: {
    marginTop:
      "9px",

    display:
      "flex",

    justifyContent:
      "space-between",

    color:
      "#667164",

    fontSize:
      "10px",
  },

  stepList: {
    marginTop:
      "22px",

    display:
      "grid",

    gap:
      "7px",
  },

  stepButton: {
    width:
      "100%",

    padding:
      "10px",

    border:
      "1px solid transparent",

    borderRadius:
      "15px",

    background:
      "transparent",

    color:
      "#657064",

    display:
      "flex",

    alignItems:
      "center",

    gap:
      "10px",

    textAlign:
      "left",

    cursor:
      "pointer",

    fontSize:
      "12px",

    fontWeight:
      "700",
  },

  stepButtonActive: {
    background:
      "#263B2B",

    color:
      "#FFFFFF",

    boxShadow:
      "0 12px 28px rgba(38,59,43,0.16)",
  },

  stepButtonComplete: {
    color:
      "#425343",
  },

  stepDot: {
    width:
      "25px",

    height:
      "25px",

    flex:
      "0 0 25px",

    display:
      "grid",

    placeItems:
      "center",

    borderRadius:
      "999px",

    background:
      "rgba(65,85,62,0.08)",

    fontSize:
      "9px",

    fontWeight:
      "900",
  },

  stepDotActive: {
    background:
      "rgba(255,255,255,0.16)",

    color:
      "#FFFFFF",
  },

  stepDotComplete: {
    background:
      "rgba(74,107,69,0.12)",

    color:
      "#4B6849",
  },

  centre: {
    minWidth:
      0,
  },

  stageCard: {
    minHeight:
      "690px",

    padding:
      "36px",

    borderRadius:
      "32px",

    background:
      "linear-gradient(145deg, rgba(255,255,255,0.72), rgba(248,245,238,0.74))",

    border:
      "1px solid rgba(255,255,255,0.9)",

    boxShadow:
      "0 26px 76px rgba(40,54,39,0.09)",
  },

  stageTop: {
    marginBottom:
      "32px",

    paddingBottom:
      "22px",

    borderBottom:
      "1px solid rgba(51,66,50,0.08)",

    display:
      "flex",

    justifyContent:
      "space-between",

    alignItems:
      "flex-start",

    gap:
      "20px",
  },

  stageEyebrow: {
    margin:
      "0 0 5px",

    color:
      "#667562",

    fontSize:
      "10px",

    fontWeight:
      "900",

    letterSpacing:
      "0.15em",

    textTransform:
      "uppercase",
  },

  stageNumber: {
    color:
      "#A0A99E",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "24px",
  },

  meetingBadge: {
    padding:
      "9px 12px",

    borderRadius:
      "999px",

    background:
      "rgba(76,103,75,0.08)",

    color:
      "#52644F",

    fontSize:
      "10px",

    fontWeight:
      "900",
  },

  sectionTitle: {
    margin:
      0,

    maxWidth:
      "740px",

    color:
      "#1D291F",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "clamp(35px, 4.3vw, 54px)",

    fontWeight:
      "500",

    lineHeight:
      1.07,

    letterSpacing:
      "-0.04em",
  },

  sectionLead: {
    maxWidth:
      "720px",

    margin:
      "18px 0 28px",

    color:
      "#606961",

    fontSize:
      "16px",

    lineHeight:
      1.75,
  },

  formGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",

    gap:
      "14px",
  },

  fieldWrap: {
    display:
      "grid",

    gap:
      "8px",
  },

  fieldLabel: {
    color:
      "#667164",

    fontSize:
      "10px",

    fontWeight:
      "900",

    letterSpacing:
      "0.09em",

    textTransform:
      "uppercase",
  },

  input: {
    width:
      "100%",

    minHeight:
      "50px",

    padding:
      "12px 14px",

    border:
      "1px solid rgba(47,66,47,0.11)",

    borderRadius:
      "15px",

    outline:
      "none",

    background:
      "rgba(255,255,255,0.72)",

    color:
      "#263026",
  },

  textarea: {
    width:
      "100%",

    minHeight:
      "125px",

    resize:
      "vertical",

    padding:
      "15px",

    border:
      "1px solid rgba(47,66,47,0.11)",

    borderRadius:
      "18px",

    outline:
      "none",

    background:
      "rgba(255,255,255,0.72)",

    color:
      "#263026",

    lineHeight:
      1.65,
  },

  scriptCard: {
    marginTop:
      "26px",

    padding:
      "28px",

    borderRadius:
      "25px",

    background:
      "#263B2B",

    color:
      "#FFFFFF",

    boxShadow:
      "0 20px 55px rgba(32,48,34,0.14)",
  },

  scriptLabel: {
    margin:
      "0 0 18px",

    color:
      "rgba(255,255,255,0.52)",

    fontSize:
      "9px",

    fontWeight:
      "900",

    letterSpacing:
      "0.15em",
  },

  scriptText: {
    fontFamily:
      "Georgia, serif",

    fontSize:
      "clamp(19px, 2.2vw, 25px)",

    lineHeight:
      1.6,
  },

  quietPrompt: {
    marginTop:
      "24px",

    padding:
      "18px 20px",

    borderRadius:
      "20px",

    background:
      "rgba(229,236,224,0.72)",

    display:
      "flex",

    alignItems:
      "center",

    gap:
      "13px",

    color:
      "#596456",

    fontSize:
      "13px",

    lineHeight:
      1.6,
  },

  questionStack: {
    marginBottom:
      "22px",

    display:
      "grid",

    gap:
      "10px",
  },

  questionCard: {
    padding:
      "17px 18px",

    borderRadius:
      "18px",

    background:
      "rgba(255,255,255,0.58)",

    border:
      "1px solid rgba(58,75,57,0.08)",

    display:
      "flex",

    alignItems:
      "center",

    gap:
      "13px",

    color:
      "#3D493C",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "17px",
  },

  questionMark: {
    width:
      "30px",

    height:
      "30px",

    flex:
      "0 0 30px",

    display:
      "grid",

    placeItems:
      "center",

    borderRadius:
      "999px",

    background:
      "rgba(80,107,77,0.10)",

    color:
      "#526D55",

    fontWeight:
      "900",
  },

  evidenceGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",

    gap:
      "12px",
  },

  evidenceCard: {
    padding:
      "20px",

    borderRadius:
      "21px",

    background:
      "rgba(255,255,255,0.58)",

    border:
      "1px solid rgba(62,80,61,0.08)",
  },

  evidenceLabel: {
    margin:
      "0 0 22px",

    color:
      "#738071",

    fontSize:
      "9px",

    fontWeight:
      "900",

    letterSpacing:
      "0.13em",

    textTransform:
      "uppercase",
  },

  evidenceTitle: {
    margin:
      0,

    color:
      "#273428",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "24px",

    fontWeight:
      "500",
  },

  evidenceText: {
    margin:
      "11px 0 0",

    color:
      "#656E65",

    fontSize:
      "12px",

    lineHeight:
      1.65,
  },

  sherlockCard: {
    marginTop:
      "18px",

    padding:
      "27px",

    borderRadius:
      "25px",

    background:
      "linear-gradient(145deg, #E4ECDD, #F5F2EA)",

    border:
      "1px solid rgba(70,96,68,0.11)",
  },

  sherlockLabel: {
    margin:
      "0 0 12px",

    color:
      "#637460",

    fontSize:
      "9px",

    fontWeight:
      "900",

    letterSpacing:
      "0.15em",
  },

  sherlockTitle: {
    margin:
      0,

    color:
      "#243126",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "28px",

    fontWeight:
      "500",

    lineHeight:
      1.2,
  },

  sherlockText: {
    margin:
      "14px 0 0",

    color:
      "#596359",

    lineHeight:
      1.75,
  },

  sherlockBottom: {
    display:
      "block",

    marginTop:
      "18px",

    color:
      "#41523F",

    fontSize:
      "13px",

    lineHeight:
      1.65,
  },

  objectionTools: {
    marginTop:
      "18px",

    display:
      "flex",

    alignItems:
      "end",

    gap:
      "12px",

    flexWrap:
      "wrap",
  },

  analyseButton: {
    minHeight:
      "50px",

    padding:
      "13px 18px",

    border:
      "none",

    borderRadius:
      "16px",

    background:
      "#263B2B",

    color:
      "#FFFFFF",

    cursor:
      "pointer",

    fontWeight:
      "900",
  },

  objectionResult: {
    marginTop:
      "22px",

    display:
      "grid",

    gap:
      "10px",
  },

  reasoningBlock: {
    padding:
      "19px 21px",

    borderRadius:
      "20px",

    background:
      "rgba(255,255,255,0.60)",

    border:
      "1px solid rgba(58,76,57,0.08)",
  },

  reasoningBlockDark: {
    background:
      "#293D2D",

    color:
      "#FFFFFF",
  },

  reasoningBlockAccent: {
    background:
      "#E3ECDE",

    border:
      "1px solid rgba(79,108,75,0.13)",
  },

  reasoningTop: {
    display:
      "flex",

    gap:
      "12px",

    alignItems:
      "center",

    color:
      "inherit",

    fontSize:
      "10px",

    letterSpacing:
      "0.09em",

    textTransform:
      "uppercase",

    opacity:
      0.72,
  },

  reasoningText: {
    margin:
      "12px 0 0",

    color:
      "inherit",

    fontSize:
      "14px",

    lineHeight:
      1.72,
  },

  reasoningQuote: {
    fontFamily:
      "Georgia, serif",

    fontSize:
      "17px",
  },

  recommendationList: {
    display:
      "grid",

    gap:
      "10px",
  },

  recommendationButton: {
    width:
      "100%",

    padding:
      "18px",

    border:
      "1px solid rgba(55,75,54,0.09)",

    borderRadius:
      "20px",

    background:
      "rgba(255,255,255,0.54)",

    display:
      "grid",

    gridTemplateColumns:
      "34px 1fr",

    gap:
      "12px",

    textAlign:
      "left",

    cursor:
      "pointer",
  },

  recommendationButtonActive: {
    background:
      "#E1EBDD",

    border:
      "1px solid rgba(75,106,72,0.18)",
  },

  recommendationCheck: {
    width:
      "30px",

    height:
      "30px",

    display:
      "grid",

    placeItems:
      "center",

    borderRadius:
      "999px",

    background:
      "rgba(77,108,74,0.10)",

    color:
      "#526D55",

    fontWeight:
      "900",
  },

  recommendationTitle: {
    display:
      "block",

    color:
      "#29362A",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "18px",

    fontWeight:
      "500",
  },

  recommendationText: {
    display:
      "block",

    marginTop:
      "5px",

    color:
      "#677067",

    fontSize:
      "12px",

    lineHeight:
      1.6,
  },

  decisionCard: {
    padding:
      "35px",

    borderRadius:
      "27px",

    background:
      "#263B2B",

    color:
      "#FFFFFF",

    textAlign:
      "center",
  },

  decisionPrompt: {
    margin:
      0,

    fontFamily:
      "Georgia, serif",

    fontSize:
      "clamp(34px, 5vw, 52px)",
  },

  decisionSub: {
    margin:
      "12px 0 0",

    color:
      "rgba(255,255,255,0.58)",

    fontSize:
      "12px",
  },

  outcomeGrid: {
    marginTop:
      "16px",

    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",

    gap:
      "10px",
  },

  outcomeButton: {
    padding:
      "18px",

    border:
      "1px solid rgba(52,71,51,0.09)",

    borderRadius:
      "19px",

    background:
      "rgba(255,255,255,0.56)",

    color:
      "#354135",

    display:
      "grid",

    gap:
      "6px",

    cursor:
      "pointer",
  },

  outcomeButtonActive: {
    background:
      "#E2ECDF",

    border:
      "1px solid rgba(76,105,72,0.17)",
  },

  closeWrap: {
    padding:
      "20px 0",

    textAlign:
      "center",
  },

  closeEyebrow: {
    margin:
      "0 0 15px",

    color:
      "#667562",

    fontSize:
      "10px",

    fontWeight:
      "900",

    letterSpacing:
      "0.17em",
  },

  closeTitle: {
    margin:
      0,

    fontFamily:
      "Georgia, serif",

    fontSize:
      "clamp(38px, 5vw, 58px)",

    fontWeight:
      "500",

    lineHeight:
      1.08,

    letterSpacing:
      "-0.04em",
  },

  closeText: {
    margin:
      "20px 0 0",

    color:
      "#636C63",

    fontSize:
      "15px",

    lineHeight:
      1.8,
  },

  windowsCard: {
    maxWidth:
      "590px",

    margin:
      "38px auto",

    padding:
      "30px",

    borderRadius:
      "26px",

    background:
      "#263B2B",

    color:
      "#FFFFFF",
  },

  windowsRule: {
    display:
      "block",

    width:
      "100%",

    height:
      "1px",

    background:
      "rgba(255,255,255,0.18)",
  },

  windowsQuote: {
    margin:
      "28px 0",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "clamp(25px, 3.5vw, 37px)",

    lineHeight:
      1.4,
  },

  closeInstruction: {
    color:
      "#4E5D4D",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "22px",

    lineHeight:
      1.7,
  },

  fearNaught: {
    marginTop:
      "26px",

    display:
      "flex",

    justifyContent:
      "center",

    alignItems:
      "center",

    gap:
      "10px",

    color:
      "#697367",

    fontSize:
      "12px",

    fontWeight:
      "900",

    letterSpacing:
      "0.09em",

    textTransform:
      "uppercase",
  },

  reflectionOutcome: {
    marginBottom:
      "22px",

    padding:
      "20px",

    borderRadius:
      "20px",

    background:
      "#E4ECDF",

    display:
      "flex",

    justifyContent:
      "space-between",

    color:
      "#50604E",
  },

  footerActions: {
    marginTop:
      "36px",

    paddingTop:
      "22px",

    borderTop:
      "1px solid rgba(53,70,52,0.08)",

    display:
      "flex",

    justifyContent:
      "space-between",

    gap:
      "12px",
  },

  primaryButton: {
    minHeight:
      "50px",

    padding:
      "13px 20px",

    border:
      "none",

    borderRadius:
      "16px",

    background:
      "#263B2B",

    color:
      "#FFFFFF",

    cursor:
      "pointer",

    fontWeight:
      "900",
  },

  secondaryButton: {
    minHeight:
      "50px",

    padding:
      "13px 18px",

    border:
      "1px solid rgba(49,67,49,0.11)",

    borderRadius:
      "16px",

    background:
      "rgba(255,255,255,0.52)",

    color:
      "#4D594C",

    cursor:
      "pointer",

    fontWeight:
      "800",
  },

  intelligence: {
    position:
      "sticky",

    top:
      "102px",

    padding:
      "24px",

    borderRadius:
      "26px",

    background:
      "rgba(255,255,255,0.56)",

    border:
      "1px solid rgba(255,255,255,0.88)",

    boxShadow:
      "0 18px 50px rgba(41,55,40,0.06)",
  },

  intelligenceTitle: {
    margin:
      "0 0 22px",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "26px",

    fontWeight:
      "500",

    color:
      "#263328",
  },

  intelligenceList: {
    display:
      "grid",

    gap:
      "0",
  },

  intelRow: {
    padding:
      "12px 0",

    borderBottom:
      "1px solid rgba(50,68,49,0.07)",

    display:
      "grid",

    gap:
      "4px",
  },

  intelLabel: {
    color:
      "#7A8478",

    fontSize:
      "9px",

    fontWeight:
      "900",

    letterSpacing:
      "0.09em",

    textTransform:
      "uppercase",
  },

  intelValue: {
    color:
      "#394638",

    fontSize:
      "13px",

    lineHeight:
      1.45,
  },

  intelValueAccent: {
    color:
      "#527052",
  },

  watchCard: {
    marginTop:
      "18px",

    padding:
      "18px",

    borderRadius:
      "19px",

    background:
      "#263B2B",

    color:
      "#FFFFFF",
  },

  watchLabel: {
    margin:
      "0 0 9px",

    color:
      "rgba(255,255,255,0.46)",

    fontSize:
      "8px",

    fontWeight:
      "900",

    letterSpacing:
      "0.13em",
  },

  watchTitle: {
    display:
      "block",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "18px",

    fontWeight:
      "500",

    lineHeight:
      1.3,
  },

  watchText: {
    margin:
      "10px 0 0",

    color:
      "rgba(255,255,255,0.68)",

    fontSize:
      "11px",

    lineHeight:
      1.65,
  },

  companionNote: {
    marginTop:
      "18px",

    display:
      "flex",

    alignItems:
      "center",

    gap:
      "10px",

    color:
      "#6D766B",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "12px",

    lineHeight:
      1.5,
  },
};

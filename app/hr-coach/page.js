"use client";

import { requireHRMembership } from "../../lib/authGuard";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";
import { buildOrganisationContext } from "../../lib/rootOrganisationContext";


const conversationStarters = {
  findings: {
    label: "Question Root's findings",
    userMessage: "I want to question Root's findings.",
    rootMessage:
      "Good. Root's current picture should be questioned, not accepted without context. Let us begin with the strongest recorded signal and examine what supports it, what might challenge it, and what Root still does not know.",
  },

  board: {
    label: "Prepare for a board meeting",
    userMessage: "Help me prepare for a board meeting.",
    rootMessage:
      "We can turn the current organisation picture into a clear board-level conversation. We will separate evidence, interpretation, uncertainty and recommended action so that the discussion remains useful and defensible.",
  },

  nextSteps: {
    label: "Decide what to do next",
    userMessage: "Help me decide what the organisation should do next.",
    rootMessage:
      "Let us avoid rushing straight to a solution. We can first identify the strongest signal, test possible explanations and then choose the smallest useful action that would either improve the situation or increase understanding.",
  },

  voice: {
    label: "Start a voice conversation",
    userMessage: "I want to continue this as a voice conversation.",
    rootMessage:
      "The shared voice conversation will use this same organisation context and reasoning layer. Voice connection is not active yet, but this conversation is now ready to become its foundation.",
  },
};

function formatRootMessage(content) {
  if (!content) return null;

  const lines = String(content).split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return (
        <div
          key={`space-${index}`}
          style={{ height: "8px" }}
        />
      );
    }

    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);

    if (headingMatch) {
      return (
        <strong
          key={`heading-${index}`}
          style={styles.rootResponseHeading}
        >
          {headingMatch[1]}
        </strong>
      );
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);

    if (numberedMatch) {
      return (
        <div
          key={`number-${index}`}
          style={styles.rootResponseListItem}
        >
          <strong style={styles.rootResponseMarker}>
            {numberedMatch[1]}.
          </strong>

          <span>
            {formatInlineText(numberedMatch[2], index)}
          </span>
        </div>
      );
    }

    const bulletMatch = trimmed.match(/^[-•]\s+(.+)$/);

    if (bulletMatch) {
      return (
        <div
          key={`bullet-${index}`}
          style={styles.rootResponseListItem}
        >
          <strong style={styles.rootResponseMarker}>
            •
          </strong>

          <span>
            {formatInlineText(bulletMatch[1], index)}
          </span>
        </div>
      );
    }

    return (
      <p
        key={`paragraph-${index}`}
        style={styles.rootResponseParagraph}
      >
        {formatInlineText(trimmed, index)}
      </p>
    );
  });
}

function formatInlineText(text, lineIndex) {
  const parts = String(text).split(/(\*\*.*?\*\*)/g);

  return parts.map((part, partIndex) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong
          key={`${lineIndex}-${partIndex}`}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function RootContextCard({ context }) {
  if (!context?.show) {
    return null;
  }

  const areas = Array.isArray(
    context?.areas
  )
    ? context.areas
    : [];

  const questions = [
    ...new Set(
      areas.flatMap((area) =>
        Array.isArray(
          area?.reflectionQuestions
        )
          ? area.reflectionQuestions
          : []
      )
    ),
  ].slice(0, 5);

  const humanBoundary =
    context?.humanDecisionBoundary;

  return (
    <div style={styles.rootContextCard}>
      <div
        style={
          styles.rootContextGlow
        }
      />

      <div
        style={
          styles.rootContextHeader
        }
      >
        <div
          style={
            styles.rootContextLeaf
          }
        >
          🍃
        </div>

        <div>
          <span
            style={
              styles.rootContextEyebrow
            }
          >
            A little more context
          </span>

          <strong
            style={
              styles.rootContextTitle
            }
          >
            Root noticed something
            that may help
          </strong>
        </div>
      </div>

      <p
        style={
          styles.rootContextIntroduction
        }
      >
        {context?.introduction ||
          "There may be some additional context worth considering before you decide what to do next."}
      </p>

      {areas.length > 0 && (
        <div
          style={
            styles.rootContextAreas
          }
        >
          {areas.map((area) => (
            <span
              key={area.key}
              style={
                styles.rootContextArea
              }
            >
              <span>
                {area.icon || "🍃"}
              </span>

              <span>
                {area.label}
              </span>
            </span>
          ))}
        </div>
      )}

      <details
        style={
          styles.rootContextDetails
        }
      >
        <summary
          style={
            styles.rootContextSummary
          }
        >
          Why might this be worth
          another look?
        </summary>

        <div
          style={
            styles.rootContextExpanded
          }
        >
          {humanBoundary?.triggered &&
            humanBoundary?.message && (
              <div
                style={
                  styles.rootContextBoundary
                }
              >
                <strong>
                  The decision remains
                  yours.
                </strong>

                <p>
                  {
                    humanBoundary.message
                  }
                </p>
              </div>
            )}

          {questions.length > 0 && (
            <div>
              <span
                style={
                  styles.rootContextQuestionLabel
                }
              >
                Questions worth
                considering
              </span>

              <div
                style={
                  styles.rootContextQuestions
                }
              >
                {questions.map(
                  (question) => (
                    <div
                      key={question}
                      style={
                        styles.rootContextQuestion
                      }
                    >
                      <span
                        style={
                          styles.rootContextQuestionDot
                        }
                      >
                        •
                      </span>

                      <span>
                        {question}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div
            style={
              styles.rootContextPromise
            }
          >
            <strong>
              Root strengthens the
              foundation for your
              decision.
            </strong>

            <span>
              It does not make the
              employment decision for
              you.
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}

export default function HRCoachPage() {
  const [loading, setLoading] = useState(true);
  const [organisation, setOrganisation] = useState(null);
  const [members, setMembers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [voiceSessions, setVoiceSessions] = useState([]);
  const [organisationReviews, setOrganisationReviews] = useState([]);
  const [organisationContext, setOrganisationContext] = useState(null);
  const [evidenceStatus, setEvidenceStatus] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceError, setVoiceError] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isRootSpeaking, setIsRootSpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [message, setMessage] = useState("");
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const conversationEndRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const voiceReplyInProgressRef = useRef(false);

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
  return () => {
    stopVoiceConversation();
  };
}, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [conversation]);

  async function loadContext() {
    setLoading(true);

    const access = await requireHRMembership();

    if (!access.allowed) {
      window.location.href = access.redirectTo;
      return;
    }

    const membership = access.membership;
    const orgId = membership.organisation_id;

    try {
  const context =
    await buildOrganisationContext({
      supabase,
      organisationId: orgId,
    });

  setOrganisationContext(context);
} catch (contextError) {
  console.error(
    "ROOT ORGANISATION CONTEXT ERROR:",
    contextError
  );

  setOrganisationContext(null);
}

    localStorage.setItem(
      "root_hr_org_v1",
      JSON.stringify({
        organisation_id: membership.organisation_id,
        role: membership.role,
      })
    );

    localStorage.setItem("root_profile_key_v1", membership.profile_key);

    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();

    if (orgError || !org) {
      setOrganisation(null);
      setLoading(false);
      return;
    }

    setOrganisation(org);

    const { data: memberData } = await supabase
      .from("organisation_members")
      .select("*")
      .eq("organisation_id", orgId);

    const { data: assessmentData } = await supabase
      .from("wellbeing_assessments")
      .select("*")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: true });

    const { data: mindData } = await supabase
      .from("mind_entries")
      .select("*")
      .eq("organisation_id", orgId)
      .limit(200);

    const { data: journalData } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("organisation_id", orgId)
      .limit(200);

    const { data: voiceData } = await supabase
      .from("voice_sessions")
      .select("*")
      .eq("organisation_id", orgId)
      .limit(200);
      
      const { data: organisationReviewData } = await supabase
  .from("organisation_learning_reviews")
  .select("*")
  .eq("organisation_id", orgId)
  .order("created_at", { ascending: true })
  .limit(24);

    setMembers(Array.isArray(memberData) ? memberData : []);
    setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
    setMindEntries(Array.isArray(mindData) ? mindData : []);
    setJournalEntries(Array.isArray(journalData) ? journalData : []);
    setVoiceSessions(Array.isArray(voiceData) ? voiceData : []);
    setOrganisationReviews(
  Array.isArray(organisationReviewData)
    ? organisationReviewData
    : []
);

    setLoading(false);
  }

  async function startConversation(type) {
  const starter = conversationStarters[type];

  if (!starter) return;

  await handleSend({
    preventDefault: () => {},
    starterMessage: starter.userMessage,
    starterIntent: type,
  });
}

  async function handleSend(event) {
  event.preventDefault();

  const cleanMessage = event.starterMessage || message.trim();

  if (!cleanMessage) return;

  setConversationStarted(true);
  setIsThinking(true);

  const userEntry = {
    id: `${Date.now()}-user`,
    role: "user",
    content: cleanMessage,
  };

  const conversationForApi = [
    ...conversation,
    userEntry,
  ];

  setConversation(conversationForApi);
  setMessage("");

  try {
    const response = await fetch(
      "/api/organisation-coach",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanMessage,

          conversation: conversationForApi.map((entry) => ({
  role: entry.role,
  content: entry.content,
})),

          organisation,
          organisationContext,
          members,
          assessments,
          mindEntries,
          journalEntries,
          voiceSessions,
          organisationReviews,

          intent:
  event.starterIntent ||
  "general_evidence_discussion",
        }),
      }
    );

    const data = await response.json();
    if (data.evidenceStatus) {
  setEvidenceStatus(data.evidenceStatus);
}

    setConversation((current) => [
  ...current,
  {
    id: `${Date.now()}-root`,
    role: "assistant",
    content:
      data.reply ||
      "Root could not produce a response.",

    rootContext:
      data?.rootContext || null,
  },
]);
    setIsThinking(false);
  } catch (error) {
    console.error(error);

    setConversation((current) => [
      ...current,
      {
        id: `${Date.now()}-error`,
        role: "assistant",
        content:
          "Root couldn't reach the organisation reasoning engine. Please try again.",
      },
    ]);
    setIsThinking(false);
  }
}

  function addConversationEntry(role, content, suffix = "") {
  const cleanContent = String(content || "").trim();

  if (!cleanContent) return;

  setConversationStarted(true);

  setConversation((current) => [
    ...current,
    {
      id: `${Date.now()}-${role}-${suffix || Math.random()}`,
      role,
      content: cleanContent,
    },
  ]);
}

async function requestOrganisationReply(spokenMessage) {
  const cleanMessage = String(spokenMessage || "").trim();

  if (!cleanMessage || voiceReplyInProgressRef.current) return;

  voiceReplyInProgressRef.current = true;
  setIsThinking(true);
  setVoiceStatus("thinking");

  const userEntry = {
    id: `${Date.now()}-voice-user`,
    role: "user",
    content: cleanMessage,
  };

  const conversationForApi = [
    ...conversation,
    userEntry,
  ];

  setConversationStarted(true);
  setConversation(conversationForApi);

  try {
    const response = await fetch("/api/organisation-coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: cleanMessage,

        conversation: conversationForApi.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),

        organisation,
        organisationContext,
        members,
        assessments,
        mindEntries,
        journalEntries,
        voiceSessions,
        organisationReviews,

        intent: "voice_evidence_discussion",
               }),
            });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.reply ||
          "Root could not produce a voice response."
      );
    }

    if (data.evidenceStatus) {
      setEvidenceStatus(data.evidenceStatus);
    }

    const rootReply =
      data.reply ||
      "Root could not produce a response.";

    setConversation((current) => [
  ...current,
  {
    id: `${Date.now()}-voice-root`,
    role: "assistant",
    content: rootReply,

    rootContext:
      data?.rootContext || null,
  },
]);

    speakRootReply(rootReply);
  } catch (error) {
    console.error("ROOT VOICE REASONING ERROR:", error);

    const errorMessage =
      "Root couldn't reach the organisation reasoning engine. Please try again.";

    setConversation((current) => [
      ...current,
      {
        id: `${Date.now()}-voice-error`,
        role: "assistant",
        content: errorMessage,
      },
    ]);

    setVoiceError(error.message || errorMessage);
    setVoiceStatus("connected");
  } finally {
    setIsThinking(false);
    voiceReplyInProgressRef.current = false;
  }
}

function speakRootReply(reply) {
  const channel = dataChannelRef.current;

  if (!channel || channel.readyState !== "open") {
    setVoiceStatus("connected");
    return;
  }

  setIsRootSpeaking(true);
  setVoiceStatus("speaking");

  channel.send(
    JSON.stringify({
      type: "response.create",
      response: {
        conversation: "none",
        output_modalities: ["audio"],
        input: [],
        instructions:
          "Read the following response aloud exactly as written. " +
          "Do not add, remove, explain, paraphrase or introduce it. " +
          "Use a calm, natural, professional British conversational tone.\n\n" +
          reply,
        metadata: {
          source: "root_organisation_coach",
        },
      },
    })
  );
}

function handleRealtimeEvent(event) {
  if (!event || !event.type) return;

 if (event.type === "input_audio_buffer.speech_started") {
  setVoiceStatus(
    isRootSpeaking ? "speaking" : "listening"
  );

  return;
}

  if (event.type === "input_audio_buffer.speech_stopped") {
    setVoiceStatus("transcribing");
    return;
  }

 if (
  event.type ===
  "conversation.item.input_audio_transcription.completed"
) {
  const transcript = String(
    event.transcript || ""
  ).trim();

  if (!transcript) {
    return;
  }

  const meaningfulSpeech =
    transcript
      .replace(/[^\p{L}\p{N}]/gu, "")
      .trim();

  if (!meaningfulSpeech) {
    return;
  }

  if (isRootSpeaking) {
    const channel = dataChannelRef.current;

    if (
      channel &&
      channel.readyState === "open"
    ) {
      channel.send(
        JSON.stringify({
          type: "response.cancel",
        })
      );
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();

      remoteAudioRef.current
        .play()
        .catch(() => {});
    }

    setIsRootSpeaking(false);
  }

  requestOrganisationReply(transcript);

  return;
}

  if (event.type === "response.created") {
    setIsRootSpeaking(true);
    setVoiceStatus("speaking");
    return;
  }

  if (
    event.type === "response.output_audio.done" ||
    event.type === "response.done"
  ) {
    setIsRootSpeaking(false);
    setVoiceStatus("listening");
    return;
  }

  if (event.type === "error") {
    console.error("OPENAI REALTIME ERROR:", event);

    setVoiceError(
      event?.error?.message ||
        event?.message ||
        "The voice connection reported an error."
    );

    setVoiceStatus("error");
  }
}

async function startVoiceConversation() {
  if (isVoiceActive) return;

  setVoiceError("");
  setVoiceStatus("connecting");

  try {
    if (
      typeof window === "undefined" ||
      !window.RTCPeerConnection ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error(
        "This browser does not support live voice conversations."
      );
    }

    const tokenResponse = await fetch(
      "/api/hr-voice-session",
      {
        method: "POST",
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.clientSecret) {
      throw new Error(
        tokenData?.error ||
          "Root could not create a secure voice session."
      );
    }

    const peerConnection = new RTCPeerConnection();
    peerConnectionRef.current = peerConnection;

    const remoteAudio = document.createElement("audio");
    remoteAudio.autoplay = true;
    remoteAudio.playsInline = true;
    remoteAudioRef.current = remoteAudio;

    peerConnection.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];

      remoteAudio.play().catch((error) => {
        console.error(
          "ROOT REMOTE AUDIO PLAYBACK ERROR:",
          error
        );
      });
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;

      if (state === "connected") {
        setIsVoiceActive(true);
        setVoiceStatus("listening");
      }

      if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        if (state !== "closed") {
          setVoiceError(
            "The live voice connection was interrupted."
          );
        }

        stopVoiceConversation();
      }
    };

    const microphoneStream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

    microphoneStreamRef.current = microphoneStream;

    microphoneStream.getTracks().forEach((track) => {
      peerConnection.addTrack(
        track,
        microphoneStream
      );
    });

    const dataChannel =
      peerConnection.createDataChannel("oai-events");

    dataChannelRef.current = dataChannel;

    dataChannel.addEventListener("open", () => {
      dataChannel.send(
        JSON.stringify({
          type: "session.update",
          session: {
            type: "realtime",
            model: "gpt-realtime-2.1",
            output_modalities: ["audio"],
            audio: {
              input: {
                transcription: {
                  model: "gpt-live-transcribe",
                  language: "en",
                },
              turn_detection: {
  type: "server_vad",
  threshold: 0.9, 
  prefix_padding_ms: 300,
  silence_duration_ms: 650,
  create_response: false,
  interrupt_response: false,
},
              },
              output: {
                voice: "marin",
              },
            },
            instructions:
              "You are only the live audio interface for Root. " +
              "Do not independently answer the user. " +
              "User speech is handled by Root's organisation reasoning engine. " +
              "Only speak when the application explicitly sends a response.create instruction.",
          },
        })
      );
    });

    dataChannel.addEventListener(
      "message",
      (messageEvent) => {
        try {
          const realtimeEvent = JSON.parse(
            messageEvent.data
          );

          handleRealtimeEvent(realtimeEvent);
        } catch (error) {
          console.error(
            "ROOT REALTIME EVENT PARSE ERROR:",
            error
          );
        }
      }
    );

    dataChannel.addEventListener("close", () => {
      setIsVoiceActive(false);
      setVoiceStatus("idle");
    });

    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer
    );

    const sdpResponse = await fetch(
      "https://api.openai.com/v1/realtime/calls",
      {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization:
            `Bearer ${tokenData.clientSecret}`,
          "Content-Type": "application/sdp",
        },
      }
    );

    const answerSdp = await sdpResponse.text();

    if (!sdpResponse.ok) {
      throw new Error(
        answerSdp ||
          "Root could not complete the live voice connection."
      );
    }

    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: answerSdp,
    });

    setConversationStarted(true);
  } catch (error) {
    console.error(
      "ROOT LIVE VOICE START ERROR:",
      error
    );

    setVoiceError(
      error.message ||
        "Root could not start the live voice conversation."
    );

    stopVoiceConversation();
    setVoiceStatus("error");
  }
}

function stopVoiceConversation() {
  const channel = dataChannelRef.current;
  const peerConnection =
    peerConnectionRef.current;
  const microphoneStream =
    microphoneStreamRef.current;
  const remoteAudio =
    remoteAudioRef.current;

  if (channel) {
    try {
      channel.close();
    } catch (error) {
      console.error(
        "ROOT VOICE CHANNEL CLOSE ERROR:",
        error
      );
    }
  }

  if (microphoneStream) {
    microphoneStream
      .getTracks()
      .forEach((track) => track.stop());
  }

  if (peerConnection) {
    try {
      peerConnection.close();
    } catch (error) {
      console.error(
        "ROOT PEER CONNECTION CLOSE ERROR:",
        error
      );
    }
  }

  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
  }

  dataChannelRef.current = null;
  peerConnectionRef.current = null;
  microphoneStreamRef.current = null;
  remoteAudioRef.current = null;
  voiceReplyInProgressRef.current = false;

  setIsVoiceActive(false);
  setIsRootSpeaking(false);
  setVoiceStatus("idle");
}

  function clearConversation() {
  stopVoiceConversation();
  setConversation([]);
  setConversationStarted(false);
  setMessage("");
  setIsThinking(false);
  setVoiceError("");
}

  const activated = members.filter((member) => member.activated_at).length;

  const baselineCompleted = members.filter(
    (member) => member.baseline_completed_at
  ).length;

  const supportInteractions =
    mindEntries.length + journalEntries.length + voiceSessions.length;

  const concernMetrics = [
    {
      label: "Stress",
      field: "stress_score",
    },
    {
      label: "Burnout",
      field: "burnout_score",
    },
    {
      label: "Sleep difficulty",
      field: "sleep_score",
    },
    {
      label: "Recovery difficulty",
      field: "recovery_score",
    },
    {
      label: "Mood difficulty",
      field: "mood_score",
    },
    {
      label: "Focus difficulty",
      field: "focus_score",
    },
  ]
    .map((metric) => {
      const validScores = assessments
        .map((assessment) => Number(assessment?.[metric.field]))
        .filter((score) => Number.isFinite(score));

      const average =
        validScores.length > 0
          ? validScores.reduce((total, score) => total + score, 0) /
            validScores.length
          : null;

      return {
        ...metric,
        average,
        evidenceCount: validScores.length,
      };
    })
    .filter((metric) => metric.average !== null)
    .sort((a, b) => b.average - a.average);

  const primaryConcern = concernMetrics[0] || null;
  const secondaryConcern = concernMetrics[1] || null;

  const baselineParticipation =
    members.length > 0
      ? Math.round((baselineCompleted / members.length) * 100)
      : 0;

  const evidenceStage =
  assessments.length >= 20
    ? "Established"
    : assessments.length >= 8
    ? "Developing"
    : "Early Stage";

  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <style>{`
  @keyframes rootContextReveal {
    from {
      opacity: 0;
      transform: translateY(7px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>
        <section style={styles.card}> 
          <div style={styles.topButtons}>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/org-insights";
              }}
              style={styles.backButton}
            >
              ← Organisation Insights
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/organisation-learning";
              }}
              style={styles.intelligenceButton}
            >
              🧠 Update Organisation Intelligence
            </button>
          </div>

          <RootEnso size={90} />

          <p style={styles.kicker}>Root Workplace</p>

          <h1 style={styles.title}>Ask Root</h1>

          {loading ? (
            <p style={styles.text}>
              Root is reviewing the latest organisation picture...
            </p>
          ) : (
            <>
              <p style={styles.subtitle}>
                I&apos;ve already reviewed{" "}
                {organisation?.name || "your organisation"}.
              </p>

              <p style={styles.text}>
                Good decisions begin with good understanding. Let&apos;s
                explore what Root is noticing together.
              </p>

              <div style={styles.snapshotGrid}>
                <div style={styles.snapshotCard}>
                 <span>Programme members</span>
                 <strong>{members.length}</strong>
               </div>

                <div style={styles.snapshotCard}>
                  <span>Activated</span>
                  <strong>{activated}</strong>
                </div>

                <div style={styles.snapshotCard}>
                  <span>Baselines</span>
                  <strong>{baselineCompleted}</strong>
                </div>

                <div style={styles.snapshotCard}>
                  <span>Assessments</span>
                  <strong>{assessments.length}</strong>
                </div>

                <div style={styles.snapshotCard}>
                  <span>Support interactions</span>
                  <strong>{supportInteractions}</strong>
                </div>

                <div style={styles.snapshotCard}>
                  <span>Evidence stage</span>
                  <strong>{evidenceStage}</strong>
                </div>
              </div>

              <section style={styles.rootFocusBox}>
                <p style={styles.focusKicker}>
                  Root&apos;s current starting point
                </p>

                <h2 style={styles.focusTitle}>
                  Here is what Root is bringing to the conversation
                </h2>

                <p style={styles.text}>
                  This is not a final conclusion. It is the clearest starting
                  point supported by the evidence currently available.
                </p>

                <div style={styles.focusGrid}>
                  <div style={styles.focusCard}>
                    <span style={styles.focusLabel}>
                      Strongest current signal
                    </span>

                    {primaryConcern ? (
                      <>
                        <strong style={styles.focusValue}>
                          {primaryConcern.label}
                        </strong>

                        <p style={styles.focusText}>
                          Average recorded difficulty:{" "}
                          <strong>
                            {primaryConcern.average.toFixed(1)} / 10
                          </strong>
                        </p>
                      </>
                    ) : (
                      <p style={styles.focusText}>
                        Root does not yet have enough assessment evidence to
                        identify a leading concern.
                      </p>
                    )}
                  </div>

                  <div style={styles.focusCard}>
                    <span style={styles.focusLabel}>
                      Another signal to explore
                    </span>

                    {secondaryConcern ? (
                      <>
                        <strong style={styles.focusValue}>
                          {secondaryConcern.label}
                        </strong>

                        <p style={styles.focusText}>
                          Average recorded difficulty:{" "}
                          <strong>
                            {secondaryConcern.average.toFixed(1)} / 10
                          </strong>
                        </p>
                      </>
                    ) : (
                      <p style={styles.focusText}>
                        Further evidence will help Root distinguish between
                        different organisational pressures.
                      </p>
                    )}
                  </div>

                  <div style={styles.focusCard}>
                    <span style={styles.focusLabel}>
                      Participation picture
                    </span>

                    <strong style={styles.focusValue}>
                      {baselineParticipation}%
                    </strong>

                  <p style={styles.focusText}>
                    {baselineCompleted} of {members.length} recorded programme members
                     have completed a baseline.
                  </p>
                  </div>

                  <div style={styles.focusCard}>
                    <span style={styles.focusLabel}>
  Evidence stage
</span>

<strong style={styles.focusValue}>
  {evidenceStage}
</strong>

<p style={styles.focusText}>
  {evidenceStage === "Established"
    ? "Root has accumulated a larger assessment evidence base, while organisation-wide confidence still depends on participation, representation and longitudinal strength."
    : evidenceStage === "Developing"
    ? "Root has enough assessment records to identify useful signals, but this does not by itself establish organisation-wide confidence."
    : "Root is beginning to form an evidence base. Early signals should be treated as questions rather than conclusions."}
</p>
                  </div>
                </div>

                <div style={styles.rootQuestion}>
                  <strong>Root&apos;s opening question</strong>

                  <p style={styles.rootQuestionText}>
                    {primaryConcern
                      ? `The strongest current signal is ${primaryConcern.label.toLowerCase()}. What has been happening inside the organisation that might help explain this?`
                      : "What has been happening inside the organisation that Root should understand before interpreting the numbers?"}
                  </p>
                </div>
              </section>

              <section style={styles.insightBox}>
                <h2 style={styles.sectionTitle}>
                  How can Root help you think this through?
                </h2>

                <p style={styles.text}>
                  Root has the latest organisation context ready, but this
                  space is for questions, challenge, planning and conversation
                  — not another report.
                </p>

                <p style={styles.text}>Where would you like us to begin?</p>

                <div style={styles.promptGrid}>
                  <button
                    type="button"
                    onClick={() => startConversation("findings")}
                    style={styles.promptButton}
                  >
                    💬 Question Root&apos;s findings
                  </button>

                  <button
                    type="button"
                    onClick={() => startConversation("board")}
                    style={styles.promptButton}
                  >
                    📄 Prepare for a board meeting
                  </button>

                  <button
                    type="button"
                    onClick={() => startConversation("nextSteps")}
                    style={styles.promptButton}
                  >
                    🧭 Help me decide what to do next
                  </button>

                  <button
  type="button"
  onClick={
    isVoiceActive
      ? stopVoiceConversation
      : startVoiceConversation
  }
  style={{
    ...styles.promptButton,
    ...(isVoiceActive
      ? styles.activeVoiceButton
      : {}),
  }}
>
  {isVoiceActive
    ? "■ End voice conversation"
    : voiceStatus === "connecting"
    ? "🎤 Connecting..."
    : "🎤 Start a voice conversation"}
</button>
                </div>
              </section>

              {voiceStatus !== "idle" || voiceError ? (
  <div style={styles.voiceStatusBox}>
    <span style={styles.voiceStatusPulse} />

    <strong>
      {voiceStatus === "connecting"
        ? "Connecting Root Voice..."
        : voiceStatus === "listening"
        ? "Root is listening"
        : voiceStatus === "transcribing"
        ? "Root is understanding what you said"
        : voiceStatus === "thinking"
        ? "Root is reviewing the organisation evidence"
        : voiceStatus === "speaking"
        ? "Root is speaking"
        : voiceStatus === "error"
        ? "Voice needs attention"
        : "Root Voice"}
    </strong>

    {voiceError ? (
      <span style={styles.voiceErrorText}>
        {voiceError}
      </span>
    ) : null}
  </div>
) : null}
              <section style={styles.conversationSection}>
                <div style={styles.conversationHeader}>
                  <div>
                    <p style={styles.conversationKicker}>
                      Organisation conversation
                    </p>

                    <h2 style={styles.conversationTitle}>
                      Think with Root
                    </h2>
                  </div>

                  {conversation.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearConversation}
                      style={styles.clearButton}
                    >
                      Clear conversation
                    </button>
                  ) : null}
                </div>

                {evidenceStatus && (
  <div style={styles.evidenceStrip}>
    <span>
      <strong>Evidence confidence:</strong>{" "}
      {evidenceStatus.organisationConfidence}
    </span>

    <span style={styles.evidenceDot}>·</span>

    <span>
      <strong>Action readiness:</strong>{" "}
      {evidenceStatus.interventionReadiness}
    </span>
  </div>
)}



                <div style={styles.conversationWindow}>
                  {!conversationStarted || conversation.length === 0 ? (
                    <div style={styles.emptyConversation}>
                      <RootEnso size={58} />

                      <strong style={styles.emptyTitle}>
                        The conversation begins here
                      </strong>

                      <p style={styles.emptyText}>
                        Choose one of the starting points above, or write your
                        own question below.
                      </p>
                    </div>
                  ) : (
                    conversation.map((entry) => {
  const isUser =
    entry.role === "user";

  return (
    <div
      key={entry.id}
      style={{
        ...styles.messageRow,
        justifyContent: isUser
          ? "flex-end"
          : "flex-start",
      }}
    >
      <div
        style={{
          ...styles.messageStack,
          alignItems: isUser
            ? "flex-end"
            : "flex-start",
        }}
      >
        <div
          style={{
            ...styles.messageBubble,
            ...(isUser
              ? styles.userMessage
              : styles.rootMessage),
          }}
        >
          <span
            style={
              styles.messageAuthor
            }
          >
            {isUser
              ? "You"
              : "Root"}
          </span>

          {isUser ? (
            <p
              style={
                styles.messageText
              }
            >
              {entry.content}
            </p>
          ) : (
            <div
              style={
                styles.rootResponse
              }
            >
              {formatRootMessage(
                entry.content
              )}
            </div>
          )}
        </div>

        {!isUser &&
          entry?.rootContext
            ?.show === true && (
            <RootContextCard
              context={
                entry.rootContext
              }
            />
          )}
      </div>
    </div>
  );
})
                  )}

                  {isThinking && (
  <div
    style={{
      ...styles.messageRow,
      justifyContent: "flex-start",
    }}
  >
    <div
      style={{
        ...styles.messageBubble,
        ...styles.rootMessage,
      }}
    >
      <span style={styles.messageAuthor}>
        Root
      </span>

      <p style={styles.messageText}>
        Reviewing the organisation evidence...
      </p>
    </div>
  </div>
)}

                  <div ref={conversationEndRef} />
                </div>

                <form onSubmit={handleSend} style={styles.messageForm}>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        handleSend(event);
                      }
                    }}
                    placeholder="Ask Root about the organisation picture..."
                    rows={3}
                    style={styles.messageInput}
                  />

                  <button
                    type="submit"
                    disabled={!message.trim()}
                    style={{
                      ...styles.sendButton,
                      opacity: message.trim() ? 1 : 0.45,
                      cursor: message.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Send
                  </button>
                </form>

                <p style={styles.conversationNote}>
  Root uses the organisation&apos;s current evidence to support this
  conversation. Its conclusions will develop as the evidence develops.
</p>
              </section>
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
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
  },

  card: {
    maxWidth: "900px",
    width: "100%",
    textAlign: "center",
    padding: "50px",
    borderRadius: "34px",
    background: "rgba(255,255,255,0.22)",
    backdropFilter: "blur(22px)",
    border: "1px solid rgba(255,255,255,0.32)",
    boxShadow: "0 34px 100px rgba(20,18,15,0.16)",
  },

  topButtons: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "26px",
    flexWrap: "wrap",
  },

  backButton: {
    padding: "10px 18px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.5)",
    background: "rgba(255,255,255,0.45)",
    cursor: "pointer",
    fontWeight: 700,
    color: "#181818",
  },

  intelligenceButton: {
    padding: "10px 18px",
    borderRadius: "999px",
    border: "1px solid rgba(72,119,84,0.25)",
    background: "rgba(72,119,84,0.12)",
    cursor: "pointer",
    fontWeight: 700,
    color: "#29533A",
  },

  kicker: {
    marginTop: "14px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontWeight: "800",
    color: "#6F675B",
  },

  title: {
    fontSize: "46px",
    margin: "8px 0 10px",
    color: "#181818",
  },

  subtitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#181818",
  },

  text: {
    marginTop: "16px",
    lineHeight: 1.7,
    fontSize: "17px",
    color: "#4D463B",
  },

  snapshotGrid: {
    marginTop: "34px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "14px",
  },

  snapshotCard: {
    padding: "20px",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.48)",
    border: "1px solid rgba(255,255,255,0.72)",
    display: "grid",
    gap: "8px",
  },

  rootFocusBox: {
    marginTop: "30px",
    padding: "30px",
    borderRadius: "28px",
    background:
      "linear-gradient(145deg, rgba(233,241,230,0.78), rgba(255,255,255,0.46))",
    border: "1px solid rgba(92,120,86,0.2)",
    textAlign: "left",
  },

  focusKicker: {
    margin: 0,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.13em",
    fontWeight: "800",
    color: "#62705F",
  },

  focusTitle: {
    margin: "8px 0 0",
    fontSize: "27px",
    lineHeight: 1.25,
    color: "#181818",
  },

  focusGrid: {
    marginTop: "24px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "14px",
  },

  focusCard: {
    padding: "20px",
    borderRadius: "21px",
    background: "rgba(255,255,255,0.56)",
    border: "1px solid rgba(255,255,255,0.78)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  focusLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.09em",
    fontWeight: "800",
    color: "#6F675B",
  },

  focusValue: {
    fontSize: "23px",
    lineHeight: 1.2,
    color: "#20251F",
  },

  focusText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#575047",
  },

  rootQuestion: {
    marginTop: "18px",
    padding: "19px 21px",
    borderRadius: "20px",
    background: "rgba(45,65,49,0.9)",
    color: "#FFFFFF",
    lineHeight: 1.65,
  },

  rootQuestionText: {
    margin: "8px 0 0",
  },

  insightBox: {
    marginTop: "30px",
    padding: "28px",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.38)",
    border: "1px solid rgba(255,255,255,0.62)",
  },

  sectionTitle: {
    marginTop: 0,
    fontSize: "26px",
    color: "#181818",
  },

  promptGrid: {
    marginTop: "24px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },

  promptButton: {
    padding: "16px 18px",
    borderRadius: "18px",
    border: "none",
    cursor: "pointer",
    background: "#181818",
    color: "#FFFFFF",
    fontWeight: "700",
    lineHeight: 1.4,
  },

  conversationSection: {
    marginTop: "30px",
    padding: "28px",
    borderRadius: "28px",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.54), rgba(240,244,236,0.4))",
    border: "1px solid rgba(255,255,255,0.72)",
    textAlign: "left",
  },

  conversationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },

  conversationKicker: {
    margin: 0,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontWeight: "800",
    color: "#687064",
  },

  conversationTitle: {
    margin: "6px 0 0",
    fontSize: "28px",
    color: "#181818",
  },

  clearButton: {
    padding: "9px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(24,24,24,0.14)",
    background: "rgba(255,255,255,0.5)",
    color: "#4D463B",
    cursor: "pointer",
    fontWeight: "700",
  },

  conversationWindow: {
    marginTop: "22px",
    minHeight: "320px",
    maxHeight: "560px",
    overflowY: "auto",
    padding: "20px",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.48)",
    border: "1px solid rgba(255,255,255,0.82)",
    scrollBehavior: "smooth",
  },

  emptyConversation: {
    minHeight: "278px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "20px",
  },

  emptyTitle: {
    marginTop: "14px",
    fontSize: "20px",
    color: "#242823",
  },

  emptyText: {
    maxWidth: "430px",
    margin: "10px 0 0",
    lineHeight: 1.65,
    color: "#625B51",
  },

  messageRow: {
    width: "100%",
    display: "flex",
    marginBottom: "16px",
  },

  messageStack: {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "9px",
},

rootContextCard: {
  position: "relative",
  overflow: "hidden",
  width:
    "min(620px, calc(100% - 10px))",
  boxSizing: "border-box",
  padding: "18px 20px",
  borderRadius: "22px",
  background:
    "linear-gradient(145deg, rgba(248,246,236,0.98), rgba(235,243,230,0.96))",
  border:
    "1px solid rgba(94,116,83,0.16)",
  boxShadow:
    "0 14px 38px rgba(44,56,39,0.09)",
  color: "#30372D",
  animation:
    "rootContextReveal 520ms ease-out",
},

rootContextGlow: {
  position: "absolute",
  width: "150px",
  height: "150px",
  right: "-70px",
  top: "-78px",
  borderRadius: "999px",
  background:
    "rgba(118,145,101,0.10)",
  pointerEvents: "none",
},

rootContextHeader: {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "11px",
},

rootContextLeaf: {
  width: "36px",
  height: "36px",
  flex: "0 0 auto",
  display: "grid",
  placeItems: "center",
  borderRadius: "999px",
  background:
    "rgba(83,112,73,0.09)",
  fontSize: "17px",
},

rootContextEyebrow: {
  display: "block",
  marginBottom: "2px",
  color: "#74816E",
  fontSize: "9px",
  fontWeight: "900",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
},

rootContextTitle: {
  display: "block",
  color: "#30372D",
  fontSize: "15px",
  lineHeight: "1.35",
},

rootContextIntroduction: {
  position: "relative",
  margin: "12px 0 0",
  color: "#62695D",
  fontSize: "13px",
  lineHeight: "1.65",
},

rootContextAreas: {
  position: "relative",
  marginTop: "13px",
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
},

rootContextArea: {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 10px",
  borderRadius: "999px",
  background:
    "rgba(255,255,255,0.56)",
  border:
    "1px solid rgba(82,105,73,0.10)",
  color: "#566050",
  fontSize: "11px",
  fontWeight: "700",
},

rootContextDetails: {
  position: "relative",
  marginTop: "13px",
  paddingTop: "11px",
  borderTop:
    "1px solid rgba(84,105,74,0.10)",
},

rootContextSummary: {
  cursor: "pointer",
  color: "#53634E",
  fontSize: "12px",
  fontWeight: "800",
  listStyle: "none",
},

rootContextExpanded: {
  paddingTop: "14px",
  display: "grid",
  gap: "15px",
},

rootContextBoundary: {
  padding: "13px 15px",
  borderRadius: "16px",
  background:
    "rgba(255,255,255,0.54)",
  border:
    "1px solid rgba(89,108,80,0.10)",
  fontSize: "12px",
  lineHeight: "1.6",
},

rootContextQuestionLabel: {
  display: "block",
  marginBottom: "9px",
  color: "#5F6C59",
  fontSize: "10px",
  fontWeight: "900",
  letterSpacing: "0.09em",
  textTransform: "uppercase",
},

rootContextQuestions: {
  display: "grid",
  gap: "7px",
},

rootContextQuestion: {
  display: "grid",
  gridTemplateColumns:
    "14px 1fr",
  gap: "5px",
  color: "#5D6259",
  fontSize: "12px",
  lineHeight: "1.55",
},

rootContextQuestionDot: {
  color: "#758C69",
  fontWeight: "900",
},

rootContextPromise: {
  paddingTop: "12px",
  borderTop:
    "1px solid rgba(84,105,74,0.10)",
  display: "grid",
  gap: "3px",
  color: "#677063",
  fontSize: "11px",
  lineHeight: "1.5",
},

  messageBubble: {
    maxWidth: "78%",
    padding: "15px 17px",
    borderRadius: "19px",
    boxShadow: "0 10px 28px rgba(38,34,28,0.06)",
  },

  userMessage: {
    background: "#1F2520",
    color: "#FFFFFF",
    borderBottomRightRadius: "6px",
  },

  rootMessage: {
    background: "rgba(236,242,232,0.96)",
    color: "#292E29",
    border: "1px solid rgba(75,102,75,0.14)",
    borderBottomLeftRadius: "6px",
  },

  messageAuthor: {
    display: "block",
    marginBottom: "6px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: "800",
    opacity: 0.72,
  },

  messageText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.65,
    fontSize: "15px",
  },

  messageForm: {
    marginTop: "16px",
    display: "flex",
    alignItems: "stretch",
    gap: "12px",
  },

  messageInput: {
    flex: 1,
    minHeight: "82px",
    resize: "vertical",
    padding: "15px 17px",
    borderRadius: "18px",
    border: "1px solid rgba(40,49,40,0.18)",
    background: "rgba(255,255,255,0.72)",
    color: "#181818",
    fontFamily: "inherit",
    fontSize: "16px",
    lineHeight: 1.5,
    outline: "none",
  },

  sendButton: {
    minWidth: "100px",
    padding: "14px 20px", 
    borderRadius: "18px",
    border: "none",
    background: "#263B2B",
    color: "#FFFFFF",
    fontWeight: "800",
  },

  conversationNote: {
    margin: "12px 2px 0",
    fontSize: "12px",
    lineHeight: 1.5,
    color: "#746D63",
  },

  rootResponse: {
  display: "block",
  fontSize: "15px",
  lineHeight: 1.7,
},

rootResponseHeading: {
  display: "block",
  margin: "14px 0 7px",
  fontSize: "16px",
  lineHeight: 1.4,
  color: "#20251F",
},

rootResponseParagraph: {
  margin: "0 0 8px",
  lineHeight: 1.7,
},

rootResponseListItem: {
  display: "grid",
  gridTemplateColumns: "24px 1fr",
  gap: "6px",
  margin: "7px 0",
  lineHeight: 1.65,
},

rootResponseMarker: {
  color: "#536A56",
},

evidenceStrip: {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "18px",
  padding: "10px 16px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.38)",
  border: "1px solid rgba(255,255,255,0.58)",
  fontSize: "13px",
  color: "#5F675C",
},

evidenceDot: {
  opacity: 0.45,
},

activeVoiceButton: {
  background: "#6C2F2F",
},

voiceStatusBox: {
  marginTop: "16px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
  padding: "13px 17px",
  borderRadius: "18px",
  background: "rgba(38,59,43,0.10)",
  border: "1px solid rgba(38,59,43,0.18)",
  color: "#263B2B",
  fontSize: "14px",
},

voiceStatusPulse: {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: "#52755A",
  boxShadow: "0 0 0 6px rgba(82,117,90,0.12)",
},

voiceErrorText: {
  width: "100%",
  textAlign: "center",
  fontSize: "12px",
  fontWeight: "600",
  color: "#7A3D3D",
},
};
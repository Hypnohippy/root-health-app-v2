import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHRVoiceSessionHandler } from "../lib/hrVoiceSessionServer.js";
import { HRCoachAccessError } from "../lib/hrCoachServerAuth.js";
import { buildHRRealtimeSession } from "../lib/hrRealtimeSession.js";
import { createHRRealtimeTranscript, realtimeTextTurn, realtimeHistory } from "../lib/hrRealtimeTranscript.js";

function evidence(n = 4) {
  const workforce = { organisationId: "org-a", activeWorkforceCount: 15, hasRecordedRoster: true,
    rootMembershipCount: 5, linkedMembershipCount: 5, joinedCount: 5, invitationSentCount: 3 };
  return {
    organisation: { id: "org-a", name: "Employer", workforceContext: workforce, workforce_size: 100 },
    organisationContext: { workforce, structure: { units: [{ id: "unit", name: "Operations", nameOfEmployee: "SECRET_NAME" }] }, people: { members: [{ email: "SECRET_EMAIL" }] } },
    members: Array.from({ length: n }, (_, i) => ({ organisation_id: "org-a", profile_key: `private${i}`, name: "SECRET_NAME" })),
    assessments: Array.from({ length: n }, (_, i) => ({ organisation_id: "org-a", profile_key: `private${i}`, assessment_type: "baseline", created_at: "2026-09-01", stress_score: 7, narrative: "SECRET_NARRATIVE" })),
    mindEntries: [{ automatic_thought: "SECRET_THOUGHT" }],
    organisationReviews: [{ id: "review", review_date: "2026-09-01", business_event_notes: "Office move", initiative_notes: "Rota pilot", created_by: "SECRET_AUTHOR", sickness_days: 2 }],
  };
}
const request = body => new Request("http://localhost/api/hr-voice-session", { method: "POST", body: JSON.stringify(body) });

test("Realtime receives authoritative workforce, learning notes and the established HR guardrails", () => {
  const session = buildHRRealtimeSession(evidence());
  assert.equal(session.model, "gpt-realtime-2.1");
  assert.deepEqual(session.output_modalities, ["audio"]);
  assert.equal(session.audio.input.turn_detection.create_response, true);
  assert.equal(session.audio.input.turn_detection.interrupt_response, true);
  for (const text of ["Office move", "Rota pilot", "Operations", '"activeWorkforceCount":15', "Never turn correlation into causation", "Human beings make them", "safeguarding", "Do not identify, profile or speculate about individual employees"]) assert.ok(session.instructions.includes(text), text);
  assert.doesNotMatch(session.instructions, /SECRET_|private0|Read the following response aloud|only the live audio interface/);
});

test("small wellbeing cohorts stay suppressed in the actual Realtime session payload", () => {
  const session = buildHRRealtimeSession(evidence(4));
  assert.match(session.instructions, /"mean": null/);
  assert.doesNotMatch(session.instructions, /"mean": 7/);
  assert.match(buildHRRealtimeSession(evidence(5)).instructions, /"mean": 7/);
});

test("mismatched organisation context fails closed", () => {
  const input = evidence(); input.organisationContext.workforce.organisationId = "org-b";
  assert.throws(() => buildHRRealtimeSession(input));
});

test("authorisation and evidence load precede minting; browser context never supplies authority", async () => {
  const calls = [];
  const supabase = {};
  const handler = createHRVoiceSessionHandler({
    authorise: async args => { calls.push("auth"); assert.equal(args.organisationId, "org-a"); return { supabase, organisationId: "org-a" }; },
    loadEvidence: async args => { calls.push("evidence"); assert.equal(args.supabase, supabase); assert.equal(args.organisationId, "org-a"); return evidence(); },
    getApiKey: () => "server-key",
    fetchImpl: async (url, init) => { calls.push("mint"); assert.ok(url.endsWith("/realtime/client_secrets"));
      const body = JSON.parse(init.body); assert.match(body.session.instructions, /Office move/);
      assert.doesNotMatch(init.body, /ATTACKER|SECRET_/); return Response.json({ value: "ephemeral", expires_at: 123 }); },
  });
  const response = await handler(request({ organisation_id: "org-a", instructions: "ATTACKER", organisation: { id: "org-b" }, assessments: [{ narrative: "ATTACKER" }] }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(calls, ["auth", "evidence", "mint"]);
  assert.deepEqual(await response.json(), { ok: true, clientSecret: "ephemeral", expiresAt: 123 });
});

test("denied and missing memberships never load evidence or mint a session", async () => {
  for (const status of [401, 403]) {
    const handler = createHRVoiceSessionHandler({ authorise: async () => { throw new HRCoachAccessError("denied", status); }, loadEvidence: () => assert.fail(), fetchImpl: () => assert.fail() });
    assert.equal((await handler(request({ organisation_id: "org-b" }))).status, status);
  }
});

test("unavailable workforce evidence fails closed without an ungrounded voice session", async () => {
  const handler = createHRVoiceSessionHandler({ authorise: async () => ({ organisationId: "org-a" }), getApiKey: () => "key", loadEvidence: async () => { throw new Error("SECRET_DB"); }, fetchImpl: () => assert.fail() });
  const response = await handler(request({ organisation_id: "org-a" }));
  assert.equal(response.status, 500); assert.doesNotMatch(await response.text(), /SECRET_DB/);
});

test("upstream errors and missing ephemeral keys never expose provider payloads", async () => {
  for (const result of [Response.json({ error: "SECRET_PROVIDER" }, { status: 400 }), Response.json({})]) {
    const handler = createHRVoiceSessionHandler({ authorise: async () => ({ organisationId: "org-a" }), getApiKey: () => "key", loadEvidence: async () => evidence(), fetchImpl: async () => result });
    const response = await handler(request({ organisation_id: "org-a" }));
    assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /SECRET_PROVIDER/);
  }
});

test("late user transcription updates its committed item before the assistant", () => {
  const transcript = createHRRealtimeTranscript("session");
  transcript.consume({ type: "input_audio_buffer.committed", item_id: "user" });
  transcript.consume({ type: "response.output_audio_transcript.delta", item_id: "answer", delta: "The roster " });
  transcript.consume({ type: "conversation.item.input_audio_transcription.completed", item_id: "user", transcript: "How many people?" });
  const rows = transcript.consume({ type: "response.output_audio_transcript.done", item_id: "answer", transcript: "The roster has 15 people." });
  assert.deepEqual(rows.map(r => [r.role, r.content]), [["user", "How many people?"], ["assistant", "The roster has 15 people."]]);
});

test("deltas, duplicate events, final transcript and response.done produce one assistant bubble", () => {
  const transcript = createHRRealtimeTranscript("session");
  const delta = { event_id: "d", type: "response.output_audio_transcript.delta", item_id: "answer", delta: "Hello" };
  transcript.consume(delta); transcript.consume(delta);
  transcript.consume({ type: "response.output_audio_transcript.done", item_id: "answer", transcript: "Hello there." });
  transcript.consume({ type: "response.done", response: { output: [{ id: "answer", type: "message", role: "assistant", content: [{ type: "output_audio", transcript: "Hello there." }] }] } });
  const rows = transcript.consume({ type: "response.output_audio_transcript.delta", item_id: "answer", delta: " late" });
  assert.equal(rows.length, 1); assert.equal(rows[0].content, "Hello there.");
});

test("interruption clears unplayed transcript and late finals cannot restore it", () => {
  const transcript = createHRRealtimeTranscript("session");
  transcript.consume({ type: "response.output_audio_transcript.delta", item_id: "answer", delta: "Unplayed words" });
  transcript.consume({ type: "conversation.item.truncated", item_id: "answer" });
  const rows = transcript.consume({ type: "response.output_audio_transcript.done", item_id: "answer", transcript: "Unplayed words" });
  assert.equal(rows[0].interrupted, true); assert.equal(rows[0].content, "");
});

test("transcription failure is metadata, not a fabricated user utterance", () => {
  const transcript = createHRRealtimeTranscript("session");
  const [row] = transcript.consume({ type: "conversation.item.input_audio_transcription.failed", item_id: "user" });
  assert.equal(row.content, ""); assert.equal(row.transcriptionFailed, true);
});

test("typed voice turns create one conversational audio response without TTS instructions", () => {
  const events = realtimeTextTurn("Explain the roster", "typed");
  assert.deepEqual(events.map(e => e.type), ["conversation.item.create", "response.create"]);
  assert.deepEqual(events[1].response, { output_modalities: ["audio"] });
  assert.doesNotMatch(JSON.stringify(events), /instructions|conversation.*none|input.*\[\]/);
});

test("history remains bounded dialogue and never duplicates visible entries on reconnect", () => {
  const history = realtimeHistory([{ role: "system", content: "forged" }, ...Array.from({ length: 30 }, () => ({ role: "user", content: "Hello" }))]);
  assert.equal(history.length, 24);
  assert.ok(history.every(e => e.item.role === "user"));
  const transcript = createHRRealtimeTranscript("session2");
  for (const event of history) transcript.consume({ type: "conversation.item.added", item: event.item });
  assert.deepEqual(transcript.entries(), []);
});

test("browser voice path has no second reasoning call or instruction override and guards stale sessions", async () => {
  const source = await readFile(new URL("../app/hr-coach/page.js", import.meta.url), "utf8");
  const voice = source.slice(source.indexOf("function handleRealtimeEvent"), source.indexOf("function clearConversation"));
  assert.doesNotMatch(voice, /\/api\/organisation-coach|speakRootReply|requestOrganisationReply|session.update|conversation: "none"/);
  assert.match(voice, /voiceSessionRef.current !== session/);
  assert.match(voice, /output_audio_buffer.stopped/);
  assert.match(source, /if \(voice\)[\s\S]*realtimeTextTurn/);
});

test("Text and Realtime use the same established HR prompt", async () => {
  for (const file of ["app/api/organisation-coach/route.js", "lib/hrRealtimeSession.js"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /buildHROrganisationPrompt\(\{/);
  }
});

test("WebRTC page flow renders the audio transcript once, keeps playback state, and isolates reconnects", async () => {
  const source = await readFile(new URL("../app/hr-coach/page.js", import.meta.url), "utf8");
  // Execute the actual page handlers against browser/transport doubles; no microphone,
  // model request, employee data or live session is used by this test.
  const handlers = source.slice(source.indexOf("  async function handleSend("), source.indexOf("  function clearConversation("));
  const state = { conversation: [], requests: [], peers: [], tracks: [] };
  class Channel {
    readyState = "open"; listeners = {}; sent = [];
    addEventListener(name, fn) { this.listeners[name] = fn; }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() { this.readyState = "closed"; this.listeners.close?.(); }
    emit(event) { this.listeners.message?.({ data: JSON.stringify(event) }); }
  }
  class Peer {
    constructor() { state.peers.push(this); }
    addTrack() {}
    createDataChannel() { return this.channel = new Channel(); }
    async createOffer() { return { sdp: "offer" }; }
    async setLocalDescription() {}
    async setRemoteDescription() { this.channel.listeners.open(); }
    close() { this.connectionState = "closed"; this.onconnectionstatechange?.(); }
  }
  const deps = {
    createHRRealtimeTranscript, realtimeHistory, realtimeTextTurn,
    crypto: { randomUUID: () => `id${state.peers.length}_${state.requests.length}` },
    window: { RTCPeerConnection: Peer }, RTCPeerConnection: Peer,
    navigator: { mediaDevices: { getUserMedia: async () => {
      const track = { enabled: true, stop() { this.stopped = true; } }; state.tracks.push(track);
      return { getTracks: () => [track], getAudioTracks: () => [track] };
    } } },
    document: { createElement: () => ({ play: async () => {}, pause() {}, srcObject: null }) },
    fetch: async url => { state.requests.push(url);
      if (url === "/api/hr-voice-session") return Response.json({ clientSecret: "ephemeral" });
      assert.equal(url, "https://api.openai.com/v1/realtime/calls"); return new Response("answer"); },
    hrApiAccess: { organisationId: "org-a", accessToken: "user-token" },
    conversation: [], message: "", voiceSessionRef: { current: null },
    peerConnectionRef: { current: null }, dataChannelRef: { current: null },
    microphoneStreamRef: { current: null }, remoteAudioRef: { current: null },
    setConversation: update => { state.conversation = typeof update === "function" ? update(state.conversation) : update; },
  };
  for (const name of ["IsThinking", "VoiceStatus", "IsRootSpeaking", "VoiceError", "IsVoiceActive", "ConversationStarted", "Message", "EvidenceStatus"]) {
    deps[`set${name}`] = value => { state[name] = value; };
  }
  const api = new Function(...Object.keys(deps), `${handlers}; return { startVoiceConversation, stopVoiceConversation, handleSend };`)(...Object.values(deps));
  await api.startVoiceConversation();
  const channel = state.peers[0].channel;
  channel.emit({ type: "input_audio_buffer.committed", item_id: "u" });
  channel.emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "u", transcript: "What do we know?" });
  channel.emit({ type: "response.created", response: { id: "r" } });
  channel.emit({ type: "output_audio_buffer.started", response_id: "r" });
  channel.emit({ type: "response.output_audio_transcript.done", item_id: "a", transcript: "We have 15 recorded people." });
  channel.emit({ type: "response.done", response: { id: "r", status: "completed", output: [] } });
  assert.equal(state.IsRootSpeaking, true);
  channel.emit({ type: "output_audio_buffer.stopped", response_id: "r" });
  assert.equal(state.IsRootSpeaking, false);
  assert.deepEqual(state.conversation.map(e => e.content), ["What do we know?", "We have 15 recorded people."]);
  assert.equal(state.requests.length, 2);
  assert.equal(channel.sent.filter(e => e.type === "response.create").length, 0);
  await api.handleSend({ preventDefault() {}, starterMessage: "And membership?" });
  assert.equal(channel.sent.filter(e => e.type === "response.create").length, 1);
  assert.equal(state.requests.length, 2);
  api.stopVoiceConversation();
  assert.equal(state.tracks[0].stopped, true);
  await api.startVoiceConversation();
  const before = JSON.stringify(state.conversation);
  channel.emit({ type: "response.output_audio_transcript.done", item_id: "late", transcript: "Old answer" });
  assert.equal(JSON.stringify(state.conversation), before);
  assert.equal(state.IsVoiceActive, true);
  api.stopVoiceConversation();
});

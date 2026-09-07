// One UI entry per Realtime item. Audio transcripts are never a second answer.
export function createHRRealtimeTranscript(sessionId) {
  const items = new Map();
  const seen = new Set();
  function item(id, role) {
    if (!id || id.startsWith("history_")) return null;
    if (!items.has(id)) items.set(id, { id: `${sessionId}:${id}`, realtimeItemId: id,
      voiceSessionId: sessionId, role, content: "", final: false });
    return items.get(id);
  }
  function finish(output) {
    if (output?.type !== "message" || !["user", "assistant"].includes(output.role)) return;
    const entry = item(output.id, output.role);
    if (!entry || entry.interrupted) return;
    const text = (output.content || []).map(part => output.role === "assistant"
      ? part.transcript || "" : part.transcript || part.text || "").join("");
    if (text) { entry.content = text; entry.final = true; }
  }
  return {
    consume(event) {
      if (event.event_id && seen.has(event.event_id)) return this.entries();
      if (event.event_id) seen.add(event.event_id);
      const type = event.type;
      if (type === "input_audio_buffer.committed") item(event.item_id, "user");
      if (["conversation.item.added", "conversation.item.created", "conversation.item.done", "response.output_item.added", "response.output_item.done"].includes(type)) {
        if (event.item?.role === "user" || event.item?.role === "assistant") {
          item(event.item.id, event.item.role);
          finish(event.item);
        }
      }
      if (["conversation.item.input_audio_transcription.delta", "conversation.item.input_audio_transcription.completed",
        "response.output_audio_transcript.delta", "response.output_audio_transcript.done",
        "response.audio_transcript.delta", "response.audio_transcript.done"].includes(type)) {
        const entry = item(event.item_id, type.startsWith("conversation.") ? "user" : "assistant");
        if (entry && !entry.interrupted) {
          if (type.endsWith(".delta") && !entry.final) entry.content += event.delta || "";
          else if (!type.endsWith(".delta")) { entry.content = event.transcript || entry.content; entry.final = true; }
        }
      }
      if (type === "conversation.item.truncated") {
        const entry = item(event.item_id, "assistant");
        // WebRTC removes unplayed audio. It supplies no word-aligned transcript
        // for the played prefix, so don't display an unspoken suffix as heard.
        if (entry) Object.assign(entry, { content: "", interrupted: true, final: true });
      }
      if (type === "conversation.item.input_audio_transcription.failed") {
        const entry = item(event.item_id, "user");
        if (entry) Object.assign(entry, { transcriptionFailed: true, final: true });
      }
      if (type === "response.done") for (const output of event.response?.output || []) finish(output);
      return this.entries();
    },
    entries() { return [...items.values()].map(entry => ({ ...entry })); },
  };
}

export function realtimeTextTurn(text, id) {
  return [
    { type: "conversation.item.create", item: { id, type: "message", role: "user", content: [{ type: "input_text", text }] } },
    { type: "response.create", response: { output_modalities: ["audio"] } },
  ];
}

export function realtimeHistory(conversation) {
  // Seed as dialogue, never system instructions or authoritative evidence.
  return conversation.filter(entry => ["user", "assistant"].includes(entry.role) && entry.content && !entry.interrupted)
    .slice(-24).map((entry, index) => ({ type: "conversation.item.create", item: {
      id: `history_${index}`, type: "message", role: entry.role,
      content: [{ type: entry.role === "user" ? "input_text" : "output_text", text: entry.content }],
    } }));
}

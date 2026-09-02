const PLAYBOOK_ACTION = /\b(save|add|put|store|keep|record)\b/i;
const PLAYBOOK_DESTINATION = /\b(?:my\s+)?play\s*book\b/i;

export function hasExplicitPlaybookSaveIntent(transcript = "") {
  const text = String(transcript).trim();
  return PLAYBOOK_ACTION.test(text) && PLAYBOOK_DESTINATION.test(text);
}

export function inferVoicePlaybookMeta(transcript = "", coachMode = "") {
  const text = String(transcript).toLowerCase();

  const matches = (...terms) => terms.some((term) => text.includes(term));

  if (matches("ibs", "bloating", "gut", "digest", "reflux", "constipation")) {
    return { title: "Gut Health Plan", category: "Gut Health" };
  }
  if (matches("meal", "food", "nutrition", "diet", "protein", "breakfast", "lunch", "dinner")) {
    return { title: "Nutrition Plan", category: "Nutrition" };
  }
  if (matches("sleep", "bedtime", "wind down", "insomnia")) {
    return { title: "Sleep Support Plan", category: "Sleep" };
  }
  if (matches("stress", "anxiety", "panic", "overwhelm", "grounding", "breathing")) {
    return { title: "Stress & Anxiety Support Plan", category: "Stress & Anxiety" };
  }
  if (matches("movement", "exercise", "stretch", "walk", "mobility")) {
    return { title: "Movement Support Plan", category: "Movement" };
  }
  if (matches("recovery", "burnout", "fatigue", "reset")) {
    return { title: "Recovery Plan", category: "Recovery" };
  }
  if (matches("emotion", "mood", "mind", "confidence", "motivation", "overthinking")) {
    return { title: "Mind & Mood Support Plan", category: "Mind & Mood" };
  }
  if (matches("routine", "habit", "morning", "evening", "daily")) {
    return { title: "Routine Plan", category: "Routines" };
  }

  const modeDefaults = {
    sleep: { title: "Sleep Support Plan", category: "Sleep" },
    nutrition: { title: "Nutrition Plan", category: "Nutrition" },
    movement: { title: "Movement Support Plan", category: "Movement" },
    mind: { title: "Mind & Mood Support Plan", category: "Mind & Mood" },
  };

  return modeDefaults[coachMode] || {
    title: "Voice Coach Playbook Entry",
    category: "General",
  };
}

export function isCompleteVoicePlaybookContent(transcript = "") {
  const text = String(transcript).trim();
  if (!/^title\s*:/im.test(text) || text.length < 80 || text.endsWith("?")) {
    return false;
  }

  return (
    /(?:^|\n)\s*(?:[-*•]|\d+[.)])\s+\S/m.test(text) ||
    /\b(day\s+\d+|breakfast|lunch|dinner|step\s+\d+|how to use|when to use|instructions?|practice|exercise|technique|duration|what to do)\b/i.test(text)
  );
}

export function cleanVoicePlaybookContent(transcript = "") {
  return String(transcript)
    .replace(/^[\s\S]*?Title:/i, "Title:")
    .replace(/\n*\s*that[’']?s[\s\S]*$/i, "")
    .replace(/\n*\s*it[’']?s now recorded[\s\S]*$/i, "")
    .replace(/\n*\s*i[’']?ve saved[\s\S]*$/i, "")
    .replace(/\n*\s*we[’']?ll save[\s\S]*$/i, "")
    .replace(
      /\n*\s*(this|your|the)\s+(plan|guide|programme|program|entry|intervention|tool)[\s\S]{0,80}(saved|ready|added|available)[\s\S]{0,80}playbook\.?\s*$/i,
      ""
    )
    .trim();
}

export async function persistVoicePlaybookEntry({
  fetchImpl = fetch,
  accessToken,
  profileKey,
  userIntent,
  title,
  category,
  content,
}) {
  if (!hasExplicitPlaybookSaveIntent(userIntent)) {
    return { ok: false, error: "A clear request to save to Playbook is required." };
  }

  const response = await fetchImpl("/api/voice-actions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "save_playbook",
      title,
      category,
      content,
      profileKey,
      userIntent,
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    return {
      ok: false,
      error: result.error || `Playbook save failed with status ${response.status}`,
    };
  }

  return { ok: true, id: result.id };
}

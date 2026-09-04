import { assessPersonalHealthContext } from "./personalHealthContext.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function symptomsFor(row) {
  return safeArray(row?.symptoms).length ? safeArray(row.symptoms) : [row?.signal].filter(Boolean);
}

function sameSignal(record, row) {
  const wanted = new Set(symptomsFor(row).map(normalise));
  return symptomsFor(record).some((item) => wanted.has(normalise(item)));
}

function safetyResponse(row) {
  const text = `${row?.signal || ""} ${symptomsFor(row).join(" ")} ${row?.notes || ""}`.toLowerCase();
  const urgent = ["severe chest pain", "cannot breathe", "can't breathe", "fainting", "one-sided weakness", "sudden paralysis", "coughing blood"];
  const assess = ["chest pain", "racing heart", "pressure", "tight chest", "breathlessness", "wheeze", "blood", "blister", "discharge", "burning", "rash", "swelling", "dark urine", "reduced urination"];
  if (urgent.some((term) => text.includes(term))) return "Because of the specific signal you recorded, seek urgent medical help now—especially if it is sudden, severe, worsening, or accompanied by fainting or significant breathing difficulty.";
  if (Number(row?.intensity) >= 8 || assess.some((term) => text.includes(term))) return "This is a strong or potentially important signal. Root cannot diagnose it; if it persists, worsens, feels unusual, or worries you, seek appropriate professional assessment.";
  return "Root will keep this as an observation, not a diagnosis or explanation. Seek professional advice if it persists, worsens, or concerns you.";
}

function practicalGuidance(row, profile) {
  const text = symptomsFor(row).map(normalise).join(" ");
  const system = normalise(row?.system);
  const health = assessPersonalHealthContext(profile || {});
  const constrainedActivity = health.fields.conditions.knowledge !== "known_absence" || health.fields.medications.knowledge !== "known_absence";
  const guidance = [];

  if (/overwhelm|racing thoughts|wired|sensory|eye strain|light sensitivity/.test(text) || /nervous|sensory/.test(system)) {
    guidance.push("A brief reduction in noise, screens, bright light or multitasking may give you a useful comparison point.");
  } else if (/tight chest|pressure|breathless|wheeze|racing heart|flutter/.test(text) || /circulatory|respiratory/.test(system)) {
    guidance.push("Pause exertion and reduce demand while you notice whether the signal settles; do not push through chest or breathing symptoms.");
  } else if (/bloating|reflux|nausea|cramp|appetite|food sensitivity/.test(text) || system.includes("digestive")) {
    guidance.push("Keep your usual clinical and dietary requirements in place, and notice timing around meals, hydration and stress rather than assuming one trigger from a single entry.");
  } else if (/aching|stiffness|sharp pain|weakness|swelling/.test(text) || system.includes("musculoskeletal")) {
    guidance.push(constrainedActivity
      ? "Reduce strain and keep any existing clinical activity restrictions in place; seek professional guidance before materially increasing activity."
      : "Reducing strain and trying comfortable, gentle movement may provide a useful comparison—stop if it aggravates the signal.");
  } else if (/poor sleep|waking|wired at night/.test(text) || system.includes("sleep")) {
    guidance.push("Notice whether a quieter wind-down, reduced late stimulation or a steadier routine changes the signal over the next few nights.");
  } else {
    guidance.push("Choose one low-risk variable to observe—such as rest, hydration, stimulation or workload—without treating a single change as proof of cause.");
  }
  return guidance;
}

export function buildBodySignalFeedback({ row, history = [], profile = null, isCorrection = false } = {}) {
  const prior = safeArray(history)
    .filter((entry) => entry?.id !== row?.id && sameSignal(entry, row))
    .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
  const previous = prior[0] || null;
  const previousIntensity = Number(previous?.intensity);
  const currentIntensity = Number(row?.intensity);
  const trend = !previous
    ? "This is the first time this signal has appeared in your recent history."
    : currentIntensity <= previousIntensity - 2
      ? `This signal is lower than last time (${previousIntensity}/10 → ${currentIntensity}/10). That is an observation, not proof of what caused the change.`
      : currentIntensity >= previousIntensity + 2
        ? `This signal is stronger than last time (${previousIntensity}/10 → ${currentIntensity}/10). It may be worth watching what changes around it.`
        : `This is roughly similar to last time (${previousIntensity}/10 → ${currentIntensity}/10).`;

  const helpful = [...new Set(prior.flatMap((entry) =>
    safeArray(entry?.modifiers).length ? entry.modifiers : [entry?.what_helped]
  ).map((item) => String(item || "").trim()).filter((item) => item && !/nothing|not sure/i.test(item)))].slice(0, 3);
  const remembered = helpful.length
    ? `Previously, you recorded ${helpful.join(", ")} around this same signal. That is something to notice again, not proof that it will help every time.`
    : "Root does not yet have a previously helpful factor recorded for this signal.";

  return [
    isCorrection ? "Your correction has been saved as a new source record; the earlier record remains preserved as superseded evidence." : "Your Body signal has been saved.",
    trend,
    remembered,
    "A practical next step:",
    ...practicalGuidance(row, profile).map((item) => `• ${item}`),
    safetyResponse(row),
  ].join("\n\n");
}

const TYPES = new Set(["short_text", "long_text", "date", "time", "datetime", "number", "scale_1_10", "single_choice", "multi_choice", "yes_no_not_sure"]);
const CHOICE_TYPES = new Set(["single_choice", "multi_choice"]);
const KEY = /^[a-z][a-z0-9_]{0,63}$/;

const text = (value, max = 500) => String(value || "").trim().slice(0, max);

export function validateTrackerDefinition(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "A tracker definition is required." };
  const fields = Array.isArray(input.fields) ? input.fields : [];
  if (!text(input.title, 120) || fields.length < 1 || fields.length > 20) return { ok: false, error: "Trackers need a title and 1–20 fields." };
  const seen = new Set();
  const normalized = [];
  for (const [index, field] of fields.entries()) {
    const key = text(field?.key, 64);
    const type = text(field?.type, 40);
    const label = text(field?.label, 160);
    if (!KEY.test(key) || seen.has(key) || !TYPES.has(type) || !label) return { ok: false, error: `Tracker field ${index + 1} is invalid.` };
    seen.add(key);
    const options = CHOICE_TYPES.has(type) ? [...new Set((Array.isArray(field.options) ? field.options : []).map((v) => text(v, 100)).filter(Boolean))] : [];
    if (CHOICE_TYPES.has(type) && (options.length < 2 || options.length > 20)) return { ok: false, error: `Tracker field ${label} needs 2–20 choices.` };
    normalized.push({ key, label, type, required: Boolean(field.required), help_text: text(field.help_text, 240), options, display_order: Number.isFinite(Number(field.display_order)) ? Number(field.display_order) : index });
  }
  normalized.sort((a, b) => a.display_order - b.display_order);
  return { ok: true, definition: { version: 1, title: text(input.title, 120), description: text(input.description, 500), category: text(input.category, 80) || "General", fields: normalized } };
}

export function validateTrackerAnswers(definition, input) {
  const checked = validateTrackerDefinition(definition);
  if (!checked.ok || !input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: checked.error || "Tracker answers are invalid." };
  const answers = {};
  for (const field of checked.definition.fields) {
    const value = input[field.key];
    const blank = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    if (field.required && blank) return { ok: false, error: `${field.label} is required.` };
    if (blank) continue;
    if (field.type === "scale_1_10" && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 10)) return { ok: false, error: `${field.label} must be between 1 and 10.` };
    if (field.type === "number" && !Number.isFinite(Number(value))) return { ok: false, error: `${field.label} must be a number.` };
    if (field.type === "single_choice" && !field.options.includes(String(value))) return { ok: false, error: `${field.label} has an invalid choice.` };
    if (field.type === "multi_choice" && (!Array.isArray(value) || value.some((v) => !field.options.includes(String(v))))) return { ok: false, error: `${field.label} has an invalid choice.` };
    answers[field.key] = field.type === "number" || field.type === "scale_1_10" ? Number(value) : value;
  }
  return { ok: true, answers };
}

export function inferControlledTrackerDefinition(request = "") {
  const value = String(request).toLowerCase();
  const common = [{ key: "notes", label: "Notes", type: "long_text", required: false, display_order: 4 }];
  if (/meal|food|bloat|digest|gut/.test(value)) return { title: "Food and symptom log", description: "Notice food, timing and how you felt without assuming cause.", category: "Nutrition", fields: [{ key: "date", label: "Date", type: "date", required: true, display_order: 0 }, { key: "food", label: "Food or drink", type: "long_text", required: true, display_order: 1 }, { key: "symptoms", label: "What did you notice?", type: "long_text", required: false, display_order: 2 }, { key: "intensity", label: "Intensity", type: "scale_1_10", required: false, display_order: 3 }, ...common] };
  if (/sleep|bedtime|night/.test(value)) return { title: "Sleep pattern log", description: "Record sleep and factors you noticed.", category: "Sleep", fields: [{ key: "date", label: "Date", type: "date", required: true }, { key: "bedtime", label: "Bedtime", type: "time", required: false }, { key: "wake_time", label: "Wake time", type: "time", required: false }, { key: "sleep_quality", label: "Sleep quality", type: "scale_1_10", required: true }, ...common] };
  return { title: "Wellbeing observation log", description: "Record repeated observations so Root can notice patterns cautiously.", category: "General", fields: [{ key: "date", label: "Date", type: "date", required: true }, { key: "observation", label: "What did you notice?", type: "long_text", required: true }, { key: "intensity", label: "Intensity", type: "scale_1_10", required: false }, ...common] };
}

export function isTrackerCreationRequest(value = "") {
  return /\b(create|make|build|add|save)\b[\s\S]*\b(log|tracker|diary)\b/i.test(String(value)) && /\bplay\s*book\b/i.test(String(value));
}

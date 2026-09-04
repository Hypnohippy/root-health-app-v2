export const BODY_TIMING_OPTIONS = Object.freeze([
  "Just started", "Comes and goes", "Constant", "Morning", "Afternoon",
  "Evening", "Night", "On waking", "After eating", "Before eating",
  "During activity", "After activity", "At rest", "Under stress",
  "After stress", "After dehydration",
]);

export const BODY_DURATION_OPTIONS = Object.freeze([
  "Today / just started", "A few days", "Weeks", "Months", "Longer",
  "Getting worse", "Improving", "Unchanged", "Not sure",
]);

export const BODY_MODIFIER_OPTIONS = Object.freeze([
  "Rest", "Hydration", "Food or eating", "Gentle movement", "Sleep",
  "Reduced stress", "Warmth", "Changing position", "Something else",
  "Nothing noticed", "Not sure",
]);

const common = {
  description: "Notice what is present without needing to explain or diagnose it.",
  modifiers: BODY_MODIFIER_OPTIONS,
};

export const BODY_SYSTEMS = Object.freeze([
  { ...common, id: "stress_nerves", label: "Head / nervous system", system: "nervous/autonomic", image: "/visuals/nervous-system-visual.png", accent: "#735b22", locations: ["Head / face", "Neck", "Upper body", "Whole-body / general"], symptoms: ["Overwhelm", "Racing thoughts", "Panic feeling", "Tension", "Wired but tired", "Shaky", "Numb or detached", "Hard to settle"] },
  { ...common, id: "heart_circulation", label: "Heart & circulation", system: "circulatory", image: "/visuals/heart-circulation-system.png", accent: "#681919", locations: ["Upper chest", "Heart centre", "Left chest", "Lower chest", "Circulation / limbs"], symptoms: ["Racing heart", "Fluttering", "Tight chest", "Pressure", "Breathlessness", "Cold hands / feet", "Heavy feeling", "Light-headed"] },
  { ...common, id: "breathing", label: "Chest & breathing", system: "respiratory", image: "/visuals/lungs-breathing-system.png", accent: "#34616a", locations: ["Upper chest", "Centre chest", "Lower chest", "Throat / airway"], symptoms: ["Shallow breathing", "Tight chest", "Breathlessness", "Air hunger", "Cough", "Wheeze", "Sighing", "Chest heaviness"] },
  { ...common, id: "digestion", label: "Stomach / gut", system: "digestive", image: "/visuals/digestive-system.png", accent: "#7b5428", locations: ["Upper stomach", "Middle abdomen", "Lower abdomen", "Whole stomach / gut"], symptoms: ["Bloating", "Reflux", "Cramps", "Constipation", "Loose bowels", "Nausea", "Appetite change", "Wind / gas", "Food sensitivity"] },
  { ...common, id: "reproductive", label: "Pelvis & reproductive", system: "reproductive/pelvic", image: "/visuals/body-map-human.png", accent: "#76506b", locations: ["Lower abdomen", "Pelvis", "Groin", "Other pelvic area"], symptoms: ["Pelvic discomfort", "Groin discomfort", "Irritation", "Burning", "Itching", "Discharge / change", "Swelling", "Cycle-related change", "Sexual discomfort"] },
  { ...common, id: "hormones_balance", label: "Hormones & balance", system: "endocrine", image: "/visuals/body-map-human.png", accent: "#69577e", locations: ["Whole-body / general", "Head / face", "Upper body", "Lower body"], symptoms: ["Cravings", "Energy dips", "Mood swings", "Temperature changes", "Sweats", "Cycle changes", "Skin changes", "Sleep disruption", "Weight change"] },
  { ...common, id: "bladder_hydration", label: "Kidneys / bladder", system: "urinary/excretory", image: "/visuals/kidneys-bladder-system.png", accent: "#315d79", locations: ["Kidney area", "Lower back", "Lower abdomen", "Bladder area"], symptoms: ["Thirst", "Frequent urination", "Burning when passing urine", "Dark urine", "Fluid retention", "Lower back discomfort", "Urgency", "Reduced urination"] },
  { ...common, id: "muscles_joints", label: "Muscles & joints", system: "musculoskeletal", image: "/visuals/joints-muscles-system.png", accent: "#4e6044", locations: ["Neck", "Shoulders", "Upper back", "Lower back", "Arms / hands", "Hips", "Legs / feet", "Whole-body / general"], symptoms: ["Aching", "Stiffness", "Sharp pain", "Deep ache", "Weakness", "Cramps", "Reduced movement", "Swelling", "Clicking / grinding"] },
  { ...common, id: "skin", label: "Skin / dermis", system: "skin/barrier", image: "/visuals/skin-dermis-system.png", accent: "#885b4e", locations: ["Head / face", "Neck", "Chest / torso", "Arms / hands", "Lower abdomen", "Legs / feet", "Whole-body / general"], symptoms: ["Rash", "Blistering", "Redness", "Itching", "Dryness", "Spots", "Sensitivity", "Swelling", "Colour change", "Slow healing"] },
  { ...common, id: "senses", label: "Senses", system: "sensory", image: "/visuals/senses-nervous-system.png", accent: "#4c4f75", locations: ["Head / face", "Eyes", "Ears", "Hands / feet", "Whole-body / general"], symptoms: ["Eye strain", "Blurred vision", "Light sensitivity", "Noise sensitivity", "Dizziness", "Tingling", "Numbness", "Ringing ears", "Altered smell / taste", "Sensory overload"] },
  { ...common, id: "energy_recovery", label: "Whole body energy", system: "whole-body recovery", image: "/visuals/body-map-human.png", accent: "#52643e", locations: ["Whole-body / general", "Upper body", "Lower body", "Muscles / joints"], symptoms: ["Fatigue", "Burnout feeling", "Heavy body", "Low motivation", "Poor recovery", "Weakness", "Brain fog", "Flu-like feeling", "Generally depleted"] },
  { ...common, id: "sleep_rhythm", label: "Sleep rhythm", system: "circadian/sleep", image: "/visuals/body-map-human.png", accent: "#48516f", locations: ["Whole-body / general", "Head / face", "Upper body"], symptoms: ["Poor sleep", "Waking often", "Early waking", "Tired on waking", "Sleepy daytime", "Wired at night", "Restless sleep", "Night sweats"] },
]);

export function toggleBodyChoice(values = [], value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function cleanBodyValues(values = []) {
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
}

export function bodySignalDraftToRow(draft, profileKey) {
  const symptoms = cleanBodyValues([...draft.symptoms, draft.customSymptom]);
  const timingContexts = cleanBodyValues([...draft.timingContexts, draft.customTiming]);
  const durationPatterns = cleanBodyValues([...draft.durationPatterns, draft.customDuration]);
  const modifiers = cleanBodyValues([...draft.modifiers, draft.customModifier]);
  return {
    profile_key: profileKey,
    areas: [draft.system.label],
    system: draft.system.system,
    signal: symptoms[0] || "",
    context: timingContexts[0] || "",
    intensity: draft.intensity,
    what_helped: modifiers[0] || "",
    symptoms,
    timing_contexts: timingContexts,
    duration_patterns: durationPatterns,
    modifiers,
    notes: String(draft.notes || "").trim() || null,
    location_detail: String(draft.locationDetail || "").trim() || null,
  };
}

export function bodySignalRowToDraft(row, systems = BODY_SYSTEMS) {
  const system = systems.find((item) => item.system === row?.system || item.label === row?.areas?.[0]) || systems[0];
  return {
    system,
    locationDetail: row?.location_detail || row?.areas?.[0] || "",
    symptoms: cleanBodyValues(row?.symptoms?.length ? row.symptoms : [row?.signal]),
    customSymptom: "",
    timingContexts: cleanBodyValues(row?.timing_contexts?.length ? row.timing_contexts : [row?.context]),
    customTiming: "",
    durationPatterns: cleanBodyValues(row?.duration_patterns || []),
    customDuration: "",
    intensity: Number.isFinite(Number(row?.intensity)) ? Number(row.intensity) : null,
    modifiers: cleanBodyValues(row?.modifiers?.length ? row.modifiers : [row?.what_helped]),
    customModifier: "",
    notes: row?.notes || "",
  };
}

export function validateBodySignalDraft(draft) {
  const row = bodySignalDraftToRow(draft, "validation");
  return Boolean(draft?.system && row.location_detail && row.symptoms.length && row.timing_contexts.length && row.duration_patterns.length && Number.isInteger(row.intensity) && row.intensity >= 1 && row.intensity <= 10);
}

export function collapseBodySignalSupersession(records = []) {
  const rows = Array.isArray(records) ? records : [];
  const supersededIds = new Set(rows.map((row) => row?.supersedes_id).filter(Boolean));
  return rows.filter((row) =>
    row?.id &&
    !supersededIds.has(row.id) &&
    (row.record_state || "active") === "active"
  );
}

export function bodySignalCorrectionRow(draft, profileKey, supersedesId, previousRecord = null) {
  const row = {
    ...bodySignalDraftToRow(draft, profileKey),
    supersedes_id: supersedesId || null,
    record_state: "active",
  };
  if (previousRecord?.depth !== undefined) row.depth = previousRecord.depth;
  return row;
}

export function bodySignalTombstoneRow(record, profileKey) {
  if (!record?.id || !profileKey) return null;
  return {
    profile_key: profileKey,
    areas: safeBodyArray(record.areas),
    system: record.system || "",
    signal: record.signal || "",
    context: record.context || "",
    intensity: record.intensity,
    what_helped: record.what_helped || "",
    symptoms: cleanBodyValues(record.symptoms || []),
    timing_contexts: cleanBodyValues(record.timing_contexts || []),
    duration_patterns: cleanBodyValues(record.duration_patterns || []),
    modifiers: cleanBodyValues(record.modifiers || []),
    notes: record.notes || null,
    location_detail: record.location_detail || null,
    ...(record.depth !== undefined ? { depth: record.depth } : {}),
    supersedes_id: record.id,
    record_state: "deleted",
  };
}

function safeBodyArray(value) {
  return Array.isArray(value) ? value : [];
}

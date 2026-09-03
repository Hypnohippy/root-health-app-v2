export const HEALTH_CONTEXT_FIELDS = Object.freeze([
  {
    key: "conditions",
    label: "Health conditions",
    options: ["None", "Prefer not to say"],
  },
  {
    key: "medications",
    label: "Medications",
    options: ["Not currently taking medication", "Prefer not to say"],
  },
  {
    key: "allergies",
    label: "Allergies / intolerances",
    options: ["No known allergies/intolerances", "Prefer not to say"],
  },
]);

const PREFER_NOT_TO_SAY = /^prefer not to say$/i;
const KNOWN_ABSENCE = /^(none|no known allergies\/?intolerances|not currently taking medication)$/i;

export function classifyHealthContextValue(value) {
  const text = String(value || "").trim();
  if (!text) return { responseProvided: false, knowledge: "unknown", value: "" };
  if (PREFER_NOT_TO_SAY.test(text)) {
    return { responseProvided: true, knowledge: "unknown", value: text };
  }
  if (KNOWN_ABSENCE.test(text)) {
    return { responseProvided: true, knowledge: "known_absence", value: text };
  }
  return { responseProvided: true, knowledge: "known_present", value: text };
}

export function assessPersonalHealthContext(profile = {}) {
  const fields = Object.fromEntries(
    HEALTH_CONTEXT_FIELDS.map((field) => [field.key, classifyHealthContextValue(profile?.[field.key])])
  );
  const missingFields = HEALTH_CONTEXT_FIELDS
    .filter((field) => !fields[field.key].responseProvided)
    .map((field) => field.key);
  return {
    fields,
    complete: missingFields.length === 0,
    missingFields,
  };
}

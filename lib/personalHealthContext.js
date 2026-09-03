export const HEALTH_CONTEXT_FIELDS = Object.freeze([
  {
    key: "conditions",
    label: "Health conditions",
  },
  {
    key: "medications",
    label: "Medications",
  },
  {
    key: "allergies",
    label: "Allergies / intolerances",
  },
]);

const PREFER_NOT_TO_SAY = /^prefer not to say$/i;
const KNOWN_ABSENCE = /^(none|no known allergies\/?intolerances|not currently taking medication)$/i;
const CONTAINS_UNCERTAINTY = /(?:prefer not to say|(?:do not|don't) know|not sure|unsure|unknown)/i;
const CONTAINS_KNOWN_ABSENCE = /(?:^|\b)(?:none|no known allergies\/?intolerances|not currently taking medication)(?:\b|$)/i;

export function classifyHealthContextValue(value) {
  const text = String(value || "").trim();
  if (!text) return { responseProvided: false, knowledge: "unknown", value: "", valid: false };
  if (PREFER_NOT_TO_SAY.test(text)) {
    return { responseProvided: true, knowledge: "unknown", value: text, valid: true };
  }
  if (KNOWN_ABSENCE.test(text)) {
    return { responseProvided: true, knowledge: "known_absence", value: text, valid: true };
  }
  if (CONTAINS_UNCERTAINTY.test(text) || CONTAINS_KNOWN_ABSENCE.test(text)) {
    return {
      responseProvided: true,
      knowledge: "unknown",
      value: text,
      valid: true,
    };
  }
  return { responseProvided: true, knowledge: "known_present", value: text, valid: true };
}

export function healthContextValuesFromRecord(record = {}) {
  return Object.fromEntries(
    HEALTH_CONTEXT_FIELDS.map(({ key }) => [
      key,
      record?.[key] == null ? "" : String(record[key]),
    ])
  );
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

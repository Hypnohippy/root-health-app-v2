import { classifyHealthContextValue } from "./personalHealthContext.js";

export const ALLERGY_CLARIFICATION_PROMPT =
  "Before I build that, I don't have a clear answer about your food allergies or intolerances. Are there any I need to take into account?";

const SPECIFIC_FOOD_REQUEST = /\b(?:meal\s*plan|menu|recipe|specific\s+foods?|food\s+recommendations?|recommend(?: me)?(?: some)? foods?|suggest(?: some)? foods?|what\s+(?:should|can)\s+i\s+eat)\b/i;
const CLEAR_ABSENCE_ANSWER = /^(?:no|none|no known (?:food )?allerg(?:y|ies)(?: or intolerances?)?|no food intolerances?)[.!]?$/i;

export function isSpecificFoodPlanRequest(message = "") {
  return SPECIFIC_FOOD_REQUEST.test(String(message));
}

export function classifyAllergyClarificationAnswer(answer = "") {
  const text = String(answer || "").trim();
  if (!text) return { knowledge: "unknown", value: "", resolved: false };
  if (CLEAR_ABSENCE_ANSWER.test(text)) {
    return { knowledge: "known_absence", value: "No known allergies/intolerances", resolved: true };
  }
  const state = classifyHealthContextValue(text);
  return {
    knowledge: state.knowledge,
    value: text,
    resolved: state.knowledge !== "unknown",
  };
}

export function foodPlanSafetyDecision({ message = "", allergies = "", conversation = [] } = {}) {
  const previous = Array.isArray(conversation) ? conversation.slice(0, -1) : [];
  const immediatelyPrevious = previous.at(-1);
  const clarificationWasAsked =
    immediatelyPrevious?.role !== "user" &&
    String(immediatelyPrevious?.content || "").includes(ALLERGY_CLARIFICATION_PROMPT);

  if (clarificationWasAsked) {
    const answer = classifyAllergyClarificationAnswer(message);
    return {
      clarificationRequired: !answer.resolved,
      clarificationWasAsked: true,
      allergy: answer,
    };
  }

  const allergy = classifyHealthContextValue(allergies);
  return {
    clarificationRequired: isSpecificFoodPlanRequest(message) && allergy.knowledge === "unknown",
    clarificationWasAsked: false,
    allergy: { knowledge: allergy.knowledge, value: allergy.value, resolved: allergy.knowledge !== "unknown" },
  };
}

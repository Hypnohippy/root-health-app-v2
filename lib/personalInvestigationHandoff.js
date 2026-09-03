export const PERSONAL_INVESTIGATION_HANDOFF_PREFIX = "root_personal_investigation_handoff_v1";
export const PERSONAL_INVESTIGATION_HANDOFF_TTL_MS = 30 * 60 * 1000;

function storageKey(profileKey) {
  return `${PERSONAL_INVESTIGATION_HANDOFF_PREFIX}:${profileKey}`;
}

export function createPersonalInvestigationHandoff({
  profileKey,
  destination,
  discovery,
  route,
  now = new Date(),
  ttlMs = PERSONAL_INVESTIGATION_HANDOFF_TTL_MS,
} = {}) {
  if (!profileKey || !destination || !discovery?.issueKey || !route?.question) return null;
  const createdAt = now instanceof Date ? now : new Date(now);
  return {
    version: 1,
    scope: "personal",
    profileKey,
    destination,
    issueKey: discovery.issueKey,
    known: discovery.known?.statement || "",
    worthExploring: discovery.worthExploring?.statement || "",
    question: route.question,
    route: route.route || destination,
    safetyNotice: route.safetyNotice || "",
    mind: route.mind || null,
    body: route.body || null,
    sourceRecordIds: discovery.sourceRecordIds || [],
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + ttlMs).toISOString(),
  };
}

export function savePersonalInvestigationHandoff(handoff, storage = null) {
  const activeStorage = storage || (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!activeStorage || !handoff?.profileKey) return false;
  activeStorage.setItem(storageKey(handoff.profileKey), JSON.stringify(handoff));
  return true;
}

export function consumePersonalInvestigationHandoff({
  profileKey,
  destination,
  storage = null,
  now = new Date(),
} = {}) {
  const activeStorage = storage || (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!activeStorage || !profileKey) return null;
  const key = storageKey(profileKey);
  const raw = activeStorage.getItem(key);
  if (!raw) return null;
  activeStorage.removeItem(key);
  try {
    const handoff = JSON.parse(raw);
    const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
    if (
      handoff?.scope !== "personal" ||
      handoff?.profileKey !== profileKey ||
      handoff?.destination !== destination ||
      new Date(handoff?.expiresAt || 0).getTime() <= currentTime
    ) return null;
    return handoff;
  } catch {
    return null;
  }
}

export function buildLifestyleSafetyNotice({ route, profile = {} } = {}) {
  const hasFoodContext = Boolean(profile?.allergies || profile?.conditions || profile?.medications || profile?.diet);
  const hasActivityContext = Boolean(profile?.conditions || profile?.medications);
  if (route === "nutrition" && hasFoodContext) {
    return "If you have food allergies or intolerances, diabetes, a medically prescribed diet, or another condition affected by what or when you eat, keep those requirements in place and check with your clinician before making significant changes.";
  }
  if (route === "body" && hasActivityContext) {
    return "If you have a heart condition, significant breathing difficulty, mobility limitations, are recovering from illness or injury, or have been advised to restrict activity, check with an appropriate health professional before increasing exercise.";
  }
  return "";
}

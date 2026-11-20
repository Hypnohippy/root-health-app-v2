const INTRODUCER_BRANCH = "codex/professional-introducer-demo";
const INTRODUCER_VERCEL_PROJECT_ID = "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut";
const CUSTOMER_VERCEL_PROJECT_ID = "prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO";
const INTRODUCER_SUPABASE_PROJECT_REF = "waluyphoafylzcjuskcl";
const PRODUCTION_SUPABASE_PROJECT_REF = "witkwlgldxjwwxmpcyva";

const exactRestrictedPaths = new Map([
  // Root Voice is protected by its own grant, entitlement and durable quota
  // gate; it is intentionally absent from this distribution-action list.
  ["/api/organisation/apply", "organisation_application"],
  ["/api/organisation/applications", "organisation_provisioning"],
  ["/api/organisation/setup-invite", "administrator_invitation"],
  ["/api/organisation/workforce-invitations", "employee_invitation"],
  ["/api/organisation/workforce-import", "workforce_provisioning"],
  ["/api/capacity-check", "external_email_capture"],
  ["/api/introducer-agreement/accept", "commercial_agreement_service"],
  ["/api/personal/acquisition/aggregate", "customer_acquisition_ops"],
  ["/api/personal/acquisition/event", "customer_acquisition_tracking"],
  ["/api/stripe/personal-checkout", "personal_subscription"],
  ["/api/stripe/workplace-checkout", "workplace_subscription"],
  ["/api/stripe/personal-webhook", "personal_entitlement"],
  ["/api/stripe/workplace-webhook", "workplace_entitlement"],
  ["/api/referral/validate", "referral_entitlement"],
  ["/start", "account_creation"],
  ["/personal/join", "account_creation"],
  ["/workplace-setup", "account_creation"],
  ["/organisation/register", "organisation_application"],
  ["/organisation/join", "employee_invitation_acceptance"],
  ["/organisation/hr-join", "administrator_invitation_acceptance"],
  ["/workplace-applications", "organisation_provisioning"],
]);

const restrictedPrefixes = [
  ["/api/admin", "root_administration"],
  ["/admin", "root_administration"],
  ["/api/stripe", "commercial_entitlement"],
];

// These provider-backed endpoints do not yet reserve from the £10 monthly
// introducer AI budget. Keep them closed only in the verified introducer
// deployment; the metered, grant-authorised realtime route remains available.
export const UNMETERED_INTRODUCER_AI_ROUTES = Object.freeze([
  "/api/root-coach",
  "/api/organisation-coach",
  "/api/hr-voice-session",
  "/api/transcribe",
  "/api/playbook-review",
  "/api/generate-audio",
]);

export function isUnmeteredIntroducerAiRoute(pathname) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return UNMETERED_INTRODUCER_AI_ROUTES.includes(path);
}

export const INTRODUCER_RESTRICTED_ACTIONS = Object.freeze([
  "account_creation",
  "organisation_application",
  "organisation_provisioning",
  "employee_invitation",
  "administrator_invitation",
  "workforce_provisioning",
  "personal_subscription",
  "workplace_subscription",
  "personal_entitlement",
  "workplace_entitlement",
  "referral_entitlement",
  "external_email_capture",
  "commercial_agreement_service",
  "customer_acquisition_ops",
  "customer_acquisition_tracking",
  "root_administration",
  "commercial_entitlement",
]);

function actualSupabaseRef(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith(".supabase.co") ? hostname.slice(0, -".supabase.co".length) : "";
  } catch {
    return "";
  }
}

function safePreviewAuthOrigin(value) {
  try {
    const parsed = new URL(String(value || ""));
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) return "";
    if (parsed.pathname !== "/" && parsed.pathname !== "") return "";
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.endsWith(".vercel.app")) return "";
    return parsed.origin;
  } catch {
    return "";
  }
}

/**
 * An introducer marker selects the restricted deployment, but never proves it
 * is safe. The explicit mode marker, exact feature branch, Vercel project,
 * isolated Supabase project, customer Supabase project, and protected Vercel
 * auth origin must all match. Ordinary Production does not opt into this mode
 * and retains its existing behaviour.
 */
export function introducerDeploymentStatus(env = process.env) {
  const actualVercelProject = String(env.VERCEL_PROJECT_ID || "").trim();
  const deploymentEnvironment = String(env.VERCEL_ENV || "").trim();
  const branch = String(env.VERCEL_GIT_COMMIT_REF || "").trim();
  const explicitlyIntroducer = env.ROOT_DEPLOYMENT_MODE === "introducer";
  const introducerBranch = branch === INTRODUCER_BRANCH;

  // Preserve the known customer project only for its normal customer path.
  // A demo marker or demo branch on that project is a deployment mistake,
  // and must stop instead of falling back to either product mode.
  if (actualVercelProject === CUSTOMER_VERCEL_PROJECT_ID) {
    if (explicitlyIntroducer || introducerBranch) return "misconfigured";
    if (!deploymentEnvironment) return "customer"; // local/dev tooling
    if (!["production", "preview"].includes(deploymentEnvironment)) return "misconfigured";
    const databaseRef = actualSupabaseRef(env.NEXT_PUBLIC_SUPABASE_URL);
    return databaseRef === PRODUCTION_SUPABASE_PROJECT_REF ? "customer" : "misconfigured";
  }

  if (deploymentEnvironment && !actualVercelProject) return "misconfigured";

  const expectedVercelProject = String(env.ROOT_INTRODUCER_VERCEL_PROJECT_ID || "").trim();
  const selected = explicitlyIntroducer || introducerBranch || actualVercelProject === INTRODUCER_VERCEL_PROJECT_ID;
  if (!deploymentEnvironment && !actualVercelProject && !explicitlyIntroducer && !introducerBranch) return "customer";
  if (!selected && deploymentEnvironment && actualVercelProject) return "misconfigured";
  if (!selected) return "customer";

  // Once this branch/project is selected, every identity input is mandatory.
  // The isolated project stays in introducer mode even if Vercel labels a
  // deployment Production. Missing/wrong identity must never fall back to the
  // customer application.
  if (!["preview", "production"].includes(deploymentEnvironment)) return "misconfigured";
  if (env.ROOT_DEPLOYMENT_MODE !== "introducer") return "misconfigured";
  if (branch !== INTRODUCER_BRANCH) return "misconfigured";

  const expectedSupabaseRef = String(env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF || "").trim();
  const actualRef = actualSupabaseRef(env.NEXT_PUBLIC_SUPABASE_URL);
  const productionRef = String(env.ROOT_PRODUCTION_SUPABASE_PROJECT_REF || "").trim();
  const authOrigin = safePreviewAuthOrigin(env.ROOT_AUTH_PREVIEW_URL);

  if (expectedVercelProject !== INTRODUCER_VERCEL_PROJECT_ID) return "misconfigured";
  if (actualVercelProject !== INTRODUCER_VERCEL_PROJECT_ID) return "misconfigured";
  if (expectedSupabaseRef !== INTRODUCER_SUPABASE_PROJECT_REF) return "misconfigured";
  if (productionRef !== PRODUCTION_SUPABASE_PROJECT_REF) return "misconfigured";
  if (!authOrigin) return "misconfigured";
  if (!expectedSupabaseRef || actualRef !== expectedSupabaseRef) return "misconfigured";
  if (!productionRef || actualRef === productionRef) return "misconfigured";
  return "introducer_verified";
}

export function isIntroducerDeployment(env = process.env) {
  return introducerDeploymentStatus(env) === "introducer_verified";
}

export function restrictedIntroducerAction(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (exactRestrictedPaths.has(path)) return exactRestrictedPaths.get(path);
  return restrictedPrefixes.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] || null;
}

export function shouldBlockIntroducerAction(pathname, env = process.env) {
  return isIntroducerDeployment(env) ? restrictedIntroducerAction(pathname) : null;
}

export function introducerRequestDecision(pathname, env = process.env) {
  const status = introducerDeploymentStatus(env);
  if (status === "misconfigured") return { type: "misconfigured", status: 503 };
  const action = shouldBlockIntroducerAction(pathname, env);
  return action ? { type: "blocked", action, status: 403 } : { type: "next", status: 200 };
}

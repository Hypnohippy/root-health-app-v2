const INTRODUCER_BRANCH = "codex/professional-introducer-demo";

function normaliseOrigin(value) {
  try {
    const parsed = new URL(String(value || ""));
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    if (parsed.pathname !== "/" && parsed.pathname !== "") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function buildRootAuthRedirectUrl({
  flow,
  requestOrigin,
  vercelEnv = "",
  vercelUrl = "",
  gitBranch = "",
  previewBaseUrl = "",
  customerBaseUrl = "",
  customerAllowedOrigins = "",
  publicSiteUrl = "https://roothealth.app",
  supabaseUrl = "",
  previewProjectRef = "",
  productionProjectRef = "",
} = {}) {
  if (!new Set(["invite", "recovery"]).has(flow)) return null;

  const isIntroducerPreview =
    vercelEnv === "preview" && gitBranch === INTRODUCER_BRANCH;

  let origin = normaliseOrigin(requestOrigin);
  if (isIntroducerPreview) {
    let configuredSupabaseHost = "";
    try {
      configuredSupabaseHost = new URL(supabaseUrl).hostname.toLowerCase();
    } catch {
      return null;
    }
    if (
      !/^[a-z0-9-]+$/.test(previewProjectRef) ||
      !previewProjectRef ||
      !productionProjectRef ||
      previewProjectRef === productionProjectRef ||
      configuredSupabaseHost !== `${previewProjectRef}.supabase.co`
    ) return null;

    // Internal Preview URLs are only for trusted server-to-server calls.
    // Send user-facing recovery links to the independently pinned customer host.
    if (customerBaseUrl || customerAllowedOrigins) {
      const expected = "https://introducers.roothealth.app";
      if (customerBaseUrl !== expected ||
          customerAllowedOrigins !== expected) return null;
      origin = expected;
    } else {
      origin = normaliseOrigin(previewBaseUrl);
    }
    if (!origin) return null;

    const hostname = new URL(origin).hostname.toLowerCase();
    if (hostname === "roothealth.app" || hostname === "www.roothealth.app") return null;
    if (new URL(origin).protocol !== "https:") return null;
  } else if (vercelEnv === "production") {
    origin = normaliseOrigin(publicSiteUrl);
    if (!origin || new URL(origin).protocol !== "https:") return null;
  } else if (vercelEnv === "preview") {
    origin = normaliseOrigin(`https://${vercelUrl}`);
    if (!origin || new URL(origin).protocol !== "https:") return null;
  }

  if (!origin) return null;

  const target = new URL("/reset-password", origin);
  if (isIntroducerPreview) target.searchParams.set("next", "/introducer");
  return target.toString();
}

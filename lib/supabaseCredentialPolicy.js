const INTRODUCER_SUPABASE_REF = "waluyphoafylzcjuskcl";

export function selectSupabaseAdminKey({ deployment, actualProjectRef, secretKey, legacyServiceRoleKey }) {
  if (deployment === "misconfigured") {
    throw new Error("Supabase credentials are unavailable for this deployment identity.");
  }
  if (deployment === "introducer_verified") {
    if (actualProjectRef !== INTRODUCER_SUPABASE_REF) {
      throw new Error("The introducer deployment is not connected to its isolated Supabase project.");
    }
    if (typeof secretKey !== "string" || !secretKey.startsWith("sb_secret_")) {
      throw new Error("The introducer Preview server secret is not configured.");
    }
    return secretKey;
  }
  if (typeof legacyServiceRoleKey !== "string" || !legacyServiceRoleKey) {
    throw new Error("Supabase server access is not configured.");
  }
  return legacyServiceRoleKey;
}

export function selectSupabasePublicKey({ projectRef, introducerMarked, publishableKey, legacyAnonKey }) {
  if (introducerMarked || projectRef === INTRODUCER_SUPABASE_REF) {
    if (projectRef !== INTRODUCER_SUPABASE_REF) {
      throw new Error("The introducer deployment is not connected to its isolated Supabase project.");
    }
    if (typeof publishableKey !== "string" || !publishableKey.startsWith("sb_publishable_")) {
      throw new Error("The introducer Preview publishable key is not configured.");
    }
    return publishableKey;
  }
  if (typeof legacyAnonKey !== "string" || !legacyAnonKey) {
    throw new Error("Supabase public access is not configured.");
  }
  return legacyAnonKey;
}

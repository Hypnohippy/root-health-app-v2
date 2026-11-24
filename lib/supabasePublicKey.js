import { selectSupabasePublicKey } from "./supabaseCredentialPolicy.js";
const INTRODUCER_SUPABASE_REF = "waluyphoafylzcjuskcl";

function projectRef(url) {
  try {
    const hostname = new URL(String(url || "")).hostname;
    return hostname.endsWith(".supabase.co")
      ? hostname.slice(0, -".supabase.co".length)
      : "";
  } catch {
    return "";
  }
}

/** Select a browser-safe API key without allowing an introducer Preview to fall
 * back to the legacy anon key or a key belonging to another Supabase project. */
function publicEnvironment() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ROOT_DEPLOYMENT_MODE: process.env.NEXT_PUBLIC_ROOT_DEPLOYMENT_MODE,
  };
}

export function getSupabasePublicKey(env = publicEnvironment()) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const ref = projectRef(url);
  if (!ref) throw new Error("Supabase project identity is unavailable.");
  return selectSupabasePublicKey({
    projectRef: ref,
    introducerMarked: env.NEXT_PUBLIC_ROOT_DEPLOYMENT_MODE === "introducer",
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    legacyAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getSupabasePublicKeyIfConfigured(env = process.env) {
  try {
    return getSupabasePublicKey(env);
  } catch {
    return "";
  }
}

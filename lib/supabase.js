import { getSupabasePublicKey } from "./supabasePublicKey.js";
import { createSupabaseKeyCompatibleClient as createClient } from "./supabaseKeyCompatibleClient.js";

export function createLazySupabaseClient({
  readEnvironment = () => ({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: getSupabasePublicKey(),
  }),
  createClientImpl = createClient,
} = {}) {
  let client;

  const getClient = () => {
    if (client) return client;

    const { url, anonKey } = readEnvironment() || {};
    if (!url || !anonKey) {
      throw new Error("Supabase is not configured for this environment.");
    }

    client = createClientImpl(url, anonKey);
    return client;
  };

  return new Proxy(Object.create(null), {
    get(_target, property) {
      const resolved = getClient();
      const value = Reflect.get(resolved, property, resolved);
      return typeof value === "function" ? value.bind(resolved) : value;
    },
    set(_target, property, value) {
      return Reflect.set(getClient(), property, value);
    },
    has(_target, property) {
      return property in getClient();
    },
  });
}

// Client components import this module during Next.js server prerendering too.
// Delay client construction until an actual browser-side operation needs it so
// a build without credentials does not create or contact a fake Supabase client.
export const supabase = createLazySupabaseClient();

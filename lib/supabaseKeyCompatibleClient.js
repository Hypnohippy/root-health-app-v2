import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

function apiKeyOnlyFetch(url, key, fetchImpl) {
  const projectOrigin = new URL(url).origin;
  return async (input, init = {}) => {
    let requestUrl;
    try {
      const requestInput = typeof Request !== "undefined" && input instanceof Request ? input.url : String(input);
      requestUrl = new URL(requestInput);
    } catch {
      return fetchImpl(input, init);
    }
    if (requestUrl.origin !== projectOrigin) return fetchImpl(input, init);

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (headers.get("authorization") === `Bearer ${key}`) headers.delete("authorization");
    return fetchImpl(input, { ...init, headers });
  };
}

/** createClient currently adds a bearer fallback for API keys to several
 * services. New Supabase API keys are not JWTs. Remove only the exact fallback
 * for this key; a real user access token must pass through unchanged. */
export function createSupabaseKeyCompatibleClient(
  url,
  key,
  options = {},
  createClientImpl = createSupabaseJsClient,
  fetchImpl = options.global?.fetch || globalThis.fetch
) {
  if (!url || !key) throw new Error("Supabase URL and API key are required.");
  const isNewKey = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
  if (key.startsWith("sb_secret_") && typeof window !== "undefined") {
    throw new Error("A Supabase secret key cannot be used in a browser.");
  }
  if (!isNewKey) return createClientImpl(url, key, options);
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable for Supabase requests.");

  const globalOptions = options.global || {};
  return createClientImpl(url, key, {
    ...options,
    global: {
      ...globalOptions,
      fetch: apiKeyOnlyFetch(url, key, fetchImpl),
    },
  });
}

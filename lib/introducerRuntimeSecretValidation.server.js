import { timingSafeEqual } from "node:crypto";
import {
  inspectIntroducerRuntimeIdentity,
  runtimeDiagnosticConfigurationPasses,
} from "./introducerRuntimeIdentity.server.js";

const ISOLATED_OPENAPI_URL = "https://waluyphoafylzcjuskcl.supabase.co/rest/v1/";
const OPERATOR_TOKEN_ENV = "INTRODUCER_RUNTIME_SECRET_CHECK_TOKEN";
const OPERATOR_TOKEN_HEADER = "x-introducer-runtime-secret-check";
const MIN_OPERATOR_TOKEN_BYTES = 32;
const REQUEST_TIMEOUT_MS = 3_000;

function operatorTokenBytes(value) {
  if (typeof value !== "string" || value !== value.trim()) return null;
  // The temporary operator token is a high-entropy ASCII secret. Avoid
  // ambiguous Unicode normalization and reject short values fail-closed.
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const bytes = Buffer.from(value, "utf8");
  return bytes.length >= MIN_OPERATOR_TOKEN_BYTES ? bytes : null;
}

/**
 * The deployment SSO gate is mandatory; this separate, high-entropy token
 * limits the privileged check to an explicitly authorized operator. Never log
 * either value or place the token in a URL.
 */
export function isRuntimeSecretValidationAuthorized(request, env = process.env) {
  const expected = operatorTokenBytes(env[OPERATOR_TOKEN_ENV]);
  const supplied = operatorTokenBytes(request?.headers?.get(OPERATOR_TOKEN_HEADER));
  if (!expected || !supplied || expected.length !== supplied.length) return false;
  return timingSafeEqual(expected, supplied);
}

function discardBody(response) {
  try {
    const cancellation = response?.body?.cancel();
    return cancellation && typeof cancellation.then === "function"
      ? cancellation.catch(() => {})
      : Promise.resolve();
  } catch {
    // The body is deliberately never consumed; cancellation failure does not
    // change the bounded authentication result.
    return Promise.resolve();
  }
}

/**
 * Validate only that Supabase's isolated API gateway accepts this configured
 * project's secret API key. Supabase documents that GET /rest/v1/ accepts
 * secret keys and returns OpenAPI metadata; this function cancels and never
 * reads that body. It performs no retries and never sends a Bearer header.
 * The optional dependencies exist solely for mocked local tests.
 */
export async function validateIsolatedSupabaseSecret({
  request,
  env = process.env,
  fetchImpl = globalThis.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  if (!isRuntimeSecretValidationAuthorized(request, env)) return false;
  const checks = inspectIntroducerRuntimeIdentity(env);
  if (!runtimeDiagnosticConfigurationPasses(checks)) return false;
  if (typeof fetchImpl !== "function" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return false;

  const secret = env.SUPABASE_SECRET_KEY;
  const controller = new AbortController();
  let timeoutId;
  let response;
  let cancellation;
  let deadlineExpired = false;
  const timedOut = Symbol("timed-out");
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      deadlineExpired = true;
      controller.abort();
      if (response) {
        cancellation ??= discardBody(response);
      }
      resolve(timedOut);
    }, timeoutMs);
  });

  try {
    const validation = (async () => {
      response = await fetchImpl(ISOLATED_OPENAPI_URL, {
        method: "GET",
        headers: { apikey: secret },
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
      });

      // A non-compliant fetch implementation may settle after abort. Dispose
      // of that late body too, without changing the already-failed result.
      if (deadlineExpired) {
        cancellation ??= discardBody(response);
        await cancellation;
        return false;
      }

      const accepted = response?.status === 200 && response?.redirected !== true;
      cancellation ??= discardBody(response);
      await cancellation;
      return !deadlineExpired && accepted;
    })();
    const result = await Promise.race([validation, timeout]);
    return result === timedOut ? false : result;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

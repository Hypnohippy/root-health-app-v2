import { createClient } from "@supabase/supabase-js";

function adminEmails() {
  return String(process.env.ROOT_ADMIN_EMAIL || "")
    .toLowerCase()
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export function createRootAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function requireRootAdmin(request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return { authorised: false, status: 401, error: "Root administrator sign-in required." };
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await authClient.auth.getUser(token);
  const email = String(data?.user?.email || "").trim().toLowerCase();

  if (error || !data?.user) {
    return { authorised: false, status: 401, error: "Root could not verify this account." };
  }

  if (!adminEmails().includes(email)) {
    return { authorised: false, status: 403, error: "This account cannot manage Root interventions." };
  }

  return { authorised: true, user: data.user };
}

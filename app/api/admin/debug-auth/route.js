import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function parseAllowlist() {
  return String(process.env.ROOT_ADMIN_EMAIL || "")
    .toLowerCase()
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function getSupabaseProjectRef() {
  try {
    const hostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    return hostname.endsWith(".supabase.co")
      ? hostname.slice(0, -".supabase.co".length)
      : hostname;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Authenticated Root account required." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data?.user) {
    return NextResponse.json(
      { ok: false, error: "Root could not verify this account." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const email = String(data.user.email || "").trim().toLowerCase();
  const allowlistEmails = parseAllowlist();

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: data.user.id,
        email,
      },
      rootAdminEmailPresent: Boolean(String(process.env.ROOT_ADMIN_EMAIL || "").trim()),
      allowlistEmails,
      matchesAllowlist: allowlistEmails.includes(email),
      supabaseProjectRef: getSupabaseProjectRef(),
    },
    { headers: NO_STORE_HEADERS }
  );
}

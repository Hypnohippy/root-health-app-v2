import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function buildAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Capacity-check storage is not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function cleanText(value, max = 300) {
  return String(value || "").trim().slice(0, max);
}

function cleanEmail(value) {
  const email = cleanText(value, 320).toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "";
  return email;
}

function cleanScores(scores) {
  const allowed = [
    "stress_score",
    "sleep_score",
    "recovery_score",
    "energy_score",
    "mood_score",
    "focus_score",
    "burnout_score",
  ];

  const out = {};

  for (const key of allowed) {
    const value = Number(scores?.[key]);
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      throw new Error("Invalid wellbeing score.");
    }
    out[key] = value;
  }

  return out;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = cleanEmail(body?.email);

    if (!email) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    if (body?.consent !== true) {
      return NextResponse.json(
        { error: "Consent is required to save and email this result." },
        { status: 400 }
      );
    }

    const scores = cleanScores(body?.scores);
    const average =
      Object.values(scores).reduce((total, value) => total + value, 0) /
      Object.keys(scores).length;

    const client = buildAdminClient();

    const payload = {
      email,
      marketing_consent: true,
      consent_text:
        "Email me my Root result and useful follow-up support. I can unsubscribe at any time.",
      consented_at: new Date().toISOString(),
      stress_score: scores.stress_score,
      sleep_score: scores.sleep_score,
      recovery_score: scores.recovery_score,
      energy_score: scores.energy_score,
      mood_score: scores.mood_score,
      focus_score: scores.focus_score,
      burnout_score: scores.burnout_score,
      average_load: Number(average.toFixed(1)),
      dominant_signal: cleanText(body?.snapshot?.top?.label, 120),
      dominant_score: Number(body?.snapshot?.top?.value || 0),
      result_band: cleanText(body?.snapshot?.band, 40),
      source: cleanText(body?.source, 120) || "direct",
      campaign: cleanText(body?.campaign, 160),
      medium: cleanText(body?.medium, 120),
      referrer: cleanText(body?.referrer, 500),
    };

    const { error } = await client.from("consumer_capacity_leads").insert(payload);

    if (error) {
      console.error("CAPACITY CHECK INSERT ERROR", error);
      return NextResponse.json(
        { error: "Root could not save your result just now." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CAPACITY CHECK ERROR", error);
    return NextResponse.json(
      { error: error?.message || "Root could not save your result." },
      { status: 500 }
    );
  }
}

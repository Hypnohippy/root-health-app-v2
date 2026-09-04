"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";
import BodySignalCard from "../../components/body/BodySignalCard";
import { BODY_SYSTEMS, bodySignalDraftToRow, bodySignalRowToDraft } from "../../lib/bodySignalModel";
import { consumePersonalInvestigationHandoff } from "../../lib/personalInvestigationHandoff";
import { resolvePersonalRootContext } from "../../lib/personalRootContext";
import { supabase } from "../../lib/supabase";

const bodyZones = [
  { id: "stress_nerves", top: "6%", left: "39%", width: "22%", height: "13%" },
  { id: "senses", top: "10%", left: "36%", width: "28%", height: "10%" },
  { id: "breathing", top: "23%", left: "31%", width: "38%", height: "13%" },
  { id: "heart_circulation", top: "25%", left: "47%", width: "17%", height: "10%" },
  { id: "digestion", top: "38%", left: "36%", width: "28%", height: "14%" },
  { id: "hormones_balance", top: "48%", left: "35%", width: "30%", height: "13%" },
  { id: "bladder_hydration", top: "52%", left: "34%", width: "32%", height: "13%" },
  { id: "reproductive", top: "64%", left: "37%", width: "26%", height: "9%" },
  { id: "skin", top: "20%", left: "18%", width: "14%", height: "62%" },
  { id: "muscles_joints", top: "24%", left: "69%", width: "14%", height: "62%" },
  { id: "energy_recovery", top: "73%", left: "33%", width: "34%", height: "17%" },
  { id: "sleep_rhythm", top: "88%", left: "35%", width: "30%", height: "8%" },
];

function blankDraft(system, locationDetail = "") {
  return { system, locationDetail, symptoms: [], customSymptom: "", timingContexts: [], customTiming: "", durationPatterns: [], customDuration: "", intensity: null, modifiers: [], customModifier: "", notes: "" };
}

function signalSummary(row) {
  const symptom = row?.symptoms?.length ? row.symptoms.join(", ") : row?.signal || "Body signal";
  return `${row?.location_detail || row?.areas?.[0] || "Location not recorded"} · ${symptom}`;
}

function safetyResponse(row) {
  const text = `${row.signal} ${row.symptoms.join(" ")} ${row.notes || ""}`.toLowerCase();
  const urgent = ["severe chest pain", "cannot breathe", "can't breathe", "fainting", "one-sided weakness", "sudden paralysis", "coughing blood"];
  const assess = ["chest pain", "racing heart", "pressure", "tight chest", "breathlessness", "wheeze", "panic", "blood", "blister", "discharge", "burning", "rash", "swelling", "dark urine", "reduced urination"];
  if (urgent.some((term) => text.includes(term))) return "Because of the specific signal you recorded, seek urgent medical help now—especially if it is sudden, severe, worsening, or accompanied by fainting or significant breathing difficulty.";
  if (row.intensity >= 8 || assess.some((term) => text.includes(term))) return "This is a strong or potentially important signal. Root cannot diagnose it; if it persists, worsens, feels unusual, or worries you, seek appropriate professional assessment.";
  return "Root will keep this as an observation, not a diagnosis or explanation. Notice what changes around it, and seek professional advice if it persists, worsens, or concerns you.";
}

export default function BodyPage() {
  const [profileKey, setProfileKey] = useState("");
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState("");
  const [journeyIntro, setJourneyIntro] = useState("");
  const responseRef = useRef(null);

  const loadHistory = async (key) => {
    setLoadingHistory(true);
    const { data, error: historyError } = await supabase.from("body_signals").select("*").eq("profile_key", key).order("created_at", { ascending: false }).limit(30);
    if (historyError) setError("Root could not load your Body history just now.");
    else setHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => {
    let active = true;
    try {
      const journey = JSON.parse(localStorage.getItem("root_journey_v1") || "null");
      const intros = {
        anxiety: "We’re beginning by exploring how anxiety may be showing up in your body.",
        sleep: "Sleep disruption often begins with nervous system overload and body tension.",
        body: "Let’s gently explore where your body seems to be carrying pressure.",
        thoughts: "Thought pressure often affects the body before we fully notice the mental load.",
        heavy: "Emotional heaviness can affect energy, tension, digestion, and nervous system balance.",
        patterns: "We’re beginning by listening to the body first, because patterns often appear there early.",
      };
      if (journey?.focus && intros[journey.focus]) setJourneyIntro(intros[journey.focus]);
    } catch {
      // A malformed legacy handoff must not block authenticated Body evidence.
    }
    resolvePersonalRootContext({ client: supabase }).then(async (result) => {
      if (!active) return;
      if (!result.ok) { window.location.href = "/reconnect"; return; }
      const key = result.context.profileKey;
      setProfileKey(key);
      await loadHistory(key);
      const handoff = consumePersonalInvestigationHandoff({ profileKey: key, destination: "body" });
      if (!handoff) return;
      const system = BODY_SYSTEMS.find((item) => item.id === (handoff.body?.systemId || "energy_recovery")) || BODY_SYSTEMS[10];
      const next = blankDraft(system);
      if (handoff.body?.signal) next.symptoms = [handoff.body.signal];
      setDraft(next);
      setJourneyIntro(`${handoff.known} ${handoff.question}${handoff.safetyNotice ? ` ${handoff.safetyNotice}` : ""}`);
    });
    return () => { active = false; };
  }, []);

  const openSystem = (id) => {
    const system = BODY_SYSTEMS.find((item) => item.id === id);
    if (!system) return;
    setEditingId(null); setDraft(blankDraft(system)); setError(""); setResponse("");
  };

  const save = async () => {
    if (!draft || !profileKey) return;
    setSaving(true); setError("");
    const row = bodySignalDraftToRow(draft, profileKey);
    const operation = editingId
      ? supabase.from("body_signals").update(row).eq("id", editingId).eq("profile_key", profileKey).select("*").single()
      : supabase.from("body_signals").insert([row]).select("*").single();
    const { data, error: saveError } = await operation;
    if (saveError || !data) { setError("Something went wrong saving this Body signal. Nothing was changed—please try again."); setSaving(false); return; }
    const previous = history.find((entry) => entry.id !== editingId && String(entry.signal || "").toLowerCase() === row.signal.toLowerCase());
    const previousIntensity = Number(previous?.intensity);
    const trend = !previous
      ? "This is the first time this signal has appeared in your recent history."
      : row.intensity <= previousIntensity - 2
        ? `This signal is lower than last time (${previousIntensity}/10 → ${row.intensity}/10). That is an observation, not proof of what caused the change.`
        : row.intensity >= previousIntensity + 2
          ? `This signal is stronger than last time (${previousIntensity}/10 → ${row.intensity}/10). It may be worth watching what changes around it.`
          : `This is roughly similar to last time (${previousIntensity}/10 → ${row.intensity}/10).`;
    await loadHistory(profileKey);
    setResponse(`${editingId ? "Your correction has been saved." : "Your Body signal has been saved."}\n\n${trend}\n\n${safetyResponse(row)}`);
    setEditingId(null); setDraft(null); setSaving(false);
    setTimeout(() => responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const editEntry = (row) => { setEditingId(row.id); setDraft(bodySignalRowToDraft(row)); setError(""); setResponse(""); };
  const deleteEntry = async (row) => {
    if (!window.confirm(`Delete “${signalSummary(row)}”? This removes the saved observation and cannot be undone.`)) return;
    setError("");
    const { data: deleted, error: deleteError } = await supabase.from("body_signals").delete().eq("id", row.id).eq("profile_key", profileKey).select("id").maybeSingle();
    if (deleteError || !deleted?.id) { setError("Root could not delete that Body signal. It remains unchanged."); return; }
    setHistory((rows) => rows.filter((item) => item.id !== row.id));
    setResponse("The Body signal was deleted and will no longer be used as Personal evidence.");
  };

  const coachJourney = useMemo(() => {
    const latest = history[0];
    return latest ? { bodyAreas: latest.areas, selectedSignal: latest.signal, intensity: latest.intensity, bodySignalId: latest.id, completedBody: true, currentStage: "coach" } : null;
  }, [history]);

  return <RootAtmosphere type="body"><Nav /><main className="body-page"><style>{`
    .body-page{min-height:100vh;padding:104px 20px 120px;box-sizing:border-box;color:#2a261f;font-family:Inter,sans-serif}.body-page-shell{max-width:1180px;margin:0 auto}.body-page-header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px}.body-page-header h1{font:500 clamp(34px,5vw,52px) Georgia,serif;margin:0}.body-page-back{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.75);color:#222;text-decoration:none}.body-journey-banner,.body-response,.body-history{padding:22px;border:1px solid rgba(255,255,255,.7);border-radius:25px;background:rgba(250,244,234,.84);box-shadow:0 20px 60px rgba(40,34,25,.12)}.body-journey-banner{margin-bottom:20px}.body-map-layout{display:grid;grid-template-columns:minmax(320px,1fr) minmax(280px,.7fr);gap:24px;align-items:start}.body-map-card,.body-system-list{padding:24px;border-radius:30px;background:rgba(255,255,255,.43);border:1px solid rgba(255,255,255,.72);backdrop-filter:blur(20px)}.body-map-wrap{position:relative;width:min(520px,100%);margin:auto}.body-map-wrap img{display:block;width:100%}.body-map-hotspot{position:absolute;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:transparent;cursor:pointer}.body-map-hotspot:hover,.body-map-hotspot:focus{background:rgba(194,59,48,.28);outline:2px solid white}.body-system-list h2,.body-history h2{font:500 28px Georgia,serif;margin-top:0}.body-system-buttons{display:grid;gap:9px}.body-system-buttons button{padding:13px 15px;text-align:left;border:1px solid rgba(60,50,38,.14);border-radius:15px;background:rgba(255,255,255,.76);cursor:pointer}.body-response{white-space:pre-line;margin:24px 0;scroll-margin-top:96px}.body-history{margin-top:24px}.body-history-list{display:grid;gap:12px}.body-history-item{padding:15px;border-radius:16px;background:rgba(255,255,255,.7)}.body-history-item p{margin:5px 0;color:#5a5145}.body-history-actions{display:flex;gap:8px;margin-top:10px}.body-history-actions button{border:1px solid rgba(60,50,38,.18);border-radius:999px;padding:8px 13px;background:white;cursor:pointer}.body-history-actions .delete{color:#8a2821}.body-coach-link{display:inline-block;margin-top:18px;padding:13px 18px;border-radius:999px;background:#181818;color:white;text-decoration:none}.body-page-error{padding:12px;border-radius:12px;background:#fff0ed;color:#8a2821;font-weight:700}@media(max-width:800px){.body-page{padding:92px 12px 100px}.body-map-layout{grid-template-columns:1fr}.body-map-card,.body-system-list{padding:18px}.body-page-header{align-items:flex-start}}
  `}</style><div className="body-page-shell">
    <header className="body-page-header"><a className="body-page-back" href="/">←</a><h1>What is your body noticing?</h1><RootEnso size={54} /></header>
    {journeyIntro && <div className="body-journey-banner"><strong>Your Root journey</strong><p>{journeyIntro}</p></div>}
    {error && !draft && <p role="alert" className="body-page-error">{error}</p>}
    <div className="body-map-layout"><section className="body-map-card"><div className="body-map-wrap"><img src="/visuals/body-map-human.png" alt="Body map" />{bodyZones.map((zone) => <button type="button" className="body-map-hotspot" aria-label={`Explore ${BODY_SYSTEMS.find((item) => item.id === zone.id)?.label}`} key={zone.id} onClick={() => openSystem(zone.id)} style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height }} />)}</div><p>Tap an area as a shortcut. You will confirm or change the exact location before saving.</p></section><section className="body-system-list"><h2>Or choose an area</h2><div className="body-system-buttons">{BODY_SYSTEMS.map((system) => <button type="button" key={system.id} onClick={() => openSystem(system.id)}>{system.label} →</button>)}</div></section></div>
    {response && <section ref={responseRef} className="body-response"><strong>Root response</strong><p>{response}</p>{coachJourney && <a className="body-coach-link" href="/coach" onClick={() => localStorage.setItem("root_journey_v1", JSON.stringify(coachJourney))}>Continue with Root Coach →</a>}</section>}
    <section className="body-history"><h2>Your recent Body signals</h2>{loadingHistory ? <p>Loading…</p> : history.length ? <div className="body-history-list">{history.map((row) => <article className="body-history-item" key={row.id}><strong>{signalSummary(row)}</strong><p>{row.context || "Context not recorded"} · {row.intensity || "?"}/10 · {row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB") : "Date unavailable"}</p><div className="body-history-actions"><button type="button" onClick={() => editEntry(row)}>Edit</button><button type="button" className="delete" onClick={() => deleteEntry(row)}>Delete</button></div></article>)}</div> : <p>No Body signals recorded yet.</p>}</section>
  </div>{draft && <BodySignalCard draft={draft} setDraft={setDraft} saving={saving} error={error} onBack={() => { setDraft(null); setEditingId(null); setError(""); }} onSave={save} />}</main></RootAtmosphere>;
}

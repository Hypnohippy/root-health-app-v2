"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import RootEnso from "../../components/RootEnso";

const METRICS = ["stress", "sleep", "recovery", "energy", "mood", "focus", "burnout"];

export default function ProfessionalIntroducerPage() {
  const [token, setToken] = useState("");
  const [payload, setPayload] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [mode, setMode] = useState("consultant_learning");
  const [perspective, setPerspective] = useState("employee");
  const [guidedStep, setGuidedStep] = useState(0);
  const [scores, setScores] = useState(Object.fromEntries(METRICS.map((key) => [key, 5])));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [intro, setIntro] = useState({ organisationName: "", contactName: "", contactEmail: "", reason: "", desiredNextStep: "introductory_call", contactPermissionConfirmed: false });

  const load = useCallback(async (currentToken = token) => {
    if (!currentToken) return;
    setError("");
    try {
      const response = await fetch("/api/introducer/demo", { headers: { Authorization: `Bearer ${currentToken}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The demonstration is unavailable.");
      setPayload(data);
      setEmployee(data.employee);
    } catch (cause) {
      setPayload(null);
      setError(cause.message);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    let active = true;
    async function initialise() {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token || "";
      if (!active) return;
      setToken(accessToken);
      if (accessToken) await load(accessToken);
      else { setLoading(false); setError("Sign in with the named, invited Root Health partner account to continue."); }
    }
    initialise();
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => load(token), 30000);
    return () => clearInterval(interval);
  }, [load, token]);

  async function runCheckin(event) {
    event.preventDefault();
    setSubmitting(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/introducer/demo", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "sample_checkin", scores }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The sample check-in could not be processed.");
      setEmployee(data.employee);
      setNotice("Sample feedback updated in this browser session only. Nothing has been saved to a customer account.");
    } catch (cause) { setError(cause.message); }
    finally { setSubmitting(false); }
  }

  async function submitIntroduction(event) {
    event.preventDefault();
    setSubmitting(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/introducer/demo", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "introduction_request", ...intro }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The request could not be recorded.");
      setNotice(data.message);
      setIntro({ organisationName: "", contactName: "", contactEmail: "", reason: "", desiredNextStep: "introductory_call", contactPermissionConfirmed: false });
    } catch (cause) { setError(cause.message); }
    finally { setSubmitting(false); }
  }

  async function signOut() { await supabase.auth.signOut(); window.location.href = "/login?next=%2Fintroducer"; }

  function advancePresentation() {
    const next = (guidedStep + 1) % 3;
    setGuidedStep(next);
    if (next === 0) setPerspective("employee");
    if (next === 1) setPerspective("employer");
    if (next === 2) document.getElementById("introduction-request")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const employer = payload?.employer;
  return (
    <main className="demoPage">
      <header className="topbar"><div className="brand"><RootEnso size={34} /><span>Root Health <small>Professional Introducer</small></span></div><div className="topActions">{payload && <span className="expiry">Access until {new Date(payload.expiresAt).toLocaleDateString("en-GB")}</span>}<button className="quiet" onClick={signOut}>Sign out</button></div></header>
      <section className="hero"><p className="eyebrow">AUTHORISED PARTNER DEMONSTRATION</p><h1>Experience Root from both sides of work.</h1><p>Explore a fictional employee journey and the organisation-level view it can inform. This is a protected demonstration using fictional data; it is not connected to a customer account.</p><span className="consultant">Presented by {payload?.consultantLabel || "your Root Health partner"}</span></section>

      {loading && <div className="card">Verifying your invited access…</div>}
      {!loading && !payload && <section className="card access"><h2>Invited access required</h2><p>{error}</p><a className="primary" href="/login?next=%2Fintroducer">Sign in securely</a></section>}
      {payload && <>
        {error && <p className="alert">{error}</p>}{notice && <p className="notice">{notice}</p>}
        <section className="controls card">
          <div><span className="fieldLabel">Experience</span><div className="segmented"><button className={mode === "consultant_learning" ? "selected" : ""} onClick={() => setMode("consultant_learning")}>Consultant learning</button><button className={mode === "client_presentation" ? "selected" : ""} onClick={() => { setMode("client_presentation"); setGuidedStep(0); setPerspective("employee"); }}>Client presentation</button></div></div>
          <div><span className="fieldLabel">Perspective</span><div className="segmented"><button className={perspective === "employee" ? "selected" : ""} onClick={() => setPerspective("employee")}>Employee</button><button className={perspective === "employer" ? "selected" : ""} onClick={() => setPerspective("employer")}>Employer</button></div></div>
          <button className="quiet" onClick={() => load(token)}>Reset demonstration</button>
        </section>

        <section className="card scenario"><div className="scenarioHead"><div><p className="eyebrow">{perspective === "employee" ? "PERSONAL ROOT" : "ROOT WORKPLACE"}</p><h2>{perspective === "employee" ? employee?.label : employer?.label}</h2></div><span className="fictional">Fictional demonstration data</span></div>
          {perspective === "employee" ? <div className="columns">
            <div><h3>Check-in and wellbeing measures</h3><p className="muted">Root asks people to reflect across seven areas. Scores indicate self-reported experience, not a diagnosis.</p><form onSubmit={runCheckin} className="measureForm">{(employee?.measures || []).map((metric) => <label key={metric.key}><span>{metric.label}</span><input type="range" min="0" max="10" value={scores[metric.key]} onChange={(event) => setScores((current) => ({ ...current, [metric.key]: Number(event.target.value) }))}/><strong>{scores[metric.key]}</strong></label>)}<button className="primary" disabled={submitting}>{submitting ? "Updating…" : "Explore sample feedback"}</button></form></div>
            <div className="feedback"><h3>Personal feedback and progress</h3><p>{employee?.currentState || "Root reflects on patterns over time and keeps uncertainty visible."}</p>{employee?.movement?.direction && <p className="pill">Recent trend: {employee.movement.direction}</p>}<h4>A gentle next reflection</h4><p>{employee?.coachPrompt}</p><h4>Other employee experiences</h4><div className="chips"><span>Body signals</span><span>Mind tools</span><span>Journal</span><span>Insights and trends</span><span>Playbook</span></div><p className="muted">{employee?.recentSignals?.join(" · ")}</p><p className="fine">{employee?.evidenceLabel}</p></div>
          </div> : <div className="employerView">
            <div className="statGrid"><div><small>Fictional workforce</small><strong>{employer?.organisationSize}</strong></div><div><small>Check-in participants</small><strong>{employer?.respondents}</strong></div><div><small>Participation</small><strong>{Number.isFinite(employer?.participation) ? `${Math.round(employer.participation * 100)}%` : "Not available"}</strong></div></div>
            <h3>{employer?.headline || "An organisation-level view of participation and reported wellbeing."}</h3><p>{employer?.summary}</p>{employer?.observations?.length > 0 && <div className="observationList">{employer.observations.map((observation, index) => <div key={index}><strong>{observation.label || "Workforce observation"}</strong><p>{observation.summary}</p></div>)}</div>}
            <p className="privacyNote">{employer?.privacyNote}</p><ul className="cautions">{employer?.cautions?.slice(1, 4).map((caution) => <li key={caution}>{caution}</li>)}</ul>
          </div>}
          <div className="modeNote">{mode === "client_presentation" ? <><span>Guided presentation · {guidedStep + 1} of 3 — {guidedStep === 0 ? "employee experience" : guidedStep === 1 ? "employer view" : "request a next step"}. All examples are fictional; no client sign-in is needed.</span><button className="quiet" onClick={advancePresentation}>{guidedStep === 2 ? "Return to employee view" : "Next part →"}</button></> : "Learning view: explore a sample employee check-in and switch perspectives to see the corresponding employer summary. Sample interactions are not persisted."}</div>
        </section>

        <section className="card inventory"><p className="eyebrow">PRODUCT TOUR</p><h2>What the customer platform includes</h2><p className="muted">These are existing Root Health experiences. This isolated partner demo uses only the sample paths marked below; customer administration and customer data stay unavailable here.</p><div className="inventoryGrid"><article><span className="pill">Employee experience</span><ul><li>Orientation and personal profile setup</li><li>Baseline assessments and daily check-ins across seven wellbeing measures</li><li>Personal feedback, coach, playbook, journal, and body and mind experiences</li><li>Personal insights, progress history, and trends</li></ul><p className="fine">Interactive here: sample check-in, Root feedback engine, and fictional progress context.</p></article><article><span className="pill">Employer experience</span><ul><li>Organisation insights and workforce trends</li><li>Structure and people, invitations, and workforce import</li><li>HR Coach, executive review, interventions, and presentation support</li><li>Workplace trial, pricing, and billing paths</li></ul><p className="fine">Interactive here: aggregated fictional employer review. Administration and tenant-specific tools are intentionally withheld.</p></article></div></section>

        <section className="card introduction" id="introduction-request"><p className="eyebrow">A NEXT STEP</p><h2>Request an introduction</h2><p>Share a prospective organisation and what would be helpful next. Root Health will receive the request for follow-up; this form does not send an email.</p><form onSubmit={submitIntroduction} className="introForm">
          <label>Organisation<input required maxLength={160} value={intro.organisationName} onChange={(event) => setIntro({ ...intro, organisationName: event.target.value })}/></label>
          <label>Contact name (optional)<input maxLength={120} value={intro.contactName} onChange={(event) => setIntro({ ...intro, contactName: event.target.value })}/></label>
          <label>Work email (optional)<input type="email" maxLength={254} value={intro.contactEmail} onChange={(event) => setIntro({ ...intro, contactEmail: event.target.value })}/></label>
          {(intro.contactName || intro.contactEmail) && <label className="consent"><input type="checkbox" checked={intro.contactPermissionConfirmed} onChange={(event) => setIntro({ ...intro, contactPermissionConfirmed: event.target.checked })}/>I confirm this contact has agreed that their details can be shared with Root Health.</label>}
          <label>Why are they interested?<textarea required minLength={10} maxLength={800} value={intro.reason} onChange={(event) => setIntro({ ...intro, reason: event.target.value })}/></label>
          <label>Desired next step<select value={intro.desiredNextStep} onChange={(event) => setIntro({ ...intro, desiredNextStep: event.target.value })}><option value="introductory_call">Introductory call</option><option value="product_demonstration">Product demonstration</option><option value="send_information">Send information</option><option value="follow_up_with_consultant">Follow up with me</option></select></label>
          <button className="primary" disabled={submitting}>{submitting ? "Submitting…" : "Submit introduction request"}</button>
        </form></section>
      </>}
      <footer>© 2024–{new Date().getFullYear()} Root Health. All rights reserved.</footer><div className="watermark">Authorised Root Health Partner Demonstration</div>
      <style jsx global>{`
        *{box-sizing:border-box}.demoPage{min-height:100vh;padding:0 24px 80px;background:radial-gradient(ellipse at top left,#edf2e9 0%,#f7f6f1 48%,#eef1ec 100%);color:#20231e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.topbar{height:76px;max-width:1120px;margin:auto;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;gap:10px;align-items:center;font-weight:700}.brand small{display:block;font-weight:500;color:#687263;font-size:11px;margin-top:2px}.topActions{display:flex;gap:16px;align-items:center}.expiry,.muted,.fine{color:#687263;font-size:13px}.hero{max-width:900px;margin:52px auto 34px;text-align:center}.hero h1{font-size:clamp(34px,6vw,58px);letter-spacing:-.05em;line-height:1.02;margin:12px 0}.hero>p:not(.eyebrow){max-width:690px;margin:18px auto;color:#5d6458;line-height:1.7}.eyebrow{font-size:11px;letter-spacing:.15em;font-weight:800;color:#75826d;margin:0}.consultant{display:inline-block;padding:9px 15px;border-radius:999px;background:#e4eadf;color:#46513f;font-size:13px}.card{max-width:1000px;margin:20px auto;padding:26px;border-radius:26px;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.95);box-shadow:0 16px 45px rgba(36,45,32,.07)}.controls{display:flex;align-items:end;gap:26px;justify-content:space-between;flex-wrap:wrap}.fieldLabel{display:block;font-size:12px;color:#74796f;margin-bottom:8px}.segmented{display:flex;gap:4px;padding:4px;border-radius:999px;background:#eff1eb}.segmented button,.quiet{border:0;background:transparent;color:#4d5846;padding:10px 14px;border-radius:999px;cursor:pointer;font-weight:650}.segmented .selected{background:#fff;box-shadow:0 2px 8px #22301118}.scenarioHead{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px}.scenario h2,.introduction h2,.inventory h2{font-size:28px;letter-spacing:-.03em;margin:7px 0}.fictional,.pill{font-size:12px;color:#59654e;background:#e9efe5;padding:8px 11px;border-radius:999px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:30px}.scenario h3{font-size:18px;margin:0 0 12px}.scenario h4{margin:22px 0 8px}.measureForm{display:grid;gap:14px;margin-top:20px}.measureForm label{display:grid;grid-template-columns:100px 1fr 26px;gap:12px;align-items:center;font-size:13px}.measureForm input{accent-color:#647757}.feedback{border-radius:20px;background:#f2f4ef;padding:22px;line-height:1.65}.feedback p{line-height:1.65}.chips{display:flex;flex-wrap:wrap;gap:7px}.chips span{background:white;border-radius:999px;padding:7px 10px;font-size:12px}.fine{font-size:11px;margin-top:18px}.primary{display:inline-flex;justify-content:center;border:0;border-radius:999px;padding:13px 19px;background:#303d2b;color:white;text-decoration:none;font-weight:700;cursor:pointer}.primary:disabled{opacity:.55;cursor:wait}.statGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}.statGrid>div{padding:18px;border-radius:18px;background:#f0f3ed}.statGrid small,.statGrid strong{display:block}.statGrid small{font-size:12px;color:#687263}.statGrid strong{font-size:28px;margin-top:7px}.employerView{line-height:1.7}.observationList{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:18px 0}.observationList>div{padding:16px;border-radius:16px;background:#f1f3ef}.observationList p{margin-bottom:0}.privacyNote{font-weight:650;color:#4d5b43}.cautions{font-size:12px;color:#687263;padding-left:19px}.modeNote{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:24px;padding:13px 15px;border-left:3px solid #aab69e;background:#f8f8f4;color:#5f665b;font-size:13px;line-height:1.6}.inventoryGrid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px}.inventoryGrid article{padding:18px;border-radius:18px;background:#f3f5f0}.inventoryGrid ul{padding-left:19px;line-height:1.8;font-size:13px}.introduction>p:not(.eyebrow),.inventory>p:not(.eyebrow){color:#687263;line-height:1.6}.introForm{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px}.introForm label{display:grid;gap:7px;font-size:13px;font-weight:650}.introForm input,.introForm select,.introForm textarea{width:100%;padding:12px 13px;border:1px solid #d9ded4;border-radius:12px;background:#fff;font:inherit}.introForm textarea{min-height:100px;resize:vertical}.introForm .consent{grid-column:1/-1;display:flex;align-items:start;gap:9px;font-weight:500}.consent input{width:auto;margin-top:3px}.introForm button{justify-self:start}.alert,.notice{max-width:1000px;margin:12px auto;padding:13px 16px;border-radius:14px;background:#fff0ec;color:#873e31}.notice{background:#e8f1e4;color:#40583c}.access{text-align:center;padding:44px}.access p{margin:14px auto 24px;max-width:520px;color:#66705f;line-height:1.6}footer{text-align:center;color:#7b8176;font-size:12px;padding:32px 0}.watermark{position:fixed;right:12px;bottom:10px;z-index:5;color:#56634d;background:#ffffffd9;border:1px solid #e1e6dc;border-radius:999px;padding:8px 12px;font-size:10px;letter-spacing:.02em;pointer-events:none}.demoPage button:focus-visible,.demoPage a:focus-visible,.demoPage input:focus-visible,.demoPage textarea:focus-visible,.demoPage select:focus-visible{outline:3px solid #91a67e;outline-offset:2px}@media(max-width:700px){.demoPage{padding:0 15px 80px}.topbar{height:66px}.expiry{display:none}.hero{margin:34px auto 26px}.card{padding:20px;border-radius:21px}.controls{align-items:start;display:grid;gap:16px}.scenarioHead{align-items:start;flex-direction:column}.columns,.inventoryGrid{grid-template-columns:1fr}.statGrid{grid-template-columns:1fr 1fr}.introForm{grid-template-columns:1fr}.modeNote{align-items:flex-start;flex-direction:column}.watermark{left:50%;right:auto;transform:translateX(-50%);white-space:nowrap}}
      `}</style>
    </main>
  );
}

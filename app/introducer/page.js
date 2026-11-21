"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import RootEnso from "../../components/RootEnso";

const METRICS = ["stress", "sleep", "recovery", "energy", "mood", "focus", "burnout"];
const VOICE_DEMONSTRATION_ASSET = "/introducer/voice-coach-demo.mp4";

export default function ProfessionalIntroducerPage() {
  const [token, setToken] = useState("");
  const [payload, setPayload] = useState(null);
  const [voiceAccess, setVoiceAccess] = useState(null);
  const [voiceRecordingAvailable, setVoiceRecordingAvailable] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [selectedEmployeeKey, setSelectedEmployeeKey] = useState("employee-01");
  const [mode, setMode] = useState("consultant_learning");
  const [perspective, setPerspective] = useState("employee");
  const [guidedStep, setGuidedStep] = useState(0);
  const [scores, setScores] = useState(Object.fromEntries(METRICS.map((key) => [key, 5])));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const pendingCheckinRequestId = useRef("");
  const [intro, setIntro] = useState({ organisationName: "", contactName: "", contactEmail: "", reason: "", desiredNextStep: "introductory_call", contactPermissionConfirmed: false });

  const load = useCallback(async (currentToken = token, employeeKey = selectedEmployeeKey) => {
    if (!currentToken) return;
    setError("");
    try {
      const response = await fetch(`/api/introducer/demo?employeeKey=${encodeURIComponent(employeeKey)}`, { headers: { Authorization: `Bearer ${currentToken}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The demonstration is unavailable.");
      setPayload(data);
      setEmployee(data.employee);
      setSelectedEmployeeKey(data.selectedEmployeeKey || employeeKey);
      try {
        const accessResponse = await fetch("/api/introducer/access", { headers: { Authorization: `Bearer ${currentToken}` }, cache: "no-store" });
        setVoiceAccess(accessResponse.ok ? await accessResponse.json() : null);
      } catch { setVoiceAccess(null); }
      return data;
    } catch (cause) {
      setPayload(null);
      setError(cause.message);
    } finally { setLoading(false); }
  }, [selectedEmployeeKey, token]);

  useEffect(() => {
    let active = true;
    async function initialise() {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token || "";
      const requestedEmployee = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("employeeKey") || "employee-01"
        : "employee-01";
      if (!active) return;
      setToken(accessToken);
      setSelectedEmployeeKey(requestedEmployee);
      if (accessToken) {
        const data = await load(accessToken, requestedEmployee);
        if (data) setScores(Object.fromEntries(data.employee.measures.map((metric) => [metric.key, metric.value])));
      }
      else { setLoading(false); setError("Sign in with the named, invited Root Health partner account to continue."); }
    }
    initialise();
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    let active = true;
    fetch(VOICE_DEMONSTRATION_ASSET, { method: "HEAD", cache: "no-store" })
      .then((response) => { if (active) setVoiceRecordingAvailable(response.ok && response.headers.get("content-type")?.startsWith("video/")); })
      .catch(() => { if (active) setVoiceRecordingAvailable(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => load(token, selectedEmployeeKey), 30000);
    return () => clearInterval(interval);
  }, [load, token, selectedEmployeeKey]);

  async function selectEmployee(employeeKey) {
    setSelectedEmployeeKey(employeeKey);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `/introducer?employeeKey=${encodeURIComponent(employeeKey)}`);
    const data = await load(token, employeeKey);
    if (data) setScores(Object.fromEntries(data.employee.measures.map((metric) => [metric.key, metric.value])));
  }

  async function runCheckin(event) {
    event.preventDefault();
    setSubmitting(true); setNotice(""); setError("");
    try {
      if (!pendingCheckinRequestId.current) pendingCheckinRequestId.current = crypto.randomUUID();
      const response = await fetch("/api/introducer/demo", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "sample_checkin", employeeKey: selectedEmployeeKey, requestId: pendingCheckinRequestId.current, scores }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The sample check-in could not be processed.");
      setEmployee(data.employee);
      setPayload((current) => ({ ...current, employer: data.employer, employees: data.employees, selectedEmployeeKey: data.selectedEmployeeKey }));
      setScores(Object.fromEntries(data.employee.measures.map((metric) => [metric.key, metric.value])));
      pendingCheckinRequestId.current = "";
      setNotice(data.replayed ? "This check-in was already saved; Root has reloaded its personal and workforce views." : "Check-in saved in this isolated fictional Preview. Root refreshed the personal feedback and whole-workforce aggregate from the same records.");
    } catch (cause) { setError(cause.message); }
    finally { setSubmitting(false); }
  }

  async function resetDemo() {
    setSubmitting(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/introducer/demo", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset_demo" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The fictional demonstration could not be reset.");
      setPayload((current) => ({ ...current, employer: data.employer, employees: data.employees, selectedEmployeeKey: data.selectedEmployeeKey }));
      setEmployee(data.employee);
      setSelectedEmployeeKey(data.selectedEmployeeKey);
      setScores(Object.fromEntries(data.employee.measures.map((metric) => [metric.key, metric.value])));
      if (typeof window !== "undefined") window.history.replaceState(null, "", "/introducer");
      pendingCheckinRequestId.current = "";
      setConfirmReset(false);
      setNotice("This access grant’s fictional check-ins were reset to the original demonstration data. Other introducers’ scenarios are unchanged.");
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
          {!confirmReset ? <button className="quiet" onClick={() => setConfirmReset(true)}>Reset demonstration</button> : <div className="resetConfirm" role="group" aria-label="Confirm fictional demo reset"><span>Reset only this access grant’s fictional check-ins?</span><button className="quiet" onClick={() => setConfirmReset(false)}>Keep changes</button><button className="quiet" disabled={submitting} onClick={resetDemo}>{submitting ? "Resetting…" : "Confirm reset"}</button></div>}
        </section>

        <section className="card scenario"><div className="scenarioHead"><div><p className="eyebrow">{perspective === "employee" ? "PERSONAL ROOT" : "ROOT WORKPLACE"}</p><h2>{perspective === "employee" ? employee?.label : employer?.label}</h2></div><span className="fictional">Fictional demonstration data</span></div>
          {perspective === "employee" ? <div className="columns">
            <div><h3>Personal check-in and wellbeing measures</h3><p className="muted">These use the same seven 0–10 self-reported measures as Root’s assessment flow. Higher scores represent greater reported difficulty; this is not a diagnosis.</p><label className="employeePicker">Fictional employee<select value={selectedEmployeeKey} onChange={(event) => selectEmployee(event.target.value)}>{payload?.employees?.map((person) => <option key={person.employeeKey} value={person.employeeKey}>{person.label}{person.hasHistory ? " · history" : " · new baseline"}</option>)}</select></label><form onSubmit={runCheckin} className="measureForm">{(employee?.measures || []).map((metric) => <label key={metric.key}><span>{metric.label}<small>{metric.scale}</small></span><input type="range" min="0" max="10" value={scores[metric.key]} onChange={(event) => setScores((current) => ({ ...current, [metric.key]: Number(event.target.value) }))}/><strong>{scores[metric.key]}</strong></label>)}<button className="primary" disabled={submitting}>{submitting ? "Saving…" : "Save check-in and view feedback"}</button></form></div>
            <div className="feedback"><h3>Personal feedback and progress</h3><p>{employee?.currentState || "Root reflects on patterns over time and keeps uncertainty visible."}</p>{employee?.movement?.direction && <p className="pill">Recent trend: {employee.movement.direction}</p>}{employee?.movement?.description && <p>{employee.movement.description}</p>}<h4>A gentle next reflection</h4><p>{employee?.coachPrompt}</p><h4>Your check-in history</h4><ol className="historyList">{employee?.history?.map((entry, index) => <li key={`${entry.createdAt}-${index}`}><strong>{entry.assessmentType === "baseline" ? "Baseline" : "Check-in"}</strong><span>{new Date(entry.createdAt).toLocaleDateString("en-GB")}</span></li>)}</ol><p className="fine">{employee?.evidenceLabel}</p></div>
          </div> : <div className="employerView">
            <div className="statGrid"><div><small>Fictional workforce</small><strong>{employer?.organisationSize}</strong></div><div><small>Baseline participants</small><strong>{employer?.respondents}</strong></div><div><small>Participation</small><strong>{Number.isFinite(employer?.participation) ? `${Math.round(employer.participation * 100)}%` : "Not available"}</strong></div><div><small>Workforce Wellbeing Index</small><strong>{Number.isFinite(employer?.wellbeingIndex) ? `${employer.wellbeingIndex}/100` : "Protected"}</strong></div></div>
            <h3>{employer?.headline || "An organisation-level view of participation and reported wellbeing."}</h3><p>{employer?.summary}</p>{employer?.observations?.length > 0 && <div className="observationList">{employer.observations.map((observation, index) => <div key={index}><strong>{observation.label || "Workforce observation"}</strong><p>{observation.summary}</p></div>)}</div>}
            {employer?.assessmentWindow?.length > 0 && <div className="workforceTrend"><h4>Anonymous workforce trend</h4>{employer.assessmentWindow.map((row) => <div className="trendRow" key={row.label}><strong>{row.label}</strong><span>{row.participants} participants</span><p>{[ ["Stress", row.stress], ["Sleep", row.sleep], ["Recovery", row.recovery], ["Burnout", row.burnout] ].filter(([, value]) => Number.isFinite(value)).map(([label, value]) => `${label} ${Number(value).toFixed(1)}`).join(" · ")}</p></div>)}</div>}
            <p className="privacyNote">{employer?.privacyNote}</p><ul className="cautions">{employer?.cautions?.slice(1, 4).map((caution) => <li key={caution}>{caution}</li>)}</ul>
          </div>}
          <div className="modeNote">{mode === "client_presentation" ? <><span>Guided presentation · {guidedStep + 1} of 3 — {guidedStep === 0 ? "employee experience" : guidedStep === 1 ? "employer view" : "request a next step"}. Fictional changes are saved in this Preview grant only.</span><button className="quiet" onClick={advancePresentation}>{guidedStep === 2 ? "Return to employee view" : "Next part →"}</button></> : "Learning view: switch between fictional employees and the whole-workforce summary. Fictional check-ins persist in this isolated Preview and can be reset."}</div>
        </section>

        <section className="card voiceDemonstration" aria-labelledby="voice-demo-heading">
          <p className="eyebrow">ROOT VOICE COACH</p>
          <h2 id="voice-demo-heading">A recorded consultation, without a live AI call</h2>
          <p className="muted">The planned prerecorded walkthrough will use a genuine Root Voice Coach session with fictional information. It will show consultation, intervention development, explicit consent and a Playbook save confirmed only after the save succeeds. Replaying the approved static recording will not make inference calls.</p>
          {voiceRecordingAvailable
            ? <><p className="recordingLabel">Prerecorded demonstration · fictional data · not a live consultation</p><video controls playsInline preload="metadata" src={VOICE_DEMONSTRATION_ASSET} aria-label="Prerecorded fictional Root Voice Coach demonstration" style={{ display: "block", width: "100%", maxHeight: 560, borderRadius: 16, background: "#171717", marginTop: 12 }} /></>
            : <p className="voiceAvailability" role="status">No approved recording is published yet. The recording requires a separately approved, budget-reserved Preview session. No provider call has been made for this page.</p>}
          <div className="liveVoiceStatus"><strong>Live Voice Coach</strong><span>{voiceAccess?.voiceCoachAvailable === true ? "Enabled for this account. Starting a session still requires an available monthly reservation." : voiceAccess?.voiceCoachStatus === "root_authorization_required" ? "Not enabled for this account. Root Health must authorise it explicitly." : voiceAccess?.voiceCoachStatus === "policy_paused" ? "Paused for this Preview." : voiceAccess?.voiceCoachStatus === "termination_controls_pending" ? "Paused until session termination controls pass acceptance." : "Availability is being verified or is currently unavailable."}</span></div>
          <p className="fine">Other permitted Personal Root and fictional Workplace features remain available. An unavailable live session does not mean your demonstration access has ended.</p>
        </section>
        <section className="card inventory"><p className="eyebrow">PRODUCT TOUR</p><h2>Three distinct experiences</h2><p className="muted">This partner Preview uses fictional records only. It does not access customer or employee data. The existing personal and workplace product paths are not automatically reproduced by this demonstration.</p><div className="inventoryGrid"><article><span className="pill">Consultant learning · available</span><ul><li>Twenty-four fictional workforce members and historical check-ins</li><li>Select fictional employees and save a baseline or check-in</li><li>Review the selected employee’s own Root feedback and history</li><li>Reset only this access grant’s fictional check-ins</li></ul><p className="fine">Uses the live assessment measure definitions and personal insight engine against grant-scoped fictional records.</p></article><article><span className="pill">Client presentation · available</span><ul><li>Guided fictional employee and employer views</li><li>Employer view recalculated from the same saved fictional assessments</li><li>Whole-workforce output only; no employee or department-level outcome breakdown</li><li>Introduction requests retain consent, attribution and rate limits</li></ul><p className="fine">Uses Root’s existing organisation snapshot engine, including its five-participant baseline gate and five-matched-participant movement gate. Customer administration remains unavailable.</p></article><article><span className="pill">Personal experience · not enabled here</span><ul><li>The main product already has authenticated personal profiles, onboarding, assessment saving, history and personal insights.</li><li>This Preview has no separate, time-limited prospective-client personal evaluation grant.</li><li>Consent copy, health-data retention/deletion handling and isolated account provisioning are not yet approved for collecting real participant data here.</li></ul><p className="fine">Do not enter real wellbeing information in this Preview. A personal evaluation should reuse the existing personal account journey only after a separate isolated Auth environment and privacy/retention review are in place.</p></article></div></section>

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
        *{box-sizing:border-box}.demoPage{min-height:100vh;padding:0 24px 80px;background:radial-gradient(ellipse at top left,#edf2e9 0%,#f7f6f1 48%,#eef1ec 100%);color:#20231e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.topbar{height:76px;max-width:1120px;margin:auto;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;gap:10px;align-items:center;font-weight:700}.brand small{display:block;font-weight:500;color:#687263;font-size:11px;margin-top:2px}.topActions{display:flex;gap:16px;align-items:center}.expiry,.muted,.fine{color:#687263;font-size:13px}.hero{max-width:900px;margin:52px auto 34px;text-align:center}.hero h1{font-size:clamp(34px,6vw,58px);letter-spacing:-.05em;line-height:1.02;margin:12px 0}.hero>p:not(.eyebrow){max-width:690px;margin:18px auto;color:#5d6458;line-height:1.7}.eyebrow{font-size:11px;letter-spacing:.15em;font-weight:800;color:#75826d;margin:0}.consultant{display:inline-block;padding:9px 15px;border-radius:999px;background:#e4eadf;color:#46513f;font-size:13px}.card{max-width:1000px;margin:20px auto;padding:26px;border-radius:26px;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.95);box-shadow:0 16px 45px rgba(36,45,32,.07)}.controls{display:flex;align-items:end;gap:26px;justify-content:space-between;flex-wrap:wrap}.fieldLabel{display:block;font-size:12px;color:#74796f;margin-bottom:8px}.segmented{display:flex;gap:4px;padding:4px;border-radius:999px;background:#eff1eb}.segmented button,.quiet{border:0;background:transparent;color:#4d5846;padding:10px 14px;border-radius:999px;cursor:pointer;font-weight:650}.segmented .selected{background:#fff;box-shadow:0 2px 8px #22301118}.scenarioHead{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px}.scenario h2,.introduction h2,.inventory h2{font-size:28px;letter-spacing:-.03em;margin:7px 0}.fictional,.pill{font-size:12px;color:#59654e;background:#e9efe5;padding:8px 11px;border-radius:999px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:30px}.employeePicker{display:grid;gap:7px;max-width:420px;margin-top:18px;font-size:13px;font-weight:650}.employeePicker select{width:100%;padding:11px 13px;border:1px solid #d9ded4;border-radius:12px;background:#fff;font:inherit}.scenario h3{font-size:18px;margin:0 0 12px}.scenario h4{margin:22px 0 8px}.measureForm{display:grid;gap:14px;margin-top:20px}.measureForm label{display:grid;grid-template-columns:100px 1fr 26px;gap:12px;align-items:center;font-size:13px}.measureForm label small{display:block;color:#687263;font-size:10px;font-weight:400;line-height:1.25;margin-top:3px}.measureForm input{accent-color:#647757}.feedback{border-radius:20px;background:#f2f4ef;padding:22px;line-height:1.65}.feedback p{line-height:1.65}.historyList{padding-left:20px;display:grid;gap:6px}.historyList li{padding:9px 11px;border-radius:10px;background:#fff;display:flex;justify-content:space-between;font-size:12px}.resetConfirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#5f665b}.resetConfirm button{padding:8px 10px}.chips{display:flex;flex-wrap:wrap;gap:7px}.chips span{background:white;border-radius:999px;padding:7px 10px;font-size:12px}.fine{font-size:11px;margin-top:18px}.primary{display:inline-flex;justify-content:center;border:0;border-radius:999px;padding:13px 19px;background:#303d2b;color:white;text-decoration:none;font-weight:700;cursor:pointer}.primary:disabled{opacity:.55;cursor:wait}.statGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin-bottom:24px}.statGrid>div{padding:18px;border-radius:18px;background:#f0f3ed}.statGrid small,.statGrid strong{display:block}.statGrid small{font-size:12px;color:#687263}.statGrid strong{font-size:28px;margin-top:7px}.employerView{line-height:1.7}.workforceTrend{margin:20px 0;padding:18px;border-radius:18px;background:#f5f6f2}.workforceTrend h4{margin-top:0}.trendRow{display:grid;grid-template-columns:minmax(90px,1fr) minmax(100px,auto);gap:4px 14px;padding:12px 0;border-top:1px solid #e1e5dd}.trendRow p{grid-column:1/-1;margin:0;color:#5f665b;font-size:13px}.observationList{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:18px 0}.observationList>div{padding:16px;border-radius:16px;background:#f1f3ef}.observationList p{margin-bottom:0}.privacyNote{font-weight:650;color:#4d5b43}.cautions{font-size:12px;color:#687263;padding-left:19px}.modeNote{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:24px;padding:13px 15px;border-left:3px solid #aab69e;background:#f8f8f4;color:#5f665b;font-size:13px;line-height:1.6}.inventoryGrid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px}.inventoryGrid article{padding:18px;border-radius:18px;background:#f3f5f0}.inventoryGrid ul{padding-left:19px;line-height:1.8;font-size:13px}.introduction>p:not(.eyebrow),.inventory>p:not(.eyebrow){color:#687263;line-height:1.6}.introForm{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px}.introForm label{display:grid;gap:7px;font-size:13px;font-weight:650}.introForm input,.introForm select,.introForm textarea{width:100%;padding:12px 13px;border:1px solid #d9ded4;border-radius:12px;background:#fff;font:inherit}.introForm textarea{min-height:100px;resize:vertical}.introForm .consent{grid-column:1/-1;display:flex;align-items:start;gap:9px;font-weight:500}.consent input{width:auto;margin-top:3px}.introForm button{justify-self:start}.alert,.notice{max-width:1000px;margin:12px auto;padding:13px 16px;border-radius:14px;background:#fff0ec;color:#873e31}.notice{background:#e8f1e4;color:#40583c}.access{text-align:center;padding:44px}.access p{margin:14px auto 24px;max-width:520px;color:#66705f;line-height:1.6}footer{text-align:center;color:#7b8176;font-size:12px;padding:32px 0}.watermark{position:fixed;right:12px;bottom:10px;z-index:5;color:#56634d;background:#ffffffd9;border:1px solid #e1e6dc;border-radius:999px;padding:8px 12px;font-size:10px;letter-spacing:.02em;pointer-events:none}.demoPage button:focus-visible,.demoPage a:focus-visible,.demoPage input:focus-visible,.demoPage textarea:focus-visible,.demoPage select:focus-visible{outline:3px solid #91a67e;outline-offset:2px}@media(max-width:700px){.demoPage{padding:0 15px 80px}.topbar{height:66px}.expiry{display:none}.hero{margin:34px auto 26px}.card{padding:20px;border-radius:21px}.controls{align-items:start;display:grid;gap:16px}.scenarioHead{align-items:start;flex-direction:column}.columns,.inventoryGrid{grid-template-columns:1fr}.measureForm label{grid-template-columns:92px 1fr 23px;gap:8px}.measureForm label span small{max-width:110px}.statGrid{grid-template-columns:1fr 1fr}.introForm{grid-template-columns:1fr}.modeNote{align-items:flex-start;flex-direction:column}.watermark{left:50%;right:auto;transform:translateX(-50%);white-space:nowrap}}
      `}</style>
    </main>
  );
}

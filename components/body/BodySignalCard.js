"use client";

import {
  BODY_DURATION_OPTIONS,
  BODY_TIMING_OPTIONS,
  toggleBodyChoice,
  validateBodySignalDraft,
} from "../../lib/bodySignalModel";

function ChoiceGrid({ options, values, onChange, accent }) {
  return <div className="body-choice-grid">
    {options.map((option) => {
      const active = values.includes(option);
      return <button key={option} type="button" aria-pressed={active} onClick={() => onChange(toggleBodyChoice(values, option))} style={active ? { background: accent, borderColor: accent, color: "white" } : undefined}>{option}</button>;
    })}
  </div>;
}

function CustomField({ label, value, onChange, placeholder }) {
  return <label className="body-custom-field">
    <span>{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
  </label>;
}

function Step({ number, title, children }) {
  return <section className="body-signal-step">
    <div className="body-step-title"><span>{number}</span><h3>{title}</h3></div>
    {children}
  </section>;
}

export default function BodySignalCard({ draft, setDraft, onBack, onSave, saving, error = "" }) {
  const config = draft.system;
  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const canSave = validateBodySignalDraft(draft) && !saving;

  return <div className="body-signal-modal" role="dialog" aria-label={`${config.label} body signal`}>
    <style>{`
      .body-signal-modal{position:fixed;z-index:1100;left:50%;top:92px;bottom:16px;transform:translateX(-50%);width:min(1180px,calc(100vw - 32px));display:grid;grid-template-columns:minmax(280px,.82fr) minmax(0,1.18fr);overflow:hidden;border:1px solid rgba(255,255,255,.72);border-radius:34px;background:rgba(250,244,234,.98);box-shadow:0 34px 110px rgba(0,0,0,.28)}
      .body-signal-summary{padding:26px 30px;overflow-y:auto;background:linear-gradient(180deg,rgba(252,246,236,.98),rgba(234,222,204,.95))}.body-signal-summary img{display:block;width:100%;height:min(48vh,500px);object-fit:contain}.body-signal-summary h2{font:500 clamp(32px,4vw,44px)/1.05 Georgia,serif;margin:16px 0 10px;color:#2a261f}.body-signal-summary p{color:#51493d;line-height:1.55}.body-back{border:0;border-radius:999px;padding:10px 16px;background:rgba(255,255,255,.82);cursor:pointer;font-weight:700}.body-location-summary{margin-top:12px;padding:12px 14px;border-radius:15px;background:rgba(255,255,255,.66)}
      .body-signal-form{overflow-y:auto;padding:26px 30px 32px;overscroll-behavior:contain}.body-signal-step{padding:0 0 22px;margin:0 0 22px;border-bottom:1px solid rgba(60,50,38,.13)}.body-step-title{display:flex;align-items:center;gap:12px;margin-bottom:14px}.body-step-title span{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:50%;color:white;background:var(--body-accent);font-weight:800}.body-step-title h3{margin:0;font:500 23px Georgia,serif;color:#2a261f}.body-choice-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px}.body-choice-grid button{min-height:44px;border:1px solid rgba(60,50,38,.17);border-radius:15px;padding:10px 12px;background:rgba(255,255,255,.76);color:#2a261f;cursor:pointer;text-align:left}.body-custom-field{display:block;margin-top:12px}.body-custom-field span,.body-notes span{display:block;margin-bottom:7px;color:#51493d;font-size:13px;font-weight:700}.body-custom-field input,.body-notes textarea,.body-location-input{box-sizing:border-box;width:100%;border:1px solid rgba(60,50,38,.2);border-radius:14px;padding:12px 14px;background:white;font:inherit}.body-score-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:7px}.body-score-grid button{height:42px;border:1px solid rgba(60,50,38,.15);border-radius:999px;background:white;cursor:pointer}.body-notes{display:block}.body-notes textarea{min-height:96px;resize:vertical}.body-save{width:100%;border:0;border-radius:18px;padding:16px;background:var(--body-accent);color:white;font-size:16px;font-weight:800;cursor:pointer}.body-save:disabled{opacity:.48;cursor:not-allowed}.body-form-help{color:#6c6255;font-size:13px;line-height:1.45}.body-form-error{padding:12px;border-radius:12px;background:#fff0ed;color:#8a2821;font-weight:700}
      @media(max-width:800px){.body-signal-modal{top:84px;bottom:10px;width:calc(100vw - 20px);display:block;overflow-y:auto;border-radius:24px}.body-signal-summary,.body-signal-form{overflow:visible;padding:20px}.body-signal-summary img{height:220px}.body-score-grid{grid-template-columns:repeat(5,1fr)}}
    `}</style>
    <aside className="body-signal-summary" style={{ "--body-accent": config.accent }}>
      <button type="button" className="body-back" onClick={onBack}>← Back to body</button>
      <h2>{config.label}</h2><p>{config.description}</p>
      <img src={config.image} alt="" />
      <div className="body-location-summary"><strong>Selected area</strong><br />{draft.locationDetail || "Choose or describe the intended area"}</div>
    </aside>
    <div className="body-signal-form" style={{ "--body-accent": config.accent }}>
      <Step number="1" title="Confirm where you notice it">
        <ChoiceGrid options={config.locations} values={draft.locationDetail ? [draft.locationDetail] : []} onChange={(values) => update({ locationDetail: values.at(-1) || "" })} accent={config.accent} />
        <CustomField label="Other area / describe it" value={config.locations.includes(draft.locationDetail) ? "" : draft.locationDetail} onChange={(value) => update({ locationDetail: value })} placeholder="Describe the location in your own words" />
      </Step>
      <Step number="2" title="What are you noticing?">
        <ChoiceGrid options={config.symptoms} values={draft.symptoms} onChange={(values) => update({ symptoms: values })} accent={config.accent} />
        <CustomField label="Other / describe it" value={draft.customSymptom} onChange={(value) => update({ customSymptom: value })} placeholder="Describe anything the suggestions do not cover" />
      </Step>
      <Step number="3" title="When does this show up?">
        <ChoiceGrid options={BODY_TIMING_OPTIONS} values={draft.timingContexts} onChange={(values) => update({ timingContexts: values })} accent={config.accent} />
        <CustomField label="Another context / describe it" value={draft.customTiming} onChange={(value) => update({ customTiming: value })} placeholder="Add another time or situation" />
      </Step>
      <Step number="4" title="How long / what is the pattern?">
        <ChoiceGrid options={BODY_DURATION_OPTIONS} values={draft.durationPatterns} onChange={(values) => update({ durationPatterns: values })} accent={config.accent} />
        <CustomField label="Other / describe it" value={draft.customDuration} onChange={(value) => update({ customDuration: value })} placeholder="Describe the duration or pattern" />
      </Step>
      <Step number="5" title="How strong is it today?">
        <div className="body-score-grid">{[1,2,3,4,5,6,7,8,9,10].map((score) => <button type="button" key={score} aria-pressed={draft.intensity === score} onClick={() => update({ intensity: score })} style={draft.intensity === score ? { background: config.accent, color: "white" } : undefined}>{score}</button>)}</div>
      </Step>
      <Step number="6" title="What seems to affect or help it?">
        <ChoiceGrid options={config.modifiers} values={draft.modifiers} onChange={(values) => update({ modifiers: values })} accent={config.accent} />
        <CustomField label="Something else / describe it" value={draft.customModifier} onChange={(value) => update({ customModifier: value })} placeholder="Add another factor or helpful response" />
      </Step>
      <Step number="7" title="Anything else you want Root to know?">
        <label className="body-notes"><span>Optional notes</span><textarea value={draft.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Use your own words. Body observations are evidence, not diagnoses." /></label>
      </Step>
      {error && <p role="alert" className="body-form-error">{error}</p>}
      <p className="body-form-help">Confirm the area, at least one symptom, timing, duration/pattern and an explicit strength before saving. You can edit or delete this entry later.</p>
      <button type="button" className="body-save" disabled={!canSave} onClick={onSave}>{saving ? "Saving…" : "Save body signal"}</button>
    </div>
  </div>;
}

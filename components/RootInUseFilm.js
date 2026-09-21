"use client";

import { useEffect, useState } from "react";

const scenes = [
  {
    kicker: "NOTICE",
    title: "See what is happening",
    copy: "A quick check-in turns stress, sleep, recovery, energy, mood and focus into a picture you can actually use.",
    caption: "Root starts with what is happening today — not what should be happening.",
    accent: "CHECK-IN",
  },
  {
    kicker: "UNDERSTAND",
    title: "Spot the pattern",
    copy: "Root brings your signals together over time, so isolated bad days can become recognisable patterns.",
    caption: "The aim is not another score. It is understanding what keeps repeating.",
    accent: "INSIGHTS",
  },
  {
    kicker: "RESPOND",
    title: "Choose one useful next step",
    copy: "Coach, Body, Mind and Playbook help you move from noticing to something practical without trying to fix everything at once.",
    caption: "Small, relevant actions beat generic advice.",
    accent: "ROOT COACH",
  },
  {
    kicker: "REMEMBER",
    title: "Root learns what helps you",
    copy: "Your useful interventions, reflections and changes are remembered so you do not have to begin from zero each time.",
    caption: "Your history becomes context — privately, gradually and with your control.",
    accent: "MEMORY",
  },
  {
    kicker: "MEASURE",
    title: "See whether it helped",
    copy: "Repeated check-ins let you see whether the things you try are actually changing your capacity.",
    caption: "What happened? What did you try? Did it help? Then Root learns with you.",
    accent: "PROGRESS",
  },
];

export default function RootInUseFilm() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setScene((current) => (current + 1) % scenes.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [playing]);

  const active = scenes[scene];

  return (
    <section className="rootFilm" aria-label="See Root in action">
      <div className="filmTopline">
        <div>
          <span className="filmEyebrow">SEE ROOT IN USE</span>
          <h2>What happens after your snapshot?</h2>
        </div>
        <button
          type="button"
          className="filmControl"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause Root preview" : "Play Root preview"}
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      <div className="filmStage">
        <div className="filmGlow" />
        <div className="filmDevice">
          <div className="filmDeviceTop">
            <span>Root</span>
            <span className="filmPill">{active.accent}</span>
          </div>

          <div className="filmScene" key={scene}>
            <span className="sceneKicker">{active.kicker}</span>
            <h3>{active.title}</h3>
            <p>{active.copy}</p>

            <div className="sceneVisual">
              <div className="visualPrimary">
                <span>{scene + 1}</span>
                <strong>{active.accent}</strong>
              </div>
              <div className="visualLines">
                <i />
                <i />
                <i />
              </div>
              <div className="visualCard">
                <b>Root noticed</b>
                <span>{active.caption}</span>
              </div>
            </div>
          </div>

          <div className="filmSubtitles">{active.caption}</div>
        </div>

        <div className="filmProgress" aria-hidden="true">
          {scenes.map((item, index) => (
            <button
              key={item.accent}
              type="button"
              className={index === scene ? "active" : ""}
              onClick={() => setScene(index)}
              aria-label={"Show " + item.title}
            />
          ))}
        </div>
      </div>

      <div className="filmClose">
        <p>
          Your snapshot is one moment. Root is designed to help you understand
          what changes next.
        </p>
        <div className="filmActions">
          <a className="filmPrimary" href="/capacity-check/continue">
            See how Root continues
          </a>
          <a className="filmSecondary" href="/personal/join">
            View membership
          </a>
        </div>
      </div>

      <style jsx>{`
        .rootFilm {
          margin-top: 20px;
          padding: clamp(20px, 4vw, 34px);
          border-radius: 30px;
          border: 1px solid rgba(255,255,255,.17);
          background: linear-gradient(145deg, rgba(10,15,13,.70), rgba(35,26,22,.70));
          overflow: hidden;
        }
        .filmTopline {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:18px;
          margin-bottom:18px;
        }
        .filmEyebrow {
          display:block;
          margin-bottom:6px;
          font-size:10px;
          letter-spacing:.16em;
          font-weight:900;
          color:rgba(255,255,255,.60);
        }
        h2 {
          margin:0;
          font-family:Georgia, serif;
          font-size:clamp(28px,4vw,40px);
          font-weight:500;
          color:#fff;
        }
        .filmControl {
          border:1px solid rgba(255,255,255,.20);
          background:rgba(255,255,255,.08);
          color:#fff;
          border-radius:999px;
          padding:9px 13px;
          cursor:pointer;
        }
        .filmStage { position:relative; }
        .filmGlow {
          position:absolute;
          inset:8% 12%;
          border-radius:50%;
          background:radial-gradient(circle, rgba(232,183,132,.27), transparent 66%);
          filter:blur(22px);
        }
        .filmDevice {
          position:relative;
          min-height:430px;
          padding:20px;
          border-radius:30px;
          border:1px solid rgba(255,255,255,.16);
          background:linear-gradient(160deg, rgba(255,255,255,.14), rgba(0,0,0,.23));
          box-shadow:0 32px 70px rgba(0,0,0,.25);
          overflow:hidden;
        }
        .filmDeviceTop {
          display:flex;
          justify-content:space-between;
          align-items:center;
          color:#fff;
          font-family:Georgia,serif;
          font-weight:700;
        }
        .filmPill {
          font-family:Inter,sans-serif;
          font-size:9px;
          letter-spacing:.12em;
          padding:7px 10px;
          border:1px solid rgba(255,255,255,.16);
          border-radius:999px;
          color:rgba(255,255,255,.72);
        }
        .filmScene {
          max-width:650px;
          margin:54px auto 76px;
          text-align:center;
          animation:sceneIn .55s ease both;
        }
        @keyframes sceneIn {
          from { opacity:0; transform:translateY(10px); }
          to { opacity:1; transform:translateY(0); }
        }
        .sceneKicker {
          font-size:10px;
          letter-spacing:.18em;
          font-weight:900;
          color:rgba(255,255,255,.62);
        }
        .filmScene h3 {
          margin:10px 0 12px;
          font-family:Georgia,serif;
          font-size:clamp(34px,5vw,54px);
          line-height:1.02;
          font-weight:500;
          color:white;
        }
        .filmScene > p {
          margin:0 auto;
          max-width:590px;
          color:rgba(255,255,255,.76);
          font-size:15px;
          line-height:1.7;
        }
        .sceneVisual {
          margin:28px auto 0;
          max-width:570px;
          display:grid;
          grid-template-columns:120px 1fr 1.2fr;
          gap:12px;
          text-align:left;
        }
        .visualPrimary,.visualLines,.visualCard {
          min-height:118px;
          padding:16px;
          border-radius:20px;
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.09);
        }
        .visualPrimary {
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }
        .visualPrimary span {
          font-family:Georgia,serif;
          font-size:38px;
          color:#fff;
        }
        .visualPrimary strong {
          font-size:9px;
          letter-spacing:.11em;
          color:rgba(255,255,255,.62);
        }
        .visualLines {
          display:grid;
          align-content:center;
          gap:12px;
        }
        .visualLines i {
          display:block;
          height:7px;
          border-radius:999px;
          background:linear-gradient(90deg,#fff,rgba(255,255,255,.18));
        }
        .visualLines i:nth-child(2){width:72%}
        .visualLines i:nth-child(3){width:48%}
        .visualCard b {
          display:block;
          margin-bottom:8px;
          color:#fff;
          font-size:12px;
        }
        .visualCard span {
          color:rgba(255,255,255,.68);
          font-size:11px;
          line-height:1.5;
        }
        .filmSubtitles {
          position:absolute;
          left:18px;
          right:18px;
          bottom:18px;
          padding:12px 16px;
          border-radius:14px;
          background:rgba(0,0,0,.47);
          color:#fff;
          text-align:center;
          font-size:13px;
          line-height:1.45;
          backdrop-filter:blur(10px);
        }
        .filmProgress {
          display:flex;
          justify-content:center;
          gap:7px;
          margin-top:12px;
        }
        .filmProgress button {
          width:34px;
          height:4px;
          padding:0;
          border:0;
          border-radius:999px;
          background:rgba(255,255,255,.20);
          cursor:pointer;
        }
        .filmProgress button.active {background:#fff}
        .filmClose {
          max-width:700px;
          margin:24px auto 0;
          text-align:center;
        }
        .filmClose p {
          margin:0;
          color:rgba(255,255,255,.75);
          line-height:1.65;
        }
        .filmActions {
          margin-top:16px;
          display:flex;
          justify-content:center;
          gap:10px;
          flex-wrap:wrap;
        }
        .filmPrimary,.filmSecondary {
          padding:13px 18px;
          border-radius:999px;
          text-decoration:none;
          font-weight:900;
          font-size:13px;
        }
        .filmPrimary {background:#fff;color:#171717}
        .filmSecondary {
          border:1px solid rgba(255,255,255,.22);
          color:#fff;
          background:rgba(255,255,255,.06);
        }
        @media (max-width:680px) {
          .sceneVisual {grid-template-columns:1fr 1fr}
          .visualCard {grid-column:1 / -1}
          .filmDevice {min-height:520px}
          .filmTopline {align-items:center}
        }
      `}</style>
    </section>
  );
}

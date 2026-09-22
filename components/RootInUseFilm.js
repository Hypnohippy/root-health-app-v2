"use client";

export default function RootInUseFilm() {
  return (
    <section className="rootFilm" aria-label="See Root in action">
      <div className="filmTopline">
        <div>
          <span className="filmEyebrow">SEE ROOT IN USE</span>
          <h2>What happens after your snapshot?</h2>
        </div>
      </div>

      <div className="filmStage">
        <video
          className="filmVideo"
          controls
          playsInline
          preload="metadata"
          aria-label="Root Health in use"
        >
          <source src="/root-in-use.mp4" type="video/mp4" />
          Your browser does not support embedded video.
        </video>
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
          text-align:left;
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

        .filmStage {
          width:100%;
          overflow:hidden;
          border-radius:26px;
          border:1px solid rgba(255,255,255,.16);
          background:#090909;
          box-shadow:0 32px 70px rgba(0,0,0,.25);
        }

        .filmVideo {
          display:block;
          width:100%;
          height:auto;
          aspect-ratio:16 / 9;
          object-fit:contain;
          background:#090909;
        }

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

        .filmPrimary,
        .filmSecondary {
          padding:13px 18px;
          border-radius:999px;
          text-decoration:none;
          font-weight:900;
          font-size:13px;
        }

        .filmPrimary {
          background:#fff;
          color:#171717;
        }

        .filmSecondary {
          border:1px solid rgba(255,255,255,.22);
          color:#fff;
          background:rgba(255,255,255,.06);
        }
      `}</style>
    </section>
  );
}

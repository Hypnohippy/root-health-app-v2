"use client";

import RootEnso from "./RootEnso";

const worlds = [
  {
    key: "employee",
    eyebrow: "EMPLOYEE",
    title: "Employee Journey",
    text: "Private, personal support.",
    delay: "0s",
    className: "root-world root-world-employee",
  },
  {
    key: "support",
    eyebrow: "SUPPORT",
    title: "Meaningful Support",
    text: "Practical help that adapts.",
    delay: "-30s",
    className: "root-world root-world-support",
  },
  {
    key: "organisation",
    eyebrow: "ORGANISATION",
    title: "Organisation Intelligence",
    text: "Anonymous evidence over time.",
    delay: "-60s",
    className: "root-world root-world-organisation",
  },
  {
    key: "leadership",
    eyebrow: "LEADERSHIP",
    title: "Executive Decisions",
    text: "Clearer evidence-led next steps.",
    delay: "-90s",
    className: "root-world root-world-leadership",
  },
];

export default function RootSolarSystem() {
  return (
    <div className="root-solar-system" aria-label="The Root Health system">
      <style jsx>{`
        .root-solar-system {
          --orbit-size: 470px;
          --orbit-radius: 235px;
          --world-size: 142px;
          --core-size: 294px;

          position: relative;
          width: 100%;
          min-height: 620px;

          display: grid;
          place-items: center;

          isolation: isolate;
        }

        .root-solar-glow {
          position: absolute;

          width: 540px;
          height: 540px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.9) 0%,
              rgba(255, 255, 255, 0.34) 38%,
              rgba(255, 255, 255, 0.08) 61%,
              transparent 72%
            );

          filter: blur(5px);

          pointer-events: none;

          z-index: 0;
        }

        .root-orbit-ring {
          position: absolute;

          width: var(--orbit-size);
          height: var(--orbit-size);

          border-radius: 50%;

          border: 1px solid rgba(72, 101, 72, 0.12);

          box-shadow:
            0 0 0 22px rgba(255, 255, 255, 0.045),
            inset 0 0 70px rgba(255, 255, 255, 0.18);

          z-index: 1;
        }

        .root-orbit-ring::after {
          content: "";

          position: absolute;

          inset: 48px;

          border-radius: 50%;

          border: 1px dashed rgba(76, 104, 75, 0.08);
        }

        .root-core {
          position: relative;

          width: var(--core-size);
          height: var(--core-size);

          border-radius: 50%;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          background:
            linear-gradient(
              145deg,
              rgba(249, 247, 241, 0.9),
              rgba(224, 234, 220, 0.74)
            );

          border: 1px solid rgba(255, 255, 255, 0.8);

          box-shadow:
            0 34px 90px rgba(42, 63, 43, 0.15),
            inset 0 0 58px rgba(255, 255, 255, 0.58);

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);

          z-index: 4;
        }

        .root-core::before {
          content: "";

          position: absolute;

          inset: 18px;

          border-radius: 50%;

          border: 1px solid rgba(67, 97, 69, 0.13);

          pointer-events: none;
        }

        .root-core-enso {
          position: relative;

          display: flex;
          justify-content: center;

          z-index: 2;
        }

        .root-core-kicker {
          position: relative;

          margin: 18px 0 8px;

          color: #617061;

          font-size: 9px;
          font-weight: 900;

          letter-spacing: 0.16em;

          z-index: 2;
        }

        .root-core-title {
          position: relative;

          max-width: 190px;

          margin: 0;

          color: #243125;

          font-family: Georgia, serif;

          font-size: 23px;
          font-weight: 500;

          line-height: 1.28;

          z-index: 2;
        }

        .root-orbiter {
          position: absolute;

          top: 50%;
          left: 50%;

          width: 0;
          height: 0;

          animation:
            rootOrbit 150s linear infinite;

          transform-origin: center;

          z-index: 5;
        }

        .root-world-shell {
          position: absolute;

          top: calc(var(--world-size) / -2);
          left: calc(var(--world-size) / -2);

          width: var(--world-size);
          height: var(--world-size);

          transform: translateX(var(--orbit-radius));

          animation:
            rootCounterOrbit 150s linear infinite;

          display: grid;
          place-items: center;
        }

        .root-world {
          width: 100%;
          height: 100%;

          border-radius: 50%;

          padding: 22px 18px;

          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;

          text-align: center;

          border: 1px solid rgba(255, 255, 255, 0.88);

          box-shadow:
            0 18px 46px rgba(41, 55, 40, 0.1);

          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);

          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            background 220ms ease;

          cursor: default;
        }

        .root-world:hover {
          transform: scale(1.06);

          box-shadow:
            0 25px 58px rgba(41, 55, 40, 0.15);
        }

        .root-world-employee {
          background:
            rgba(255, 255, 255, 0.8);
        }

        .root-world-support {
          background:
            rgba(232, 239, 226, 0.92);
        }

        .root-world-organisation {
          background:
            rgba(244, 239, 229, 0.92);
        }

        .root-world-leadership {
          background:
            rgba(38, 59, 43, 0.94);

          color: #ffffff;

          border-color:
            rgba(255, 255, 255, 0.16);
        }

        .root-world-eyebrow {
          margin: 0 0 7px;

          font-size: 8px;
          font-weight: 900;

          letter-spacing: 0.13em;

          text-transform: uppercase;

          opacity: 0.56;
        }

        .root-world-title {
          margin: 0;

          font-family: Georgia, serif;

          font-size: 16px;
          font-weight: 500;

          line-height: 1.12;
        }

        .root-world-text {
          max-width: 108px;

          margin: 8px 0 0;

          font-size: 9px;

          line-height: 1.42;

          opacity: 0.66;
        }

        .root-system-caption {
          position: absolute;

          left: 50%;
          bottom: 2px;

          transform: translateX(-50%);

          width: max-content;

          max-width: 90%;

          margin: 0;

          color: #687568;

          font-size: 9px;
          font-weight: 800;

          letter-spacing: 0.08em;

          text-transform: uppercase;

          text-align: center;

          z-index: 3;
        }

        @keyframes rootOrbit {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes rootCounterOrbit {
          from {
            transform:
              translateX(var(--orbit-radius))
              rotate(0deg);
          }

          to {
            transform:
              translateX(var(--orbit-radius))
              rotate(-360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .root-orbiter,
          .root-world-shell {
            animation: none !important;
          }

          .root-world:hover {
            transform: none;
          }
        }

        @media (max-width: 1100px) {
          .root-solar-system {
            --orbit-size: 430px;
            --orbit-radius: 215px;
            --world-size: 132px;
            --core-size: 270px;

            min-height: 570px;
          }

          .root-solar-glow {
            width: 500px;
            height: 500px;
          }
        }

        @media (max-width: 680px) {
          .root-solar-system {
            --orbit-size: 310px;
            --orbit-radius: 155px;
            --world-size: 102px;
            --core-size: 190px;

            min-height: 450px;
          }

          .root-solar-glow {
            width: 355px;
            height: 355px;
          }

          .root-core {
            box-shadow:
              0 26px 70px rgba(42, 63, 43, 0.14),
              inset 0 0 44px rgba(255, 255, 255, 0.56);
          }

          .root-core::before {
            inset: 12px;
          }

          .root-core-kicker {
            margin-top: 9px;

            font-size: 7px;
          }

          .root-core-title {
            max-width: 135px;

            font-size: 17px;
          }

          .root-world {
            padding: 13px 10px;
          }

          .root-world-eyebrow {
            margin-bottom: 4px;

            font-size: 6px;
          }

          .root-world-title {
            font-size: 12px;
          }

          .root-world-text {
            display: none;
          }

          .root-system-caption {
            bottom: 4px;

            font-size: 7px;
          }
        }
      `}</style>

      <div className="root-solar-glow" />

      <div className="root-orbit-ring" />

      <div className="root-core">
        <div className="root-core-enso">
          <RootEnso size={116} />
        </div>

        <p className="root-core-kicker">
          ONE ROOT INTELLIGENCE
        </p>

        <p className="root-core-title">
          Understanding grows
          <br />
          over time.
        </p>
      </div>

      {worlds.map((world) => (
        <div
          key={world.key}
          className="root-orbiter"
          style={{
            animationDelay: world.delay,
          }}
        >
          <div
            className="root-world-shell"
            style={{
              animationDelay: world.delay,
            }}
          >
            <div className={world.className}>
              <p className="root-world-eyebrow">
                {world.eyebrow}
              </p>

              <h3 className="root-world-title">
                {world.title}
              </h3>

              <p className="root-world-text">
                {world.text}
              </p>
            </div>
          </div>
        </div>
      ))}

      <p className="root-system-caption">
        People supported · Organisations understood · Leaders informed
      </p>
    </div>
  );
}

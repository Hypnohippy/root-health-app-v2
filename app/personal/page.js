"use client";

const MONTHLY_PRICE = "£19.99";
const ANNUAL_PRICE = "£199";

const questions = [
  "Why am I tired when I've slept?",
  "Why can't I stick to the things I know are good for me?",
  "Is anything I'm doing actually working?",
  "Why does stress affect my stomach?",
  "Why do I feel fine one week and awful the next?",
  "Why is getting a straight answer so difficult?",
];

const whatIfs = [
  {
    icon: "◌",
    text: "Remembered what helped you before?",
  },
  {
    icon: "▥",
    text: "Noticed when things started changing?",
  },
  {
    icon: "♡",
    text: "Saw the bigger picture of your body and mind?",
  },
  {
    icon: "○",
    text: "Let you talk something through?",
  },
  {
    icon: "▯",
    text: "Helped you turn it into a plan?",
  },
  {
    icon: "↻",
    text: "Changed with you?",
  },
  {
    icon: "◇",
    text: "Gave you a place to turn when you didn't know what to do next?",
  },
];

const rootGoals = [
  ["☾", "Better sleep"],
  ["♡", "Less anxiety"],
  ["↗", "Getting fitter"],
  ["♧", "Eating better"],
  ["◡", "Recovery"],
  ["◇", "Understanding your body"],
  ["☁", "Getting through a difficult period"],
  ["♙", "Staying well as you get older"],
];

const lifeStages = [
  ["Your 20s", "Finding direction"],
  ["Your 30s", "Building and balancing"],
  ["Your 40s", "Responsibility and pressure"],
  ["Your 50s", "Reassessing and refocusing"],
  ["Your 60s+", "Living well and staying strong"],
];

export default function PersonalLandingPage() {
  const joinRoot = () => {
    window.location.href = "/personal/join";
  };

  return (
    <main className="rootPersonal">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="header">
        <a href="/personal" className="brand">
          <span className="brandRoot">Root</span>
          <span className="brandPersonal">PERSONAL</span>
        </a>

        <a href="/login" className="signIn">
          Already a member? <strong>Sign in</strong>
        </a>
      </header>

      {/* =====================================================
          1. HERO
      ===================================================== */}
      <section className="hero">
        <div className="heroCopy">
          <h1>
            LOOKING AFTER
            <br />
            YOURSELF
            <br />
            SHOULDN&apos;T BE
            <br />
            <em>THIS HARD.</em>
          </h1>

          <p>
            You want to feel better.
            <br />
            You just need a way that makes sense for you.
          </p>

          <a href="#questions" className="downArrow">
           ⌄
          </a>
        </div>

        <div className="heroPhoto" />
      </section>

      {/* =====================================================
          2. QUESTIONS
      ===================================================== */}
      <section id="questions" className="questionsBand">
        <div className="questionIcon">
          ?
        </div>

        <div className="questionGrid">
          {questions.map((question) => (
            <p key={question}>
              {question}
            </p>
          ))}
        </div>

        <div className="handNote">
          If you&apos;ve asked
          <br />
          yourself even a
          <br />
          few of these...
          <br />
          <strong>you&apos;re not alone.</strong>
        </div>
      </section>

      {/* =====================================================
          3. NOISE
      ===================================================== */}
      <section className="noise">
        <div className="phoneScene">
          <div className="handShape" />

          <div className="noisePhone">
            <div className="phoneTop">YOUR FEED</div>

            <NoiseRow
              title="MIRACLE SOLUTION"
              text="This changes everything!"
            />

            <NoiseRow
              title="NEW DIET"
              text="Do this every day."
            />

            <NoiseRow
              title="LATEST SUPPLEMENT"
              text="You need this."
            />

            <NoiseRow
              title="ONE EXPERT SAYS YES"
              text="Another says no."
            />

            <NoiseRow
              title="DOCTORS DON'T WANT YOU TO KNOW"
              text="The truth is..."
            />

            <div className="dots">•••</div>
          </div>
        </div>

        <div className="noiseCopy">
          <h2>
            EVERYBODY
            <br />
            SEEMS TO HAVE
            <br />
            AN ANSWER.
          </h2>

          <p>
            But none of them
            <br />
            <em>really know you.</em>
          </p>
        </div>
      </section>

      {/* =====================================================
          4. WHAT IF
      ===================================================== */}
      <section className="whatIf">
        <div className="softLeaves" />

        <div className="whatIfTitle">
          <h2>
            WHAT IF
            <br />
            SOMETHING DID?
          </h2>
        </div>

        <div className="whatIfItems">
          {whatIfs.map((item) => (
            <div className="whatIfItem" key={item.text}>
              <span>{item.icon}</span>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          5. MEET ROOT
      ===================================================== */}
      <section className="meetRoot">
        <div className="meetCopy">
          <h2>MEET ROOT.</h2>

          <h3>
            Your personal health and
            <br />
            wellbeing companion.
          </h3>

          <p>
            Talk. Ask. Explore. Plan.
            <br />
            Reflect. Try things. Keep what
            <br />
            helps. Change what doesn&apos;t.
          </p>

          <p className="rootRemembers">
            And Root remembers
            <br />
            the journey with you.
          </p>
        </div>

        <RootOrb />

        <div className="meetLeaves" />
      </section>

      {/* =====================================================
          6. ROOT IN ACTION
      ===================================================== */}
      <section className="experienceStrip">
        <Experience
          title="TALK FREELY"
          subtitle="A conversation that remembers you."
        >
          <div className="chatPhone">
            <div className="appHeader">
              <span>‹</span>
              <strong>Root Coach</strong>
            </div>

            <div className="userBubble">
              I&apos;ve been feeling really overwhelmed lately.
            </div>

            <div className="rootBubble">
              You&apos;ve mentioned feeling overwhelmed a few
              times. Shall we talk about what&apos;s been happening?
            </div>
          </div>
        </Experience>

        <Experience
          title="SEE CLEARLY"
          subtitle="Insights that turn memory into clarity."
        >
          <div className="insightsPhone">
            <div className="appHeader">
              <span>‹</span>
              <strong>Insights</strong>
            </div>

            <small>THIS WEEK</small>

            <Metric name="Stress" value="8 → 5" />
            <Metric name="Sleep" value="7 → 6" />
            <Metric name="Energy" value="8 → 6" />

            <p>
              You&apos;re showing progress.
              <br />
              Keep going.
            </p>

            <div className="tinyChart" />
          </div>
        </Experience>

        <Experience
          title="BUILD YOUR PLAN"
          subtitle="Turn ideas into a plan that fits your life."
        >
          <div className="planPhone">
            <div className="appHeader">
              <span>‹</span>
              <strong>Playbook</strong>
            </div>

            <small>Goal</small>
            <strong className="planGoal">Improve sleep</strong>

            <PlanLine text="Evening wind-down" />
            <PlanLine text="Dim lights" side="10:00pm" />
            <PlanLine text="Breathing exercise" />
            <PlanLine text="No screens" />
            <PlanLine text="Bed by 11:00pm" />
          </div>
        </Experience>

        <Experience
          title="NEVER START FROM ZERO"
          subtitle="Root carries what matters forward."
        >
          <div className="memoryPhone">
            <div className="appHeader">
              <strong>Root Memory</strong>
            </div>

            <p className="memoryStatement">
              Last time you had trouble sleeping, a slower
              evening routine helped.
            </p>

            <button type="button">
              Look at that again →
            </button>

            <small>
              What helped then:
              <br />
              Evening routine, less caffeine, breathing.
            </small>
          </div>
        </Experience>
      </section>

      {/* =====================================================
          7. WHAT WOULD YOU BUILD?
      ===================================================== */}
      <section className="buildRoot">
        <div className="buildHeading">
          <h2>
            WHAT WOULD
            <br />
            YOU BUILD
            <br />
            YOUR ROOT
            <br />
            AROUND?
          </h2>
        </div>

        <div className="goalGrid">
          {rootGoals.map(([icon, text]) => (
            <div className="goal" key={text}>
              <span>{icon}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>

        <div className="handNote buildNote">
          Maybe something
          <br />
          you haven&apos;t
          <br />
          needed yet.
        </div>
      </section>

      {/* =====================================================
          8. TRUST
      ===================================================== */}
      <section className="trust">
        <div className="trustHeadline">
          HEALTH MATTERS
          <br />
          TOO MUCH FOR
          <br />
          EMPTY PROMISES.
        </div>

        <TrustStatement icon="▯">
          Studies
          <br />
          support.
        </TrustStatement>

        <TrustStatement icon="○">
          Evidence
          <br />
          suggests.
        </TrustStatement>

        <TrustStatement icon="♡">
          Experience
          <br />
          informs.
        </TrustStatement>

        <TrustStatement icon="♙">
          You
          <br />
          decide.
        </TrustStatement>

        <div className="trustSmall first">
          Built with human and AI intelligence.
          <br />
          Structured with therapeutic thinking and lived
          experience.
        </div>

        <div className="trustSmall second">
          Root doesn&apos;t diagnose. It doesn&apos;t promise
          miracle cures. It helps you make better sense of your
          own journey and discover what may work better for you
          over time.
        </div>
      </section>

      {/* =====================================================
          9. LIFE JOURNEY
      ===================================================== */}
      <section className="lifeJourney">
        <div className="stageRow">
          {lifeStages.map(([title, text], index) => (
            <div className="stageWrap" key={title}>
              <div className="lifeStage">
                <div className="stageIcon">♙</div>

                <strong>{title}</strong>

                <p>{text}</p>
              </div>

              {index < lifeStages.length - 1 ? (
                <div className="stageArrow">→</div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="handNote lifeNote">
          Life changes.
          <br />
          Root changes
          <br />
          with you.
        </div>
      </section>

      {/* =====================================================
          10. FUTURE
      ===================================================== */}
      <section className="future">
        <div className="futureSteps">
          <FutureStep
            icon="♙"
            text="Notice what matters"
          />

          <Arrow />

          <FutureStep
            icon="◫"
            text="Make a small change"
          />

          <Arrow />

          <FutureStep
            icon="♡"
            text="See what helps"
          />

          <Arrow />

          <FutureStep
            icon="◴"
            text="Keep building consistency"
          />

          <Arrow />

          <FutureStep
            icon="◇"
            text="Create the life you want"
          />
        </div>

        <div className="journeyPhoto" />
      </section>

      {/* =====================================================
          11. PRICE
      ===================================================== */}
      <section className="offer">
        <div className="offerTitle">
          <h2>
            MAKE
            <br />
            ROOT
            <br />
            YOURS.
          </h2>
        </div>

        <div className="price">
          <div>
            <strong>{MONTHLY_PRICE}</strong>
            <span>/ month</span>
          </div>

          <p>
            or {ANNUAL_PRICE} / year
          </p>

          <small>
            Everything included. Always.
          </small>
        </div>

        <div className="buy">
          <button
            type="button"
            onClick={joinRoot}
          >
            Start my Root
            <span>→</span>
          </button>

          <p>
            One decision.
            <br />
            A lifetime of support.
          </p>
        </div>

        <div className="offerStillLife">
          <div className="bowl" />
          <div className="plant">
            <span>╱</span>
            <span>╲</span>
            <span>│</span>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div>
          <strong>Root</strong>{" "}
          <span>Personal</span>
        </div>

        <nav>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/login">Sign in</a>
        </nav>
      </footer>

      <style jsx global>{`
        :root {
  --ink: #152218;
  --green: #315b3c;
  --deep-green: #17351f;
  --soft-green: #dfe6da;

  --ivory: #f7f4ed;
  --ivory-green: #f1f4ea;
  --sage-wash: #e7eee1;
  --warm: #eee9df;

  --line: rgba(23, 53, 31, 0.13);
  --muted: #687168;
}

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
  margin: 0;
  background:
    radial-gradient(
      circle at 15% 12%,
      rgba(171, 194, 160, 0.18),
      transparent 30%
    ),
    radial-gradient(
      circle at 88% 38%,
      rgba(191, 207, 179, 0.14),
      transparent 34%
    ),
    linear-gradient(
      180deg,
      #f8f5ee 0%,
      #f1f4ea 46%,
      #f7f4ed 100%
    );
}

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        .rootPersonal {
         min-height: 100vh;
         overflow-x: hidden;
         background:
         linear-gradient(
         180deg,
         rgba(248, 245, 238, 0.94) 0%,
         rgba(238, 243, 232, 0.96) 48%,
         rgba(247, 244, 237, 0.96) 100%
        );
          color: var(--ink);
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .rootPersonal h1,
        .rootPersonal h2,
        .rootPersonal h3,
        .price strong,
        .trustHeadline {
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-weight: 400;
        }

        /* ================= HEADER ================= */

        .header {
          height: 72px;
          padding: 0 5.5vw;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--ivory);
        }

        .brand {
          display: flex;
          align-items: baseline;
          gap: 11px;
          color: var(--ink);
          text-decoration: none;
        }

        .brandRoot {
          font-family: Georgia, serif;
          font-size: 22px;
        }

        .brandPersonal {
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.35em;
        }

        .signIn {
          color: var(--ink);
          text-decoration: none;
          font-size: 10px;
        }

        /* ================= HERO ================= */

        .hero {
          min-height: 570px;
          display: grid;
          grid-template-columns: 43% 57%;
          background: var(--ivory);
        }

        .heroCopy {
          padding:
            78px
            45px
            60px
            7vw;
          position: relative;
          z-index: 2;
        }

        .heroCopy h1 {
          margin: 0;
          font-size:
            clamp(
              46px,
              4.65vw,
              70px
            );
          line-height: 0.96;
          letter-spacing: -0.045em;
        }

        .heroCopy h1 em {
          color: #4d7958;
          font-style: normal;
        }

        .heroCopy p {
          margin: 28px 0 0;
          font-family: Georgia, serif;
          font-size: 14px;
          line-height: 1.55;
        }

        .downArrow {
          display: inline-block;
          margin-top: 36px;
          color: var(--green);
          text-decoration: none;
          font-family: Georgia, serif;
          font-size: 30px;
          font-weight: 300;
        }

        .heroPhoto {
          min-height: 570px;
          background:
            linear-gradient(
              90deg,
              rgba(247, 244, 237, 0.75) 0%,
              rgba(247, 244, 237, 0.08) 28%,
              rgba(247, 244, 237, 0) 100%
            ),
            linear-gradient(
              180deg,
              rgba(34, 55, 36, 0.02),
              rgba(34, 55, 36, 0.10)
            ),
            url("/visuals/root-personal-hero.jpg")
              center / cover no-repeat,
            radial-gradient(
              circle at 40% 45%,
              #e9d6ad,
              #8b9b78 70%
            );
        }

        /* ================= QUESTIONS ================= */

        .questionsBand {
          min-height: 235px;
          padding: 34px 6.5vw;
          display: grid;
          grid-template-columns:
            115px
            minmax(0, 1fr)
            205px;
          gap: 42px;
          align-items: center;
          background:
          linear-gradient(
          90deg,
          #f7f4ed 0%,
          #f1f4ea 52%,
          #f7f4ed 100%
          );
        }

        .questionIcon {
          width: 78px;
          height: 78px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e4e3d7;
          color: #477052;
          font-family: Georgia, serif;
          font-size: 45px;
        }

        .questionGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px 44px;
        }

        .questionGrid p {
          margin: 0;
          max-width: 180px;
          font-size: 11px;
          line-height: 1.55;
        }

        .handNote {
          color: #3e7250;
          font-family:
            "Segoe Print",
            "Bradley Hand",
            cursive;
          font-size: 16px;
          font-style: italic;
          line-height: 1.5;
          transform: rotate(-2deg);
        }

        .handNote strong {
          font-weight: 700;
        }

        /* ================= NOISE ================= */

        .noise {
          min-height: 320px;
          display: grid;
          grid-template-columns: 52% 48%;
          background:
            linear-gradient(
              90deg,
              #ddd9d1,
              #ece7de
            );
        }

        .phoneScene {
          min-height: 320px;
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: end center;
        }

        .handShape {
          position: absolute;
          width: 120px;
          height: 220px;
          left: calc(50% - 125px);
          bottom: -85px;
          border-radius: 70px 70px 30px 30px;
          transform: rotate(-13deg);
          background:
            linear-gradient(
              145deg,
              #d7a177,
              #bd7e5b
            );
        }

        .noisePhone {
          position: relative;
          z-index: 2;
          width: 220px;
          padding: 13px;
          transform:
            rotate(-6deg)
            translateY(25px);
          border: 6px solid #192019;
          border-radius: 24px;
          background: white;
          box-shadow:
            0 20px 40px
              rgba(0, 0, 0, 0.16);
        }

        .phoneTop {
          padding: 5px 0 9px;
          color: #566158;
          text-align: center;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .noiseRow {
          margin-bottom: 5px;
          padding: 7px 9px;
          border-radius: 8px;
          background: #f0f0ef;
        }

        .noiseRow strong {
          display: block;
          font-size: 7px;
        }

        .noiseRow span {
          color: #8b8e89;
          font-size: 6px;
        }

        .dots {
          color: #777;
          text-align: center;
          letter-spacing: 3px;
        }

        .noiseCopy {
          padding: 57px 7vw 45px 45px;
        }

        .noiseCopy h2 {
          margin: 0;
          font-size:
            clamp(
              37px,
              3.4vw,
              54px
            );
          line-height: 0.98;
        }

        .noiseCopy p {
          margin: 22px 0 0;
          font-family: Georgia, serif;
          font-size: 20px;
          line-height: 1.25;
        }

        .noiseCopy em {
          color: #477756;
          font-style: normal;
        }

        /* ================= WHAT IF ================= */

        .whatIf {
          min-height: 180px;
          position: relative;
          display: grid;
          grid-template-columns: 240px 1fr;
          overflow: hidden;
          background:
            linear-gradient(
              90deg,
              #e5e9dc,
              #faf8f2
            );
        }

        .softLeaves {
          position: absolute;
          inset: 0 auto 0 0;
          width: 360px;
          opacity: 0.42;
          background:
            radial-gradient(
              circle at 10% 30%,
              rgba(60, 101, 61, 0.24),
              transparent 33%
            ),
            radial-gradient(
              circle at 32% 68%,
              rgba(60, 101, 61, 0.21),
              transparent 27%
            );
          filter: blur(18px);
        }

        .whatIfTitle {
          padding-left: 6.5vw;
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
        }

        .whatIfTitle h2 {
          margin: 0;
          font-size: 28px;
          line-height: 1.03;
        }

        .whatIfItems {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          position: relative;
          z-index: 2;
        }

        .whatIfItem {
          min-width: 0;
          padding: 27px 11px 18px;
          border-left: 1px solid var(--line);
          text-align: center;
        }

        .whatIfItem > span {
          display: block;
          height: 34px;
          color: #51735a;
          font-family: Georgia, serif;
          font-size: 25px;
        }

        .whatIfItem p {
          margin: 10px auto 0;
          max-width: 110px;
          font-size: 8px;
          line-height: 1.5;
        }

        /* ================= MEET ROOT ================= */

        .meetRoot {
          min-height: 300px;
          display: grid;
          grid-template-columns: 31% 38% 31%;
          align-items: center;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(
              90deg,
              #f9f7f1,
              #f0f3ea
            );
        }

        .meetCopy {
          padding-left: 7vw;
          position: relative;
          z-index: 3;
        }

        .meetCopy h2 {
          margin: 0 0 10px;
          font-size: 26px;
        }

        .meetCopy h3 {
          margin: 0 0 16px;
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
        }

        .meetCopy p {
          margin: 0;
          font-size: 10px;
          line-height: 1.6;
        }

        .meetCopy .rootRemembers {
          margin-top: 15px;
          color: #2e603d;
          font-family: Georgia, serif;
          font-size: 13px;
        }

        .rootOrbWrap {
          display: grid;
          place-items: center;
          position: relative;
          z-index: 3;
        }

        .rootOuter,
        .rootMid,
        .rootInner {
          border-radius: 50%;
          display: grid;
          place-items: center;
        }

        .rootOuter {
          width: 275px;
          height: 275px;
          border:
            1px solid
              rgba(45, 83, 50, 0.08);
        }

        .rootMid {
          width: 220px;
          height: 220px;
          border:
            1px solid
              rgba(45, 83, 50, 0.12);
        }

        .rootInner {
          width: 168px;
          height: 168px;
          border:
            1px solid
              rgba(45, 83, 50, 0.17);
        }

        .rootCore {
          width: 128px;
          height: 128px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle at 35% 30%,
              #4e724d,
              #24452d 72%
            );
          color: white;
          font-family: Georgia, serif;
          font-size: 28px;
          box-shadow:
            0 14px 40px
              rgba(36, 69, 45, 0.25);
        }

        .meetLeaves {
          align-self: stretch;
          background:
            linear-gradient(
              90deg,
              rgba(240, 243, 234, 0.97),
              rgba(240, 243, 234, 0.26)
            ),
            url("/visuals/root-personal-journey.jpg")
              center / cover no-repeat,
            linear-gradient(
              145deg,
              #cad6bc,
              #78916a
            );
        }

        /* ================= PRODUCT GLIMPSES ================= */

        .experienceStrip {
          padding: 38px 6vw 48px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          background:
          linear-gradient(
          180deg,
          #f8f5ee 0%,
          #eef3e8 100%
         );
        }

        .experience {
          min-width: 0;
          text-align: center;
        }

        .experience h3 {
          margin: 0;
          font-family: Arial, sans-serif;
          font-size: 9px;
          letter-spacing: 0.02em;
        }

        .experience > p {
          min-height: 28px;
          margin: 7px auto 14px;
          color: var(--muted);
          font-size: 7px;
          line-height: 1.4;
        }

        .device {
          width: min(185px, 100%);
          min-height: 255px;
          margin: 0 auto;
          padding: 14px;
          border: 4px solid #ebe8e0;
          border-radius: 26px;
          background: #fcfbf8;
          box-shadow:
            0 12px 30px
              rgba(37, 48, 38, 0.08);
          text-align: left;
        }

        .appHeader {
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 7px;
        }

        .userBubble,
        .rootBubble {
          margin-bottom: 8px;
          padding: 9px;
          border-radius: 11px;
          font-size: 7px;
          line-height: 1.45;
        }

        .userBubble {
          background: #eeeae3;
        }

        .rootBubble {
          background: #e2e9dd;
        }

        .insightsPhone small,
        .planPhone small {
          color: #758273;
          font-size: 6px;
        }

        .metric {
          margin-top: 7px;
          padding: 7px;
          display: flex;
          justify-content: space-between;
          border-radius: 7px;
          background: #f0eee9;
          font-size: 7px;
        }

        .insightsPhone p {
          margin-top: 16px;
          color: #5a6858;
          font-size: 7px;
          line-height: 1.5;
        }

        .tinyChart {
          height: 26px;
          margin-top: 10px;
          position: relative;
          border-bottom:
            1px solid
              rgba(55, 77, 55, 0.12);
        }

        .tinyChart::after {
          content: "";
          position: absolute;
          left: 4px;
          right: 4px;
          top: 14px;
          height: 1px;
          transform: rotate(-4deg);
          background: #6e8d70;
          box-shadow:
            20px -2px 0 #6e8d70,
            45px 1px 0 #6e8d70;
        }

        .planGoal {
          display: block;
          margin: 4px 0 11px;
          font-family: Georgia, serif;
          font-size: 13px;
          font-weight: 400;
        }

        .planLine {
          padding: 8px 0;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          border-bottom:
            1px solid
              rgba(34, 58, 38, 0.09);
          color: #546151;
          font-size: 7px;
        }

        .memoryStatement {
          font-family: Georgia, serif;
          font-size: 12px;
          line-height: 1.45;
        }

        .memoryPhone button {
          width: 100%;
          margin: 12px 0;
          padding: 8px;
          border:
            1px solid #e1dfd8;
          border-radius: 8px;
          background: white;
          color: #3e6245;
          font-size: 7px;
        }

        .memoryPhone small {
          color: #727970;
          font-size: 6px;
          line-height: 1.5;
        }

        /* ================= BUILD ROOT ================= */

        .buildRoot {
          min-height: 185px;
          padding: 28px 5vw;
          display: grid;
          grid-template-columns:
            185px
            1fr
            170px;
          gap: 35px;
          align-items: center;
          background:
          linear-gradient(
          90deg,
          #f5f1e8 0%,
          #edf2e7 60%,
          #f7f4ed 100%
         );
        }

        .buildHeading h2 {
          margin: 0;
          font-size: 24px;
          line-height: 1;
        }

        .goalGrid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 12px;
        }

        .goal {
          text-align: center;
        }

        .goal span {
          color: #55765b;
          font-family: Georgia, serif;
          font-size: 24px;
        }

        .goal p {
          margin: 6px auto 0;
          max-width: 80px;
          font-size: 7px;
          line-height: 1.4;
        }

        .buildNote {
          font-size: 14px;
        }

        /* ================= PLAYBOOK ================= */

        .playbookBridge {
          padding: 55px 7vw;
          display: grid;
          grid-template-columns: 45% 55%;
          gap: 55px;
          background:
            linear-gradient(
              90deg,
              #f5f2e9,
              #e9eee3
            );
        }

        .kicker {
          color: #58745b;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .playbookBridge h2 {
          margin: 12px 0 19px;
          font-size:
            clamp(
              39px,
              4.4vw,
              60px
            );
          line-height: 0.98;
        }

        .playbookBridge h2 em {
          color: #4c7958;
          font-style: normal;
        }

        .playbookBridge > div:first-child > p {
          max-width: 440px;
          color: #626b61;
          font-size: 12px;
          line-height: 1.7;
        }

        .playbookDemo {
          padding: 23px;
          border-radius: 28px;
          background:
            rgba(255, 255, 255, 0.74);
          box-shadow:
            0 20px 50px
              rgba(48, 66, 48, 0.08);
        }

        .pbUser,
        .pbRoot {
          max-width: 80%;
          padding: 10px 13px;
          border-radius: 13px;
          font-size: 8px;
          line-height: 1.5;
        }

        .pbUser {
          margin-left: auto;
          background: #243527;
          color: white;
        }

        .pbRoot {
          margin-top: 9px;
          background: #e9eee5;
          color: #445144;
        }

        .savedPlan {
          margin: 18px 0;
          padding: 18px;
          border-radius: 19px;
          background: #efede6;
        }

        .savedPlan small {
          color: #6f806d;
          font-size: 6px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .savedPlan h3 {
          margin: 7px 0 12px;
          font-size: 19px;
        }

        .savedPlanRow {
          padding: 8px 0;
          border-top:
            1px solid
              rgba(38, 58, 39, 0.1);
          display: flex;
          justify-content: space-between;
          gap: 20px;
          color: #666e64;
          font-size: 7px;
        }

        .savedPlanRow strong {
          color: #354137;
        }

        .pbUser.short,
        .pbRoot.short {
          padding: 8px 11px;
        }

        /* ================= TRUST ================= */

        .trust {
          min-height: 260px;
          padding: 43px 6vw 35px;
          display: grid;
          grid-template-columns:
            1.3fr
            repeat(4, 0.72fr);
          gap: 20px;
          position: relative;
          background:
            linear-gradient(
              90deg,
              rgba(22, 52, 29, 0.97),
              rgba(31, 66, 35, 0.96)
            );
          color: white;
        }

        .trust::after {
          content: "";
          position: absolute;
          inset: auto 0 0 auto;
          width: 290px;
          height: 160px;
          opacity: 0.14;
          background:
            radial-gradient(
              ellipse at 60% 100%,
              #b4c99d,
              transparent 65%
            );
        }

        .trustHeadline {
          padding-right: 30px;
          border-right:
            1px solid
              rgba(255, 255, 255, 0.22);
          font-size: 30px;
          line-height: 1.04;
        }

        .trustStatement {
          text-align: center;
        }

        .trustStatement span {
          display: block;
          margin-bottom: 10px;
          color: #d7e0d2;
          font-family: Georgia, serif;
          font-size: 27px;
        }

        .trustStatement p {
          margin: 0;
          font-family: Georgia, serif;
          font-size: 20px;
          line-height: 1.2;
        }

        .trustSmall {
          margin-top: 10px;
          padding-top: 13px;
          border-top:
            1px solid
              rgba(255, 255, 255, 0.11);
          color:
            rgba(255, 255, 255, 0.7);
          font-size: 7px;
          line-height: 1.5;
        }

        .trustSmall.first {
          grid-column: 2 / 4;
        }

        .trustSmall.second {
          grid-column: 4 / 6;
        }

        /* ================= LIFE ================= */

        .lifeJourney {
          min-height: 104px;
          padding: 18px 5vw;
          display: grid;
          grid-template-columns: 1fr 160px;
          gap: 35px;
          align-items: center;
          background:
          linear-gradient(
          90deg,
          #f8f5ee 0%,
          #eef3e8 70%,
          #f8f5ee 100%
         );
        }

        .stageRow {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr 45px)
            1fr;
          align-items: center;
        }

        .stageWrap {
          display: contents;
        }

        .lifeStage {
          text-align: center;
        }

        .stageIcon {
          width: 32px;
          height: 32px;
          margin: 0 auto 5px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border:
            1px solid #738674;
          color: #55725a;
        }

        .lifeStage strong {
          display: block;
          font-size: 7px;
        }

        .lifeStage p {
          margin: 3px 0 0;
          color: #737a72;
          font-size: 6px;
          line-height: 1.35;
        }

        .stageArrow {
          color: #a6aca4;
          text-align: center;
        }

        .lifeNote {
          font-size: 14px;
        }

        /* ================= FUTURE ================= */

        .future {
          min-height: 100px;
          display: grid;
          grid-template-columns: 1fr 280px;
          background:
          linear-gradient(
          90deg,
          #f3f0e7 0%,
          #e9efe3 70%,
          #f5f1e9 100%
         );
        }

        .futureSteps {
          padding: 16px 5vw;
          display: grid;
          grid-template-columns:
            repeat(4, 1fr 30px)
            1fr;
          align-items: center;
        }

        .futureStep {
          text-align: center;
        }

        .futureStep span {
          color: #59765d;
          font-family: Georgia, serif;
          font-size: 21px;
        }

        .futureStep p {
          margin: 5px auto 0;
          max-width: 90px;
          font-size: 7px;
          line-height: 1.4;
        }

        .arrow {
          color: #a6aca4;
          text-align: center;
        }

        .journeyPhoto {
          background:
            linear-gradient(
              90deg,
              rgba(245, 241, 233, 0.66),
              rgba(245, 241, 233, 0)
            ),
            url("/visuals/root-personal-journey.jpg")
              center / cover no-repeat,
            linear-gradient(
              145deg,
              #d6dcbf,
              #6d865f
            );
        }

        /* ================= OFFER ================= */

        .offer {
          min-height: 190px;
          display: grid;
          grid-template-columns:
            0.82fr
            0.9fr
            0.9fr
            0.75fr;
          align-items: center;
          background:
          radial-gradient(
          circle at 70% 35%,
         rgba(177, 199, 164, 0.18),
         transparent 34%
        ),
         linear-gradient(
         90deg,
         #f7f3eb 0%,
         #edf2e7 72%,
         #eee8dd 100%
        );
      }

        .offerTitle {
          padding-left: 7vw;
        }

        .offerTitle h2 {
          margin: 0;
          font-size: 38px;
          line-height: 0.92;
        }

        .price strong {
          font-size: 34px;
        }

        .price span {
          font-size: 8px;
        }

        .price p {
          margin: 3px 0 8px;
          font-family: Georgia, serif;
          font-size: 14px;
        }

        .price small {
          color: #737a71;
          font-size: 7px;
        }

        .buy button {
          width: 180px;
          padding: 11px 15px;
          border: none;
          border-radius: 999px;
          display: flex;
          justify-content: space-between;
          background: #294c32;
          color: white;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 10px 23px
              rgba(41, 76, 50, 0.2);
        }

        .buy p {
          margin: 10px 0 0;
          color: #70766f;
          font-size: 7px;
          line-height: 1.45;
        }

        .offerStillLife {
          height: 190px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 75% 30%,
              rgba(167, 188, 141, 0.33),
              transparent 48%
            );
        }

        .bowl {
          position: absolute;
          width: 100px;
          height: 38px;
          left: 30px;
          bottom: 34px;
          border-radius:
            0 0 70px 70px;
          background:
            linear-gradient(
              180deg,
              #826e4e,
              #4c4b36
            );
        }

        .plant {
          position: absolute;
          right: 45px;
          bottom: 35px;
          color: #67815c;
          font-size: 34px;
          line-height: 0.6;
        }

        .plant span {
          display: block;
        }

        /* ================= FOOTER ================= */

        .footer {
          padding: 18px 6vw 28px;
          display: flex;
          justify-content: space-between;
          color: #737a72;
          font-size: 8px;
          background: #f7f3eb;
        }

        .footer nav {
          display: flex;
          gap: 16px;
        }

        .footer a {
          color: inherit;
          text-decoration: none;
        }

        /* ================= RESPONSIVE ================= */

        @media (max-width: 980px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .heroCopy {
            padding: 70px 8vw 55px;
          }

          .heroPhoto {
            min-height: 470px;
          }

          .questionsBand {
            grid-template-columns: 90px 1fr;
          }

          .handNote {
            grid-column: 2;
          }

          .whatIf {
            grid-template-columns: 1fr;
          }

          .whatIfTitle {
            padding: 35px 7vw 20px;
          }

          .whatIfItems {
            grid-template-columns:
              repeat(4, 1fr);
          }

          .meetRoot {
            grid-template-columns: 1fr 1fr;
          }

          .meetLeaves {
            display: none;
          }

          .experienceStrip {
            grid-template-columns: 1fr 1fr;
          }

          .goalGrid {
            grid-template-columns:
              repeat(4, 1fr);
          }

          .trust {
            grid-template-columns:
              repeat(4, 1fr);
          }

          .trustHeadline {
            grid-column: 1 / -1;
            border-right: none;
            padding-bottom: 20px;
          }

          .trustSmall.first {
            grid-column: 1 / 3;
          }

          .trustSmall.second {
            grid-column: 3 / 5;
          }

          .lifeJourney {
            grid-template-columns: 1fr;
          }

          .offer {
            grid-template-columns:
              1fr 1fr;
            padding: 35px 7vw;
            gap: 30px;
          }

          .offerTitle {
            padding-left: 0;
          }

          .offerStillLife {
            display: none;
          }
        }

        @media (max-width: 660px) {
          .header {
            padding: 0 20px;
          }

          .heroCopy h1 {
            font-size:
              clamp(
                43px,
                13vw,
                60px
              );
          }

          .heroPhoto {
            min-height: 390px;
          }

          .questionsBand {
            padding: 45px 24px;
            grid-template-columns: 1fr;
          }

          .questionGrid {
            grid-template-columns: 1fr;
          }

          .questionGrid p {
            max-width: none;
            font-family: Georgia, serif;
            font-size: 18px;
          }

          .handNote {
            grid-column: auto;
          }

          .noise {
            grid-template-columns: 1fr;
          }

          .noiseCopy {
            order: -1;
            padding: 48px 25px 30px;
          }

          .whatIfItems {
            grid-template-columns: 1fr 1fr;
          }

          .meetRoot {
            padding: 50px 24px;
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .meetCopy {
            padding-left: 0;
          }

          .experienceStrip {
            grid-template-columns: 1fr;
          }

          .buildRoot {
            padding: 45px 24px;
            grid-template-columns: 1fr;
          }

          .goalGrid {
            grid-template-columns: 1fr 1fr;
          }

          .playbookBridge {
            padding: 55px 24px;
            grid-template-columns: 1fr;
          }

          .trust {
            padding: 50px 24px;
            grid-template-columns: 1fr 1fr;
          }

          .trustHeadline,
          .trustSmall.first,
          .trustSmall.second {
            grid-column: 1 / -1;
          }

          .stageRow {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .stageWrap {
            display: block;
          }

          .stageArrow {
            margin: 10px 0;
            transform: rotate(90deg);
          }

          .future {
            grid-template-columns: 1fr;
          }

          .futureSteps {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .arrow {
            transform: rotate(90deg);
          }

          .journeyPhoto {
            min-height: 220px;
          }

          .offer {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function NoiseRow({ title, text }) {
  return (
    <div className="noiseRow">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function RootOrb() {
  return (
    <div className="rootOrbWrap">
      <div className="rootOuter">
        <div className="rootMid">
          <div className="rootInner">
            <div className="rootCore">
              Root
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Experience({
  title,
  subtitle,
  children,
}) {
  return (
    <article className="experience">
      <h3>{title}</h3>
      <p>{subtitle}</p>

      <div className="device">
        {children}
      </div>
    </article>
  );
}

function Metric({ name, value }) {
  return (
    <div className="metric">
      <span>{name}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PlanLine({
  text,
  side,
}) {
  return (
    <div className="planLine">
      <span>○ {text}</span>

      {side ? (
        <span>{side}</span>
      ) : null}
    </div>
  );
}

function SavedPlanRow({
  week,
  text,
}) {
  return (
    <div className="savedPlanRow">
      <span>{week}</span>
      <strong>{text}</strong>
    </div>
  );
}

function TrustStatement({
  icon,
  children,
}) {
  return (
    <div className="trustStatement">
      <span>{icon}</span>
      <p>{children}</p>
    </div>
  );
}

function FutureStep({
  icon,
  text,
}) {
  return (
    <div className="futureStep">
      <span>{icon}</span>
      <p>{text}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="arrow">
      →
    </div>
  );
}

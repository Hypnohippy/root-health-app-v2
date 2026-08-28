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
        </div>

        <div className="heroPhoto" />
      </section>

      {/* =====================================================
          2. QUESTIONS
      ===================================================== */}
      <section id="questions" className="questionsBand">
        <div className="questionIcon">?</div>

        <div className="questionGrid">
          {questions.map((question) => (
            <p key={question}>{question}</p>
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

          <h3 className="whatIfQuestion">
            WHAT IF
            <br />
            SOMETHING DID?
          </h3>
        </div>
      </section>

      {/* =====================================================
          4. WHAT IF
      ===================================================== */}
      <section className="whatIf">
        <div className="softLeaves" />

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
      <section className="rootInAction">
        <div className="rootActionIntro">
          <span>SEE ROOT IN ACTION</span>

          <h2>
            ONE PLACE.
            <br />
            <em>YOUR WHOLE JOURNEY.</em>
          </h2>

          <p>
            Root brings your conversations, body signals,
            reflections, plans and progress together — so each
            part of the experience can inform what comes next.
          </p>
        </div>

        <div className="rootActionGrid">
          {/* TALK FREELY */}
          <article className="rootProductCard coachPreview">
            <div className="previewTopbar">
              <strong>Root</strong>

              <div className="previewNav">
                <span>Home</span>
                <span className="active">Coach</span>
                <span>Check-In</span>
              </div>
            </div>

            <div className="coachPreviewBody">
              <div className="previewCopy">
                <small>ROOT COACH</small>

                <h3>
                  Slow down.
                  <br />
                  Speak freely.
                </h3>

                <p>
                  A conversation that can remember what
                  mattered before.
                </p>
              </div>

              <div className="previewOrb">
                <div className="previewOrbRing">
                  <div className="previewOrbCore">
                    Root
                  </div>
                </div>
              </div>
            </div>

            <div className="previewConversation">
              <div className="previewUserMessage">
                I&apos;ve been feeling overwhelmed again.
              </div>

              <div className="previewRootMessage">
                Last time this came up, slowing the evening
                down seemed to help. Shall we start there?
              </div>
            </div>

            <div className="previewCaption">
              <strong>TALK FREELY</strong>
              <span>A conversation that remembers you.</span>
            </div>
          </article>

          {/* SEE CLEARLY */}
          <article className="rootProductCard insightsPreview">
            <div className="previewTopbar">
              <strong>Root</strong>

              <div className="previewNav">
                <span>Home</span>
                <span>Journal</span>
                <span className="active">Insights</span>
              </div>
            </div>

            <div className="insightsPreviewBody">
              <small>ROOT INSIGHTS</small>

              <h3>Your patterns, made clearer.</h3>

              <div className="insightMiniGrid">
                <div className="insightMiniCard warm">
                  <span>BODY SIGNALS</span>
                  <strong>Tight chest</strong>
                  <p>Appeared recently</p>
                </div>

                <div className="insightMiniCard">
                  <span>WHEN THEY SHOW UP</span>
                  <strong>Under pressure</strong>
                  <p>A recurring context</p>
                </div>

                <div className="insightMiniCard">
                  <span>EMOTIONAL THEMES</span>
                  <strong>Overwhelm</strong>
                  <p>Showing up together</p>
                </div>

                <div className="insightMiniCard">
                  <span>PROGRESS</span>
                  <strong>8 → 5</strong>
                  <p>Stress is softening</p>
                </div>
              </div>

              <div className="recentInsight">
                <span>RECENT ACTIVITY</span>
                <p>
                  Your recent check-ins suggest things may be
                  beginning to settle.
                </p>
              </div>
            </div>

            <div className="previewCaption">
              <strong>SEE CLEARLY</strong>
              <span>Insights that turn memory into clarity.</span>
            </div>
          </article>

          {/* BUILD YOUR PLAN */}
          <article className="rootProductCard playbookPreview">
            <div className="previewTopbar">
              <strong>Root</strong>

              <div className="previewNav">
                <span>Coach</span>
                <span className="active">Playbook</span>
                <span>Journal</span>
              </div>
            </div>

            <div className="playbookPreviewBody">
              <small>MY RECOVERY PLAYBOOK</small>

              <h3>
                Keep the things
                <br />
                that may help.
              </h3>

              <p className="playbookIntro">
                Plans, strategies, routines and recovery ideas
                worth coming back to.
              </p>

              <div className="playbookGlass">
                <span>ROOT REMEMBERS WHAT MAY HELP</span>

                <strong>Sleep recovery plan</strong>

                <div className="playbookPreviewRow">
                  <span>Evening wind-down</span>
                  <b>Saved</b>
                </div>

                <div className="playbookPreviewRow">
                  <span>Dim lights from 10pm</span>
                  <b>Saved</b>
                </div>

                <div className="playbookPreviewRow">
                  <span>Breathing before bed</span>
                  <b>Saved</b>
                </div>

                <div className="playbookPreviewRow">
                  <span>Review after one week</span>
                  <b>Next</b>
                </div>
              </div>
            </div>

            <div className="previewCaption">
              <strong>BUILD YOUR PLAN</strong>
              <span>Turn useful ideas into something you can live with.</span>
            </div>
          </article>

          {/* NEVER START FROM ZERO */}
          <article className="rootProductCard memoryPreview">
            <div className="previewTopbar dark">
              <strong>Root</strong>

              <div className="previewNav">
                <span>Insights</span>
                <span className="active">You</span>
              </div>
            </div>

            <div className="memoryPreviewBody">
              <div className="memoryGlow" />

              <small>ROOT REMEMBERS</small>

              <h3>
                You never have
                <br />
                to start from zero.
              </h3>

              <div className="memoryGlass">
                <span>LAST TIME</span>

                <p>
                  When sleep became difficult, a slower evening
                  routine and less caffeine seemed to help.
                </p>
              </div>

              <div className="memoryGlass secondary">
                <span>ROOT NOTICED</span>

                <p>
                  Stress and sleep often seem to shift together
                  for you.
                </p>
              </div>

              <button type="button">
                Carry this forward
                <span>→</span>
              </button>
            </div>

            <div className="previewCaption darkCaption">
              <strong>NEVER START FROM ZERO</strong>
              <span>Root carries what matters forward.</span>
            </div>
          </article>
        </div>
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

          <p>or {ANNUAL_PRICE} / year</p>

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
          min-height: 455px;
          display: grid;
          grid-template-columns: 43% 57%;
          background:
            radial-gradient(
              circle at 28% 22%,
              rgba(179, 198, 166, 0.16),
              transparent 32%
            ),
            linear-gradient(
              135deg,
              #f7f4ed 0%,
              #eef2e8 100%
            );
        }

        .heroCopy {
          padding:
            52px
            42px
            42px
            7vw;
          position: relative;
          z-index: 2;
        }

        .heroCopy h1 {
          margin: 0;
          font-size:
            clamp(
              38px,
              3.65vw,
              56px
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

        .heroPhoto {
          min-height: 455px;
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
            radial-gradient(
              circle at 12% 45%,
              rgba(173, 196, 160, 0.15),
              transparent 28%
            ),
            linear-gradient(
              90deg,
              #f6f2e9 0%,
              #edf2e7 55%,
              #f5f1e9 100%
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
          min-height: 300px;
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
          min-height: 300px;
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
          width: 185px;
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
          padding: 32px 7vw 24px 45px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .noiseCopy h2 {
          margin: 0;
          font-size:
            clamp(
              30px,
              2.8vw,
              44px
            );
          line-height: 0.98;
        }

        .noiseCopy p {
          margin: 18px 0 0;
          font-family: Georgia, serif;
          font-size: 20px;
          line-height: 1.25;
        }

        .noiseCopy em {
          color: #477756;
          font-style: normal;
        }

        .whatIfQuestion {
          margin: 20px 0 0;
          color: var(--ink);
          font-size:
            clamp(
              26px,
              2.15vw,
              34px
            );
          line-height: 0.98;
          letter-spacing: -0.02em;
        }

        /* ================= WHAT IF ================= */

        .whatIf {
          min-height: 112px;
          position: relative;
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

        .whatIfItems {
          min-height: 112px;
          padding: 0 5vw;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          position: relative;
          z-index: 2;
        }

        .whatIfItem {
          min-width: 0;
          padding: 16px 8px 10px;
          border-left: 1px solid var(--line);
          text-align: center;
        }

        .whatIfItem:last-child {
          border-right: 1px solid var(--line);
        }

        .whatIfItem > span {
          display: block;
          height: 25px;
          color: #51735a;
          font-family: Georgia, serif;
          font-size: 20px;
        }

        .whatIfItem p {
          margin: 6px auto 0;
          max-width: 120px;
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

                /* ================= ROOT IN ACTION ================= */

        .rootInAction {
          padding: 45px 5.5vw 52px;
          background:
            radial-gradient(
              circle at 52% 20%,
              rgba(174, 198, 161, 0.18),
              transparent 34%
            ),
            linear-gradient(
              180deg,
              #f8f5ee 0%,
              #edf2e7 100%
            );
        }

        .rootActionIntro {
          max-width: 720px;
          margin: 0 auto 34px;
          text-align: center;
        }

        .rootActionIntro > span {
          color: #59765d;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        .rootActionIntro h2 {
          margin: 9px 0 12px;
          font-size:
            clamp(
              29px,
              2.8vw,
              43px
            );
          line-height: 0.98;
          letter-spacing: -0.035em;
        }

        .rootActionIntro h2 em {
          color: #4d7958;
          font-style: normal;
        }

        .rootActionIntro p {
          max-width: 570px;
          margin: 0 auto;
          color: #657066;
          font-size: 10px;
          line-height: 1.65;
        }

        .rootActionGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
          align-items: stretch;
        }

        .rootProductCard {
          min-width: 0;
          min-height: 430px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border:
            1px solid
              rgba(35, 63, 40, 0.11);
          border-radius: 28px;
          background:
            rgba(250, 248, 243, 0.92);
          box-shadow:
            0 18px 45px
              rgba(44, 65, 46, 0.11);
        }

        .previewTopbar {
          min-height: 42px;
          padding: 9px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom:
            1px solid
              rgba(45, 69, 48, 0.08);
          background:
            rgba(255, 255, 255, 0.68);
          font-size: 7px;
        }

        .previewTopbar > strong {
          font-family: Georgia, serif;
          font-size: 10px;
        }

        .previewNav {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .previewNav span {
          padding: 4px 6px;
          border-radius: 999px;
          color: #697268;
          background:
            rgba(245, 242, 235, 0.7);
          white-space: nowrap;
        }

        .previewNav span.active {
          color: #294b31;
          background: white;
          font-weight: 800;
        }

        .previewCaption {
          margin-top: auto;
          padding: 14px 16px 16px;
          border-top:
            1px solid
              rgba(37, 64, 40, 0.08);
          background:
            rgba(249, 247, 241, 0.94);
        }

        .previewCaption strong {
          display: block;
          margin-bottom: 4px;
          font-size: 8px;
          letter-spacing: 0.06em;
        }

        .previewCaption span {
          display: block;
          color: #687168;
          font-size: 7px;
          line-height: 1.4;
        }

        /* COACH */

        .coachPreview {
          background:
            linear-gradient(
              145deg,
              rgba(249, 245, 237, 0.98),
              rgba(232, 220, 205, 0.92)
            );
        }

        .coachPreviewBody {
          min-height: 190px;
          padding: 23px 19px 14px;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 10px;
          align-items: center;
          background:
            radial-gradient(
              circle at 80% 45%,
              rgba(255, 255, 255, 0.92),
              transparent 35%
            ),
            linear-gradient(
              135deg,
              rgba(232, 202, 169, 0.5),
              rgba(238, 237, 228, 0.8)
            );
        }

        .previewCopy small,
        .insightsPreviewBody > small,
        .playbookPreviewBody > small,
        .memoryPreviewBody > small {
          color: #667666;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .previewCopy h3 {
          margin: 8px 0 8px;
          font-size: 24px;
          line-height: 0.98;
        }

        .previewCopy p {
          margin: 0;
          color: #60675f;
          font-family: Georgia, serif;
          font-size: 9px;
          line-height: 1.5;
        }

        .previewOrb {
          display: grid;
          place-items: center;
        }

        .previewOrbRing {
          width: 108px;
          height: 108px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border:
            1px solid
              rgba(56, 87, 58, 0.12);
          box-shadow:
            0 0 0 14px
              rgba(255, 255, 255, 0.38),
            0 0 0 29px
              rgba(255, 255, 255, 0.17);
        }

        .previewOrbCore {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle at 35% 28%,
              #587959,
              #24472e 75%
            );
          color: white;
          font-family: Georgia, serif;
          font-size: 17px;
          box-shadow:
            0 10px 25px
              rgba(40, 70, 45, 0.25);
        }

        .previewConversation {
          padding: 14px 17px 17px;
        }

        .previewUserMessage,
        .previewRootMessage {
          max-width: 88%;
          padding: 9px 11px;
          border-radius: 12px;
          font-size: 7px;
          line-height: 1.45;
        }

        .previewUserMessage {
          margin-left: auto;
          background: #eee9e1;
        }

        .previewRootMessage {
          margin-top: 8px;
          background: #dfe8da;
        }

        /* INSIGHTS */

        .insightsPreview {
          background:
            linear-gradient(
              145deg,
              #f6f1e8,
              #e5e8df
            );
        }

        .insightsPreviewBody {
          padding: 22px 16px 18px;
        }

        .insightsPreviewBody > h3 {
          margin: 7px 0 14px;
          font-size: 21px;
          line-height: 1;
        }

        .insightMiniGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .insightMiniCard {
          min-height: 76px;
          padding: 10px;
          border:
            1px solid
              rgba(51, 74, 54, 0.09);
          border-radius: 14px;
          background:
            rgba(255, 255, 255, 0.54);
        }

        .insightMiniCard.warm {
          background:
            rgba(241, 221, 197, 0.55);
        }

        .insightMiniCard span {
          display: block;
          margin-bottom: 7px;
          color: #6c776a;
          font-size: 5px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .insightMiniCard strong {
          display: block;
          font-family: Georgia, serif;
          font-size: 10px;
        }

        .insightMiniCard p {
          margin: 4px 0 0;
          color: #777e75;
          font-size: 6px;
          line-height: 1.35;
        }

        .recentInsight {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          background:
            rgba(255, 255, 255, 0.55);
        }

        .recentInsight span {
          color: #6e796c;
          font-size: 5px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .recentInsight p {
          margin: 5px 0 0;
          font-family: Georgia, serif;
          font-size: 8px;
          line-height: 1.45;
        }

        /* PLAYBOOK */

        .playbookPreview {
          background:
            linear-gradient(
              145deg,
              #e5c7a4,
              #92908e 75%
            );
        }

        .playbookPreview .previewTopbar {
          background:
            rgba(248, 237, 224, 0.75);
        }

        .playbookPreviewBody {
          padding: 21px 17px 18px;
        }

        .playbookPreviewBody > small {
          color:
            rgba(37, 54, 40, 0.72);
        }

        .playbookPreviewBody h3 {
          margin: 7px 0 8px;
          font-size: 23px;
          line-height: 0.98;
        }

        .playbookIntro {
          margin: 0 0 13px;
          color:
            rgba(38, 48, 40, 0.72);
          font-size: 7px;
          line-height: 1.5;
        }

        .playbookGlass {
          padding: 13px;
          border:
            1px solid
              rgba(255, 255, 255, 0.5);
          border-radius: 18px;
          background:
            rgba(248, 246, 241, 0.68);
          backdrop-filter: blur(10px);
        }

        .playbookGlass > span {
          display: block;
          color: #657063;
          font-size: 5px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .playbookGlass > strong {
          display: block;
          margin: 6px 0 8px;
          font-family: Georgia, serif;
          font-size: 11px;
        }

        .playbookPreviewRow {
          padding: 7px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border-top:
            1px solid
              rgba(48, 67, 48, 0.1);
          font-size: 6px;
        }

        .playbookPreviewRow b {
          color: #4c6b50;
          font-size: 5px;
        }

        /* MEMORY */

        .memoryPreview {
          background:
            linear-gradient(
              145deg,
              #304b36,
              #183121
            );
          color: white;
        }

        .memoryPreview .previewTopbar {
          border-bottom:
            1px solid
              rgba(255, 255, 255, 0.1);
          background:
            rgba(17, 40, 24, 0.68);
        }

        .memoryPreview .previewTopbar > strong {
          color: white;
        }

        .memoryPreview .previewNav span {
          color:
            rgba(255, 255, 255, 0.62);
          background:
            rgba(255, 255, 255, 0.06);
        }

        .memoryPreview .previewNav span.active {
          color: #233d29;
          background: #edf2e8;
        }

        .memoryPreviewBody {
          min-height: 327px;
          padding: 23px 18px 18px;
          position: relative;
          overflow: hidden;
        }

        .memoryGlow {
          position: absolute;
          width: 220px;
          height: 220px;
          right: -95px;
          top: -95px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(193, 214, 177, 0.28),
              transparent 68%
            );
        }

        .memoryPreviewBody > * {
          position: relative;
          z-index: 2;
        }

        .memoryPreviewBody > small {
          color:
            rgba(226, 235, 220, 0.72);
        }

        .memoryPreviewBody h3 {
          margin: 8px 0 15px;
          color: white;
          font-size: 24px;
          line-height: 0.98;
        }

        .memoryGlass {
          padding: 12px;
          border:
            1px solid
              rgba(255, 255, 255, 0.13);
          border-radius: 15px;
          background:
            rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
        }

        .memoryGlass.secondary {
          margin-top: 8px;
        }

        .memoryGlass span {
          color:
            rgba(223, 234, 218, 0.64);
          font-size: 5px;
          font-weight: 900;
          letter-spacing: 0.11em;
        }

        .memoryGlass p {
          margin: 6px 0 0;
          color:
            rgba(255, 255, 255, 0.9);
          font-family: Georgia, serif;
          font-size: 8px;
          line-height: 1.45;
        }

        .memoryPreviewBody button {
          width: 100%;
          margin-top: 11px;
          padding: 9px 11px;
          border:
            1px solid
              rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #edf2e8;
          color: #233d29;
          font-size: 6px;
          font-weight: 800;
        }

        .darkCaption {
          border-top:
            1px solid
              rgba(255, 255, 255, 0.08);
          background:
            rgba(13, 34, 20, 0.94);
        }

        .darkCaption strong {
          color: white;
        }

        .darkCaption span {
          color:
            rgba(255, 255, 255, 0.62);
        }

        @media (max-width: 1150px) {
          .rootActionGrid {
            grid-template-columns: 1fr 1fr;
          }

          .rootProductCard {
            min-height: 420px;
          }
        }

        @media (max-width: 660px) {
          .rootInAction {
            padding:
              38px
              22px
              42px;
          }

          .rootActionIntro {
            text-align: left;
          }

          .rootActionIntro h2 {
            font-size: 34px;
          }

          .rootActionIntro p {
            margin-left: 0;
          }

          .rootActionGrid {
            grid-template-columns: 1fr;
          }

          .rootProductCard {
            min-height: 0;
          }

          .previewNav {
            display: none;
          }

          .coachPreviewBody {
            grid-template-columns:
              1fr
              110px;
          }
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
          border: 1px solid #738674;
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
          padding: 0 7vw;
          display: grid;
          grid-template-columns:
            0.82fr
            0.9fr
            0.9fr;
          gap: 38px;
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

          .noise {
            grid-template-columns: 48% 52%;
          }

          .whatIfItems {
            padding: 0 4vw;
            grid-template-columns: repeat(4, 1fr);
          }

          .whatIfItem:nth-child(5) {
            border-left: none;
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
            grid-template-columns: repeat(4, 1fr);
          }

          .trust {
            grid-template-columns: repeat(4, 1fr);
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
            grid-template-columns: 1fr 1fr;
            padding: 35px 7vw;
            gap: 30px;
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
            padding: 48px 25px 32px;
          }

          .whatIfQuestion {
            font-size: 32px;
          }

          .whatIfItems {
            padding: 0 24px;
            grid-template-columns: 1fr 1fr;
          }

          .whatIfItem:nth-child(odd) {
            border-left: none;
          }

          .whatIfItem:last-child {
            border-right: none;
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

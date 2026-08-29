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
          padding: 76px 5.5vw 88px;
          background:
            radial-gradient(
              circle at 50% 10%,
              rgba(174, 198, 161, 0.2),
              transparent 31%
            ),
            linear-gradient(
              180deg,
              #f8f5ee 0%,
              #edf2e7 100%
            );
        }

        .rootActionIntro {
          max-width: 850px;
          margin: 0 auto 58px;
          text-align: center;
        }

        .rootActionIntro > span {
          color: #59765d;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
        }

        .rootActionIntro h2 {
          margin: 13px 0 18px;
          font-size: clamp(42px, 4vw, 64px);
          line-height: 0.94;
          letter-spacing: -0.045em;
        }

        .rootActionIntro h2 em {
          color: #4d7958;
          font-style: normal;
        }

        .rootActionIntro p {
          max-width: 670px;
          margin: 0 auto;
          color: #657066;
          font-size: 13px;
          line-height: 1.7;
        }

        /*
         * Two large product experiences per row.
         * These are intentionally substantial rather than
         * four compressed feature cards.
         */

        .rootActionGrid {
          max-width: 1500px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 34px;
          align-items: stretch;
        }

        .rootProductCard {
          min-width: 0;
          min-height: 650px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(35, 63, 40, 0.12);
          border-radius: 36px;
          background: rgba(250, 248, 243, 0.94);
          box-shadow:
            0 28px 70px rgba(44, 65, 46, 0.13),
            0 2px 8px rgba(44, 65, 46, 0.05);
        }

        /* ---------- ROOT-STYLE MINI NAV ---------- */

        .previewTopbar {
          min-height: 66px;
          padding: 12px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border-bottom: 1px solid rgba(45, 69, 48, 0.09);
          background: rgba(255, 255, 255, 0.66);
          backdrop-filter: blur(16px);
          font-size: 10px;
        }

        .previewTopbar > strong {
          font-family: Georgia, serif;
          font-size: 17px;
          font-weight: 600;
        }

        .previewNav {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .previewNav span {
          padding: 8px 12px;
          border-radius: 999px;
          color: #697268;
          background: rgba(245, 242, 235, 0.72);
          white-space: nowrap;
        }

        .previewNav span.active {
          color: #294b31;
          background: white;
          font-weight: 800;
          box-shadow: 0 4px 15px rgba(34, 55, 37, 0.06);
        }

        /* ---------- CAPTIONS ---------- */

        .previewCaption {
          min-height: 84px;
          margin-top: auto;
          padding: 19px 24px 21px;
          border-top: 1px solid rgba(37, 64, 40, 0.08);
          background: rgba(249, 247, 241, 0.96);
        }

        .previewCaption strong {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          letter-spacing: 0.09em;
        }

        .previewCaption span {
          display: block;
          color: #687168;
          font-family: Georgia, serif;
          font-size: 11px;
          line-height: 1.45;
        }

        /* ==================================================
           COACH — CALM, SPACIOUS, ATMOSPHERIC
        ================================================== */

        .coachPreview {
          background:
            linear-gradient(
              145deg,
              rgba(249, 245, 237, 0.98),
              rgba(232, 220, 205, 0.94)
            );
        }

        .coachPreviewBody {
          min-height: 350px;
          padding: 54px 45px 38px;
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 26px;
          align-items: center;
          background:
            radial-gradient(
              circle at 78% 47%,
              rgba(255, 255, 255, 0.98),
              rgba(255, 255, 255, 0.35) 28%,
              transparent 52%
            ),
            radial-gradient(
              circle at 20% 20%,
              rgba(239, 193, 146, 0.38),
              transparent 38%
            ),
            linear-gradient(
              135deg,
              rgba(234, 199, 163, 0.62),
              rgba(235, 234, 224, 0.88)
            );
        }

        .previewCopy small,
        .insightsPreviewBody > small,
        .playbookPreviewBody > small,
        .memoryPreviewBody > small {
          color: #667666;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .previewCopy h3 {
          margin: 14px 0 15px;
          font-size: clamp(37px, 3.1vw, 52px);
          line-height: 0.94;
          letter-spacing: -0.035em;
        }

        .previewCopy p {
          max-width: 260px;
          margin: 0;
          color: #5e665d;
          font-family: Georgia, serif;
          font-size: 13px;
          line-height: 1.55;
        }

        .previewOrb {
          display: grid;
          place-items: center;
        }

        .previewOrbRing {
          width: 205px;
          height: 205px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid rgba(56, 87, 58, 0.12);
          box-shadow:
            0 0 0 25px rgba(255, 255, 255, 0.43),
            0 0 0 52px rgba(255, 255, 255, 0.2),
            0 0 0 78px rgba(255, 255, 255, 0.09);
        }

        .previewOrbCore {
          width: 137px;
          height: 137px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle at 35% 28%,
              #638664,
              #31583b 48%,
              #1f3d28 100%
            );
          color: white;
          font-family: Georgia, serif;
          font-size: 29px;
          box-shadow:
            0 18px 38px rgba(40, 70, 45, 0.27),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .previewConversation {
          padding: 25px 34px 31px;
          background:
            linear-gradient(
              180deg,
              rgba(250, 247, 240, 0.82),
              rgba(246, 241, 233, 0.94)
            );
        }

        .previewUserMessage,
        .previewRootMessage {
          max-width: 78%;
          padding: 15px 18px;
          border-radius: 19px;
          font-size: 11px;
          line-height: 1.5;
        }

        .previewUserMessage {
          margin-left: auto;
          background: rgba(235, 230, 221, 0.95);
        }

        .previewRootMessage {
          margin-top: 13px;
          background: #dfe8da;
          color: #294332;
        }

        /* ==================================================
           INSIGHTS — ROOT'S PATTERN MAP
        ================================================== */

        .insightsPreview {
          background:
            radial-gradient(
              circle at 15% 8%,
              rgba(237, 196, 153, 0.36),
              transparent 30%
            ),
            linear-gradient(
              145deg,
              #f6f1e8,
              #e2e7dc
            );
        }

        .insightsPreviewBody {
          min-height: 500px;
          padding: 43px 34px 34px;
        }

        .insightsPreviewBody > h3 {
          max-width: 500px;
          margin: 11px 0 26px;
          font-size: clamp(34px, 2.8vw, 47px);
          line-height: 0.98;
          letter-spacing: -0.035em;
        }

        .insightMiniGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .insightMiniCard {
          min-height: 126px;
          padding: 20px;
          border: 1px solid rgba(51, 74, 54, 0.1);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.61);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.55);
        }

        .insightMiniCard.warm {
          background: rgba(241, 221, 197, 0.64);
        }

        .insightMiniCard span {
          display: block;
          margin-bottom: 12px;
          color: #6c776a;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.11em;
        }

        .insightMiniCard strong {
          display: block;
          font-family: Georgia, serif;
          font-size: 20px;
          font-weight: 600;
        }

        .insightMiniCard p {
          margin: 7px 0 0;
          color: #777e75;
          font-size: 10px;
          line-height: 1.4;
        }

        .recentInsight {
          margin-top: 16px;
          padding: 19px 21px;
          border: 1px solid rgba(51, 74, 54, 0.07);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.62);
        }

        .recentInsight span {
          color: #6e796c;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .recentInsight p {
          margin: 9px 0 0;
          font-family: Georgia, serif;
          font-size: 13px;
          line-height: 1.5;
        }

        /* ==================================================
           PLAYBOOK — WARM ROOT ENVIRONMENT
        ================================================== */

        .playbookPreview {
          background:
            radial-gradient(
              circle at 14% 6%,
              rgba(255, 213, 164, 0.8),
              transparent 30%
            ),
            linear-gradient(
              145deg,
              #e6c49d 0%,
              #a6968c 56%,
              #7d8580 100%
            );
        }

        .playbookPreview .previewTopbar {
          background: rgba(248, 237, 224, 0.77);
        }

        .playbookPreviewBody {
          min-height: 500px;
          padding: 42px 36px 36px;
          background:
            radial-gradient(
              circle at 5% 10%,
              rgba(255, 207, 151, 0.42),
              transparent 34%
            );
        }

        .playbookPreviewBody > small {
          color: rgba(37, 54, 40, 0.76);
        }

        .playbookPreviewBody h3 {
          margin: 11px 0 12px;
          font-size: clamp(36px, 3vw, 50px);
          line-height: 0.94;
          letter-spacing: -0.04em;
        }

        .playbookIntro {
          max-width: 470px;
          margin: 0 0 24px;
          color: rgba(38, 48, 40, 0.78);
          font-size: 11px;
          line-height: 1.55;
        }

        .playbookGlass {
          padding: 24px 25px;
          border: 1px solid rgba(255, 255, 255, 0.57);
          border-radius: 30px;
          background: rgba(248, 246, 241, 0.7);
          backdrop-filter: blur(18px);
          box-shadow:
            0 20px 50px rgba(57, 50, 43, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .playbookGlass > span {
          display: block;
          color: #657063;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .playbookGlass > strong {
          display: block;
          margin: 11px 0 15px;
          font-family: Georgia, serif;
          font-size: 21px;
          font-weight: 600;
        }

        .playbookPreviewRow {
          padding: 13px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-top: 1px solid rgba(48, 67, 48, 0.11);
          font-size: 10px;
        }

        .playbookPreviewRow b {
          color: #4c6b50;
          font-size: 8px;
        }

        /* ==================================================
           MEMORY — THE EMOTIONAL PAYOFF
        ================================================== */

        .memoryPreview {
          background:
            radial-gradient(
              circle at 82% 12%,
              rgba(119, 154, 112, 0.23),
              transparent 32%
            ),
            linear-gradient(
              145deg,
              #304b36,
              #183121 68%,
              #10271a
            );
          color: white;
        }

        .memoryPreview .previewTopbar {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(17, 40, 24, 0.68);
        }

        .memoryPreview .previewTopbar > strong {
          color: white;
        }

        .memoryPreview .previewNav span {
          color: rgba(255, 255, 255, 0.62);
          background: rgba(255, 255, 255, 0.06);
        }

        .memoryPreview .previewNav span.active {
          color: #233d29;
          background: #edf2e8;
        }

        .memoryPreviewBody {
          min-height: 500px;
          padding: 44px 38px 37px;
          position: relative;
          overflow: hidden;
        }

        .memoryGlow {
          position: absolute;
          width: 430px;
          height: 430px;
          right: -175px;
          top: -180px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(193, 214, 177, 0.3),
              rgba(193, 214, 177, 0.08) 38%,
              transparent 70%
            );
        }

        .memoryPreviewBody > * {
          position: relative;
          z-index: 2;
        }

        .memoryPreviewBody > small {
          color: rgba(226, 235, 220, 0.72);
        }

        .memoryPreviewBody h3 {
          max-width: 480px;
          margin: 13px 0 26px;
          color: white;
          font-size: clamp(38px, 3.2vw, 54px);
          line-height: 0.94;
          letter-spacing: -0.04em;
        }

        .memoryGlass {
          padding: 21px 23px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.085);
          backdrop-filter: blur(14px);
        }

        .memoryGlass.secondary {
          margin-top: 14px;
        }

        .memoryGlass span {
          color: rgba(223, 234, 218, 0.65);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .memoryGlass p {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.92);
          font-family: Georgia, serif;
          font-size: 13px;
          line-height: 1.55;
        }

        .memoryPreviewBody button {
          width: 100%;
          margin-top: 18px;
          padding: 14px 17px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #edf2e8;
          color: #233d29;
          font-size: 10px;
          font-weight: 800;
        }

        .memoryPreviewBody button span {
          font-size: 15px;
        }

        .darkCaption {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(13, 34, 20, 0.96);
        }

        .darkCaption strong {
          color: white;
        }

        .darkCaption span {
          color: rgba(255, 255, 255, 0.65);
        }

        /* ---------- RESPONSIVE ---------- */

        @media (max-width: 1180px) {
          .rootActionGrid {
            gap: 24px;
          }

          .rootProductCard {
            min-height: 600px;
          }

          .previewNav span {
            padding: 7px 9px;
            font-size: 9px;
          }

          .previewOrbRing {
            width: 170px;
            height: 170px;
          }

          .previewOrbCore {
            width: 112px;
            height: 112px;
          }
        }

        @media (max-width: 900px) {
          .rootInAction {
            padding: 58px 28px 66px;
          }

          .rootActionGrid {
            grid-template-columns: 1fr;
            max-width: 720px;
          }

          .rootProductCard {
            min-height: 0;
          }

          .coachPreviewBody,
          .insightsPreviewBody,
          .playbookPreviewBody,
          .memoryPreviewBody {
            min-height: 460px;
          }
        }

        @media (max-width: 660px) {
          .rootInAction {
            padding: 46px 18px 52px;
          }

          .rootActionIntro {
            margin-bottom: 34px;
            text-align: left;
          }

          .rootActionIntro h2 {
            font-size: 39px;
          }

          .rootActionIntro p {
            margin-left: 0;
            font-size: 12px;
          }

          .rootActionGrid {
            gap: 22px;
          }

          .rootProductCard {
            border-radius: 25px;
          }

          .previewTopbar {
            min-height: 54px;
            padding: 10px 17px;
          }

          .previewNav {
            display: none;
          }

          .coachPreviewBody {
            min-height: 390px;
            padding: 38px 26px 28px;
            grid-template-columns: 1fr 125px;
          }

          .previewCopy h3 {
            font-size: 35px;
          }

          .previewCopy p {
            font-size: 11px;
          }

          .previewOrbRing {
            width: 110px;
            height: 110px;
            box-shadow:
              0 0 0 14px rgba(255, 255, 255, 0.4),
              0 0 0 28px rgba(255, 255, 255, 0.17);
          }

          .previewOrbCore {
            width: 78px;
            height: 78px;
            font-size: 18px;
          }

          .previewConversation {
            padding: 20px;
          }

          .previewUserMessage,
          .previewRootMessage {
            max-width: 90%;
            font-size: 10px;
          }

          .insightsPreviewBody,
          .playbookPreviewBody,
          .memoryPreviewBody {
            min-height: 0;
            padding: 34px 24px 30px;
          }

          .insightsPreviewBody > h3,
          .playbookPreviewBody h3,
          .memoryPreviewBody h3 {
            font-size: 35px;
          }

          .insightMiniCard {
            min-height: 110px;
            padding: 16px;
          }

          .insightMiniCard strong {
            font-size: 17px;
          }

          .playbookGlass {
            padding: 20px;
            border-radius: 24px;
          }

          .memoryGlass {
            padding: 18px;
            border-radius: 20px;
          }

          .previewCaption {
            padding: 17px 20px 19px;
          }
        }

        @media (max-width: 430px) {
          .coachPreviewBody {
            display: block;
          }

          .previewOrb {
            margin: 48px 0 26px;
          }

          .insightMiniGrid {
            grid-template-columns: 1fr;
          }

          .rootActionIntro h2 {
            font-size: 35px;
          }
        }

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

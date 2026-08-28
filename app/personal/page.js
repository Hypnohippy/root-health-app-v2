"use client";

const MONTHLY_PRICE = "£19.99";
const ANNUAL_PRICE = "£199";

export default function PersonalLandingPage() {
  const joinRoot = () => {
    window.location.href = "/personal/join";
  };

  return (
    <main className="personal-page">
      {/* ======================================================
          HEADER
      ====================================================== */}
      <header className="topbar">
        <a href="/personal" className="brand">
          <span className="brand-name">Root</span>
          <span className="brand-type">PERSONAL</span>
        </a>

        <a href="/login" className="sign-in">
          Already a member? <strong>Sign in</strong>
        </a>
      </header>

      {/* ======================================================
          1 — HERO
      ====================================================== */}
      <section className="hero">
        <div className="hero-copy">
          <p className="small-label">
            ROOT PERSONAL
          </p>

          <h1>
            LOOKING AFTER
            <br />
            YOURSELF
            <br />
            SHOULDN&apos;T BE
            <br />
            <em>THIS HARD.</em>
          </h1>

          <p className="hero-sub">
            You want to feel better.
            <br />
            You just need a way that makes
            sense for you.
          </p>

          <a href="#questions" className="scroll-cue">
            ↓
          </a>
        </div>

        <div className="hero-image" aria-hidden="true">
          <div className="hero-image-shade" />
        </div>
      </section>

      {/* ======================================================
          2 — THE QUESTIONS
      ====================================================== */}
      <section
        id="questions"
        className="questions-section"
      >
        <div className="questions-heading">
          <h2>
            QUESTIONS
            <br />
            YOU ASK
            <br />
            YOURSELF.
          </h2>

          <div className="question-mark">
            ?
          </div>
        </div>

        <div className="questions">
          <p>
            Why am I tired
            <br />
            when I&apos;ve slept?
          </p>

          <p>
            Why can&apos;t I stick to
            <br />
            the things I know are
            <br />
            good for me?
          </p>

          <p>
            Is anything I&apos;m
            <br />
            doing actually
            <br />
            working?
          </p>

          <p>
            Why does stress
            <br />
            affect my stomach?
          </p>

          <p>
            Why do I feel fine
            <br />
            one week and awful
            <br />
            the next?
          </p>

          <p>
            Why is getting a
            <br />
            straight answer
            <br />
            so difficult?
          </p>
        </div>

        <div className="questions-note">
          If you&apos;ve asked
          <br />
          yourself even a
          <br />
          few of these...
          <br />
          <strong>
            you&apos;re not alone.
          </strong>
        </div>
      </section>

      {/* ======================================================
          3 — THE NOISE
      ====================================================== */}
      <section className="noise-section">
        <div className="noise-phone">
          <div className="fake-phone">
            <div className="fake-phone-top">
              YOUR FEED
            </div>

            <NoiseMessage
              title="MIRACLE SOLUTION"
              text="This will fix everything!"
            />

            <NoiseMessage
              title="NEW DIET"
              text="Do this every day."
            />

            <NoiseMessage
              title="LATEST SUPPLEMENT"
              text="You need this."
            />

            <NoiseMessage
              title="ONE EXPERT SAYS YES"
              text="Another says no."
            />

            <NoiseMessage
              title="DOCTORS DON'T WANT YOU TO KNOW"
              text="The truth is..."
            />
          </div>
        </div>

        <div className="noise-copy">
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
            <strong>
              really know you.
            </strong>
          </p>
        </div>
      </section>

      {/* ======================================================
          4 — WHAT IF
      ====================================================== */}
      <section className="what-if-section">
        <div className="what-if-heading">
          <h2>
            WHAT IF
            <br />
            SOMETHING DID?
          </h2>
        </div>

        <Possibility
          icon="↶"
          text={
            <>
              Remembered
              <br />
              what helped
              <br />
              you before?
            </>
          }
        />

        <Possibility
          icon="↗"
          text={
            <>
              Noticed when
              <br />
              things started
              <br />
              changing?
            </>
          }
        />

        <Possibility
          icon="♡"
          text={
            <>
              Saw the bigger
              <br />
              picture of your
              <br />
              body and mind?
            </>
          }
        />

        <Possibility
          icon="○"
          text={
            <>
              Let you talk
              <br />
              something
              <br />
              through?
            </>
          }
        />

        <Possibility
          icon="□"
          text={
            <>
              Helped you
              <br />
              turn it into
              <br />
              a plan?
            </>
          }
        />

        <Possibility
          icon="⟳"
          text={
            <>
              Changed
              <br />
              that plan
              <br />
              with you?
            </>
          }
        />

        <Possibility
          icon="◇"
          text={
            <>
              Gave you somewhere
              <br />
              to turn when you
              <br />
              didn&apos;t know what next?
            </>
          }
        />
      </section>

      {/* ======================================================
          5 — MEET ROOT
      ====================================================== */}
      <section className="meet-root">
        <div className="meet-copy">
          <p className="small-label">
            MEET ROOT
          </p>

          <h2>
            Your personal
            <br />
            health and wellbeing
            <br />
            companion.
          </h2>

          <p>
            Talk. Ask. Explore. Plan.
            <br />
            Reflect. Try things.
            <br />
            Keep what helps.
            <br />
            Change what doesn&apos;t.
          </p>

          <strong>
            And Root remembers
            <br />
            the journey with you.
          </strong>
        </div>

        <div className="root-orb-wrap">
          <div className="root-ring ring-one">
            <div className="root-ring ring-two">
              <div className="root-ring ring-three">
                <div className="root-core">
                  Root
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="meet-image" />
      </section>

      {/* ======================================================
          6 — ROOT IN ACTION
      ====================================================== */}
      <section className="root-action">
        <MiniExperience
          title="TALK FREELY"
          subtitle="A conversation that remembers you."
        >
          <div className="mini-chat">
            <div className="mini-user">
              I&apos;ve been feeling really
              overwhelmed lately.
            </div>

            <div className="mini-root">
              You&apos;ve mentioned feeling
              overwhelmed a few times.
              Shall we talk about what&apos;s
              been happening?
            </div>
          </div>
        </MiniExperience>

        <MiniExperience
          title="SEE CLEARLY"
          subtitle="Insights that turn memory into clarity."
        >
          <div className="insight-demo">
            <Metric label="Stress" value="8 → 5" />
            <Metric label="Sleep" value="7 → 6" />
            <Metric label="Energy" value="8 → 6" />

            <p>
              You&apos;re showing progress.
              Keep going.
            </p>
          </div>
        </MiniExperience>

        <MiniExperience
          title="BUILD YOUR PLAN"
          subtitle="Turn ideas into a plan that fits your life."
        >
          <div className="plan-demo">
            <span>Goal</span>
            <strong>Improve sleep</strong>

            <label>
              ○ Evening wind-down
            </label>
            <label>
              ○ Dim lights
            </label>
            <label>
              ○ Breathing exercise
            </label>
            <label>
              ○ No screens
            </label>
            <label>
              ○ Bed by 11:00pm
            </label>
          </div>
        </MiniExperience>

        <MiniExperience
          title="NEVER START FROM ZERO"
          subtitle="Root carries what matters forward."
        >
          <div className="memory-demo">
            <span>ROOT MEMORY</span>

            <p>
              Last time you had trouble
              sleeping, a slower evening
              routine helped.
            </p>

            <button type="button">
              Look at that again →
            </button>

            <small>
              What helped then:
              <br />
              Evening routine, less caffeine,
              breathing.
            </small>
          </div>
        </MiniExperience>
      </section>

      {/* ======================================================
          7 — WHAT WOULD YOU BUILD?
      ====================================================== */}
      <section className="build-around">
        <div className="build-title">
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

        <LifeGoal icon="☾" text="Better sleep" />
        <LifeGoal icon="♡" text="Less anxiety" />
        <LifeGoal icon="↗" text="Getting fitter" />
        <LifeGoal icon="♧" text="Eating better" />
        <LifeGoal icon="◡" text="Recovery" />
        <LifeGoal icon="◇" text="Understanding your body" />
        <LifeGoal icon="☁" text="Getting through a difficult period" />
        <LifeGoal icon="♙" text="Staying well as you get older" />

        <div className="build-last">
          Maybe something
          <br />
          you haven&apos;t
          <br />
          needed yet.
        </div>
      </section>

      {/* ======================================================
          PLAYBOOK POSSIBILITY
      ====================================================== */}
      <section className="playbook-story">
        <div className="playbook-text">
          <p className="small-label">
            YOUR PLAYBOOK
          </p>

          <h2>
            A plan shouldn&apos;t
            <br />
            just fit the goal.
            <br />
            <em>
              It should fit you.
            </em>
          </h2>

          <p>
            Ask Root to help you build
            something around what you&apos;re
            trying to achieve.
          </p>

          <div className="playbook-words">
            <span>Nutrition</span>
            <span>Gut health</span>
            <span>Stress & anxiety</span>
            <span>Sleep</span>
            <span>Movement</span>
            <span>Recovery</span>
            <span>Mind & mood</span>
            <span>Routines</span>
            <span>Anything else</span>
          </div>
        </div>

        <div className="playbook-demo-large">
          <p className="demo-you">
            I want to start exercising again,
            but I&apos;ve been exhausted lately
            and I know I&apos;ll give up if I
            do too much.
          </p>

          <p className="demo-root">
            Let&apos;s start gently.
            Your recent check-ins have also
            shown low energy, so we can make
            this something you can actually
            live with.
          </p>

          <div className="saved-plan">
            <span>PLAYBOOK</span>

            <strong>
              My return-to-fitness plan
            </strong>

            <div>
              Week 1
              <b>
                2 gentle sessions
              </b>
            </div>

            <div>
              Week 2
              <b>
                Build gradually
              </b>
            </div>

            <div>
              Week 3
              <b>
                Review how I feel
              </b>
            </div>
          </div>

          <p className="demo-you small">
            Tuesdays don&apos;t work for me.
          </p>

          <p className="demo-root small">
            Done. Let&apos;s move it.
          </p>
        </div>
      </section>

      {/* ======================================================
          8 — TRUST
      ====================================================== */}
      <section className="trust">
        <div className="trust-title">
          <h2>
            HEALTH MATTERS
            <br />
            TOO MUCH FOR
            <br />
            EMPTY PROMISES.
          </h2>
        </div>

        <TrustPoint
          icon="□"
          title="Studies support."
        />

        <TrustPoint
          icon="○"
          title="Evidence suggests."
        />

        <TrustPoint
          icon="♡"
          title="Experience informs."
        />

        <TrustPoint
          icon="♙"
          title="You decide."
        />

        <div className="trust-bottom">
          <div>
            Built with human and AI intelligence.
            <br />
            Structured with therapeutic thinking
            and lived experience.
          </div>

          <div>
            Root doesn&apos;t diagnose.
            It doesn&apos;t promise miracle cures.
            <br />
            It helps you make better sense of
            your own journey and discover what
            may work better for you over time.
          </div>
        </div>
      </section>

      {/* ======================================================
          9 — LIFE CHANGES
      ====================================================== */}
      <section className="life-section">
        <div className="life-note">
          Life changes.
          <br />
          Root changes
          <br />
          with you.
        </div>

        <LifeStage
          title="Your 20s"
          text="Finding direction"
        />

        <LifeArrow />

        <LifeStage
          title="Your 30s"
          text="Building and balancing"
        />

        <LifeArrow />

        <LifeStage
          title="Your 40s"
          text="Responsibility and pressure"
        />

        <LifeArrow />

        <LifeStage
          title="Your 50s"
          text="Reassessing and refocusing"
        />

        <LifeArrow />

        <LifeStage
          title="Your 60s+"
          text="Living well and staying strong"
        />
      </section>

      {/* ======================================================
          10 — SMALL CHANGES
      ====================================================== */}
      <section className="small-changes">
        <div className="change-heading">
          <h2>
            MAKE POWERFUL
            <br />
            CHANGES.
            <br />
            ONE STEP
            <br />
            AT A TIME.
          </h2>
        </div>

        <ChangeStep
          icon="○"
          text="Notice what matters"
        />

        <ChangeArrow />

        <ChangeStep
          icon="□"
          text="Make a small change"
        />

        <ChangeArrow />

        <ChangeStep
          icon="♡"
          text="See what helps"
        />

        <ChangeArrow />

        <ChangeStep
          icon="◴"
          text="Keep building consistency"
        />

        <ChangeArrow />

        <ChangeStep
          icon="◇"
          text="Create the life you want"
        />

        <div className="change-image" />
      </section>

      {/* ======================================================
          11 — PRICE / CTA
      ====================================================== */}
      <section className="final-offer">
        <div className="offer-title">
          <h2>
            MAKE
            <br />
            ROOT
            <br />
            YOURS.
          </h2>
        </div>

        <div className="offer-price">
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

        <div className="offer-action">
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
            A companion for the journey.
          </p>
        </div>

        <div className="offer-image" />
      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}
      <footer className="footer">
        <div>
          <strong>Root</strong>
          <span> Personal</span>
        </div>

        <div className="footer-links">
          <a href="/privacy">
            Privacy
          </a>

          <a href="/terms">
            Terms
          </a>

          <a href="/login">
            Sign in
          </a>
        </div>
      </footer>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #f4f0e6;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        .personal-page {
          min-height: 100vh;
          overflow: hidden;
          color: #1c241c;
          background:
            linear-gradient(
              180deg,
              #f8f5ee 0%,
              #f0ebe1 100%
            );
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .personal-page h1,
        .personal-page h2 {
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-weight: 400;
        }

        /* HEADER */

        .topbar {
          width:
            min(
              1400px,
              calc(100% - 60px)
            );
          margin: 0 auto;
          padding: 28px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #1e251e;
        }

        .brand-name {
          font-family: Georgia, serif;
          font-size: 25px;
        }

        .brand-type {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.35em;
        }

        .sign-in {
          color: #41483f;
          text-decoration: none;
          font-size: 12px;
        }

        /* HERO */

        .hero {
          min-height: 650px;
          display: grid;
          grid-template-columns:
            0.78fr 1.22fr;
        }

        .hero-copy {
          padding:
            85px
            50px
            70px
            max(
              50px,
              calc(
                (100vw - 1400px) / 2
              )
            );
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #faf7f0;
        }

        .small-label {
          margin: 0 0 18px;
          color: #637b65;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.17em;
        }

        .hero h1 {
          margin: 0;
          font-size:
            clamp(
              44px,
              5.2vw,
              74px
            );
          line-height: 0.97;
          letter-spacing: -0.045em;
        }

        .hero h1 em {
          color: #496f52;
          font-style: normal;
        }

        .hero-sub {
          margin: 28px 0 0;
          color: #404940;
          font-family: Georgia, serif;
          font-size: 18px;
          line-height: 1.55;
        }

        .scroll-cue {
          width: 40px;
          margin-top: 35px;
          color: #446047;
          text-decoration: none;
          font-size: 28px;
        }

        .hero-image {
          position: relative;
          min-height: 650px;
          background:
            linear-gradient(
              90deg,
              rgba(
                248,
                245,
                238,
                0.55
              ),
              rgba(
                248,
                245,
                238,
                0.05
              )
            ),
            url("https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85")
              center / cover no-repeat;
        }

        .hero-image-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              rgba(
                30,
                48,
                32,
                0.02
              ),
              rgba(
                30,
                48,
                32,
                0.13
              )
            );
        }

        /* QUESTIONS */

        .questions-section {
          width:
            min(
              1400px,
              calc(100% - 50px)
            );
          margin: 0 auto;
          padding: 80px 0;
          display: grid;
          grid-template-columns:
            220px 1fr 250px;
          gap: 48px;
          align-items: center;
        }

        .questions-heading {
          display: grid;
          grid-template-columns:
            1fr 90px;
          align-items: center;
        }

        .questions-heading h2 {
          margin: 0;
          font-size: 25px;
          line-height: 1.1;
        }

        .question-mark {
          width: 78px;
          height: 78px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e3e2d7;
          color: #426349;
          font-family: Georgia, serif;
          font-size: 48px;
        }

        .questions {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 38px 40px;
        }

        .questions p {
          margin: 0;
          color: #262e26;
          font-size: 14px;
          line-height: 1.5;
        }

        .questions-note {
          padding-left: 30px;
          border-left:
            1px solid
              rgba(
                47,
                64,
                48,
                0.15
              );
          color: #477153;
          font-family: Georgia, serif;
          font-size: 20px;
          font-style: italic;
          line-height: 1.5;
        }

        /* NOISE */

        .noise-section {
          min-height: 470px;
          display: grid;
          grid-template-columns:
            1.05fr 0.95fr;
          align-items: center;
          background:
            linear-gradient(
              90deg,
              #dbd6cc,
              #eee9df
            );
        }

        .noise-phone {
          height: 470px;
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: end center;
        }

        .fake-phone {
          width: 280px;
          min-height: 430px;
          padding: 22px;
          transform:
            rotate(-6deg)
            translateY(35px);
          border:
            9px solid
              #1c211d;
          border-radius: 42px;
          background: #fafafa;
          box-shadow:
            0 30px 60px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .fake-phone-top {
          margin-bottom: 16px;
          text-align: center;
          color: #777;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .noise-message {
          margin-bottom: 7px;
          padding: 10px 11px;
          border-radius: 12px;
          background: #f1f1f1;
        }

        .noise-message strong {
          display: block;
          color: #303630;
          font-size: 10px;
        }

        .noise-message span {
          color: #898989;
          font-size: 9px;
        }

        .noise-copy {
          padding: 50px 70px;
        }

        .noise-copy h2 {
          margin: 0;
          font-size:
            clamp(
              42px,
              4.5vw,
              66px
            );
          line-height: 1;
        }

        .noise-copy p {
          margin: 25px 0 0;
          color: #354237;
          font-family: Georgia, serif;
          font-size: 27px;
          line-height: 1.25;
        }

        .noise-copy strong {
          color: #477451;
          font-weight: 400;
        }

        /* WHAT IF */

        .what-if-section {
          width:
            min(
              1400px,
              calc(100% - 40px)
            );
          margin: 0 auto;
          padding: 70px 0;
          display: grid;
          grid-template-columns:
            210px repeat(
              7,
              1fr
            );
          align-items: stretch;
        }

        .what-if-heading {
          padding-right: 30px;
          display: flex;
          align-items: center;
        }

        .what-if-heading h2 {
          margin: 0;
          font-size: 33px;
          line-height: 1.04;
        }

        .possibility {
          padding: 10px 18px;
          min-height: 145px;
          border-left:
            1px solid
              rgba(
                54,
                72,
                54,
                0.12
              );
          text-align: center;
        }

        .possibility-icon {
          margin-bottom: 16px;
          color: #517659;
          font-size: 32px;
          font-family: Georgia, serif;
        }

        .possibility p {
          margin: 0;
          color: #333b33;
          font-size: 11px;
          line-height: 1.45;
        }

        /* MEET ROOT */

        .meet-root {
          min-height: 500px;
          display: grid;
          grid-template-columns:
            0.85fr 1fr 0.8fr;
          align-items: center;
          overflow: hidden;
          background:
            linear-gradient(
              90deg,
              #f8f5ee,
              #eeede4
            );
        }

        .meet-copy {
          padding: 60px 70px;
        }

        .meet-copy h2 {
          margin: 0;
          font-size:
            clamp(
              37px,
              3.7vw,
              53px
            );
          line-height: 1.05;
        }

        .meet-copy > p:not(.small-label) {
          margin: 20px 0;
          color: #484f47;
          font-size: 14px;
          line-height: 1.7;
        }

        .meet-copy > strong {
          color: #36523c;
          font-family: Georgia, serif;
          font-size: 17px;
          font-weight: 400;
          line-height: 1.5;
        }

        .root-orb-wrap {
          display: grid;
          place-items: center;
        }

        .root-ring {
          border-radius: 50%;
          display: grid;
          place-items: center;
        }

        .ring-one {
          width: 340px;
          height: 340px;
          border:
            1px solid
              rgba(
                61,
                89,
                64,
                0.08
              );
          box-shadow:
            0 0 60px
              rgba(
                81,
                111,
                82,
                0.08
              );
        }

        .ring-two {
          width: 275px;
          height: 275px;
          border:
            1px solid
              rgba(
                61,
                89,
                64,
                0.11
              );
        }

        .ring-three {
          width: 215px;
          height: 215px;
          border:
            1px solid
              rgba(
                61,
                89,
                64,
                0.14
              );
        }

        .root-core {
          width: 165px;
          height: 165px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              145deg,
              #31543a,
              #183522
            );
          color: white;
          font-family: Georgia, serif;
          font-size: 38px;
          box-shadow:
            0 20px 50px
              rgba(
                36,
                68,
                42,
                0.23
              );
        }

        .meet-image {
          height: 500px;
          background:
            linear-gradient(
              90deg,
              rgba(
                239,
                238,
                228,
                0.65
              ),
              rgba(
                239,
                238,
                228,
                0
              )
            ),
            url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80")
              center / cover no-repeat;
        }

        /* ROOT ACTION */

        .root-action {
          width:
            min(
              1400px,
              calc(100% - 40px)
            );
          margin: 0 auto;
          padding: 65px 0 80px;
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 40px;
        }

        .mini-experience {
          text-align: center;
        }

        .mini-experience h3 {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.05em;
        }

        .mini-subtitle {
          min-height: 36px;
          margin: 8px auto 24px;
          color: #777c75;
          font-size: 10px;
          line-height: 1.45;
        }

        .phone-shell {
          width: 220px;
          min-height: 355px;
          margin: 0 auto;
          padding: 17px;
          border:
            5px solid
              #e7e4dd;
          border-radius: 35px;
          background: #f9f8f4;
          box-shadow:
            0 15px 35px
              rgba(
                38,
                46,
                37,
                0.08
              );
        }

        .mini-phone-top {
          margin-bottom: 18px;
          color: #777;
          text-align: left;
          font-size: 8px;
          font-weight: 800;
        }

        .mini-chat {
          display: grid;
          gap: 10px;
        }

        .mini-user,
        .mini-root {
          padding: 12px;
          border-radius: 15px;
          text-align: left;
          font-size: 10px;
          line-height: 1.5;
        }

        .mini-user {
          background: #eeeae3;
        }

        .mini-root {
          background: #e2e9de;
          color: #3d493c;
        }

        .insight-demo {
          text-align: left;
        }

        .metric {
          margin-bottom: 8px;
          padding: 9px 10px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          background: #eeece7;
          font-size: 10px;
        }

        .insight-demo p {
          margin-top: 20px;
          color: #60705f;
          font-size: 10px;
          line-height: 1.5;
        }

        .plan-demo {
          display: grid;
          gap: 8px;
          text-align: left;
        }

        .plan-demo > span {
          color: #879184;
          font-size: 8px;
          font-weight: 800;
        }

        .plan-demo > strong {
          margin-bottom: 8px;
          font-family: Georgia, serif;
          font-size: 16px;
          font-weight: 400;
        }

        .plan-demo label {
          padding: 8px;
          border-bottom:
            1px solid #ebe8e1;
          color: #536052;
          font-size: 10px;
        }

        .memory-demo {
          text-align: left;
        }

        .memory-demo > span {
          color: #81907c;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .memory-demo > p {
          color: #3c463b;
          font-family: Georgia, serif;
          font-size: 14px;
          line-height: 1.45;
        }

        .memory-demo button {
          width: 100%;
          margin: 10px 0;
          padding: 9px;
          border:
            1px solid #e0dfd9;
          border-radius: 10px;
          background: white;
          color: #47624a;
          font-size: 9px;
        }

        .memory-demo small {
          color: #777c75;
          font-size: 8px;
          line-height: 1.5;
        }

        /* BUILD AROUND */

        .build-around {
          width:
            min(
              1400px,
              calc(100% - 40px)
            );
          margin: 0 auto;
          padding: 58px 0;
          display: grid;
          grid-template-columns:
            220px repeat(
              8,
              1fr
            ) 170px;
          align-items: center;
        }

        .build-title h2 {
          margin: 0;
          font-size: 28px;
          line-height: 1;
        }

        .life-goal {
          text-align: center;
        }

        .life-goal-icon {
          color: #55775b;
          font-family: Georgia, serif;
          font-size: 30px;
        }

        .life-goal p {
          color: #3e463d;
          font-size: 9px;
          line-height: 1.4;
        }

        .build-last {
          color: #4d7557;
          font-family: Georgia, serif;
          font-size: 15px;
          font-style: italic;
          line-height: 1.45;
        }

        /* PLAYBOOK STORY */

        .playbook-story {
          width:
            min(
              1260px,
              calc(100% - 40px)
            );
          margin: 45px auto 100px;
          padding: 70px;
          border-radius: 44px;
          display: grid;
          grid-template-columns:
            0.9fr 1.1fr;
          gap: 80px;
          background:
            linear-gradient(
              145deg,
              #f8f5ee,
              #e6eadf
            );
        }

        .playbook-text h2 {
          margin: 0;
          font-size:
            clamp(
              40px,
              4.8vw,
              65px
            );
          line-height: 1;
        }

        .playbook-text h2 em {
          color: #4d7557;
          font-style: normal;
        }

        .playbook-text > p:not(.small-label) {
          max-width: 520px;
          color: #626a61;
          font-size: 15px;
          line-height: 1.7;
        }

        .playbook-words {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 25px;
        }

        .playbook-words span {
          padding: 8px 11px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              0.7
            );
          color: #526451;
          font-size: 10px;
        }

        .playbook-demo-large {
          padding: 25px;
          border-radius: 32px;
          background:
            rgba(
              255,
              255,
              255,
              0.68
            );
          box-shadow:
            0 25px 60px
              rgba(
                45,
                58,
                43,
                0.09
              );
        }

        .demo-you,
        .demo-root {
          max-width: 80%;
          padding: 13px 15px;
          border-radius: 17px;
          font-size: 11px;
          line-height: 1.55;
        }

        .demo-you {
          margin-left: auto;
          background: #283329;
          color: white;
        }

        .demo-root {
          background: #edf0e8;
          color: #465145;
        }

        .demo-you.small,
        .demo-root.small {
          margin-top: 9px;
        }

        .saved-plan {
          margin: 20px 0;
          padding: 20px;
          border-radius: 22px;
          background: #f0efe8;
        }

        .saved-plan > span {
          color: #788875;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .saved-plan > strong {
          display: block;
          margin: 8px 0 13px;
          font-family: Georgia, serif;
          font-size: 21px;
          font-weight: 400;
        }

        .saved-plan > div {
          padding: 9px 0;
          border-top:
            1px solid #deddd5;
          display: flex;
          justify-content: space-between;
          color: #72786f;
          font-size: 9px;
        }

        .saved-plan b {
          color: #394538;
          font-weight: 600;
        }

        /* TRUST */

        .trust {
          padding: 62px
            max(
              40px,
              calc(
                (100vw - 1400px) / 2
              )
            );
          display: grid;
          grid-template-columns:
            1.2fr repeat(
              4,
              0.7fr
            );
          gap: 30px;
          background:
            linear-gradient(
              90deg,
              #17351f,
              #28452d
            );
          color: white;
        }

        .trust-title {
          padding-right: 35px;
          border-right:
            1px solid
              rgba(
                255,
                255,
                255,
                0.18
              );
        }

        .trust-title h2 {
          margin: 0;
          font-size: 34px;
          line-height: 1.05;
        }

        .trust-point {
          text-align: center;
        }

        .trust-icon {
          color: #dfe7da;
          font-family: Georgia, serif;
          font-size: 31px;
        }

        .trust-point h3 {
          margin: 10px 0 0;
          font-family: Georgia, serif;
          font-size: 21px;
          font-weight: 400;
          line-height: 1.15;
        }

        .trust-bottom {
          grid-column: 2 / -1;
          margin-top: 15px;
          padding-top: 20px;
          border-top:
            1px solid
              rgba(
                255,
                255,
                255,
                0.11
              );
          display: grid;
          grid-template-columns:
            1fr 1.2fr;
          gap: 40px;
          color:
            rgba(
              255,
              255,
              255,
              0.64
            );
          font-size: 10px;
          line-height: 1.6;
        }

        /* LIFE */

        .life-section {
          width:
            min(
              1400px,
              calc(100% - 40px)
            );
          margin: 0 auto;
          padding: 52px 0;
          display: grid;
          grid-template-columns:
            190px 1fr 40px 1fr 40px 1fr
            40px 1fr 40px 1fr;
          align-items: center;
          gap: 10px;
        }

        .life-note {
          color: #4d7456;
          font-family: Georgia, serif;
          font-size: 18px;
          font-style: italic;
          line-height: 1.5;
        }

        .life-stage {
          text-align: center;
        }

        .life-stage-icon {
          width: 42px;
          height: 42px;
          margin: 0 auto 8px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border:
            1px solid #879886;
          color: #55735a;
        }

        .life-stage strong {
          display: block;
          color: #333b33;
          font-size: 10px;
        }

        .life-stage p {
          margin: 5px 0 0;
          color: #777d76;
          font-size: 8px;
          line-height: 1.4;
        }

        .life-arrow {
          color: #a4aaa2;
          text-align: center;
        }

        /* CHANGES */

        .small-changes {
          min-height: 180px;
          display: grid;
          grid-template-columns:
            220px 1fr 25px 1fr 25px
            1fr 25px 1fr 25px 1fr
            230px;
          align-items: center;
          background: #f7f4ed;
        }

        .change-heading {
          padding-left: 55px;
        }

        .change-heading h2 {
          margin: 0;
          font-size: 21px;
          line-height: 1.05;
        }

        .change-step {
          text-align: center;
        }

        .change-step-icon {
          color: #55725a;
          font-family: Georgia, serif;
          font-size: 25px;
        }

        .change-step p {
          margin: 8px auto 0;
          max-width: 100px;
          color: #464e45;
          font-size: 9px;
          line-height: 1.4;
        }

        .change-arrow {
          color: #afb3ac;
        }

        .change-image {
          align-self: stretch;
          background:
            url("https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=80")
              center / cover no-repeat;
        }

        /* OFFER */

        .final-offer {
          min-height: 250px;
          display: grid;
          grid-template-columns:
            0.7fr 0.9fr 1fr 0.9fr;
          align-items: center;
          background:
            linear-gradient(
              90deg,
              #f7f3eb,
              #eee9df
            );
        }

        .offer-title {
          padding-left: 65px;
        }

        .offer-title h2 {
          margin: 0;
          font-size: 40px;
          line-height: 0.95;
        }

        .offer-price strong {
          font-family: Georgia, serif;
          font-size: 37px;
          font-weight: 400;
        }

        .offer-price span {
          margin-left: 5px;
          font-size: 11px;
        }

        .offer-price p {
          margin: 3px 0 9px;
          font-family: Georgia, serif;
          font-size: 17px;
        }

        .offer-price small {
          color: #747a72;
          font-size: 9px;
        }

        .offer-action button {
          width: 240px;
          padding: 14px 19px;
          border: none;
          border-radius: 999px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #26432e;
          color: white;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 14px 30px
              rgba(
                32,
                67,
                40,
                0.18
              );
        }

        .offer-action p {
          margin: 12px 0 0;
          color: #6b7169;
          font-size: 9px;
          line-height: 1.5;
        }

        .offer-image {
          align-self: stretch;
          background:
            linear-gradient(
              90deg,
              rgba(
                238,
                233,
                223,
                0.4
              ),
              rgba(
                238,
                233,
                223,
                0
              )
            ),
            url("https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=700&q=80")
              center / cover no-repeat;
        }

        /* FOOTER */

        .footer {
          width:
            min(
              1400px,
              calc(100% - 50px)
            );
          margin: 0 auto;
          padding: 25px 0 35px;
          display: flex;
          justify-content: space-between;
          color: #757b73;
          font-size: 10px;
        }

        .footer-links {
          display: flex;
          gap: 18px;
        }

        .footer a {
          color: inherit;
          text-decoration: none;
        }

        /* MOBILE */

        @media (max-width: 1000px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .hero-copy {
            padding: 70px 35px;
          }

          .hero-image {
            min-height: 470px;
          }

          .questions-section {
            grid-template-columns: 1fr;
          }

          .questions-heading {
            max-width: 260px;
          }

          .questions-note {
            border-left: none;
            padding-left: 0;
          }

          .noise-section {
            grid-template-columns: 1fr;
          }

          .noise-copy {
            order: -1;
          }

          .what-if-section {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .what-if-heading {
            grid-column: 1 / -1;
            padding-bottom: 35px;
          }

          .possibility {
            border-left: none;
            border-top:
              1px solid
                rgba(
                  54,
                  72,
                  54,
                  0.12
                );
          }

          .meet-root {
            grid-template-columns: 1fr;
          }

          .meet-image {
            min-height: 350px;
          }

          .root-action {
            grid-template-columns:
              1fr 1fr;
          }

          .build-around {
            grid-template-columns:
              repeat(
                3,
                1fr
              );
            gap: 28px;
          }

          .build-title,
          .build-last {
            grid-column: 1 / -1;
          }

          .playbook-story {
            grid-template-columns: 1fr;
          }

          .trust {
            grid-template-columns:
              1fr 1fr;
          }

          .trust-title {
            grid-column: 1 / -1;
            border-right: none;
          }

          .trust-bottom {
            grid-column: 1 / -1;
          }

          .life-section {
            grid-template-columns: 1fr;
            gap: 25px;
          }

          .life-arrow {
            transform: rotate(90deg);
          }

          .small-changes {
            padding: 55px 30px;
            grid-template-columns: 1fr;
            gap: 25px;
          }

          .change-heading {
            padding-left: 0;
          }

          .change-arrow {
            transform: rotate(90deg);
            text-align: center;
          }

          .change-image {
            min-height: 250px;
          }

          .final-offer {
            padding: 55px 35px;
            grid-template-columns: 1fr;
            gap: 30px;
          }

          .offer-title {
            padding-left: 0;
          }

          .offer-image {
            min-height: 240px;
          }
        }

        @media (max-width: 640px) {
          .topbar {
            width:
              calc(
                100% - 30px
              );
          }

          .sign-in {
            font-size: 10px;
          }

          .hero h1 {
            font-size:
              clamp(
                44px,
                13vw,
                60px
              );
          }

          .questions {
            grid-template-columns: 1fr;
            gap: 25px;
          }

          .questions p {
            font-family: Georgia, serif;
            font-size: 19px;
          }

          .noise-copy {
            padding: 55px 28px;
          }

          .what-if-section {
            grid-template-columns: 1fr;
          }

          .root-action {
            grid-template-columns: 1fr;
          }

          .playbook-story {
            width:
              calc(
                100% - 24px
              );
            padding: 45px 24px;
          }

          .trust {
            padding: 55px 24px;
            grid-template-columns: 1fr;
          }

          .trust-bottom {
            grid-template-columns: 1fr;
          }

          .build-around {
            grid-template-columns:
              1fr 1fr;
          }

          .life-goal {
            padding: 10px;
          }

          .footer {
            flex-direction: column;
            gap: 15px;
          }
        }
      `}</style>
    </main>
  );
}

function NoiseMessage({
  title,
  text,
}) {
  return (
    <div className="noise-message">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function Possibility({
  icon,
  text,
}) {
  return (
    <div className="possibility">
      <div className="possibility-icon">
        {icon}
      </div>

      <p>{text}</p>
    </div>
  );
}

function MiniExperience({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="mini-experience">
      <h3>{title}</h3>

      <p className="mini-subtitle">
        {subtitle}
      </p>

      <div className="phone-shell">
        <div className="mini-phone-top">
          Root
        </div>

        {children}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LifeGoal({
  icon,
  text,
}) {
  return (
    <div className="life-goal">
      <div className="life-goal-icon">
        {icon}
      </div>

      <p>{text}</p>
    </div>
  );
}

function TrustPoint({
  icon,
  title,
}) {
  return (
    <div className="trust-point">
      <div className="trust-icon">
        {icon}
      </div>

      <h3>{title}</h3>
    </div>
  );
}

function LifeStage({
  title,
  text,
}) {
  return (
    <div className="life-stage">
      <div className="life-stage-icon">
        ♙
      </div>

      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function LifeArrow() {
  return (
    <div className="life-arrow">
      →
    </div>
  );
}

function ChangeStep({
  icon,
  text,
}) {
  return (
    <div className="change-step">
      <div className="change-step-icon">
        {icon}
      </div>

      <p>{text}</p>
    </div>
  );
}

function ChangeArrow() {
  return (
    <div className="change-arrow">
      →
    </div>
  );
}

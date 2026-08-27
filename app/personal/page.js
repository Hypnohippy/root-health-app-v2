"use client";

import { useState } from "react";

const MONTHLY_PRICE = "£19.99";
const ANNUAL_PRICE = "£199";

const questions = [
  "Why am I tired when I've slept?",
  "Why does my stomach play up when I'm stressed?",
  "Why can I start healthy habits but never keep them going?",
  "Why am I anxious when nothing is actually wrong?",
  "Why do I feel better some weeks and worse the next?",
  "Is what I'm eating actually helping me?",
  "Why does stress seem to show up in my body?",
  "Am I really improving — or just having a good week?",
  "Why did something help last time but not this time?",
  "What should I actually be doing for my health?",
];

const whatIfs = [
  "What if something remembered what helped before?",
  "What if your sleep, stress, mood, energy and body made more sense together?",
  "What if you could actually see whether things were changing?",
  "What if you didn't have to search the internet every time you wanted an answer?",
  "What if you could talk something through and turn it into a plan?",
  "What if that plan could change when your life changed?",
  "What if you had somewhere to turn when you simply didn't know what to do next?",
  "What if the support became more useful because it got to know your journey?",
];

const possibilities = [
  "Sleep better",
  "Eat differently",
  "Get moving again",
  "Recover",
  "Feel calmer",
  "Build confidence",
  "Create a routine",
  "Understand your stress",
  "Work through something",
  "Stay well",
];

const trustPoints = [
  {
    title: "No miracle promises.",
    text:
      "Root won't tell you one trick will change everything. Health and wellbeing are rarely that simple.",
  },
  {
    title: "Ideas with a reason behind them.",
    text:
      "Where useful knowledge exists, Root starts there — then helps you explore what makes sense in your own life.",
  },
  {
    title: "Human thinking + AI intelligence.",
    text:
      "Root combines therapeutic thinking, lived experience and AI capability to help make support practical, personal and easier to use.",
  },
  {
    title: "Root does not diagnose.",
    text:
      "It can help you notice, reflect, plan and explore. It doesn't pretend to replace appropriate medical or professional care.",
  },
  {
    title: "What didn't help matters too.",
    text:
      "Your journey is not only the things that worked. Root can carry forward what you've already tried so you don't always have to start again.",
  },
  {
    title: "You remain in charge.",
    text:
      "Root offers ideas and possibilities. You decide what feels useful, what you keep and what you change.",
  },
];

export default function PersonalLandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const joinRoot = () => {
    window.location.href = "/personal/join";
  };

  const toggleFaq = (index) => {
    setOpenFaq((current) =>
      current === index ? null : index
    );
  };

  return (
    <main className="root-sales-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {/* HEADER */}
      <header className="sales-header">
        <a
          href="/personal"
          className="sales-brand"
        >
          <strong>Root</strong>
          <span>PERSONAL</span>
        </a>

        <a
          href="/login"
          className="sign-in-link"
        >
          Already a member? Sign in
        </a>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            YOUR HEALTH. YOUR LIFE. YOUR ROOT.
          </p>

          <h1>
            Looking after yourself
            <br />
            shouldn&apos;t feel
            <br />
            this complicated.
          </h1>

          <p className="hero-lead">
            Everybody has an answer.
            Eat this. Avoid that. Try this
            routine. Buy this supplement.
            Sleep more. Stress less.
          </p>

          <p className="hero-lead hero-lead-strong">
            Somehow you&apos;re still left
            trying to work out what actually
            makes sense for you.
          </p>

          <div className="hero-price">
            <strong>{MONTHLY_PRICE}</strong>
            <span>/month</span>
            <span className="dot">•</span>
            <span>Everything included</span>
          </div>

          <button
            type="button"
            onClick={joinRoot}
            className="cta cta-dark"
          >
            Start my Root
            <span>→</span>
          </button>

          <p className="small-note">
            Or {ANNUAL_PRICE} annually.
            One membership. No feature tiers.
          </p>
        </div>

        <div className="hero-stage">
          <img
            src="/visuals/root-home-hero.png"
            alt=""
            className="hero-background"
          />

          <div className="hero-shade" />

          <div className="hero-question q1">
            Why am I so tired again?
          </div>

          <div className="hero-question q2">
            What actually helped last time?
          </div>

          <div className="hero-question q3">
            Am I getting better?
          </div>

          <div className="hero-root-card">
            <span>ROOT</span>

            <strong>
              Start with what&apos;s
              happening.
            </strong>

            <p>
              You don&apos;t need to know
              which part of Root you need.
            </p>
          </div>
        </div>
      </section>

      {/* QUESTION NET */}
      <section className="question-section">
        <div className="narrow-heading">
          <p className="eyebrow">
            EVER FIND YOURSELF WONDERING...
          </p>

          <h2>
            Sometimes it isn&apos;t one
            problem.
          </h2>

          <p>
            It&apos;s lots of small things
            that don&apos;t seem connected
            until you stop and look.
          </p>
        </div>

        <div className="question-cloud">
          {questions.map((question) => (
            <div
              key={question}
              className="question-pill"
            >
              {question}
            </div>
          ))}
        </div>

        <div className="quiet-ending">
          <strong>
            If two or three of those sound
            familiar, you&apos;re probably
            not looking for another list of
            things you should be doing.
          </strong>

          <p>
            You&apos;re probably looking
            for a way to make sense of
            what&apos;s happening to you.
          </p>

          <button
            type="button"
            onClick={joinRoot}
            className="cta cta-ghost"
          >
            Start making sense of it
            <span>→</span>
          </button>
        </div>
      </section>

      {/* NOISE / PAIN */}
      <section className="noise-section">
        <div className="noise-copy">
          <p className="eyebrow light">
            TOO MUCH INFORMATION. NOT ENOUGH CLARITY.
          </p>

          <h2>
            Feeling better shouldn&apos;t
            require a research degree.
          </h2>

          <p>
            Search almost any health or
            wellbeing question and somebody
            has the answer.
          </p>

          <p>
            The problem is, the next person
            often has a completely different
            answer.
          </p>

          <p className="noise-emphasis">
            And most of those answers know
            almost nothing about you.
          </p>
        </div>

        <div className="noise-wall">
          <span>
            &quot;Never eat this...&quot;
          </span>
          <span>
            &quot;Take this every
            morning...&quot;
          </span>
          <span>
            &quot;The one routine everyone
            needs...&quot;
          </span>
          <span>
            &quot;This changes
            everything...&quot;
          </span>
          <span>
            &quot;Doctors don&apos;t want
            you to know...&quot;
          </span>
          <span>
            &quot;The miracle
            supplement...&quot;
          </span>

          <div className="noise-centre">
            <strong>
              I just want a straight
              answer.
            </strong>

            <p>
              What do we actually know?
              <br />
              And what makes sense for me?
            </p>
          </div>
        </div>
      </section>

      {/* WHAT IF */}
      <section className="what-if-section">
        <div className="what-if-heading">
          <p className="eyebrow">
            SO LET&apos;S ASK A DIFFERENT QUESTION
          </p>

          <h2>
            What if looking after yourself
            could feel a little less
            confusing?
          </h2>
        </div>

        <div className="what-if-grid">
          {whatIfs.map((item, index) => (
            <div
              key={item}
              className={
                index % 3 === 1
                  ? "what-if-card featured"
                  : "what-if-card"
              }
            >
              <span>WHAT IF</span>
              <p>{item.replace("What if ", "")}</p>
            </div>
          ))}
        </div>

        <div className="what-if-close">
          <h3>
            What if you had somewhere to
            start?
          </h3>

          <button
            type="button"
            onClick={joinRoot}
            className="cta cta-dark"
          >
            I&apos;d like that
            <span>→</span>
          </button>
        </div>
      </section>

      {/* ROOT REVEAL */}
      <section className="reveal-section">
        <div className="root-orb">
          <div className="root-orb-two">
            <div className="root-orb-centre">
              Root
            </div>
          </div>
        </div>

        <div className="reveal-copy">
          <p className="eyebrow light">
            MEET ROOT
          </p>

          <h2>
            One place for
            <br />
            more of you.
          </h2>

          <p>
            Talk when you want to talk.
            Write something down when you
            need to get it out of your
            head. Check in. Explore
            something you&apos;re feeling
            in your body or mind. Ask a
            question. Build a plan.
          </p>

          <p>
            Those moments don&apos;t have
            to disappear.
          </p>

          <strong>
            Root can remember the journey
            with you.
          </strong>

          <button
            type="button"
            onClick={joinRoot}
            className="cta cta-light"
          >
            Meet my Root
            <span>→</span>
          </button>
        </div>
      </section>

      {/* GLIMPSES */}
      <section className="glimpse-section">
        <div className="narrow-heading">
          <p className="eyebrow">
            START WITH WHAT&apos;S HAPPENING
          </p>

          <h2>
            You don&apos;t need to know
            which part of Root you need.
          </h2>

          <p>
            Start with the thing on your
            mind. Root can help you decide
            where to go next.
          </p>
        </div>

        <div className="glimpse-grid">
          <ProductGlimpse
            kicker="WHEN YOU NEED TO TALK"
            title="Can we just talk?"
            text="Use Root Coach naturally. The conversation can reflect your journey rather than beginning with a blank page every time."
            dark
          >
            <div className="chat-preview">
              <div className="chat-user">
                I&apos;ve been feeling
                completely drained lately.
              </div>

              <div className="chat-root">
                You&apos;ve mentioned low
                energy a few times recently.
                Shall we talk about what&apos;s
                been happening, or would
                something practical help more
                today?
              </div>
            </div>
          </ProductGlimpse>

          <ProductGlimpse
            kicker="WHEN YOUR HEAD IS RACING"
            title="I need something now."
            text="Root Mind gives you practical things to try — including guided exercises and recordings."
          >
            <div className="recording-preview">
              <span>MIND</span>

              <strong>
                5-4-3-2-1 Grounding
              </strong>

              <p>
                A guided reset for moments
                when everything feels a bit
                too much.
              </p>

              <div className="play-button">
                ▶
              </div>
            </div>
          </ProductGlimpse>

          <ProductGlimpse
            kicker="WHEN YOU WANT TO UNDERSTAND"
            title="Is anything actually changing?"
            text="Check-ins and Insights help turn memory into something you can see."
          >
            <div className="progress-preview">
              <div>
                <span>Stress</span>
                <strong>8 → 5</strong>
              </div>

              <div>
                <span>Sleep</span>
                <strong>7 → 6</strong>
              </div>

              <div>
                <span>Energy</span>
                <strong>8 → 6</strong>
              </div>

              <p>
                Stress has eased more than
                sleep so far.
              </p>
            </div>
          </ProductGlimpse>

          <ProductGlimpse
            kicker="WHEN SOMETHING FEELS FAMILIAR"
            title="Didn't this happen before?"
            text="Root can carry useful context forward — including what you tried and what appeared to help."
            dark
          >
            <div className="memory-preview">
              <span>
                ROOT&apos;S MEMORY
              </span>

              <p>
                Slower evenings appeared to
                help when sleep became
                difficult before.
              </p>

              <button type="button">
                Look at that again →
              </button>
            </div>
          </ProductGlimpse>
        </div>
      </section>

      {/* PLAYBOOK */}
      <section className="playbook-section">
        <div className="playbook-copy">
          <p className="eyebrow">
            DON&apos;T STRUGGLE FOR IDEAS
          </p>

          <h2>
            You know where you&apos;d like
            to be.
            <br />
            You don&apos;t always know how
            to get there.
          </h2>

          <p>
            Tell Root what you&apos;re
            trying to change, improve or
            work through.
          </p>

          <p>
            Talk it through. Build
            something practical. Save it.
            Change it when life changes.
          </p>

          <div className="possibility-cloud">
            {possibilities.map((item) => (
              <span key={item}>
                {item}
              </span>
            ))}
          </div>

          <h3>
            A plan shouldn&apos;t just fit
            the goal.
            <br />
            It has to fit the person
            living it.
          </h3>

          <button
            type="button"
            onClick={joinRoot}
            className="cta cta-dark"
          >
            Build mine with Root
            <span>→</span>
          </button>
        </div>

        <div className="playbook-window">
          <div className="window-top">
            <div>
              <span>ROOT PLAYBOOK</span>
              <strong>
                Built with you
              </strong>
            </div>

            <span className="saved-pill">
              SAVED
            </span>
          </div>

          <div className="playbook-chat">
            <div className="chat-user">
              I want to get fit again but
              I haven&apos;t exercised for
              ages and I don&apos;t want
              something I&apos;ll give up
              after a week.
            </div>

            <div className="chat-root">
              Let&apos;s build something
              gradual. Your recent
              check-ins have also shown
              low energy, so we can keep
              the first couple of weeks
              realistic.
            </div>
          </div>

          <div className="plan-card">
            <span>YOUR PLAN</span>

            <strong>
              Return to movement
            </strong>

            <div className="plan-line">
              <span>Week 1</span>
              <p>
                2 gentle sessions ·
                walking · mobility
              </p>
            </div>

            <div className="plan-line">
              <span>Week 2</span>
              <p>
                2 sessions · slightly
                longer · check recovery
              </p>
            </div>

            <div className="plan-line">
              <span>Week 3</span>
              <p>
                Review energy · adapt
                together
              </p>
            </div>
          </div>

          <div className="change-request">
            <span>YOU</span>
            Tuesdays are impossible.
            Can we change them?
          </div>

          <div className="change-answer">
            <span>ROOT</span>
            Done. Your Playbook has been
            updated.
          </div>
        </div>
      </section>

      {/* INNER VOICE / HOPE */}
      <section className="inner-voice-section">
        <p className="eyebrow light">
          MAYBE YOU&apos;RE ALREADY THINKING...
        </p>

        <div className="inner-questions">
          <p>
            Could this help me get my
            sleep back on track?
          </p>

          <p>
            Could I build something for
            my anxiety?
          </p>

          <p>
            Could it help me understand
            why I keep feeling exhausted?
          </p>

          <p>
            Could I make a routine
            I&apos;ll actually stick to?
          </p>

          <p>
            Could I just talk when I&apos;m
            having a horrible day?
          </p>

          <p>
            Could it help me see whether
            I&apos;m really making
            progress?
          </p>
        </div>

        <div className="inner-close">
          <h2>
            Start with the question that
            belongs to you.
          </h2>

          <p>
            You don&apos;t need to know
            today what you&apos;ll need
            Root for tomorrow.
          </p>

          <button
            type="button"
            onClick={joinRoot}
            className="cta cta-light"
          >
            Start with mine
            <span>→</span>
          </button>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust-section">
        <div className="trust-heading">
          <p className="eyebrow">
            HEALTH MATTERS TOO MUCH FOR HYPE
          </p>

          <h2>
            Root won&apos;t promise
            to fix you.
          </h2>

          <p>
            Because nobody responsibly
            can.
          </p>

          <div className="trust-mantra">
            <strong>
              Studies support.
            </strong>
            <strong>
              Evidence suggests.
            </strong>
            <strong>
              Experience informs.
            </strong>
            <strong>
              You decide.
            </strong>
          </div>
        </div>

        <div className="trust-grid">
          {trustPoints.map((point) => (
            <div
              key={point.title}
              className="trust-card"
            >
              <strong>{point.title}</strong>
              <p>{point.text}</p>
            </div>
          ))}
        </div>

        <div className="trust-summary">
          <h3>
            Helping you discover what
            works better for you,
            over time.
          </h3>

          <p>
            Personal enough to know your
            journey. Careful enough not
            to pretend it knows
            everything.
          </p>
        </div>
      </section>

      {/* LIFETIME */}
      <section className="life-section">
        <div className="life-copy">
          <p className="eyebrow light">
            YOUR HEALTH ISN&apos;T A 30-DAY CHALLENGE
          </p>

          <h2>
            Life will change.
            <br />
            So will what you need.
          </h2>

          <p>
            There may be times when you
            want to feel stronger.
          </p>

          <p>
            Times when sleep becomes
            difficult.
          </p>

          <p>
            Times when you want to eat
            differently, recover, deal
            with anxiety, understand
            something that keeps
            happening or simply stay
            well.
          </p>

          <strong>
            Root can travel with you
            through more than one chapter.
          </strong>
        </div>

        <div className="life-path">
          <div>
            <span>NOW</span>
            <strong>
              Start with what matters
              today.
            </strong>
          </div>

          <div>
            <span>NEXT</span>
            <strong>
              Notice what changes.
            </strong>
          </div>

          <div>
            <span>LATER</span>
            <strong>
              Remember what helped.
            </strong>
          </div>

          <div>
            <span>OVER TIME</span>
            <strong>
              Keep building from what
              you learn.
            </strong>
          </div>
        </div>
      </section>

      {/* FUTURE */}
      <section className="future-section">
        <p className="eyebrow">
          SMALL CHANGES DON&apos;T ALWAYS STAY SMALL
        </p>

        <h2>
          What could a year of
          understanding yourself
          better look like?
        </h2>

        <div className="future-lines">
          <span>
            Sleep a little better.
          </span>
          <span>
            Move a little more.
          </span>
          <span>
            Notice what knocks you
            backwards.
          </span>
          <span>
            Keep more of what moves you
            forwards.
          </span>
          <span>
            Build routines you can
            actually live with.
          </span>
          <span>
            Make better decisions more
            often.
          </span>
        </div>

        <h3>
          Your future health is being
          shaped by what you do today.
        </h3>

        <button
          type="button"
          onClick={joinRoot}
          className="cta cta-dark"
        >
          Put Root in my corner
          <span>→</span>
        </button>
      </section>

      {/* PRICE */}
      <section className="price-section">
        <div className="price-card">
          <p className="eyebrow">
            ROOT PERSONAL
          </p>

          <h2>
            One Root.
            <br />
            Everything included.
          </h2>

          <p className="price-intro">
            There isn&apos;t a Basic Root
            and a better Root waiting
            behind another subscription.
          </p>

          <div className="big-price">
            <strong>{MONTHLY_PRICE}</strong>
            <span>/month</span>
          </div>

          <p className="annual">
            or {ANNUAL_PRICE} annually
          </p>

          <div className="included">
            <span>
              ✓ Personalised Voice Coach
            </span>
            <span>
              ✓ Root memory
            </span>
            <span>
              ✓ Body & Mind
            </span>
            <span>
              ✓ Journal
            </span>
            <span>
              ✓ Check-Ins & progress
            </span>
            <span>
              ✓ Insights
            </span>
            <span>
              ✓ Playbook
            </span>
            <span>
              ✓ Practical plans & guided
              exercises
            </span>
          </div>

          <button
            type="button"
            onClick={joinRoot}
            className="cta cta-dark price-cta"
          >
            Start my Root
            <span>→</span>
          </button>

          <p className="price-note">
            One membership. No feature
            tiers.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="narrow-heading">
          <p className="eyebrow">
            BEFORE YOU JOIN
          </p>

          <h2>
            A few things worth knowing.
          </h2>
        </div>

        <div className="faq-list">
          <Faq
            index={0}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="Does Root diagnose me?"
          >
            No. Root can help you notice,
            reflect, explore and plan. It
            does not provide a medical
            diagnosis or replace
            appropriate professional care.
          </Faq>

          <Faq
            index={1}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="What does Root remember?"
          >
            Root can use information from
            across your journey to create
            continuity — including
            patterns, previous experiences
            and things you have already
            tried.
          </Faq>

          <Faq
            index={2}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="Do I really get everything?"
          >
            Yes. Root Personal has one
            membership. Coach, Check-In,
            Playbook, Journal, Body, Mind,
            Insights and the wider Root
            experience are included.
          </Faq>

          <Faq
            index={3}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="What if my organisation already provides Root?"
          >
            If your organisation already
            provides your Personal Root
            access, you do not need to buy
            a second Personal membership.
          </Faq>

          <Faq
            index={4}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="Can I pay monthly or annually?"
          >
            Yes. Root Personal is
            £19.99/month or £199/year.
            Both give you the same complete
            Root experience.
          </Faq>
        </div>
      </section>

      {/* FINAL */}
      <section className="final-section">
        <div className="final-orb">
          Root
        </div>

        <p className="eyebrow">
          WHATEVER BROUGHT YOU HERE
        </p>

        <h2>
          Start there.
        </h2>

        <p>
          You bring the life.
          <br />
          Root helps with what comes next.
        </p>

        <button
          type="button"
          onClick={joinRoot}
          className="cta cta-dark"
        >
          Start my Root
          <span>→</span>
        </button>

        <p className="final-price">
          {MONTHLY_PRICE}/month ·{" "}
          {ANNUAL_PRICE}/year ·
          Everything included
        </p>
      </section>

      <footer className="sales-footer">
        <div>
          <strong>Root</strong>
          <span> Personal</span>
        </div>

        <div>
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
          background: #f5f0e6;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        .root-sales-page {
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          background:
            linear-gradient(
              180deg,
              #f8f4ec 0%,
              #efe9de 42%,
              #f8f4ec 100%
            );
          color: #1f251e;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .ambient {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(8px);
        }

        .ambient-one {
          width: 780px;
          height: 780px;
          top: -350px;
          right: -260px;
          background:
            radial-gradient(
              circle,
              rgba(198, 219, 188, 0.58),
              rgba(198, 219, 188, 0)
                70%
            );
        }

        .ambient-two {
          width: 700px;
          height: 700px;
          top: 880px;
          left: -430px;
          background:
            radial-gradient(
              circle,
              rgba(220, 196, 166, 0.42),
              rgba(220, 196, 166, 0)
                70%
            );
        }

        .sales-header {
          position: relative;
          z-index: 20;
          width:
            min(
              1200px,
              calc(100% - 36px)
            );
          margin: 0 auto;
          padding: 26px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sales-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #20261f;
          text-decoration: none;
        }

        .sales-brand strong {
          font-size: 21px;
          letter-spacing: -0.04em;
        }

        .sales-brand span {
          font-size: 10px;
          letter-spacing: 0.16em;
          font-weight: 800;
          opacity: 0.5;
        }

        .sign-in-link {
          padding: 10px 15px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              0.48
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.8
              );
          color: #344034;
          font-size: 13px;
          font-weight: 750;
          text-decoration: none;
          backdrop-filter: blur(18px);
        }

        .hero {
          position: relative;
          z-index: 2;
          width:
            min(
              1200px,
              calc(100% - 36px)
            );
          min-height: 780px;
          margin: 0 auto;
          padding: 62px 0 115px;
          display: grid;
          grid-template-columns:
            minmax(0, 0.92fr)
            minmax(430px, 1.08fr);
          gap: 72px;
          align-items: center;
        }

        .hero-copy {
          max-width: 600px;
        }

        .eyebrow {
          display: inline-block;
          margin: 0 0 20px;
          color: #71806d;
          font-size: 10px;
          line-height: 1.3;
          font-weight: 900;
          letter-spacing: 0.17em;
        }

        .eyebrow.light {
          color: #b7c7af;
        }

        .hero h1,
        .question-section h2,
        .noise-section h2,
        .what-if-heading h2,
        .reveal-section h2,
        .playbook-section h2,
        .trust-section h2,
        .life-section h2,
        .future-section h2,
        .price-section h2,
        .faq-section h2,
        .final-section h2 {
          margin: 0;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-weight: 500;
          letter-spacing: -0.055em;
        }

        .hero h1 {
          font-size:
            clamp(
              54px,
              6.3vw,
              88px
            );
          line-height: 0.95;
        }

        .hero-lead {
          max-width: 555px;
          margin: 28px 0 0;
          color: #676a63;
          font-size: 18px;
          line-height: 1.72;
        }

        .hero-lead-strong {
          color: #343c32;
          font-weight: 700;
        }

        .hero-price {
          margin: 26px 0 22px;
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 7px;
          color: #596158;
          font-size: 14px;
        }

        .hero-price strong {
          color: #293129;
          font-size: 17px;
        }

        .dot {
          opacity: 0.3;
          padding: 0 3px;
        }

        .cta {
          border: none;
          border-radius: 999px;
          padding: 15px 21px 15px 24px;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .cta:hover {
          transform: translateY(-2px);
        }

        .cta-dark {
          background: #263027;
          color: white;
          box-shadow:
            0 16px 38px
              rgba(
                38,
                48,
                39,
                0.18
              );
        }

        .cta-light {
          background: white;
          color: #273128;
          box-shadow:
            0 18px 44px
              rgba(
                0,
                0,
                0,
                0.14
              );
        }

        .cta-ghost {
          background:
            rgba(
              255,
              255,
              255,
              0.48
            );
          color: #263027;
          border:
            1px solid
              rgba(
                88,
                107,
                82,
                0.12
              );
        }

        .small-note {
          margin: 14px 0 0;
          color: #85877f;
          font-size: 11px;
        }

        .hero-stage {
          position: relative;
          min-height: 650px;
          border-radius: 52px;
          overflow: hidden;
          box-shadow:
            0 42px 110px
              rgba(
                51,
                58,
                48,
                0.15
              );
        }

        .hero-background {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              145deg,
              rgba(
                247,
                241,
                230,
                0.10
              ),
              rgba(
                31,
                41,
                30,
                0.25
              )
            );
        }

        .hero-question {
          position: absolute;
          max-width: 250px;
          padding: 15px 18px;
          border-radius: 22px;
          background:
            rgba(
              255,
              255,
              255,
              0.76
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.9
              );
          color: #334032;
          font-size: 13px;
          font-weight: 750;
          backdrop-filter: blur(18px);
          box-shadow:
            0 20px 50px
              rgba(
                27,
                34,
                26,
                0.12
              );
        }

        .q1 {
          top: 75px;
          left: 42px;
        }

        .q2 {
          top: 195px;
          right: 28px;
        }

        .q3 {
          bottom: 170px;
          left: 36px;
        }

        .hero-root-card {
          position: absolute;
          right: 38px;
          bottom: 38px;
          width: 290px;
          padding: 25px;
          border-radius: 30px;
          background:
            rgba(
              31,
              40,
              31,
              0.86
            );
          color: white;
          backdrop-filter: blur(22px);
          box-shadow:
            0 26px 70px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .hero-root-card span {
          display: block;
          margin-bottom: 12px;
          color: #b8c9af;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .hero-root-card strong {
          display: block;
          font-family: Georgia, serif;
          font-size: 28px;
          font-weight: 500;
          line-height: 1.08;
        }

        .hero-root-card p {
          margin: 12px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              0.72
            );
          font-size: 13px;
          line-height: 1.6;
        }

        .question-section,
        .what-if-section,
        .glimpse-section,
        .trust-section,
        .future-section,
        .faq-section {
          width:
            min(
              1120px,
              calc(100% - 36px)
            );
          margin: 0 auto;
          padding: 140px 0;
        }

        .narrow-heading {
          max-width: 760px;
          margin: 0 auto 58px;
          text-align: center;
        }

        .narrow-heading h2,
        .what-if-heading h2 {
          font-size:
            clamp(
              43px,
              5vw,
              68px
            );
          line-height: 1;
        }

        .narrow-heading > p:last-child,
        .what-if-heading > p:last-child {
          max-width: 650px;
          margin: 22px auto 0;
          color: #6e716b;
          font-size: 16px;
          line-height: 1.7;
        }

        .question-cloud {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
        }

        .question-pill {
          padding: 16px 20px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              0.56
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.82
              );
          color: #384138;
          font-family: Georgia, serif;
          font-size: 17px;
          box-shadow:
            0 12px 35px
              rgba(
                50,
                57,
                47,
                0.06
              );
        }

        .quiet-ending {
          max-width: 700px;
          margin: 64px auto 0;
          text-align: center;
        }

        .quiet-ending strong {
          display: block;
          color: #30382f;
          font-family: Georgia, serif;
          font-size: 27px;
          font-weight: 500;
          line-height: 1.3;
        }

        .quiet-ending p {
          margin: 17px 0 24px;
          color: #777a73;
          font-size: 15px;
          line-height: 1.7;
        }

        .noise-section {
          width:
            min(
              1240px,
              calc(100% - 28px)
            );
          min-height: 700px;
          margin: 20px auto;
          padding: 86px;
          border-radius: 52px;
          display: grid;
          grid-template-columns:
            0.9fr 1.1fr;
          gap: 80px;
          align-items: center;
          background:
            linear-gradient(
              145deg,
              #202820,
              #344034
            );
          color: white;
          overflow: hidden;
        }

        .noise-copy {
          max-width: 500px;
        }

        .noise-section h2 {
          font-size:
            clamp(
              48px,
              5vw,
              72px
            );
          line-height: 0.98;
        }

        .noise-copy p {
          margin: 22px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              0.64
            );
          font-size: 16px;
          line-height: 1.75;
        }

        .noise-copy .noise-emphasis {
          color: white;
          font-size: 18px;
          font-weight: 700;
        }

        .noise-wall {
          position: relative;
          min-height: 500px;
          border-radius: 38px;
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.09
              );
          background:
            radial-gradient(
              circle at center,
              rgba(
                179,
                203,
                169,
                0.18
              ),
              rgba(
                255,
                255,
                255,
                0.02
              )
            );
        }

        .noise-wall > span {
          position: absolute;
          padding: 11px 14px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              0.07
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.10
              );
          color:
            rgba(
              255,
              255,
              255,
              0.56
            );
          font-size: 11px;
        }

        .noise-wall > span:nth-child(1) {
          top: 42px;
          left: 30px;
        }

        .noise-wall > span:nth-child(2) {
          top: 100px;
          right: 25px;
        }

        .noise-wall > span:nth-child(3) {
          top: 190px;
          left: 20px;
        }

        .noise-wall > span:nth-child(4) {
          bottom: 110px;
          right: 32px;
        }

        .noise-wall > span:nth-child(5) {
          bottom: 42px;
          left: 45px;
        }

        .noise-wall > span:nth-child(6) {
          top: 55px;
          right: 180px;
        }

        .noise-centre {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 260px;
          height: 260px;
          transform:
            translate(
              -50%,
              -50%
            );
          border-radius: 50%;
          display: grid;
          place-content: center;
          text-align: center;
          padding: 35px;
          background:
            rgba(
              255,
              255,
              255,
              0.08
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.15
              );
          box-shadow:
            0 0 90px
              rgba(
                178,
                206,
                169,
                0.10
              );
        }

        .noise-centre strong {
          font-family: Georgia, serif;
          font-size: 25px;
          font-weight: 500;
          line-height: 1.2;
        }

        .noise-centre p {
          margin: 12px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              0.68
            );
          font-size: 12px;
          line-height: 1.6;
        }

        .what-if-heading {
          max-width: 820px;
          margin-bottom: 55px;
        }

        .what-if-grid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 14px;
        }

        .what-if-card {
          min-height: 190px;
          padding: 23px;
          border-radius: 28px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background:
            rgba(
              255,
              255,
              255,
              0.52
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.78
              );
        }

        .what-if-card.featured {
          background:
            linear-gradient(
              145deg,
              rgba(
                204,
                220,
                195,
                0.88
              ),
              rgba(
                242,
                238,
                222,
                0.82
              )
            );
          box-shadow:
            0 20px 55px
              rgba(
                71,
                85,
                67,
                0.09
              );
        }

        .what-if-card span {
          color: #83907e;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .what-if-card p {
          margin: 0;
          color: #354034;
          font-family: Georgia, serif;
          font-size: 20px;
          line-height: 1.28;
        }

        .what-if-close {
          margin-top: 56px;
          text-align: center;
        }

        .what-if-close h3 {
          margin: 0 0 24px;
          font-family: Georgia, serif;
          font-size: 32px;
          font-weight: 500;
        }

        .reveal-section {
          width:
            min(
              1240px,
              calc(100% - 28px)
            );
          margin: 20px auto;
          padding: 100px;
          border-radius: 52px;
          display: grid;
          grid-template-columns:
            0.8fr 1.2fr;
          gap: 90px;
          align-items: center;
          background:
            linear-gradient(
              145deg,
              #243024,
              #3a4938
            );
          color: white;
        }

        .root-orb {
          width: 390px;
          height: 390px;
          max-width: 100%;
          margin: 0 auto;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle,
              rgba(
                196,
                219,
                185,
                0.22
              ),
              rgba(
                255,
                255,
                255,
                0.03
              )
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.12
              );
        }

        .root-orb-two {
          width: 270px;
          height: 270px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.16
              );
        }

        .root-orb-centre {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            rgba(
              255,
              255,
              255,
              0.10
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.20
              );
          font-family: Georgia, serif;
          font-size: 34px;
        }

        .reveal-copy {
          max-width: 620px;
        }

        .reveal-section h2 {
          font-size:
            clamp(
              52px,
              6vw,
              80px
            );
          line-height: 0.96;
        }

        .reveal-copy p {
          margin: 24px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              0.68
            );
          font-size: 17px;
          line-height: 1.75;
        }

        .reveal-copy strong {
          display: block;
          margin: 26px 0;
          color: white;
          font-family: Georgia, serif;
          font-size: 27px;
          font-weight: 500;
        }

        .glimpse-grid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 18px;
        }

        .product-glimpse {
          min-height: 590px;
          padding: 34px;
          border-radius: 38px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background:
            rgba(
              255,
              255,
              255,
              0.58
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.82
              );
          box-shadow:
            0 25px 70px
              rgba(
                60,
                66,
                56,
                0.09
              );
        }

        .product-glimpse.dark {
          background:
            linear-gradient(
              145deg,
              #253025,
              #3c493a
            );
          color: white;
        }

        .product-glimpse .kicker {
          color: #84917f;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .product-glimpse.dark .kicker {
          color: #b7c6b0;
        }

        .product-glimpse h3 {
          margin: 10px 0 0;
          font-family: Georgia, serif;
          font-size: 38px;
          font-weight: 500;
          letter-spacing: -0.04em;
        }

        .product-glimpse > div > p {
          max-width: 500px;
          margin: 16px 0 0;
          color: #6d716a;
          line-height: 1.7;
        }

        .product-glimpse.dark > div > p {
          color:
            rgba(
              255,
              255,
              255,
              0.64
            );
        }

        .glimpse-demo {
          margin-top: 30px;
        }

        .chat-preview,
        .recording-preview,
        .progress-preview,
        .memory-preview {
          padding: 22px;
          border-radius: 28px;
          background:
            rgba(
              255,
              255,
              255,
              0.50
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.72
              );
        }

        .product-glimpse.dark
          .chat-preview,
        .product-glimpse.dark
          .memory-preview {
          background:
            rgba(
              255,
              255,
              255,
              0.08
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.12
              );
        }

        .chat-preview {
          display: grid;
          gap: 12px;
        }

        .chat-user {
          justify-self: end;
          max-width: 82%;
          padding: 13px 15px;
          border-radius:
            20px 20px 5px 20px;
          background: #263027;
          color: white;
          font-size: 12px;
          line-height: 1.55;
        }

        .chat-root {
          max-width: 88%;
          padding: 13px 15px;
          border-radius:
            20px 20px 20px 5px;
          background:
            rgba(
              255,
              255,
              255,
              0.88
            );
          color: #4e584d;
          font-size: 12px;
          line-height: 1.55;
        }

        .product-glimpse.dark
          .chat-root {
          background:
            rgba(
              255,
              255,
              255,
              0.10
            );
          color:
            rgba(
              255,
              255,
              255,
              0.82
            );
        }

        .recording-preview span,
        .memory-preview span {
          color: #81907c;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .recording-preview strong {
          display: block;
          margin-top: 10px;
          font-family: Georgia, serif;
          font-size: 26px;
          font-weight: 500;
        }

        .recording-preview p {
          color: #6e746b;
          line-height: 1.6;
        }

        .play-button {
          width: 56px;
          height: 56px;
          margin-top: 18px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #263027;
          color: white;
        }

        .progress-preview {
          display: grid;
          gap: 10px;
        }

        .progress-preview > div {
          padding: 13px 15px;
          border-radius: 18px;
          display: flex;
          justify-content: space-between;
          background:
            rgba(
              255,
              255,
              255,
              0.56
            );
        }

        .progress-preview span {
          color: #717b6e;
          font-size: 12px;
        }

        .progress-preview p {
          margin: 9px 0 0;
          color: #465045;
          font-size: 13px;
          line-height: 1.6;
        }

        .memory-preview p {
          color:
            rgba(
              255,
              255,
              255,
              0.82
            );
          font-family: Georgia, serif;
          font-size: 22px;
          line-height: 1.35;
        }

        .memory-preview button {
          padding: 0;
          border: none;
          background: transparent;
          color: white;
          font-weight: 800;
        }

        .playbook-section {
          width:
            min(
              1180px,
              calc(100% - 36px)
            );
          margin: 0 auto;
          padding: 90px 0 155px;
          display: grid;
          grid-template-columns:
            0.88fr 1.12fr;
          gap: 80px;
          align-items: center;
        }

        .playbook-copy {
          max-width: 520px;
        }

        .playbook-section h2 {
          font-size:
            clamp(
              44px,
              5vw,
              68px
            );
          line-height: 1;
        }

        .playbook-copy > p {
          margin: 22px 0 0;
          color: #6b6f68;
          line-height: 1.75;
        }

        .possibility-cloud {
          margin: 28px 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .possibility-cloud span {
          padding: 9px 12px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              0.56
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.76
              );
          color: #51604e;
          font-size: 11px;
          font-weight: 750;
        }

        .playbook-copy h3 {
          margin: 30px 0 25px;
          font-family: Georgia, serif;
          font-size: 29px;
          font-weight: 500;
          line-height: 1.3;
        }

        .playbook-window {
          padding: 28px;
          border-radius: 38px;
          background:
            rgba(
              255,
              255,
              255,
              0.62
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.86
              );
          box-shadow:
            0 30px 90px
              rgba(
                58,
                66,
                55,
                0.12
              );
        }

        .window-top {
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        .window-top span {
          color: #80907b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .window-top strong {
          display: block;
          margin-top: 7px;
          font-family: Georgia, serif;
          font-size: 28px;
          font-weight: 500;
        }

        .saved-pill {
          align-self: flex-start;
          padding: 7px 10px;
          border-radius: 999px;
          background: #e2ebdc;
        }

        .playbook-chat {
          margin-top: 24px;
          padding: 18px;
          border-radius: 26px;
          display: grid;
          gap: 10px;
          background: #f0ede4;
        }

        .plan-card {
          margin-top: 17px;
          padding: 21px;
          border-radius: 25px;
          background:
            rgba(
              210,
              224,
              202,
              0.48
            );
        }

        .plan-card > span,
        .change-request span,
        .change-answer span {
          display: block;
          margin-bottom: 7px;
          color: #7e8b79;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .plan-card > strong {
          font-family: Georgia, serif;
          font-size: 24px;
          font-weight: 500;
        }

        .plan-line {
          margin-top: 12px;
          padding-top: 12px;
          border-top:
            1px solid
              rgba(
                68,
                80,
                65,
                0.10
              );
          display: grid;
          grid-template-columns:
            70px 1fr;
          gap: 10px;
          align-items: start;
        }

        .plan-line span {
          color: #7a8776;
          font-size: 10px;
          font-weight: 800;
        }

        .plan-line p {
          margin: 0;
          color: #4b5649;
          font-size: 12px;
        }

        .change-request,
        .change-answer {
          margin-top: 12px;
          padding: 14px 16px;
          border-radius: 20px;
          font-size: 12px;
          line-height: 1.55;
        }

        .change-request {
          margin-left: 70px;
          background: #293229;
          color: white;
        }

        .change-answer {
          margin-right: 70px;
          background:
            rgba(
              255,
              255,
              255,
              0.75
            );
          color: #4a5548;
        }

        .inner-voice-section {
          width:
            min(
              1240px,
              calc(100% - 28px)
            );
          margin: 10px auto;
          padding: 100px;
          border-radius: 52px;
          background:
            linear-gradient(
              145deg,
              #202820,
              #344034
            );
          color: white;
        }

        .inner-questions {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 14px;
        }

        .inner-questions p {
          margin: 0;
          padding: 23px;
          border-radius: 25px;
          background:
            rgba(
              255,
              255,
              255,
              0.07
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.10
              );
          font-family: Georgia, serif;
          font-size: 22px;
          line-height: 1.35;
          color:
            rgba(
              255,
              255,
              255,
              0.84
            );
        }

        .inner-close {
          max-width: 720px;
          margin: 70px auto 0;
          text-align: center;
        }

        .inner-close h2 {
          margin: 0;
          font-family: Georgia, serif;
          font-size:
            clamp(
              42px,
              5vw,
              68px
            );
          font-weight: 500;
          letter-spacing: -0.05em;
          line-height: 1;
        }

        .inner-close p {
          margin: 22px 0 25px;
          color:
            rgba(
              255,
              255,
              255,
              0.62
            );
          line-height: 1.7;
        }

        .trust-section h2 {
          max-width: 770px;
          font-size:
            clamp(
              48px,
              5.5vw,
              76px
            );
          line-height: 0.98;
        }

        .trust-heading > p:not(.eyebrow) {
          margin: 18px 0 0;
          color: #666d64;
          font-family: Georgia, serif;
          font-size: 25px;
        }

        .trust-mantra {
          margin-top: 40px;
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .trust-mantra strong {
          padding: 11px 14px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              0.58
            );
          color: #455143;
          font-size: 12px;
        }

        .trust-grid {
          margin-top: 60px;
          display: grid;
          grid-template-columns:
            repeat(
              3,
              1fr
            );
          gap: 14px;
        }

        .trust-card {
          min-height: 215px;
          padding: 24px;
          border-radius: 28px;
          background:
            rgba(
              255,
              255,
              255,
              0.52
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.80
              );
        }

        .trust-card strong {
          font-family: Georgia, serif;
          font-size: 21px;
          font-weight: 500;
        }

        .trust-card p {
          margin: 14px 0 0;
          color: #6d716a;
          font-size: 13px;
          line-height: 1.7;
        }

        .trust-summary {
          max-width: 760px;
          margin: 65px auto 0;
          text-align: center;
        }

        .trust-summary h3 {
          margin: 0;
          font-family: Georgia, serif;
          font-size: 35px;
          font-weight: 500;
        }

        .trust-summary p {
          color: #6f756c;
          line-height: 1.7;
        }

        .life-section {
          width:
            min(
              1240px,
              calc(100% - 28px)
            );
          margin: 20px auto;
          padding: 100px;
          border-radius: 52px;
          display: grid;
          grid-template-columns:
            0.9fr 1.1fr;
          gap: 90px;
          background:
            linear-gradient(
              145deg,
              #263126,
              #3a4838
            );
          color: white;
        }

        .life-copy {
          max-width: 530px;
        }

        .life-section h2 {
          font-size:
            clamp(
              50px,
              5.8vw,
              76px
            );
          line-height: 0.98;
        }

        .life-copy p {
          margin: 19px 0 0;
          color:
            rgba(
              255,
              255,
              255,
              0.62
            );
          line-height: 1.7;
        }

        .life-copy strong {
          display: block;
          margin-top: 26px;
          font-family: Georgia, serif;
          font-size: 25px;
          font-weight: 500;
        }

        .life-path {
          display: grid;
          gap: 12px;
        }

        .life-path > div {
          min-height: 105px;
          padding: 20px 23px;
          border-radius: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          background:
            rgba(
              255,
              255,
              255,
              0.07
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.10
              );
        }

        .life-path span {
          color: #b8c8b0;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .life-path strong {
          max-width: 340px;
          font-family: Georgia, serif;
          font-size: 21px;
          font-weight: 500;
          text-align: right;
        }

        .future-section {
          text-align: center;
        }

        .future-section h2 {
          max-width: 850px;
          margin: 0 auto;
          font-size:
            clamp(
              48px,
              6vw,
              78px
            );
          line-height: 0.98;
        }

        .future-lines {
          max-width: 850px;
          margin: 50px auto;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        }

        .future-lines span {
          padding: 13px 16px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              0.60
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.82
              );
          color: #536052;
          font-size: 13px;
        }

        .future-section h3 {
          max-width: 700px;
          margin: 0 auto 28px;
          font-family: Georgia, serif;
          font-size: 30px;
          font-weight: 500;
          line-height: 1.3;
        }

        .price-section {
          width:
            min(
              900px,
              calc(100% - 36px)
            );
          margin: 0 auto;
          padding: 30px 0 150px;
        }

        .price-card {
          padding: 75px;
          border-radius: 48px;
          text-align: center;
          background:
            linear-gradient(
              145deg,
              rgba(
                255,
                255,
                255,
                0.78
              ),
              rgba(
                216,
                230,
                207,
                0.68
              )
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.88
              );
          box-shadow:
            0 38px 100px
              rgba(
                60,
                72,
                57,
                0.13
              );
        }

        .price-section h2 {
          font-size:
            clamp(
              50px,
              6vw,
              78px
            );
          line-height: 0.97;
        }

        .price-intro {
          max-width: 580px;
          margin: 22px auto 0;
          color: #626a60;
          line-height: 1.7;
        }

        .big-price {
          margin-top: 38px;
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 8px;
        }

        .big-price strong {
          font-family: Georgia, serif;
          font-size:
            clamp(
              62px,
              7vw,
              92px
            );
          font-weight: 500;
          letter-spacing: -0.05em;
        }

        .big-price span {
          color: #70786e;
        }

        .annual {
          margin: 2px 0 0;
          color: #767e74;
          font-size: 13px;
        }

        .included {
          max-width: 640px;
          margin: 40px auto;
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 13px 24px;
          text-align: left;
        }

        .included span {
          color: #536051;
          font-size: 13px;
        }

        .price-cta {
          width:
            min(
              390px,
              100%
            );
        }

        .price-note {
          color: #7b8279;
          font-size: 11px;
        }

        .faq-list {
          max-width: 820px;
          margin: 0 auto;
          display: grid;
          gap: 10px;
        }

        .faq-item {
          border-radius: 24px;
          overflow: hidden;
          background:
            rgba(
              255,
              255,
              255,
              0.52
            );
          border:
            1px solid
              rgba(
                255,
                255,
                255,
                0.78
              );
        }

        .faq-button {
          width: 100%;
          padding: 21px 23px;
          border: none;
          background: transparent;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          color: #303a2f;
          text-align: left;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .faq-plus {
          color: #778575;
          font-size: 20px;
        }

        .faq-answer {
          padding: 0 23px 23px;
          color: #6d716a;
          font-size: 13px;
          line-height: 1.75;
        }

        .final-section {
          width:
            min(
              1000px,
              calc(100% - 36px)
            );
          margin: 0 auto 100px;
          padding: 110px 30px;
          text-align: center;
        }

        .final-orb {
          width: 150px;
          height: 150px;
          margin: 0 auto 40px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle,
              rgba(
                204,
                220,
                194,
                0.70
              ),
              rgba(
                255,
                255,
                255,
                0.14
              )
            );
          border:
            1px solid
              rgba(
                117,
                136,
                110,
                0.18
              );
          font-family: Georgia, serif;
          font-size: 27px;
        }

        .final-section h2 {
          font-size:
            clamp(
              58px,
              7vw,
              92px
            );
          line-height: 0.95;
        }

        .final-section > p:not(.eyebrow):not(.final-price) {
          margin: 22px 0 26px;
          color: #666d64;
          font-family: Georgia, serif;
          font-size: 23px;
          line-height: 1.5;
        }

        .final-price {
          margin-top: 16px;
          color: #7c8279;
          font-size: 11px;
        }

        .sales-footer {
          width:
            min(
              1120px,
              calc(100% - 36px)
            );
          margin: 0 auto;
          padding: 28px 0 42px;
          border-top:
            1px solid
              rgba(
                63,
                72,
                60,
                0.10
              );
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #676e65;
          font-size: 11px;
        }

        .sales-footer > div:last-child {
          display: flex;
          gap: 18px;
        }

        .sales-footer a {
          color: inherit;
          text-decoration: none;
        }

        @media (max-width: 1000px) {
          .hero,
          .noise-section,
          .reveal-section,
          .playbook-section,
          .life-section {
            grid-template-columns: 1fr;
          }

          .hero-stage {
            min-height: 600px;
          }

          .what-if-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .trust-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .noise-section,
          .reveal-section,
          .inner-voice-section,
          .life-section {
            padding: 65px 45px;
          }

          .root-orb {
            width: 320px;
            height: 320px;
          }
        }

        @media (max-width: 720px) {
          .sales-header {
            padding: 18px 0;
          }

          .sign-in-link {
            font-size: 11px;
          }

          .hero {
            padding-top: 40px;
            gap: 45px;
          }

          .hero h1 {
            font-size:
              clamp(
                48px,
                14vw,
                66px
              );
          }

          .hero-stage {
            min-height: 520px;
            border-radius: 36px;
          }

          .hero-question {
            max-width: 190px;
            font-size: 11px;
          }

          .q1 {
            top: 35px;
            left: 16px;
          }

          .q2 {
            top: 150px;
            right: 14px;
          }

          .q3 {
            bottom: 165px;
            left: 14px;
          }

          .hero-root-card {
            right: 16px;
            bottom: 16px;
            width:
              calc(
                100% - 32px
              );
          }

          .question-section,
          .what-if-section,
          .glimpse-section,
          .trust-section,
          .future-section,
          .faq-section {
            padding: 95px 0;
          }

          .noise-section,
          .reveal-section,
          .inner-voice-section,
          .life-section {
            padding: 55px 24px;
            border-radius: 36px;
          }

          .what-if-grid,
          .glimpse-grid,
          .trust-grid,
          .inner-questions,
          .included {
            grid-template-columns: 1fr;
          }

          .product-glimpse {
            min-height: auto;
          }

          .playbook-section {
            padding: 80px 0 110px;
          }

          .playbook-window {
            padding: 20px;
          }

          .change-request {
            margin-left: 25px;
          }

          .change-answer {
            margin-right: 25px;
          }

          .life-path > div {
            align-items: flex-start;
            flex-direction: column;
          }

          .life-path strong {
            text-align: left;
          }

          .price-card {
            padding: 52px 24px;
            border-radius: 36px;
          }

          .sales-footer {
            gap: 20px;
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}

function ProductGlimpse({
  kicker,
  title,
  text,
  children,
  dark = false,
}) {
  return (
    <article
      className={
        dark
          ? "product-glimpse dark"
          : "product-glimpse"
      }
    >
      <div>
        <span className="kicker">
          {kicker}
        </span>

        <h3>{title}</h3>

        <p>{text}</p>
      </div>

      <div className="glimpse-demo">
        {children}
      </div>
    </article>
  );
}

function Faq({
  index,
  openFaq,
  toggleFaq,
  question,
  children,
}) {
  const open = openFaq === index;

  return (
    <div className="faq-item">
      <button
        type="button"
        className="faq-button"
        onClick={() =>
          toggleFaq(index)
        }
        aria-expanded={open}
      >
        <span>{question}</span>

        <span className="faq-plus">
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className="faq-answer">
          {children}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";

const MONTHLY_PRICE = "£19.99";
const ANNUAL_PRICE = "£199";

export default function PersonalLandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const joinRoot = () => {
    // Temporary destination until we build the Personal checkout journey.
    window.location.href = "/personal/join";
  };

  const toggleFaq = (index) => {
    setOpenFaq((current) =>
      current === index ? null : index
    );
  };

  return (
    <main style={styles.page}>
      <div style={styles.ambientOne} />
      <div style={styles.ambientTwo} />

      {/* HEADER */}
      <header style={styles.header}>
        <a href="/personal" style={styles.brand}>
          <span style={styles.brandMark}>Root</span>
          <span style={styles.brandLabel}>
            PERSONAL
          </span>
        </a>

        <a href="/login" style={styles.signIn}>
          Already a member? Sign in
        </a>
      </header>

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <div style={styles.eyebrow}>
            PERSONAL WELLBEING, CONNECTED
          </div>

          <h1 style={styles.heroTitle}>
            A wellbeing app
            <br />
            that gets to know you.
          </h1>

          <p style={styles.heroText}>
            Root connects what you share across
            your body, mind, journal, check-ins
            and conversations — building a more
            useful understanding of your journey
            over time.
          </p>

          <div style={styles.heroPrice}>
            <strong>{MONTHLY_PRICE}</strong>
            <span>/month</span>
            <span style={styles.priceDot}>•</span>
            <span>Everything included</span>
          </div>

          <button
            type="button"
            onClick={joinRoot}
            style={styles.primaryButton}
          >
            Join Root
            <span aria-hidden="true">→</span>
          </button>

          <p style={styles.heroFootnote}>
            Or {ANNUAL_PRICE} annually. One
            membership. No feature tiers.
          </p>
        </div>

        {/* PRODUCT HERO */}
        <div style={styles.heroVisual}>
          <div style={styles.phoneGlow} />

          <div style={styles.phone}>
            <div style={styles.phoneTop}>
              <span>Root</span>
              <span style={styles.phoneDot} />
            </div>

            <div style={styles.fountain}>
              <div style={styles.fountainOuter}>
                <div style={styles.fountainMiddle}>
                  <div style={styles.fountainInner}>
                    <span style={styles.rootWord}>
                      Root
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.phoneGreeting}>
              <span style={styles.phoneKicker}>
                YOUR ROOT TODAY
              </span>
              <strong>
                Here&apos;s what Root is
                noticing.
              </strong>
            </div>

            <div style={styles.phoneCard}>
              <span style={styles.phoneCardLabel}>
                WHAT ROOT NOTICED
              </span>
              <p>
                Your recent check-ins suggest
                recovery may need a little more
                attention.
              </p>
            </div>

            <div style={styles.phoneCard}>
              <span style={styles.phoneCardLabel}>
                ROOT&apos;S MEMORY OF YOU
              </span>
              <p>
                Slowing things down has helped
                before when pressure has been
                building.
              </p>
            </div>

            <div style={styles.phoneCardAccent}>
              <span style={styles.phoneCardLabel}>
                WHAT MAY HELP
              </span>
              <p>
                A short reset could be worth
                trying today.
              </p>
            </div>
          </div>

          <div
            style={{
              ...styles.floatingCard,
              ...styles.floatingLeft,
            }}
          >
            <span style={styles.floatingLabel}>
              ROOT REMEMBERS
            </span>
            <strong>
              What helped last time matters.
            </strong>
          </div>

          <div
            style={{
              ...styles.floatingCard,
              ...styles.floatingRight,
            }}
          >
            <span style={styles.floatingLabel}>
              ROOT CONNECTS
            </span>
            <strong>
              More than one part of you.
            </strong>
          </div>
        </div>
      </section>

      {/* QUIET PROOF STRIP */}
      <section style={styles.proofStrip}>
        <span>Whole-app intelligence</span>
        <span style={styles.proofDot}>•</span>
        <span>Long-term memory</span>
        <span style={styles.proofDot}>•</span>
        <span>Personalised Voice AI</span>
        <span style={styles.proofDot}>•</span>
        <span>Evidence-informed ideas</span>
      </section>

      {/* THE LOOP */}
      <section style={styles.section}>
        <div style={styles.centerHeading}>
          <span style={styles.eyebrow}>
            ONE CONNECTED ROOT
          </span>

          <h2 style={styles.sectionTitle}>
            It doesn&apos;t start again
            <br />
            every morning.
          </h2>

          <p style={styles.sectionLead}>
            What happens in one part of Root can
            help inform another. Over time, Root
            builds a richer picture of your
            journey — what has been happening,
            what you&apos;ve tried, and what
            appeared to help.
          </p>
        </div>

        <div style={styles.loop}>
          <div style={styles.loopColumn}>
            <span style={styles.loopNumber}>
              01
            </span>
            <strong>You share</strong>
            <p>
              Body · Mind · Journal · Check-In ·
              Conversations
            </p>
          </div>

          <div style={styles.loopArrow}>→</div>

          <div style={styles.loopColumnFeatured}>
            <span style={styles.loopNumber}>
              02
            </span>
            <strong>Root connects</strong>
            <p>
              Patterns · Memory · Progress ·
              Previous experience
            </p>
          </div>

          <div style={styles.loopArrow}>→</div>

          <div style={styles.loopColumn}>
            <span style={styles.loopNumber}>
              03
            </span>
            <strong>Root helps</strong>
            <p>
              Insights · Ideas · Conversations ·
              Practical next steps
            </p>
          </div>
        </div>

        <div style={styles.returnLine}>
          <span>
            What happens next becomes part of
            what Root can learn from.
          </span>
        </div>
      </section>

      {/* STORY */}
      <section style={styles.storySection}>
        <div style={styles.storyCopy}>
          <span style={styles.eyebrow}>
            FROM CONVERSATION TO ACTION
          </span>

          <h2 style={styles.sectionTitleLeft}>
            Talk it through.
            <br />
            Then make it useful.
          </h2>

          <p style={styles.storyText}>
            Root&apos;s Voice Coach is
            personalised around your journey.
            Conversations can become practical,
            editable resources you keep in your
            Playbook.
          </p>

          <p style={styles.storyText}>
            Explore a routine. Build a meal
            plan. Add recipes. Create a shopping
            list. Change something that
            doesn&apos;t suit you. Keep what is
            useful and return to it later.
          </p>

          <button
            type="button"
            onClick={joinRoot}
            style={styles.textButton}
          >
            Start your Root
            <span>→</span>
          </button>
        </div>

        <div style={styles.playbookDemo}>
          <div style={styles.demoHeader}>
            <div>
              <span style={styles.demoKicker}>
                PLAYBOOK
              </span>
              <h3 style={styles.demoTitle}>
                Your 7-day meal plan
              </h3>
            </div>

            <span style={styles.savedPill}>
              Saved
            </span>
          </div>

          <div style={styles.demoConversation}>
            <div style={styles.userBubble}>
              Swap sweet potato for broccoli.
            </div>

            <div style={styles.rootBubble}>
              Absolutely. I&apos;ve updated the
              plan, recipes and shopping list.
            </div>
          </div>

          <div style={styles.demoRows}>
            <DemoRow
              day="MON"
              title="Herb chicken bowl"
              detail="Broccoli · rice · greens"
            />
            <DemoRow
              day="TUE"
              title="Ginger salmon"
              detail="Broccoli · noodles · lime"
            />
            <DemoRow
              day="WED"
              title="Roasted vegetable pasta"
              detail="Tomato · broccoli · herbs"
            />
          </div>

          <div style={styles.demoFooter}>
            <span>Recipes</span>
            <span>Shopping list</span>
            <span>Price comparison</span>
          </div>
        </div>
      </section>

      {/* CONNECTED PRODUCT */}
      <section style={styles.darkSection}>
        <div style={styles.darkInner}>
          <div style={styles.darkHeading}>
            <span style={styles.darkEyebrow}>
              NOT NINE SEPARATE APPS
            </span>

            <h2 style={styles.darkTitle}>
              Everything talks
              <br />
              to everything.
            </h2>

            <p style={styles.darkLead}>
              Root&apos;s different areas
              contribute to a developing
              whole-app picture — helping Home
              bring together what Root is
              noticing, remembering and
              suggesting.
            </p>
          </div>

          <div style={styles.orbit}>
            <div style={styles.orbitCenter}>
              <span>ROOT</span>
              <strong>
                Whole-app
                <br />
                intelligence
              </strong>
            </div>

            {[
              "Coach",
              "Check-In",
              "Playbook",
              "Journal",
              "Body",
              "Mind",
              "Insights",
              "You",
            ].map((item, index) => (
              <div
                key={item}
                style={{
                  ...styles.orbitItem,
                  ...(index === 0
                    ? styles.orbitOne
                    : index === 1
                    ? styles.orbitTwo
                    : index === 2
                    ? styles.orbitThree
                    : index === 3
                    ? styles.orbitFour
                    : index === 4
                    ? styles.orbitFive
                    : index === 5
                    ? styles.orbitSix
                    : index === 6
                    ? styles.orbitSeven
                    : styles.orbitEight),
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMORY / PROGRESS */}
      <section style={styles.section}>
        <div style={styles.split}>
          <div>
            <span style={styles.eyebrow}>
              A JOURNEY, NOT A SNAPSHOT
            </span>

            <h2 style={styles.sectionTitleLeft}>
              What helped before
              <br />
              shouldn&apos;t be forgotten.
            </h2>

            <p style={styles.storyText}>
              Root&apos;s memory is designed to
              make continuity useful. It can
              bring previous patterns,
              experiences and interventions
              forward so every conversation
              doesn&apos;t have to begin at day
              one.
            </p>
          </div>

          <div style={styles.memoryStack}>
            <MemoryCard
              label="ROOT'S MEMORY"
              text="Slower evenings appeared to help when sleep became difficult before."
            />

            <MemoryCard
              label="A PATTERN ROOT IS WATCHING"
              text="Energy and recovery have been moving together recently."
            />

            <MemoryCard
              label="AN IDEA"
              text="Would returning to the routine that helped previously be worth trying?"
            />
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section style={styles.trustSection}>
        <div style={styles.trustMark}>
          <div style={styles.trustCircle}>
            <span>Root</span>
          </div>
        </div>

        <div style={styles.trustCopy}>
          <span style={styles.eyebrow}>
            INTELLIGENCE WITH BOUNDARIES
          </span>

          <h2 style={styles.sectionTitleLeft}>
            Personal enough to know you.
            <br />
            Careful enough not to pretend.
          </h2>

          <p style={styles.storyText}>
            Root does not diagnose. It works
            from the information you choose to
            share across your journey, noticing
            patterns and offering ideas that may
            be worth exploring.
          </p>

          <strong style={styles.trustStatement}>
            Your Root is your Root.
          </strong>
        </div>
      </section>

      {/* PRICING */}
      <section style={styles.pricingSection}>
        <div style={styles.pricingCard}>
          <span style={styles.eyebrow}>
            ROOT PERSONAL
          </span>

          <h2 style={styles.pricingTitle}>
            One Root.
            <br />
            Everything included.
          </h2>

          <p style={styles.pricingLead}>
            There isn&apos;t a better version
            of Root waiting behind another
            subscription.
          </p>

          <div style={styles.priceBlock}>
            <strong>{MONTHLY_PRICE}</strong>
            <span>/ month</span>
          </div>

          <p style={styles.annualPrice}>
            or {ANNUAL_PRICE} annually
          </p>

          <div style={styles.includedGrid}>
            {[
              "Personalised Voice Coach",
              "Whole-app intelligence",
              "Long-term Root memory",
              "Body & Mind",
              "Journal",
              "Check-Ins & progress",
              "Personalised Insights",
              "Playbook & interventions",
            ].map((item) => (
              <div
                key={item}
                style={styles.includedItem}
              >
                <span style={styles.tick}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={joinRoot}
            style={styles.priceButton}
          >
            Join Root
            <span>→</span>
          </button>

          <p style={styles.priceFootnote}>
            Complete Personal Root membership.
            No feature tiers.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={styles.faqSection}>
        <div style={styles.centerHeading}>
          <span style={styles.eyebrow}>
            BEFORE YOU JOIN
          </span>

          <h2 style={styles.faqTitle}>
            A few things worth knowing.
          </h2>
        </div>

        <div style={styles.faqList}>
          <Faq
            index={0}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="Does Root diagnose me?"
          >
            No. Root is designed to notice,
            connect and reflect patterns from
            your own journey and offer ideas
            that may help. It does not provide a
            medical diagnosis.
          </Faq>

          <Faq
            index={1}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="What does Root remember?"
          >
            Root can use information from across
            your Root journey to build
            continuity — including patterns,
            previous experiences and what has or
            has not appeared useful over time.
          </Faq>

          <Faq
            index={2}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="Do I get the whole app?"
          >
            Yes. Root Personal has one
            membership. Coach, Check-In,
            Playbook, Journal, Body, Mind,
            Insights and your developing Root
            experience are included.
          </Faq>

          <Faq
            index={3}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="What if my organisation already provides Root?"
          >
            If your organisation provides your
            Personal Root access, you do not
            need to purchase a separate Personal
            membership.
          </Faq>

          <Faq
            index={4}
            openFaq={openFaq}
            toggleFaq={toggleFaq}
            question="Can I choose monthly or annual membership?"
          >
            Yes. Personal Root is £19.99 monthly
            or £199 annually. Both give you the
            same complete Root experience.
          </Faq>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={styles.finalSection}>
        <div style={styles.finalGlow} />

        <span style={styles.eyebrow}>
          YOUR ROOT STARTS HERE
        </span>

        <h2 style={styles.finalTitle}>
          You don&apos;t have to explain
          <br />
          everything from the beginning
          <br />
          every time.
        </h2>

        <p style={styles.finalText}>
          Begin building a Root that can grow
          more useful as your journey continues.
        </p>

        <button
          type="button"
          onClick={joinRoot}
          style={styles.primaryButton}
        >
          Join Root
          <span>→</span>
        </button>

        <p style={styles.finalPrice}>
          {MONTHLY_PRICE}/month ·{" "}
          {ANNUAL_PRICE}/year · Everything
          included
        </p>
      </section>

      <footer style={styles.footer}>
        <div>
          <strong>Root</strong>
          <span>Personal</span>
        </div>

        <div style={styles.footerLinks}>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/login">Sign in</a>
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
          background: #f4f0e8;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 900px) {
          .root-placeholder {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}

function DemoRow({ day, title, detail }) {
  return (
    <div style={styles.demoRow}>
      <span style={styles.demoDay}>{day}</span>

      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>

      <span style={styles.demoEdit}>Edit</span>
    </div>
  );
}

function MemoryCard({ label, text }) {
  return (
    <div style={styles.memoryCard}>
      <span style={styles.memoryLabel}>
        {label}
      </span>
      <p>{text}</p>
    </div>
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
    <div style={styles.faqItem}>
      <button
        type="button"
        onClick={() => toggleFaq(index)}
        style={styles.faqButton}
        aria-expanded={open}
      >
        <span>{question}</span>
        <span style={styles.faqPlus}>
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div style={styles.faqAnswer}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    overflow: "hidden",
    position: "relative",
    background:
      "linear-gradient(180deg, #F6F2EA 0%, #F2EDE3 42%, #F8F5EF 100%)",
    color: "#1D211C",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  ambientOne: {
    position: "absolute",
    width: "680px",
    height: "680px",
    borderRadius: "50%",
    top: "-280px",
    right: "-180px",
    background:
      "radial-gradient(circle, rgba(203,219,191,0.52), rgba(203,219,191,0) 70%)",
    pointerEvents: "none",
  },

  ambientTwo: {
    position: "absolute",
    width: "620px",
    height: "620px",
    borderRadius: "50%",
    top: "650px",
    left: "-360px",
    background:
      "radial-gradient(circle, rgba(221,205,180,0.45), rgba(221,205,180,0) 70%)",
    pointerEvents: "none",
  },

  header: {
    width: "min(1180px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "26px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    zIndex: 10,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#1D211C",
    textDecoration: "none",
  },

  brandMark: {
    fontSize: "20px",
    fontWeight: "850",
    letterSpacing: "-0.04em",
  },

  brandLabel: {
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "0.16em",
    opacity: 0.52,
  },

  signIn: {
    color: "#354035",
    fontSize: "13px",
    fontWeight: "750",
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.38)",
    border: "1px solid rgba(255,255,255,0.56)",
    backdropFilter: "blur(16px)",
  },

  hero: {
    width: "min(1180px, calc(100% - 32px))",
    minHeight: "760px",
    margin: "0 auto",
    padding: "70px 0 110px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 0.92fr) minmax(420px, 1.08fr)",
    gap: "72px",
    alignItems: "center",
    position: "relative",
    zIndex: 2,
  },

  heroCopy: {
    maxWidth: "590px",
  },

  eyebrow: {
    display: "inline-block",
    marginBottom: "18px",
    color: "#687565",
    fontSize: "11px",
    lineHeight: 1.3,
    fontWeight: "850",
    letterSpacing: "0.16em",
  },

  heroTitle: {
    margin: "0",
    maxWidth: "680px",
    fontSize: "clamp(52px, 6vw, 82px)",
    lineHeight: 0.96,
    letterSpacing: "-0.065em",
    fontWeight: "780",
  },

  heroText: {
    maxWidth: "570px",
    margin: "30px 0 22px",
    color: "#5E625B",
    fontSize: "18px",
    lineHeight: 1.7,
  },

  heroPrice: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "7px",
    marginBottom: "24px",
    color: "#535A51",
    fontSize: "14px",
  },

  priceDot: {
    opacity: 0.35,
    padding: "0 4px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "999px",
    padding: "15px 21px 15px 24px",
    display: "inline-flex",
    alignItems: "center",
    gap: "24px",
    background: "#263027",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow:
      "0 14px 32px rgba(38,48,39,0.18)",
  },

  heroFootnote: {
    margin: "15px 0 0",
    color: "#7B7D76",
    fontSize: "12px",
  },

  heroVisual: {
    minHeight: "650px",
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  phoneGlow: {
    position: "absolute",
    width: "520px",
    height: "520px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(195,211,183,0.78), rgba(195,211,183,0) 70%)",
    filter: "blur(8px)",
  },

  phone: {
    width: "330px",
    minHeight: "620px",
    padding: "16px",
    borderRadius: "44px",
    position: "relative",
    zIndex: 3,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(246,243,235,0.82))",
    border: "1px solid rgba(255,255,255,0.88)",
    boxShadow:
      "0 40px 90px rgba(56,57,48,0.18), inset 0 0 0 6px rgba(255,255,255,0.36)",
    backdropFilter: "blur(24px)",
  },

  phoneTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 9px 4px",
    fontSize: "12px",
    fontWeight: "850",
  },

  phoneDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#A8B89C",
  },

  fountain: {
    height: "165px",
    display: "grid",
    placeItems: "center",
  },

  fountainOuter: {
    width: "132px",
    height: "132px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(110,129,104,0.16)",
    background:
      "radial-gradient(circle, rgba(205,219,196,0.36), rgba(255,255,255,0.08))",
  },

  fountainMiddle: {
    width: "98px",
    height: "98px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(110,129,104,0.22)",
  },

  fountainInner: {
    width: "65px",
    height: "65px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.68)",
    boxShadow:
      "0 10px 30px rgba(82,99,78,0.12)",
  },

  rootWord: {
    fontSize: "13px",
    fontWeight: "850",
  },

  phoneGreeting: {
    display: "grid",
    gap: "4px",
    padding: "0 6px 12px",
    fontSize: "17px",
    lineHeight: 1.3,
  },

  phoneKicker: {
    color: "#82907D",
    fontSize: "8px",
    fontWeight: "850",
    letterSpacing: "0.14em",
  },

  phoneCard: {
    marginTop: "8px",
    padding: "14px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(255,255,255,0.8)",
  },

  phoneCardAccent: {
    marginTop: "8px",
    padding: "14px",
    borderRadius: "20px",
    background: "rgba(213,225,204,0.56)",
    border: "1px solid rgba(255,255,255,0.7)",
  },

  phoneCardLabel: {
    color: "#7A8776",
    fontSize: "8px",
    fontWeight: "850",
    letterSpacing: "0.12em",
  },

  floatingCard: {
    width: "205px",
    padding: "16px",
    position: "absolute",
    zIndex: 4,
    borderRadius: "22px",
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(255,255,255,0.86)",
    boxShadow:
      "0 22px 55px rgba(60,62,52,0.12)",
    backdropFilter: "blur(18px)",
    display: "grid",
    gap: "6px",
  },

  floatingLeft: {
    left: "0",
    top: "150px",
  },

  floatingRight: {
    right: "-10px",
    bottom: "125px",
  },

  floatingLabel: {
    color: "#83907E",
    fontSize: "8px",
    fontWeight: "850",
    letterSpacing: "0.13em",
  },

  proofStrip: {
    width: "min(1050px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "20px 26px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    borderTop: "1px solid rgba(70,77,66,0.10)",
    borderBottom:
      "1px solid rgba(70,77,66,0.10)",
    color: "#666D63",
    fontSize: "12px",
    fontWeight: "700",
  },

  proofDot: {
    opacity: 0.28,
  },

  section: {
    width: "min(1120px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "150px 0",
  },

  centerHeading: {
    maxWidth: "760px",
    margin: "0 auto 62px",
    textAlign: "center",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "clamp(42px, 5vw, 68px)",
    lineHeight: 1,
    letterSpacing: "-0.055em",
  },

  sectionTitleLeft: {
    margin: 0,
    fontSize: "clamp(40px, 4.8vw, 66px)",
    lineHeight: 1.02,
    letterSpacing: "-0.055em",
  },

  sectionLead: {
    maxWidth: "690px",
    margin: "24px auto 0",
    color: "#686B65",
    fontSize: "17px",
    lineHeight: 1.75,
  },

  loop: {
    display: "grid",
    gridTemplateColumns:
      "1fr auto 1fr auto 1fr",
    gap: "18px",
    alignItems: "stretch",
  },

  loopColumn: {
    minHeight: "220px",
    padding: "28px",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.42)",
    border: "1px solid rgba(255,255,255,0.62)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  loopColumnFeatured: {
    minHeight: "220px",
    padding: "28px",
    borderRadius: "30px",
    background:
      "linear-gradient(145deg, rgba(211,224,202,0.88), rgba(238,238,222,0.7))",
    border: "1px solid rgba(255,255,255,0.7)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow:
      "0 24px 60px rgba(75,89,70,0.10)",
  },

  loopNumber: {
    color: "#899384",
    fontSize: "10px",
    fontWeight: "850",
    letterSpacing: "0.14em",
  },

  loopArrow: {
    display: "grid",
    placeItems: "center",
    color: "#92998D",
    fontSize: "24px",
  },

  returnLine: {
    width: "70%",
    margin: "26px auto 0",
    paddingTop: "22px",
    textAlign: "center",
    color: "#7B8177",
    fontSize: "12px",
    borderTop:
      "1px dashed rgba(90,100,85,0.22)",
  },

  storySection: {
    width: "min(1120px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "80px 0 150px",
    display: "grid",
    gridTemplateColumns: "0.86fr 1.14fr",
    gap: "90px",
    alignItems: "center",
  },

  storyCopy: {
    maxWidth: "500px",
  },

  storyText: {
    margin: "24px 0 0",
    color: "#666B63",
    fontSize: "16px",
    lineHeight: 1.75,
  },

  textButton: {
    marginTop: "28px",
    padding: 0,
    border: "none",
    background: "transparent",
    color: "#263027",
    display: "inline-flex",
    gap: "16px",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "850",
    cursor: "pointer",
  },

  playbookDemo: {
    padding: "26px",
    borderRadius: "34px",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(255,255,255,0.82)",
    boxShadow:
      "0 30px 80px rgba(67,67,56,0.12)",
    backdropFilter: "blur(20px)",
  },

  demoHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
    marginBottom: "24px",
  },

  demoKicker: {
    color: "#81907C",
    fontSize: "9px",
    fontWeight: "850",
    letterSpacing: "0.14em",
  },

  demoTitle: {
    margin: "5px 0 0",
    fontSize: "25px",
    letterSpacing: "-0.035em",
  },

  savedPill: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#E3EBDD",
    color: "#61705D",
    fontSize: "10px",
    fontWeight: "800",
  },

  demoConversation: {
    padding: "18px",
    borderRadius: "24px",
    background: "rgba(240,237,228,0.78)",
    display: "grid",
    gap: "9px",
    marginBottom: "18px",
  },

  userBubble: {
    justifySelf: "end",
    maxWidth: "78%",
    padding: "11px 14px",
    borderRadius: "17px 17px 4px 17px",
    background: "#313A31",
    color: "#FFFFFF",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  rootBubble: {
    maxWidth: "84%",
    padding: "11px 14px",
    borderRadius: "17px 17px 17px 4px",
    background: "rgba(255,255,255,0.84)",
    color: "#4D554B",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  demoRows: {
    display: "grid",
    gap: "8px",
  },

  demoRow: {
    display: "grid",
    gridTemplateColumns: "44px 1fr auto",
    gap: "12px",
    alignItems: "center",
    padding: "13px 10px",
    borderBottom:
      "1px solid rgba(68,76,65,0.08)",
  },

  demoDay: {
    color: "#879184",
    fontSize: "9px",
    fontWeight: "850",
    letterSpacing: "0.1em",
  },

  demoEdit: {
    color: "#748071",
    fontSize: "10px",
    fontWeight: "800",
  },

  demoFooter: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "18px",
  },

  darkSection: {
    width: "100%",
    padding: "0 16px",
  },

  darkInner: {
    width: "min(1240px, 100%)",
    minHeight: "720px",
    margin: "0 auto",
    padding: "90px",
    borderRadius: "48px",
    background:
      "linear-gradient(145deg, #202820, #303B30)",
    color: "#F8F7F2",
    display: "grid",
    gridTemplateColumns: "0.8fr 1.2fr",
    gap: "70px",
    alignItems: "center",
    overflow: "hidden",
  },

  darkHeading: {
    maxWidth: "470px",
  },

  darkEyebrow: {
    display: "inline-block",
    marginBottom: "18px",
    color: "#B7C8AF",
    fontSize: "10px",
    fontWeight: "850",
    letterSpacing: "0.16em",
  },

  darkTitle: {
    margin: 0,
    fontSize: "clamp(45px, 5vw, 72px)",
    lineHeight: 0.98,
    letterSpacing: "-0.06em",
  },

  darkLead: {
    margin: "24px 0 0",
    color: "rgba(255,255,255,0.64)",
    fontSize: "16px",
    lineHeight: 1.75,
  },

  orbit: {
    width: "520px",
    height: "520px",
    maxWidth: "100%",
    margin: "0 auto",
    position: "relative",
    borderRadius: "50%",
    border:
      "1px solid rgba(220,232,214,0.12)",
  },

  orbitCenter: {
    width: "190px",
    height: "190px",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    display: "grid",
    placeContent: "center",
    textAlign: "center",
    gap: "7px",
    background:
      "radial-gradient(circle, rgba(187,211,177,0.30), rgba(255,255,255,0.06))",
    border:
      "1px solid rgba(222,236,216,0.22)",
    boxShadow:
      "0 0 80px rgba(173,202,163,0.12)",
  },

  orbitItem: {
    minWidth: "84px",
    padding: "10px 13px",
    position: "absolute",
    textAlign: "center",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.08)",
    border:
      "1px solid rgba(255,255,255,0.11)",
    color: "rgba(255,255,255,0.82)",
    fontSize: "11px",
    fontWeight: "750",
  },

  orbitOne: {
    top: "-17px",
    left: "50%",
    transform: "translateX(-50%)",
  },

  orbitTwo: {
    top: "60px",
    right: "18px",
  },

  orbitThree: {
    top: "220px",
    right: "-36px",
  },

  orbitFour: {
    bottom: "60px",
    right: "20px",
  },

  orbitFive: {
    bottom: "-17px",
    left: "50%",
    transform: "translateX(-50%)",
  },

  orbitSix: {
    bottom: "60px",
    left: "20px",
  },

  orbitSeven: {
    top: "220px",
    left: "-36px",
  },

  orbitEight: {
    top: "60px",
    left: "18px",
  },

  split: {
    display: "grid",
    gridTemplateColumns: "0.9fr 1.1fr",
    gap: "90px",
    alignItems: "center",
  },

  memoryStack: {
    display: "grid",
    gap: "14px",
  },

  memoryCard: {
    padding: "23px 24px",
    borderRadius: "26px",
    background: "rgba(255,255,255,0.48)",
    border: "1px solid rgba(255,255,255,0.72)",
    boxShadow:
      "0 18px 45px rgba(70,70,59,0.07)",
  },

  memoryLabel: {
    color: "#7F8C7A",
    fontSize: "9px",
    fontWeight: "850",
    letterSpacing: "0.13em",
  },

  trustSection: {
    width: "min(1080px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "60px 0 150px",
    display: "grid",
    gridTemplateColumns: "0.65fr 1.35fr",
    gap: "80px",
    alignItems: "center",
  },

  trustMark: {
    display: "grid",
    placeItems: "center",
  },

  trustCircle: {
    width: "230px",
    height: "230px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle, rgba(208,222,199,0.74), rgba(255,255,255,0.18))",
    border: "1px solid rgba(121,139,115,0.18)",
    boxShadow:
      "0 30px 70px rgba(76,92,71,0.10)",
    fontSize: "27px",
    fontWeight: "850",
  },

  trustCopy: {
    maxWidth: "650px",
  },

  trustStatement: {
    display: "block",
    marginTop: "25px",
    color: "#394338",
    fontSize: "18px",
  },

  pricingSection: {
    width: "min(900px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "20px 0 150px",
  },

  pricingCard: {
    padding: "70px",
    borderRadius: "46px",
    textAlign: "center",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.74), rgba(224,233,217,0.64))",
    border: "1px solid rgba(255,255,255,0.84)",
    boxShadow:
      "0 35px 90px rgba(62,72,58,0.12)",
  },

  pricingTitle: {
    margin: 0,
    fontSize: "clamp(46px, 6vw, 72px)",
    lineHeight: 0.98,
    letterSpacing: "-0.06em",
  },

  pricingLead: {
    maxWidth: "570px",
    margin: "22px auto 0",
    color: "#666D63",
    fontSize: "16px",
    lineHeight: 1.7,
  },

  priceBlock: {
    marginTop: "38px",
    display: "flex",
    justifyContent: "center",
    alignItems: "baseline",
    gap: "7px",
  },

  annualPrice: {
    margin: "5px 0 0",
    color: "#747B71",
    fontSize: "13px",
  },

  includedGrid: {
    maxWidth: "620px",
    margin: "40px auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "13px 22px",
    textAlign: "left",
  },

  includedItem: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    color: "#4D574B",
    fontSize: "13px",
  },

  tick: {
    width: "21px",
    height: "21px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    background: "rgba(129,155,119,0.16)",
    color: "#60735B",
    fontSize: "10px",
    fontWeight: "900",
  },

  priceButton: {
    width: "min(360px, 100%)",
    border: "none",
    borderRadius: "999px",
    padding: "16px 22px",
    display: "inline-flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#263027",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: "850",
    cursor: "pointer",
    boxShadow:
      "0 16px 36px rgba(38,48,39,0.18)",
  },

  priceFootnote: {
    margin: "14px 0 0",
    color: "#7A8077",
    fontSize: "11px",
  },

  faqSection: {
    width: "min(820px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "20px 0 140px",
  },

  faqTitle: {
    margin: 0,
    fontSize: "clamp(38px, 5vw, 58px)",
    lineHeight: 1,
    letterSpacing: "-0.05em",
  },

  faqList: {
    display: "grid",
    gap: "10px",
  },

  faqItem: {
    borderRadius: "22px",
    background: "rgba(255,255,255,0.44)",
    border: "1px solid rgba(255,255,255,0.66)",
    overflow: "hidden",
  },

  faqButton: {
    width: "100%",
    padding: "20px 22px",
    border: "none",
    background: "transparent",
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    color: "#2C332B",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "800",
    cursor: "pointer",
  },

  faqPlus: {
    color: "#748070",
    fontSize: "20px",
    lineHeight: 1,
  },

  faqAnswer: {
    padding: "0 22px 22px",
    color: "#676C64",
    fontSize: "13px",
    lineHeight: 1.7,
  },

  finalSection: {
    width: "min(1000px, calc(100% - 32px))",
    margin: "0 auto 100px",
    padding: "100px 30px",
    position: "relative",
    textAlign: "center",
    overflow: "hidden",
  },

  finalGlow: {
    position: "absolute",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background:
      "radial-gradient(circle, rgba(203,219,193,0.48), rgba(203,219,193,0) 70%)",
    pointerEvents: "none",
  },

  finalTitle: {
    margin: 0,
    position: "relative",
    fontSize: "clamp(44px, 6vw, 72px)",
    lineHeight: 1,
    letterSpacing: "-0.06em",
  },

  finalText: {
    maxWidth: "560px",
    margin: "24px auto 26px",
    position: "relative",
    color: "#676D64",
    fontSize: "16px",
    lineHeight: 1.7,
  },

  finalPrice: {
    position: "relative",
    color: "#7A8077",
    fontSize: "11px",
  },

  footer: {
    width: "min(1120px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "28px 0 40px",
    borderTop:
      "1px solid rgba(63,71,60,0.10)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#656B62",
    fontSize: "11px",
  },

  footerLinks: {
    display: "flex",
    gap: "18px",
  },
};

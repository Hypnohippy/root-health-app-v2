"use client";

import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

export default function ExploreApproachesPage() {
  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <article style={styles.card}>
          <div style={styles.header}>
            <RootEnso size={80} />

            <p style={styles.kicker}>
              Explore Approaches
            </p>

            <h1 style={styles.title}>
              Every Organisation Is Different
            </h1>

            <p style={styles.intro}>
              Root identifies patterns, highlights themes and
              provides organisational insight. How an organisation
              responds will depend on its people, culture and goals.
            </p>
          </div>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              Organisations often explore challenges through:
            </h2>

            <div style={styles.grid}>
              <div style={styles.item}>
                Leadership Briefings
              </div>

              <div style={styles.item}>
                Manager Development
              </div>

              <div style={styles.item}>
                Workforce Workshops
              </div>

              <div style={styles.item}>
                Coaching
              </div>

              <div style={styles.item}>
                Wellbeing Education
              </div>

              <div style={styles.item}>
                Internal Initiatives
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              How Root Can Help
            </h2>

            <p style={styles.text}>
              Root Health works with organisations to better
              understand workforce wellbeing, resilience,
              performance and recovery.
            </p>

            <p style={styles.text}>
              Sometimes the next step is a conversation.
              Sometimes it is a workshop.
              Sometimes it is simply a clearer understanding of
              what the workforce data is saying.
            </p>
          </section>

          <section style={styles.authorCard}>
            <h3 style={styles.authorName}>
              David Prince
            </h3>

            <p style={styles.authorLine}>
              PhD (c), Preventative Care
            </p>

            <p style={styles.authorLine}>
              Former Soldier
            </p>

            <p style={styles.authorLine}>
              Trauma-Informed Hypnotherapist
            </p>

            <p style={styles.authorLine}>
              Founder, Root Health
            </p>
          </section>

          <section style={styles.contactCard}>
            <h3 style={styles.sectionTitle}>
              Continue The Conversation
            </h3>

            <p style={styles.text}>
              david@fuelgeist.co.uk
            </p>

            <p style={styles.text}>
              Root Health Workforce Intelligence
            </p>
          </section>
        </article>
      </main>
    </RootAtmosphere>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    display: "flex",
    justifyContent: "center",
  },

  card: {
    width: "100%",
    maxWidth: "900px",
    padding: "48px",
    borderRadius: "42px",
    background: "rgba(255,255,255,0.42)",
    border: "1px solid rgba(255,255,255,0.62)",
    backdropFilter: "blur(24px)",
  },

  header: {
    textAlign: "center",
  },

  kicker: {
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    fontWeight: "800",
    color: "#746B5E",
  },

  title: {
    fontSize: "48px",
    lineHeight: "1.05",
    letterSpacing: "-0.04em",
    marginBottom: "20px",
  },

  intro: {
    fontSize: "20px",
    lineHeight: "1.8",
    maxWidth: "720px",
    margin: "0 auto",
  },

  section: {
    marginTop: "42px",
  },

  sectionTitle: {
    marginBottom: "16px",
  },

  text: {
    lineHeight: "1.8",
    color: "#4A433A",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "12px",
  },

  item: {
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.55)",
    border: "1px solid rgba(255,255,255,0.72)",
    fontWeight: "700",
  },

  authorCard: {
    marginTop: "42px",
    padding: "24px",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.4)",
  },

  authorName: {
    marginBottom: "10px",
  },

  authorLine: {
    margin: "6px 0",
  },

  contactCard: {
    marginTop: "24px",
    padding: "24px",
    borderRadius: "24px",
    background: "rgba(220,230,210,0.35)",
  },
};

"use client";

import { useParams } from "next/navigation";
import Nav from "../../../components/Nav";
import RootAtmosphere from "../../../components/RootAtmosphere";
import RootEnso from "../../../components/RootEnso";

const insights = {
  pressure: {
    kicker: "Recommended Insight",
    title: "Why Pressure Isn't Always the Problem",
    readTime: "5 minute read",
    intro:
      "Most organisations assume pressure is the enemy. It is an understandable conclusion, but pressure itself is not always the problem.",
    sections: [
      {
        heading: "Pressure often appears where something matters",
        body: [
          "Pressure is part of almost every worthwhile endeavour. Leaders feel pressure when making difficult decisions. Healthcare workers feel pressure when caring for others. Parents feel pressure because they care deeply.",
          "The more important question is not whether pressure exists. The more useful question is whether people have enough recovery, support and resilience to absorb it.",
        ],
      },
      {
        heading: "What Root often sees",
        body: [
          "Root often sees organisations where pressure is visible, but recovery is hidden. Employees may appear to be coping, performing and continuing to deliver, while quietly carrying the accumulated strain of sustained demand.",
          "This is why pressure scores should rarely be read alone. High pressure with healthy recovery may reflect challenge. High pressure with poor recovery may indicate risk.",
        ],
      },
      {
        heading: "Why this matters",
        body: [
          "Trying to remove all pressure from work is rarely realistic. Work will always contain deadlines, responsibility, change and uncertainty.",
          "The opportunity for leaders is often to help people recover from pressure rather than simply trying to remove it. That may include better boundaries, manager awareness, workload conversations and practical recovery habits.",
        ],
      },
    ],
    reflection:
      "If workplace pressure disappeared tomorrow, would your people feel recovered and ready to perform, or would they still be carrying the effects of sustained strain?",
    exploration: [
      "Manager conversations",
      "Leadership briefings",
      "Workshops",
      "Coaching",
    ],
  },

  recovery: {
    kicker: "Recommended Insight",
    title: "Why Recovery Is Not the Same as Rest",
    readTime: "5 minute read",
    intro:
      "Many organisations think recovery simply means taking a break. In reality, recovery is the process of restoring capacity.",
    sections: [
      {
        heading: "Rest pauses the load. Recovery restores the person.",
        body: [
          "Someone can stop working for the evening and still not recover. If their mind remains active, their sleep is poor or their body stays tense, the break may not fully restore them.",
          "Recovery is not laziness. It is part of sustainable performance.",
        ],
      },
      {
        heading: "What Root often sees",
        body: [
          "Root often sees recovery lagging behind improvements in stress. This may suggest employees are coping better with pressure, but have not yet rebuilt energy reserves.",
          "When recovery remains weak, wellbeing improvements can plateau.",
        ],
      },
      {
        heading: "Why this matters",
        body: [
          "Organisations that focus only on reducing stress may miss the deeper issue. The workforce may need help rebuilding recovery habits, sleep quality and energy management.",
        ],
      },
    ],
    reflection:
      "Where in your organisation might people be stopping work without genuinely recovering from it?",
    exploration: [
      "Recovery habits",
      "Sleep and energy education",
      "Workload rhythm review",
      "Manager awareness",
    ],
  },

  burnout: {
    kicker: "Recommended Insight",
    title: "The Burnout Myth Most Organisations Miss",
    readTime: "5 minute read",
    intro:
      "Burnout is often treated as a personal weakness. More often, it is the result of sustained demand without enough restoration.",
    sections: [
      {
        heading: "Burnout rarely arrives suddenly",
        body: [
          "It usually builds quietly. Energy drops. Patience reduces. Work that once felt meaningful starts to feel heavy.",
          "By the time burnout becomes obvious, the early warning signs have often been present for some time.",
        ],
      },
      {
        heading: "What Root often sees",
        body: [
          "Root often sees burnout improving more slowly than stress. That can happen because burnout reflects accumulated load, not just current pressure.",
          "A person may feel less stressed today and still be recovering from months of strain.",
        ],
      },
      {
        heading: "Why this matters",
        body: [
          "The opportunity is early awareness. Managers do not need to diagnose burnout, but they can learn to notice changes in energy, behaviour, engagement and recovery.",
        ],
      },
    ],
    reflection:
      "Where might burnout be developing quietly before it becomes visible in absence, conflict or performance?",
    exploration: [
      "Manager burnout awareness",
      "Recovery conversations",
      "Workload review",
      "Resilience support",
    ],

    },

    sleep: {
  kicker: "Recommended Insight",
  title: "Why Sleep Is a Performance Issue, Not a Private Issue",
  readTime: "5 minute read",

  intro:
    "Many organisations treat sleep as a personal matter. In reality, sleep may be one of the most important workforce performance factors that leaders never see.",

  sections: [
    {
      heading: "Sleep affects more than energy",
      body: [
        "Most people associate poor sleep with tiredness. The reality is that sleep influences concentration, decision making, emotional regulation and resilience.",
        "People can often continue functioning with poor sleep for surprisingly long periods, which is why the problem frequently goes unnoticed.",
      ],
    },

    {
      heading: "What Root often sees",
      body: [
        "Root often sees sleep difficulty appearing before other wellbeing indicators deteriorate significantly.",
        "Employees may continue performing, but reduced recovery capacity can make workplace pressure feel harder to manage over time.",
      ],
    },

    {
      heading: "Why this matters",
      body: [
        "Sleep is rarely solved through awareness alone. Organisations that support healthier working rhythms, realistic workloads and recovery habits often see wider wellbeing benefits.",
      ],
    },
  ],

  reflection:
    "How much of the pressure your workforce experiences may actually be amplified by fatigue rather than workload alone?",

  exploration: [
    "Sleep awareness",
    "Recovery education",
    "Workload review",
    "Energy management",
  ],
},
managers: {
  kicker: "Recommended Insight",
  title: "Why Managers Rarely Spot Burnout Early",
  readTime: "5 minute read",

  intro:
    "Most managers care deeply about their people. The challenge is that burnout rarely announces itself clearly in its early stages.",

  sections: [
    {
      heading: "Burnout hides in plain sight",
      body: [
        "Employees experiencing burnout often continue delivering, attending meetings and appearing productive.",
        "The signs tend to emerge gradually through reduced enthusiasm, lower patience, emotional exhaustion and difficulty recovering.",
      ],
    },

    {
      heading: "What Root often sees",
      body: [
        "Root frequently identifies themes around trust, relationships and communication before burnout becomes obvious.",
        "These signals may indicate employees are struggling long before performance visibly declines.",
      ],
    },

    {
      heading: "Why this matters",
      body: [
        "Managers do not need to become wellbeing specialists. However, recognising early changes in behaviour can create opportunities for supportive conversations before issues escalate.",
      ],
    },
  ],

  reflection:
    "Would your managers recognise the early signs of burnout, or only notice once performance begins to suffer?",

  exploration: [
    "Manager awareness",
    "Leadership briefings",
    "Burnout education",
    "Support conversations",
  ],
},
};

export default function RootInsightPage() {
  const params = useParams();
  const slug = params?.slug || "pressure";
  const insight = insights[slug] || insights.pressure;

  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <article style={styles.shell}>
          <div style={styles.header}>
            <RootEnso size={82} />
            <p style={styles.kicker}>{insight.kicker}</p>
            <h1 style={styles.title}>{insight.title}</h1>
            <p style={styles.readTime}>{insight.readTime}</p>
            <p style={styles.intro}>{insight.intro}</p>
          </div>

          {insight.sections.map((section) => (
            <section key={section.heading} style={styles.section}>
              <h2 style={styles.sectionTitle}>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} style={styles.bodyText}>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <section style={styles.reflectiveBox}>
            <p style={styles.kicker}>Reflective Question</p>
            <h2 style={styles.sectionTitle}>
              How might this be showing up in your organisation?
            </h2>
            <p style={styles.bodyText}>{insight.reflection}</p>
          </section>

          <section style={styles.exploreBox}>
            <p style={styles.kicker}>Further Exploration</p>
            <p style={styles.bodyText}>
              Organisations often explore this challenge through:
            </p>

            <div style={styles.exploreGrid}>
              {insight.exploration.map((item) => (
                <div key={item} style={styles.exploreItem}>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section style={styles.exploreApproachesBox}>
  <h2 style={styles.sectionTitle}>
    Explore Approaches
  </h2>

  <p style={styles.bodyText}>
    Every organisation is different. Root can help you
    explore which approaches may fit the current workforce
    patterns.
  </p>

  <button
    style={styles.exploreButton}
    onClick={() =>
      window.open("/explore-approaches", "_self")
    }
  >
    Explore Approaches →
  </button>
</section>
          <footer style={styles.authorBox}>
            <p>Written by David Prince</p>
            <span>PhD (c), Preventative Care</span>
            <span>Former Soldier</span>
            <span>Trauma-Informed Hypnotherapist</span>
          </footer>
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

  shell: {
    width: "100%",
    maxWidth: "900px",
    borderRadius: "42px",
    padding: "46px",
    background: "rgba(255,255,255,0.42)",
    border: "1px solid rgba(255,255,255,0.62)",
    backdropFilter: "blur(22px)",
    boxShadow: "0 34px 100px rgba(20,18,15,0.18)",
  },

  header: {
    textAlign: "center",
    marginBottom: "38px",
  },

  kicker: {
    margin: "12px 0",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#776C5B",
    fontWeight: "800",
  },

  title: {
    margin: "0",
    fontSize: "48px",
    lineHeight: "1.05",
    letterSpacing: "-0.045em",
    color: "#181818",
  },

  readTime: {
    margin: "18px 0 0",
    color: "#6F675B",
    fontWeight: "700",
  },

  intro: {
    maxWidth: "720px",
    margin: "24px auto 0",
    fontSize: "20px",
    lineHeight: "1.75",
    color: "#3F3A32",
  },

  section: {
    marginTop: "34px",
  },

  sectionTitle: {
    margin: "0 0 14px",
    fontSize: "28px",
    letterSpacing: "-0.03em",
    color: "#181818",
  },

  bodyText: {
    margin: "0 0 18px",
    fontSize: "17px",
    lineHeight: "1.85",
    color: "#4D463B",
  },

  reflectiveBox: {
    marginTop: "42px",
    padding: "28px",
    borderRadius: "30px",
    background: "rgba(220,230,205,0.42)",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  exploreBox: {
    marginTop: "22px",
    padding: "28px",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.44)",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  exploreGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginTop: "16px",
  },

  exploreItem: {
    padding: "16px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.55)",
    border: "1px solid rgba(255,255,255,0.72)",
    color: "#181818",
    fontWeight: "700",
  },

  authorBox: {
    marginTop: "34px",
    paddingTop: "24px",
    borderTop: "1px solid rgba(24,24,24,0.12)",
    display: "grid",
    gap: "6px",
    color: "#5A554D",
    fontSize: "14px",
  },
  exploreApproachesBox: {
  marginTop: "28px",
  padding: "28px",
  borderRadius: "28px",
  background: "rgba(255,255,255,0.42)",
  border: "1px solid rgba(255,255,255,0.72)",
},

exploreButton: {
  marginTop: "18px",
  border: "none",
  borderRadius: "14px",
  padding: "12px 18px",
  cursor: "pointer",
  fontWeight: "700",
},
};

"use client";

export default function PresentationSupportPage() {
  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "40px",
      }}
    >
      <p
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: "700",
          color: "#776C5B",
        }}
      >
        Presentation Support
      </p>

      <h1>Recovery & Resilience Workshop</h1>

      <p>
        Root has recommended this workshop because workforce data suggests
        recovery difficulty and burnout remain elevated despite improving stress
        levels.
      </p>

      <h2>Expected Outcomes</h2>

      <ul>
        <li>Improved recovery awareness</li>
        <li>Reduced burnout risk</li>
        <li>Greater workforce resilience</li>
        <li>Improved support engagement</li>
      </ul>

      <h2>Choose Support Level</h2>

      <div
        style={{
          display: "grid",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderRadius: "20px",
            border: "1px solid #DDD",
          }}
        >
          <h3>Self Delivery Pack</h3>
          <p>Included with subscription</p>

          <ul>
            <li>Employee email</li>
            <li>Manager briefing</li>
            <li>Leadership talking points</li>
          </ul>
        </div>

        <div
          style={{
            padding: "20px",
            borderRadius: "20px",
            border: "1px solid #DDD",
          }}
        >
          <h3>Bespoke Presentation Development</h3>

          <p>£395</p>

          <ul>
            <li>Custom presentation</li>
            <li>Speaker notes</li>
            <li>Handout</li>
            <li>Launch materials</li>
          </ul>

          <button>
            Generate Proposal
          </button>
        </div>

        <div
          style={{
            padding: "20px",
            borderRadius: "20px",
            border: "1px solid #DDD",
          }}
        >
          <h3>Presentation Development & Delivery</h3>

          <p>From £1,500</p>

          <ul>
            <li>Presentation creation</li>
            <li>Delivery by Root Health</li>
            <li>Q&A session</li>
            <li>Post-event recommendations</li>
          </ul>

          <button>
            Request Details
          </button>
        </div>
      </div>
    </main>
  );
}

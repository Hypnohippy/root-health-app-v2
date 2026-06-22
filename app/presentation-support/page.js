"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PresentationSupportPage() {
  const [audience, setAudience] = useState("Employees");
  const [duration, setDuration] = useState("45 minutes");
  const [delivery, setDelivery] = useState("Self-delivery pack");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [deliveryFormat, setDeliveryFormat] = useState("Online");
  const [location, setLocation] = useState("");

  async function submitRequest() {
    setSubmitting(true);
    setError("");

    const response = await fetch(
  "https://roothealthops.com/api/proposal-requests",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      initiative: "Recovery Reset Month",
      workshop_title: "Recovery & Resilience Workshop",
      audience,
      duration,
      delivery_preference: delivery,
      delivery_format: deliveryFormat,
      location,
      estimated_investment:
        delivery === "Self-delivery pack"
          ? "Included with subscription"
          : delivery === "Bespoke presentation development"
          ? "£395"
          : deliveryFormat === "Online"
          ? "From £1,500, no travel expenses"
          : "From £1,500 plus travel/accommodation expenses",
      notify_email: "david@fuelgeist.co.uk",
      notes,
      source: "root-health-v2",
    }),
  }
);

const result = await response.json();

if (!response.ok || !result?.success) {
  throw new Error(result?.error || "Something went wrong while sending the request.");
}

    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Presentation Support</p>

        <h1 style={styles.title}>Recovery & Resilience Workshop</h1>

        <p style={styles.text}>
          Root has recommended this workshop because workforce data suggests
          recovery difficulty and burnout remain elevated despite improving
          stress levels.
        </p>

        <h2 style={styles.heading}>Expected Outcomes</h2>

        <ul style={styles.list}>
          <li>Improved recovery awareness</li>
          <li>Reduced burnout risk</li>
          <li>Greater workforce resilience</li>
          <li>Improved support engagement</li>
        </ul>

        <h2 style={styles.heading}>Request Workshop Proposal</h2>

        <p style={styles.text}>
          Submit the details below and Root will prepare a considered workshop
          proposal for review.
        </p>

        <label style={styles.label}>Audience</label>
        <select
          style={styles.input}
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
        >
          <option>Employees</option>
          <option>Managers</option>
          <option>Leadership Team</option>
          <option>Employees and Managers</option>
        </select>

        <label style={styles.label}>Preferred duration</label>
        <select
          style={styles.input}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          <option>30 minutes</option>
          <option>45 minutes</option>
          <option>60 minutes</option>
          <option>To be agreed</option>
        </select>

        <label style={styles.label}>Support option</label>
        <select
          style={styles.input}
          value={delivery}
          onChange={(e) => setDelivery(e.target.value)}
        >
          <option>Self-delivery pack</option>
          <option>Bespoke presentation development</option>
          <option>Presentation development and delivery</option>
        </select>
            <label style={styles.label}>Delivery format</label>

<select
  style={styles.input}
  value={deliveryFormat}
  onChange={(e) => setDeliveryFormat(e.target.value)}
>
  <option>Online</option>
  <option>In person</option>
</select>

<label style={styles.label}>Location (if in person)</label>

<input
  style={styles.input}
  value={location}
  onChange={(e) => setLocation(e.target.value)}
  placeholder="Town, city or venue"
/>
        <label style={styles.label}>Additional notes</label>
        <textarea
          style={{ ...styles.input, minHeight: "110px" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add anything useful about the audience, timing, tone, or internal priorities."
        />

        {error ? <p style={styles.error}>{error}</p> : null}

        {submitted ? (
          <div style={styles.success}>
            Proposal request submitted. Root will review the workforce pattern and prepare a tailored workshop proposal.
          </div>
        ) : (
          <button
            style={styles.button}
            onClick={submitRequest}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Proposal Request"}
          </button>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px",
    background: "#EFE9DE",
  },

  card: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "34px",
    borderRadius: "34px",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 24px 80px rgba(20,18,15,0.12)",
  },

  kicker: {
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontWeight: "800",
    color: "#776C5B",
    fontSize: "12px",
  },

  title: {
    margin: "0 0 14px",
    fontSize: "42px",
    color: "#181818",
    letterSpacing: "-0.04em",
  },

  heading: {
    marginTop: "28px",
    color: "#181818",
  },

  text: {
    color: "#4D463B",
    lineHeight: "1.8",
    fontSize: "16px",
  },

  list: {
    color: "#4D463B",
    lineHeight: "1.9",
  },

  label: {
    display: "block",
    marginTop: "18px",
    marginBottom: "8px",
    fontWeight: "800",
    color: "#181818",
  },

  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "16px",
    border: "1px solid rgba(24,24,24,0.16)",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  button: {
    marginTop: "24px",
    border: "none",
    borderRadius: "999px",
    padding: "14px 22px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
  },

  success: {
    marginTop: "24px",
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(220,230,205,0.65)",
    color: "#181818",
    fontWeight: "800",
  },

  error: {
    marginTop: "16px",
    color: "#9F1D1D",
    fontWeight: "800",
  },
};

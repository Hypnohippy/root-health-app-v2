"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import GlassBody from "../../components/GlassBody";
import Nav from "../../components/Nav";

export default function BodyPage() {
  const [selectedSystem, setSelectedSystem] = useState(null);

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.brandMark}>◯</div>

          <h1 style={styles.title}>Body Signals</h1>
          <p style={styles.subtitle}>
            Tap each place your body is asking for attention.
          </p>

          <GlassBody
            selectedSystems={[]}
            onSelect={(id) => setSelectedSystem(id)}
            onClear={() => setSelectedSystem(null)}
          />

          {selectedSystem && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>Selected</p>
              <p style={styles.response}>{selectedSystem}</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #F7F5F2 0%, #E6E2DA 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  shell: {
    width: "100%",
    maxWidth: "820px",
    background: "rgba(255,255,255,0.82)",
    borderRadius: "28px",
    padding: "34px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  brandMark: {
    fontSize: "38px",
    color: "#1A1A1A",
    marginBottom: "6px",
  },
  title: {
    fontSize: "34px",
    margin: "0 0 8px",
    color: "#1A1A1A",
  },
  subtitle: {
    color: "#555",
    fontSize: "17px",
    marginBottom: "28px",
  },
  panel: {
    marginTop: "18px",
    background: "#FFFFFF",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 12px 28px rgba(0,0,0,0.06)",
  },
  panelTitle: {
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 10px",
  },
  response: {
    color: "#333",
    lineHeight: "1.6",
    fontSize: "15px",
  },
};

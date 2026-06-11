"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";

const categories = [
  "Nutrition",
  "Stress & Anxiety",
  "Sleep",
  "Movement",
  "Recovery",
  "General",
];

export default function PlaybookPage() {
  const [entries, setEntries] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [openEntryId, setOpenEntryId] = useState(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("playbook_entries")
      .select("*")
      .eq("profile_key", "main")
      .order("created_at", { ascending: false });

    if (!error) {
      setEntries(Array.isArray(data) ? data : []);
    }

    setLoading(false);
  };

  const filteredEntries = useMemo(() => {
    if (selectedCategory === "All") return entries;
    return entries.filter((entry) => entry.category === selectedCategory);
  }, [entries, selectedCategory]);

  const saveEntry = async () => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent || saving) return;

    setSaving(true);

    const { error } = await supabase.from("playbook_entries").insert([
      {
        profile_key: "main",
        title: cleanTitle,
        category,
        content: cleanContent,
        source: "Manual",
      },
    ]);

    if (!error) {
      setTitle("");
      setCategory("General");
      setContent("");
      await loadEntries();
    } else {
      console.error("PLAYBOOK SAVE ERROR:", error);
      alert(error.message || "Something went wrong saving this playbook entry.");
    }

    setSaving(false);
  };

  const deleteEntry = async (entry) => {
    if (!entry?.id || deletingId) return;

    const confirmed = window.confirm(
      `Delete "${entry.title}" from your playbook? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(entry.id);

    const { error } = await supabase
      .from("playbook_entries")
      .delete()
      .eq("id", entry.id)
      .eq("profile_key", "main");

    if (!error) {
      setEntries((current) => current.filter((item) => item.id !== entry.id));

      if (openEntryId === entry.id) {
        setOpenEntryId(null);
      }
    } else {
      console.error("PLAYBOOK DELETE ERROR:", error);
      alert(error.message || "Something went wrong deleting this playbook entry.");
    }

    setDeletingId(null);
  };

  const getPreview = (text) => {
    if (!text) return "";
    const clean = text.trim();
    if (clean.length <= 180) return clean;
    return `${clean.slice(0, 180)}...`;
  };

  const countLines = (text) => {
    if (!text) return 0;
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
  };

  return (
    <main style={styles.page}>
      <Nav />

      <section style={styles.shell}>
        <div style={styles.header}>
          <RootEnso size={84} />

          <p style={styles.kicker}>Root Health</p>

          <h1 style={styles.title}>My Recovery Playbook</h1>

          <p style={styles.subtitle}>
            A personal place for the plans, strategies, foods, routines and
            recovery ideas Root helps you collect over time.
          </p>
        </div>

        <section style={styles.introCard}>
          <p style={styles.introLabel}>Root remembers what may help</p>

          <p style={styles.introText}>
            Your journal records how life feels. Your playbook keeps the things
            that may help — meal plans, calming routines, movement ideas,
            recovery strategies and notes worth coming back to.
          </p>
        </section>

        <section style={styles.formCard}>
          <p style={styles.formLabel}>Add to your playbook</p>

          <input
            style={styles.input}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title, for example: 7 Day IBS Meal Plan"
          />

          <select
            style={styles.input}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <textarea
            style={styles.textarea}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write or paste the plan, list, routine or strategy here..."
          />

          <button
            style={{
              ...styles.saveButton,
              opacity: saving ? 0.7 : 1,
            }}
            onClick={saveEntry}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save to Playbook"}
          </button>
        </section>

        <div style={styles.filterRow}>
          {["All", ...categories].map((item) => (
            <button
              key={item}
              style={{
                ...styles.filterButton,
                ...(selectedCategory === item
                  ? styles.filterButtonActive
                  : {}),
              }}
              onClick={() => setSelectedCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={styles.emptyText}>Loading your playbook...</p>
        ) : filteredEntries.length === 0 ? (
          <section style={styles.emptyCard}>
            <h2 style={styles.emptyTitle}>Your playbook is ready to begin.</h2>

            <p style={styles.emptyText}>
              When Root creates a useful plan, list or recovery idea, this is
              where it can be kept safe for later.
            </p>
          </section>
        ) : (
          <section style={styles.entryGrid}>
            {filteredEntries.map((entry) => {
              const isOpen = openEntryId === entry.id;
              const lineCount = countLines(entry.content);

              return (
                <article key={entry.id} style={styles.entryCard}>
                  <div style={styles.entryTop}>
                    <p style={styles.entryCategory}>{entry.category}</p>
                    <p style={styles.entrySource}>{entry.source || "Root"}</p>
                  </div>

                  <h2 style={styles.entryTitle}>{entry.title}</h2>

                  <div style={styles.metaRow}>
                    <span style={styles.metaPill}>
                      {lineCount > 0 ? `${lineCount} notes/items` : "Saved plan"}
                    </span>

                    <span style={styles.metaPill}>
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleDateString("en-GB")
                        : "No date"}
                    </span>
                  </div>

                  <p style={styles.entryContent}>
                    {isOpen ? entry.content : getPreview(entry.content)}
                  </p>

                  <div style={styles.actionRow}>
                    <button
                      style={styles.viewButton}
                      onClick={() =>
                        setOpenEntryId(isOpen ? null : entry.id)
                      }
                    >
                      {isOpen ? "Hide full plan" : "View full plan"}
                    </button>

                    <button
                      style={{
                        ...styles.deleteButton,
                        opacity: deletingId === entry.id ? 0.65 : 1,
                      }}
                      onClick={() => deleteEntry(entry)}
                      disabled={deletingId === entry.id}
                    >
                      {deletingId === entry.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #F4EBDD 0%, #E8DDCB 45%, #D8C7AA 100%)",
    padding: "110px 20px 50px",
    fontFamily: "Inter, sans-serif",
  },

  shell: {
    maxWidth: "1080px",
    margin: "0 auto",
  },

  header: {
    textAlign: "center",
    marginBottom: "28px",
  },

  kicker: {
    margin: "14px 0 8px",
    fontSize: "12px",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontWeight: "800",
    color: "#6D6254",
  },

  title: {
    margin: "0 0 14px",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(42px, 7vw, 76px)",
    lineHeight: "0.95",
    fontWeight: "500",
    color: "#1F241E",
    letterSpacing: "-0.05em",
  },

  subtitle: {
    maxWidth: "760px",
    margin: "0 auto",
    fontSize: "18px",
    lineHeight: "1.8",
    color: "#4B443A",
  },

  introCard: {
    marginBottom: "24px",
    padding: "28px",
    borderRadius: "32px",
    background: "rgba(255,255,255,0.34)",
    border: "1px solid rgba(255,255,255,0.42)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
  },

  introLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#364131",
    fontWeight: "800",
  },

  introText: {
    margin: 0,
    fontSize: "19px",
    lineHeight: "1.85",
    color: "#243224",
  },

  formCard: {
    marginBottom: "24px",
    padding: "26px",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.38)",
    border: "1px solid rgba(255,255,255,0.48)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
    display: "grid",
    gap: "14px",
  },

  formLabel: {
    margin: "0 0 4px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#364131",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(36,50,36,0.16)",
    borderRadius: "20px",
    padding: "15px 16px",
    background: "rgba(255,255,255,0.72)",
    color: "#1F241E",
    fontSize: "15px",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "180px",
    border: "1px solid rgba(36,50,36,0.16)",
    borderRadius: "22px",
    padding: "16px",
    background: "rgba(255,255,255,0.72)",
    color: "#1F241E",
    fontSize: "15px",
    lineHeight: "1.7",
    resize: "vertical",
    outline: "none",
  },

  saveButton: {
    border: "none",
    borderRadius: "999px",
    padding: "15px 22px",
    background: "#243224",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: "15px",
    cursor: "pointer",
    justifySelf: "start",
  },

  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "24px",
  },

  filterButton: {
    border: "1px solid rgba(36,50,36,0.14)",
    borderRadius: "999px",
    padding: "11px 15px",
    background: "rgba(255,255,255,0.52)",
    color: "#2B3328",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
  },

  filterButtonActive: {
    background: "#243224",
    color: "#FFFFFF",
  },

  emptyCard: {
    padding: "32px",
    borderRadius: "32px",
    background: "rgba(255,255,255,0.32)",
    border: "1px solid rgba(255,255,255,0.42)",
    backdropFilter: "blur(16px)",
    textAlign: "center",
  },

  emptyTitle: {
    margin: "0 0 12px",
    fontFamily: "Georgia, serif",
    fontSize: "34px",
    fontWeight: "500",
    color: "#1F241E",
  },

  emptyText: {
    margin: 0,
    fontSize: "17px",
    lineHeight: "1.8",
    color: "#4B443A",
  },

  entryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },

  entryCard: {
    padding: "24px",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.42)",
    border: "1px solid rgba(255,255,255,0.52)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
  },

  entryTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
  },

  entryCategory: {
    margin: 0,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#364131",
    fontWeight: "800",
  },

  entrySource: {
    margin: 0,
    fontSize: "12px",
    color: "#6D6254",
    fontWeight: "700",
  },

  entryTitle: {
    margin: "0 0 14px",
    fontFamily: "Georgia, serif",
    fontSize: "28px",
    lineHeight: "1.15",
    fontWeight: "500",
    color: "#1F241E",
  },

  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "14px",
  },

  metaPill: {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "7px 10px",
    background: "rgba(36,50,36,0.08)",
    color: "#364131",
    fontSize: "12px",
    fontWeight: "800",
  },

  entryContent: {
    margin: 0,
    whiteSpace: "pre-line",
    fontSize: "15px",
    lineHeight: "1.8",
    color: "#3E372F",
  },

  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "18px",
  },

  viewButton: {
    border: "none",
    borderRadius: "999px",
    padding: "11px 15px",
    background: "#243224",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
  },

  deleteButton: {
    border: "1px solid rgba(120,40,30,0.25)",
    borderRadius: "999px",
    padding: "11px 15px",
    background: "rgba(255,255,255,0.58)",
    color: "#8B2E22",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
  },
};

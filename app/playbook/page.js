"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";
import { getCurrentProfileKey } from "../../lib/currentUser";

const categories = [
  "Nutrition",
  "Gut Health",
  "Stress & Anxiety",
  "Sleep",
  "Movement",
  "Recovery",
  "Mind & Mood",
  "Routines",
  "General",
];

export default function PlaybookPage() {
  const [entries, setEntries] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [reviewEntry, setReviewEntry] = useState(null);
  const [reviewInstruction, setReviewInstruction] = useState("");
  const [reviewPreview, setReviewPreview] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [openEntryId, setOpenEntryId] = useState(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const profileKey = getCurrentProfileKey();

if (!profileKey) {
  setEntries([]);
  setLoading(false);
  return;
}
    setLoading(true);

    const { data, error } = await supabase
      .from("playbook_entries")
      .select("*")
      .eq("profile_key", profileKey)
      .order("created_at", { ascending: false });

    if (!error) {
      setEntries(Array.isArray(data) ? data : []);
    }

    setLoading(false);
  };

  const filteredEntries = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    let nextEntries =
      selectedCategory === "All"
        ? entries
        : entries.filter((entry) => entry.category === selectedCategory);

    if (selectedCategory === "All" && cleanSearch) {
      nextEntries = nextEntries.filter((entry) => {
        const searchableText = [
          entry.title,
          entry.category,
          entry.content,
          entry.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(cleanSearch);
      });
    }

    return nextEntries;
  }, [entries, selectedCategory, searchTerm]);

  const startReviewVoiceInput = () => {
  if (typeof window === "undefined") return;

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice input is not supported in this browser yet.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-GB";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const transcript =
      event.results?.[0]?.[0]?.transcript || "";

    if (!transcript.trim()) return;

    setReviewInstruction((current) => {
      if (!current.trim()) return transcript.trim();

      return `${current.trim()}\n\n${transcript.trim()}`;
    });
  };

  recognition.start();
};
  const saveEntry = async () => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent || saving) return;

    setSaving(true);

    const { error } = await supabase.from("playbook_entries").insert([
      {
       profile_key: getCurrentProfileKey(),
      
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
      setSearchTerm("");
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
      .eq("profile_key", getCurrentProfileKey());

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

  const getPreview = (text, length = 180) => {
    if (!text) return "";
    const clean = text.trim();
    if (clean.length <= length) return clean;
    return `${clean.slice(0, length)}...`;
  };

  const countLines = (text) => {
    if (!text) return 0;
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
  };

  const formatDate = (date) => {
    if (!date) return "No date";
    return new Date(date).toLocaleDateString("en-GB");
  };

  return (
  <RootAtmosphere type="reflection">
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
              onClick={() => {
                setSelectedCategory(item);
                setOpenEntryId(null);
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {selectedCategory === "All" && (
          <section style={styles.searchCard}>
            <input
              style={styles.searchInput}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search your playbook, for example: IBS, sleep, breathing, bloating..."
            />

            {searchTerm.trim() && (
              <button
                style={styles.clearSearchButton}
                onClick={() => setSearchTerm("")}
              >
                Clear
              </button>
            )}
          </section>
        )}

        {loading ? (
          <p style={styles.emptyText}>Loading your playbook...</p>
        ) : filteredEntries.length === 0 ? (
          <section style={styles.emptyCard}>
            <h2 style={styles.emptyTitle}>Nothing found yet.</h2>

            <p style={styles.emptyText}>
              Try another search, choose a different category, or save a new
              plan to your playbook.
            </p>
          </section>
        ) : selectedCategory === "All" ? (
          <section style={styles.listCard}>
            <div className="playbook-list-header" style={styles.listHeader}>
              <span>Title</span>
              <span>Category</span>
              <span>Size</span>
              <span>Date</span>
              <span>Actions</span>
            </div>

            {filteredEntries.map((entry) => {
              const isOpen = openEntryId === entry.id;
              const lineCount = countLines(entry.content);

              return (
                <div key={entry.id} className="playbook-list-item" style={styles.listItem}>
                  <div style={styles.listMain}>
                    <strong style={styles.listTitle}>{entry.title}</strong>

                    {isOpen ? (
                      <p style={styles.listExpanded}>{entry.content}</p>
                    ) : (
                      <p style={styles.listPreview}>
                        {getPreview(entry.content, 90)}
                      </p>
                    )}
                  </div>

                  <span style={styles.listCategory}>{entry.category}</span>

                  <span style={styles.listMeta}>
                    {lineCount > 0 ? `${lineCount} items` : "Saved"}
                  </span>

                  <span style={styles.listMeta}>{formatDate(entry.created_at)}</span>

                  <div className="playbook-list-actions" style={styles.listActions}>
                    <button
                      style={styles.smallViewButton}
                      onClick={() => setOpenEntryId(isOpen ? null : entry.id)}
                    >
                      {isOpen ? "Hide" : "View"}
                    </button>

                    <button
                 style={styles.smallViewButton}
                  onClick={() => {
               setOpenEntryId(entry.id);
               setReviewEntry(entry);
               }}
>
                 Review with Root Voice
            </button>

                    <button
                      style={{
                        ...styles.smallDeleteButton,
                        opacity: deletingId === entry.id ? 0.65 : 1,
                      }}
                      onClick={() => deleteEntry(entry)}
                      disabled={deletingId === entry.id}
                    >
                      {deletingId === entry.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
           {reviewEntry && (
  <section style={styles.formCard}>
    <p style={styles.formLabel}>Continue with Root</p>

    <h2 style={styles.entryTitle}>{reviewEntry.title}</h2>

    <button
  style={styles.saveButton}
  onClick={startReviewVoiceInput}
>
  🎤 Speak your update
</button>

    <textarea
      style={styles.textarea}
      value={reviewInstruction}
      onChange={(e) => setReviewInstruction(e.target.value)}
      placeholder="Talk naturally. For example: 'Replace salmon with cod', 'Keep this under £25', 'Add recipes', 'Make it suitable for Type 1 diabetes', or 'Create a shopping list'."
    />

    <button
      style={styles.saveButton}
      disabled={reviewing}
      onClick={async () => {
        if (!reviewInstruction.trim()) return;

        setReviewing(true);

        const res = await fetch("/api/playbook-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: reviewEntry.title,
            category: reviewEntry.category,
            currentContent: reviewEntry.content,
            instruction: reviewInstruction,
          }),
        });

        const json = await res.json();

        if (json.ok) {
          setReviewPreview(json.updatedContent);
        } else {
          alert(json.error || "Root could not review this entry.");
        }

        setReviewing(false);
      }}
    >
      {reviewing ? "Root is thinking..." : "Continue with Root"}
    </button>

    {reviewPreview && (
      <>
        <p style={styles.formLabel}>Updated preview</p>

        <textarea
          style={styles.textarea}
          value={reviewPreview}
          onChange={(e) => setReviewPreview(e.target.value)}
        />

        <button
          style={styles.saveButton}
          onClick={async () => {
            const { error } = await supabase
              .from("playbook_entries")
              .update({ content: reviewPreview })
              .eq("id", reviewEntry.id);

            if (error) {
              alert(error.message || "Could not save update.");
              return;
            }

            setEntries((current) =>
              current.map((item) =>
                item.id === reviewEntry.id
                  ? { ...item, content: reviewPreview }
                  : item
              )
            );

            setReviewEntry(null);
            setReviewInstruction("");
            setReviewPreview("");
          }}
        >
          Save update
        </button>
      </>
    )}

    <button
      style={styles.deleteButton}
      onClick={() => {
        setReviewEntry(null);
        setReviewInstruction("");
        setReviewPreview("");
      }}
    >
      Close review
    </button>
  </section>
)}
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
                      {formatDate(entry.created_at)}
                    </span>
                  </div>

                  <p style={styles.entryContent}>
                    {isOpen ? entry.content : getPreview(entry.content)}
                  </p>

                  <div style={styles.actionRow}>
                    <button
                      style={styles.viewButton}
                      onClick={() => setOpenEntryId(isOpen ? null : entry.id)}
                    >
                      {isOpen ? "Hide full plan" : "View full plan"}
                    </button>

                    <button
                     style={styles.viewButton}
                    onClick={() => {
                   setOpenEntryId(entry.id);
                   setReviewEntry(entry);
                      }}
>
                       Review with Root Voice
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
        <style jsx>{`
  @media (max-width: 760px) {
    .playbook-list-header {
      display: none !important;
    }

    .playbook-list-item {
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
      padding: 18px !important;
    }

    .playbook-list-actions {
      justify-content: flex-start !important;
    }
  }
`}</style>
        </main>
  </RootAtmosphere>
  );
}

const styles = {
 page: {
  minHeight: "100vh",
  padding: "120px 24px 60px",
  fontFamily: "Inter, sans-serif",
},

  shell: {
  maxWidth: "1080px",
  margin: "0 auto",
  background: "rgba(255,255,255,0.22)",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(30px)",
  WebkitBackdropFilter: "blur(30px)",
  borderRadius: "42px",
  padding: "42px",
  boxShadow: "0 34px 100px rgba(20,18,15,0.14)",
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

  searchCard: {
    marginBottom: "22px",
    padding: "16px",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.34)",
    border: "1px solid rgba(255,255,255,0.46)",
    backdropFilter: "blur(16px)",
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(36,50,36,0.16)",
    borderRadius: "999px",
    padding: "14px 16px",
    background: "rgba(255,255,255,0.74)",
    color: "#1F241E",
    fontSize: "15px",
    outline: "none",
  },

  clearSearchButton: {
    border: "none",
    borderRadius: "999px",
    padding: "12px 16px",
    background: "#243224",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
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

  listCard: {
    borderRadius: "28px",
    overflow: "hidden",
    background: "rgba(255,255,255,0.42)",
    border: "1px solid rgba(255,255,255,0.52)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
  },

  listHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 0.9fr 0.7fr 0.7fr 1fr",
    gap: "12px",
    padding: "14px 18px",
    background: "rgba(36,50,36,0.1)",
    color: "#364131",
    fontSize: "12px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },

  listItem: {
    display: "grid",
    gridTemplateColumns: "2fr 0.9fr 0.7fr 0.7fr 1fr",
    gap: "12px",
    alignItems: "start",
    padding: "16px 18px",
    borderTop: "1px solid rgba(36,50,36,0.1)",
  },

  listMain: {
    minWidth: 0,
  },

  listTitle: {
    display: "block",
    color: "#1F241E",
    fontSize: "15px",
    marginBottom: "5px",
  },

  listPreview: {
    margin: 0,
    color: "#5E5549",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  listExpanded: {
    margin: "8px 0 0",
    whiteSpace: "pre-line",
    color: "#3E372F",
    fontSize: "14px",
    lineHeight: "1.7",
  },

  listCategory: {
    color: "#364131",
    fontWeight: "800",
    fontSize: "13px",
  },

  listMeta: {
    color: "#6D6254",
    fontWeight: "700",
    fontSize: "13px",
  },

  listActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "flex-end",
  },

  smallViewButton: {
    border: "none",
    borderRadius: "999px",
    padding: "8px 12px",
    background: "#243224",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
  },

  smallDeleteButton: {
    border: "1px solid rgba(120,40,30,0.25)",
    borderRadius: "999px",
    padding: "8px 12px",
    background: "rgba(255,255,255,0.58)",
    color: "#8B2E22",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const CATEGORIES = [
  {
    value: "grounding",
    label: "Grounding",
  },
  {
    value: "breathing",
    label: "Breathing",
  },
  {
    value: "calming",
    label: "Calming",
  },
  {
    value: "body_regulation",
    label: "Body Regulation",
  },
  {
    value: "thought_work",
    label: "Thought Work",
  },
  {
    value: "journaling",
    label: "Journaling",
  },
  {
    value: "values",
    label: "Values",
  },
  {
    value: "movement",
    label: "Movement",
  },
  {
    value: "sleep",
    label: "Sleep",
  },
  {
    value: "recovery",
    label: "Recovery",
  },
  {
    value: "routine",
    label: "Routine",
  },
  {
    value: "social_support",
    label: "Social Support",
  },
  {
    value: "education",
    label: "Education",
  },
  {
    value: "other",
    label: "Other",
  },
];

const EMPTY_FORM = {
  id: null,
  slug: "",
  title: "",
  category: "grounding",
  target: "",
  description: "",
  script: "",
  audioUrl: "",
  videoUrl: "",
  status: "draft",
  version: 1,
};

function createSlug(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function formatCategory(value) {
  return (
    CATEGORIES.find((category) => category.value === value)
      ?.label || "Other"
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function AudioTestPage() {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    title: "Safe Place Visualisation",
    target: "Anxiety and emotional overwhelm",
    description:
      "A gentle visualisation designed to help the user create a felt sense of safety, calm and support.",
    script: `Close your eyes if comfortable.

Take a slow breath in.

And slowly breathe out.

Imagine a place where you feel safe, calm, and supported.

Allow that image to become clearer.

Notice what you can see.

Notice what you can hear.

Notice how your body begins to soften.`,
  });

  const [interventions, setInterventions] = useState([]);
  const [generatedFiles, setGeneratedFiles] = useState([]);

  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorised, setAuthorised] = useState(null);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  const isEditing = Boolean(form.id);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setMessage("");
    setErrorMessage("");
  };

  const loadInterventions = useCallback(async () => {
    setLoadingLibrary(true);
    setErrorMessage("");

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/interventions", {
        headers: { Authorization: `Bearer ${token || ""}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Access denied.");
      setAuthorised(true);
      setInterventions(result.interventions || []);
    } catch (error) {
      console.error(
        "ROOT INTERVENTION LIBRARY LOAD ERROR:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Root could not load the intervention library."
      );
      setAuthorised(false);
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  useEffect(() => {
    loadInterventions();
  }, [loadInterventions]);

  const filteredInterventions = useMemo(() => {
    const safeSearch = search.trim().toLowerCase();

    return interventions.filter((intervention) => {
      const matchesStatus =
        statusFilter === "all" ||
        intervention.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!safeSearch) {
        return true;
      }

      const searchableText = [
        intervention.title,
        intervention.target,
        intervention.description,
        intervention.category,
        intervention.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(safeSearch);
    });
  }, [interventions, search, statusFilter]);

  const createUniqueSlug = async (title) => {
    const baseSlug =
      createSlug(title) || `intervention-${Date.now()}`;

    let candidate = baseSlug;
    let counter = 2;

    while (counter < 100) {
      if (!interventions.some((item) => item.slug === candidate && item.id !== form.id)) {
        return candidate;
      }

      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return `${baseSlug}-${Date.now()}`;
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      setErrorMessage("Please give the intervention a title.");
      return false;
    }

    if (!form.script.trim()) {
      setErrorMessage(
        "Please add the intervention script before saving."
      );
      return false;
    }

    return true;
  };

  const generateAudio = async () => {
    if (!validateForm()) {
      return;
    }

    setGeneratingAudio(true);
    setMessage("");
    setErrorMessage("");

    try {
      const audioTitle =
        createSlug(form.title) || `root-audio-${Date.now()}`;

      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await getAccessToken()) || ""}`,
        },
        body: JSON.stringify({
          title: audioTitle,
          text: form.script,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "Audio generation failed."
        );
      }

      setForm((current) => ({
        ...current,
        audioUrl: data.file,
      }));

      setGeneratedFiles((current) => [
        {
          title: form.title,
          file: data.file,
        },
        ...current,
      ]);

      setMessage(
        "Audio generated successfully. Save or publish the intervention to add it to Root’s library."
      );
    } catch (error) {
      console.error("ROOT AUDIO GENERATION ERROR:", error);

      setErrorMessage(
        error?.message || "Audio generation failed."
      );
    } finally {
      setGeneratingAudio(false);
    }
  };

  const saveIntervention = async (status) => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const slug =
        form.slug || (await createUniqueSlug(form.title));

      const interventionRow = {
        slug,
        title: form.title.trim(),
        category: form.category,
        target: form.target.trim() || null,
        description: form.description.trim() || null,
        script: form.script.trim(),
        audio_url: form.audioUrl.trim() || null,
        video_url: form.videoUrl.trim() || null,
        status,
        version: Number(form.version) || 1,
      };

      const response = await fetch("/api/admin/interventions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await getAccessToken()) || ""}`,
        },
        body: JSON.stringify({ action: "save", id: form.id, intervention: interventionRow }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Save failed.");
      const savedIntervention = result.intervention;

      setForm({
        id: savedIntervention.id,
        slug: savedIntervention.slug || "",
        title: savedIntervention.title || "",
        category:
          savedIntervention.category || "grounding",
        target: savedIntervention.target || "",
        description:
          savedIntervention.description || "",
        script: savedIntervention.script || "",
        audioUrl: savedIntervention.audio_url || "",
        videoUrl: savedIntervention.video_url || "",
        status: savedIntervention.status || status,
        version: savedIntervention.version || 1,
      });

      setMessage(
        status === "published"
          ? "Published. This intervention is now available to Root."
          : status === "archived"
          ? "Intervention archived."
          : "Draft saved successfully."
      );

      await loadInterventions();
    } catch (error) {
      console.error(
        "ROOT INTERVENTION SAVE ERROR:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Root could not save this intervention."
      );
    } finally {
      setSaving(false);
    }
  };

  const openIntervention = (intervention) => {
    setForm({
      id: intervention.id,
      slug: intervention.slug || "",
      title: intervention.title || "",
      category: intervention.category || "grounding",
      target: intervention.target || "",
      description: intervention.description || "",
      script: intervention.script || "",
      audioUrl: intervention.audio_url || "",
      videoUrl: intervention.video_url || "",
      status: intervention.status || "draft",
      version: intervention.version || 1,
    });

    setMessage(
      `Editing “${intervention.title}”.`
    );
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const startNewIntervention = () => {
    setForm({
      ...EMPTY_FORM,
    });

    setMessage("New intervention ready.");
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteIntervention = async () => {
    if (!form.id) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete “${form.title}”? This cannot be undone. Archiving is usually safer.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/interventions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await getAccessToken()) || ""}`,
        },
        body: JSON.stringify({ action: "delete", id: form.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Delete failed.");

      setForm({
        ...EMPTY_FORM,
      });

      setMessage("Intervention permanently deleted.");

      await loadInterventions();
    } catch (error) {
      console.error(
        "ROOT INTERVENTION DELETE ERROR:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Root could not delete this intervention."
      );
    } finally {
      setDeleting(false);
    }
  };

  const busy =
    saving || generatingAudio || deleting;

  if (authorised !== true) {
    return <main style={styles.page}><div style={styles.emptyState}>Root administrator access is required.</div></main>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlowOne} />
      <div style={styles.backgroundGlowTwo} />

      <div style={styles.pageInner}>
        <a href="/admin" style={styles.backLink}>
          ← Back to Global Admin
        </a>

        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              ROOT CONTENT SYSTEM
            </p>

            <h1 style={styles.pageTitle}>
              Intervention Studio
            </h1>

            <p style={styles.pageIntroduction}>
              Create, generate, preview and publish
              interventions without changing Root’s code.
            </p>
          </div>

          <button
            type="button"
            onClick={startNewIntervention}
            disabled={busy}
            style={{
              ...styles.secondaryButton,
              opacity: busy ? 0.55 : 1,
            }}
          >
            + New intervention
          </button>
        </header>

        {message && (
          <div style={styles.successMessage}>
            {message}
          </div>
        )}

        {errorMessage && (
          <div style={styles.errorMessage}>
            {errorMessage}
          </div>
        )}

        <section style={styles.editorCard}>
          <div style={styles.editorHeadingRow}>
            <div>
              <p style={styles.sectionEyebrow}>
                {isEditing
                  ? "EDIT INTERVENTION"
                  : "NEW INTERVENTION"}
              </p>

              <h2 style={styles.sectionTitle}>
                {form.title || "Untitled intervention"}
              </h2>
            </div>

            <StatusBadge status={form.status} />
          </div>

          <div style={styles.formGrid}>
            <Field label="Title">
              <input
                value={form.title}
                onChange={(event) =>
                  updateField(
                    "title",
                    event.target.value
                  )
                }
                placeholder="Safe Place Visualisation"
                style={styles.input}
              />
            </Field>

            <Field label="Category">
              <select
                value={form.category}
                onChange={(event) =>
                  updateField(
                    "category",
                    event.target.value
                  )
                }
                style={styles.input}
              >
                {CATEGORIES.map((category) => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="What does this intervention target?">
            <input
              value={form.target}
              onChange={(event) =>
                updateField(
                  "target",
                  event.target.value
                )
              }
              placeholder="For example: anxiety, overwhelm or racing thoughts"
              style={styles.input}
            />
          </Field>

          <Field label="Short description">
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              placeholder="Explain what the intervention is intended to help with."
              style={{
                ...styles.textarea,
                minHeight: "110px",
              }}
            />
          </Field>

          <Field label="Full intervention script">
            <textarea
              value={form.script}
              onChange={(event) =>
                updateField(
                  "script",
                  event.target.value
                )
              }
              placeholder="Write the full spoken intervention here."
              style={{
                ...styles.textarea,
                minHeight: "360px",
              }}
            />

            <div style={styles.characterRow}>
              <span>
                {form.script.length.toLocaleString(
                  "en-GB"
                )}{" "}
                characters
              </span>

              <span>
                Version {form.version || 1}
              </span>
            </div>
          </Field>

          <div style={styles.mediaGrid}>
            <div style={styles.mediaCard}>
              <p style={styles.mediaLabel}>
                AUDIO
              </p>

              <h3 style={styles.mediaTitle}>
                Generate therapeutic audio
              </h3>

              <p style={styles.mediaDescription}>
                Root will create the audio from the full
                intervention script.
              </p>

              <button
                type="button"
                onClick={generateAudio}
                disabled={busy}
                style={{
                  ...styles.primaryButton,
                  opacity: busy ? 0.55 : 1,
                }}
              >
                {generatingAudio
                  ? "Generating audio..."
                  : form.audioUrl
                  ? "Generate new audio"
                  : "Generate audio"}
              </button>

              {form.audioUrl && (
                <div style={styles.mediaPreview}>
                  <audio
                    controls
                    src={form.audioUrl}
                    style={{
                      width: "100%",
                    }}
                  />

                  <p style={styles.filePath}>
                    {form.audioUrl}
                  </p>
                </div>
              )}
            </div>

            <div style={styles.mediaCard}>
              <p style={styles.mediaLabel}>
                VIDEO
              </p>

              <h3 style={styles.mediaTitle}>
                Add a video
              </h3>

              <p style={styles.mediaDescription}>
                Video upload can be added later. For now,
                you can paste a hosted video address.
              </p>

              <input
                value={form.videoUrl}
                onChange={(event) =>
                  updateField(
                    "videoUrl",
                    event.target.value
                  )
                }
                placeholder="https://..."
                style={styles.input}
              />

              {form.videoUrl && (
                <p style={styles.filePath}>
                  {form.videoUrl}
                </p>
              )}
            </div>
          </div>

          <div style={styles.actionBar}>
            <div style={styles.mainActions}>
              <button
                type="button"
                onClick={() =>
                  saveIntervention("draft")
                }
                disabled={busy}
                style={{
                  ...styles.secondaryButton,
                  opacity: busy ? 0.55 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save draft"}
              </button>

              <button
                type="button"
                onClick={() =>
                  saveIntervention("published")
                }
                disabled={busy}
                style={{
                  ...styles.publishButton,
                  opacity: busy ? 0.55 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : "Publish intervention"}
              </button>
            </div>

            {isEditing && (
              <div style={styles.secondaryActions}>
                {form.status !== "archived" && (
                  <button
                    type="button"
                    onClick={() =>
                      saveIntervention("archived")
                    }
                    disabled={busy}
                    style={{
                      ...styles.textButton,
                      opacity: busy ? 0.55 : 1,
                    }}
                  >
                    Archive
                  </button>
                )}

                <button
                  type="button"
                  onClick={deleteIntervention}
                  disabled={busy}
                  style={{
                    ...styles.deleteButton,
                    opacity: busy ? 0.55 : 1,
                  }}
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete permanently"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section style={styles.librarySection}>
          <div style={styles.libraryHeader}>
            <div>
              <p style={styles.sectionEyebrow}>
                ROOT LIBRARY
              </p>

              <h2 style={styles.sectionTitle}>
                Your interventions
              </h2>

              <p style={styles.libraryDescription}>
                Published interventions can later be
                delivered through Mind, Coach, Body and
                Playbook.
              </p>
            </div>

            <div style={styles.libraryCount}>
              {interventions.length}
            </div>
          </div>

          <div style={styles.filterBar}>
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search interventions..."
              style={{
                ...styles.input,
                flex: "1 1 260px",
              }}
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              style={{
                ...styles.input,
                flex: "0 1 190px",
              }}
            >
              <option value="all">
                All statuses
              </option>
              <option value="published">
                Published
              </option>
              <option value="draft">
                Drafts
              </option>
              <option value="archived">
                Archived
              </option>
            </select>
          </div>

          {loadingLibrary ? (
            <div style={styles.emptyState}>
              Loading Root’s intervention library...
            </div>
          ) : filteredInterventions.length === 0 ? (
            <div style={styles.emptyState}>
              No interventions match this view yet.
            </div>
          ) : (
            <div style={styles.libraryGrid}>
              {filteredInterventions.map(
                (intervention) => (
                  <button
                    key={intervention.id}
                    type="button"
                    onClick={() =>
                      openIntervention(intervention)
                    }
                    style={styles.interventionCard}
                  >
                    <div
                      style={
                        styles.interventionCardTop
                      }
                    >
                      <StatusBadge
                        status={intervention.status}
                      />

                      <span
                        style={
                          styles.interventionVersion
                        }
                      >
                        v{intervention.version || 1}
                      </span>
                    </div>

                    <h3
                      style={
                        styles.interventionTitle
                      }
                    >
                      {intervention.title}
                    </h3>

                    <p
                      style={
                        styles.interventionCategory
                      }
                    >
                      {formatCategory(
                        intervention.category
                      )}
                    </p>

                    {intervention.target && (
                      <p
                        style={
                          styles.interventionTarget
                        }
                      >
                        {intervention.target}
                      </p>
                    )}

                    <div
                      style={
                        styles.interventionFooter
                      }
                    >
                      <span>
                        {intervention.audio_url
                          ? "Audio ready"
                          : "No audio"}
                      </span>

                      <span>
                        {formatDate(
                          intervention.updated_at
                        )}
                      </span>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {generatedFiles.length > 0 && (
          <section style={styles.sessionSection}>
            <p style={styles.sectionEyebrow}>
              THIS SESSION
            </p>

            <h2 style={styles.sectionTitle}>
              Newly generated audio
            </h2>

            <div style={styles.generatedList}>
              {generatedFiles.map((item, index) => (
                <div
                  key={`${item.file}-${index}`}
                  style={styles.generatedCard}
                >
                  <strong>{item.title}</strong>

                  <audio
                    controls
                    src={item.file}
                    style={{
                      width: "100%",
                    }}
                  />

                  <p style={styles.filePath}>
                    {item.file}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }) {
  const safeStatus = status || "draft";

  const badgeStyle =
    safeStatus === "published"
      ? styles.publishedBadge
      : safeStatus === "archived"
      ? styles.archivedBadge
      : styles.draftBadge;

  return (
    <span
      style={{
        ...styles.statusBadge,
        ...badgeStyle,
      }}
    >
      {safeStatus}
    </span>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    padding: "48px 20px 80px",
    background:
      "linear-gradient(145deg, #08110f 0%, #101917 45%, #07100e 100%)",
    color: "#f7faf8",
  },

  backgroundGlowOne: {
    position: "fixed",
    width: "520px",
    height: "520px",
    top: "-180px",
    right: "-170px",
    borderRadius: "999px",
    background:
      "radial-gradient(circle, rgba(121, 198, 164, 0.16), rgba(121, 198, 164, 0))",
    pointerEvents: "none",
  },

  backgroundGlowTwo: {
    position: "fixed",
    width: "520px",
    height: "520px",
    bottom: "-250px",
    left: "-190px",
    borderRadius: "999px",
    background:
      "radial-gradient(circle, rgba(90, 145, 126, 0.14), rgba(90, 145, 126, 0))",
    pointerEvents: "none",
  },

  pageInner: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
  },

  backLink: {
    display: "inline-flex",
    alignItems: "center",
    marginBottom: "24px",
    padding: "9px 13px",
    border: "1px solid rgba(148, 180, 167, 0.24)",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.04)",
    color: "#b8c8c1",
    fontSize: "13px",
    fontWeight: 700,
    textDecoration: "none",
  },

  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "24px",
    flexWrap: "wrap",
    marginBottom: "30px",
  },

  eyebrow: {
    margin: "0 0 10px",
    color: "#94b4a7",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.18em",
  },

  pageTitle: {
    margin: 0,
    fontSize: "clamp(34px, 6vw, 62px)",
    lineHeight: 1,
    letterSpacing: "-0.045em",
  },

  pageIntroduction: {
    maxWidth: "680px",
    margin: "16px 0 0",
    color: "#b8c8c1",
    fontSize: "17px",
    lineHeight: 1.6,
  },

  successMessage: {
    marginBottom: "18px",
    padding: "14px 16px",
    border: "1px solid rgba(118, 214, 166, 0.32)",
    borderRadius: "14px",
    background: "rgba(71, 164, 118, 0.13)",
    color: "#d8f5e5",
    lineHeight: 1.5,
  },

  errorMessage: {
    marginBottom: "18px",
    padding: "14px 16px",
    border: "1px solid rgba(255, 126, 126, 0.34)",
    borderRadius: "14px",
    background: "rgba(194, 61, 61, 0.14)",
    color: "#ffdada",
    lineHeight: 1.5,
  },

  editorCard: {
    padding: "clamp(22px, 4vw, 38px)",
    border: "1px solid rgba(255,255,255,0.11)",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.065)",
    boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
    backdropFilter: "blur(20px)",
  },

  editorHeadingRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "26px",
  },

  sectionEyebrow: {
    margin: "0 0 8px",
    color: "#8eafa1",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.16em",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "clamp(25px, 4vw, 36px)",
    letterSpacing: "-0.025em",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },

  field: {
    display: "block",
    marginBottom: "20px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    color: "#dbe7e1",
    fontSize: "14px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    minHeight: "48px",
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: "13px",
    outline: "none",
    boxSizing: "border-box",
    background: "rgba(3,10,8,0.56)",
    color: "#ffffff",
    fontSize: "15px",
  },

  textarea: {
    width: "100%",
    padding: "14px",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: "14px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    background: "rgba(3,10,8,0.56)",
    color: "#ffffff",
    fontSize: "15px",
    lineHeight: 1.7,
    fontFamily: "inherit",
  },

  characterRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "7px",
    color: "#7f998f",
    fontSize: "12px",
  },

  mediaGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
    marginTop: "8px",
  },

  mediaCard: {
    padding: "22px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "20px",
    background: "rgba(4,13,10,0.42)",
  },

  mediaLabel: {
    margin: "0 0 8px",
    color: "#86ab9b",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.16em",
  },

  mediaTitle: {
    margin: 0,
    fontSize: "20px",
  },

  mediaDescription: {
    minHeight: "48px",
    margin: "10px 0 18px",
    color: "#9eb1a9",
    fontSize: "14px",
    lineHeight: 1.55,
  },

  mediaPreview: {
    marginTop: "18px",
  },

  filePath: {
    margin: "9px 0 0",
    color: "#778e85",
    fontSize: "11px",
    lineHeight: 1.5,
    wordBreak: "break-all",
  },

  actionBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    marginTop: "28px",
    paddingTop: "24px",
    borderTop: "1px solid rgba(255,255,255,0.09)",
  },

  mainActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  secondaryActions: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },

  primaryButton: {
    minHeight: "46px",
    padding: "12px 18px",
    border: "1px solid rgba(147, 220, 188, 0.4)",
    borderRadius: "13px",
    cursor: "pointer",
    background: "rgba(103, 190, 151, 0.17)",
    color: "#effff7",
    fontWeight: 800,
  },

  publishButton: {
    minHeight: "48px",
    padding: "12px 21px",
    border: "1px solid rgba(171, 239, 208, 0.7)",
    borderRadius: "14px",
    cursor: "pointer",
    background:
      "linear-gradient(135deg, #8fd1b2, #69ad90)",
    color: "#07120e",
    fontWeight: 900,
    boxShadow:
      "0 12px 34px rgba(78, 160, 124, 0.23)",
  },

  secondaryButton: {
    minHeight: "48px",
    padding: "12px 19px",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: "14px",
    cursor: "pointer",
    background: "rgba(255,255,255,0.07)",
    color: "#ffffff",
    fontWeight: 800,
  },

  textButton: {
    padding: "8px 4px",
    border: "none",
    cursor: "pointer",
    background: "transparent",
    color: "#c4d2cc",
    fontWeight: 700,
  },

  deleteButton: {
    padding: "8px 4px",
    border: "none",
    cursor: "pointer",
    background: "transparent",
    color: "#e99696",
    fontWeight: 700,
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },

  publishedBadge: {
    border: "1px solid rgba(112, 218, 165, 0.34)",
    background: "rgba(65, 175, 117, 0.16)",
    color: "#a9edc8",
  },

  draftBadge: {
    border: "1px solid rgba(237, 195, 111, 0.3)",
    background: "rgba(196, 143, 43, 0.15)",
    color: "#f3d69b",
  },

  archivedBadge: {
    border: "1px solid rgba(182, 190, 187, 0.25)",
    background: "rgba(151, 158, 155, 0.12)",
    color: "#b9c2be",
  },

  librarySection: {
    marginTop: "34px",
  },

  libraryHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },

  libraryDescription: {
    maxWidth: "650px",
    margin: "10px 0 0",
    color: "#91a59c",
    lineHeight: 1.55,
  },

  libraryCount: {
    display: "grid",
    width: "52px",
    height: "52px",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.06)",
    color: "#cbe2d8",
    fontWeight: 900,
  },

  filterBar: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },

  libraryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },

  interventionCard: {
    display: "block",
    width: "100%",
    padding: "19px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "20px",
    cursor: "pointer",
    textAlign: "left",
    background: "rgba(255,255,255,0.055)",
    color: "#ffffff",
    boxShadow: "0 16px 44px rgba(0,0,0,0.16)",
  },

  interventionCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },

  interventionVersion: {
    color: "#778f85",
    fontSize: "12px",
    fontWeight: 700,
  },

  interventionTitle: {
    margin: "18px 0 7px",
    fontSize: "20px",
    letterSpacing: "-0.018em",
  },

  interventionCategory: {
    margin: 0,
    color: "#8fc2ac",
    fontSize: "13px",
    fontWeight: 800,
  },

  interventionTarget: {
    minHeight: "42px",
    margin: "13px 0",
    color: "#aabbb4",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  interventionFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "20px",
    paddingTop: "13px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    color: "#71857c",
    fontSize: "11px",
  },

  emptyState: {
    padding: "36px 20px",
    border: "1px dashed rgba(255,255,255,0.14)",
    borderRadius: "20px",
    color: "#8ea098",
    textAlign: "center",
  },

  sessionSection: {
    marginTop: "38px",
  },

  generatedList: {
    display: "grid",
    gap: "14px",
    marginTop: "18px",
  },

  generatedCard: {
    display: "grid",
    gap: "12px",
    padding: "18px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.05)",
  },
};

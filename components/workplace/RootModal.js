"use client";

import { useEffect, useId } from "react";

export default function RootModal({
  isOpen = false,
  onClose,
  title = "Root Workplace",
  eyebrow = "Root Workplace",
  children,
  primaryLabel = "Save",
  onPrimary,
  primaryDisabled = false,
  secondaryLabel = "Cancel",
  showFooter = true,
  width = 680,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={styles.backdrop}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          ...styles.modal,
          maxWidth: width,
        }}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div style={styles.glowOne} />

        <div style={styles.glowTwo} />

        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              {eyebrow}
            </p>

            <h2
              id={titleId}
              style={styles.title}
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close"
            style={styles.closeButton}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div style={styles.divider} />

        <div style={styles.content}>
          {children}
        </div>

        {showFooter && (
          <>
            <div style={styles.divider} />

            <footer style={styles.footer}>
              <button
                type="button"
                style={
                  styles.secondaryButton
                }
                onClick={onClose}
              >
                {secondaryLabel}
              </button>

              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  ...(primaryDisabled
                    ? styles.primaryButtonDisabled
                    : {}),
                }}
                onClick={onPrimary}
                disabled={primaryDisabled}
              >
                {primaryLabel}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,

    padding: "24px",

    display: "grid",
    placeItems: "center",

    background:
      "rgba(30, 27, 23, 0.38)",

    backdropFilter: "blur(14px)",
    WebkitBackdropFilter:
      "blur(14px)",

    overflowY: "auto",
  },

  modal: {
    position: "relative",

    width: "100%",

    margin: "auto",

    borderRadius: "34px",

    background:
      "linear-gradient(145deg, rgba(250,248,243,0.97), rgba(238,242,232,0.96))",

    border:
      "1px solid rgba(255,255,255,0.9)",

    boxShadow:
      "0 34px 120px rgba(29,25,20,0.28)",

    overflow: "hidden",

    color: "#181818",
  },

  glowOne: {
    position: "absolute",

    width: "260px",
    height: "260px",

    top: "-130px",
    right: "-80px",

    borderRadius: "50%",

    background:
      "rgba(181,199,166,0.24)",

    filter: "blur(10px)",

    pointerEvents: "none",
  },

  glowTwo: {
    position: "absolute",

    width: "220px",
    height: "220px",

    bottom: "-150px",
    left: "-80px",

    borderRadius: "50%",

    background:
      "rgba(220,205,180,0.22)",

    filter: "blur(10px)",

    pointerEvents: "none",
  },

  header: {
    position: "relative",

    padding: "30px 32px 24px",

    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",

    gap: "24px",
  },

  eyebrow: {
    margin: "0 0 8px",

    color: "#6C745F",

    fontSize: "11px",
    fontWeight: "900",

    textTransform: "uppercase",

    letterSpacing: "0.14em",
  },

  title: {
    margin: 0,

    color: "#181818",

    fontFamily:
      "Georgia, 'Times New Roman', serif",

    fontSize:
      "clamp(28px, 4vw, 38px)",

    fontWeight: "500",

    lineHeight: "1.08",

    letterSpacing: "-0.035em",
  },

  closeButton: {
    position: "relative",

    flex: "0 0 auto",

    width: "42px",
    height: "42px",

    display: "grid",
    placeItems: "center",

    border: "none",
    borderRadius: "50%",

    background:
      "rgba(24,24,24,0.065)",

    color: "#454038",

    cursor: "pointer",

    fontSize: "25px",
    fontWeight: "300",

    lineHeight: "1",
  },

  divider: {
    position: "relative",

    height: "1px",

    margin: "0 32px",

    background:
      "rgba(24,24,24,0.08)",
  },

  content: {
    position: "relative",

    padding: "28px 32px",

    display: "grid",

    gap: "20px",
  },

  footer: {
    position: "relative",

    padding: "22px 32px 28px",

    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",

    gap: "12px",

    flexWrap: "wrap",
  },

  secondaryButton: {
    minWidth: "110px",

    padding: "13px 20px",

    borderRadius: "999px",

    border:
      "1px solid rgba(24,24,24,0.12)",

    background:
      "rgba(255,255,255,0.58)",

    color: "#3F392F",

    cursor: "pointer",

    fontSize: "14px",
    fontWeight: "800",
  },

  primaryButton: {
    minWidth: "130px",

    padding: "14px 22px",

    border: "none",

    borderRadius: "999px",

    background: "#181818",

    color: "#FFFFFF",

    cursor: "pointer",

    fontSize: "14px",
    fontWeight: "800",

    boxShadow:
      "0 12px 28px rgba(24,24,24,0.16)",
  },

  primaryButtonDisabled: {
    opacity: 0.5,

    cursor: "not-allowed",

    boxShadow: "none",
  },
};

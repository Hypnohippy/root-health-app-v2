"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] =
    useState("");

  const [confirm, setConfirm] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [tokenHash, setTokenHash] =
    useState("");

  const [recoveryReady, setRecoveryReady] =
    useState(false);

  const [checkingLink, setCheckingLink] =
    useState(true);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const token =
      params.get("token_hash") || "";

    const type =
      params.get("type") || "";

    if (
      token &&
      type === "recovery"
    ) {
      setTokenHash(token);
      setCheckingLink(false);
      return;
    }

    /*
     * If the user already verified the
     * recovery token in this browser,
     * allow the password form to remain
     * available.
     */
    async function checkSession() {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (session) {
        setRecoveryReady(true);
      }

      setCheckingLink(false);
    }

    checkSession();
  }, []);

  async function beginRecovery() {
    if (!tokenHash) {
      setMessage(
        "This password reset link is not valid. Please request a new reset email."
      );

      return;
    }

    setLoading(true);
    setMessage("");

    const {
      error,
    } =
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });

    if (error) {
      setMessage(
        error.message ||
        "This password reset link could not be verified."
      );

      setLoading(false);
      return;
    }

    /*
     * The token has now been deliberately
     * consumed by the human pressing the
     * button, not by the email scanner.
     */
    window.history.replaceState(
      {},
      document.title,
      "/reset-password"
    );

    setTokenHash("");
    setRecoveryReady(true);
    setLoading(false);
  }

  async function updatePassword() {
    setMessage("");

    if (!recoveryReady) {
      setMessage(
        "Please verify your password reset link first."
      );

      return;
    }

    if (!password) {
      setMessage(
        "Please enter a new password."
      );

      return;
    }

    if (password.length < 8) {
      setMessage(
        "Passwords must contain at least 8 characters."
      );

      return;
    }

    if (password !== confirm) {
      setMessage(
        "Passwords do not match."
      );

      return;
    }

    setLoading(true);

    const {
      error,
    } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      setMessage(
        error.message
      );

      setLoading(false);
      return;
    }

    setMessage(
      "Your password has been updated successfully."
    );

    /*
     * Sign out so the next login proves
     * the new password works normally.
     */
    await supabase.auth.signOut();

    setLoading(false);

    setTimeout(() => {
      window.location.href =
        "/login";
    }, 1500);
  }

  if (checkingLink) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Health
          </p>

          <h1 style={styles.title}>
            Checking reset link...
          </h1>

          <p style={styles.text}>
            Root is preparing your secure
            password reset.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>
          Root Health
        </p>

        {!recoveryReady ? (
          <>
            <h1 style={styles.title}>
              Reset your password
            </h1>

            <p style={styles.text}>
              Your reset request is ready.
              Press the button below to
              continue securely.
            </p>

            {tokenHash ? (
              <button
                style={styles.button}
                onClick={beginRecovery}
                disabled={loading}
              >
                {loading
                  ? "Verifying..."
                  : "Continue to reset password"}
              </button>
            ) : (
              <button
                style={styles.button}
                onClick={() => {
                  window.location.href =
                    "/forgot-password";
                }}
              >
                Request New Reset Link
              </button>
            )}

            {message ? (
              <p style={styles.message}>
                {message}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <h1 style={styles.title}>
              Choose a new password
            </h1>

            <p style={styles.text}>
              Enter your new password
              below. Once saved, you can
              sign in normally using the
              new password.
            </p>

            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              style={styles.input}
            />

            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) =>
                setConfirm(
                  e.target.value
                )
              }
              style={styles.input}
            />

            <button
              style={styles.button}
              onClick={updatePassword}
              disabled={loading}
            >
              {loading
                ? "Updating..."
                : "Update Password"}
            </button>

            {message ? (
              <p style={styles.message}>
                {message}
              </p>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#F4F1EA",
    padding: "24px",
  },

  card: {
    width: "100%",
    maxWidth: "520px",
    padding: "40px",
    borderRadius: "34px",
    background:
      "rgba(255,255,255,0.75)",
    backdropFilter:
      "blur(20px)",
    border:
      "1px solid rgba(255,255,255,0.85)",
    boxShadow:
      "0 24px 70px rgba(20,18,15,0.12)",
  },

  kicker: {
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#68715D",
  },

  title: {
    margin: "10px 0",
    fontSize: "40px",
    color: "#181818",
  },

  text: {
    color: "#5A554D",
    lineHeight: 1.7,
    marginBottom: "24px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "15px",
    borderRadius: "16px",
    border:
      "1px solid rgba(24,24,24,0.14)",
    marginBottom: "18px",
    fontSize: "16px",
  },

  button: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "15px",
    background: "#181818",
    color: "#fff",
    fontWeight: "800",
    cursor: "pointer",
  },

  message: {
    marginTop: "20px",
    lineHeight: 1.7,
    color: "#4D463B",
  },
};
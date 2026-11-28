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

  const [linkType, setLinkType] =
    useState("");

  const [returnToIntroducer, setReturnToIntroducer] =
    useState(false);

  const [recoveryReady, setRecoveryReady] =
    useState(false);

  const [checkingLink, setCheckingLink] =
    useState(true);

  const [passwordSaved, setPasswordSaved] =
    useState(false);

  useEffect(() => {
    let active = true;
    // Supabase consumes implicit/PKCE recovery callbacks while establishing a
    // session. The URL token may already be gone by the time getSession resolves.
    // Only the explicit PASSWORD_RECOVERY event (not SIGNED_IN) grants this form.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event !== "PASSWORD_RECOVERY" || !session) return;
      setLinkType("recovery");
      setRecoveryReady(true);
      setCheckingLink(false);
      const next = new URLSearchParams(window.location.search).get("next");
      const safeReturn = next === "/introducer" ? "?next=%2Fintroducer" : "";
      window.history.replaceState({}, document.title, `/reset-password${safeReturn}`);
    });

    const params =
      new URLSearchParams(
        window.location.search
      );
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    );

    const token =
      params.get("token_hash") || "";

    const type = params.get("type") || hashParams.get("type") || "";

    setReturnToIntroducer(params.get("next") === "/introducer");

    if (
      token &&
      (type === "recovery" || type === "invite")
    ) {
      setTokenHash(token);
      setLinkType(type);
      setCheckingLink(false);
      return () => { active = false; subscription.unsubscribe(); };
    }

    async function checkSession() {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      // A normal signed-in session is not enough to reset a password. Only an
      // explicit Supabase recovery/invite callback can establish this state.
      const callbackType = hashParams.get("type");
      if (
        session &&
        (callbackType === "recovery" || callbackType === "invite") &&
        hashParams.has("access_token")
      ) {
        setLinkType(callbackType);
        setRecoveryReady(true);
        const safeReturn = params.get("next") === "/introducer" ? "?next=%2Fintroducer" : "";
        window.history.replaceState({}, document.title, `/reset-password${safeReturn}`);
      }

      setCheckingLink(false);
    }

    void checkSession();
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function beginPasswordSetup() {
    if (!tokenHash) {
      setMessage(
        "This password setup link is not valid or has expired. Please request a new secure link."
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
        type: linkType,
      });

    if (error) {
      setMessage(
        "This password setup link could not be verified. It may have expired; request a new secure link."
      );

      setLoading(false);
      return;
    }

    /*
     * The token has now been deliberately
     * consumed by the human pressing the
     * button, not by the email scanner.
     */
    const safeReturn = returnToIntroducer ? "?next=%2Fintroducer" : "";
    window.history.replaceState(
      {},
      document.title,
      `/reset-password${safeReturn}`
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

    if (!passwordSaved && !password) {
      setMessage(
        "Please enter a new password."
      );

      return;
    }

    if (!passwordSaved && password.length < 8) {
      setMessage(
        "Passwords must contain at least 8 characters."
      );

      return;
    }

    if (!passwordSaved && password !== confirm) {
      setMessage(
        "Passwords do not match."
      );

      return;
    }

    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!recoveryReady || !session) {
      setMessage("Your secure password link has expired. Request a new one and try again.");
      setRecoveryReady(false);
      return;
    }

    setLoading(true);

    if (!passwordSaved) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      setPasswordSaved(true);
    }

    if (returnToIntroducer && linkType === "invite") {
      const { data: { session: currentSession } = {} } = await supabase.auth.getSession();
      const response = await fetch("/api/introducer/activation/complete", {
        method: "POST",
        headers: { Authorization: `Bearer ${currentSession?.access_token || ""}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "Your password is saved, but Root could not finish access setup. Keep this page open and retry or contact Root Health.");
        setLoading(false);
        return;
      }
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
      window.location.href = returnToIntroducer
        ? "/login?next=%2Fintroducer"
        : "/login";
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
              {linkType === "invite" ? "Set up your password" : "Reset your password"}
            </h1>

            <p style={styles.text}>
              {tokenHash
                ? "Your secure link is ready. Continue to choose a password that only you know."
                : linkType === "invite"
                  ? "This invitation link is missing or has expired. Ask Root Health to send a new invitation."
                  : "This password reset link is missing or has expired. Request a new reset link and open it on this site."}
            </p>

            {tokenHash ? (
              <button
                style={styles.button}
                onClick={beginPasswordSetup}
                disabled={loading}
              >
                {loading
                  ? "Verifying..."
                  : linkType === "invite" ? "Continue to set password" : "Continue to reset password"}
              </button>
            ) : linkType === "invite" ? (
              <a href="/login?next=%2Fintroducer" style={styles.buttonLink}>
                Return to sign in
              </a>
            ) : (
              <button
                style={styles.button}
                onClick={() => {
                  window.location.href =
                    "/forgot-password";
                }}
              >
              Request a secure password link
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
              {linkType === "invite" ? "Create your password" : "Choose a new password"}
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
              autoComplete="new-password"
              minLength={8}
              required
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
              autoComplete="new-password"
              minLength={8}
              required
            />

            <button
              style={styles.button}
              onClick={updatePassword}
              disabled={loading}
            >
              {loading
                ? "Updating..."
                : passwordSaved && returnToIntroducer && linkType === "invite"
                  ? "Complete account activation"
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

  buttonLink: {
    display: "block",
    width: "100%",
    borderRadius: "999px",
    padding: "15px",
    background: "#181818",
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
    textDecoration: "none",
  },

  message: {
    marginTop: "20px",
    lineHeight: 1.7,
    color: "#4D463B",
  },
};

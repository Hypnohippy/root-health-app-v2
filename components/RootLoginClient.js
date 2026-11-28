"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import {
  getRootIdentity,
  getStoredRootIdentity,
  setActiveOrganisation,
} from "../lib/rootIdentity";

export default function RootLoginClient({ isIntroducerCustomer = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const normalisedEmail =
      email.trim().toLowerCase();

    if (!normalisedEmail || !password) {
      setMessage(
        "Please enter your email address and password."
      );

      setLoading(false);
      return;
    }

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword({
        email: normalisedEmail,
        password,
      });

    if (
      error ||
      !data?.user
    ) {
      setMessage(
        error?.message ||
          "Root could not sign you in. Please check your details."
      );

      setLoading(false);
      return;
    }

    /*
     * If this person came here while
     * joining an employer's Workplace
     * Programme, finish that journey
     * before choosing their normal Root
     * experience.
     */
    const pendingOrganisationJoin =
      localStorage.getItem(
        "root_pending_organisation_join_v1"
      );

    if (pendingOrganisationJoin) {
      window.location.href =
        "/organisation/join?resume=1";

      return;
    }

    // A single exact destination is permitted for the invited partner demo.
    // The demo API independently verifies grant, expiry and account isolation.
    if (isIntroducerCustomer && new URLSearchParams(window.location.search).get("next") === "/introducer") {
      // The gateway is a sign-in invitation, not an authenticated destination.
      // The chooser re-verifies the grant on the server and fails closed.
      window.location.href = "/choose-experience";
      return;
    }

    const {
      data: memberships,
      error: membershipError,
    } =
      await supabase
        .from("organisation_members")
        .select(
          `
            id,
            organisation_id,
            organisation_unit_id,
            profile_key,
            email,
            name,
            department,
            role
          `
        )
        .eq(
          "user_id",
          data.user.id
        );

    if (membershipError) {
      setMessage(
        "You are signed in, but Root could not verify your organisation access."
      );

      setLoading(false);
      return;
    }

    const safeMemberships =
      Array.isArray(memberships)
        ? memberships
        : [];

    /*
     * NO ORGANISATION MEMBERSHIP
     *
     * This is a normal Direct-to-Public
     * Root user.
     */
    if (
      safeMemberships.length === 0
    ) {
      localStorage.removeItem(
        "root_active_organisation_v1"
      );

      await getRootIdentity();

      window.location.href = "/";
      return;
    }

    /*
     * MULTIPLE ORGANISATIONS
     *
     * Root must never guess.
     *
     * The authenticated person explicitly
     * chooses which organisation/context
     * they want to use.
     */
    if (
      safeMemberships.length > 1
    ) {
      localStorage.removeItem(
        "root_active_organisation_v1"
      );

      localStorage.removeItem(
        "root_hr_org_v1"
      );

      /*
       * Keep the memberships temporarily
       * so the next page can show the
       * legitimate choices belonging to
       * this authenticated account.
       */
      localStorage.setItem(
        "root_pending_organisation_choices_v1",
        JSON.stringify(
          safeMemberships
        )
      );

      await getRootIdentity();

      window.location.href =
        "/choose-organisation";

      return;
    }

    /*
     * ONE ORGANISATION ONLY
     *
     * With no ambiguity, Root may safely
     * establish that organisation.
     */
    const membership =
      safeMemberships[0];

    setActiveOrganisation(
      membership.organisation_id
    );

    localStorage.setItem(
      "root_profile_key_v1",
      membership.profile_key
    );

    localStorage.setItem(
      "root_profile_v1",
      JSON.stringify({
        profile_key:
          membership.profile_key,

        email:
          membership.email ||
          data.user.email ||
          "",

        name:
          membership.name ||
          "",

        department:
          membership.department ||
          "",
      })
    );

    localStorage.setItem(
      "root_organisation_v1",
      JSON.stringify({
        organisation_id:
          membership.organisation_id,

        role:
          membership.role ||
          "employee",
      })
    );

    if (
      membership.role ===
        "hr_admin" ||
      membership.role ===
        "organisation_admin"
    ) {
      localStorage.setItem(
        "root_hr_org_v1",
        JSON.stringify({
          organisation_id:
            membership.organisation_id,

          role:
            membership.role,
        })
      );
    } else {
      localStorage.removeItem(
        "root_hr_org_v1"
      );
    }

    localStorage.removeItem(
      "root_pending_organisation_choices_v1"
    );

    await getRootIdentity();

    const identity =
      getStoredRootIdentity();

    if (!identity) {
      window.location.href = "/";
      return;
    }

    if (
      !identity.capabilities
        ?.canUseWorkplace
    ) {
      window.location.href = "/";
      return;
    }

    if (
      identity.activeExperience ===
      "workplace"
    ) {
      window.location.href =
        "/org-insights";

      return;
    }

    if (
      identity.activeExperience ===
      "personal"
    ) {
      window.location.href = "/";
      return;
    }

    window.location.href =
      "/choose-experience";
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>
          Root Health
        </p>

        <h1 style={styles.title}>
          {isIntroducerCustomer ? "Professional Introducer sign in" : "Welcome back"}
        </h1>

        <p style={styles.intro}>
          {isIntroducerCustomer
            ? "Sign in using your named Root Health invitation. Your access is individual, time-limited and verified before private experiences open."
            : <>Sign in to Root. If you use Root through more than one organisation, we&apos;ll let you choose where you want to continue.</>}
        </p>

        <form
          onSubmit={handleLogin}
          style={styles.form}
        >
          <label style={styles.label}>
            Email address

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              autoComplete="email"
              style={styles.input}
              required
            />
          </label>

          <label style={styles.label}>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              autoComplete="current-password"
              style={styles.input}
              required
            />
          </label>

          {message ? (
            <p style={styles.message}>
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        <div style={styles.actions}>
          {!isIntroducerCustomer && (
            <>
          <button
            type="button"
            style={
              styles.secondaryButton
            }
            onClick={() => {
              window.location.href =
                "/organisation/join";
            }}
          >
            Join your employer&apos;s
            Workplace Programme
          </button>

          <button
            type="button"
            style={
              styles.secondaryButton
            }
            onClick={() => {
              window.location.href =
                "/organisation/register";
            }}
          >
            Apply for Root Workplace
          </button>

            </>
          )}

          {isIntroducerCustomer && (
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => { window.location.href = "/introducer/activate"; }}
            >
              Professional Introducer — Activate your invitation
            </button>
          )}

          <button
            type="button"
            style={styles.linkButton}
            onClick={() => {
              const next = new URLSearchParams(window.location.search).get("next");
              window.location.href = next === "/introducer"
                ? "/forgot-password?next=%2Fintroducer"
                : "/forgot-password";
            }}
          >
            Forgot your password?
          </button>
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background:
      "linear-gradient(145deg, #eef2e8 0%, #f8f5ee 55%, #e9eee3 100%)",
    color: "#181818",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },

  card: {
    width: "100%",
    maxWidth: "480px",
    padding: "38px",
    borderRadius: "34px",
    background:
      "rgba(255,255,255,0.72)",
    border:
      "1px solid rgba(255,255,255,0.9)",
    boxShadow:
      "0 30px 90px rgba(32,38,28,0.16)",
    backdropFilter:
      "blur(20px)",
  },

  kicker: {
    margin:
      "0 0 12px",
    color:
      "#657257",
    fontSize:
      "12px",
    fontWeight:
      "800",
    textTransform:
      "uppercase",
    letterSpacing:
      "0.14em",
  },

  title: {
    margin:
      "0 0 12px",
    fontSize:
      "42px",
    letterSpacing:
      "-0.045em",
  },

  intro: {
    margin:
      "0 0 28px",
    color:
      "#5b5b55",
    lineHeight:
      "1.7",
  },

  form: {
    display:
      "grid",
    gap:
      "18px",
  },

  label: {
    display:
      "grid",
    gap:
      "8px",
    fontWeight:
      "700",
  },

  input: {
    width:
      "100%",
    boxSizing:
      "border-box",
    padding:
      "14px 16px",
    borderRadius:
      "16px",
    border:
      "1px solid rgba(24,24,24,0.14)",
    background:
      "rgba(255,255,255,0.9)",
    fontSize:
      "16px",
    outline:
      "none",
  },

  message: {
    margin:
      0,
    padding:
      "12px 14px",
    borderRadius:
      "14px",
    background:
      "rgba(180,70,55,0.1)",
    color:
      "#8a3127",
    lineHeight:
      "1.5",
  },

  button: {
    border:
      "none",
    borderRadius:
      "999px",
    padding:
      "15px 20px",
    background:
      "#181818",
    color:
      "#ffffff",
    fontWeight:
      "800",
    cursor:
      "pointer",
  },

  secondaryButton: {
    width:
      "100%",
    marginTop:
      "16px",
    border:
      "1px solid rgba(24,24,24,0.12)",
    borderRadius:
      "999px",
    padding:
      "13px 18px",
    background:
      "rgba(255,255,255,0.55)",
    color:
      "#181818",
    fontWeight:
      "700",
    cursor:
      "pointer",
  },

  actions: {
    display:
      "grid",
    gap:
      "12px",
    marginTop:
      "20px",
  },

  linkButton: {
    border:
      "none",
    background:
      "transparent",
    color:
      "#5A6D55",
    cursor:
      "pointer",
    fontWeight:
      "700",
    textDecoration:
      "underline",
  },
};

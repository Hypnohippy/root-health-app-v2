"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase";

const PENDING_JOIN_KEY =
  "root_pending_organisation_join_v1";

function makeProfileKey() {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `profile-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function OrganisationJoinPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    verifiedOrganisation,
    setVerifiedOrganisation,
  ] = useState(null);

  const [
    joinedOrganisation,
    setJoinedOrganisation,
  ] = useState(null);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [accountMessage, setAccountMessage] =
    useState("");

  useEffect(() => {
    resumePendingJoin();
  }, []);

  function rememberPendingJoin(
    organisation
  ) {
    localStorage.setItem(
      PENDING_JOIN_KEY,
      JSON.stringify({
        organisation_id:
          organisation.id,

        organisation_name:
          organisation.name,

        organisation_code:
          organisation.organisation_code,
      })
    );
  }

  function readPendingJoin() {
    try {
      const stored =
        localStorage.getItem(
          PENDING_JOIN_KEY
        );

      return stored
        ? JSON.parse(stored)
        : null;
    } catch (pendingError) {
      console.error(
        "Could not read pending Root Workplace join:",
        pendingError
      );

      return null;
    }
  }

  async function resumePendingJoin() {
    const pending =
      readPendingJoin();

    if (
      !pending?.organisation_id ||
      !pending?.organisation_code
    ) {
      return;
    }

    setCode(
      pending.organisation_code
    );

    setVerifiedOrganisation({
      id:
        pending.organisation_id,

      name:
        pending.organisation_name,

      organisation_code:
        pending.organisation_code,
    });

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return;
    }

    await completeOrganisationJoin(
      user,
      {
        id:
          pending.organisation_id,

        name:
          pending.organisation_name,

        organisation_code:
          pending.organisation_code,
      }
    );
  }

  async function verifyOrganisation() {
    setLoading(true);
    setError("");
    setAccountMessage("");

    const cleanCode =
      code
        .trim()
        .toUpperCase();

    if (!cleanCode) {
      setError(
        "Please enter your organisation code."
      );

      setLoading(false);
      return;
    }

    const {
      data: organisationData,
      error: organisationError,
    } =
      await supabase
        .from("organisations")
        .select(
          "id, name, organisation_code"
        )
        .eq(
          "organisation_code",
          cleanCode
        )
        .maybeSingle();

    if (
      organisationError ||
      !organisationData
    ) {
      setError(
        "We couldn't find an organisation with that code."
      );

      setLoading(false);
      return;
    }

    rememberPendingJoin(
      organisationData
    );

    setVerifiedOrganisation(
      organisationData
    );

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (user) {
      await completeOrganisationJoin(
        user,
        organisationData
      );

      return;
    }

    setLoading(false);
  }

  async function completeOrganisationJoin(
    user,
    organisationData
  ) {
    if (
      !user?.id ||
      !organisationData?.id
    ) {
      setError(
        "Root could not complete this organisation connection."
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    /*
     * MULTI-ORGANISATION RULE
     *
     * Ask whether this user already belongs
     * to THIS organisation.
     *
     * Do not assume the user has only one
     * organisation membership.
     */
    const {
      data: existingMembership,
      error:
        existingMembershipError,
    } =
      await supabase
        .from(
          "organisation_members"
        )
        .select(
          `
            id,
            organisation_id,
            user_id,
            profile_key,
            email,
            name,
            department,
            role
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "organisation_id",
          organisationData.id
        )
        .maybeSingle();

    if (
      existingMembershipError
    ) {
      console.error(
        "Root employee membership check error:",
        existingMembershipError
      );

      setError(
        "Root could not verify your organisation access."
      );

      setLoading(false);
      return;
    }

    let membership =
      existingMembership;

    if (!membership) {
      const profileKey =
        makeProfileKey();

      const {
        data:
          newMembership,
        error:
          membershipError,
      } =
        await supabase
          .from(
            "organisation_members"
          )
          .insert({
            organisation_id:
              organisationData.id,

            user_id:
              user.id,

            profile_key:
              profileKey,

            email:
              user.email ||
              null,

            name:
              user.user_metadata
                ?.name ||
              null,

            department:
              null,

            role:
              "employee",

            invited_at:
              new Date()
                .toISOString(),

            activated_at:
              new Date()
                .toISOString(),

            created_at:
              new Date()
                .toISOString(),
          })
          .select(
            `
              id,
              organisation_id,
              user_id,
              profile_key,
              email,
              name,
              department,
              role
            `
          )
          .single();

      if (
        membershipError ||
        !newMembership
      ) {
        console.error(
          "Root employee membership creation error:",
          membershipError
        );

        setError(
          "Root could not connect your account to this organisation. Please try again."
        );

        setLoading(false);
        return;
      }

      membership =
        newMembership;
    }

    localStorage.setItem(
      "root_profile_key_v1",
      membership.profile_key
    );

    localStorage.setItem(
      "root_active_organisation_v1",
      organisationData.id
    );

    localStorage.setItem(
      "root_profile_v1",
      JSON.stringify({
        profile_key:
          membership.profile_key,

        email:
          membership.email ||
          user.email ||
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
          organisationData.id,

        organisation_name:
          organisationData.name,

        organisation_code:
          organisationData.organisation_code,

        role:
          membership.role ||
          "employee",

        joined_at:
          Date.now(),
      })
    );

    /*
     * Only remove HR context when this
     * membership really is an employee.
     *
     * An existing HR/Organisation Admin
     * should not lose their Workplace
     * administrator context.
     */
    if (
      membership.role ===
      "employee"
    ) {
      localStorage.removeItem(
        "root_hr_org_v1"
      );
    }

    localStorage.removeItem(
      PENDING_JOIN_KEY
    );

    setJoinedOrganisation(
      organisationData
    );

    setVerifiedOrganisation(
      organisationData
    );

    setLoading(false);
  }

  async function createAccount() {
    setError("");
    setAccountMessage("");

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (
      !password ||
      password.length < 8
    ) {
      setError(
        "Please create a password of at least 8 characters."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Your passwords do not match."
      );
      return;
    }

    if (
      !verifiedOrganisation
    ) {
      setError(
        "Please verify your organisation first."
      );
      return;
    }

    setLoading(true);

    const {
      data,
      error:
        signUpError,
    } =
      await supabase.auth.signUp({
        email:
          cleanEmail,

        password,
      });

    if (signUpError) {
      setError(
        signUpError.message ||
        "Root could not create your account."
      );

      setLoading(false);
      return;
    }

    /*
     * Some Supabase projects create a
     * signed-in session immediately.
     *
     * Others require email confirmation.
     */
    if (
      data?.user &&
      data?.session
    ) {
      await completeOrganisationJoin(
        data.user,
        verifiedOrganisation
      );

      return;
    }

    setAccountMessage(
      "Your Root account has been created. Please check your email if Root asks you to confirm your address, then sign in to continue joining your organisation."
    );

    setLoading(false);
  }

  function goToLogin() {
    if (
      verifiedOrganisation
    ) {
      rememberPendingJoin(
        verifiedOrganisation
      );
    }

    window.location.href =
      "/login";
  }

  if (joinedOrganisation) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Welcome to{" "}
            {
              joinedOrganisation.name
            }{" "}
            ✅
          </h1>

          <p style={styles.text}>
            You are now connected to
            your organisation&apos;s
            Root Health Workplace
            Programme.
          </p>

          <p style={styles.text}>
            Your personal Root
            experience remains private.
            Your organisation only sees
            anonymous wellbeing trends.
          </p>

          <button
            style={styles.button}
            onClick={() => {
              window.location.href =
                "/organisation/profile";
            }}
          >
            Continue to Orientation
          </button>
        </section>
      </main>
    );
  }

  if (verifiedOrganisation) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Join{" "}
            {
              verifiedOrganisation.name
            }
          </h1>

          <p style={styles.text}>
            Root has verified your
            organisation.
          </p>

          <div style={styles.verifiedBox}>
            <strong>
              {
                verifiedOrganisation.name
              }
            </strong>

            <span>
              {
                verifiedOrganisation.organisation_code
              }
            </span>
          </div>

          <h2 style={styles.subTitle}>
            Create your private Root
            account
          </h2>

          <p style={styles.text}>
            Your account belongs to
            you. Your employer will not
            see your personal
            responses, reflections,
            conversations or health
            information.
          </p>

          <label style={styles.label}>
            Email address
          </label>

          <input
            type="email"
            style={styles.input}
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            autoComplete="email"
          />

          <label style={styles.label}>
            Create password
          </label>

          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />

          <label style={styles.label}>
            Confirm password
          </label>

          <input
            type="password"
            style={styles.input}
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            autoComplete="new-password"
          />

          {error ? (
            <p style={styles.error}>
              {error}
            </p>
          ) : null}

          {accountMessage ? (
            <p
              style={
                styles.success
              }
            >
              {accountMessage}
            </p>
          ) : null}

          <button
            style={styles.button}
            onClick={
              createAccount
            }
            disabled={loading}
          >
            {loading
              ? "Creating your account..."
              : "Create account & join"}
          </button>

          <button
            type="button"
            style={
              styles.secondaryButton
            }
            onClick={goToLogin}
            disabled={loading}
          >
            Already use Root? Sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>
          Root Workplace
        </p>

        <h1 style={styles.title}>
          Join your organisation
        </h1>

        <p style={styles.text}>
          Enter the organisation code
          provided by your employer to
          join their Root Health
          Workplace Programme.
        </p>

        <label style={styles.label}>
          Organisation code
        </label>

        <input
          style={styles.input}
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value
            )
          }
          placeholder="e.g. BRONTE-UK-T3Y0"
        />

        {error ? (
          <p style={styles.error}>
            {error}
          </p>
        ) : null}

        <button
          style={styles.button}
          onClick={
            verifyOrganisation
          }
          disabled={loading}
        >
          {loading
            ? "Checking code..."
            : "Continue"}
        </button>

        <button
          type="button"
          style={
            styles.secondaryButton
          }
          onClick={() => {
            window.location.href =
              "/login";
          }}
        >
          Already use Root? Sign in
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px",
    background: "#EFE9DE",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "100%",
    maxWidth: "720px",
    padding: "38px",
    borderRadius: "36px",
    background:
      "rgba(255,255,255,0.76)",
    border:
      "1px solid rgba(255,255,255,0.85)",
    boxShadow:
      "0 28px 90px rgba(20,18,15,0.14)",
  },

  kicker: {
    margin: "0 0 10px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    fontWeight: "800",
    color: "#776C5B",
  },

  title: {
    margin: "0 0 16px",
    fontSize: "42px",
    lineHeight: "1.1",
    color: "#181818",
    letterSpacing: "-0.04em",
  },

  subTitle: {
    margin: "26px 0 8px",
    fontSize: "24px",
    color: "#181818",
  },

  text: {
    color: "#4D463B",
    lineHeight: "1.8",
    fontSize: "17px",
  },

  verifiedBox: {
    display: "grid",
    gap: "5px",
    padding: "16px 18px",
    margin: "18px 0",
    borderRadius: "18px",
    background:
      "rgba(87,112,78,0.09)",
    color: "#33412F",
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
    border:
      "1px solid rgba(24,24,24,0.16)",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  button: {
    marginTop: "24px",
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "15px 22px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "15px",
  },

  secondaryButton: {
    marginTop: "12px",
    width: "100%",
    border:
      "1px solid rgba(24,24,24,0.14)",
    borderRadius: "999px",
    padding: "14px 22px",
    background:
      "rgba(255,255,255,0.58)",
    color: "#181818",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "15px",
  },

  error: {
    marginTop: "16px",
    color: "#9F1D1D",
    fontWeight: "800",
  },

  success: {
    marginTop: "16px",
    padding: "14px 16px",
    borderRadius: "16px",
    background:
      "rgba(72,119,84,0.10)",
    color: "#31543C",
    lineHeight: "1.6",
    fontWeight: "700",
  },
};
"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

const TOKEN_STORAGE_KEY =
  "root_workplace_setup_token_v1";

export default function WorkplaceSetupPage() {
  const [token, setToken] =
    useState("");

  const [invite, setInvite] =
    useState(null);

  const [application, setApplication] =
    useState(null);

  const [signedInUser, setSignedInUser] =
    useState(null);

  const [authMode, setAuthMode] =
    useState("create");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [authLoading, setAuthLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [verificationSent, setVerificationSent] =
    useState(false);

  useEffect(() => {
    initialise();
  }, []);

  async function initialise() {
    setLoading(true);
    setError("");

    const params =
      new URLSearchParams(
        window.location.search
      );

    const queryToken =
      String(
        params.get("token") ||
          ""
      ).trim();

    const storedToken =
      sessionStorage.getItem(
        TOKEN_STORAGE_KEY
      ) || "";

    const setupToken =
      queryToken ||
      storedToken;

    if (!setupToken) {
      setError(
        "This Workplace setup link is incomplete."
      );

      setLoading(false);
      return;
    }

    /*
     * Keep the secret only for this browser
     * session, then remove it from the URL.
     */
    sessionStorage.setItem(
      TOKEN_STORAGE_KEY,
      setupToken
    );

    if (queryToken) {
      window.history.replaceState(
        {},
        document.title,
        "/workplace-setup"
      );
    }

    setToken(
      setupToken
    );

    const response =
      await fetch(
        `/api/organisation/setup-invite?token=${encodeURIComponent(
          setupToken
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result?.success
    ) {
      setError(
        result?.error ||
          "Root could not verify this Workplace setup invitation."
      );

      setLoading(false);
      return;
    }

    setInvite(
      result.invitation
    );

    setApplication(
      result.application
    );

    setName(
      result.application
        ?.contactName ||
        ""
    );

    setEmail(
      result.invitation
        ?.intendedEmail ||
        ""
    );

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    setSignedInUser(
      user || null
    );

    setLoading(false);
  }

  function normaliseEmail(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  const intendedEmail =
    normaliseEmail(
      invite?.intendedEmail
    );

  const signedInEmail =
    normaliseEmail(
      signedInUser?.email
    );

  const wrongAccount =
    Boolean(
      signedInUser &&
      intendedEmail &&
      signedInEmail !==
        intendedEmail
    );

  const correctAccount =
    Boolean(
      signedInUser &&
      intendedEmail &&
      signedInEmail ===
        intendedEmail
    );

  async function useDifferentAccount() {
    await supabase.auth.signOut();

    setSignedInUser(
      null
    );

    setPassword("");
    setConfirmPassword("");
    setAuthMode("create");
    setError("");
  }

  async function createAccount() {
    setError("");

    const cleanName =
      name.trim();

    const cleanEmail =
      normaliseEmail(email);

    if (
      !cleanName ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setError(
        "Please complete your name, email address and password."
      );
      return;
    }

    if (
      cleanEmail !==
      intendedEmail
    ) {
      setError(
        `This Workplace invitation was issued to ${invite.intendedEmail}.`
      );
      return;
    }

    if (
      password.length < 8
    ) {
      setError(
        "Please choose a password containing at least 8 characters."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "The two passwords do not match."
      );
      return;
    }

    setAuthLoading(true);

    const returnUrl =
      `${window.location.origin}/workplace-setup`;

    const {
      data,
      error:
        signUpError,
    } =
      await supabase.auth.signUp({
        email:
          cleanEmail,

        password,

        options: {
          emailRedirectTo:
            returnUrl,

          data: {
            name:
              cleanName,

            full_name:
              cleanName,
          },
        },
      });

    if (signUpError) {
      setError(
        signUpError.message
      );

      setAuthLoading(false);
      return;
    }

    /*
     * Supabase can return an existing-user
     * shaped response without a usable new
     * identity.
     */
    if (
      data?.user &&
      Array.isArray(
        data.user.identities
      ) &&
      data.user.identities.length === 0
    ) {
      setAuthMode(
        "signin"
      );

      setPassword("");
      setConfirmPassword("");

      setError(
        "A Root account already exists for this email address. Please sign in using the existing password."
      );

      setAuthLoading(false);
      return;
    }

    if (
      data?.session &&
      data?.user
    ) {
      setSignedInUser(
        data.user
      );

      setAuthLoading(false);
      return;
    }

    setVerificationSent(
      true
    );

    setAuthLoading(false);
  }

  async function signIn() {
    setError("");

    const cleanEmail =
      normaliseEmail(email);

    if (
      cleanEmail !==
      intendedEmail
    ) {
      setError(
        `This Workplace invitation was issued to ${invite.intendedEmail}.`
      );
      return;
    }

    if (
      !cleanEmail ||
      !password
    ) {
      setError(
        "Please enter your email address and password."
      );
      return;
    }

    setAuthLoading(true);

    const {
      data,
      error:
        signInError,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            cleanEmail,

          password,
        });

    if (
      signInError ||
      !data?.user
    ) {
      setError(
        signInError?.message ||
          "Root could not sign you in."
      );

      setAuthLoading(false);
      return;
    }

    const actualEmail =
      normaliseEmail(
        data.user.email
      );

    if (
      actualEmail !==
      intendedEmail
    ) {
      await supabase.auth.signOut();

      setError(
        "That Root account does not match this Workplace invitation."
      );

      setAuthLoading(false);
      return;
    }

    setSignedInUser(
      data.user
    );

    setAuthLoading(false);
  }

  function continueToOrganisationSetup() {
    if (
      !correctAccount ||
      !token
    ) {
      setError(
        "Root could not verify the account for this Workplace invitation."
      );

      return;
    }

    /*
     * Organisation Learning will consume
     * this token and the server will verify
     * it again before organisation access
     * can be created.
     */
    sessionStorage.setItem(
      TOKEN_STORAGE_KEY,
      token
    );

    window.location.href =
      "/organisation-learning?setup=secure";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Checking your secure invitation...
          </h1>
        </section>
      </main>
    );
  }

  if (
    error &&
    !invite
  ) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Workplace setup
          </h1>

          <p style={styles.error}>
            {error}
          </p>
        </section>
      </main>
    );
  }

  if (verificationSent) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Check your email
          </h1>

          <p style={styles.text}>
            Root has sent an account
            verification message to:
          </p>

          <div style={styles.emailBox}>
            {intendedEmail}
          </div>

          <p style={styles.text}>
            Open the verification message.
            Root will return you to this
            secure Workplace setup.
          </p>
        </section>
      </main>
    );
  }

  if (wrongAccount) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Different Root account
          </h1>

          <p style={styles.text}>
            This invitation is for the
            authorised administrator of{" "}
            <strong>
              {application?.organisationName}
            </strong>.
          </p>

          <div style={styles.warningBox}>
            <p style={styles.warningLabel}>
              Currently signed in
            </p>

            <strong>
              {signedInUser.email}
            </strong>

            <p style={styles.warningLabel}>
              Invitation issued to
            </p>

            <strong>
              {invite.intendedEmail}
            </strong>
          </div>

          <p style={styles.text}>
            Root will not attach this
            organisation to the account
            currently signed in.
          </p>

          <button
            type="button"
            style={styles.button}
            onClick={
              useDifferentAccount
            }
          >
            Sign out and continue
          </button>
        </section>
      </main>
    );
  }

  if (correctAccount) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Invitation verified
          </h1>

          <p style={styles.text}>
            You are signed into the Root
            account that received this
            Workplace invitation.
          </p>

          <div style={styles.organisationBox}>
            <strong>
              {application?.organisationName}
            </strong>

            <span>
              Organisation Administrator
            </span>

            <span>
              {signedInUser.email}
            </span>
          </div>

          <button
            type="button"
            style={styles.button}
            onClick={
              continueToOrganisationSetup
            }
          >
            Continue to organisation setup
          </button>

          <button
            type="button"
            style={styles.accountButton}
            onClick={
              useDifferentAccount
            }
          >
            Not {signedInUser.email}? Use another account
          </button>

          {error ? (
            <p style={styles.error}>
              {error}
            </p>
          ) : null}
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
          Set up Root Workplace
        </h1>

        <p style={styles.text}>
          You have been invited to become
          the authorised Root Workplace
          administrator for{" "}
          <strong>
            {application?.organisationName}
          </strong>.
        </p>

        <div style={styles.modeButtons}>
          <button
            type="button"
            style={{
              ...styles.modeButton,
              ...(authMode === "create"
                ? styles.modeButtonActive
                : {}),
            }}
            onClick={() =>
              setAuthMode("create")
            }
          >
            New to Root
          </button>

          <button
            type="button"
            style={{
              ...styles.modeButton,
              ...(authMode === "signin"
                ? styles.modeButtonActive
                : {}),
            }}
            onClick={() =>
              setAuthMode("signin")
            }
          >
            Already use Root
          </button>
        </div>

        {authMode === "create" ? (
          <>
            <label style={styles.label}>
              Your name
            </label>

            <input
              style={styles.input}
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
            />
          </>
        ) : null}

        <label style={styles.label}>
          Administrator email
        </label>

        <input
          style={{
            ...styles.input,
            ...styles.lockedInput,
          }}
          type="email"
          value={email}
          readOnly
        />

        <p style={styles.note}>
          This invitation was issued to
          this email address. Root will not
          create Workplace access for a
          different account.
        </p>

        <label style={styles.label}>
          Password
        </label>

        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
          placeholder={
            authMode === "create"
              ? "Create a secure password"
              : "Enter your Root password"
          }
        />

        {authMode === "create" ? (
          <>
            <label style={styles.label}>
              Confirm password
            </label>

            <input
              style={styles.input}
              type="password"
              value={
                confirmPassword
              }
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
            />
          </>
        ) : null}

        {error ? (
          <p style={styles.error}>
            {error}
          </p>
        ) : null}

        <button
          type="button"
          style={styles.button}
          disabled={authLoading}
          onClick={
            authMode === "create"
              ? createAccount
              : signIn
          }
        >
          {authLoading
            ? "Please wait..."
            : authMode === "create"
            ? "Create Root account"
            : "Sign in and continue"}
        </button>
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
      "linear-gradient(145deg,#eef2e8 0%,#f8f5ee 55%,#e9eee3 100%)",
    color: "#181818",
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',
  },

  card: {
    width: "100%",
    maxWidth: "620px",
    boxSizing: "border-box",
    padding: "40px",
    borderRadius: "34px",
    background:
      "rgba(255,255,255,0.76)",
    border:
      "1px solid rgba(255,255,255,0.9)",
    boxShadow:
      "0 30px 90px rgba(20,18,15,0.14)",
  },

  kicker: {
    margin: "0 0 10px",
    color: "#66725E",
    fontWeight: "800",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
  },

  title: {
    margin: "0 0 16px",
    fontSize:
      "clamp(34px,7vw,48px)",
    letterSpacing: "-0.04em",
  },

  text: {
    color: "#4D463B",
    lineHeight: "1.75",
  },

  label: {
    display: "block",
    marginTop: "18px",
    marginBottom: "8px",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    borderRadius: "16px",
    border:
      "1px solid rgba(38,50,36,0.16)",
    background:
      "rgba(255,255,255,0.82)",
    fontSize: "15px",
  },

  lockedInput: {
    background:
      "rgba(237,241,231,0.82)",
  },

  note: {
    margin: "8px 0 0",
    color: "#66705F",
    fontSize: "12px",
    lineHeight: "1.5",
  },

  modeButtons: {
    margin: "24px 0 8px",
    padding: "5px",
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "5px",
    borderRadius: "999px",
    background:
      "rgba(70,88,62,0.08)",
  },

  modeButton: {
    border: "none",
    borderRadius: "999px",
    padding: "12px",
    background: "transparent",
    cursor: "pointer",
    fontWeight: "800",
  },

  modeButtonActive: {
    background: "#FFFFFF",
    boxShadow:
      "0 8px 24px rgba(31,43,29,0.10)",
  },

  button: {
    width: "100%",
    marginTop: "24px",
    border: "none",
    borderRadius: "999px",
    padding: "15px 22px",
    background: "#263224",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
  },

  accountButton: {
    width: "100%",
    marginTop: "12px",
    border: "none",
    background: "transparent",
    color: "#66705F",
    cursor: "pointer",
    textDecoration: "underline",
  },

  warningBox: {
    margin: "22px 0",
    padding: "20px",
    borderRadius: "20px",
    background:
      "rgba(159,29,29,0.07)",
    display: "grid",
    gap: "6px",
  },

  warningLabel: {
    margin: "8px 0 0",
    color: "#7A625F",
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "uppercase",
  },

  organisationBox: {
    margin: "22px 0",
    padding: "20px",
    borderRadius: "20px",
    background:
      "rgba(237,241,231,0.82)",
    display: "grid",
    gap: "8px",
  },

  emailBox: {
    margin: "18px 0",
    padding: "15px 18px",
    borderRadius: "18px",
    background:
      "rgba(237,241,231,0.82)",
    fontWeight: "900",
    wordBreak: "break-word",
  },

  error: {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "18px",
    color: "#8F2929",
    background:
      "rgba(159,29,29,0.08)",
    lineHeight: "1.7",
    fontWeight: "700",
  },
};

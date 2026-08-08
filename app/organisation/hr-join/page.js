"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { supabase } from "../../../lib/supabase";
import { useRoot } from "../../../context/RootContext";

export default function OrganisationHRJoinPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { refreshIdentity } = useRoot();

  const [invite, setInvite] = useState(null);

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [error, setError] = useState("");
  const [verificationSent, setVerificationSent] =
    useState(false);

  const [authMode, setAuthMode] = useState("create");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [signedInUser, setSignedInUser] =
    useState(null);

  useEffect(() => {
    initialisePage();
  }, [token]);

  async function initialisePage() {
    setLoading(true);
    setError("");

    if (!token) {
      setError(
        "This HR invitation link is incomplete."
      );
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSignedInUser(null);
      setLoading(false);
      return;
    }

    setSignedInUser(user);

    await loadInvitation(user);
  }

  async function loadInvitation(user) {
    setLoading(true);
    setError("");

    const { data, error: inviteError } =
      await supabase
        .from("organisation_hr_invites")
        .select(
  `
    id,
    organisation_id,
    organisation_unit_id,
    email,
    role,
    token,
    status,
    expires_at,

    organisation_units (
      id,
      name,
      unit_type,
      parent_unit_id
    ),

    organisations (
      id,
      name,
      organisation_code
    )
  `
)
        .eq("token", token)
        .maybeSingle();

    if (inviteError || !data) {
      setError(
        "Root could not find this HR invitation. Please make sure you are signed in using the email address that received it."
      );
      setLoading(false);
      return;
    }

    const invitationEmail = String(
      data.email || ""
    ).toLowerCase();

    const signedInEmail = String(
      user?.email || ""
    ).toLowerCase();

    if (invitationEmail !== signedInEmail) {
      setError(
        `This invitation was issued to ${data.email}. Please sign in using that email address.`
      );
      setLoading(false);
      return;
    }

    if (data.status === "accepted") {
      setError(
        "This HR invitation has already been accepted."
      );
      setLoading(false);
      return;
    }

    if (data.status === "revoked") {
      setError(
        "This HR invitation has been withdrawn."
      );
      setLoading(false);
      return;
    }

    if (
      new Date(data.expires_at).getTime() <=
      Date.now()
    ) {
      setError(
        "This HR invitation has expired. Ask your organisation administrator to send another."
      );
      setLoading(false);
      return;
    }

    setInvite(data);
    setEmail(data.email || "");
    setLoading(false);
  }

  async function createAccount() {
    setError("");

    const cleanName = name.trim();
    const cleanEmail =
      email.trim().toLowerCase();

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

    if (!cleanEmail.includes("@")) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Please choose a password containing at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "The two passwords do not match."
      );
      return;
    }

    setAuthLoading(true);

    const returnUrl =
      `${window.location.origin}` +
      `/organisation/hr-join?token=` +
      encodeURIComponent(token);

    const {
      data,
      error: signUpError,
    } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: returnUrl,
        data: {
          name: cleanName,
          full_name: cleanName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setAuthLoading(false);
      return;
    }

    if (data?.session && data?.user) {
  setSignedInUser(data.user);
  await loadInvitation(data.user);
  setAuthLoading(false);
  return;
}

if (
  data?.user &&
  Array.isArray(data.user.identities) &&
  data.user.identities.length === 0
) {
  setAuthMode("signin");
  setPassword("");
  setConfirmPassword("");
  setError(
    "A Root account already exists for this email address. Please sign in using your existing password, or reset it if you have forgotten it."
  );
  setAuthLoading(false);
  return;
}

setVerificationSent(true);
setAuthLoading(false);
  }

  async function signIn() {
    setError("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError(
        "Please enter your email address and password."
      );
      return;
    }

    setAuthLoading(true);

    const {
      data,
      error: signInError,
    } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (signInError || !data?.user) {
      setError(
        signInError?.message ||
          "Root could not sign you in."
      );
      setAuthLoading(false);
      return;
    }

    setSignedInUser(data.user);

    await loadInvitation(data.user);

    setAuthLoading(false);
  }

  async function useDifferentAccount() {
    await supabase.auth.signOut();

    setSignedInUser(null);
    setInvite(null);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setAuthMode("create");
  }

  async function acceptInvitation() {
    if (!invite) return;

    setAccepting(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "Please sign in before accepting the invitation."
      );
      setAccepting(false);
      return;
    }

    const { data: existingMembership } =
      await supabase
        .from("organisation_members")
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
        .eq("user_id", user.id)
        .eq(
          "organisation_id",
          invite.organisation_id
        )
        .maybeSingle();

    let membership = existingMembership;

    if (!membership) {
      const profileKey = crypto.randomUUID();

      const {
        data: createdMembership,
        error: membershipError,
      } = await supabase
        .from("organisation_members")
        .insert({
          organisation_id:
            invite.organisation_id,

          user_id: user.id,

          profile_key: profileKey,

          email:
            user.email ||
            invite.email,

          name:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            "",

          department:
            invite.organisation_units?.name || "HR",

          organisation_unit_id:
            invite.organisation_unit_id,

          role: "hr_admin",
          invited_at:
            new Date().toISOString(),

          activated_at:
            new Date().toISOString(),

          created_at:
            new Date().toISOString(),
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
        !createdMembership
      ) {
        setError(
          membershipError?.message ||
            "Root could not create HR access."
        );
        setAccepting(false);
        return;
      }

      membership = createdMembership;
    } else if (
      membership.role === "employee"
    ) {
      const {
        data: updatedMembership,
        error: updateError,
      } = await supabase
        .from("organisation_members")
        .update({
          role: "hr_admin",
          department:
       invite.organisation_units?.name ||
       membership.department ||
         "HR",

          organisation_unit_id:
       invite.organisation_unit_id,
          activated_at:
            new Date().toISOString(),
        })
        .eq("id", membership.id)
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
        updateError ||
        !updatedMembership
      ) {
        setError(
          updateError?.message ||
            "Root could not activate HR access."
        );
        setAccepting(false);
        return;
      }

      membership = updatedMembership;
    }

    const { error: inviteUpdateError } =
      await supabase
        .from("organisation_hr_invites")
        .update({
          status: "accepted",
          accepted_at:
            new Date().toISOString(),
        })
        .eq("id", invite.id);

    if (inviteUpdateError) {
      setError(
        "HR access was created, but Root could not close the invitation."
      );
      setAccepting(false);
      return;
    }

    localStorage.setItem(
      "root_active_experience_v1",
      "workplace"
    );

    localStorage.setItem(
      "root_active_organisation_v1",
      invite.organisation_id
    );

    await refreshIdentity();

    window.location.href = "/org-insights";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Checking your HR invitation...
          </h1>
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
            Root has sent a secure verification
            link to:
          </p>

          <div style={styles.emailBox}>
            {email}
          </div>

          <p style={styles.text}>
            Open that email and select the
            verification link. Root will bring you
            back to this HR invitation so you can
            finish creating access.
          </p>
        </section>
      </main>
    );
  }

  if (!signedInUser) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Join the HR team
          </h1>

          <p style={styles.text}>
            Create your Root account or sign in to
            accept this secure HR invitation.
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
              Create account
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
              Sign in
            </button>
          </div>

          {authMode === "create" && (
            <>
              <label style={styles.label}>
                Your name
              </label>

              <input
                style={styles.input}
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="e.g. Sarah Jones"
              />
            </>
          )}

          <label style={styles.label}>
            Email address
          </label>

          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="e.g. sarah@company.co.uk"
          />

          <label style={styles.label}>
            Password
          </label>

          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder={
              authMode === "create"
                ? "Create a secure password"
                : "Enter your Root password"
            }
          />

          {authMode === "create" && (
            <>
              <label style={styles.label}>
                Confirm password
              </label>

              <input
                style={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Enter the password again"
              />
            </>
          )}

          {error ? (
            <p style={styles.error}>
              {error}
            </p>
          ) : null}

          <button
            type="button"
            style={styles.button}
            onClick={
              authMode === "create"
                ? createAccount
                : signIn
            }
            disabled={authLoading}
          >
            {authLoading
              ? "Please wait..."
              : authMode === "create"
              ? "Create Root Account"
              : "Sign In and Continue"}
          </button>
        </section>
      </main>
    );
  }

  if (error && !invite) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            HR invitation
          </h1>

          <p style={styles.error}>
            {error}
          </p>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={useDifferentAccount}
          >
            Use a different Root account
          </button>
        </section>
      </main>
    );
  }

  const organisationName =
    invite?.organisations?.name ||
    "your organisation";

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>
          Root Workplace
        </p>

        <h1 style={styles.title}>
          Join the HR team
        </h1>

        <p style={styles.text}>
          You have been invited to help manage{" "}
          <strong>{organisationName}</strong>{" "}
          inside Root Workplace.
        </p>

        <div style={styles.accessBox}>
          <p style={styles.accessTitle}>
            Your Root access
          </p>

          <p style={styles.accessItem}>
            ✓ Your own private Personal Root journey
          </p>

          <p style={styles.accessItem}>
            ✓ Workplace mode and Organisation Insights
          </p>

          <p style={styles.accessItem}>
            ✓ Organisation Learning and Executive Review
          </p>

          <p style={styles.accessItem}>
            ✓ Employee invitations and organisational support
          </p>
        </div>

        <p style={styles.privacyText}>
          Your personal Root information remains
          separate and private. Other HR users share
          the organisation platform, not one another’s
          personal wellbeing records.
        </p>

        {error ? (
          <p style={styles.error}>
            {error}
          </p>
        ) : null}

        <button
          type="button"
          style={styles.button}
          onClick={acceptInvitation}
          disabled={accepting}
        >
          {accepting
            ? "Creating HR access..."
            : "Accept HR Invitation"}
        </button>

        <button
          type="button"
          style={styles.accountButton}
          onClick={useDifferentAccount}
        >
          Not {signedInUser?.email}? Use another account
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px 20px",
    boxSizing: "border-box",
    background:
      "linear-gradient(145deg, #eef2e8 0%, #f8f5ee 55%, #e9eee3 100%)",
    display: "grid",
    placeItems: "center",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },

  card: {
    width: "min(720px, 100%)",
    padding: "38px",
    boxSizing: "border-box",
    borderRadius: "36px",
    background: "rgba(255,255,255,0.76)",
    border:
      "1px solid rgba(255,255,255,0.88)",
    boxShadow:
      "0 28px 90px rgba(20,18,15,0.14)",
  },

  kicker: {
    margin: "0 0 10px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    fontWeight: "800",
    color: "#66725E",
  },

  title: {
    margin: "0 0 16px",
    fontSize: "clamp(36px, 7vw, 52px)",
    lineHeight: "1.05",
    color: "#181818",
    letterSpacing: "-0.045em",
    fontFamily: "Georgia, serif",
    fontWeight: "500",
  },

  text: {
    color: "#4D463B",
    lineHeight: "1.8",
    fontSize: "17px",
  },

  modeButtons: {
    margin: "24px 0 8px",
    padding: "5px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "5px",
    borderRadius: "999px",
    background: "rgba(70,88,62,0.08)",
  },

  modeButton: {
    border: "none",
    borderRadius: "999px",
    padding: "12px",
    background: "transparent",
    color: "#5A6254",
    cursor: "pointer",
    fontWeight: "800",
  },

  modeButtonActive: {
    background: "#FFFFFF",
    color: "#263224",
    boxShadow:
      "0 8px 24px rgba(31,43,29,0.10)",
  },

  label: {
    display: "block",
    marginTop: "18px",
    marginBottom: "8px",
    color: "#263224",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    padding: "14px",
    boxSizing: "border-box",
    borderRadius: "16px",
    border:
      "1px solid rgba(38,50,36,0.16)",
    background: "rgba(255,255,255,0.78)",
    color: "#181818",
    fontSize: "15px",
  },

  accessBox: {
    marginTop: "24px",
    padding: "22px",
    borderRadius: "24px",
    background: "rgba(237,241,231,0.74)",
    border:
      "1px solid rgba(70,88,62,0.12)",
  },

  accessTitle: {
    margin: "0 0 14px",
    color: "#263224",
    fontWeight: "900",
  },

  accessItem: {
    margin: "9px 0",
    color: "#46513F",
    lineHeight: "1.6",
  },

  privacyText: {
    marginTop: "20px",
    padding: "17px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.54)",
    color: "#596153",
    lineHeight: "1.7",
    fontSize: "14px",
  },

  emailBox: {
    margin: "18px 0",
    padding: "15px 18px",
    borderRadius: "18px",
    background: "rgba(237,241,231,0.82)",
    color: "#263224",
    fontWeight: "900",
    wordBreak: "break-word",
  },

  button: {
    marginTop: "24px",
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "15px 22px",
    background: "#263224",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "15px",
  },

  secondaryButton: {
    marginTop: "18px",
    width: "100%",
    border:
      "1px solid rgba(38,50,36,0.16)",
    borderRadius: "999px",
    padding: "14px 20px",
    background: "rgba(255,255,255,0.64)",
    color: "#263224",
    cursor: "pointer",
    fontWeight: "800",
  },

  accountButton: {
    marginTop: "12px",
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#66705F",
    cursor: "pointer",
    fontSize: "13px",
    textDecoration: "underline",
  },

  error: {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "18px",
    color: "#8F2929",
    background: "rgba(159,29,29,0.08)",
    lineHeight: "1.7",
    fontWeight: "700",
  },
};
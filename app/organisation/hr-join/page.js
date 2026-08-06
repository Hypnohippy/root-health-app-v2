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
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvitation() {
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
        const returnPath =
          `/organisation/hr-join?token=${encodeURIComponent(
            token
          )}`;

        window.location.href =
          `/login?returnTo=${encodeURIComponent(
            returnPath
          )}`;

        return;
      }

      const { data, error: inviteError } =
        await supabase
          .from("organisation_hr_invites")
          .select(
            `
              id,
              organisation_id,
              email,
              role,
              token,
              status,
              expires_at,
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
          "Root could not find this HR invitation."
        );
        setLoading(false);
        return;
      }

      if (
        String(data.email).toLowerCase() !==
        String(user.email || "").toLowerCase()
      ) {
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
      setLoading(false);
    }

    loadInvitation();
  }, [token]);

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

          email: user.email || invite.email,

          name:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            "",

          department: "HR",

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
            membership.department || "HR",
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

  if (error) {
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
            style={styles.button}
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Sign in to Root
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
          <strong>{organisationName}</strong>
          {" "}inside Root Workplace.
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
    border: "1px solid rgba(255,255,255,0.88)",
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

  accessBox: {
    marginTop: "24px",
    padding: "22px",
    borderRadius: "24px",
    background: "rgba(237,241,231,0.74)",
    border: "1px solid rgba(70,88,62,0.12)",
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

  error: {
    padding: "16px",
    borderRadius: "18px",
    color: "#8F2929",
    background: "rgba(159,29,29,0.08)",
    lineHeight: "1.7",
    fontWeight: "700",
  },
};

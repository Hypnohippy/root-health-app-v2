"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

import {
  getRootIdentity,
  getStoredRootIdentity,
  setActiveExperience,
  setActiveOrganisation,
} from "../../lib/rootIdentity";

export default function ChooseOrganisationPage() {
  const [memberships, setMemberships] =
    useState([]);

  const [organisations, setOrganisations] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadChoices();
  }, []);

  async function loadChoices() {
    setLoading(true);
    setMessage("");

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      window.location.href =
        "/login";

      return;
    }

    const {
      data: membershipData,
      error: membershipError,
    } =
      await supabase
        .from(
          "organisation_members"
        )
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
          user.id
        );

    if (membershipError) {
      setMessage(
        "Root could not load your organisation choices."
      );

      setLoading(false);
      return;
    }

    const safeMemberships =
      Array.isArray(
        membershipData
      )
        ? membershipData
        : [];

    if (
      safeMemberships.length === 0
    ) {
      window.location.href =
        "/";

      return;
    }

    if (
      safeMemberships.length === 1
    ) {
      await chooseMembership(
        safeMemberships[0]
      );

      return;
    }

    const organisationIds =
      [
        ...new Set(
          safeMemberships
            .map(
              (membership) =>
                membership
                  .organisation_id
            )
            .filter(Boolean)
        ),
      ];

    const {
      data: organisationData,
      error: organisationError,
    } =
      await supabase
        .from("organisations")
        .select(
          `
            id,
            name
          `
        )
        .in(
          "id",
          organisationIds
        );

    if (organisationError) {
      setMessage(
        "Root could not load the organisation names."
      );

      setLoading(false);
      return;
    }

    const organisationMap =
      {};

    (
      Array.isArray(
        organisationData
      )
        ? organisationData
        : []
    ).forEach(
      (organisation) => {
        organisationMap[
          organisation.id
        ] =
          organisation;
      }
    );

    setOrganisations(
      organisationMap
    );

    setMemberships(
      safeMemberships
    );

    setLoading(false);
  }

  function roleLabel(role) {
    if (
      role ===
      "organisation_admin"
    ) {
      return "Organisation Admin";
    }

    if (
      role ===
      "hr_admin"
    ) {
      return "HR Administrator";
    }

    if (
      role ===
      "employee"
    ) {
      return "Employee";
    }

    if (
      role ===
      "unit_admin"
    ) {
      return "Unit Administrator";
    }

    return (
      role ||
      "Organisation member"
    );
  }

  async function chooseMembership(
    membership
  ) {
    if (
      !membership
        ?.organisation_id
    ) {
      setMessage(
        "Root could not identify this organisation."
      );

      return;
    }

    setLoading(true);
    setMessage("");

    /*
     * Establish the exact organisation
     * membership chosen by the human.
     */
    setActiveOrganisation(
      membership.organisation_id
    );

    /*
     * Keep the legacy organisation/profile
     * storage in step with the central
     * Root Identity while older pages
     * still use these keys.
     */
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
          membership
            .organisation_id,

        role:
          membership.role ||
          "employee",
      })
    );

    /*
     * HR context exists only when the
     * selected membership actually has
     * an HR / organisation admin role.
     */
    const hasWorkplaceRole =
      membership.role ===
        "hr_admin" ||
      membership.role ===
        "organisation_admin";

    if (hasWorkplaceRole) {
      localStorage.setItem(
        "root_hr_org_v1",
        JSON.stringify({
          organisation_id:
            membership
              .organisation_id,

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

    /*
     * Refresh Root Identity from the
     * authenticated database state.
     */
    const identity =
      await getRootIdentity();

    if (!identity) {
      window.location.href =
        "/login";

      return;
    }

    /*
     * Employee-only membership:
     *
     * This person continues into their
     * private Root wellbeing experience,
     * connected anonymously to the
     * selected organisation.
     */
    if (!hasWorkplaceRole) {
      setActiveExperience(
        "personal"
      );

      window.location.href =
        "/";

      return;
    }

    /*
     * HR / Organisation Admin:
     *
     * They have both their own private
     * Root experience and Workplace.
     *
     * Let the existing experience chooser
     * decide which side they want now.
     */
    window.location.href =
      "/choose-experience";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Health
          </p>

          <h1 style={styles.title}>
            Finding your Root spaces...
          </h1>
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

        <h1 style={styles.title}>
          How are you using Root today?
        </h1>

        <p style={styles.intro}>
          This account is connected to
          more than one organisation.
          Choose the context you want to
          use now.
        </p>

        <p style={styles.privacyNote}>
          Your personal wellbeing
          information remains private.
          Choosing an organisation only
          changes the workplace context
          Root is using.
        </p>

        {message ? (
          <p style={styles.message}>
            {message}
          </p>
        ) : null}

        <div style={styles.grid}>
          {memberships.map(
            (membership) => {
              const organisation =
                organisations[
                  membership
                    .organisation_id
                ];

              const organisationName =
                organisation?.name ||
                "Organisation";

              return (
                <button
                  key={
                    membership.id
                  }
                  type="button"
                  style={
                    styles.option
                  }
                  onClick={() =>
                    chooseMembership(
                      membership
                    )
                  }
                >
                  <span
                    style={
                      styles
                        .organisationName
                    }
                  >
                    {organisationName}
                  </span>

                  <span
                    style={
                      styles
                        .membershipName
                    }
                  >
                    {membership.name ||
                      "Root member"}
                  </span>

                  <span
                    style={
                      styles
                        .membershipMeta
                    }
                  >
                    {roleLabel(
                      membership.role
                    )}

                    {membership.department
                      ? ` · ${membership.department}`
                      : ""}
                  </span>

                  <span
                    style={
                      styles
                        .continueText
                    }
                  >
                    Continue →
                  </span>
                </button>
              );
            }
          )}
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
    padding: "30px",
    background:
      "linear-gradient(145deg,#eef2e8 0%,#f8f5ee 55%,#e9eee3 100%)",
    color: "#181818",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },

  card: {
    width: "100%",
    maxWidth: "820px",
    padding: "42px",
    borderRadius: "34px",
    background:
      "rgba(255,255,255,0.74)",
    backdropFilter:
      "blur(20px)",
    border:
      "1px solid rgba(255,255,255,0.9)",
    boxShadow:
      "0 30px 90px rgba(0,0,0,.12)",
  },

  kicker: {
    margin: "0",
    color: "#6A755E",
    fontWeight: "800",
    textTransform:
      "uppercase",
    letterSpacing:
      ".14em",
    fontSize: "12px",
  },

  title: {
    fontSize: "42px",
    margin:
      "12px 0",
    color:
      "#1A1A1A",
    letterSpacing:
      "-0.04em",
  },

  intro: {
    color:
      "#555",
    lineHeight:
      "1.7",
    marginBottom:
      "14px",
  },

  privacyNote: {
    margin:
      "0 0 30px",
    padding:
      "14px 16px",
    borderRadius:
      "16px",
    background:
      "rgba(101,114,87,0.08)",
    color:
      "#596351",
    lineHeight:
      "1.6",
    fontSize:
      "14px",
  },

  grid: {
    display:
      "grid",
    gap:
      "18px",
  },

  option: {
    width:
      "100%",
    textAlign:
      "left",
    padding:
      "26px",
    borderRadius:
      "24px",
    border:
      "1px solid rgba(24,24,24,0.08)",
    background:
      "rgba(255,255,255,0.62)",
    cursor:
      "pointer",
    display:
      "grid",
    gap:
      "8px",
    color:
      "#181818",
  },

  organisationName: {
    fontSize:
      "12px",
    fontWeight:
      "800",
    textTransform:
      "uppercase",
    letterSpacing:
      "0.1em",
    color:
      "#657257",
  },

  membershipName: {
    fontSize:
      "24px",
    fontWeight:
      "800",
    letterSpacing:
      "-0.02em",
  },

  membershipMeta: {
    color:
      "#66635D",
    fontSize:
      "15px",
  },

  continueText: {
    marginTop:
      "8px",
    fontWeight:
      "800",
    color:
      "#181818",
  },

  message: {
    margin:
      "0 0 20px",
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
};

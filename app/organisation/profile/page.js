"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase"; 

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

export default function OrganisationProfilePage() {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [age, setAge] =
    useState("");

  const [department, setDepartment] =
    useState("");

  const [
    organisationUnits,
    setOrganisationUnits,
  ] = useState([]);

  const [
    organisationUnitId,
    setOrganisationUnitId,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadAuthenticatedEmployee();
    loadOrganisationUnits();
  }, []);

  async function loadAuthenticatedEmployee() {
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
      setError(
        "Root could not verify your signed-in account. Please sign in again."
      );

      return;
    }

    /*
     * The authenticated Supabase email is
     * the source of truth.
     *
     * Do not allow old browser/localStorage
     * profile data to replace it.
     */
    setEmail(
      user.email || ""
    );

    /*
     * If Root already knows this person's
     * personal profile, restore the details.
     */
    const {
      data: existingProfile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          `
            user_id,
            profile_key,
            name,
            email,
            age,
            department
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "Could not load Root personal profile:",
        profileError
      );

      return;
    }

    if (existingProfile) {
      setName(
        existingProfile.name ||
        ""
      );

      setAge(
        existingProfile.age ??
        ""
      );

      setDepartment(
        existingProfile.department ||
        ""
      );

      if (
        existingProfile.profile_key
      ) {
        localStorage.setItem(
          "root_profile_key_v1",
          existingProfile.profile_key
        );
      }
    }
  }

  async function loadOrganisationUnits() {
    let organisation = {};

    try {
      organisation =
        JSON.parse(
          localStorage.getItem(
            "root_organisation_v1"
          ) || "{}"
        );
    } catch {
      organisation = {};
    }

    if (
      !organisation.organisation_id
    ) {
      return;
    }

    const {
      data,
      error: unitError,
    } =
      await supabase
        .from(
          "organisation_units"
        )
        .select(
          `
            id,
            name,
            unit_type,
            parent_unit_id,
            active
          `
        )
        .eq(
          "organisation_id",
          organisation.organisation_id
        )
        .eq(
          "active",
          true
        )
        .order(
          "name",
          {
            ascending: true,
          }
        );

    if (unitError) {
      console.error(
        "Could not load organisational units:",
        unitError
      );

      return;
    }

    setOrganisationUnits(
      Array.isArray(data)
        ? data
        : []
    );
  }

  async function saveProfile() {
    setSaving(true);
    setError("");

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
      setError(
        "Root could not verify your signed-in account. Please sign in again."
      );

      setSaving(false);
      return;
    }

    const authenticatedEmail =
      String(
        user.email || ""
      )
        .trim()
        .toLowerCase();

    if (
      !name.trim() ||
      !authenticatedEmail
    ) {
      setError(
        "Please enter your name. Root also needs a valid signed-in email address."
      );

      setSaving(false);
      return;
    }

    let organisation = {};

    try {
      organisation =
        JSON.parse(
          localStorage.getItem(
            "root_organisation_v1"
          ) || "{}"
        );
    } catch {
      organisation = {};
    }

    if (
      !organisation.organisation_id
    ) {
      setError(
        "Organisation not found. Please join your organisation again."
      );

      setSaving(false);
      return;
    }

    if (
  organisationUnits.length === 0
) {
  setError(
    "Your organisation has not yet set up its workplace structure. Please ask your organisation administrator to complete this before continuing."
  );

  setSaving(false);
  return;
}

if (!organisationUnitId) {
  setError(
    "Please tell Root where you mainly work. If you are not sure which area to choose, select “I’m not sure”."
  );

  setSaving(false);
  return;
}

    /*
     * Personal Root profile
     *
     * One authenticated Root user has one
     * personal profile, even if they later
     * belong to several organisations.
     */
    const {
      data: existingProfile,
      error:
        existingProfileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "user_id, profile_key"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (existingProfileError) {
      setError(
        existingProfileError.message ||
        "Root could not check your existing profile."
      );

      setSaving(false);
      return;
    }

    const membershipProfileKey =
      localStorage.getItem(
        "root_profile_key_v1"
      ) ||
      makeProfileKey();

    const personalProfileKey =
      existingProfile?.profile_key ||
      membershipProfileKey;

    const {
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .upsert(
          {
            user_id:
              user.id,

            profile_key:
              personalProfileKey,

            name:
              name.trim(),

            email:
              authenticatedEmail,

            age:
              age.trim(),

            department:
              department.trim(),

            organisation_id:
              organisation.organisation_id,

            organisation_name:
              organisation.organisation_name,
          },
          {
            onConflict:
              "profile_key",
          }
        );

    if (profileError) {
      setError(
        profileError.message ||
        "Could not save profile."
      );

      setSaving(false);
      return;
    }

    /*
     * Workplace membership
     *
     * This is organisation-specific.
     * It must remain connected to the
     * authenticated Supabase user.
     */
    const {
      error: memberError,
    } =
      await supabase
        .from(
          "organisation_members"
        )
        .upsert(
          {
            organisation_id:
              organisation.organisation_id,

            user_id:
              user.id,

            profile_key:
              membershipProfileKey,

            email:
              authenticatedEmail,

            name:
              name.trim(),

            department:
              department.trim(),

            organisation_unit_id:
            organisationUnitId === "__unsure__"
            ? null
            : organisationUnitId,
            role:
              "employee",

            activated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "organisation_id,profile_key",
          }
        );

    if (memberError) {
      setError(
        memberError.message ||
        "Could not connect employee to organisation."
      );

      setSaving(false);
      return;
    }

    localStorage.setItem(
      "root_profile_key_v1",
      personalProfileKey
    );

    localStorage.setItem(
      "root_active_organisation_v1",
      organisation.organisation_id
    );

    localStorage.setItem(
      "root_profile_v1",
      JSON.stringify({
        profile_key:
          personalProfileKey,

        user_id:
          user.id,

        name:
          name.trim(),

        email:
          authenticatedEmail,

        age:
          age.trim(),

        department:
          department.trim(),

        organisation_id:
          organisation.organisation_id,

        organisation_name:
          organisation.organisation_name,
      })
    );

    setEmail(
      authenticatedEmail
    );

    setSaving(false);

    window.location.href =
      "/orientation";
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>
          Root Workplace
        </p>

        <h1 style={styles.title}>
          Tell Root a little about yourself
        </h1>

        <p style={styles.text}>
          Your personal profile helps
          Root support you.
        </p>

        <p style={styles.text}>
          Your organisation only sees
          anonymous wellbeing trends.
        </p>

        <label style={styles.label}>
          Work email
        </label>

        <input
          type="email"
          style={{
            ...styles.input,
            background:
              "rgba(24,24,24,0.045)",
          }}
          value={email}
          readOnly
          placeholder="Your signed-in email"
        />

        <p style={styles.emailHint}>
          This is the email connected to
          your private Root account.
        </p>

        <label style={styles.label}>
          Your name *
        </label>

        <input
          style={styles.input}
          value={name}
          onChange={(event) =>
            setName(
              event.target.value
            )
          }
          placeholder="e.g. David Prince"
        />

        <label style={styles.label}>
          Age (optional)
        </label>

        <input
          style={styles.input}
          value={age}
          onChange={(event) =>
            setAge(
              event.target.value
            )
          }
          placeholder="e.g. 61"
        />

        <label style={styles.label}>
  Where do you mainly work? *
</label>

<p style={styles.fieldHint}>
  Choose the team, department, site or area that best
  represents where you normally work.
</p>

<p style={styles.fieldHint}>
  Root uses this to understand workplace patterns while
  protecting your individual wellbeing information.
</p>

{organisationUnits.length > 0 ? (
  <select
    style={styles.input}
    value={organisationUnitId}
    onChange={(event) => {
      const selectedId =
        event.target.value;

      setOrganisationUnitId(
        selectedId
      );

      if (
        selectedId ===
        "__unsure__"
      ) {
        setDepartment("");
        return;
      }

      const selectedUnit =
        organisationUnits.find(
          (unit) =>
            unit.id ===
            selectedId
        );

      setDepartment(
        selectedUnit?.name ||
        ""
      );
    }}
  >
    <option value="">
      Select the area that best fits your work
    </option>

    {organisationUnits.map(
      (unit) => (
        <option
          key={unit.id}
          value={unit.id}
        >
          {unit.name}
        </option>
      )
    )}

    <option value="__unsure__">
      I’m not sure which area to choose
    </option>
  </select>
) : (
  <div style={styles.structureNotice}>
    Your organisation has not yet set up its workplace
    structure. An organisation administrator needs to do
    this before Root can accurately connect your workplace
    information.
  </div>
)}
        {error ? (
          <p style={styles.error}>
            {error}
          </p>
        ) : null}

        <button
          style={styles.button}
          onClick={saveProfile}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Continue to Orientation"}
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
    color: "#181818",
    letterSpacing: "-0.04em",
  },

  text: {
    color: "#4D463B",
    lineHeight: "1.8",
    fontSize: "16px",
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

  emailHint: {
    margin:
      "7px 0 0",
    color: "#776C5B",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  fieldHint: {
  margin: "4px 0 8px",
  color: "#776C5B",
  fontSize: "13px", 
  lineHeight: "1.55",
},

structureNotice: {
  padding: "14px 16px",
  borderRadius: "16px",
  background: "rgba(138,108,61,0.08)",
  border: "1px solid rgba(138,108,61,0.16)",
  color: "#6A5840",
  fontSize: "14px",
  lineHeight: "1.6",
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
  },

  error: {
    marginTop: "16px",
    color: "#9F1D1D",
    fontWeight: "800",
  },
};
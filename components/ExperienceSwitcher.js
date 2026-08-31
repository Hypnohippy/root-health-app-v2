"use client";

import { useState } from "react";
import { useRoot } from "../context/RootContext";

export default function ExperienceSwitcher() {
  const {
    identity,
    canUsePersonal,
    canUseWorkplace,
    activeExperience,
    switchExperience,
  } = useRoot();

  const [changing, setChanging] = useState(false);

  if (!canUseWorkplace) {
    return null;
  }

  const organisationMemberships =
    Array.isArray(identity?.organisations)
      ? identity.organisations
      : [];

  const canSwitchOrganisation =
    organisationMemberships.length > 1;

  async function handleChange(e) {
    const experience =
      e.target.value;

    setChanging(true);

    await switchExperience(
      experience
    );

    setChanging(false);
  }

  function handleOrganisationSwitch() {
    window.location.href =
      "/choose-organisation";
  }

  return (
    <div style={styles.wrapper}>
      <select
        value={activeExperience}
        onChange={handleChange}
        disabled={changing}
        style={styles.select}
      >
        {canUsePersonal ? (
          <option value="personal">
            🌿 Personal
          </option>
        ) : null}

        <option value="workplace">
          🏢 Workplace
        </option>
      </select>

      {canSwitchOrganisation ? (
        <button
          type="button"
          onClick={
            handleOrganisationSwitch
          }
          style={styles.switchButton}
        >
          Switch organisation
        </button>
      ) : null}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  select: {
    padding: "10px 14px",
    borderRadius: "999px",
    border:
      "1px solid rgba(0,0,0,0.08)",
    background: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },

  switchButton: {
    padding: "10px 14px",
    borderRadius: "999px",
    border:
      "1px solid rgba(0,0,0,0.08)",
    background:
      "rgba(255,255,255,0.88)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    color: "#181818",
  },
};

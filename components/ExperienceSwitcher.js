"use client";

import { useState } from "react";
import { useRoot } from "../context/RootContext";

export default function ExperienceSwitcher() {
  const {
    canUseWorkplace,
    activeExperience,
    switchExperience,
  } = useRoot();

  const [changing, setChanging] = useState(false);

  if (!canUseWorkplace) {
    return null;
  }

  async function handleChange(e) {
    const experience = e.target.value;

    setChanging(true);

    await switchExperience(experience);

    setChanging(false);
  }

  return (
    <select
      value={activeExperience}
      onChange={handleChange}
      disabled={changing}
      style={styles.select}
    >
      <option value="personal">
        🌿 Personal
      </option>

      <option value="workplace">
        🏢 Workplace
      </option>
    </select>
  );
}

const styles = {
  select: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(0,0,0,0.08)",
    background: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
};

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getRootIdentity,
  getStoredRootIdentity,
  setActiveExperience,
} from "../lib/rootIdentity";

const RootContext = createContext(null);

export function RootProvider({ children }) {
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshIdentity() {
    setLoading(true);

    const latest = await getRootIdentity();

    setIdentity(latest);

    setLoading(false);

    return latest;
  }

  async function switchExperience(experience) {
    setActiveExperience(experience);

    await refreshIdentity();
  }

  useEffect(() => {
    async function initialise() {
      const stored = getStoredRootIdentity();

      if (stored) {
        setIdentity(stored);
      }

      await refreshIdentity();
    }

    initialise();
  }, []);

  const value = {
    loading,

    identity,

    refreshIdentity,

    switchExperience,

    isLoggedIn: !!identity,

    canUsePersonal:
      identity?.capabilities?.canUsePersonal ?? false,

    canUseWorkplace:
      identity?.capabilities?.canUseWorkplace ?? false,

    isEmployee:
      identity?.capabilities?.isEmployee ?? false,

    isHR:
      identity?.capabilities?.isHR ?? false,

    activeExperience:
      identity?.activeExperience ?? "personal",
  };

  return (
    <RootContext.Provider value={value}>
      {children}
    </RootContext.Provider>
  );
}

export function useRoot() {
  const context = useContext(RootContext);

  if (!context) {
    throw new Error(
      "useRoot must be used inside RootProvider."
    );
  }

  return context;
}

"use client";

import { useState } from "react";
import { useRoot } from "../context/RootContext";
import ExperienceSwitcher from "./ExperienceSwitcher"; 

export default function Nav() {
  const [open, setOpen] = useState(false);

  const { activeExperience, identity } = useRoot();

  const activeWorkplaceMembership =
    identity?.workplace?.activeOrganisation || null;

  const personalLinks = [
    { href: "/", label: "Home" },
    { href: "/coach", label: "Coach" },
    { href: "/assessment", label: "Check-In" },
    { href: "/playbook", label: "Playbook" },
    { href: "/journal", label: "Journal" },
    { href: "/body", label: "Body" },
    { href: "/mind", label: "Mind" }, 
    { href: "/insights", label: "Insights" },
    { href: "/profile", label: "You" },
  ];

  const workplaceLinks = [
    {
      href: "/org-insights",
      label: "Dashboard",
    },
    {
      href: "/organisation-learning",
      label: "Organisation Learning",
    },
    ...(activeWorkplaceMembership?.role === "organisation_admin"
      ? [
          {
            href: "/organisation-structure",
            label: "Structure & People",
          },
        ]
      : []),
    {
      href: "/hr-coach",
      label: "Ask Root",
    },
    {
      href: "/executive-review",
      label: "Executive Review",
    },
    {
      href: "/presentation-support",
      label: "Interventions",
    },
    {
      href: "/organisations/pricing",
      label: "Pricing",
    },
  ];

  const links =
    activeExperience === "workplace"
      ? workplaceLinks
      : personalLinks;

  return (
    <>
      <nav style={styles.nav}>
        <a href="/" style={styles.logo}>
          Root
        </a>

        <div style={styles.desktopLinks}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={styles.link}
            >
              {link.label}
            </a>
          ))}

          <ExperienceSwitcher />
        </div>

        <button
          type="button"
          style={styles.menuButton}
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? "×" : "☰"}
        </button>
      </nav>

      {open && (
        <div style={styles.mobilePanel}>
          <ExperienceSwitcher />

          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={styles.mobileLink}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 960px) {
          nav div {
            display: none !important;
          }
        }

        @media (min-width: 961px) {
          nav button {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

const styles = {
  nav: {
    position: "fixed",
    top: "18px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 1000,
    width: "min(1400px, calc(100% - 28px))",
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.28)",
    border: "1px solid rgba(255,255,255,0.36)",
    borderRadius: "999px",
    backdropFilter: "blur(22px)",
    boxShadow: "0 18px 50px rgba(20,18,15,0.12)",
    boxSizing: "border-box",
  },

  logo: {
    textDecoration: "none",
    fontWeight: "800",
    color: "#1A1A1A",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.34)",
    fontSize: "14px",
  },

  desktopLinks: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  link: {
    color: "#2A261F",
    textDecoration: "none",
    fontSize: "13px",
    padding: "8px 10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.18)",
    whiteSpace: "nowrap",
  },

  menuButton: {
    border: "none",
    width: "38px",
    height: "38px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.42)",
    color: "#1A1A1A",
    fontSize: "22px",
    fontWeight: "800",
    cursor: "pointer",
  },

  mobilePanel: {
    position: "fixed",
    top: "76px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 999,
    width: "min(360px, calc(100% - 28px))",
    padding: "14px",
    display: "grid",
    gap: "8px",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(255,255,255,0.54)",
    borderRadius: "28px",
    backdropFilter: "blur(24px)",
    boxShadow: "0 24px 70px rgba(20,18,15,0.18)",
  },

  mobileLink: {
    textDecoration: "none",
    color: "#1F241E",
    padding: "13px 16px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.48)",
    fontWeight: "800",
  },
};

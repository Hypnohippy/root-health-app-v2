"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useRoot } from "../context/RootContext";
import { getRootDestination } from "../lib/rootNavigator";

export default function AuthGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const { identity, loading } = useRoot();

  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    const destination = getRootDestination(
      identity,
      pathname
    );

    if (destination && destination !== pathname) {
      setRedirecting(true);
      router.replace(destination);
      return;
    }

    setRedirecting(false);
  }, [identity, loading, pathname, router]);

  if (loading || redirecting) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.rootMark}>Root</div>

          <p style={styles.loadingText}>
            Preparing your experience...
          </p>
        </div>
      </main>
    );
  }

  return children;
}

const styles = {
  loadingPage: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    boxSizing: "border-box",
    background:
      "linear-gradient(145deg, #eef2e8 0%, #f8f5ee 55%, #e9eee3 100%)",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },

  loadingCard: {
    width: "min(360px, 100%)",
    padding: "34px",
    boxSizing: "border-box",
    textAlign: "center",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.68)",
    border: "1px solid rgba(255,255,255,0.88)",
    backdropFilter: "blur(20px)",
    boxShadow: "0 24px 70px rgba(32,38,28,0.13)",
  },

  rootMark: {
    display: "inline-grid",
    placeItems: "center",
    minWidth: "72px",
    minHeight: "72px",
    padding: "10px",
    boxSizing: "border-box",
    borderRadius: "999px",
    background: "rgba(101,114,87,0.13)",
    color: "#46513f",
    fontSize: "18px",
    fontWeight: "800",
  },

  loadingText: {
    margin: "18px 0 0",
    color: "#62665d",
    lineHeight: "1.6",
  },
};

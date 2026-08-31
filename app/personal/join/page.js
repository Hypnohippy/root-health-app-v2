"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const PERSONAL_PLAN_KEY = "root_pending_personal_plan_v1";

export default function PersonalJoinPage() {
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [showAccount, setShowAccount] = useState(false);
  const [authMode, setAuthMode] = useState("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  async function startCheckout(plan) {
    setLoading(true);
    setMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setShowAccount(true);
      setMessage("Please sign in or create your Root account to continue.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/stripe/personal-checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.url) {
      setMessage(result?.error || "Root could not start checkout.");
      setLoading(false);
      return;
    }

    localStorage.removeItem(PERSONAL_PLAN_KEY);
    window.location.href = result.url;
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedPlan = searchParams.get("plan");
    const storedPlan = localStorage.getItem(PERSONAL_PLAN_KEY);
    const safePlan = [requestedPlan, storedPlan].find(
      (plan) => plan === "monthly" || plan === "annual"
    );

    if (safePlan) setSelectedPlan(safePlan);

    if (searchParams.get("checkout") === "cancelled") {
      setMessage("Checkout was cancelled. Your membership has not started.");
    }

    if (searchParams.get("checkout") !== "resume") return;

    const resumePlan = safePlan || "annual";
    let resumed = false;

    const resumeCheckout = async () => {
      const { data } = await supabase.auth.getSession();

      if (!resumed && data?.session?.user?.email_confirmed_at) {
        resumed = true;
        await startCheckout(resumePlan);
      }
    };

    resumeCheckout();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!resumed && session?.user?.email_confirmed_at) {
          resumed = true;
          setTimeout(() => startCheckout(resumePlan), 0);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function continueToCheckout() {
    localStorage.setItem(PERSONAL_PLAN_KEY, selectedPlan);
    const { data } = await supabase.auth.getSession();

    if (data?.session?.user?.email_confirmed_at) {
      await startCheckout(selectedPlan);
      return;
    }

    setShowAccount(true);
    setMessage("");
  }

  async function handleAccount(event) {
    event.preventDefault();
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMessage("Please enter your email address and password.");
      return;
    }

    setLoading(true);

    if (authMode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data?.user) {
        setMessage(error?.message || "Root could not sign you in.");
        setLoading(false);
        return;
      }

      await startCheckout(selectedPlan);
      return;
    }

    if (!name.trim()) {
      setMessage("Please enter your name.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage("Please choose a password containing at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      setLoading(false);
      return;
    }

    const returnUrl = `${window.location.origin}/personal/join?checkout=resume&plan=${encodeURIComponent(selectedPlan)}`;
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: returnUrl,
        data: { name: name.trim(), full_name: name.trim() },
      },
    });

    if (error) {
      setMessage(error.message || "Root could not create your account.");
      setLoading(false);
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
      setMessage("A Root account already exists for this email address. Sign in to continue with the same identity and history.");
      setLoading(false);
      return;
    }

    if (data?.session && data?.user?.email_confirmed_at) {
      await startCheckout(selectedPlan);
      return;
    }

    setVerificationSent(true);
    setLoading(false);
  }

  return (
    <main className="joinPage">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="joinHeader">
        <button
          type="button"
          className="rootWordmark"
          onClick={() => router.push("/personal")}
        >
          Root
        </button>

        <button
          type="button"
          className="signInLink"
          onClick={() => router.push("/login")}
        >
          Already a member? <strong>Sign in</strong>
        </button>
      </header>

      {/* =====================================================
          JOIN
      ===================================================== */}
      <section className="joinSection">
        <div className="joinIntro">
          <span className="eyebrow">ROOT PERSONAL</span>

          <h1>
            MAKE ROOT
            <br />
            <em>YOURS.</em>
          </h1>

          <p>
            Your personal health and wellbeing companion.
            Everything in Root, with one simple membership.
          </p>
        </div>

        <div className="membershipShell">
          <div className="membershipHeading">
            <span>CHOOSE YOUR MEMBERSHIP</span>

            <h2>Everything included. Always.</h2>

            <p>
              No feature tiers. No stripped-back version.
              Choose how you&apos;d like to pay.
            </p>
          </div>

          <div className="planGrid">
            {/* MONTHLY */}
            <button
              type="button"
              className={`planCard ${
                selectedPlan === "monthly" ? "selected" : ""
              }`}
              onClick={() => setSelectedPlan("monthly")}
            >
              <div className="planTop">
                <div>
                  <span className="planLabel">MONTHLY</span>
                  <h3>Stay flexible.</h3>
                </div>

                <span className="radio">
                  {selectedPlan === "monthly" ? "✓" : ""}
                </span>
              </div>

              <div className="price">
                <strong>£19.99</strong>
                <span>/ month</span>
              </div>

              <p>
                Full access to Root with a simple monthly
                membership.
              </p>

              <div className="planFooter">
                Cancel anytime
              </div>
            </button>

            {/* ANNUAL */}
            <button
              type="button"
              className={`planCard annual ${
                selectedPlan === "annual" ? "selected" : ""
              }`}
              onClick={() => setSelectedPlan("annual")}
            >
              <div className="bestValue">BEST VALUE</div>

              <div className="planTop">
                <div>
                  <span className="planLabel">ANNUAL</span>
                  <h3>Make Root part of the year.</h3>
                </div>

                <span className="radio">
                  {selectedPlan === "annual" ? "✓" : ""}
                </span>
              </div>

              <div className="price">
                <strong>£199</strong>
                <span>/ year</span>
              </div>

              <p>
                The complete Root experience for the year,
                equivalent to £16.58 a month.
              </p>

              <div className="annualSaving">
                Save £40.88 compared with paying monthly
              </div>
            </button>
          </div>

          {/* =================================================
              EVERYTHING INCLUDED
          ================================================= */}
          <div className="included">
            <div className="includedIntro">
              <span>YOUR ROOT INCLUDES</span>

              <h3>
                One place for the
                <br />
                whole journey.
              </h3>
            </div>

            <div className="includedGrid">
              <div className="includedItem">
                <span>○</span>
                <div>
                  <strong>Root Coach</strong>
                  <p>Talk things through.</p>
                </div>
              </div>

              <div className="includedItem">
                <span>◇</span>
                <div>
                  <strong>Body</strong>
                  <p>Notice what your body is telling you.</p>
                </div>
              </div>

              <div className="includedItem">
                <span>♡</span>
                <div>
                  <strong>Mind</strong>
                  <p>Explore thoughts and emotions.</p>
                </div>
              </div>

              <div className="includedItem">
                <span>◫</span>
                <div>
                  <strong>Insights</strong>
                  <p>See patterns more clearly.</p>
                </div>
              </div>

              <div className="includedItem">
                <span>✦</span>
                <div>
                  <strong>Playbook</strong>
                  <p>Keep what helps.</p>
                </div>
              </div>

              <div className="includedItem">
                <span>↻</span>
                <div>
                  <strong>Root Memory</strong>
                  <p>Never start from zero.</p>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              CONTINUE
          ================================================= */}
          <div className="continueArea">
            <button
              type="button"
              className="continueButton"
              onClick={continueToCheckout}
              disabled={loading}
            >
              <span>
                {loading
                  ? "Please wait..."
                  : `Continue with ${selectedPlan} Root`}
              </span>

              <b>→</b>
            </button>

            <div className="secureNote">
              <span>○</span>

              <p>
                Secure payment through Stripe.
                <br />
                Everything in Root is included in your membership.
              </p>
            </div>

            {message ? <p className="accountMessage">{message}</p> : null}

            {showAccount ? (
              <div className="accountPanel">
                {verificationSent ? (
                  <div>
                    <h3>Check your email</h3>
                    <p>
                      Confirm {email.trim().toLowerCase()} using the link from
                      Root. We&apos;ll keep your {selectedPlan} plan selected and
                      continue you securely to payment.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="accountTabs">
                      <button type="button" onClick={() => setAuthMode("create")}>
                        Create account
                      </button>
                      <button type="button" onClick={() => setAuthMode("signin")}>
                        Sign in
                      </button>
                    </div>

                    <form onSubmit={handleAccount} className="accountForm">
                      {authMode === "create" ? (
                        <label>
                          Name
                          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
                        </label>
                      ) : null}
                      <label>
                        Email address
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                      </label>
                      <label>
                        Password
                        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === "create" ? "new-password" : "current-password"} required />
                      </label>
                      {authMode === "create" ? (
                        <label>
                          Confirm password
                          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
                        </label>
                      ) : null}
                      <button type="submit" disabled={loading}>
                        {loading ? "Please wait..." : authMode === "create" ? "Create account" : "Sign in and continue"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <p className="closingLine">
          One membership. A companion that can change with you.
        </p>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          background: #f4f1e9;
          color: #203326;
        }

        button {
          font: inherit;
        }

        .joinPage {
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 82% 16%,
              rgba(174, 198, 161, 0.2),
              transparent 27%
            ),
            radial-gradient(
              circle at 10% 60%,
              rgba(221, 194, 161, 0.18),
              transparent 31%
            ),
            linear-gradient(
              135deg,
              #f8f5ee 0%,
              #eef2e8 58%,
              #f5f1e9 100%
            );
        }

        /* ================= HEADER ================= */

        .joinHeader {
          min-height: 72px;
          padding: 0 5.5vw;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom:
            1px solid rgba(31, 57, 38, 0.08);
          background:
            rgba(248, 246, 240, 0.68);
          backdrop-filter: blur(18px);
        }

        .rootWordmark,
        .signInLink {
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .rootWordmark {
          padding: 0;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: 21px;
          font-weight: 600;
        }

        .signInLink {
          color: #687168;
          font-size: 12px;
        }

        .signInLink strong {
          color: #355b3e;
        }

        /* ================= INTRO ================= */

        .joinSection {
          width: min(1120px, calc(100% - 44px));
          margin: 0 auto;
          padding: 68px 0 58px;
        }

        .joinIntro {
          max-width: 720px;
          margin: 0 auto 42px;
          text-align: center;
        }

        .eyebrow {
          color: #5d795f;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.19em;
        }

        .joinIntro h1 {
          margin: 13px 0 17px;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: clamp(48px, 6vw, 78px);
          font-weight: 400;
          line-height: 0.88;
          letter-spacing: -0.055em;
        }

        .joinIntro h1 em {
          color: #4c7757;
          font-style: normal;
        }

        .joinIntro p {
          max-width: 560px;
          margin: 0 auto;
          color: #687168;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: 14px;
          line-height: 1.65;
        }

        /* ================= SHELL ================= */

        .membershipShell {
          padding: 42px;
          border:
            1px solid rgba(35, 63, 40, 0.1);
          border-radius: 38px;
          background:
            rgba(250, 248, 243, 0.82);
          box-shadow:
            0 30px 80px
              rgba(42, 65, 45, 0.1),
            inset 0 1px 0
              rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(18px);
        }

        .membershipHeading {
          max-width: 620px;
          margin: 0 auto 28px;
          text-align: center;
        }

        .membershipHeading > span,
        .includedIntro > span {
          color: #5e775f;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .membershipHeading h2 {
          margin: 8px 0 7px;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: 30px;
          font-weight: 400;
        }

        .membershipHeading p {
          margin: 0;
          color: #747b73;
          font-size: 11px;
          line-height: 1.5;
        }

        /* ================= PLANS ================= */

        .planGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .planCard {
          min-height: 260px;
          padding: 27px;
          position: relative;
          overflow: hidden;
          border:
            1px solid rgba(47, 72, 50, 0.11);
          border-radius: 28px;
          background:
            rgba(255, 255, 255, 0.56);
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .planCard:hover {
          transform: translateY(-2px);
        }

        .planCard.selected {
          border:
            2px solid rgba(66, 107, 73, 0.75);
          box-shadow:
            0 17px 40px
              rgba(49, 83, 55, 0.12);
        }

        .planCard.annual {
          background:
            radial-gradient(
              circle at 90% 5%,
              rgba(184, 207, 169, 0.3),
              transparent 35%
            ),
            linear-gradient(
              145deg,
              rgba(240, 244, 234, 0.96),
              rgba(226, 235, 220, 0.84)
            );
        }

        .bestValue {
          position: absolute;
          top: 0;
          right: 25px;
          padding: 8px 14px 9px;
          border-radius: 0 0 12px 12px;
          background: #355f3f;
          color: white;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .planTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .planLabel {
          color: #617562;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .planTop h3 {
          margin: 7px 0 0;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: 23px;
          font-weight: 400;
        }

        .radio {
          width: 27px;
          height: 27px;
          flex: 0 0 27px;
          border:
            1px solid rgba(55, 88, 60, 0.35);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            rgba(255, 255, 255, 0.7);
          color: #355f3f;
          font-size: 12px;
          font-weight: 900;
        }

        .selected .radio {
          background: #355f3f;
          color: white;
        }

        .price {
          margin-top: 31px;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .price strong {
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: 45px;
          font-weight: 400;
          letter-spacing: -0.045em;
        }

        .price span {
          color: #687168;
          font-size: 11px;
        }

        .planCard > p {
          max-width: 360px;
          margin: 11px 0 20px;
          color: #687168;
          font-size: 11px;
          line-height: 1.55;
        }

        .planFooter,
        .annualSaving {
          position: absolute;
          left: 27px;
          right: 27px;
          bottom: 24px;
          padding-top: 13px;
          border-top:
            1px solid rgba(43, 68, 47, 0.1);
          color: #4e6652;
          font-size: 9px;
          font-weight: 700;
        }

        .annualSaving {
          color: #355f3f;
        }

        /* ================= INCLUDED ================= */

        .included {
          margin-top: 22px;
          padding: 30px;
          display: grid;
          grid-template-columns: 0.7fr 1.3fr;
          gap: 35px;
          align-items: center;
          border:
            1px solid rgba(46, 71, 49, 0.08);
          border-radius: 28px;
          background:
            linear-gradient(
              135deg,
              rgba(247, 243, 235, 0.75),
              rgba(234, 240, 228, 0.74)
            );
        }

        .includedIntro h3 {
          margin: 8px 0 0;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: 28px;
          font-weight: 400;
          line-height: 1.03;
        }

        .includedGrid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 14px 18px;
        }

        .includedItem {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .includedItem > span {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          border:
            1px solid rgba(61, 91, 64, 0.22);
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #55725a;
          background:
            rgba(255, 255, 255, 0.5);
          font-family: Georgia, serif;
          font-size: 12px;
        }

        .includedItem strong {
          display: block;
          margin-top: 1px;
          font-family: Georgia, serif;
          font-size: 12px;
          font-weight: 600;
        }

        .includedItem p {
          margin: 3px 0 0;
          color: #747b73;
          font-size: 8px;
          line-height: 1.35;
        }

        /* ================= CONTINUE ================= */

        .continueArea {
          max-width: 560px;
          margin: 31px auto 0;
        }

        .continueButton {
          width: 100%;
          min-height: 58px;
          padding: 0 23px;
          border: 0;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background:
            linear-gradient(
              135deg,
              #426d4b,
              #2f5839
            );
          color: white;
          cursor: pointer;
          box-shadow:
            0 16px 32px
              rgba(45, 83, 53, 0.2);
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .continueButton:hover {
          transform: translateY(-2px);
          box-shadow:
            0 20px 38px
              rgba(45, 83, 53, 0.24);
        }

        .continueButton span {
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: 15px;
        }

        .continueButton b {
          font-size: 20px;
          font-weight: 400;
        }

        .secureNote {
          margin-top: 15px;
          display: flex;
          justify-content: center;
          gap: 9px;
          align-items: flex-start;
          color: #737a72;
          text-align: left;
        }

        .secureNote > span {
          color: #55725a;
          font-size: 14px;
        }

        .secureNote p {
          margin: 0;
          font-size: 9px;
          line-height: 1.5;
        }

        .accountMessage {
          margin: 15px 0 0;
          color: #704b3b;
          font-size: 11px;
          line-height: 1.5;
          text-align: center;
        }

        .accountPanel {
          margin-top: 22px;
          padding: 24px;
          border: 1px solid rgba(47, 72, 50, 0.12);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.58);
        }

        .accountPanel h3 {
          margin: 0 0 8px;
          font-family: Georgia, serif;
          font-size: 22px;
          font-weight: 400;
        }

        .accountPanel p {
          margin: 0;
          color: #687168;
          font-size: 11px;
          line-height: 1.6;
        }

        .accountTabs {
          margin-bottom: 18px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .accountTabs button,
        .accountForm > button {
          padding: 11px 14px;
          border: 1px solid rgba(47, 72, 50, 0.16);
          border-radius: 999px;
          background: rgba(238, 242, 232, 0.8);
          color: #355b3e;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .accountForm {
          display: grid;
          gap: 14px;
        }

        .accountForm label {
          display: grid;
          gap: 6px;
          color: #4e6652;
          font-size: 10px;
          font-weight: 800;
        }

        .accountForm input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(47, 72, 50, 0.16);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.88);
          color: #203326;
          font-size: 14px;
        }

        .closingLine {
          margin: 28px 0 0;
          color: #617063;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size: 13px;
          font-style: italic;
          text-align: center;
        }

        /* ================= MOBILE ================= */

        @media (max-width: 760px) {
          .joinHeader {
            min-height: 62px;
            padding: 0 20px;
          }

          .signInLink {
            font-size: 10px;
          }

          .joinSection {
            width: min(100% - 28px, 620px);
            padding: 45px 0 42px;
          }

          .joinIntro {
            margin-bottom: 30px;
          }

          .joinIntro h1 {
            font-size: 50px;
          }

          .joinIntro p {
            font-size: 12px;
          }

          .membershipShell {
            padding: 22px;
            border-radius: 29px;
          }

          .membershipHeading h2 {
            font-size: 26px;
          }

          .planGrid {
            grid-template-columns: 1fr;
          }

          .planCard {
            min-height: 245px;
          }

          .included {
            grid-template-columns: 1fr;
            padding: 24px;
          }

          .includedGrid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 460px) {
          .joinIntro h1 {
            font-size: 43px;
          }

          .membershipShell {
            padding: 17px;
          }

          .planCard {
            padding: 23px;
          }

          .price strong {
            font-size: 39px;
          }

          .includedGrid {
            grid-template-columns: 1fr;
          }

          .planFooter,
          .annualSaving {
            left: 23px;
            right: 23px;
          }
        }
      `}</style>
    </main>
  );
}

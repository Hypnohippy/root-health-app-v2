"use client";

import { useRouter } from "next/navigation";
import RootAtmosphere from "../../../components/RootAtmosphere";
import RootEnso from "../../../components/RootEnso";

export default function CapacityContinuePage() {
  const router = useRouter();

  return (
    <RootAtmosphere type="reflection">
      <main className="closePage">
        <section className="closeShell">
          <div className="logo"><RootEnso size={78} /></div>
          <span className="eyebrow">CONTINUE WITH ROOT</span>
          <h1>Your snapshot is the beginning, not the product.</h1>
          <p className="lead">
            Root is built to help you notice patterns, understand what may be
            driving them, choose a useful next step and see whether it helped.
          </p>

          <div className="journey">
            <article><b>01</b><h2>Notice</h2><p>Short check-ins make changes visible.</p></article>
            <article><b>02</b><h2>Understand</h2><p>Root joins signals across body, mind, habits and context.</p></article>
            <article><b>03</b><h2>Respond</h2><p>Use Coach, Body, Mind and your Playbook to try something relevant.</p></article>
            <article><b>04</b><h2>Learn</h2><p>Root remembers what helped and builds your personal picture over time.</p></article>
          </div>

          <section className="membership">
            <div>
              <span className="eyebrow">ROOT PERSONAL</span>
              <h2>Everything in Root. One membership.</h2>
              <p>No feature tiers. Cancel anytime.</p>
            </div>

            <div className="plans">
              <button onClick={() => router.push("/personal/join?plan=monthly")}>
                <span>Monthly</span>
                <strong>£19.99</strong>
                <small>per month</small>
              </button>
              <button className="annual" onClick={() => router.push("/personal/join?plan=annual")}>
                <em>BEST VALUE</em>
                <span>Annual</span>
                <strong>£199</strong>
                <small>per year · save £40.88</small>
              </button>
            </div>
          </section>

          <div className="actions">
            <button className="buy" onClick={() => router.push("/personal/join?plan=annual")}>
              Start with Root
            </button>
            <button className="more" onClick={() => router.push("/personal")}>
              More about Root
            </button>
          </div>

          <p className="reassure">
            Private by design. Reflective, not diagnostic. Secure payment through Stripe.
          </p>
        </section>

        <style jsx>{`
          .closePage{min-height:100vh;padding:56px 20px;display:flex;justify-content:center;font-family:Inter,sans-serif;color:white}
          .closeShell{width:min(1040px,100%);text-align:center}
          .logo{display:flex;justify-content:center;margin-bottom:8px}
          .eyebrow{font-size:10px;letter-spacing:.18em;font-weight:900;color:rgba(255,255,255,.65)}
          h1{max-width:820px;margin:12px auto 16px;font:500 clamp(44px,7vw,74px)/1.02 Georgia,serif;letter-spacing:-.045em}
          .lead{max-width:720px;margin:0 auto;color:rgba(255,255,255,.80);font-size:18px;line-height:1.72}
          .journey{margin:34px auto 0;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
          .journey article{padding:22px;text-align:left;border-radius:24px;border:1px solid rgba(255,255,255,.16);background:rgba(16,16,16,.30);backdrop-filter:blur(18px)}
          .journey b{font:500 34px Georgia,serif;color:rgba(255,255,255,.40)}
          .journey h2{margin:14px 0 7px;font:500 24px Georgia,serif}
          .journey p{margin:0;color:rgba(255,255,255,.70);font-size:13px;line-height:1.6}
          .membership{margin:18px 0 0;padding:28px;border-radius:28px;border:1px solid rgba(255,255,255,.16);background:rgba(15,15,15,.35);display:grid;grid-template-columns:.8fr 1.2fr;gap:24px;align-items:center;text-align:left}
          .membership h2{margin:8px 0;font:500 32px Georgia,serif}
          .membership p{margin:0;color:rgba(255,255,255,.68)}
          .plans{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .plans button{position:relative;min-height:150px;padding:20px;border-radius:22px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.10);color:white;text-align:left;cursor:pointer}
          .plans button.annual{background:linear-gradient(145deg,rgba(255,255,255,.17),rgba(231,180,125,.12))}
          .plans em{position:absolute;right:14px;top:14px;font-size:8px;letter-spacing:.12em;font-style:normal;font-weight:900}
          .plans span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;color:rgba(255,255,255,.64)}
          .plans strong{display:block;margin-top:18px;font:500 38px Georgia,serif}
          .plans small{color:rgba(255,255,255,.65)}
          .actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:24px}
          .actions button{padding:15px 24px;border-radius:999px;font-weight:900;cursor:pointer}
          .buy{border:0;background:#fff;color:#151515}
          .more{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff}
          .reassure{margin:14px 0 0;color:rgba(255,255,255,.55);font-size:12px}
          @media(max-width:800px){.journey{grid-template-columns:1fr 1fr}.membership{grid-template-columns:1fr}.plans{grid-template-columns:1fr 1fr}}
          @media(max-width:520px){.journey,.plans{grid-template-columns:1fr}h1{font-size:44px}.closePage{padding-top:34px}}
        `}</style>
      </main>
    </RootAtmosphere>
  );
}

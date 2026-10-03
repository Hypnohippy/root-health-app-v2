export const introducerMarkets = ["corporate", "personal", "both"];
export const introducerTypes = [
  "corporate_introducer", "practitioner", "therapist", "coach",
  "professional_body", "influencer", "creator", "publisher",
  "community", "affiliate", "other",
];

export function supportsMarket(introducer, market) {
  const value = introducer?.introducer_market ?? "corporate";
  return ["corporate", "personal"].includes(market) &&
    (value === market || value === "both");
}

export function activeReferral(introducer, market, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return Boolean(introducer && supportsMarket(introducer, market) &&
    introducer.status === "active" &&
    (!introducer.agreement_start_date || introducer.agreement_start_date <= today) &&
    (!introducer.agreement_end_date || introducer.agreement_end_date >= today));
}

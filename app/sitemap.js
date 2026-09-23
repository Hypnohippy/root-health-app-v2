const SITE_URL = "https://www.roothealth.app";

const publicPages = [
  "/personal",
  "/organisations",
  "/organisations/pricing",
  "/organisations/pilot",
  "/organisations/membership",
  "/privacy",
  "/safety",
  "/terms",
];

export default function sitemap() {
  return publicPages.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path.startsWith("/organisations") ? "monthly" : "yearly",
    priority:
      path === "/personal" || path === "/organisations" ? 1 : 0.6,
  }));
}

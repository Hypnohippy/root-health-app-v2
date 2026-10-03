export function corporateEmailUrl(path, siteUrl = process.env.NEXT_PUBLIC_SITE_URL) {
  if (!siteUrl?.trim()) throw new Error("NEXT_PUBLIC_SITE_URL is required for Corporate email links.");
  const base = new URL(siteUrl.trim());
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password ||
      base.pathname !== "/" || base.search || base.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) site origin.");
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new Error("Corporate email links must use a local path.");
  }
  return new URL(path, base).href;
}

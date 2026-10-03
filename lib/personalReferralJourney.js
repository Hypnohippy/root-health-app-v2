const KEY = "root_personal_referral_code";
export function rememberPersonalReferral(search, storage) {
  const code = new URLSearchParams(search).get("ref");
  if (code !== null) {
    if (/^[a-z0-9-]{1,120}$/i.test(code)) storage.setItem(KEY, code.toLowerCase());
    else storage.removeItem(KEY);
  }
  return storage.getItem(KEY) || "";
}
export function personalReferralUrl(path, code) {
  if (!code) return path;
  return path + (path.includes("?") ? "&" : "?") + "ref=" + encodeURIComponent(code);
}

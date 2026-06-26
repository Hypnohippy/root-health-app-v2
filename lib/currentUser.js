export function getCurrentProfileKey() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem("root_profile_key_v1");
}

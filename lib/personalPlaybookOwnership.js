export function buildOwnedPlaybookInsert({ authenticatedUserId, profileKey, title, category, content, source = "Manual" } = {}) {
  return {
    user_id: String(authenticatedUserId || "").trim(),
    profile_key: String(profileKey || "").trim(),
    title: String(title || "").trim(),
    category: String(category || "General").trim() || "General",
    content: String(content || "").trim(),
    source,
  };
}

export function buildOwnedPlaybookUpdate({ authenticatedUserId, content } = {}) {
  return {
    user_id: String(authenticatedUserId || "").trim(),
    content: String(content || ""),
  };
}

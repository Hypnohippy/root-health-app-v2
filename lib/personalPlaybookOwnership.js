export function buildOwnedPlaybookInsert({ authenticatedUserId, profileKey, title, category, content, source = "Manual", itemType = "static", trackerDefinition = null } = {}) {
  return {
    user_id: String(authenticatedUserId || "").trim(),
    profile_key: String(profileKey || "").trim(),
    title: String(title || "").trim(),
    category: String(category || "General").trim() || "General",
    content: String(content || "").trim(),
    source,
    item_type: itemType,
    tracker_definition: trackerDefinition,
  };
}

export function buildOwnedPlaybookUpdate({ authenticatedUserId, content } = {}) {
  return {
    user_id: String(authenticatedUserId || "").trim(),
    content: String(content || ""),
  };
}

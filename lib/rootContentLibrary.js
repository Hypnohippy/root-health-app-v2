import { supabase } from "./supabase";

// Keep the shared boundary content-neutral even though the existing persistence
// table is named root_interventions. Consumers decide how an item is presented.
const PUBLISHED_FIELDS =
  "id, slug, title, category, target, description, script, audio_url, video_url, version";

export async function loadPublishedRootContent({ categories = [], targetTerms = [] } = {}) {
  try {
    const { data, error } = await supabase
      .from("root_interventions")
      .select(PUBLISHED_FIELDS)
      .eq("status", "published");

    if (error) throw error;

    const categorySet = new Set(categories.map((value) => String(value).toLowerCase()));
    const terms = targetTerms.map((value) => String(value).toLowerCase());
    const items = (data || []).filter((item) => {
      const categoryMatches = categorySet.size === 0 || categorySet.has(String(item.category || "").toLowerCase());
      const searchableText = `${item.target || ""} ${item.description || ""}`.toLowerCase();
      const targetMatches = terms.length === 0 || terms.some((term) => searchableText.includes(term));
      return categoryMatches && targetMatches;
    });

    return { ok: true, items };
  } catch (error) {
    console.error("ROOT PUBLISHED CONTENT LOAD ERROR:", error);
    return { ok: false, items: [], error };
  }
}

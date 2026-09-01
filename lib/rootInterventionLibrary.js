import { supabase } from "./supabase";

const PUBLISHED_FIELDS =
  "id, slug, title, category, target, description, script, audio_url, video_url, version";

export async function loadPublishedInterventions({ categories = [], targetTerms = [] } = {}) {
  try {
    const { data, error } = await supabase
      .from("root_interventions")
      .select(PUBLISHED_FIELDS)
      .eq("status", "published");

    if (error) throw error;

    const categorySet = new Set(categories.map((value) => String(value).toLowerCase()));
    const terms = targetTerms.map((value) => String(value).toLowerCase());
    const interventions = (data || []).filter((item) => {
      const categoryMatches = categorySet.size === 0 || categorySet.has(String(item.category || "").toLowerCase());
      const target = `${item.target || ""} ${item.description || ""}`.toLowerCase();
      const targetMatches = terms.length === 0 || terms.some((term) => target.includes(term));
      return categoryMatches && targetMatches;
    });

    return { ok: true, interventions };
  } catch (error) {
    console.error("ROOT PUBLISHED INTERVENTION LOAD ERROR:", error);
    return { ok: false, interventions: [], error };
  }
}

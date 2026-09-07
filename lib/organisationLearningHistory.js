export function latestOrganisationReviews(supabase, organisationId) {
  return supabase.from("organisation_learning_reviews").select("*")
    .eq("organisation_id", organisationId)
    .order("review_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false }).limit(24);
}

export function chronologicalReviews(reviews = []) {
  const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : -Infinity;
  return [...reviews].sort((a, b) =>
    (time(a.review_date) - time(b.review_date)) ||
    (time(a.created_at) - time(b.created_at)) ||
    String(a.id || "").localeCompare(String(b.id || "")));
}

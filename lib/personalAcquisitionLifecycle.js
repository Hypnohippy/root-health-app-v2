export async function recordPersonalAcquisitionCheckout({
  supabase,
  user,
  plan,
  checkoutSessionId,
  checkoutStartedAt = new Date().toISOString(),
}) {
  const email = String(user?.email || "").trim().toLowerCase();

  if (!supabase || !user?.id || !email) {
    return { tracked: false, reason: "missing_identity" };
  }

  const signupAt =
    typeof user?.created_at === "string" && user.created_at
      ? user.created_at
      : checkoutStartedAt;

  const { data, error } = await supabase.rpc(
    "record_personal_acquisition_checkout",
    {
      p_user_id: user.id,
      p_email: email,
      p_signup_at: signupAt,
      p_plan: plan,
      p_checkout_session_id: checkoutSessionId || null,
      p_checkout_started_at: checkoutStartedAt,
    }
  );

  if (error) throw error;

  return { tracked: true, acquisitionContactId: data || null };
}

export async function recordPersonalAcquisitionSubscription({
  supabase,
  user,
  plan,
  status,
  active,
  activatedAt = null,
  updatedAt = new Date().toISOString(),
}) {
  const email = String(user?.email || "").trim().toLowerCase();

  if (!supabase || !user?.id || !email) {
    return { tracked: false, reason: "missing_identity" };
  }

  const { data, error } = await supabase.rpc(
    "record_personal_acquisition_subscription",
    {
      p_user_id: user.id,
      p_email: email,
      p_plan: plan || null,
      p_status: status || null,
      p_active: Boolean(active),
      p_activated_at: activatedAt,
      p_updated_at: updatedAt,
    }
  );

  if (error) throw error;

  return { tracked: true, acquisitionContactId: data || null };
}

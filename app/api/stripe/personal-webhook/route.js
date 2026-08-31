import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function buildAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Root Personal webhook cannot connect to Supabase.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function stripeId(value) {
  return typeof value === "string" ? value : value?.id || null;
}

function stripeDate(value) {
  return Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}

function subscriptionPeriod(subscription) {
  const item = subscription?.items?.data?.[0];

  return {
    start: subscription?.current_period_start ?? item?.current_period_start,
    end: subscription?.current_period_end ?? item?.current_period_end,
  };
}

async function syncPersonalSubscription(subscription, checkoutSession = null) {
  const metadata = subscription?.metadata || {};
  const sessionMetadata = checkoutSession?.metadata || {};
  const userId = metadata.user_id || sessionMetadata.user_id;
  const rootProduct = metadata.root_product || sessionMetadata.root_product;

  if (rootProduct !== "personal") return;

  if (!userId) {
    throw new Error("Personal Stripe event is missing Root user metadata.");
  }

  const supabase = buildAdminClient();
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(userId);

  if (userError || !userData?.user) {
    throw userError || new Error("Personal Stripe event references an unknown Root user.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("personal_subscriptions")
    .select("stripe_checkout_session_id, subscription_activated_at")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const status = String(subscription?.status || "inactive").toLowerCase();
  const active = status === "active" || status === "trialing";
  const period = subscriptionPeriod(subscription);
  const now = new Date().toISOString();
  const priceId = subscription?.items?.data?.[0]?.price?.id || null;

  const values = {
    user_id: userId,
    plan: metadata.plan || sessionMetadata.plan || null,
    subscription_status: status,
    subscription_active: active,
    stripe_customer_id: stripeId(subscription?.customer) || stripeId(checkoutSession?.customer),
    stripe_subscription_id: subscription?.id || stripeId(checkoutSession?.subscription),
    stripe_checkout_session_id:
      checkoutSession?.id || existing?.stripe_checkout_session_id || null,
    stripe_price_id: priceId,
    current_period_start: stripeDate(period.start),
    current_period_end: stripeDate(period.end),
    cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
    subscription_activated_at:
      existing?.subscription_activated_at || (active ? now : null),
    subscription_updated_at: now,
  };

  const { error: upsertError } = await supabase
    .from("personal_subscriptions")
    .upsert(values, { onConflict: "user_id" });

  if (upsertError) throw upsertError;
}

async function subscriptionFromInvoice(invoice) {
  const subscriptionId =
    stripeId(invoice?.subscription) ||
    stripeId(invoice?.parent?.subscription_details?.subscription);

  return subscriptionId ? stripe.subscriptions.retrieve(subscriptionId) : null;
}

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_PERSONAL_WEBHOOK_SECRET;

  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("ROOT PERSONAL WEBHOOK SIGNATURE ERROR:", error?.message || error);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;

      if (session.metadata?.root_product === "personal") {
        const subscriptionId = stripeId(session.subscription);

        if (!subscriptionId) {
          throw new Error("Personal checkout completed without a subscription ID.");
        }

        await syncPersonalSubscription(
          await stripe.subscriptions.retrieve(subscriptionId),
          session
        );
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncPersonalSubscription(event.data.object);
    } else if (
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      const subscription = await subscriptionFromInvoice(event.data.object);

      if (subscription) await syncPersonalSubscription(subscription);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("ROOT PERSONAL WEBHOOK PROCESSING ERROR:", error);
    return NextResponse.json(
      { error: "Root could not process the Stripe event." },
      { status: 500 }
    );
  }
}

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

async function writeEntitlement(subscription, checkoutSession = null) {
  const userId = subscription?.metadata?.user_id || checkoutSession?.metadata?.user_id;

  if (!userId || subscription?.metadata?.root_product !== "personal") {
    throw new Error("Personal Stripe event is missing trusted user metadata.");
  }

  const status = String(subscription.status || "inactive").toLowerCase();
  const active = status === "active" || status === "trialing";
  const supabase = buildAdminClient();
  const { data, error: readError } = await supabase.auth.admin.getUserById(userId);

  if (readError || !data?.user) throw readError || new Error("Root user was not found.");

  const entitlement = {
    active,
    status,
    plan: subscription.metadata?.plan || checkoutSession?.metadata?.plan || null,
    stripe_customer_id:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id || null,
    stripe_subscription_id: subscription.id,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(data.user.app_metadata || {}),
      root_personal_entitlement: entitlement,
    },
  });

  if (updateError) throw updateError;
}

async function subscriptionFromInvoice(invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  return subscriptionId ? stripe.subscriptions.retrieve(subscriptionId) : null;
}

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_PERSONAL_WEBHOOK_SECRET;

  if (!webhookSecret) {
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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.metadata?.root_product !== "personal") {
        return NextResponse.json({ received: true });
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (!subscriptionId) {
        throw new Error("Personal checkout completed without a subscription ID.");
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await writeEntitlement(subscription, session);
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      if (event.data.object.metadata?.root_product === "personal") {
        await writeEntitlement(event.data.object);
      }
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const subscription = await subscriptionFromInvoice(event.data.object);

      if (subscription?.metadata?.root_product === "personal") {
        await writeEntitlement(subscription);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("ROOT PERSONAL WEBHOOK PROCESSING ERROR:", error);
    return NextResponse.json({ error: "Root could not process the Stripe event." }, { status: 500 });
  }
}

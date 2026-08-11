import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@supabase/supabase-js";

const stripe =
  new Stripe(
    process.env.STRIPE_SECRET_KEY
  );

const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY;

function buildAdminClient() {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Root webhook cannot connect to Supabase."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function updateOrganisation({
  organisationId,
  values,
}) {
  if (!organisationId) {
    throw new Error(
      "Root webhook received no organisation ID."
    );
  }

  const supabase =
    buildAdminClient();

  const {
    error,
  } =
    await supabase
      .from("organisations")
      .update({
        ...values,

        subscription_updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        organisationId
      );

  if (error) {
    throw error;
  }
}

async function activateFromCheckout(
  session
) {
  const organisationId =
    session?.metadata
      ?.organisation_id;

  if (!organisationId) {
    throw new Error(
      "Checkout completed without Root organisation metadata."
    );
  }

  const subscriptionId =
    typeof session.subscription ===
    "string"
      ? session.subscription
      : session.subscription?.id ||
        null;

  const customerId =
    typeof session.customer ===
    "string"
      ? session.customer
      : session.customer?.id ||
        null;

  let subscriptionStatus =
    "active";

  if (subscriptionId) {
    const subscription =
      await stripe.subscriptions.retrieve(
        subscriptionId
      );

    subscriptionStatus =
      subscription?.status ||
      "active";

    if (
      subscriptionStatus !==
        "active" &&
      subscriptionStatus !==
        "trialing"
    ) {
      console.log(
        "ROOT WEBHOOK CHECKOUT WAITING:",
        organisationId,
        subscriptionStatus
      );

      return;
    }
  }

  await updateOrganisation({
    organisationId,

    values: {
      subscription_status:
        "active",

      subscription_active:
        true,

      stripe_customer_id:
        customerId,

      stripe_subscription_id:
        subscriptionId,

      subscription_activated_at:
        new Date().toISOString(),
    },
  });

  console.log(
    "ROOT WORKPLACE ACTIVATED:",
    organisationId
  );
}

async function updateFromSubscription(
  subscription
) {
  const organisationId =
    subscription?.metadata
      ?.organisation_id;

  if (!organisationId) {
    console.log(
      "ROOT WEBHOOK SUBSCRIPTION WITHOUT ORGANISATION METADATA:",
      subscription?.id
    );

    return;
  }

  const status =
    String(
      subscription?.status ||
      ""
    ).toLowerCase();

  const isActive =
    status === "active" ||
    status === "trialing";

  await updateOrganisation({
    organisationId,

    values: {
      subscription_status:
        isActive
          ? "active"
          : status ||
            "inactive",

      subscription_active:
        isActive,

      stripe_customer_id:
        typeof subscription
          ?.customer ===
          "string"
          ? subscription.customer
          : subscription
              ?.customer?.id ||
            null,

      stripe_subscription_id:
        subscription?.id ||
        null,
    },
  });

  console.log(
    "ROOT WORKPLACE SUBSCRIPTION UPDATED:",
    organisationId,
    status
  );
}

async function handleInvoicePaid(
  invoice
) {
  const subscriptionId =
    typeof invoice?.subscription ===
    "string"
      ? invoice.subscription
      : invoice?.subscription?.id ||
        null;

  if (!subscriptionId) {
    return;
  }

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  await updateFromSubscription(
    subscription
  );
}

async function handleInvoiceFailed(
  invoice
) {
  const subscriptionId =
    typeof invoice?.subscription ===
    "string"
      ? invoice.subscription
      : invoice?.subscription?.id ||
        null;

  if (!subscriptionId) {
    return;
  }

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  const organisationId =
    subscription?.metadata
      ?.organisation_id;

  if (!organisationId) {
    return;
  }

  await updateOrganisation({
    organisationId,

    values: {
      subscription_status:
        "payment_issue",

      subscription_active:
        false,

      stripe_subscription_id:
        subscriptionId,
    },
  });

  console.log(
    "ROOT WORKPLACE PAYMENT ISSUE:",
    organisationId
  );
}

export async function POST(request) {
  const webhookSecret =
    process.env
      .STRIPE_WORKPLACE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "ROOT WORKPLACE WEBHOOK SECRET MISSING"
    );

    return NextResponse.json(
      {
        error:
          "Webhook is not configured.",
      },
      {
        status: 500,
      }
    );
  }

  const signature =
    request.headers.get(
      "stripe-signature"
    );

  if (!signature) {
    return NextResponse.json(
      {
        error:
          "Missing Stripe signature.",
      },
      {
        status: 400,
      }
    );
  }

  const rawBody =
    await request.text();

  let event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "ROOT WORKPLACE WEBHOOK SIGNATURE ERROR:",
      error?.message ||
        error
    );

    return NextResponse.json(
      {
        error:
          "Invalid webhook signature.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await activateFromCheckout(
          event.data.object
        );

        break;

      case "invoice.paid":
        await handleInvoicePaid(
          event.data.object
        );

        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(
          event.data.object
        );

        break;

      case "customer.subscription.updated":
        await updateFromSubscription(
          event.data.object
        );

        break;

      case "customer.subscription.deleted":
        await updateFromSubscription(
          event.data.object
        );

        break;

      default:
        console.log(
          "ROOT WORKPLACE WEBHOOK IGNORED:",
          event.type
        );
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "ROOT WORKPLACE WEBHOOK PROCESSING ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Root could not process the Stripe event.",
      },
      {
        status: 500,
      }
    );
  }
}

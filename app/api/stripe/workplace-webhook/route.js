import { NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer";

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

async function sendPaidSetupAccess(
  supabase,
  application
) {
  const crypto =
    await import("node:crypto");

  const adminEmail =
    String(
      application.admin_email ||
        ""
    )
      .trim()
      .toLowerCase();

  if (!adminEmail) {
    throw new Error(
      "Paid Workplace application has no authorised administrator email."
    );
  }

  /*
   * Create a unique one-time setup credential.
   *
   * Email is only the delivery address.
   * The token is the authority for creating
   * Workplace access.
   */
  const rawToken =
    crypto.randomBytes(32)
      .toString("hex");

  const tokenHash =
    crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

  const expiresAt =
    new Date(
      Date.now() +
        48 * 60 * 60 * 1000
    ).toISOString();

  /*
   * Stripe may retry webhooks.
   *
   * Revoke any previous live setup
   * invitation before issuing a fresh one.
   */
  const {
    error: revokeError,
  } =
    await supabase
      .from(
        "organisation_setup_invites"
      )
      .update({
        status:
          "revoked",

        revoked_at:
          new Date().toISOString(),
      })
      .eq(
        "application_id",
        application.id
      )
      .eq(
        "status",
        "pending"
      );

  if (revokeError) {
    throw revokeError;
  }

  const {
    data: setupInvite,
    error: setupInviteError,
  } =
    await supabase
      .from(
        "organisation_setup_invites"
      )
      .insert({
        application_id:
          application.id,

        intended_email:
          adminEmail,

        intended_role:
          "organisation_admin",

        token_hash:
          tokenHash,

        status:
          "pending",

        expires_at:
          expiresAt,

        /*
         * This invitation was authorised
         * by confirmed Stripe payment,
         * not by a Root admin button.
         */
        created_by:
          null,
      })
      .select(
        `
          id,
          application_id,
          intended_email,
          intended_role,
          status,
          expires_at
        `
      )
      .single();

  if (
    setupInviteError ||
    !setupInvite
  ) {
    throw (
      setupInviteError ||
      new Error(
        "Root could not create the paid Workplace setup invitation."
      )
    );
  }

  const setupUrl =
    `https://roothealth.app/workplace-setup` +
    `?token=${encodeURIComponent(
      rawToken
    )}`;

  const smtpUser =
    String(
      process.env.ROOT_SMTP_USER ||
        ""
    ).trim();

  const smtpPassword =
    String(
      process.env
        .ROOT_SMTP_PASSWORD ||
        ""
    ).trim();

  const smtpFrom =
    String(
      process.env.ROOT_SMTP_FROM ||
        smtpUser
    ).trim();

  if (
    !smtpUser ||
    !smtpPassword ||
    !smtpFrom
  ) {
    throw new Error(
      "Root Workplace email is not configured."
    );
  }

  const transporter =
    nodemailer.createTransport({
      service:
        "gmail",

      auth: {
        user:
          smtpUser,

        pass:
          smtpPassword,
      },
    });

  const organisationName =
    String(
      application
        .organisation_name ||
        "your organisation"
    ).trim();

  const contactName =
    String(
      application.contact_name ||
        ""
    ).trim();

  const greeting =
    contactName
      ? `Dear ${contactName},`
      : "Hello,";

  const subject =
    "Welcome to Root Workplace";

  const text =
`${greeting}

Your Root Workplace membership for ${organisationName} has been confirmed.

Your subscription is active and your secure organisation setup is ready.

You have been invited to set up the authorised Root Workplace administrator account.

This setup invitation is unique and can only be used once.

Set up Root Workplace:

${setupUrl}

This invitation expires in 48 hours.

If another Root account is currently signed in on your device, Root will ask you to continue with the account intended for this invitation before any organisation access is created.

If you were not expecting this invitation, you can safely ignore this email.

Kind regards,

Root Workplace`;

  await transporter.sendMail({
    from:
      smtpFrom,

    to:
      adminEmail,

    replyTo:
      smtpUser,

    subject,

    text,
  });

  return setupInvite;
}

async function activateDirectPaidFromCheckout(
  session
) {
  const applicationId =
    session?.metadata
      ?.application_id;

  if (!applicationId) {
    throw new Error(
      "Direct paid checkout completed without an application ID."
    );
  }

  const supabase =
    buildAdminClient();

  const {
    data: application,
    error: applicationError,
  } =
    await supabase
      .from(
        "organisation_applications"
      )
      .select(
        `
          id,
          organisation_name,
          contact_name,
          contact_email,
          admin_email,
          employee_count,
          industry,
          status,
          access_path,
          payment_status
        `
      )
      .eq(
        "id",
        applicationId
      )
      .maybeSingle();

  if (
    applicationError ||
    !application
  ) {
    throw (
      applicationError ||
      new Error(
        "Root could not find the paid Workplace application."
      )
    );
  }

  if (
    application.access_path !==
    "paid"
  ) {
    throw new Error(
      "Stripe payment was linked to an application that is not a direct paid membership."
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
      String(
        subscription?.status ||
          ""
      ).toLowerCase();

    if (
      subscriptionStatus !==
        "active" &&
      subscriptionStatus !==
        "trialing"
    ) {
      console.log(
        "ROOT DIRECT PAID CHECKOUT WAITING:",
        applicationId,
        subscriptionStatus
      );

      return;
    }
  }

  const now =
    new Date().toISOString();

  const {
    error: applicationUpdateError,
  } =
    await supabase
      .from(
        "organisation_applications"
      )
      .update({
        status:
          "approved",

        reviewed_at:
          now,

        payment_status:
          "paid",

        stripe_checkout_session_id:
          session.id ||
          null,

        stripe_customer_id:
          customerId,

        stripe_subscription_id:
          subscriptionId,

        paid_at:
          now,
      })
      .eq(
        "id",
        application.id
      );

  if (applicationUpdateError) {
    throw applicationUpdateError;
  }

  /*
   * Payment establishes commercial
   * entitlement.
   *
   * The secure one-time invitation still
   * establishes who may create the
   * organisation and administrator access.
   */
  await sendPaidSetupAccess(
    supabase,
    application
  );

  console.log(
    "ROOT DIRECT WORKPLACE PAYMENT CONFIRMED:",
    application.id,
    application.organisation_name
  );
}

async function activateFromCheckout(
  session
) {
  const accessPath =
    String(
      session?.metadata
        ?.access_path ||
        ""
    )
      .trim()
      .toLowerCase();

  const applicationId =
    session?.metadata
      ?.application_id;

  /*
   * DIRECT PAID CUSTOMER
   */
  if (
    accessPath === "paid" &&
    applicationId
  ) {
    await activateDirectPaidFromCheckout(
      session
    );

    return;
  }

  /*
   * EXISTING ORGANISATION
   *
   * Keep the existing trial-to-paid
   * conversion path unchanged.
   */
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

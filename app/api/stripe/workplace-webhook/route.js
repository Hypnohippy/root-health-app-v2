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

async function recordInitialRevenueAndCommission({
  supabase,
  application,
  session,
  receivedAt,
}) {
  const collectedAmount =
    Number(session?.amount_total || 0) /
    100;

  const currency =
    String(
      session?.currency || "gbp"
    ).toLowerCase();

  if (
    !Number.isFinite(
      collectedAmount
    ) ||
    collectedAmount <= 0
  ) {
    throw new Error(
      "Stripe checkout completed without a valid collected amount."
    );
  }

  /*
   * ======================================================
   * REVENUE EVENT
   *
   * Every successfully collected direct Root Workplace
   * payment belongs in Root's revenue ledger whether the
   * customer came from an introducer or from Root directly.
   *
   * The unique Stripe checkout-session index makes this
   * safe against webhook retries.
   * ======================================================
   */

  let revenueEvent = null;

  const {
    data: existingRevenueEvent,
    error: existingRevenueError,
  } = await supabase
    .from(
      "organisation_revenue_events"
    )
    .select(
      `
        id,
        application_id,
        net_collected_amount,
        stripe_checkout_session_id
      `
    )
    .eq(
      "stripe_checkout_session_id",
      session.id
    )
    .maybeSingle();

  if (existingRevenueError) {
    throw existingRevenueError;
  }

  if (existingRevenueEvent) {
    revenueEvent =
      existingRevenueEvent;
  } else {
    const {
      data: createdRevenueEvent,
      error: revenueInsertError,
    } = await supabase
      .from(
        "organisation_revenue_events"
      )
      .insert({
        organisation_id:
          null,

        application_id:
          application.id,

        event_type:
          "payment_received",

        payment_source:
          "stripe_checkout",

        currency,

        gross_amount:
          collectedAmount,

        refunded_amount:
          0,

        net_collected_amount:
          collectedAmount,

        received_at:
          receivedAt,

        stripe_checkout_session_id:
          session.id,

        stripe_customer_id:
          typeof session.customer ===
          "string"
            ? session.customer
            : session.customer?.id ||
              null,

        stripe_subscription_id:
          typeof session.subscription ===
          "string"
            ? session.subscription
            : session.subscription
                ?.id ||
              null,

        stripe_payment_intent_id:
          typeof session.payment_intent ===
          "string"
            ? session.payment_intent
            : session.payment_intent
                ?.id ||
              null,

        verified_at:
          receivedAt,

        verified_by:
          null,

        notes:
          "Stripe-confirmed initial Root Workplace membership payment.",
      })
      .select(
        `
          id,
          application_id,
          net_collected_amount,
          stripe_checkout_session_id
        `
      )
      .single();

    if (
      revenueInsertError ||
      !createdRevenueEvent
    ) {
      throw (
        revenueInsertError ||
        new Error(
          "Root could not record the Stripe revenue event."
        )
      );
    }

    revenueEvent =
      createdRevenueEvent;
  }

  /*
   * ======================================================
   * ROOT-DIRECT CUSTOMER
   *
   * Revenue is still recorded, but no introducer means
   * there is no commission liability.
   * ======================================================
   */

  if (!application.introducer_id) {
    return {
      revenueEvent,
      commission:
        null,
    };
  }

  const commissionPercent =
    Number(
      application
        .commission_percent_at_conversion ||
        0
    );

  const commissionStructure =
    String(
      application
        .commission_structure_at_conversion ||
        "one_off"
    )
      .trim()
      .toLowerCase();

  const commissionBasis =
    String(
      application
        .commission_basis_at_conversion ||
        "collected_subscription_revenue"
    )
      .trim()
      .toLowerCase();

  if (
    !Number.isFinite(
      commissionPercent
    ) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    throw new Error(
      "Root found invalid frozen introducer commission terms."
    );
  }

  if (
    ![
      "one_off",
      "recurring",
    ].includes(
      commissionStructure
    )
  ) {
    throw new Error(
      "Root found an invalid frozen introducer commission structure."
    );
  }

  /*
   * Commission is always based on money actually
   * collected, matching the commercial agreement.
   */
  const qualifyingAmount =
    collectedAmount;

  const commissionAmount =
    Math.round(
      qualifyingAmount *
        (commissionPercent / 100) *
        100
    ) / 100;

  const clearanceUntil =
    new Date(
      new Date(
        receivedAt
      ).getTime() +
        14 *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  /*
   * The unique revenue_event_id index prevents
   * one collected payment creating two commissions.
   */
  const {
    data: existingCommission,
    error:
      existingCommissionError,
  } = await supabase
    .from(
      "organisation_commissions"
    )
    .select(
      `
        id,
        revenue_event_id,
        commission_amount,
        status
      `
    )
    .eq(
      "revenue_event_id",
      revenueEvent.id
    )
    .maybeSingle();

  if (existingCommissionError) {
    throw existingCommissionError;
  }

  if (existingCommission) {
    return {
      revenueEvent,
      commission:
        existingCommission,
    };
  }

  const {
    data: commission,
    error: commissionError,
  } = await supabase
    .from(
      "organisation_commissions"
    )
    .insert({
      revenue_event_id:
        revenueEvent.id,

      introducer_id:
        application.introducer_id,

      introducer_campaign_id:
        application
          .introducer_campaign_id ||
        null,

      application_id:
        application.id,

      organisation_id:
        null,

      organisation_name:
        application
          .organisation_name,

      referral_code:
        application.referral_code ||
        null,

      referral_campaign_code:
        application
          .referral_campaign_code ||
        null,

      commission_percent:
        commissionPercent,

      commission_basis:
        commissionBasis,

      commission_structure:
        commissionStructure,

      commission_event:
        "initial_payment",

      currency,

      collected_amount:
        collectedAmount,

      qualifying_amount:
        qualifyingAmount,

      commission_amount:
        commissionAmount,

      status:
        "clearance",

      earned_at:
        receivedAt,

      clearance_until:
        clearanceUntil,

      payable_at:
        clearanceUntil,

      notes:
        "Automatically earned from Stripe-confirmed initial Root Workplace payment.",
    })
    .select(
      `
        id,
        revenue_event_id,
        commission_amount,
        status,
        clearance_until,
        payable_at
      `
    )
    .single();

  if (
    commissionError ||
    !commission
  ) {
    throw (
      commissionError ||
      new Error(
        "Root could not record the introducer commission."
      )
    );
  }

  return {
    revenueEvent,
    commission,
  };
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
    payment_status,
    introducer_id,
    introducer_campaign_id,
    referral_code,
    referral_campaign_code,
    commission_percent_at_conversion,
    commission_basis_at_conversion,
    commission_structure_at_conversion
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

    await recordInitialRevenueAndCommission({
  supabase,
  application,
  session,
  receivedAt: now,
});

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

  /*
   * Keep the existing Root Workplace
   * subscription state in sync.
   */
  await updateFromSubscription(
    subscription
  );

  const applicationId =
    subscription?.metadata
      ?.application_id ||
    invoice?.metadata
      ?.application_id ||
    null;

  /*
   * Older subscriptions may not carry an
   * application ID. Their normal subscription
   * update above still succeeds; we simply do
   * not create referral accounting records.
   */
  if (!applicationId) {
    return;
  }

  const supabase =
    createAdminClient();

  const {
    data: application,
    error: applicationError,
  } = await supabase
    .from(
      "organisation_applications"
    )
    .select(
      `
        id,
        organisation_name,
        access_path,
        payment_status,
        introducer_id,
        introducer_campaign_id,
        referral_code,
        referral_campaign_code,
        commission_percent_at_conversion,
        commission_basis_at_conversion,
        commission_structure_at_conversion
      `
    )
    .eq(
      "id",
      applicationId
    )
    .maybeSingle();

  if (applicationError) {
    throw applicationError;
  }

  if (!application) {
    return;
  }

  if (
    String(
      application.access_path ||
        ""
    )
      .trim()
      .toLowerCase() !== "paid"
  ) {
    return;
  }

  const invoiceId =
    invoice?.id || null;

  if (!invoiceId) {
    return;
  }

  /*
   * Stripe may retry invoice.paid.
   *
   * If this invoice is already in Root's
   * revenue ledger, there is nothing else
   * to do.
   */
  const {
    data: existingRevenueEvent,
    error: existingRevenueError,
  } = await supabase
    .from(
      "organisation_revenue_events"
    )
    .select(
      `
        id,
        stripe_invoice_id
      `
    )
    .eq(
      "stripe_invoice_id",
      invoiceId
    )
    .maybeSingle();

  if (existingRevenueError) {
    throw existingRevenueError;
  }

  if (existingRevenueEvent) {
    return;
  }

  /*
   * IMPORTANT:
   *
   * checkout.session.completed already records
   * the initial Root Workplace payment.
   *
   * Stripe also emits invoice.paid for that
   * first subscription invoice.
   *
   * An existing initial_payment commission tells
   * us the introduced conversion has already
   * received its first-payment commission.
   */
  const {
    data: initialCommission,
    error: initialCommissionError,
  } = application.introducer_id
    ? await supabase
        .from(
          "organisation_commissions"
        )
        .select(
          `
            id,
            commission_event
          `
        )
        .eq(
          "application_id",
          application.id
        )
        .eq(
          "commission_event",
          "initial_payment"
        )
        .maybeSingle()
    : {
        data: null,
        error: null,
      };

  if (initialCommissionError) {
    throw initialCommissionError;
  }

  /*
   * If checkout has not yet created the initial
   * revenue/commission record, do not let the
   * first invoice race ahead and masquerade as
   * recurring revenue.
   *
   * Stripe will retry events if necessary.
   */
  if (
    application.introducer_id &&
    !initialCommission
  ) {
    console.log(
      "ROOT INTRODUCER INVOICE WAITING FOR INITIAL COMMISSION:",
      application.id,
      invoiceId
    );

    return;
  }

  /*
   * Stripe amounts are supplied in the smallest
   * currency unit, so GBP pence become pounds.
   *
   * amount_paid is the money actually collected
   * against this invoice.
   */
  const collectedAmount =
    Number(
      invoice?.amount_paid || 0
    ) / 100;

  if (
    !Number.isFinite(
      collectedAmount
    ) ||
    collectedAmount <= 0
  ) {
    return;
  }

  const currency =
    String(
      invoice?.currency ||
        "gbp"
    ).toLowerCase();

  const receivedAt =
    invoice?.status_transitions
      ?.paid_at
      ? new Date(
          invoice
            .status_transitions
            .paid_at * 1000
        ).toISOString()
      : new Date().toISOString();

  const paymentIntentId =
    typeof invoice
      ?.payment_intent ===
    "string"
      ? invoice.payment_intent
      : invoice?.payment_intent
          ?.id ||
        null;

  /*
   * Record the collected invoice revenue for
   * BOTH Root-direct and introduced customers.
   */
  const {
    data: revenueEvent,
    error: revenueEventError,
  } = await supabase
    .from(
      "organisation_revenue_events"
    )
    .insert({
      organisation_id:
        null,

      application_id:
        application.id,

      event_type:
        "payment_received",

      payment_source:
        "stripe_invoice",

      currency,

      gross_amount:
        collectedAmount,

      refunded_amount:
        0,

      net_collected_amount:
        collectedAmount,

      received_at:
        receivedAt,

      stripe_customer_id:
        typeof invoice
          ?.customer ===
        "string"
          ? invoice.customer
          : invoice?.customer?.id ||
            null,

      stripe_subscription_id:
        subscriptionId,

      stripe_invoice_id:
        invoiceId,

      stripe_payment_intent_id:
        paymentIntentId,

      verified_at:
        receivedAt,

      verified_by:
        null,

      notes:
        "Stripe-confirmed Root Workplace subscription invoice payment.",
    })
    .select(
      `
        id,
        net_collected_amount,
        stripe_invoice_id
      `
    )
    .single();

  if (
    revenueEventError ||
    !revenueEvent
  ) {
    /*
     * The unique invoice index is our final
     * database-level duplicate guardrail.
     */
    if (
      revenueEventError?.code ===
      "23505"
    ) {
      return;
    }

    throw (
      revenueEventError ||
      new Error(
        "Root could not record the Stripe invoice revenue event."
      )
    );
  }

  /*
   * Root-direct customer:
   * revenue belongs in the ledger, but there
   * is no introducer commission.
   */
  if (!application.introducer_id) {
    return;
  }

  const commissionStructure =
    String(
      application
        .commission_structure_at_conversion ||
        "one_off"
    )
      .trim()
      .toLowerCase();

  /*
   * ONE-OFF AGREEMENT
   *
   * Initial payment has already generated the
   * introducer's commission. Monthly invoices
   * remain revenue records only.
   */
  if (
    commissionStructure ===
    "one_off"
  ) {
    return;
  }

  /*
   * RECURRING AGREEMENT
   *
   * Every subsequent collected invoice earns
   * commission at the percentage frozen when
   * this customer converted.
   */
  if (
    commissionStructure !==
    "recurring"
  ) {
    throw new Error(
      "Root found an invalid frozen introducer commission structure."
    );
  }

  const commissionPercent =
    Number(
      application
        .commission_percent_at_conversion ||
        0
    );

  if (
    !Number.isFinite(
      commissionPercent
    ) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    throw new Error(
      "Root found invalid frozen introducer commission terms."
    );
  }

  const commissionBasis =
    String(
      application
        .commission_basis_at_conversion ||
        "collected_subscription_revenue"
    )
      .trim()
      .toLowerCase();

  const qualifyingAmount =
    collectedAmount;

  const commissionAmount =
    Math.round(
      qualifyingAmount *
        (commissionPercent / 100) *
        100
    ) / 100;

  const clearanceUntil =
    new Date(
      new Date(
        receivedAt
      ).getTime() +
        14 *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  const {
    error: commissionError,
  } = await supabase
    .from(
      "organisation_commissions"
    )
    .insert({
      revenue_event_id:
        revenueEvent.id,

      introducer_id:
        application.introducer_id,

      introducer_campaign_id:
        application
          .introducer_campaign_id ||
        null,

      application_id:
        application.id,

      organisation_id:
        null,

      organisation_name:
        application
          .organisation_name,

      referral_code:
        application.referral_code ||
        null,

      referral_campaign_code:
        application
          .referral_campaign_code ||
        null,

      commission_percent:
        commissionPercent,

      commission_basis:
        commissionBasis,

      commission_structure:
        "recurring",

      commission_event:
        "recurring_payment",

      currency,

      collected_amount:
        collectedAmount,

      qualifying_amount:
        qualifyingAmount,

      commission_amount:
        commissionAmount,

      status:
        "clearance",

      earned_at:
        receivedAt,

      clearance_until:
        clearanceUntil,

      payable_at:
        clearanceUntil,

      notes:
        "Automatically earned from Stripe-confirmed recurring Root Workplace payment.",
    });

  if (commissionError) {
    /*
     * revenue_event_id is unique in the
     * commission ledger, so webhook retries
     * cannot create duplicate commission.
     */
    if (
      commissionError?.code ===
      "23505"
    ) {
      return;
    }

    throw commissionError;
  }

  console.log(
    "ROOT RECURRING INTRODUCER COMMISSION RECORDED:",
    application.id,
    invoiceId,
    commissionAmount
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

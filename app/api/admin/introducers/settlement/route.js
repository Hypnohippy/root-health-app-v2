import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const rootAdminEmails =
  String(
    process.env.ROOT_ADMIN_EMAIL || ""
  )
    .toLowerCase()
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

function buildAdminClient() {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Root settlement administration is not configured."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function buildAuthClient() {
  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    throw new Error(
      "Root authentication is not configured."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function normaliseEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function cleanText(value) {
  const cleaned =
    String(value || "").trim();

  return cleaned || null;
}

async function requireRootAdmin(
  request
) {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  const accessToken =
    authHeader?.startsWith(
      "Bearer "
    )
      ? authHeader.slice(7)
      : null;

  if (!accessToken) {
    return {
      authorised: false,
      status: 401,
      error:
        "Root administrator sign-in required.",
    };
  }

  const authClient =
    buildAuthClient();

  const {
    data,
    error,
  } =
    await authClient.auth.getUser(
      accessToken
    );

  const user =
    data?.user || null;

  if (
    error ||
    !user
  ) {
    return {
      authorised: false,
      status: 401,
      error:
        "Root could not verify this account.",
    };
  }

  const email =
    normaliseEmail(
      user.email
    );

  if (
    !rootAdminEmails.includes(
      email
    )
  ) {
    return {
      authorised: false,
      status: 403,
      error:
        "This account cannot manage Root settlements.",
    };
  }

  return {
    authorised: true,
    user,
  };
}

async function getCommission(
  supabase,
  commissionId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "organisation_commissions"
      )
      .select(
        `
          id,
          revenue_event_id,
          introducer_id,
          introducer_campaign_id,
          application_id,
          organisation_id,
          organisation_name,
          referral_code,
          referral_campaign_code,
          commission_percent,
          commission_basis,
          commission_structure,
          commission_event,
          currency,
          collected_amount,
          qualifying_amount,
          commission_amount,
          vat_registered,
          vat_rate,
          vat_amount,
          total_payable,
          status,
          earned_at,
          clearance_until,
          payable_at,
          approved_at,
          paid_at,
          payout_provider,
          payout_reference,
          provider_payout_id,
          invoice_requested_at,
          invoice_received_at,
          invoice_reference,
          remittance_document_id,
          notes,
          created_at,
          updated_at
        `
      )
      .eq(
        "id",
        commissionId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Root could not find this commission."
    );
  }

  return data;
}

async function getIntroducer(
  supabase,
  introducerId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "organisation_introducers"
      )
      .select(
        `
          id,
          name,
          referral_code,
          commission_percent,
          commission_basis,
          commission_structure,
          payment_document_method,
          status,
          contact_name,
          contact_email,
          notes
        `
      )
      .eq(
        "id",
        introducerId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Root could not find this introducer."
    );
  }

  return data;
}

function assertCommissionActive(
  commission
) {
  const status =
    String(
      commission?.status || ""
    )
      .trim()
      .toLowerCase();

  if (
    [
      "reversed",
      "cancelled",
    ].includes(status)
  ) {
    throw new Error(
      "This commission is no longer available for settlement."
    );
  }
}

function assertCommissionPayable(
  commission
) {
  assertCommissionActive(
    commission
  );

  if (
    commission.status ===
    "paid"
  ) {
    throw new Error(
      "This commission has already been paid."
    );
  }

  if (
    !commission.payable_at
  ) {
    throw new Error(
      "This commission does not yet have a payable date."
    );
  }

  const payableAt =
    new Date(
      commission.payable_at
    );

  const now =
    new Date();

  if (
    Number.isNaN(
      payableAt.getTime()
    ) ||
    payableAt > now
  ) {
    throw new Error(
      "This commission has not yet reached its payable date."
    );
  }
}

async function requestInvoice({
  supabase,
  commission,
  introducer,
}) {
  assertCommissionActive(
    commission
  );

  if (
    introducer.payment_document_method !==
    "introducer_invoice"
  ) {
    throw new Error(
      "This introducer is not configured to invoice Root."
    );
  }

  if (
    commission.invoice_received_at
  ) {
    throw new Error(
      "Root has already recorded an invoice for this commission."
    );
  }

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "organisation_commissions"
      )
      .update({
        invoice_requested_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        commission.id
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return {
    message:
      "Invoice request recorded.",
    commission: data,
  };
}

async function recordInvoiceReceived({
  supabase,
  commission,
  introducer,
  body,
}) {
  assertCommissionActive(
    commission
  );

  if (
    introducer.payment_document_method !==
    "introducer_invoice"
  ) {
    throw new Error(
      "This introducer is not configured to invoice Root."
    );
  }

  const invoiceReference =
    cleanText(
      body?.invoiceReference
    );

  if (!invoiceReference) {
    throw new Error(
      "Enter the introducer invoice reference."
    );
  }

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "organisation_commissions"
      )
      .update({
        invoice_received_at:
          now,

        invoice_reference:
          invoiceReference,

        updated_at:
          now,
      })
      .eq(
        "id",
        commission.id
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return {
    message:
      "Introducer invoice recorded.",
    commission: data,
  };
}

async function markCommissionPaid({
  supabase,
  commission,
  introducer,
  body,
}) {
  assertCommissionPayable(
    commission
  );

  const payoutReference =
    cleanText(
      body?.payoutReference
    );

  const payoutProvider =
    cleanText(
      body?.payoutProvider
    ) ||
    "manual";

  const notes =
    cleanText(
      body?.notes
    );

  if (!payoutReference) {
    throw new Error(
      "Enter the payment reference before marking this commission paid."
    );
  }

  if (
    introducer.payment_document_method ===
      "introducer_invoice" &&
    !commission.invoice_received_at
  ) {
    throw new Error(
      "Record the introducer invoice before marking this commission paid."
    );
  }

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "organisation_commissions"
      )
      .update({
        status:
          "paid",

        approved_at:
          commission.approved_at ||
          now,

        paid_at:
          now,

        payout_provider:
          payoutProvider,

        payout_reference:
          payoutReference,

        notes:
          notes ||
          commission.notes ||
          null,

        updated_at:
          now,
      })
      .eq(
        "id",
        commission.id
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return {
    message:
      "Commission marked as paid.",
    commission: data,
  };
}

async function generateRemittance({
  supabase,
  commission,
  introducer,
}) {
  if (
    commission.status !==
      "paid" ||
    !commission.paid_at
  ) {
    throw new Error(
      "A remittance can only be generated after the commission has been paid."
    );
  }

  if (
    commission.remittance_document_id
  ) {
    const {
      data:
        existingDocument,
      error:
        existingError,
    } =
      await supabase
        .from(
          "organisation_commercial_documents"
        )
        .select("*")
        .eq(
          "id",
          commission.remittance_document_id
        )
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingDocument) {
      return {
        message:
          "Existing remittance returned.",
        document:
          existingDocument,
        alreadyGenerated:
          true,
      };
    }
  }

  const {
    data:
      documentNumber,
    error:
      numberError,
  } =
    await supabase.rpc(
      "next_root_commercial_document_number",
      {
        document_prefix:
          "REM",
      }
    );

  if (numberError) {
    throw numberError;
  }

  if (!documentNumber) {
    throw new Error(
      "Root could not create a document number."
    );
  }

  const now =
    new Date().toISOString();

    let introducerVatNumber =
    null;

  if (commission.application_id) {
    const {
      data:
        applicationSnapshot,
      error:
        applicationSnapshotError,
    } =
      await supabase
        .from(
          "organisation_applications"
        )
        .select(
          "introducer_vat_number_at_conversion"
        )
        .eq(
          "id",
          commission.application_id
        )
        .maybeSingle();

    if (applicationSnapshotError) {
      throw applicationSnapshotError;
    }

    introducerVatNumber =
      applicationSnapshot
        ?.introducer_vat_number_at_conversion ||
      null;
  }


  const metadata = {
    commission_id:
      commission.id,

    revenue_event_id:
      commission.revenue_event_id,

    introducer_id:
      commission.introducer_id,

    introducer_name:
      introducer.name,

    introducer_contact_name:
      introducer.contact_name,

    introducer_contact_email:
      introducer.contact_email,

    introducer_campaign_id:
      commission.introducer_campaign_id,

    referral_code:
      commission.referral_code,

    referral_campaign_code:
      commission.referral_campaign_code,

    commission_basis:
      commission.commission_basis,

    commission_structure:
      commission.commission_structure,

    commission_event:
      commission.commission_event,

    collected_amount:
      commission.collected_amount,

    qualifying_amount:
      commission.qualifying_amount,

        commission_amount:
      commission.commission_amount,

    commission_percent:
      commission.commission_percent,

    vat_registered:
      Boolean(
        commission.vat_registered
      ),

    introducer_vat_number:
      introducerVatNumber,


    vat_rate:
      Number(
        commission.vat_rate ||
          0
      ),

    vat_amount:
      Number(
        commission.vat_amount ||
          0
      ),

    total_payable:
      Number(
        commission.total_payable ||
          commission.commission_amount ||
          0
      ),

    earned_at:
      commission.earned_at,

    payable_at:
      commission.payable_at,

    paid_at:
      commission.paid_at,

    payout_provider:
      commission.payout_provider,

    payout_reference:
      commission.payout_reference,

    invoice_reference:
      commission.invoice_reference,

    snapshot_created_at:
      now,
  };

  const {
    data:
      document,
    error:
      documentError,
  } =
    await supabase
      .from(
        "organisation_commercial_documents"
      )
      .insert({
        document_number:
          documentNumber,

        document_type:
          "commission_remittance",

        introducer_id:
          commission.introducer_id,

        commission_id:
          commission.id,

        application_id:
          commission.application_id,

        organisation_id:
          commission.organisation_id,

        organisation_name:
          commission.organisation_name,

        recipient_name:
          introducer.contact_name ||
          introducer.name,

        recipient_email:
          introducer.contact_email,

        currency:
          commission.currency ||
          "gbp",

        amount:
          Number(
            commission.total_payable ||
              commission.commission_amount ||
              0
          ),


        commission_percent:
          Number(
            commission.commission_percent ||
              0
          ),

        payment_reference:
          commission.payout_reference,

        document_status:
          "generated",

        generated_at:
          now,

        metadata,

        notes:
          "Root commission remittance generated from the settled commission record.",
      })
      .select()
      .single();

  if (documentError) {
    throw documentError;
  }

  const {
    error:
      commissionUpdateError,
  } =
    await supabase
      .from(
        "organisation_commissions"
      )
      .update({
        remittance_document_id:
          document.id,

        updated_at:
          now,
      })
      .eq(
        "id",
        commission.id
      );

  if (
    commissionUpdateError
  ) {
    /*
     * The document has already been created.
     * Do not delete accounting history.
     * Surface the error so it can be
     * reconciled safely.
     */
    throw commissionUpdateError;
  }

  return {
    message:
      "Commission remittance generated.",
    document,
    alreadyGenerated:
      false,
  };
}

async function markDocumentSent({
  supabase,
  body,
}) {
  const documentId =
    cleanText(
      body?.documentId
    );

  if (!documentId) {
    throw new Error(
      "Document ID is required."
    );
  }

  const {
    data:
      existingDocument,
    error:
      existingError,
  } =
    await supabase
      .from(
        "organisation_commercial_documents"
      )
      .select(
        `
          id,
          document_number,
          document_status,
          sent_at
        `
      )
      .eq(
        "id",
        documentId
      )
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existingDocument) {
    throw new Error(
      "Root could not find this commercial document."
    );
  }

  if (
    existingDocument.document_status ===
    "cancelled"
  ) {
    throw new Error(
      "A cancelled document cannot be marked as sent."
    );
  }

  if (
    existingDocument.sent_at
  ) {
    return {
      message:
        "Document was already recorded as sent.",
      document:
        existingDocument,
      alreadySent:
        true,
    };
  }

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "organisation_commercial_documents"
      )
      .update({
        document_status:
          "sent",

        sent_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        documentId
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return {
    message:
      "Document marked as sent.",
    document: data,
    alreadySent:
      false,
  };
}

export async function POST(
  request
) {
  try {
    const admin =
      await requireRootAdmin(
        request
      );

    if (!admin.authorised) {
      return NextResponse.json(
        {
          error:
            admin.error,
        },
        {
          status:
            admin.status,
        }
      );
    }

    const body =
      await request.json();

    const action =
      String(
        body?.action || ""
      )
        .trim()
        .toLowerCase();

    const allowedActions = [
      "request_invoice",
      "invoice_received",
      "mark_commission_paid",
      "generate_remittance",
      "mark_document_sent",
    ];

    if (
      !allowedActions.includes(
        action
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unknown Root settlement action.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      buildAdminClient();

    if (
      action ===
      "mark_document_sent"
    ) {
      const result =
        await markDocumentSent({
          supabase,
          body,
        });

      return NextResponse.json({
        success: true,
        action,
        ...result,
      });
    }

    const commissionId =
      cleanText(
        body?.commissionId
      );

    if (!commissionId) {
      return NextResponse.json(
        {
          error:
            "Commission ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const commission =
      await getCommission(
        supabase,
        commissionId
      );

    if (
      !commission.introducer_id
    ) {
      return NextResponse.json(
        {
          error:
            "This commission is not attached to an introducer.",
        },
        {
          status: 409,
        }
      );
    }

    const introducer =
      await getIntroducer(
        supabase,
        commission.introducer_id
      );

    let result;

    if (
      action ===
      "request_invoice"
    ) {
      result =
        await requestInvoice({
          supabase,
          commission,
          introducer,
        });
    }

    if (
      action ===
      "invoice_received"
    ) {
      result =
        await recordInvoiceReceived({
          supabase,
          commission,
          introducer,
          body,
        });
    }

    if (
      action ===
      "mark_commission_paid"
    ) {
      result =
        await markCommissionPaid({
          supabase,
          commission,
          introducer,
          body,
        });
    }

    if (
      action ===
      "generate_remittance"
    ) {
      result =
        await generateRemittance({
          supabase,
          commission,
          introducer,
        });
    }

    if (!result) {
      throw new Error(
        "Root could not complete this settlement action."
      );
    }

    console.log(
      "ROOT SETTLEMENT ACTION:",
      action,
      commission.id,
      introducer.id,
      admin.user?.email ||
        "root-admin"
    );

    return NextResponse.json({
      success: true,
      action,
      introducer: {
        id:
          introducer.id,

        name:
          introducer.name,

        payment_document_method:
          introducer.payment_document_method,
      },
      ...result,
    });
  } catch (error) {
    console.error(
      "ROOT INTRODUCER SETTLEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Root could not complete the settlement action.",
      },
      {
        status: 500,
      }
    );
  }
}

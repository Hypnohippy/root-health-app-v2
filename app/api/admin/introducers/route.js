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
      "Root introducer administration is not configured."
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

function normaliseReferralCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
        "This account cannot manage Root introducers.",
    };
  }

  return {
    authorised: true,
    user,
  };
}

export async function GET(request) {
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

    const supabase =
      buildAdminClient();

    const {
      data:
        introducers,
      error:
        introducerError,
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
    agreement_start_date,
    agreement_end_date,
    contact_name,
    contact_email,
    notes,
    created_at,
    updated_at
  `
)
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (introducerError) {
      throw introducerError;
    }

        /*
     * GREEN 2D — COMMERCIAL POLICY SOURCE OF TRUTH
     *
     * organisation_introducer_policies is authoritative.
     *
     * The convenience commercial fields on
     * organisation_introducers are retained for compatibility,
     * but the admin interface must display the policy that is
     * actually effective at the current instant.
     *
     * This means scheduled commercial changes become current
     * automatically when their effective timestamp arrives.
     * No cron job is required to keep the admin display current.
     */
    const now =
      new Date().toISOString();

    const {
      data:
        commercialPolicies,
      error:
        commercialPolicyError,
    } =
      await supabase
        .from(
          "organisation_introducer_policies"
        )
        .select(
          `
            id,
            introducer_id,
            commission_percent,
            commission_basis,
            commission_structure,
            effective_from,
            effective_until,
            change_reason,
            notes
          `
        )
        .lte(
          "effective_from",
          now
        )
        .order(
          "effective_from",
          {
            ascending: false,
          }
        );

    if (commercialPolicyError) {
      throw commercialPolicyError;
    }

    const effectivePolicyByIntroducer =
      new Map();

    for (
      const policy of
        commercialPolicies || []
    ) {
      const isStillEffective =
        !policy.effective_until ||
        policy.effective_until > now;

      if (
        isStillEffective &&
        !effectivePolicyByIntroducer.has(
          policy.introducer_id
        )
      ) {
        effectivePolicyByIntroducer.set(
          policy.introducer_id,
          policy
        );
      }
    }

    const {
      data:
        applications,
      error:
        applicationError,
    } =
      await supabase
        .from(
          "organisation_applications"
        )
        .select(
          `
            id,
            introducer_id,
            status,
            payment_status
          `
        )
        .not(
          "introducer_id",
          "is",
          null
        );

    if (applicationError) {
      throw applicationError;
    }

    const {
      data:
        commissions,
      error:
        commissionError,
    } =
      await supabase
        .from(
          "organisation_commissions"
        )
        .select(
  `
    id,
    introducer_id,
    introducer_campaign_id,
    application_id,
    organisation_name,
    referral_code,
    referral_campaign_code,
    commission_percent,
    commission_structure,
    commission_event,
    commission_amount,
    status,
    earned_at,
    clearance_until,
    payable_at,
    approved_at,
    paid_at,
    payout_provider,
    payout_reference,
    invoice_requested_at,
    invoice_received_at,
    invoice_reference,
    remittance_document_id
  `
);

       if (commissionError) {
      throw commissionError;
    }

    /*
     * GREEN 4 — REMITTANCE DOCUMENT HISTORY
     *
     * Paid commissions retain their commercial
     * document ID. Load the corresponding remittance
     * records so Root Admin can permanently retrieve
     * the PDF after settlement.
     */
    const {
      data: remittanceDocuments,
      error: remittanceDocumentError,
    } =
      await supabase
        .from(
          "organisation_commercial_documents"
        )
        .select(
          `
            id,
            document_number,
            document_type,
            commission_id,
            introducer_id,
            organisation_name,
            recipient_name,
            recipient_email,
            currency,
            amount,
            commission_percent,
            payment_reference,
            document_status,
            generated_at,
            sent_at,
            created_at
          `
        )
        .eq(
          "document_type",
          "commission_remittance"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (remittanceDocumentError) {
      throw remittanceDocumentError;
    }

    const remittanceByCommission =
      new Map();

    for (
      const document of
        remittanceDocuments || []
    ) {
      if (
        document.commission_id &&
        !remittanceByCommission.has(
          document.commission_id
        )
      ) {
        remittanceByCommission.set(
          document.commission_id,
          document
        );
      }
    }

    const rows =
      (introducers || []).map(
        (introducer) => {
                    const effectivePolicy =
            effectivePolicyByIntroducer.get(
              introducer.id
            ) || null;
          
          const matchedApplications =
            (applications || []).filter(
              (application) =>
                application.introducer_id ===
                introducer.id
            );

                    const matchedCommissions =
            (commissions || [])
              .filter(
                (commission) =>
                  commission.introducer_id ===
                  introducer.id
              )
              .map(
                (commission) => {
                  const remittance =
                    remittanceByCommission.get(
                      commission.id
                    ) || null;

                  return {
                    ...commission,

                    remittance:
                      remittance,

                    remittance_document_id:
                      commission
                        .remittance_document_id ||
                      remittance?.id ||
                      null,

                    remittance_document_number:
                      remittance
                        ?.document_number ||
                      null,

                    remittance_document_status:
                      remittance
                        ?.document_status ||
                      null,

                    remittance_generated_at:
                      remittance
                        ?.generated_at ||
                      null,
                  };
                }
              );

            const nowDate =
  new Date();

const sevenDaysFromNow =
  new Date(
    nowDate.getTime() +
      7 *
        24 *
        60 *
        60 *
        1000
  );

const activeCommissions =
  matchedCommissions.filter(
    (commission) =>
      ![
        "paid",
        "reversed",
        "cancelled",
      ].includes(
        String(
          commission.status || ""
        ).toLowerCase()
      )
  );

const dueCommissions =
  activeCommissions.filter(
    (commission) => {
      if (!commission.payable_at) {
        return false;
      }

      return (
        new Date(
          commission.payable_at
        ) <= nowDate
      );
    }
  );

const upcomingCommissions =
  activeCommissions.filter(
    (commission) => {
      if (!commission.payable_at) {
        return false;
      }

      const payableAt =
        new Date(
          commission.payable_at
        );

      return (
        payableAt > nowDate &&
        payableAt <=
          sevenDaysFromNow
      );
    }
  );

const commissionDue =
  dueCommissions.reduce(
    (total, commission) =>
      total +
      Number(
        commission.commission_amount ||
          0
      ),
    0
  );

const commissionUpcoming =
  upcomingCommissions.reduce(
    (total, commission) =>
      total +
      Number(
        commission.commission_amount ||
          0
      ),
    0
  );

          const paidConversions =
            matchedApplications.filter(
              (application) =>
                application.payment_status ===
                "paid"
            ).length;

          const commissionEarned =
            matchedCommissions.reduce(
              (
                total,
                commission
              ) =>
                total +
                Number(
                  commission.commission_amount ||
                    0
                ),
              0
            );

          const commissionPaid =
            matchedCommissions
              .filter(
                (commission) =>
                  commission.status ===
                  "paid"
              )
              .reduce(
                (
                  total,
                  commission
                ) =>
                  total +
                  Number(
                    commission.commission_amount ||
                      0
                  ),
                0
              );

                    return {
            ...introducer,

            commission_percent:
              effectivePolicy
                ? Number(
                    effectivePolicy.commission_percent
                  )
                : Number(
                    introducer.commission_percent
                  ),

            commission_basis:
              effectivePolicy
                ?.commission_basis ||
              introducer.commission_basis,

            commission_structure:
              effectivePolicy
                ?.commission_structure ||
              introducer.commission_structure,

            current_policy_id:
              effectivePolicy?.id ||
              null,

            current_policy_effective_from:
              effectivePolicy
                ?.effective_from ||
              null,

            current_policy_effective_until:
              effectivePolicy
                ?.effective_until ||
              null,

            application_count:
              matchedApplications.length,

            paid_conversion_count:
              paidConversions,

            commission_earned:
              commissionEarned,

            commission_paid:
              commissionPaid,

            commission_outstanding:
  commissionEarned -
  commissionPaid,

commission_due:
  commissionDue,

commission_due_count:
  dueCommissions.length,

commission_upcoming:
  commissionUpcoming,

commission_upcoming_count:
  upcomingCommissions.length,

due_commissions:
  dueCommissions,

upcoming_commissions:
  upcomingCommissions,
          };
        }
      );

    return NextResponse.json({
      success: true,
      introducers:
        rows,
    });
  } catch (error) {
    console.error(
      "ROOT INTRODUCER ADMIN GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Root could not load introducers.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request) {
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

    const name =
      cleanText(
        body?.name
      );

    const referralCode =
      normaliseReferralCode(
        body?.referralCode
      );

    const contactName =
      cleanText(
        body?.contactName
      );

    const contactEmail =
      normaliseEmail(
        body?.contactEmail
      ) || null;

    const commissionPercent =
      Number(
        body?.commissionPercent
      );

    const commissionStructure =
      String(
        body?.commissionStructure ||
          "one_off"
      )
        .trim()
        .toLowerCase();

    const status =
      String(
        body?.status ||
          "active"
      )
        .trim()
        .toLowerCase();

    const agreementStartDate =
      cleanText(
        body?.agreementStartDate
      );

    const agreementEndDate =
      cleanText(
        body?.agreementEndDate
      );

    const notes =
      cleanText(
        body?.notes
      );

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Introducer name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!referralCode) {
      return NextResponse.json(
        {
          error:
            "Referral code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        commissionPercent
      ) ||
      commissionPercent < 0 ||
      commissionPercent > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Commission percentage must be between 0 and 100.",
        },
        {
          status: 400,
        }
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
      return NextResponse.json(
        {
          error:
            "Commission structure must be one-off or recurring.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "active",
        "inactive",
      ].includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Introducer status must be active or inactive.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      agreementStartDate &&
      agreementEndDate &&
      agreementEndDate <
        agreementStartDate
    ) {
      return NextResponse.json(
        {
          error:
            "Agreement end date cannot be before its start date.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      buildAdminClient();

    const {
      data:
        existingIntroducer,
      error:
        existingError,
    } =
      await supabase
        .from(
          "organisation_introducers"
        )
        .select(
          "id, referral_code"
        )
        .eq(
          "referral_code",
          referralCode
        )
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingIntroducer) {
      return NextResponse.json(
        {
          error:
            "That referral code is already in use.",
        },
        {
          status: 409,
        }
      );
    }

    const now =
      new Date().toISOString();

    const {
      data:
        introducer,
      error:
        introducerError,
    } =
      await supabase
        .from(
          "organisation_introducers"
        )
        .insert({
          name,

          referral_code:
            referralCode,

          commission_percent:
            commissionPercent,

          commission_basis:
            "collected_subscription_revenue",

          commission_structure:
            commissionStructure,

          status,

          agreement_start_date:
            agreementStartDate,

          agreement_end_date:
            agreementEndDate,

          contact_name:
            contactName,

          contact_email:
            contactEmail,

          notes,

          updated_at:
            now,
        })
        .select(
          `
            id,
            name,
            referral_code,
            commission_percent,
            commission_basis,
            commission_structure,
            status,
            agreement_start_date,
            agreement_end_date,
            contact_name,
            contact_email,
            notes,
            created_at,
            updated_at
          `
        )
        .single();

    if (
      introducerError ||
      !introducer
    ) {
      throw (
        introducerError ||
        new Error(
          "Root could not create the introducer."
        )
      );
    }

    const effectiveFrom =
      agreementStartDate
        ? `${agreementStartDate}T00:00:00.000Z`
        : now;

    const {
      error:
        policyError,
    } =
      await supabase
        .from(
          "organisation_introducer_policies"
        )
        .insert({
          introducer_id:
            introducer.id,

          commission_percent:
            commissionPercent,

          commission_basis:
            "collected_subscription_revenue",

          commission_structure:
            commissionStructure,

          effective_from:
            effectiveFrom,

          change_reason:
            "Initial introducer agreement",

          notes:
            "Created automatically when the introducer was added in Root Admin.",
        });

    if (policyError) {
      /*
       * Avoid leaving a half-created commercial
       * record if policy-history creation fails.
       */
      await supabase
        .from(
          "organisation_introducers"
        )
        .delete()
        .eq(
          "id",
          introducer.id
        );

      throw policyError;
    }

    console.log(
      "ROOT INTRODUCER CREATED:",
      introducer.id,
      introducer.name,
      introducer.referral_code
    );

    return NextResponse.json({
      success: true,
      introducer: {
        ...introducer,

        application_count: 0,
        paid_conversion_count: 0,
        commission_earned: 0,
        commission_paid: 0,
        commission_outstanding: 0,
      },
    });
  } catch (error) {
    console.error(
      "ROOT INTRODUCER ADMIN POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Root could not create the introducer.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// ROOT INTRODUCERS
// GREEN 2B — ATOMIC COMMERCIAL TERMS CHANGE
// ============================================================

export async function PATCH(request) {
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

    if (
      action !==
      "change_commercial_terms"
    ) {
      return NextResponse.json(
        {
          error:
            "Unknown introducer administration action.",
        },
        {
          status: 400,
        }
      );
    }

    const introducerId =
      cleanText(
        body?.introducerId
      );

    const commissionPercent =
      Number(
        body?.commissionPercent
      );

    const commissionStructure =
      String(
        body?.commissionStructure ||
          ""
      )
        .trim()
        .toLowerCase();

        const effectiveMode =
      String(
        body?.effectiveMode ||
          "date"
      )
        .trim()
        .toLowerCase();

    const effectiveDate =
      cleanText(
        body?.effectiveDate
      );

    const changeReason =
      cleanText(
        body?.changeReason
      );

    const notes =
      cleanText(
        body?.notes
      );

    if (!introducerId) {
      return NextResponse.json(
        {
          error:
            "Introducer is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        commissionPercent
      ) ||
      commissionPercent < 0 ||
      commissionPercent > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Commission percentage must be between 0 and 100.",
        },
        {
          status: 400,
        }
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
      return NextResponse.json(
        {
          error:
            "Commission structure must be one-off or recurring.",
        },
        {
          status: 400,
        }
      );
    }

        if (
      ![
        "immediate",
        "date",
      ].includes(
        effectiveMode
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Effective mode must be immediate or date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      effectiveMode ===
        "date" &&
      (
        !effectiveDate ||
        !/^\d{4}-\d{2}-\d{2}$/.test(
          effectiveDate
        )
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A valid effective date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!changeReason) {
      return NextResponse.json(
        {
          error:
            "Please record a reason for the commercial change.",
        },
        {
          status: 400,
        }
      );
    }

       /*
     * Immediate changes use the exact current timestamp,
     * allowing legitimate same-day renegotiations.
     *
     * Future/date-based changes remain deterministic at
     * midnight UTC on the selected commercial date.
     */
    const effectiveFrom =
      effectiveMode ===
      "immediate"
        ? new Date().toISOString()
        : `${effectiveDate}T00:00:00.000Z`;

    const supabase =
      buildAdminClient();

    const {
      data:
        existingIntroducer,
      error:
        introducerError,
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
            commission_structure
          `
        )
        .eq(
          "id",
          introducerId
        )
        .maybeSingle();

    if (introducerError) {
      throw introducerError;
    }

    if (!existingIntroducer) {
      return NextResponse.json(
        {
          error:
            "Introducer not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * One RPC call.
     *
     * PostgreSQL performs:
     * 1. lock introducer
     * 2. close existing policy
     * 3. create replacement policy
     * 4. update current introducer terms
     *
     * If any part fails, the transaction rolls back.
     */
    const {
      data:
        newPolicy,
      error:
        changeError,
    } =
      await supabase.rpc(
        "change_introducer_commercial_terms",
        {
          p_introducer_id:
            introducerId,

          p_commission_percent:
            commissionPercent,

          p_commission_structure:
            commissionStructure,

          p_effective_from:
            effectiveFrom,

          p_change_reason:
            changeReason,

          p_notes:
            notes,
        }
      );

    if (changeError) {
      throw changeError;
    }

    console.log(
      "ROOT INTRODUCER COMMERCIAL TERMS CHANGED:",
      introducerId,
      existingIntroducer.name,
      `${existingIntroducer.commission_percent}%`,
      existingIntroducer.commission_structure,
      "→",
      `${commissionPercent}%`,
      commissionStructure,
      effectiveFrom
    );

    return NextResponse.json({
      success: true,

      introducerId,

      introducerName:
        existingIntroducer.name,

      policy:
        newPolicy,

      commercialTerms: {
        commissionPercent,
        commissionStructure,
        effectiveFrom,
        changeReason,
        notes,
      },
    });
  } catch (error) {
    console.error(
      "ROOT INTRODUCER COMMERCIAL CHANGE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Root could not change the introducer commercial terms.",
      },
      {
        status: 500,
      }
    );
  }
}
// ============================================================
// ROOT INTRODUCERS
// GREEN 3B — CAMPAIGN MANAGEMENT
// ============================================================

function normaliseCampaignCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function PUT(request) {
  try {
    const admin =
      await requireRootAdmin(request);

    if (!admin.authorised) {
      return NextResponse.json(
        {
          error: admin.error,
        },
        {
          status: admin.status,
        }
      );
    }

    const body =
      await request.json();

    const action =
      String(body?.action || "")
        .trim()
        .toLowerCase();

    const supabase =
      buildAdminClient();

    // ========================================================
    // LOAD CAMPAIGNS
    // ========================================================

    if (action === "get_campaigns") {
      const introducerId =
        cleanText(body?.introducerId);

      if (!introducerId) {
        return NextResponse.json(
          {
            error:
              "Introducer is required.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: introducer,
        error: introducerError,
      } =
        await supabase
          .from(
            "organisation_introducers"
          )
          .select(
            "id, name, referral_code"
          )
          .eq(
            "id",
            introducerId
          )
          .maybeSingle();

      if (introducerError) {
        throw introducerError;
      }

      if (!introducer) {
        return NextResponse.json(
          {
            error:
              "Introducer not found.",
          },
          {
            status: 404,
          }
        );
      }

      const {
        data: campaigns,
        error: campaignError,
      } =
        await supabase
          .from(
            "organisation_introducer_campaigns"
          )
          .select(
            `
              id,
              introducer_id,
              campaign_code,
              campaign_name,
              status,
              starts_at,
              ends_at,
              notes,
              created_at,
              updated_at
            `
          )
          .eq(
            "introducer_id",
            introducerId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (campaignError) {
        throw campaignError;
      }

      return NextResponse.json({
        success: true,
        introducer,
        campaigns:
          campaigns || [],
      });
    }

    // ========================================================
    // CREATE CAMPAIGN
    // ========================================================

    if (action === "create_campaign") {
      const introducerId =
        cleanText(body?.introducerId);

      const campaignName =
        cleanText(body?.campaignName);

      const campaignCode =
        normaliseCampaignCode(
          body?.campaignCode ||
            campaignName
        );

      const status =
        String(
          body?.status || "active"
        )
          .trim()
          .toLowerCase();

      const startsAt =
        cleanText(body?.startsAt);

      const endsAt =
        cleanText(body?.endsAt);

      const notes =
        cleanText(body?.notes);

      if (!introducerId) {
        return NextResponse.json(
          {
            error:
              "Introducer is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (!campaignName) {
        return NextResponse.json(
          {
            error:
              "Campaign name is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (!campaignCode) {
        return NextResponse.json(
          {
            error:
              "Campaign code could not be generated.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        ![
          "active",
          "inactive",
        ].includes(status)
      ) {
        return NextResponse.json(
          {
            error:
              "Campaign status must be active or inactive.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        startsAt &&
        endsAt &&
        endsAt < startsAt
      ) {
        return NextResponse.json(
          {
            error:
              "Campaign end date cannot be before its start date.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: introducer,
        error: introducerError,
      } =
        await supabase
          .from(
            "organisation_introducers"
          )
          .select(
            "id, name, referral_code"
          )
          .eq(
            "id",
            introducerId
          )
          .maybeSingle();

      if (introducerError) {
        throw introducerError;
      }

      if (!introducer) {
        return NextResponse.json(
          {
            error:
              "Introducer not found.",
          },
          {
            status: 404,
          }
        );
      }

      const {
        data: existingCampaign,
        error: existingCampaignError,
      } =
        await supabase
          .from(
            "organisation_introducer_campaigns"
          )
          .select(
            "id, campaign_code"
          )
          .eq(
            "introducer_id",
            introducerId
          )
          .ilike(
            "campaign_code",
            campaignCode
          )
          .maybeSingle();

      if (existingCampaignError) {
        throw existingCampaignError;
      }

      if (existingCampaign) {
        return NextResponse.json(
          {
            error:
              "That campaign code is already in use for this introducer.",
          },
          {
            status: 409,
          }
        );
      }

      const now =
        new Date().toISOString();

      const {
        data: campaign,
        error: campaignError,
      } =
        await supabase
          .from(
            "organisation_introducer_campaigns"
          )
          .insert({
            introducer_id:
              introducerId,

            campaign_code:
              campaignCode,

            campaign_name:
              campaignName,

            status,

            starts_at:
              startsAt
                ? `${startsAt}T00:00:00.000Z`
                : null,

            ends_at:
              endsAt
                ? `${endsAt}T23:59:59.999Z`
                : null,

            notes,

            updated_at:
              now,
          })
          .select(
            `
              id,
              introducer_id,
              campaign_code,
              campaign_name,
              status,
              starts_at,
              ends_at,
              notes,
              created_at,
              updated_at
            `
          )
          .single();

      if (
        campaignError ||
        !campaign
      ) {
        throw (
          campaignError ||
          new Error(
            "Root could not create the campaign."
          )
        );
      }

      console.log(
        "ROOT INTRODUCER CAMPAIGN CREATED:",
        campaign.id,
        introducer.name,
        introducer.referral_code,
        campaign.campaign_code
      );

      return NextResponse.json({
        success: true,
        introducer,
        campaign,
      });
    }

    // ========================================================
    // CHANGE CAMPAIGN STATUS
    // ========================================================

    if (
      action ===
      "change_campaign_status"
    ) {
      const campaignId =
        cleanText(body?.campaignId);

      const status =
        String(body?.status || "")
          .trim()
          .toLowerCase();

      if (!campaignId) {
        return NextResponse.json(
          {
            error:
              "Campaign is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        ![
          "active",
          "inactive",
        ].includes(status)
      ) {
        return NextResponse.json(
          {
            error:
              "Campaign status must be active or inactive.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: campaign,
        error: campaignError,
      } =
        await supabase
          .from(
            "organisation_introducer_campaigns"
          )
          .update({
            status,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            campaignId
          )
          .select(
            `
              id,
              introducer_id,
              campaign_code,
              campaign_name,
              status,
              starts_at,
              ends_at,
              notes,
              created_at,
              updated_at
            `
          )
          .maybeSingle();

      if (campaignError) {
        throw campaignError;
      }

      if (!campaign) {
        return NextResponse.json(
          {
            error:
              "Campaign not found.",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json({
        success: true,
        campaign,
      });
    }

    return NextResponse.json(
      {
        error:
          "Unknown campaign administration action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "ROOT INTRODUCER CAMPAIGN ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Root could not manage the introducer campaign.",
      },
      {
        status: 500,
      }
    );
  }
}

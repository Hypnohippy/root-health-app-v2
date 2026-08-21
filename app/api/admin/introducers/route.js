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
            commission_amount,
            status
          `
        );

    if (commissionError) {
      throw commissionError;
    }

    const rows =
      (introducers || []).map(
        (introducer) => {
          const matchedApplications =
            (applications || []).filter(
              (application) =>
                application.introducer_id ===
                introducer.id
            );

          const matchedCommissions =
            (commissions || []).filter(
              (commission) =>
                commission.introducer_id ===
                introducer.id
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

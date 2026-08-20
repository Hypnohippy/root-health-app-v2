import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function buildAdminClient() {
  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Root secure Workplace setup is not configured."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function buildAuthenticatedClient(
  accessToken
) {
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !accessToken
  ) {
    throw new Error(
      "Root authentication is required."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },

      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(
      String(token || "")
    )
    .digest("hex");
}

function normaliseEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getBearerToken(request) {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  if (
    !authHeader ||
    !authHeader.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  return authHeader
    .slice(7)
    .trim();
}

/*
 * ============================================================
 * GET
 *
 * Safe invitation preview.
 *
 * The raw token arrives here, is hashed on
 * the server and is never returned.
 * ============================================================
 */

export async function GET(request) {
  try {
    const url =
      new URL(request.url);

    const rawToken =
      String(
        url.searchParams.get(
          "token"
        ) || ""
      ).trim();

    if (!rawToken) {
      return NextResponse.json(
        {
          error:
            "This Workplace setup link is incomplete.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      buildAdminClient();

    const tokenHash =
      hashToken(
        rawToken
      );

    const {
      data: invite,
      error: inviteError,
    } =
      await supabase
        .from(
          "organisation_setup_invites"
        )
        .select(
          `
            id,
            application_id,
            intended_email,
            intended_role,
            status,
            expires_at,
            redeemed_at,
            revoked_at,
            organisation_applications (
              id,
              organisation_name,
              contact_name,
              contact_email,
              admin_email,
              employee_count,
              industry,
              organisation_type,
              legal_entity_number,
              status,
              access_path
            )
          `
        )
        .eq(
          "token_hash",
          tokenHash
        )
        .maybeSingle();

    if (
      inviteError ||
      !invite
    ) {
      return NextResponse.json(
        {
          error:
            "Root could not verify this Workplace setup invitation.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      invite.status ===
      "redeemed"
    ) {
      return NextResponse.json(
        {
          error:
            "This Workplace setup invitation has already been used.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      invite.status ===
      "revoked"
    ) {
      return NextResponse.json(
        {
          error:
            "This Workplace setup invitation has been withdrawn.",
        },
        {
          status: 410,
        }
      );
    }

    const expiresAt =
      new Date(
        invite.expires_at
      ).getTime();

    if (
      !Number.isFinite(
        expiresAt
      ) ||
      expiresAt <=
        Date.now()
    ) {
      if (
        invite.status ===
        "pending"
      ) {
        await supabase
          .from(
            "organisation_setup_invites"
          )
          .update({
            status:
              "expired",
          })
          .eq(
            "id",
            invite.id
          )
          .eq(
            "status",
            "pending"
          );
      }

      return NextResponse.json(
        {
          error:
            "This Workplace setup invitation has expired. Please ask Root to send a new one.",
        },
        {
          status: 410,
        }
      );
    }

    if (
      invite.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "This Workplace setup invitation is no longer active.",
        },
        {
          status: 409,
        }
      );
    }

    const application =
      invite.organisation_applications;

    if (!application) {
      return NextResponse.json(
        {
          error:
            "Root could not find the Workplace application connected to this invitation.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,

      invitation: {
        id:
          invite.id,

        intendedEmail:
          normaliseEmail(
            invite.intended_email
          ),

        intendedRole:
          invite.intended_role,

        expiresAt:
          invite.expires_at,
      },

      application: {
        id:
          application.id,

        organisationName:
          application
            .organisation_name,

        contactName:
          application
            .contact_name,

        contactEmail:
          application
            .contact_email,

        adminEmail:
          normaliseEmail(
            application.admin_email
          ),

        employeeCount:
          application
            .employee_count,

        industry:
          application.industry,

        organisationType:
          application
            .organisation_type,

        legalEntityNumber:
          application
            .legal_entity_number,
          accessPath:
  String(
    application.access_path ||
      "trial"
  )
    .trim()
    .toLowerCase(),
    
      },
    });
  } catch (error) {
    console.error(
      "ROOT WORKPLACE SETUP PREVIEW ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Root could not verify this Workplace setup invitation.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * POST
 *
 * Secure invitation redemption.
 *
 * The caller must supply BOTH:
 *
 * 1. the secret setup token
 * 2. a valid authenticated Supabase access token
 *
 * Postgres then performs the final identity,
 * invitation, expiry and permission checks.
 * ============================================================
 */

export async function POST(request) {
  try {
    const accessToken =
      getBearerToken(
        request
      );

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Please sign in before completing Workplace setup.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const rawToken =
      String(
        body?.token ||
          ""
      ).trim();

    if (!rawToken) {
      return NextResponse.json(
        {
          error:
            "Root could not identify the secure Workplace invitation.",
        },
        {
          status: 400,
        }
      );
    }

    const adminName =
      String(
        body?.adminName ||
          ""
      ).trim();

    if (!adminName) {
      return NextResponse.json(
        {
          error:
            "Please enter the administrator's name.",
        },
        {
          status: 400,
        }
      );
    }

    const tokenHash =
      hashToken(
        rawToken
      );

    /*
     * IMPORTANT:
     *
     * This client carries the HUMAN'S JWT.
     *
     * That means auth.uid() and auth.jwt()
     * inside the database transaction refer
     * to the actual authenticated person.
     */
    const supabase =
      buildAuthenticatedClient(
        accessToken
      );

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "redeem_organisation_setup_invite",
        {
          p_token_hash:
            tokenHash,

          p_admin_name:
            adminName,

          p_sickness_days:
            body?.measures
              ?.sickness_days ??
            null,

          p_turnover:
            body?.measures
              ?.turnover ??
            null,

          p_agency_spend:
            body?.measures
              ?.agency_spend ??
            null,

          p_overtime_hours:
            body?.measures
              ?.overtime_hours ??
            null,

          p_vacancies:
            body?.measures
              ?.vacancies ??
            null,

          p_business_events:
            Array.isArray(
              body?.businessEvents
            )
              ? body.businessEvents
              : [],

          p_business_event_notes:
            body?.businessEventNotes ||
            null,

          p_initiatives:
            Array.isArray(
              body?.initiatives
            )
              ? body.initiatives
              : [],

          p_initiative_notes:
            body?.initiativeNotes ||
            null,

          p_watch_items:
            Array.isArray(
              body?.watchItems
            )
              ? body.watchItems
              : [],

          p_root_reflection:
            body?.rootReflection ||
            null,

          p_confidence_label:
            body?.confidenceLabel ||
            "Emerging",
        }
      );

    if (
      error ||
      !data?.success
    ) {
      console.error(
        "ROOT WORKPLACE SETUP REDEMPTION ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error?.message ||
            "Root could not complete this Workplace setup.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,

      organisationId:
        data.organisation_id,

      membershipId:
        data.membership_id,

      profileKey:
        data.profile_key,

      reviewId:
        data.review_id,

      role:
        data.role,
    });
  } catch (error) {
    console.error(
      "ROOT WORKPLACE SETUP POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Root could not complete the secure Workplace setup.",
      },
      {
        status: 500,
      }
    );
  }
}
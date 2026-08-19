import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

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

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

function normaliseEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export async function GET(request) {
  try {
    const url =
      new URL(request.url);

    const rawToken =
      String(
        url.searchParams.get("token") ||
          ""
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
      hashToken(rawToken);

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
              status
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
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
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

    /*
     * Return ONLY safe preview information.
     *
     * Never return token_hash.
     * Never return service-role information.
     */
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
          application.organisation_name,

        contactName:
          application.contact_name,

        contactEmail:
          application.contact_email,

        adminEmail:
          normaliseEmail(
            application.admin_email
          ),

        employeeCount:
          application.employee_count,

        industry:
          application.industry,

        organisationType:
          application.organisation_type,

        legalEntityNumber:
          application.legal_entity_number,
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

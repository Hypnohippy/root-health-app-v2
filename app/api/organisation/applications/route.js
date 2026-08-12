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
      "Root application administration is not configured."
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
    String(
      user.email || ""
    )
      .trim()
      .toLowerCase();

  if (
    !rootAdminEmails.includes(
      email
    )
  ) {
    return {
      authorised: false,
      status: 403,
      error:
        "This account cannot manage Root Workplace applications.",
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
          error: admin.error,
        },
        {
          status: admin.status,
        }
      );
    }

    const supabase =
      buildAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "organisation_applications"
        )
        .select(
          `
            id,
            user_id,
            organisation_name,
            contact_name,
            contact_email,
            employee_count,
            industry,
            status,
            reviewed_at,
            created_at
          `
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(100);

    if (error) {
      console.error(
        "ROOT APPLICATION LIST ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Root could not load Workplace applications.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      applications:
        data || [],
    });
  } catch (error) {
    console.error(
      "ROOT APPLICATION ADMIN GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Root could not load applications.",
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
          error: admin.error,
        },
        {
          status: admin.status,
        }
      );
    }

    const body =
      await request.json();

    const applicationId =
      String(
        body?.applicationId || ""
      ).trim();

    if (!applicationId) {
      return NextResponse.json(
        {
          error:
            "No application was supplied.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      buildAdminClient();

    const {
      data: application,
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
            user_id,
            organisation_name,
            contact_name,
            contact_email,
            employee_count,
            industry,
            status,
            reviewed_at,
            created_at
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
      return NextResponse.json(
        {
          error:
            "Root could not find that Workplace application.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      application.status ===
      "approved"
    ) {
      return NextResponse.json({
        success: true,
        application,
        alreadyApproved: true,
      });
    }

    if (
      application.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            `This application is currently ${application.status}.`,
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: inviteData,
      error: inviteError,
    } =
      await supabase.auth.admin
        .inviteUserByEmail(
          application.contact_email,
          {
            redirectTo:
              "https://roothealth.app/organisation-learning",

            data: {
              name:
                application.contact_name,

              root_workplace_approved:
                true,

              root_workplace_application_id:
                application.id,

              organisation_name:
                application.organisation_name,

              employee_count:
                application.employee_count,

              industry:
                application.industry,
            },
          }
        );

    const invitedUser =
      inviteData?.user || null;

    if (
      inviteError ||
      !invitedUser
    ) {
      console.error(
        "ROOT WORKPLACE INVITE ERROR:",
        inviteError
      );

      return NextResponse.json(
        {
          error:
            inviteError?.message ||
            "Root could not send the Workplace setup invitation.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data:
        approvedApplication,

      error:
        approvalError,
    } =
      await supabase
        .from(
          "organisation_applications"
        )
        .update({
          user_id:
            invitedUser.id,

          status:
            "approved",

          reviewed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          application.id
        )
        .select(
          `
            id,
            user_id,
            organisation_name,
            contact_name,
            contact_email,
            employee_count,
            industry,
            status,
            reviewed_at,
            created_at
          `
        )
        .single();

    if (
      approvalError ||
      !approvedApplication
    ) {
      console.error(
        "ROOT WORKPLACE APPROVAL UPDATE ERROR:",
        approvalError
      );

      return NextResponse.json(
        {
          error:
            "The invitation was sent, but Root could not update the application status. Please check Supabase before approving again.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "ROOT WORKPLACE APPLICATION APPROVED:",
      application.id,
      application.contact_email
    );

    return NextResponse.json({
      success: true,

      application:
        approvedApplication,

      invited: true,
    });
  } catch (error) {
    console.error(
      "ROOT APPLICATION ADMIN POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Root could not approve this application.",
      },
      {
        status: 500,
      }
    );
  }
}

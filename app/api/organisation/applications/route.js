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

function normaliseEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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
        "This account cannot manage Root Workplace applications.",
    };
  }

  return {
    authorised: true,
    user,
  };
}

async function findAuthUserByEmail(
  supabase,
  email
) {
  const targetEmail =
    normaliseEmail(email);

  let page = 1;

  const perPage = 1000;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase.auth.admin
        .listUsers({
          page,
          perPage,
        });

    if (error) {
      throw error;
    }

    const users =
      data?.users || [];

    const matchedUser =
      users.find(
        (user) =>
          normaliseEmail(
            user.email
          ) ===
          targetEmail
      ) || null;

    if (matchedUser) {
      return matchedUser;
    }

    if (
      users.length <
      perPage
    ) {
      return null;
    }

    page += 1;
  }
}

function buildWorkplaceMetadata(
  application
) {
  return {
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

    organisation_contact_email:
      application.contact_email,

    root_admin_email:
      application.admin_email,
  };
}

async function sendSetupAccess(
  supabase,
  application
) {
  const adminEmail =
    normaliseEmail(
      application.admin_email
    );

  if (!adminEmail) {
    throw new Error(
      "This application has no authorised Root administrator email."
    );
  }

  const existingUser =
    await findAuthUserByEmail(
      supabase,
      adminEmail
    );

  const workplaceMetadata =
    buildWorkplaceMetadata(
      application
    );

  /*
   * EXISTING ROOT USER
   *
   * One person may administer more than
   * one organisation.
   *
   * Keep their existing Auth account,
   * add the pending Workplace setup
   * metadata and send a secure magic
   * sign-in link.
   */
  if (existingUser) {
    const existingMetadata =
      existingUser.user_metadata &&
      typeof existingUser.user_metadata ===
        "object"
        ? existingUser.user_metadata
        : {};

    const {
      data:
        updatedUserData,

      error:
        updateUserError,
    } =
      await supabase.auth.admin
        .updateUserById(
          existingUser.id,
          {
            user_metadata: {
              ...existingMetadata,
              ...workplaceMetadata,
            },
          }
        );

    if (updateUserError) {
      throw updateUserError;
    }

    /*
     * shouldCreateUser: false is important.
     * This path is only for a person Root
     * has already found in Auth.
     */
    const {
      error:
        magicLinkError,
    } =
      await supabase.auth
        .signInWithOtp({
          email: adminEmail,

          options: {
            shouldCreateUser:
              false,

            emailRedirectTo:
              "https://roothealth.app/organisation-learning",
          },
        });

    if (magicLinkError) {
      throw magicLinkError;
    }

    return {
      user:
        updatedUserData?.user ||
        existingUser,

      accessType:
        "existing_user",

      invited:
        false,

      magicLinkSent:
        true,
    };
  }

  /*
   * NEW ROOT USER
   *
   * For a genuinely new person, use
   * Supabase's normal invitation flow.
   */
  const {
    data:
      inviteData,

    error:
      inviteError,
  } =
    await supabase.auth.admin
      .inviteUserByEmail(
        adminEmail,
        {
          redirectTo:
            "https://roothealth.app/organisation-learning",

          data:
            workplaceMetadata,
        }
      );

  const invitedUser =
    inviteData?.user || null;

  if (
    inviteError ||
    !invitedUser
  ) {
    throw (
      inviteError ||
      new Error(
        "Root could not create the Workplace invitation."
      )
    );
  }

  return {
    user:
      invitedUser,

    accessType:
      "new_user",

    invited:
      true,

    magicLinkSent:
      false,
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
          status:
            admin.status,
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
organisation_type,
legal_entity_number,
organisation_domain,
contact_name,
contact_email,
admin_email,
employee_count,
industry,
root_customer_group_id,
trial_eligibility_status,
trial_eligibility_reason,
trial_eligibility_checked_at,
trial_override,
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

    const applicationId =
      String(
        body?.applicationId ||
        ""
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
      data:
        application,

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
organisation_type,
legal_entity_number,
organisation_domain,
contact_name,
contact_email,
admin_email,
employee_count,
industry,
root_customer_group_id,
trial_eligibility_status,
trial_eligibility_reason,
trial_eligibility_checked_at,
trial_override,
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

        alreadyApproved:
          true,
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

    if (
      !application.admin_email
    ) {
      return NextResponse.json(
        {
          error:
            "This application has no authorised Root administrator email.",
        },
        {
          status: 400,
        }
      );
    }

    let setupAccess;

    try {
      setupAccess =
        await sendSetupAccess(
          supabase,
          application
        );
    } catch (setupError) {
      console.error(
        "ROOT WORKPLACE SETUP ACCESS ERROR:",
        setupError
      );

      return NextResponse.json(
        {
          error:
            setupError?.message ||
            "Root could not send the Workplace setup access email.",
        },
        {
          status: 400,
        }
      );
    }

    const setupUser =
      setupAccess?.user ||
      null;

    if (!setupUser?.id) {
      return NextResponse.json(
        {
          error:
            "Root sent the setup request but could not identify the authorised administrator.",
        },
        {
          status: 500,
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
            setupUser.id,

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
organisation_type,
legal_entity_number,
organisation_domain,
contact_name,
contact_email,
admin_email,
employee_count,
industry,
root_customer_group_id,
trial_eligibility_status,
trial_eligibility_reason,
trial_eligibility_checked_at,
trial_override,
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
            "Root sent the setup access email, but could not update the application status. Please check Supabase before approving again.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "ROOT WORKPLACE APPLICATION APPROVED:",
      application.id,
      application.organisation_name,
      application.admin_email,
      setupAccess.accessType
    );

    return NextResponse.json({
      success: true,

      application:
        approvedApplication,

      accessType:
        setupAccess.accessType,

      invited:
        setupAccess.invited,

      magicLinkSent:
        setupAccess.magicLinkSent,
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
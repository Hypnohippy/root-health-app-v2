import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const formspreeEndpoint =
  "https://formspree.io/f/xkgvgnkw";

function buildAdminClient() {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Root application service is not configured."
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

function clean(value) {
  return String(value || "").trim();
}

async function notifyFormspree(
  application
) {
  try {
    const response =
      await fetch(
        formspreeEndpoint,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            email:
              application.contact_email,

            contact_name:
              application.contact_name,

            organisation_name:
              application.organisation_name,

            employee_count:
              application.employee_count ||
              "Not provided",

            industry:
              application.industry ||
              "Not provided",

            application_id:
              application.id,

            message:
              `New Root Workplace application from ${application.organisation_name}. Contact: ${application.contact_name} (${application.contact_email}).`,
          }),
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "ROOT FORMSPREE NOTIFICATION ERROR:",
        response.status,
        errorText
      );

      return false;
    }

    console.log(
      "ROOT FORMSPREE NOTIFICATION SENT:",
      application.id
    );

    return true;
  } catch (error) {
    console.error(
      "ROOT FORMSPREE NOTIFICATION ERROR:",
      error
    );

    return false;
  }
}

export async function POST(request) {
  try {
    const body =
      await request.json();

    const organisationName =
      clean(
        body.organisationName
      );

    const contactName =
      clean(
        body.contactName
      );

    const contactEmail =
      clean(
        body.contactEmail
      ).toLowerCase();

    const employeeCount =
      clean(
        body.employeeCount
      );

    const industry =
      clean(
        body.industry
      );

    if (
      !organisationName ||
      !contactName ||
      !contactEmail
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete organisation name, contact name and work email.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !contactEmail.includes("@")
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid work email address.",
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
        existingApplication,

      error:
        existingError,
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
            employee_count,
            industry,
            status,
            created_at
          `
        )
        .eq(
          "contact_email",
          contactEmail
        )
        .eq(
          "status",
          "pending"
        )
        .maybeSingle();

    if (existingError) {
      console.error(
        "ROOT APPLICATION EXISTING CHECK ERROR:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            "Root could not check your existing application.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      existingApplication
    ) {
      await notifyFormspree(
        existingApplication
      );

      return NextResponse.json({
        success: true,

        application:
          existingApplication,

        existing: true,
      });
    }

    const {
      data: application,

      error:
        applicationError,
    } =
      await supabase
        .from(
          "organisation_applications"
        )
        .insert({
          user_id: null,

          organisation_name:
            organisationName,

          contact_name:
            contactName,

          contact_email:
            contactEmail,

          employee_count:
            employeeCount ||
            null,

          industry:
            industry ||
            null,

          status:
            "pending",
        })
        .select(
          `
            id,
            organisation_name,
            contact_name,
            contact_email,
            employee_count,
            industry,
            status,
            created_at
          `
        )
        .single();

    if (
      applicationError ||
      !application
    ) {
      console.error(
        "ROOT APPLICATION INSERT ERROR:",
        applicationError
      );

      return NextResponse.json(
        {
          error:
            applicationError?.message ||
            "Root could not submit your Workplace Programme application.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "ROOT WORKPLACE APPLICATION RECEIVED:",
      application.id,
      application.contact_email
    );

    const notificationSent =
      await notifyFormspree(
        application
      );

    return NextResponse.json({
      success: true,

      application,

      existing: false,

      notificationSent,
    });
  } catch (error) {
    console.error(
      "ROOT APPLICATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Root could not submit the application.",
      },
      {
        status: 500,
      }
    );
  }
}

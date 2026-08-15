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

function normaliseOrganisationName(
  value
) {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normaliseLegalEntityNumber(
  value
) {
  return clean(value)
    .toUpperCase()
    .replace(/\s+/g, "");
}

function domainFromEmail(
  value
) {
  const email =
    clean(value).toLowerCase();

  const parts =
    email.split("@");

  if (parts.length !== 2) {
    return null;
  }

  const domain =
    parts[1].trim();

  if (!domain) {
    return null;
  }

  const freeEmailDomains = [
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "hotmail.co.uk",
    "live.com",
    "icloud.com",
    "yahoo.com",
    "yahoo.co.uk",
    "aol.com",
  ];

  if (
    freeEmailDomains.includes(domain)
  ) {
    return null;
  }

  return domain;
}
async function sendApplicationReceivedEmail(
  application
) {
  const smtpUser =
    String(
      process.env.ROOT_SMTP_USER ||
      ""
    ).trim();

  const smtpPassword =
    String(
      process.env.ROOT_SMTP_PASSWORD ||
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
      "Root Workplace email service is not configured."
    );
  }

  const nodemailerModule =
    await import("nodemailer");

  const nodemailer =
    nodemailerModule.default ||
    nodemailerModule;

  const transporter =
    nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

  const contactName =
    String(
      application.contact_name ||
      ""
    ).trim();

  const organisationName =
    String(
      application.organisation_name ||
      "your organisation"
    ).trim();

  await transporter.sendMail({
    from:
      `"Root Workplace" <${smtpFrom}>`,

    to:
      application.contact_email,

    subject:
      "We've received your Root Workplace application",

    text:
`Dear ${contactName || "there"},

Thank you for applying to join the Root Workplace Programme for ${organisationName}.

Your application has been received and is now awaiting review.

Root reviews Workplace applications before creating organisation access. No Workplace account or administrator permissions have been created at this stage.

If the application is approved, the authorised Root administrator will receive secure instructions for setting up Workplace access.

You do not need to do anything while the application is being reviewed. If we need any further information, we'll contact you.

Kind regards,

Root Workplace`,
  });

  console.log(
    "ROOT APPLICATION RECEIPT EMAIL SENT:",
    application.id,
    application.contact_email
  );

  return true;
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

            contact_email:
              application.contact_email,

            admin_email:
              application.admin_email,

            organisation_name:
              application.organisation_name,

            organisation_type:
              application.organisation_type ||
            "Not provided",

            employee_count:
              application.employee_count ||
              "Not provided",

            industry:
              application.industry ||
              "Not provided",

            application_id:
  application.id,

review_application:
  "https://roothealth.app/workplace-applications",

message:
  `New Root Workplace application from ${application.organisation_name}. Contact: ${application.contact_name} (${application.contact_email}). Authorised Root administrator: ${application.admin_email}. Legal entity number: ${application.legal_entity_number || "Not provided"}. Organisation domain: ${application.organisation_domain || "Not identified"}.

Review and approve this application here:
https://roothealth.app/workplace-applications`,
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

    /*
     * Backwards compatible for the current
     * registration page.
     *
     * Once we add the separate Administrator
     * Email field to the form, body.adminEmail
     * will be supplied explicitly.
     */
    const adminEmail =
      clean(
        body.adminEmail ||
        contactEmail
      ).toLowerCase();

    const employeeCount =
      clean(
        body.employeeCount
      );

    const industry =
      clean(
        body.industry
      );

      const organisationType =
  clean(
    body.organisationType
  );

      const legalEntityNumber =
   normaliseLegalEntityNumber(
    body.legalEntityNumber
  );

      const organisationDomain =
   domainFromEmail(
    contactEmail
  ) ||
  domainFromEmail(
    adminEmail
  );

      const associatedBusinessDeclared =
     body.associatedBusinessDeclared === true;

      const associatedBusinessName =
    associatedBusinessDeclared
    ? clean(
        body.associatedBusinessName
      )
    : "";

    if (
      !organisationName ||
      !contactName ||
      !contactEmail ||
      !adminEmail
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete organisation name, contact name, contact email and administrator email.",
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
            "Please enter a valid organisation contact email address.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !adminEmail.includes("@")
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid Root administrator email address.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      buildAdminClient();

    /*
     * IMPORTANT:
     *
     * One email address may legitimately be
     * associated with several organisations.
     *
     * Therefore email alone must NEVER be used
     * to decide that two applications are the same.
     *
     * We load pending applications for the contact
     * email, then only treat one as a duplicate when
     * the organisation name also matches.
     */
    const {
      data:
        pendingApplications,

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
admin_email,
legal_entity_number,
organisation_domain,
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
        );

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

    const normalisedName =
      normaliseOrganisationName(
        organisationName
      );

    const existingApplication =
      (
        pendingApplications ||
        []
      ).find(
        (application) =>
          normaliseOrganisationName(
            application.organisation_name
          ) ===
          normalisedName
      ) || null;

    /*
     * Same organisation + same contact email
     * + still pending = the same application.
     *
     * Different organisation with the same email
     * is a legitimate new application.
     */
    if (
      existingApplication
    ) {
      /*
       * If the authorised administrator has changed,
       * keep the pending application current.
       */
      let currentApplication =
        existingApplication;

      if (
        existingApplication.admin_email !==
        adminEmail
      ) {
        const {
          data:
            updatedApplication,

          error:
            updateError,
        } =
          await supabase
            .from(
              "organisation_applications"
            )
                        .update({
              contact_name:
                contactName,

              admin_email:
                adminEmail,

              organisation_type:
                organisationType ||
                null,

              legal_entity_number:
                legalEntityNumber ||
                null,

              organisation_domain:
                organisationDomain,

              associated_business_declared:
                associatedBusinessDeclared,

              associated_business_name:
                associatedBusinessDeclared
                  ? associatedBusinessName ||
                    null
                  : null,

              employee_count:
                employeeCount ||
                null,

              industry:
                industry ||
                null,
            })
            .eq(
              "id",
              existingApplication.id
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
                created_at
              `
            )
            .single();

        if (
          updateError ||
          !updatedApplication
        ) {
          console.error(
            "ROOT APPLICATION UPDATE ERROR:",
            updateError
          );

          return NextResponse.json(
            {
              error:
                "Root found your existing application but could not update it.",
            },
            {
              status: 500,
            }
          );
        }

        currentApplication =
          updatedApplication;
      }

      await notifyFormspree(
        currentApplication
      );

      return NextResponse.json({
        success: true,

        application:
          currentApplication,

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

          admin_email:
            adminEmail,

          organisation_type:
            organisationType ||
            null,

          legal_entity_number:
            legalEntityNumber ||
            null,

          organisation_domain:
            organisationDomain,

          associated_business_declared:
            associatedBusinessDeclared,

          associated_business_name:
            associatedBusinessDeclared
              ? associatedBusinessName ||
                null
              : null,

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
    admin_email,
    organisation_type,
    legal_entity_number,
    organisation_domain,
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
      application.organisation_name,
      application.contact_email,
      application.admin_email
    );

    const notificationSent =
      await notifyFormspree(
        application
      );

    let receiptEmailSent =
      false;

    try {
      await sendApplicationReceivedEmail(
        application
      );

      receiptEmailSent =
        true;
    } catch (receiptEmailError) {
      console.error(
        "ROOT APPLICATION RECEIPT EMAIL ERROR:",
        receiptEmailError
      );
    }

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
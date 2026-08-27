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

  const isPaid =
    application.access_path === "paid";

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

    subject: isPaid
  ? "We've received your Root Workplace membership details"
  : "We've received your Root Workplace application",

text: isPaid
  ? `Dear ${contactName || "there"},

Thank you for choosing Root Workplace for ${organisationName}.

We've received your organisation and administrator details.

No Workplace account or administrator permissions have been created yet. The next step is to confirm your Root Workplace membership and billing.

Once membership is confirmed, the authorised Root administrator will receive secure instructions for setting up Workplace access.

Kind regards,

Root Workplace`
  : `Dear ${contactName || "there"},

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

  access_path:
  application.access_path ||
  "trial",

  review_application:
  "https://roothealth.app/workplace-applications",

message:
  `New Root Workplace ${
    application.access_path === "paid"
      ? "direct membership request"
      : "complimentary pilot application"
  } from ${application.organisation_name}.

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

    const requestedAccessPath =
      clean(
    body.accessPath
    ).toLowerCase();

    const accessPath =
      requestedAccessPath === "paid"
      ? "paid"
      : "trial";
          const referralCode =
      accessPath === "paid"
        ? clean(
            body.referralCode
          ).toLowerCase()
        : "";

    const referralCampaignCode =
      accessPath === "paid"
        ? clean(
            body.referralCampaignCode
          ).toLowerCase()
        : "";

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
     * INTRODUCER ATTRIBUTION
     *
     * The browser supplies referral codes only.
     * Commission terms are NEVER accepted from the client.
     *
     * Root resolves the introducer and campaign here and
     * snapshots the commercial agreement that applies when
     * the organisation enters through this route.
     */

    let introducerAttribution = {
      introducer_id: null,
      introducer_campaign_id: null,
      referral_code: null,
      referral_campaign_code: null,
      commission_percent_at_conversion: null,
      commission_basis_at_conversion: null,
      commission_structure_at_conversion: null,
      introducer_vat_registered_at_conversion: null,
      introducer_vat_number_at_conversion: null,
      introducer_vat_rate_at_conversion: null,
      referral_attributed_at: null,
    };

    if (
      accessPath === "paid" &&
      referralCode
    ) {
      const {
        data: introducer,
        error: introducerError,
      } = await supabase
        .from("organisation_introducers")
        .select(`
          id,
          referral_code,
          commission_percent,
          commission_basis,
          commission_structure,
          vat_registered,
          vat_number,
          status,
          agreement_start_date,
          agreement_end_date
        `)
        .eq(
          "referral_code",
          referralCode
        )
        .eq(
          "status",
          "active"
        )
        .maybeSingle();

      if (introducerError) {
        console.error(
          "ROOT INTRODUCER LOOKUP ERROR:",
          introducerError
        );
      }

      if (introducer) {
        const today =
          new Date()
            .toISOString()
            .slice(0, 10);

        const agreementActive =
          (!introducer.agreement_start_date ||
            introducer.agreement_start_date <=
              today) &&
          (!introducer.agreement_end_date ||
            introducer.agreement_end_date >=
              today);

        if (agreementActive) {
          let campaign = null;

          if (referralCampaignCode) {
            const {
              data: matchedCampaign,
              error: campaignError,
            } = await supabase
              .from(
                "organisation_introducer_campaigns"
              )
              .select(`
                id,
                campaign_code,
                status,
                starts_at,
                ends_at
              `)
              .eq(
                "introducer_id",
                introducer.id
              )
              .eq(
                "campaign_code",
                referralCampaignCode
              )
              .eq(
                "status",
                "active"
              )
              .maybeSingle();

            if (campaignError) {
              console.error(
                "ROOT INTRODUCER CAMPAIGN LOOKUP ERROR:",
                campaignError
              );
            }

            if (matchedCampaign) {
              const now =
                new Date();

              const startsAt =
                matchedCampaign.starts_at
                  ? new Date(
                      matchedCampaign.starts_at
                    )
                  : null;

              const endsAt =
                matchedCampaign.ends_at
                  ? new Date(
                      matchedCampaign.ends_at
                    )
                  : null;

              const campaignActive =
                (!startsAt ||
                  startsAt <= now) &&
                (!endsAt ||
                  endsAt >= now);

              if (campaignActive) {
                campaign =
                  matchedCampaign;
              }
            }
          }

          introducerAttribution = {
            introducer_id:
              introducer.id,

            introducer_campaign_id:
              campaign?.id || null,

            referral_code:
              introducer.referral_code,

            referral_campaign_code:
              campaign?.campaign_code ||
              null,

            commission_percent_at_conversion:
              introducer.commission_percent,

            commission_basis_at_conversion:
              introducer.commission_basis,

                        commission_structure_at_conversion:
              introducer.commission_structure,

            introducer_vat_registered_at_conversion:
              Boolean(
                introducer.vat_registered
              ),

            introducer_vat_number_at_conversion:
              introducer.vat_registered
                ? introducer.vat_number ||
                  null
                : null,

            introducer_vat_rate_at_conversion:
              introducer.vat_registered
                ? 20
                : 0,

            referral_attributed_at:
              new Date().toISOString(),
          };
        }
      }
    }

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
access_path,
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
       .eq(
          "access_path",
          accessPath
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

              access_path:
                accessPath,
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
                access_path,
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

                    access_path:
            accessPath,

          ...introducerAttribution,

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
    access_path,
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

    /*
 * ==========================================================
 * APPLICATION COMMUNICATIONS
 *
 * Complimentary trials retain Root's review workflow.
 *
 * Direct paid memberships do NOT require manual approval.
 * Their commercial approval is confirmed by successful
 * Stripe payment, after which the webhook sends secure
 * Workplace setup access.
 * ==========================================================
 */

let notificationSent = false;
let receiptEmailSent = false;

if (application.access_path !== "paid") {
  notificationSent =
    await notifyFormspree(
      application
    );

  try {
    await sendApplicationReceivedEmail(
      application
    );

    receiptEmailSent = true;
  } catch (receiptEmailError) {
    console.error(
      "ROOT APPLICATION RECEIPT EMAIL ERROR:",
      receiptEmailError
    );
  }
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
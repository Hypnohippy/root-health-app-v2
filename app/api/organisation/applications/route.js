import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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

function normaliseText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normaliseLegalEntityNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

async function sendPilotDeclineEmail(
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

  const contactEmail =
    normaliseEmail(
      application.contact_email
    );

  if (
    !smtpUser ||
    !smtpPassword ||
    !smtpFrom
  ) {
    throw new Error(
      "Root Workplace email is not configured."
    );
  }

  if (!contactEmail) {
    throw new Error(
      "This application has no organisation contact email."
    );
  }

  const transporter =
    nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

  const organisationName =
    String(
      application.organisation_name ||
      "your organisation"
    ).trim();

  const contactName =
    String(
      application.contact_name ||
      ""
    ).trim();

  const greeting =
    contactName
      ? `Dear ${contactName},`
      : "Hello,";

  const subject =
    "Your Root Workplace complimentary pilot application";

  const text = `${greeting}

Thank you for applying for the Root Workplace complimentary 60-day pilot for ${organisationName}.

Based on the information currently available to us, we are unable to offer this organisation a complimentary pilot at this time.

This decision relates only to eligibility for the complimentary pilot. It does not prevent your organisation from using Root Workplace.

We recognise that company structures and business relationships can be complex. If any of the information we have relied upon is incorrect, incomplete, or does not accurately represent your organisation's circumstances, simply reply to this email with the relevant details and we will review the decision.

Kind regards,

Root Workplace`;

  await transporter.sendMail({
    from: smtpFrom,
    to: contactEmail,
    replyTo: smtpUser,
    subject,
    text,
  });

  return {
    sent: true,
    to: contactEmail,
  };
}

async function getCompaniesHouseEvidence(
  legalEntityNumber
) {
  const companyNumber =
    normaliseLegalEntityNumber(
      legalEntityNumber
    );

  if (!companyNumber) {
    return {
      status: "not_applicable",
      companyNumber: null,
      companyName: null,
      companyStatus: null,
      officers: [],
      personsWithSignificantControl: [],
      reason:
        "No Companies House registration number was supplied.",
    };
  }

  const apiKey =
    process.env.COMPANIES_HOUSE_API_KEY;

  if (!apiKey) {
    console.error(
      "ROOT COMPANIES HOUSE ERROR: API key missing."
    );

    return {
      status: "unavailable",
      companyNumber,
      companyName: null,
      companyStatus: null,
      officers: [],
      personsWithSignificantControl: [],
      reason:
        "Companies House verification is currently unavailable.",
    };
  }

  const authorisation =
    `Basic ${Buffer.from(
      `${apiKey}:`
    ).toString("base64")}`;

  const headers = {
    Authorization: authorisation,
    Accept: "application/json",
  };

  const baseUrl =
    "https://api.company-information.service.gov.uk";

  try {
    const profileResponse =
      await fetch(
        `${baseUrl}/company/${encodeURIComponent(
          companyNumber
        )}`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

    if (profileResponse.status === 404) {
      return {
        status: "not_found",
        companyNumber,
        companyName: null,
        companyStatus: null,
        officers: [],
        personsWithSignificantControl: [],
        reason:
          "Companies House could not verify this registration number.",
      };
    }

    if (!profileResponse.ok) {
      console.error(
        "ROOT COMPANIES HOUSE PROFILE ERROR:",
        profileResponse.status
      );

      return {
        status: "unavailable",
        companyNumber,
        companyName: null,
        companyStatus: null,
        officers: [],
        personsWithSignificantControl: [],
        reason:
          "Companies House verification is currently unavailable.",
      };
    }

    const profile =
      await profileResponse.json();

    const [
      officersResponse,
      pscResponse,
    ] = await Promise.all([
      fetch(
        `${baseUrl}/company/${encodeURIComponent(
          companyNumber
        )}/officers?items_per_page=100`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      ),

      fetch(
        `${baseUrl}/company/${encodeURIComponent(
          companyNumber
        )}/persons-with-significant-control?items_per_page=100&start_index=0&register_view=false`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      ),
    ]);

    let officers = [];

    if (officersResponse.ok) {
      const officersData =
        await officersResponse.json();

      officers = (
        officersData.items || []
      ).map((officer) => ({
        name:
          officer.name || null,

        role:
          officer.officer_role ||
          null,

        appointedOn:
          officer.appointed_on ||
          null,

        resignedOn:
          officer.resigned_on ||
          null,

        active:
          !officer.resigned_on,

        appointmentsLink:
          officer.links
            ?.officer
            ?.appointments ||
          null,
      }));
    } else {
      console.error(
        "ROOT COMPANIES HOUSE OFFICERS ERROR:",
        officersResponse.status
      );
    }

    let personsWithSignificantControl =
      [];

    if (pscResponse.ok) {
      const pscData =
        await pscResponse.json();

      personsWithSignificantControl = (
        pscData.items || []
      ).map((person) => ({
        name:
          person.name || null,

        kind:
          person.kind || null,

        notifiedOn:
          person.notified_on ||
          null,

        ceasedOn:
          person.ceased_on ||
          null,

        active:
          !person.ceased_on,

        naturesOfControl:
          person.natures_of_control ||
          [],
      }));
    } else if (
      pscResponse.status !== 404
    ) {
      console.error(
        "ROOT COMPANIES HOUSE PSC ERROR:",
        pscResponse.status
      );
    }

        const activeDirectors =
      officers.filter(
        (officer) =>
          officer.active &&
          (
            officer.role === "director" ||
            officer.role ===
              "corporate-director" ||
            officer.role ===
              "llp-member" ||
            officer.role ===
              "llp-designated-member" ||
            officer.role ===
              "corporate-llp-member" ||
            officer.role ===
              "corporate-llp-designated-member"
          ) &&
          officer.appointmentsLink
      );

    const directorAppointments = [];

    /*
     * Keep this deliberately bounded.
     *
     * We only need enough relationship evidence
     * for a human approval decision, not a complete
     * corporate intelligence database.
     */
    for (
      const director of
        activeDirectors.slice(0, 10)
    ) {
      try {
        const appointmentsUrl =
          director.appointmentsLink
            .startsWith("http")
            ? director.appointmentsLink
            : `${baseUrl}${director.appointmentsLink}`;

        const appointmentsResponse =
          await fetch(
            appointmentsUrl,
            {
              method: "GET",
              headers,
              cache: "no-store",
            }
          );

        if (
          !appointmentsResponse.ok
        ) {
          console.error(
            "ROOT COMPANIES HOUSE APPOINTMENTS ERROR:",
            appointmentsResponse.status,
            director.name
          );

          continue;
        }

        const appointmentsData =
          await appointmentsResponse.json();

        const appointments =
          (
            appointmentsData.items ||
            []
          )
            .map(
              (appointment) => ({
                officerName:
                  director.name ||
                  appointment.name ||
                  null,

                companyName:
                  appointment
                    .appointed_to
                    ?.company_name ||
                  null,

                companyNumber:
                  appointment
                    .appointed_to
                    ?.company_number ||
                  null,

                companyStatus:
                  appointment
                    .appointed_to
                    ?.company_status ||
                  null,

                appointedOn:
                  appointment.appointed_on ||
                  appointment.appointed_before ||
                  null,

                resignedOn:
                  appointment.resigned_on ||
                  null,

                active:
                  !appointment.resigned_on,
              })
            )
            .filter(
              (appointment) =>
                appointment.companyNumber
            );

        directorAppointments.push(
          ...appointments
        );
      } catch (appointmentsError) {
        console.error(
          "ROOT COMPANIES HOUSE APPOINTMENTS REQUEST ERROR:",
          director.name,
          appointmentsError
        );
      }
    }

    const relatedCompanies =
      Array.from(
        new Map(
          directorAppointments
            .filter(
              (appointment) =>
                normaliseLegalEntityNumber(
                  appointment.companyNumber
                ) !==
                normaliseLegalEntityNumber(
                  profile.company_number ||
                    companyNumber
                )
            )
            .map(
              (appointment) => [
                normaliseLegalEntityNumber(
                  appointment.companyNumber
                ),
                {
                  companyNumber:
                    normaliseLegalEntityNumber(
                      appointment.companyNumber
                    ),

                  companyName:
                    appointment.companyName,

                  companyStatus:
                    appointment.companyStatus,

                  officerName:
                    appointment.officerName,

                  active:
                    appointment.active,
                },
              ]
            )
        ).values()
      );

    return {
      status: "verified",

      companyNumber:
        profile.company_number ||
        companyNumber,

      companyName:
        profile.company_name ||
        null,

      companyStatus:
        profile.company_status ||
        null,

      companyType:
        profile.type ||
        null,

      incorporationDate:
        profile.date_of_creation ||
        null,

      officers,

      personsWithSignificantControl,

      directorAppointments,

      relatedCompanies,

      reason:
        "Companies House verified the organisation and returned available officer, control and director appointment information.",
    };

  } catch (error) {
    console.error(
      "ROOT COMPANIES HOUSE REQUEST ERROR:",
      error
    );

    return {
      status: "unavailable",
      companyNumber,
      companyName: null,
      companyStatus: null,
      officers: [],
      personsWithSignificantControl: [],
      reason:
        "Companies House verification is currently unavailable.",
    };
  }
}

async function assessTrialEligibility(
  supabase,
  application
) {
    const evidence = [];

  const legalEntityNumber =
    normaliseLegalEntityNumber(
      application.legal_entity_number
    );

  const organisationDomain =
    normaliseText(
      application.organisation_domain
    );

  const adminEmail =
    normaliseEmail(
      application.admin_email
    );

  /*
   * COMPANIES HOUSE VERIFICATION
   *
   * This is independent evidence about the
   * supplied UK legal entity.
   *
   * Failure to verify is NEVER treated as proof
   * that an applicant is ineligible.
   */
  const companiesHouse =
    await getCompaniesHouseEvidence(
      legalEntityNumber
    );

  if (
    companiesHouse.status ===
    "verified"
  ) {
    evidence.push(
      `Companies House verified ${companiesHouse.companyName || "the organisation"} (${companiesHouse.companyNumber}).`
    );

    if (
      companiesHouse.companyStatus &&
      companiesHouse.companyStatus !==
        "active"
    ) {
      evidence.push(
        `Companies House reports the company status as "${companiesHouse.companyStatus}".`
      );
    }
  }

  if (
    companiesHouse.status ===
    "not_found"
  ) {
    evidence.push(
      "Companies House could not verify the supplied registration number."
    );
  }

  if (
    companiesHouse.status ===
    "unavailable"
  ) {
    evidence.push(
      "Companies House verification was unavailable, so no eligibility conclusion has been drawn from that check."
    );
  }

  /*
   * 1. EXISTING CUSTOMER GROUP
   *
   * This is our strongest commercial relationship.
   */
  if (
    application.root_customer_group_id
  ) {
    const {
      data: customerGroup,
      error: customerGroupError,
    } = await supabase
      .from("root_customer_groups")
      .select(
        `
          id,
          display_name,
          complimentary_pilot_used,
          complimentary_pilot_started_at,
          complimentary_pilot_organisation_id
        `
      )
      .eq(
        "id",
        application.root_customer_group_id
      )
      .maybeSingle();

    if (customerGroupError) {
      console.error(
        "ROOT DETECTIVE CUSTOMER GROUP ERROR:",
        customerGroupError
      );
    }

    if (
      customerGroup?.complimentary_pilot_used
    ) {
      evidence.push(
        `This application belongs to the existing Root customer group "${customerGroup.display_name}", which has already received a complimentary pilot.`
      );

      return {
        status: "previously_benefited",
        reason: evidence.join(" "),
      };
    }

    if (customerGroup) {
      evidence.push(
        `Root already recognises this application as part of the customer group "${customerGroup.display_name}".`
      );
    }
  }

  /*
   * 2. EXACT LEGAL ENTITY
   *
   * A previous trial for the same legal entity is
   * strong evidence that the complimentary benefit
   * has already been used.
   */
  if (legalEntityNumber) {
    const {
      data: legalMatches,
      error: legalMatchError,
    } = await supabase
      .from("organisation_trial_registry")
      .select("*")
      .eq(
        "legal_entity_number",
        legalEntityNumber
      )
      .limit(10);

    if (legalMatchError) {
      console.error(
        "ROOT DETECTIVE LEGAL ENTITY ERROR:",
        legalMatchError
      );
    }

    if (
      Array.isArray(legalMatches) &&
      legalMatches.length > 0
    ) {
      evidence.push(
        "This legal entity appears in Root's previous trial registry."
      );

      return {
        status: "previously_benefited",
        reason: evidence.join(" "),
      };
    }
  }

    /*
   * 3. COMPANIES HOUSE RELATED ENTITIES
   *
   * Companies House may show that a current
   * director or LLP member is also associated
   * with other legal entities.
   *
   * A director relationship by itself is NOT
   * proof that the applicant has previously
   * benefited from Root.
   *
   * However, if one of those related legal
   * entities appears in Root's trial registry,
   * that is strong evidence requiring review.
   */
  const relatedCompanies =
    Array.isArray(
      companiesHouse.relatedCompanies
    )
      ? companiesHouse.relatedCompanies
      : [];

  const relatedCompanyNumbers =
    [
      ...new Set(
        relatedCompanies
          .map((company) =>
            normaliseLegalEntityNumber(
              company.companyNumber
            )
          )
          .filter(Boolean)
      ),
    ];

  let relatedTrialMatches = [];

  if (
    relatedCompanyNumbers.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "organisation_trial_registry"
      )
      .select("*")
      .in(
        "legal_entity_number",
        relatedCompanyNumbers
      )
      .limit(50);

    if (error) {
      console.error(
        "ROOT DETECTIVE RELATED ENTITY ERROR:",
        error
      );
    } else {
      relatedTrialMatches =
        data || [];
    }
  }

  if (
    relatedTrialMatches.length > 0
  ) {
    const matchedNumbers =
      new Set(
        relatedTrialMatches
          .map((match) =>
            normaliseLegalEntityNumber(
              match.legal_entity_number
            )
          )
          .filter(Boolean)
      );

    const matchedCompanies =
      relatedCompanies.filter(
        (company) =>
          matchedNumbers.has(
            normaliseLegalEntityNumber(
              company.companyNumber
            )
          )
      );

    const matchedNames =
      [
        ...new Set(
          matchedCompanies
            .map(
              (company) =>
                company.companyName
            )
            .filter(Boolean)
        ),
      ];

    if (matchedNames.length > 0) {
      evidence.push(
        `Companies House shows a current director or LLP member associated with ${matchedNames.join(
          ", "
        )}, and ${
          matchedNames.length === 1
            ? "that legal entity appears"
            : "those legal entities appear"
        } in Root's previous trial registry.`
      );
    } else {
      evidence.push(
        "Companies House shows a current director or LLP member associated with another legal entity that appears in Root's previous trial registry."
      );
    }

    return {
      status: "review",
      reason: evidence.join(" "),
    };
  }

  if (
    relatedCompanyNumbers.length > 0
  ) {
    evidence.push(
      `Companies House found ${relatedCompanyNumbers.length} other legal ${
        relatedCompanyNumbers.length === 1
          ? "entity"
          : "entities"
      } associated through a current director or LLP member, but Root found no matching previous trial in its registry.`
    );
  }

  /*
   * 4. DOMAIN RELATIONSHIP
   *
   * A domain match is useful evidence, but it is
   * NOT enough on its own to deny another pilot.
   */
  let domainMatches = [];

  if (organisationDomain) {
    const {
      data,
      error,
    } = await supabase
      .from("organisation_applications")
      .select(
        `
          id,
          organisation_name,
          organisation_domain,
          admin_email,
          root_customer_group_id,
          status,
          created_at
        `
      )
      .eq(
        "organisation_domain",
        organisationDomain
      )
      .neq(
        "id",
        application.id
      )
      .limit(20);

    if (error) {
      console.error(
        "ROOT DETECTIVE DOMAIN ERROR:",
        error
      );
    } else {
      domainMatches = data || [];
    }

    if (domainMatches.length > 0) {
      evidence.push(
        `Root found ${domainMatches.length} previous application${domainMatches.length === 1 ? "" : "s"} using the same organisation domain.`
      );
    }
  }

  /*
   * 4. ADMINISTRATOR RELATIONSHIP
   *
   * Again: evidence, NOT proof.
   *
   * An HR consultant or adviser may administer
   * several completely unrelated organisations.
   */
  let adminMatches = [];

  if (adminEmail) {
    const {
      data,
      error,
    } = await supabase
      .from("organisation_applications")
      .select(
        `
          id,
          organisation_name,
          organisation_domain,
          admin_email,
          root_customer_group_id,
          status,
          created_at
        `
      )
      .eq(
        "admin_email",
        adminEmail
      )
      .neq(
        "id",
        application.id
      )
      .limit(20);

    if (error) {
      console.error(
        "ROOT DETECTIVE ADMIN ERROR:",
        error
      );
    } else {
      adminMatches = data || [];
    }

    if (adminMatches.length > 0) {
      evidence.push(
        `The proposed Root administrator has appeared on ${adminMatches.length} previous Workplace application${adminMatches.length === 1 ? "" : "s"}.`
      );
    }
  }

  /*
   * 5. COMBINED RELATIONSHIPS
   *
   * Domain + administrator together are much more
   * interesting than either signal individually.
   */
  const samePreviousApplication =
    domainMatches.some(
      (domainMatch) =>
        adminMatches.some(
          (adminMatch) =>
            adminMatch.id ===
            domainMatch.id
        )
    );

  if (samePreviousApplication) {
    evidence.push(
      "At least one previous application used both the same organisation domain and the same Root administrator."
    );
  }

  /*
   * 6. KNOWN CUSTOMER-GROUP RELATIONSHIP
   *
   * A previous related application may already have
   * been assigned to a Root customer group.
   */
  const relatedGroupIds = [
    ...domainMatches,
    ...adminMatches,
  ]
    .map(
      (match) =>
        match.root_customer_group_id
    )
    .filter(Boolean);

  if (relatedGroupIds.length > 0) {
    evidence.push(
      "One or more related applications are already associated with a Root customer group."
    );

    return {
      status: "review",
      reason: evidence.join(" "),
    };
  }

  /*
   * 7. FINAL ASSESSMENT
   */
  if (
    samePreviousApplication ||
    (
      domainMatches.length > 0 &&
      adminMatches.length > 0
    )
  ) {
    return {
      status: "review",
      reason: evidence.join(" "),
    };
  }

  if (
    domainMatches.length > 0 ||
    adminMatches.length > 0
  ) {
    return {
      status: "review",
      reason: evidence.join(" "),
    };
  }

  return {
    status: "eligible",
    reason:
      "Root found no meaningful previous customer relationship in the evidence currently available.",
  };
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
  application,
  approvedByUser
) {
  const crypto =
    await import("node:crypto");

  const adminEmail =
    normaliseEmail(
      application.admin_email
    );

  if (!adminEmail) {
    throw new Error(
      "This application has no authorised Root administrator email."
    );
  }

  /*
   * ROOT SECURE SETUP INVITATION
   *
   * Email is the delivery address only.
   *
   * It does NOT identify the human and
   * it does NOT grant organisation access.
   *
   * The unique, one-time invitation is
   * the authority for this setup journey.
   */

  const rawToken =
    crypto.randomBytes(32)
      .toString("hex");

  const tokenHash =
    crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

  const expiresAt =
    new Date(
      Date.now() +
        48 * 60 * 60 * 1000
    ).toISOString();

  /*
   * If approval is intentionally repeated,
   * revoke any older live invitation first.
   *
   * This means there can be only one usable
   * setup credential for this application.
   */
  const {
    error: revokeError,
  } =
    await supabase
      .from(
        "organisation_setup_invites"
      )
      .update({
        status:
          "revoked",

        revoked_at:
          new Date().toISOString(),
      })
      .eq(
        "application_id",
        application.id
      )
      .eq(
        "status",
        "pending"
      );

  if (revokeError) {
    throw revokeError;
  }

  const {
    data: setupInvite,
    error: setupInviteError,
  } =
    await supabase
      .from(
        "organisation_setup_invites"
      )
      .insert({
        application_id:
          application.id,

        intended_email:
          adminEmail,

        intended_role:
          "organisation_admin",

        token_hash:
          tokenHash,

        status:
          "pending",

        expires_at:
          expiresAt,

        created_by:
          approvedByUser?.id ||
          null,
      })
      .select(
        `
          id,
          application_id,
          intended_email,
          intended_role,
          status,
          expires_at
        `
      )
      .single();

  if (
    setupInviteError ||
    !setupInvite
  ) {
    throw (
      setupInviteError ||
      new Error(
        "Root could not create the secure Workplace setup invitation."
      )
    );
  }

  const setupUrl =
    `https://roothealth.app/workplace-setup` +
    `?token=${encodeURIComponent(
      rawToken
    )}`;

  /*
   * Send the invitation ourselves rather
   * than letting Supabase Auth decide
   * whether this email belongs to an
   * existing Root user.
   */

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
      "Root Workplace email is not configured."
    );
  }

  const transporter =
    nodemailer.createTransport({
      service:
        "gmail",

      auth: {
        user:
          smtpUser,

        pass:
          smtpPassword,
      },
    });

  const organisationName =
    String(
      application.organisation_name ||
        "your organisation"
    ).trim();

  const contactName =
    String(
      application.contact_name ||
        ""
    ).trim();

  const greeting =
    contactName
      ? `Dear ${contactName},`
      : "Hello,";

  const subject =
    "Set up your Root Workplace access";

  const text =
`${greeting}

Your organisation's application to join Root Workplace for ${organisationName} has been approved.

You have been invited to set up the authorised Root Workplace administrator account.

This setup invitation is unique to this approval and can only be used once.

Set up Root Workplace:

${setupUrl}

This invitation expires in 48 hours.

If another Root account is currently signed in on your device, Root will ask you to continue with the account intended for this invitation before any organisation access is created.

If you were not expecting this invitation, you can safely ignore this email.

Kind regards,

Root Workplace`;

  await transporter.sendMail({
    from:
      smtpFrom,

    to:
      adminEmail,

    replyTo:
      smtpUser,

    subject,

    text,
  });

  return {
    user:
      null,

    accessType:
      "secure_setup_invite",

    invited:
      true,

    magicLinkSent:
      false,

    setupInviteId:
      setupInvite.id,
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
access_path,
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

    const applications =
  data || [];

const assessedApplications =
  await Promise.all(
    applications.map(
      async (application) => {
        /*
         * Historical applications that are already
         * approved remain visible, but Detective is
         * primarily assessing pending applications.
         */
        if (
          application.status !== "pending"
        ) {
          return application;
        }

        const assessment =
          await assessTrialEligibility(
            supabase,
            application
          );

        const checkedAt =
          new Date().toISOString();

        const {
          data: updatedApplication,
          error: assessmentUpdateError,
        } = await supabase
          .from(
            "organisation_applications"
          )
          .update({
            trial_eligibility_status:
              assessment.status,

            trial_eligibility_reason:
              assessment.reason,

            trial_eligibility_checked_at:
              checkedAt,
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
              access_path,
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
          assessmentUpdateError ||
          !updatedApplication
        ) {
          console.error(
            "ROOT DETECTIVE SAVE ERROR:",
            assessmentUpdateError
          );

          /*
           * Don't break the Applications page merely
           * because Detective could not save her notes.
           */
          return {
            ...application,

            trial_eligibility_status:
              assessment.status,

            trial_eligibility_reason:
              assessment.reason,

            trial_eligibility_checked_at:
              checkedAt,
          };
        }

        return updatedApplication;
      }
    )
  );

return NextResponse.json({
  success: true,

  applications:
    assessedApplications,
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

    const decision =
      String(
        body?.decision ||
        "approve"
      )
        .trim()
        .toLowerCase();

    if (
      ![
        "approve",
        "hold",
        "decline",
      ].includes(decision)
    ) {
      return NextResponse.json(
        {
          error:
            "Root did not recognise that application decision.",
        },
        {
          status: 400,
        }
      );
    }

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
access_path,
payment_status,
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

    /*
 * ==========================================================
 * COMMERCIAL ENTRY PATH
 *
 * Trial applications use the Founder
 * complimentary-pilot decision workflow.
 *
 * Direct paid applications must never be
 * accidentally processed as a complimentary
 * pilot application.
 * ==========================================================
 */

const accessPath =
  String(
    application.access_path ||
      "trial"
  )
    .trim()
    .toLowerCase();

if (
  accessPath === "paid" &&
  (
    decision === "hold" ||
    decision === "decline"
  )
) {
  return NextResponse.json(
    {
      error:
        "Direct Root Workplace membership applications do not use complimentary pilot hold or decline decisions.",
    },
    {
      status: 400,
    }
  );
}
/*
 * Paid access will be enabled by the
 * confirmed billing route, not by the
 * complimentary-pilot approval button.
 *
 * Keep this locked until that payment
 * hand-off is connected.
 */
if (
  accessPath === "paid" &&
  decision === "approve" &&
  application.payment_status !==
    "paid"
) {
  const reviewedAt =
    new Date().toISOString();

  const checkoutUrl =
    `https://roothealth.app/organisations/checkout` +
    `?application_id=${encodeURIComponent(
      application.id
    )}`;

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
    return NextResponse.json(
      {
        error:
          "Root Workplace email is not configured.",
      },
      {
        status: 500,
      }
    );
  }

  const billingEmail =
    normaliseEmail(
      application.admin_email ||
      application.contact_email
    );

  if (!billingEmail) {
    return NextResponse.json(
      {
        error:
          "This application has no email address for membership billing.",
      },
      {
        status: 400,
      }
    );
  }

  const transporter =
    nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

  const organisationName =
    String(
      application.organisation_name ||
      "your organisation"
    ).trim();

  const contactName =
    String(
      application.contact_name ||
      ""
    ).trim();

  const greeting =
    contactName
      ? `Dear ${contactName},`
      : "Hello,";

  const subject =
    "Continue your Root Workplace membership";

  const text =
`${greeting}

Your Root Workplace membership application for ${organisationName} has been approved to continue to secure billing.

No organisation access or administrator permissions have been created yet.

Please continue to secure Root Workplace billing here:

${checkoutUrl}

Once Stripe confirms your subscription, the authorised Root administrator will receive a separate secure setup invitation.

Kind regards,

Root Workplace`;

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: billingEmail,
      replyTo: smtpUser,
      subject,
      text,
    });
  } catch (emailError) {
    console.error(
      "ROOT PAID BILLING EMAIL ERROR:",
      emailError
    );

    return NextResponse.json(
      {
        error:
          "Root could not send the paid membership continuation email.",
      },
      {
        status: 500,
      }
    );
  }

  const {
    data: updatedApplication,
    error: updateError,
  } =
    await supabase
      .from(
        "organisation_applications"
      )
      .update({
        /*
         * Keep status pending until Stripe confirms
         * successful payment.
         */
        status: "pending",

        reviewed_at:
          reviewedAt,
      })
      .eq(
        "id",
        application.id
      )
      .select(
        `
          id,
          organisation_name,
          contact_name,
          contact_email,
          admin_email,
          employee_count,
          access_path,
          payment_status,
          status,
          reviewed_at
        `
      )
      .single();

  if (
    updateError ||
    !updatedApplication
  ) {
    console.error(
      "ROOT PAID APPROVAL SAVE ERROR:",
      updateError
    );

    return NextResponse.json(
      {
        error:
          "Root sent the billing email but could not record the paid application review.",
      },
      {
        status: 500,
      }
    );
  }

  console.log(
    "ROOT PAID APPLICATION APPROVED FOR BILLING:",
    application.id,
    application.organisation_name,
    billingEmail
  );

  return NextResponse.json({
    success: true,

    application:
      updatedApplication,

    decision:
      "approve",

    billingRequired:
      true,

    billingEmailSent:
      true,
  });
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

        const actionableStatuses = [
      "pending",
      "hold",
    ];

    if (
      !actionableStatuses.includes(
        application.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            application.status ===
            "approved"
              ? "This Workplace application has already been approved."
              : application.status ===
                "declined"
              ? "This Workplace application has already been declined."
              : "This Workplace application can no longer be actioned.",
        },
        {
          status: 409,
        }
      );
    }

        if (
      decision === "hold"
    ) {
      const decidedAt =
        new Date().toISOString();

      const {
        data: heldApplication,
        error: holdError,
      } = await supabase
        .from(
          "organisation_applications"
        )
        .update({
          /*
           * Keep the application operationally
           * pending so it remains on the Founder
           * decision screen.
           */
          status: "pending",

          pilot_decision:
            "hold",

          pilot_decision_reason:
            application.trial_eligibility_status ||
            "manual_review",

          pilot_decision_note:
            application.trial_eligibility_reason ||
            "Held for manual review.",

          pilot_decided_at:
            decidedAt,

          pilot_decided_by:
            admin.user.id,

          reviewed_at:
            decidedAt,
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
            access_path,
            trial_eligibility_status,
            trial_eligibility_reason,
            trial_eligibility_checked_at,
            trial_override,
            pilot_decision,
            pilot_decision_reason,
            pilot_decision_note,
            pilot_decided_at,
            pilot_decided_by,
            decline_email_sent_at,
            status,
            reviewed_at,
            created_at
          `
        )
        .single();

      if (
        holdError ||
        !heldApplication
      ) {
        console.error(
          "ROOT WORKPLACE HOLD ERROR:",
          holdError
        );

        return NextResponse.json(
          {
            error:
              "Root could not place this application on hold.",
          },
          {
            status: 500,
          }
        );
      }

      console.log(
        "ROOT WORKPLACE APPLICATION HELD:",
        application.id,
        application.organisation_name
      );

      return NextResponse.json({
        success: true,

        application:
          heldApplication,

        decision: "hold",
      });
    }

            if (
      decision === "decline"
    ) {
      const decidedAt =
        new Date().toISOString();

      const {
        data: declinedApplication,
        error: declineError,
      } = await supabase
        .from(
          "organisation_applications"
        )
        .update({
          status:
            "declined",

          pilot_decision:
            "declined",

          pilot_decision_reason:
            application.trial_eligibility_status ||
            "manual_review",

          pilot_decision_note:
            application.trial_eligibility_reason ||
            "Complimentary pilot declined following Root review.",

          pilot_decided_at:
            decidedAt,

          pilot_decided_by:
            admin.user.id,

          reviewed_at:
            decidedAt,
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
            pilot_decision,
            pilot_decision_reason,
            pilot_decision_note,
            pilot_decided_at,
            pilot_decided_by,
            decline_email_sent_at,
            status,
            reviewed_at,
            created_at
          `
        )
        .single();

      if (
        declineError ||
        !declinedApplication
      ) {
        console.error(
          "ROOT WORKPLACE DECLINE ERROR:",
          declineError
        );

        return NextResponse.json(
          {
            error:
              "Root could not record the complimentary pilot decision.",
          },
          {
            status: 500,
          }
        );
      }

      console.log(
        "ROOT WORKPLACE PILOT DECLINED:",
        application.id,
        application.organisation_name
      );

      let emailSent = false;
      let emailError = null;

      try {
        await sendPilotDeclineEmail(
          declinedApplication
        );

        const emailSentAt =
          new Date().toISOString();

        const {
          error: emailStampError,
        } = await supabase
          .from(
            "organisation_applications"
          )
          .update({
            decline_email_sent_at:
              emailSentAt,
          })
          .eq(
            "id",
            application.id
          );

        if (emailStampError) {
          console.error(
            "ROOT DECLINE EMAIL STAMP ERROR:",
            emailStampError
          );

          emailError =
            "The decline email was sent, but Root could not record the delivery time.";
        } else {
          declinedApplication.decline_email_sent_at =
            emailSentAt;

          emailSent = true;
        }
      } catch (declineEmailError) {
        console.error(
          "ROOT DECLINE EMAIL ERROR:",
          declineEmailError
        );

        emailError =
          declineEmailError?.message ||
          "Root recorded the decision but could not send the applicant email.";
      }

      return NextResponse.json({
        success: true,

        application:
          declinedApplication,

        decision:
          "decline",

        emailSent,

        emailError,
      });
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
    application,
    admin.user
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
  /*
   * Do NOT assign application.user_id yet.
   * 
   * Approval creates an invitation,
   * not an administrator.
   *
   * The authenticated human will only
   * be attached after securely redeeming
   * the setup invitation.
   */
  user_id: null,

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
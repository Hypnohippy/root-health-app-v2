import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@supabase/supabase-js";

import {
  buildRootWorkplacePrice,
} from "../../../../lib/rootWorkplacePricing";

const stripe =
  new Stripe(
    process.env.STRIPE_SECRET_KEY
  );

const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env
    .NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseServiceRoleKey =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY;

function applicationWorkforceSize(
  employeeCount
) {
  const value =
    String(
      employeeCount || ""
    )
      .trim()
      .toLowerCase();

  if (value === "1-50") {
    return 50;
  }

  if (value === "51-150") {
    return 150;
  }

  if (value === "151-500") {
    return 500;
  }

  if (value === "501-1000") {
    return 1000;
  }

  if (
    value === "1000+" ||
    value === "more_than_1000"
  ) {
    return 1001;
  }

  const numeric =
    Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : null;
}

export async function POST(request) {
  try {
    if (
      !process.env
        .STRIPE_SECRET_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return NextResponse.json(
        {
          error:
            "Root could not connect to Supabase.",
        },
        {
          status: 500,
        }
      );
    }

    /*
 * ==========================================================
 * DIRECT PAID WORKPLACE APPLICATION
 *
 * A new direct-paid organisation does not
 * have a Root account, organisation or
 * organisation membership yet.
 *
 * The pending paid application is therefore
 * used to start Stripe Checkout.
 * ==========================================================
 */

let requestBody = {};

try {
  requestBody =
    await request.json();
} catch {
  requestBody = {};
}

const applicationId =
  String(
    requestBody?.applicationId ||
      ""
  ).trim();

if (applicationId) {
  if (!supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Root paid membership checkout is not configured.",
      },
      {
        status: 500,
      }
    );
  }

  const adminSupabase =
    createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

  const {
    data: application,
    error: applicationError,
  } =
    await adminSupabase
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
          employee_count,
          status,
          access_path
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
          "Root could not find this paid Workplace registration.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    application.access_path !==
    "paid"
  ) {
    return NextResponse.json(
      {
        error:
          "This registration is not a direct Root Workplace membership.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    application.status !==
    "pending"
  ) {
    return NextResponse.json(
      {
        error:
          "This Root Workplace membership registration can no longer begin checkout.",
      },
      {
        status: 409,
      }
    );
  }

  const workforceSize =
    applicationWorkforceSize(
      application.employee_count
    );

  const pricing =
    buildRootWorkplacePrice(
      workforceSize
    );

  if (
    pricing.requiresConversation
  ) {
    return NextResponse.json(
      {
        error:
          "Enterprise membership is arranged directly with Root.",
        requiresConversation:
          true,
      },
      {
        status: 400,
      }
    );
  }

  if (
    !pricing.canCheckout ||
    !pricing.price?.stripePriceId
  ) {
    return NextResponse.json(
      {
        error:
          "Root could not determine the correct subscription price for this organisation.",
      },
      {
        status: 400,
      }
    );
  }

  const origin =
    request.headers.get(
      "origin"
    ) ||
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    "https://roothealth.app";

  const session =
    await stripe.checkout.sessions.create(
      {
        mode:
          "subscription",

        line_items: [
          {
            price:
              pricing.price
                .stripePriceId,

            quantity: 1,
          },
        ],

        custom_text: {
          submit: {
            message:
              `Root Workplace membership for ${application.organisation_name}.`,
          },
        },

        customer_email:
          application.admin_email ||
          application.contact_email ||
          undefined,

        client_reference_id:
          application.id,

        metadata: {
          application_id:
            application.id,

          access_path:
            "paid",

          organisation_name:
            application.organisation_name ||
            "",

          workforce_size:
            String(
              workforceSize ||
                ""
            ),

          employee_count:
            String(
              application.employee_count ||
                ""
            ),

          root_price_key:
            pricing.price.key,
        },

        payment_method_collection:
          "always",

        billing_address_collection:
          "required",

        phone_number_collection: {
          enabled: true,
        },

        subscription_data: {
          metadata: {
            application_id:
              application.id,

            access_path:
              "paid",

            root_price_key:
              pricing.price.key,
          },
        },

        success_url:
          `${origin}/organisations/welcome?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${origin}/organisation/register?path=paid&application_id=${encodeURIComponent(
            application.id
          )}&checkout=cancelled`,
      }
    );

  if (!session.url) {
    return NextResponse.json(
      {
        error:
          "Stripe did not return a checkout URL.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,

    directPaid:
      true,

    url:
      session.url,

    applicationId:
      application.id,

    tier: {
      label:
        pricing.price.label,

      monthlyPrice:
        pricing.price
          .monthlyPrice,

      workforceSize:
        pricing.workforceSize,
    },
  });
}

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
      return NextResponse.json(
        {
          error:
            "You need to be signed in.",
        },
        {
          status: 401,
        }
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },
        }
      );

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser(
        accessToken
      );

    const user =
      userData?.user;

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Root could not verify your account.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: membership,
      error: membershipError,
    } =
      await supabase
        .from(
          "organisation_members"
        )
        .select(
          `
            id,
            organisation_id,
            user_id,
            role,
            email,
            name
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      membershipError ||
      !membership
    ) {
      return NextResponse.json(
        {
          error:
            "Root could not find your organisation membership.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      membership.role !==
      "organisation_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only the Organisation Admin can start a Root Workplace subscription.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: organisation,
      error:
        organisationError,
    } =
      await supabase
        .from("organisations")
        .select(
          `
            id,
            name,
            workforce_size,
            subscription_status,
            subscription_active
          `
        )
        .eq(
          "id",
          membership.organisation_id
        )
        .maybeSingle();

    if (
      organisationError ||
      !organisation
    ) {
      return NextResponse.json(
        {
          error:
            "Root could not load your organisation.",
        },
        {
          status: 404,
        }
      );
    }

    const pricing =
      buildRootWorkplacePrice(
        organisation.workforce_size
      );

    if (
      pricing.requiresConversation
    ) {
      return NextResponse.json(
        {
          error:
            "Enterprise membership is arranged directly with Root.",
          requiresConversation:
            true,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !pricing.canCheckout ||
      !pricing.price
        ?.stripePriceId
    ) {
      return NextResponse.json(
        {
          error:
            "Root could not determine the correct subscription price for this organisation.",
        },
        {
          status: 400,
        }
      );
    }

    const origin =
      request.headers.get(
        "origin"
      ) ||
      process.env
        .NEXT_PUBLIC_SITE_URL ||
      "https://root-health-app-v2.vercel.app";

    const session =
      await stripe.checkout.sessions.create(
        {
          mode:
            "subscription",

          line_items: [
  {
    price:
      pricing.price
        .stripePriceId,

    quantity: 1,
  },
],

custom_text: {
  submit: {
    message:
      `Root Workplace membership for ${organisation.name}.`,
  },
},

          customer_email:
            membership.email ||
            user.email ||
            undefined,

          client_reference_id:
            organisation.id,

          metadata: {
            organisation_id:
              organisation.id,

            organisation_name:
              organisation.name ||
              "",

            membership_id:
              membership.id,

            workforce_size:
              String(
                organisation
                  .workforce_size ||
                  ""
              ),

            root_price_key:
              pricing.price.key,
          },

          payment_method_collection:
              "always",

          billing_address_collection:
              "required",

          phone_number_collection: {
              enabled: true,
        },

          subscription_data: {
            metadata: {
              organisation_id:
                organisation.id,

              membership_id:
                membership.id,

              root_price_key:
                pricing.price.key,
            },
          },

          success_url:
            `${origin}/organisations/welcome?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${origin}/organisations/billing?checkout=cancelled`,
        }
      );

    if (!session.url) {
      return NextResponse.json(
        {
          error:
            "Stripe did not return a checkout URL.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      url: session.url,

      tier: {
        label:
          pricing.price.label,

        monthlyPrice:
          pricing.price
            .monthlyPrice,

        workforceSize:
          pricing.workforceSize,
      },
    });
  } catch (error) {
    console.error(
      "ROOT WORKPLACE CHECKOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Root could not start Stripe checkout.",
      },
      {
        status: 500,
      }
    );
  }
}

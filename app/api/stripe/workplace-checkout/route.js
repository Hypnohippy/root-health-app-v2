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
            `${origin}/organisations/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,

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

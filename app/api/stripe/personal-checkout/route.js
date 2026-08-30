import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


/*
 * ==========================================================
 * ROOT PERSONAL PRICING
 * ==========================================================
 *
 * The browser is NEVER allowed to choose a Stripe Price ID.
 *
 * It may only ask Root for:
 *
 *   monthly
 *   annual
 *
 * Root then chooses the trusted Stripe Price ID here.
 * ==========================================================
 */

function getPersonalPrice(plan) {
  if (plan === "monthly") {
    return {
      plan: "monthly",

      stripePriceId:
        process.env
          .STRIPE_PERSONAL_MONTHLY_PRICE_ID,
    };
  }

  if (plan === "annual") {
    return {
      plan: "annual",

      stripePriceId:
        process.env
          .STRIPE_PERSONAL_ANNUAL_PRICE_ID,
    };
  }

  return null;
}


export async function POST(request) {
  try {
    /*
     * ========================================================
     * CONFIGURATION
     * ========================================================
     */

    if (!process.env.STRIPE_SECRET_KEY) {
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
     * ========================================================
     * AUTHENTICATED ROOT USER
     * ========================================================
     *
     * Personal Root uses ACCOUNT FIRST.
     *
     * Stripe payment therefore belongs to an already verified
     * Supabase identity.
     *
     * Email is useful customer information.
     * user.id is the authority.
     * ========================================================
     */

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
            "You need to be signed in before starting a Root membership.",
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


    /*
     * ========================================================
     * REQUESTED PLAN
     * ========================================================
     */

    let requestBody = {};

    try {
      requestBody =
        await request.json();
    } catch {
      requestBody = {};
    }

    const requestedPlan =
      String(
        requestBody?.plan || ""
      )
        .trim()
        .toLowerCase();

    const pricing =
      getPersonalPrice(
        requestedPlan
      );

    if (!pricing) {
      return NextResponse.json(
        {
          error:
            "Please choose a valid Root membership.",
        },
        {
          status: 400,
        }
      );
    }

    if (!pricing.stripePriceId) {
      console.error(
        "ROOT PERSONAL PRICE ID MISSING:",
        pricing.plan
      );

      return NextResponse.json(
        {
          error:
            "This Root membership is not yet configured for checkout.",
        },
        {
          status: 500,
        }
      );
    }


    /*
     * ========================================================
     * STRIPE CHECKOUT
     * ========================================================
     *
     * IMPORTANT:
     *
     * user.id is written to BOTH:
     *
     * 1. Checkout session metadata
     * 2. Stripe subscription metadata
     *
     * That means later Stripe events can always be resolved
     * back to the exact Root identity.
     * ========================================================
     */

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
                pricing.stripePriceId,

              quantity: 1,
            },
          ],

          customer_email:
            user.email ||
            undefined,

          client_reference_id:
            user.id,

          metadata: {
            root_product:
              "personal",

            access_path:
              "personal",

            user_id:
              user.id,

            plan:
              pricing.plan,
          },

          subscription_data: {
            metadata: {
              root_product:
                "personal",

              access_path:
                "personal",

              user_id:
                user.id,

              plan:
                pricing.plan,
            },
          },

          payment_method_collection:
            "always",

          billing_address_collection:
            "auto",

          success_url:
            `${origin}/personal/welcome?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${origin}/personal/join?checkout=cancelled&plan=${encodeURIComponent(
              pricing.plan
            )}`,
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


    /*
     * ========================================================
     * SUCCESS
     * ========================================================
     *
     * Checkout creation does NOT grant access.
     *
     * The Stripe webhook will establish the subscription
     * entitlement only after Stripe confirms payment.
     * ========================================================
     */

    return NextResponse.json({
      success: true,

      url:
        session.url,

      plan:
        pricing.plan,
    });
  } catch (error) {
    console.error(
      "ROOT PERSONAL CHECKOUT ERROR:",
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

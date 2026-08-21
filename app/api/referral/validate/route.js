import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function buildAdminClient() {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Root referral validation is not configured."
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

function normaliseCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export async function POST(request) {
  try {
    const body =
      await request.json();

    const referralCode =
      normaliseCode(
        body?.referralCode
      );

    const campaignCode =
      normaliseCode(
        body?.campaignCode
      );

    if (!referralCode) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error:
            "This referral link is not valid.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      buildAdminClient();

    const {
      data: introducer,
      error: introducerError,
    } =
      await supabase
        .from(
          "organisation_introducers"
        )
        .select(
          `
            id,
            referral_code,
            status,
            agreement_start_date,
            agreement_end_date
          `
        )
        .ilike(
          "referral_code",
          referralCode
        )
        .maybeSingle();

    if (introducerError) {
      throw introducerError;
    }

    if (
      !introducer ||
      introducer.status !== "active"
    ) {
      return NextResponse.json({
        success: true,
        valid: false,
      });
    }

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    if (
      introducer.agreement_start_date &&
      introducer.agreement_start_date >
        today
    ) {
      return NextResponse.json({
        success: true,
        valid: false,
      });
    }

    if (
      introducer.agreement_end_date &&
      introducer.agreement_end_date <
        today
    ) {
      return NextResponse.json({
        success: true,
        valid: false,
      });
    }

    let campaign = null;

    if (campaignCode) {
      const {
        data:
          matchedCampaign,
        error:
          campaignError,
      } =
        await supabase
          .from(
            "organisation_introducer_campaigns"
          )
          .select(
            `
              id,
              introducer_id,
              campaign_code,
              status,
              starts_at,
              ends_at
            `
          )
          .eq(
            "introducer_id",
            introducer.id
          )
          .ilike(
            "campaign_code",
            campaignCode
          )
          .maybeSingle();

      if (campaignError) {
        throw campaignError;
      }

      if (
        !matchedCampaign ||
        matchedCampaign.status !==
          "active"
      ) {
        return NextResponse.json({
          success: true,
          valid: false,
        });
      }

      const now =
        new Date().toISOString();

      if (
        matchedCampaign.starts_at &&
        matchedCampaign.starts_at >
          now
      ) {
        return NextResponse.json({
          success: true,
          valid: false,
        });
      }

      if (
        matchedCampaign.ends_at &&
        matchedCampaign.ends_at <
          now
      ) {
        return NextResponse.json({
          success: true,
          valid: false,
        });
      }

      campaign =
        matchedCampaign;
    }

    return NextResponse.json({
      success: true,
      valid: true,

      referralCode:
        introducer.referral_code,

      campaignCode:
        campaign
          ?.campaign_code ||
        null,
    });
  } catch (error) {
    console.error(
      "ROOT REFERRAL VALIDATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        valid: false,
        error:
          "Root could not validate this referral link.",
      },
      {
        status: 500,
      }
    );
  }
}

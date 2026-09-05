import {
  hrCoachAccessResponse,
  requireHRCoachOrganisationAccess,
} from "../../../lib/hrCoachServerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    try {
      await requireHRCoachOrganisationAccess({
        request,
        organisationId: body?.organisation_id,
      });
    } catch (accessError) {
      return hrCoachAccessResponse(accessError);
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          ok: false,
          error: "OPENAI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: "gpt-realtime",
            audio: {
              output: {
                voice: "alloy",
              },
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "HR VOICE SESSION ERROR:",
        data
      );

      return Response.json(
        {
          ok: false,
          error:
            data?.error?.message ||
            "Could not create the voice session.",
        },
        { status: response.status }
      );
    }

    return Response.json({
      ok: true,
      clientSecret:
        data?.value || null,
      expiresAt:
        data?.expires_at || null,
    });
  } catch (error) {
    console.error(
      "HR VOICE SESSION ROUTE ERROR:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error?.message ||
          "Could not create the voice session.",
      },
      { status: 500 }
    );
  }
}

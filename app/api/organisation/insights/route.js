import { handleOrganisationInsights } from "../../../../lib/organisationInsightsServer.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  return handleOrganisationInsights(request);
}

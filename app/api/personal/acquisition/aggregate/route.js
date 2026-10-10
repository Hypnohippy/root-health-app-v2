import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { UUID } from "../../../../../lib/personalAcquisition";
import { acquisitionAdmin, acquisitionEnabled } from "../../../../../lib/personalAcquisition.server";

export async function POST(request) {
  const secret = process.env.PERSONAL_ACQUISITION_OPS_TOKEN;
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!secret || secret.length < 32) return NextResponse.json({ available: false }, { status: 503 });
  const a = Buffer.from(secret), b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!acquisitionEnabled()) return NextResponse.json({ available: false }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const campaigns = body.campaignIds !== undefined;
  const ids = campaigns ? body.campaignIds : body.acquisitionIds;
  if ((campaigns && body.acquisitionIds !== undefined) || !Array.isArray(ids) || !ids.length || ids.length > 25 || !ids.every(id => typeof id === "string" && UUID.test(campaigns ? id.replace(/^pa-/, "") : id))) return NextResponse.json({ error: "Invalid acquisition/campaign IDs." }, { status: 400 });
  const { data, error } = await acquisitionAdmin().rpc(campaigns ? "personal_acquisition_campaign_counts" : "personal_acquisition_counts",
    campaigns ? { p_campaign_ids: ids } : { p_acquisition_ids: ids });
  if (error) return NextResponse.json({ available: false }, { status: 503 });
  return NextResponse.json({ available: true, counts: data }, { headers: { "Cache-Control": "no-store" } });
}

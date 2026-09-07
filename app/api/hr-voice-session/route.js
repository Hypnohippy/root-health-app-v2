import { createHRVoiceSessionHandler } from "../../../lib/hrVoiceSessionServer.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createHRVoiceSessionHandler();

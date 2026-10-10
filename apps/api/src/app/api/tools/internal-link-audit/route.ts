import { handleInternalLinkAudit } from "../../../../lib/internal-link-audit.ts";

export const runtime = "nodejs";
/** The crawler caps itself at 240 seconds; this leaves response headroom. */
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  return handleInternalLinkAudit(request);
}

import { handleHealth } from "../../../lib/health.ts";

export const runtime = "nodejs";

export function GET(request: Request): Response {
  return handleHealth(request);
}

import {
  buildInternalLinkAuditPayload,
  InternalLinkAuditScanError,
  normalizeInternalLinkAuditUrl,
  scanInternalLinkAuditSite,
} from "@sf/public-tools/internal-link-audit";
import { authorize, type ApiEnv } from "./auth.ts";
import { readJson } from "./request-json.ts";
import { failure, json } from "./respond.ts";

const REQUEST_BODY_LIMIT_BYTES = 4_096;

export interface InternalLinkAuditDependencies {
  readonly env: ApiEnv;
  /** Receives the request signal so a client disconnect aborts the crawl. */
  readonly scan: typeof scanInternalLinkAuditSite;
}

const DEFAULT_DEPENDENCIES: InternalLinkAuditDependencies = {
  env: process.env,
  scan: scanInternalLinkAuditSite,
};

function onlyUrl(body: unknown): { readonly url: unknown } | null {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, "url")
  ) {
    return null;
  }
  return body as { readonly url: unknown };
}

/**
 * The same engine and the same error mapping as nevermore's
 * `/api/tools/internal-link-audit`. What is left out is everything that
 * existed there to serve anonymous public traffic: the per-IP crawl gate, the
 * shared result cache and the credit ledger. One bearer token replaces them.
 */
export async function handleInternalLinkAudit(
  request: Request,
  dependencies: InternalLinkAuditDependencies = DEFAULT_DEPENDENCIES,
): Promise<Response> {
  const denied = authorize(request, dependencies.env);
  if (denied) return denied;
  const body = await readJson(request, REQUEST_BODY_LIMIT_BYTES);
  if (!body.ok) return failure(body.code, body.status);
  const input = onlyUrl(body.value);
  if (!input) return failure("invalid_request", 400);
  const normalized = normalizeInternalLinkAuditUrl(input.url);
  if (!normalized.ok) return failure(normalized.code, 400);
  try {
    const raw = await dependencies.scan(normalized.url, request.signal);
    return json({ data: buildInternalLinkAuditPayload(raw) });
  } catch (error) {
    if (error instanceof InternalLinkAuditScanError) {
      if (error.code === "timeout") return failure("scan_timeout", 504);
      if (error.code === "blocked") return failure("invalid_url", 400);
      // The site made a decision, or its rules could not be read. Neither is
      // "the audit failed", and the caller needs to know which it was.
      if (error.code === "robots_disallowed" || error.code === "robots_unreachable") {
        return failure(error.code, 422);
      }
    }
    return failure("scan_failed", 502);
  }
}

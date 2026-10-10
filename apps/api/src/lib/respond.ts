import { createPublicToolError } from "@sf/public-tools/contract";

export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function failure(code: string, status: number): Response {
  return json(createPublicToolError(code), status);
}

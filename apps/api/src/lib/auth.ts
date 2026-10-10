import { createHash, timingSafeEqual } from "node:crypto";
import { failure } from "./respond.ts";

const MIN_TOKEN_LENGTH = 32;

/**
 * What the API reads its configuration from. Deliberately not `ProcessEnv`:
 * Next widens that type with required members, which a test double cannot meet.
 */
export type ApiEnv = Readonly<Record<string, string | undefined>>;

const digest = (value: string): Buffer =>
  createHash("sha256").update(value).digest();

/**
 * Every route is private: this API spends crawl budget and, later, paid
 * provider credits on whatever it is asked to do.
 *
 * Fails closed. A deployment without a token answers 503 rather than serving
 * requests, because "no token configured" must never mean "no token needed".
 *
 * @returns a response to send as is, or null when the caller is authorized.
 */
export function authorize(
  request: Request,
  env: ApiEnv = process.env,
): Response | null {
  const expected = env.GG_API_TOKEN?.trim() ?? "";
  if (expected.length < MIN_TOKEN_LENGTH) return failure("api_token_unset", 503);
  const header = request.headers.get("authorization") ?? "";
  const presented = /^Bearer\s+(\S+)\s*$/i.exec(header)?.[1] ?? "";
  // Hashing first gives equal-length inputs, which timingSafeEqual requires.
  if (!presented || !timingSafeEqual(digest(presented), digest(expected))) {
    return failure("unauthorized", 401);
  }
  return null;
}

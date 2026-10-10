import { describe, expect, it } from "vitest";
import { InternalLinkAuditScanError } from "@sf/public-tools/internal-link-audit";
import { handleHealth } from "../src/lib/health.ts";
import { handleInternalLinkAudit } from "../src/lib/internal-link-audit.ts";

const TOKEN = "t".repeat(40);
const env = { GG_API_TOKEN: TOKEN };

function post(body: unknown, init: { token?: string; type?: string; raw?: string } = {}): Request {
  const headers = new Headers({ "content-type": init.type ?? "application/json" });
  if (init.token !== "") headers.set("authorization", `Bearer ${init.token ?? TOKEN}`);
  return new Request("http://api.test/api/tools/internal-link-audit", {
    method: "POST",
    headers,
    body: init.raw ?? JSON.stringify(body),
  });
}
const neverScans = async (): Promise<never> => {
  throw new Error("the crawl must not start");
};
const codeOf = async (response: Response): Promise<string> =>
  ((await response.json()) as { error: { code: string } }).error.code;

describe("authorization", () => {
  it("answers 503 when no token is configured, instead of serving openly", async () => {
    for (const value of [undefined, "", "short"]) {
      const response = await handleInternalLinkAudit(post({ url: "https://acme.com" }), {
        env: { GG_API_TOKEN: value },
        scan: neverScans,
      });
      expect(response.status).toBe(503);
      expect(await codeOf(response)).toBe("api_token_unset");
    }
  });

  it("rejects a missing or wrong token before reading the body", async () => {
    for (const token of ["", "x".repeat(40), TOKEN.slice(1)]) {
      const response = await handleInternalLinkAudit(post({ url: "https://acme.com" }, { token }), { env, scan: neverScans });
      expect(response.status).toBe(401);
      expect(await codeOf(response)).toBe("unauthorized");
    }
  });

  it("guards the health route with the same token", async () => {
    const request = (token?: string): Request =>
      new Request("http://api.test/api/health", token ? { headers: { authorization: `Bearer ${token}` } } : {});
    expect(handleHealth(request(), env).status).toBe(401);
    const ok = handleHealth(request(TOKEN), env);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ service: "gengrowth-workbench-api", tools: ["internal-link-audit"] });
  });
});

describe("request validation", () => {
  it("accepts only a JSON object whose single key is url", async () => {
    const cases: [Request, number, string][] = [
      [post({ url: "https://acme.com" }, { type: "text/plain" }), 415, "unsupported_media_type"],
      [post(null, { raw: "{not json" }), 400, "invalid_request"],
      [post({ url: "https://acme.com", depth: 9 }), 400, "invalid_request"],
      [post(["https://acme.com"]), 400, "invalid_request"],
      [post({ url: "x".repeat(5_000) }), 413, "payload_too_large"],
    ];
    for (const [request, status, code] of cases) {
      const response = await handleInternalLinkAudit(request, { env, scan: neverScans });
      expect(response.status).toBe(status);
      expect(await codeOf(response)).toBe(code);
    }
  });

  it("refuses a URL the engine's normalizer rejects, without crawling", async () => {
    // example.com is on the engine's reserved list: it is a documentation domain, not a site to audit.
    for (const url of ["ftp://acme.com", "http://127.0.0.1", "http://localhost:3000", "https://example.com", 42]) {
      const response = await handleInternalLinkAudit(post({ url }), { env, scan: neverScans });
      expect(response.status, String(url)).toBe(400);
    }
  });
});

describe("scan outcomes", () => {
  it("hands the engine the normalized URL and the request signal", async () => {
    const seen: { url?: string; signal?: AbortSignal } = {};
    const request = post({ url: "Acme.com/blog?utm=x" });
    await handleInternalLinkAudit(request, {
      env,
      scan: async (url, signal) => {
        seen.url = url;
        seen.signal = signal;
        throw new InternalLinkAuditScanError("timeout");
      },
    });
    expect(seen.url).toBe("https://acme.com/");
    expect(seen.signal).toBe(request.signal);
  });

  it("maps each engine failure to the status nevermore used", async () => {
    const cases: [unknown, number, string][] = [
      [new InternalLinkAuditScanError("timeout"), 504, "scan_timeout"],
      [new InternalLinkAuditScanError("blocked"), 400, "invalid_url"],
      [new InternalLinkAuditScanError("robots_disallowed"), 422, "robots_disallowed"],
      [new InternalLinkAuditScanError("robots_unreachable"), 422, "robots_unreachable"],
      [new Error("socket hang up"), 502, "scan_failed"],
    ];
    for (const [error, status, code] of cases) {
      const response = await handleInternalLinkAudit(post({ url: "https://acme.com" }), {
        env,
        scan: async () => {
          throw error;
        },
      });
      expect(response.status).toBe(status);
      expect(await codeOf(response)).toBe(code);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});

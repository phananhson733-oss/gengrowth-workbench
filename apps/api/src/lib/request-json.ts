export type JsonBody =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly code: "unsupported_media_type" | "payload_too_large" | "invalid_request";
      readonly status: 415 | 413 | 400;
    };

/** Reads a small JSON body without trusting Content-Length. */
export async function readJson(
  request: Request,
  limitBytes: number,
): Promise<JsonBody> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) {
    return { ok: false, code: "unsupported_media_type", status: 415 };
  }
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, code: "invalid_request", status: 400 };
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limitBytes) {
      await reader.cancel();
      return { ok: false, code: "payload_too_large", status: 413 };
    }
    chunks.push(value);
  }
  try {
    return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { ok: false, code: "invalid_request", status: 400 };
  }
}

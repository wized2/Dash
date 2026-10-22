/**
 * Cloudflare Pages Function — POST /api/hash
 * Body: plain text or JSON { "text": "..." }
 * Returns SHA-256 hex digest (Web Crypto on the edge).
 */
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export async function onRequestPost(context) {
  let text = "";
  const ct = context.request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await context.request.json();
      text = typeof body?.text === "string" ? body.text : JSON.stringify(body);
    } else {
      text = await context.request.text();
    }
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  if (text.length > 256_000) {
    return Response.json({ error: "text too large" }, { status: 413 });
  }
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return Response.json(
    { algorithm: "SHA-256", hash, bytes: data.byteLength },
    {
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    },
  );
}

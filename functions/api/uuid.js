/** Cloudflare Pages Function — GET /api/uuid */
export async function onRequestGet() {
  const uuid = crypto.randomUUID();
  return Response.json(
    { uuid },
    {
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    },
  );
}

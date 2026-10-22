/** Cloudflare Pages Function — GET /api/health */
export async function onRequestGet() {
  return Response.json(
    {
      ok: true,
      service: "endroid-dash",
      time: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    },
  );
}

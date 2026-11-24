// Mini serveur Kickaviz : classement d'un défi entre amis (Cloudflare Pages Functions + KV)
// À placer dans le dépôt GitHub : functions/api/room.js
export async function onRequest({ request, env }) {
  const h = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const err = (m, s) => new Response(JSON.stringify({ error: m }), { status: s, headers: h });
  if (!env.KV) return err("KV non lié", 500);
  let body = null, c;
  if (request.method === "POST") { body = await request.json().catch(() => null); c = body && body.c; }
  else c = new URL(request.url).searchParams.get("c");
  c = String(c || "").toUpperCase();
  if (!/^[A-K][A-Z0-9]{4}$/.test(c)) return err("code invalide", 400);
  const key = "room:" + c;
  let r = JSON.parse((await env.KV.get(key)) || "[]");
  if (request.method === "POST") {
    const n = String(body.n || "").trim().slice(0, 14), s = Number(body.s);
    if (!n || !(s >= 0 && s <= 20)) return err("score invalide", 400);
    const e = r.find(x => x.n === n);
    if (e) e.s = Math.max(e.s, s); else r.push({ n, s });
    r = r.sort((a, b) => b.s - a.s).slice(0, 50);
    await env.KV.put(key, JSON.stringify(r), { expirationTtl: 2592000 });
  }
  return new Response(JSON.stringify({ r }), { headers: h });
}

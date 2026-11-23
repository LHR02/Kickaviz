// Cloudflare Pages Function : /api/coach
// La clé API reste côté serveur (variable d'environnement ANTHROPIC_API_KEY), jamais dans le site.
const SYSTEM = `Tu es le coach de Kickaviz, une appli de vision de jeu pour footballeurs amateurs.
Réponds en français, de façon simple et motivante, en 150 mots maximum.
Tu proposes des exercices physiques ou mentaux adaptés au poste, au niveau et aux points faibles donnés.
Donne des consignes concrètes (durée, séries, repos) et pense à l'échauffement.
Tu ne donnes pas d'avis médical : en cas de douleur, conseille de consulter un professionnel.
Si la question n'a rien à voir avec le football ou l'entraînement, refuse poliment.`;

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

export async function onRequestPost({ request, env }) {
  // Autorise uniquement les appels venant du site lui-même
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "forbidden" }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "no key" }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const q = String(body.q || "").slice(0, 300);
  if (q.length < 3) return json({ error: "empty" }, 400);
  const c = body.ctx || {};
  const ctx = `Poste : ${String(c.poste || "?").slice(0, 40)}
Niveau : ${String(c.niveau || "?").slice(0, 20)}
Points faibles : ${Array.isArray(c.points_faibles) ? c.points_faibles.slice(0, 3).join(", ").slice(0, 80) : "?"}
Séances faites : ${Number(c.seances) || 0}`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 450,
      system: SYSTEM,
      messages: [{ role: "user", content: `${ctx}\n\nQuestion du joueur : ${q}` }],
    }),
  });
  if (!r.ok) return json({ error: "upstream" }, 502);
  const d = await r.json();
  const text = (d.content || []).map((b) => b.text || "").join("").trim();
  return json({ text });
}

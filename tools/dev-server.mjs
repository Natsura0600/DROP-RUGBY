// Servidor local de prueba (no se usa en producción).
//   node tools/dev-server.mjs   →   http://localhost:4173
//
// Sirve los archivos estáticos con URLs limpias y simula /api/content y
// /api/admin con los JSON de /data, guardando en memoria. Sirve para ver
// el diseño y probar el quiz sin credenciales de R2.
// En el panel local se entra con cualquier usuario y contraseña.

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".mp4": "video/mp4",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8"
};

const readJSON = async (file, fallback) => {
  try { return JSON.parse(await fs.readFile(path.join(ROOT, "data", file), "utf8")); }
  catch { return fallback; }
};

const content = {
  articles: await readJSON("articles.json", []),
  fixtures: await readJSON("fixtures.json", []),
  teams: await readJSON("teams.json", {}),
  quiz: await readJSON("quiz.json", null),
  players: (await readJSON("players.json", {})).players || [],
  results: [], standings: [], standingsBase: [], settings: {}
};

// La tabla base vive en api/content.js: la tomamos de ahí para no duplicarla.
try {
  const source = await fs.readFile(path.join(ROOT, "api", "content.js"), "utf8");
  const block = source.match(/const DEFAULT_STANDINGS_BASE = (\[[\s\S]*?\]);/);
  if (block) {
    content.standingsBase = new Function(`return ${block[1]}`)();
    content.standings = content.standingsBase.map((row, i) => ({ position: i + 1, ...row }));
  }
} catch {}

const send = (res, status, body, type = "application/json; charset=utf-8") => {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const readBody = req => new Promise(resolve => {
  let raw = "";
  req.on("data", chunk => { raw += chunk; });
  req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } });
});

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = decodeURIComponent(url.pathname);

  if (route === "/api/content") return send(res, 200, content);

  if (route === "/api/admin") {
    const body = req.method === "POST" ? await readBody(req) : {};
    const action = body.action || url.searchParams.get("action");

    if (action === "session") return send(res, 200, { ok: true, authenticated: true, user: "admin (local)" });
    if (action === "login" || action === "logout") return send(res, 200, { ok: true, user: "admin (local)" });
    if (action === "get" || action === "load") return send(res, 200, { ok: true, content });
    if (action === "save-quiz") {
      content.quiz = { ...body.quiz, updatedAt: new Date().toISOString() };
      return send(res, 200, { ok: true, quiz: content.quiz, content });
    }
    if (action === "save-players") {
      content.players = (Array.isArray(body.players) ? body.players : []).filter(p => p && p.name && p.club);
      return send(res, 200, { ok: true, players: content.players, content });
    }
    return send(res, 400, { ok: false, error: "Acción no disponible en el servidor local de prueba." });
  }

  if (route.startsWith("/api/")) return send(res, 200, { ok: true, items: [], local: true });

  const clean = route === "/" ? "/index.html" : route;
  const candidates = [clean, clean + ".html"].map(p => path.join(ROOT, p));

  for (const file of candidates) {
    if (!file.startsWith(ROOT)) break;
    try {
      const data = await fs.readFile(file);
      return send(res, 200, data, TYPES[path.extname(file)] || "application/octet-stream");
    } catch {}
  }

  send(res, 404, "No encontrado", "text/plain; charset=utf-8");
}).listen(PORT, () => console.log(`DropRugby local → http://localhost:${PORT}`));

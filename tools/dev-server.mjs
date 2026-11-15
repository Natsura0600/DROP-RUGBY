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
import { getDivisions, migrateSeason, recalcTables, resetSeason, sanitizeDivisions } from "../lib/urba.js";
import { generateDailyQuiz } from "../lib/quiz-ai.js";
import { syncUrba } from "../lib/urba-sync.js";

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
  players: [],
  games: null,
  results: [], standings: [], standingsBase: [], settings: {}
};

// Igual que en producción: temporada vigente con las tablas en cero (lib/urba.js).
migrateSeason(content);

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
      content.players = (Array.isArray(body.players) ? body.players : [])
        .filter(p => p && (p.last || p.name) && p.club)
        .map(p => ({ ...p, name: p.last ? `${p.first || ""} ${p.last}`.trim() : p.name }));
      return send(res, 200, { ok: true, players: content.players, content });
    }
    if (action === "urba-sync" || action === "save-urba-sync") {
      if (action === "save-urba-sync") content.urbaSync = { ...(content.urbaSync || {}), enabled: body.enabled !== false };
      if (content.urbaSync?.enabled !== false) await syncUrba(content); else recalcTables(content);
      return send(res, 200, { ok: true, urbaSync: content.urbaSync, content });
    }
    if (action === "save-divisions") {
      content.divisions = sanitizeDivisions(body.divisions);
      recalcTables(content);
      return send(res, 200, { ok: true, divisions: getDivisions(content), content });
    }
    if (action === "reset-season") {
      const archivedAs = resetSeason(content, { archiveAs: String(content.season || ""), newSeason: Number(body.season) || content.season });
      return send(res, 200, { ok: true, archivedAs, content });
    }
    if (action === "save-standings-base") {
      content[body.division === "primeraA" ? "standingsBaseA" : "standingsBase"] = body.standingsBase || [];
      recalcTables(content);
      return send(res, 200, { ok: true, standingsBase: content[body.division === "primeraA" ? "standingsBaseA" : "standingsBase"], standings: content.standings, standingsA: content.standingsA, content });
    }
    if (action === "generate-quiz") {
      const quiz = await generateDailyQuiz(content, { req });
      content.quiz = quiz;
      content.quizAI = { lastRun: new Date().toISOString(), lastError: quiz.aiError || "", model: quiz.model || "", source: quiz.source };
      return send(res, 200, { ok: true, quiz, content });
    }
    if (action === "save-games") {
      content.games = { ...body.games, updatedAt: new Date().toISOString() };
      return send(res, 200, { ok: true, games: content.games, content });
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

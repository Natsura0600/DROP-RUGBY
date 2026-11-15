// ============================================================
// SINCRONIZACIÓN CON LA SUPER RUGBY AMÉRICAS
//
// superrugbyamericas.com/torneo-11 muestra la tabla con un iframe de
// RegiSLAR (Sudamérica Rugby). Esa página viene armada en HTML:
//   https://regisar.sudamerica.rugby/embed/dashboard
// De ahí se lee la "Tabla de Posiciones" (y el escudo de cada equipo) y se
// guarda en content.sraSync. lib/urba.js usa esa tabla oficial en lugar de
// la calculada con los resultados del panel.
// ============================================================

import { getDivisions, recalcTables, teamKey } from "./urba.js";

const DASHBOARD = "https://regisar.sudamerica.rugby/embed/dashboard";

const num = (value) => Number(String(value).replace(/[^\d-]/g, "")) || 0;

const decode = (text) => String(text || "")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();

/** Lee la tabla de posiciones del HTML de RegiSLAR. */
export function parseSraTable(html) {
  const start = html.search(/Tabla de Posiciones/i);
  if (start < 0) throw new Error("No se encontró la tabla de posiciones de la SRA.");
  const body = html.slice(start).match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!body) throw new Error("La tabla de la SRA vino vacía.");

  const rows = [];
  for (const tr of body[1].split(/<tr\b/i).slice(1)) {
    const name = decode(tr.match(/<span[^>]*font-bold[^>]*>([\s\S]*?)<\/span>/i)?.[1] || tr.match(/alt="([^"]+)"/i)?.[1]);
    const logo = decode(tr.match(/<img[^>]+src="([^"]+)"/i)?.[1] || "");
    const cells = [...tr.matchAll(/<td[^>]*text-center[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, "")));
    if (!name || cells.length < 11) continue;
    const [pj, pg, pe, pp, pf, pc, tf, tc, dp, pb, pts] = cells.map(num);
    rows.push({ team: name, logo: /^https:\/\//.test(logo) ? logo : "", pj, pg, pe, pp, pf, pc, tf, tc, diff: dp, bonus: pb, pts });
  }
  if (!rows.length) throw new Error("No se pudieron leer los equipos de la tabla de la SRA.");
  return rows;
}

export async function fetchSraTable(timeoutMs = 15000) {
  const response = await fetch(DASHBOARD, {
    headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; DropRugby/1.0; +https://www.droprugby.com)" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`La SRA respondió ${response.status}.`);
  return parseSraTable(await response.text());
}

/**
 * Sincroniza la tabla de la SRA. No lanza errores: los deja en
 * content.sraSync.lastError. Devuelve true si cambió algo para guardar.
 */
export async function syncSra(content) {
  const prev = content.sraSync && typeof content.sraSync === "object" ? content.sraSync : {};
  const before = JSON.stringify({ r: prev.rows, l: prev.logos });
  const next = { enabled: prev.enabled !== false, lastRun: new Date().toISOString(), lastError: "", rows: prev.rows || [], logos: prev.logos || {} };

  try {
    const rows = await fetchSraTable();
    // Nombres como en nuestra lista ("Yacare XV" → "Yacaré XV", "Cobras Brasil Rugby" → "Cobras").
    const clubs = getDivisions(content).sra?.clubs || [];
    const canonical = new Map(clubs.map((c) => [teamKey(c), c]));
    next.rows = rows.map(({ logo, ...r }) => ({ ...r, team: canonical.get(teamKey(r.team)) || r.team }));
    next.logos = {};
    rows.forEach((r, i) => { if (r.logo) next.logos[next.rows[i].team] = r.logo; });
  } catch (error) {
    next.lastError = String(error?.message || error).slice(0, 300);
  }

  content.sraSync = next;
  recalcTables(content);
  return before !== JSON.stringify({ r: next.rows, l: next.logos }) || !prev.lastRun || !!next.lastError !== !!prev.lastError;
}

/** ¿Toca volver a consultar la SRA? (cada `hours` horas como mucho) */
export function sraSyncDue(content, hours = 3) {
  const sync = content?.sraSync;
  if (sync?.enabled === false) return false;
  const last = Date.parse(sync?.lastRun || "") || 0;
  return Date.now() - last > hours * 3600 * 1000;
}

// ============================================================
// SINCRONIZACIÓN CON URBA.ORG.AR
//
// La web de la URBA arma el fixture con una API pública en JSON:
//   /api/fixture/filters                → temporadas y clubes (con escudo)
//   /api/fixture/menu?seasonId=AAAA     → torneos de la temporada
//   /api/fixture/championship/{id}      → partidos y tabla ("standings")
//
// Para la temporada en curso (content.season) se buscan los torneos
// "TOP 14 - Superior" y "PRIMERA A - Superior" y se guarda su tabla en
// content.urbaSync.tables. lib/urba.js usa esa tabla oficial en lugar de
// la calculada. Si la URBA todavía no publicó la temporada, no se toca nada.
// ============================================================

import { URBA_DIVISION_KEYS as DIVISION_KEYS, SEASON, getDivisions, recalcTables, teamKey } from "./urba.js";

const URBA = "https://urba.org.ar";

const CHAMPIONSHIP_NAMES = {
  top14: /^top\s*1[24]\s*-\s*superior$/i,
  primeraA: /^primera\s*a\s*-\s*superior$/i
};

async function getJSON(path, timeoutMs = 15000) {
  const response = await fetch(URBA + path, {
    headers: { Accept: "application/json", "User-Agent": "DropRugby/1.0 (+https://www.droprugby.com)" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`URBA respondió ${response.status} en ${path}`);
  return response.json();
}

function flatten(items, out = []) {
  for (const item of Array.isArray(items) ? items : []) {
    out.push(item);
    if (item?.subitems) flatten(item.subitems, out);
  }
  return out;
}

const num = (value) => Number(value) || 0;

/** Trae de la URBA las tablas de la temporada pedida (o informa que no está publicada). */
export async function fetchUrbaTables(season) {
  const filters = await getJSON("/api/fixture/filters");

  // Escudos de todos los clubes, por nombre comparable.
  const logos = {};
  for (const club of Array.isArray(filters?.clubs) ? filters.clubs : []) {
    if (club?.name && club.image_uri_with_base_url) logos[teamKey(club.name)] = club.image_uri_with_base_url;
  }

  const seasonInfo = (Array.isArray(filters?.seasons) ? filters.seasons : [])
    .find((s) => String(s.id) === String(season) || String(s.name) === String(season));
  if (!seasonInfo) return { published: false, season, logos, tables: {} };

  const menu = await getJSON(`/api/fixture/menu?seasonId=${encodeURIComponent(seasonInfo.id)}`);
  const championships = flatten(menu?.championships);

  const tables = {};
  for (const key of DIVISION_KEYS) {
    const champ = championships.find((c) => CHAMPIONSHIP_NAMES[key].test(String(c?.name || "").trim()));
    if (!champ) continue;

    const data = await getJSON(`/api/fixture/championship/${encodeURIComponent(champ.id)}`);
    const rows = (Array.isArray(data?.standings) ? data.standings : [])
      .slice()
      .sort((a, b) => num(a.position) - num(b.position))
      .map((s) => ({
        team: String(s?.team?.club?.name || s?.team?.name || "").trim(),
        pj: num(s.played),
        pg: num(s.won),
        pe: num(s.tied),
        pp: num(s.lost),
        pf: num(s.points_favor),
        pc: num(s.points_against),
        diff: num(s.points_favor) - num(s.points_against),
        bonus: num(s.bonus_offensive) + num(s.bonus_defensive),
        pts: num(s.points_total)
      }))
      .filter((row) => row.team);

    const rounds = Array.isArray(data?.championship?.rounds) ? data.championship.rounds : [];
    const played = rounds.filter((r) => (r.matches || []).some((m) => m.fulfilled));
    const last = played[played.length - 1];

    tables[key] = {
      championshipId: champ.id,
      name: String(champ.name || ""),
      rows,
      lastRound: last ? { name: String(last.name || ""), date: String(last.playdate || "").slice(0, 10) } : null
    };
  }

  return { published: true, season, logos, tables };
}

/**
 * Sincroniza el contenido con la URBA. No lanza errores: los deja en
 * content.urbaSync.lastError. Devuelve true si cambió algo para guardar.
 */
export async function syncUrba(content) {
  const before = JSON.stringify({ s: content.standings, a: content.standingsA, u: content.urbaSync?.tables, l: content.urbaSync?.logos });
  const prev = content.urbaSync && typeof content.urbaSync === "object" ? content.urbaSync : {};
  const season = Number(content.season) || SEASON;

  const next = {
    enabled: prev.enabled !== false,
    season,
    lastRun: new Date().toISOString(),
    lastError: "",
    published: false,
    tables: {},
    logos: prev.logos || {}
  };

  try {
    const result = await fetchUrbaTables(season);
    next.published = result.published;

    // Escudos de la URBA para los clubes de nuestras divisiones (por nombre de la lista).
    const divisions = getDivisions(content);
    const logos = {};
    for (const d of Object.values(divisions)) {
      for (const club of d.clubs) {
        const url = result.logos[teamKey(club)];
        if (url) logos[club] = url;
      }
    }
    next.logos = logos;

    // Solo se usan tablas con equipos: si la URBA todavía no cargó la temporada, quedan las nuestras.
    for (const [key, table] of Object.entries(result.tables)) {
      if (table.rows.length) next.tables[key] = table;
    }
    if (!result.published) next.message = `La URBA todavía no publicó la temporada ${season}.`;
    else if (!Object.keys(next.tables).length) next.message = `La temporada ${season} todavía no tiene tablas en la URBA.`;
  } catch (error) {
    next.lastError = String(error?.message || error).slice(0, 300);
    next.tables = prev.season === season && prev.tables ? prev.tables : {};
    next.published = prev.published || false;
  }

  content.urbaSync = next;
  recalcTables(content);

  const after = JSON.stringify({ s: content.standings, a: content.standingsA, u: next.tables, l: next.logos });
  return before !== after || !prev.lastRun || !!next.lastError !== !!prev.lastError;
}

/** ¿Toca volver a consultar la URBA? (cada `hours` horas como mucho) */
export function urbaSyncDue(content, hours = 3) {
  const sync = content?.urbaSync;
  if (sync?.enabled === false) return false;
  const last = Date.parse(sync?.lastRun || "") || 0;
  return Date.now() - last > hours * 3600 * 1000;
}

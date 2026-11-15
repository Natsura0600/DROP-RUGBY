// ============================================================
// URBA — divisiones, tablas y cambio de temporada
//
// Lo usan api/content.js (web pública) y api/admin.js (panel).
// Cada división tiene su lista de clubes, su tabla base y su
// tabla calculada:
//
//   top14     → standingsBase  / standings   (competición "URBA TOP 14")
//   primeraA  → standingsBaseA / standingsA  (competición "URBA PRIMERA A")
//   sra       → standingsBaseSRA / standingsSRA (competición "SUPER RUGBY AMERICAS")
//
// Super Rugby Américas no es de la URBA: no se sincroniza con urba.org.ar
// y el cambio de temporada de la URBA no la toca.
//
// La lista de clubes de cada división se edita desde el panel
// (content.divisions). Si nunca se editó, valen las de acá.
// ============================================================

export const SEASON = 2027;

export const DEFAULT_DIVISIONS = {
  top14: {
    key: "top14",
    urba: true,
    name: "URBA Top 14",
    competition: "URBA TOP 14",
    baseKey: "standingsBase",
    tableKey: "standings",
    clubs: [
      "Newman",
      "CASI",
      "SIC",
      "Buenos Aires C&RC",
      "Belgrano Athletic",
      "Regatas Bella Vista",
      "Hindú",
      "Los Tilos",
      "CUBA",
      "Atletico del Rosario",
      "La Plata",
      "Alumni",
      "San Cirano",
      "San Luis"
    ]
  },
  primeraA: {
    key: "primeraA",
    urba: true,
    name: "URBA Primera A",
    competition: "URBA PRIMERA A",
    baseKey: "standingsBaseA",
    tableKey: "standingsA",
    clubs: [
      "Manuel Belgrano",
      "Banco Nación",
      "Lomas Athletic",
      "Curupaytí",
      "San Fernando",
      "Pucará",
      "Gimnasia y Esgrima",
      "Hurling",
      "San Andrés",
      "Pueyrredón",
      "Olivos",
      "Deportiva Francesa",
      "Champagnat",
      "Los Matreros"
    ]
  },
  sra: {
    key: "sra",
    urba: false,
    name: "Super Rugby Américas",
    competition: "SUPER RUGBY AMERICAS",
    baseKey: "standingsBaseSRA",
    tableKey: "standingsSRA",
    clubs: [
      "Pampas",
      "Tarucas",
      "Dogos XV",
      "Capibaras XV",
      "Peñarol Rugby",
      "Selknam",
      "Cobras",
      "Yacaré XV"
    ]
  }
};

/** Divisiones de la URBA (las que se sincronizan y se reinician por temporada). */
export const URBA_DIVISION_KEYS = Object.keys(DEFAULT_DIVISIONS).filter((k) => DEFAULT_DIVISIONS[k].urba);

export const DIVISION_KEYS = Object.keys(DEFAULT_DIVISIONS);

// Formas alternativas de escribir un club → nombre de la lista.
const ALIASES = {
  "belgrano": "belgrano athletic",
  "regatas": "regatas bella vista",
  "regatas de bella vista": "regatas bella vista",
  "plaza": "atletico del rosario",
  "atletico del rosario uba": "atletico del rosario",
  "ca atletico del rosario": "atletico del rosario",
  "biei": "buenos aires crc",
  "bac": "buenos aires crc",
  "buenos aires": "buenos aires crc",
  "champa": "champagnat",
  "matreros": "los matreros",
  "lomas": "lomas athletic",
  "geba": "gimnasia y esgrima",
  "gimnasia": "gimnasia y esgrima",
  "gimnasia y esgrima de buenos aires": "gimnasia y esgrima",
  "francesa": "deportiva francesa",
  "hurlingham": "hurling",
  "rosario": "atletico del rosario",
  "atletico rosario": "atletico del rosario",
  "banco": "banco nacion",
  "club banco nacion": "banco nacion",
  "bna": "banco nacion",
  "manuel belgrano rugby": "manuel belgrano",
  "pampas xv": "pampas",
  "dogos": "dogos xv",
  "capibaras": "capibaras xv",
  "penarol": "penarol rugby",
  "cobras brasil": "cobras",
  "cobras brasil xv": "cobras",
  "cobras brasil rugby": "cobras",
  "cobras rugby": "cobras",
  "yacare": "yacare xv"
};

/** Clave comparable de un club: minúsculas, sin tildes, sin "club", sin signos. */
export function teamKey(name) {
  const key = String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^club\s+/, "")
    .replace(/&/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ALIASES[key] || key;
}

function cleanClubList(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map((name) => String(name || "").replace(/\s+/g, " ").trim().slice(0, 60))
    .filter((name) => name && !seen.has(teamKey(name)) && seen.add(teamKey(name)))
    .slice(0, 24);
}

/** Divisiones vigentes: las guardadas en el contenido o las de esta lista. */
export function getDivisions(content) {
  const saved = content?.divisions && typeof content.divisions === "object" ? content.divisions : {};
  const out = {};
  for (const key of DIVISION_KEYS) {
    const base = DEFAULT_DIVISIONS[key];
    const clubs = cleanClubList(saved[key]?.clubs);
    out[key] = { ...base, clubs: clubs.length ? clubs : base.clubs.slice() };
  }
  return out;
}

export function sanitizeDivisions(input) {
  const out = {};
  for (const key of DIVISION_KEYS) {
    out[key] = { clubs: cleanClubList(input?.[key]?.clubs) };
  }
  return out;
}

export function divisionForCompetition(content, competition) {
  const comp = String(competition || "").trim().toUpperCase();
  return Object.values(getDivisions(content)).find((d) => d.competition === comp) || null;
}

export function isDivisionCompetition(competition) {
  const comp = String(competition || "").trim().toUpperCase();
  return Object.values(DEFAULT_DIVISIONS).some((d) => d.competition === comp);
}

export function isUrbaCompetition(competition) {
  const comp = String(competition || "").trim().toUpperCase();
  return Object.values(DEFAULT_DIVISIONS).some((d) => d.urba && d.competition === comp);
}

export function zeroBase(clubs) {
  return clubs.map((team) => ({ team, pj: 0, pg: 0, pe: 0, pp: 0, diff: 0, pts: 0 }));
}

const num = (value) => Number(value) || 0;

/**
 * Tabla de una división: tabla base + resultados cargados de esa competición.
 * Solo cuentan los clubes de la división (con su nombre de la lista).
 * Victoria 4, empate 2, derrota 0, punto bonus +1.
 */
export function computeTable(content, divisionKey) {
  const division = getDivisions(content)[divisionKey];
  if (!division) return [];

  const canonical = new Map(division.clubs.map((name) => [teamKey(name), name]));

  // Tabla oficial de la URBA (lib/urba-sync.js), si está activa y es de esta temporada.
  const sync = content?.urbaSync;
  const sra = content?.sraSync;
  const official = divisionKey === "sra"
    // Tabla oficial de la Super Rugby Américas (lib/sra-sync.js), si está activa.
    ? (sra && sra.enabled !== false ? sra.rows : null)
    : sync && sync.enabled !== false && Number(sync.season) === (Number(content?.season) || SEASON)
      ? sync.tables?.[divisionKey]?.rows
      : null;
  if (Array.isArray(official) && official.length) {
    return official.map((r, index) => ({
      position: index + 1,
      team: canonical.get(teamKey(r.team)) || r.team,
      pj: num(r.pj), pg: num(r.pg), pe: num(r.pe), pp: num(r.pp),
      pf: num(r.pf), pc: num(r.pc),
      diff: num(r.diff),
      bonus: num(r.bonus),
      pts: num(r.pts)
    }));
  }

  const rows = new Map();

  const row = (name) => {
    const key = teamKey(name);
    if (!canonical.has(key)) return null;
    if (!rows.has(key)) {
      rows.set(key, {
        team: canonical.get(key),
        pj: 0, pg: 0, pe: 0, pp: 0, pf: 0, pc: 0,
        baseDiff: 0, bonus: 0, pts: 0
      });
    }
    return rows.get(key);
  };

  // Todos los clubes de la división aparecen, aunque no hayan jugado.
  division.clubs.forEach(row);

  for (const base of Array.isArray(content?.[division.baseKey]) ? content[division.baseKey] : []) {
    const r = row(base?.team);
    if (!r) continue;
    r.pj += num(base.pj);
    r.pg += num(base.pg);
    r.pe += num(base.pe);
    r.pp += num(base.pp);
    r.baseDiff += num(base.diff);
    r.pts += num(base.pts);
  }

  for (const result of Array.isArray(content?.results) ? content.results : []) {
    if (String(result?.competition || "").trim().toUpperCase() !== division.competition) continue;
    const home = row(result.home);
    const away = row(result.away);
    const hs = Number(result.homeScore);
    const as = Number(result.awayScore);
    if (!home || !away || !Number.isInteger(hs) || !Number.isInteger(as)) continue;

    home.pj++; away.pj++;
    home.pf += hs; home.pc += as;
    away.pf += as; away.pc += hs;

    if (hs > as) { home.pg++; away.pp++; home.pts += 4; }
    else if (hs < as) { away.pg++; home.pp++; away.pts += 4; }
    else { home.pe++; away.pe++; home.pts += 2; away.pts += 2; }

    const bonus = teamKey(result.bonusTeam || "");
    if (bonus && bonus === teamKey(home.team)) { home.bonus++; home.pts++; }
    if (bonus && bonus === teamKey(away.team)) { away.bonus++; away.pts++; }
  }

  return [...rows.values()]
    .map((r) => ({ ...r, diff: r.baseDiff + (r.pf - r.pc) }))
    .sort((a, b) =>
      b.pts - a.pts ||
      b.diff - a.diff ||
      b.pf - a.pf ||
      a.team.localeCompare(b.team, "es"))
    .map((r, index) => ({
      position: index + 1,
      team: r.team,
      pj: r.pj, pg: r.pg, pe: r.pe, pp: r.pp,
      pf: r.pf, pc: r.pc,
      diff: r.diff,
      bonus: r.bonus,
      pts: r.pts
    }));
}

/** Recalcula las tablas de todas las divisiones dentro del contenido. */
export function recalcTables(content) {
  const divisions = getDivisions(content);
  for (const key of DIVISION_KEYS) {
    content[divisions[key].tableKey] = computeTable(content, key);
  }
  return content;
}

/**
 * Guarda la temporada actual en content.seasons y deja todo en 0:
 * tablas base en cero, sin resultados ni partidos de la URBA.
 * Los partidos y resultados de otras competiciones no se tocan.
 */
export function resetSeason(content, { archiveAs, newSeason } = {}) {
  const divisions = getDivisions(content);
  const isUrba = (item) => isUrbaCompetition(item?.competition);
  const label = String(archiveAs || content.season || SEASON - 1);

  content.seasons = content.seasons && typeof content.seasons === "object" ? content.seasons : {};
  const archive = {
    archivedAt: new Date().toISOString(),
    divisions,
    results: (content.results || []).filter(isUrba),
    fixtures: (content.fixtures || []).filter(isUrba)
  };
  for (const key of URBA_DIVISION_KEYS) {
    const d = divisions[key];
    archive[d.baseKey] = Array.isArray(content[d.baseKey]) ? content[d.baseKey] : [];
    archive[d.tableKey] = Array.isArray(content[d.tableKey]) ? content[d.tableKey] : [];
  }
  // Si ya había un archivo con ese nombre, se guarda aparte para no pisarlo.
  const slot = content.seasons[label] ? `${label}-${Date.now()}` : label;
  content.seasons[slot] = archive;

  content.results = (content.results || []).filter((item) => !isUrba(item));
  content.fixtures = (content.fixtures || []).filter((item) => !isUrba(item));
  for (const key of URBA_DIVISION_KEYS) {
    content[divisions[key].baseKey] = zeroBase(divisions[key].clubs);
  }
  content.season = Number(newSeason) || SEASON;
  content.seasonStartedAt = new Date().toISOString();
  recalcTables(content);
  return slot;
}

/**
 * Cambio de temporada automático (una sola vez): si el contenido todavía
 * es de una temporada anterior, archiva la 2026 y arranca la 2027 en cero.
 * Devuelve true si cambió algo (hay que guardar).
 */
export function migrateSeason(content) {
  if (!content || typeof content !== "object") return false;
  if (Number(content.season) >= SEASON) return false;
  resetSeason(content, { archiveAs: String(SEASON - 1), newSeason: SEASON });
  return true;
}

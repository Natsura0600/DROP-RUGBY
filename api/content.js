import fs from 'node:fs/promises';
import path from 'node:path';
import { r2GetJSON, r2PutJSONSafe } from '../lib/r2.js';
import { DEFAULT_DIVISIONS, SEASON, getDivisions, migrateSeason, recalcTables, zeroBase, computeTable } from '../lib/urba.js';
import { syncUrba, urbaSyncDue } from '../lib/urba-sync.js';

const BLOB_PATH = 'droprugby/content.json';

// Tabla base por defecto: Top 14 vigente en cero (misma regla que api/admin.js).
const DEFAULT_STANDINGS_BASE = zeroBase(DEFAULT_DIVISIONS.top14.clubs);

async function seed() {
  const articlesPath = path.join(process.cwd(), 'data', 'articles.json');
  const fixturesPath = path.join(process.cwd(), 'data', 'fixtures.json');
  const teamsPath = path.join(process.cwd(), 'data', 'teams.json');

  const [articlesFile, fixturesFile, teamsFile] = await Promise.all([
    fs.readFile(articlesPath, 'utf8'),
    fs.readFile(fixturesPath, 'utf8'),
    fs.readFile(teamsPath, 'utf8')
  ]);

  const data = {
    articles: JSON.parse(articlesFile),
    fixtures: JSON.parse(fixturesFile),
    teams: JSON.parse(teamsFile),
    results: [],
    standingsBase: DEFAULT_STANDINGS_BASE,
    standingsBaseA: zeroBase(DEFAULT_DIVISIONS.primeraA.clubs),
    standingsBaseSRA: zeroBase(DEFAULT_DIVISIONS.sra.clubs),
    season: SEASON
  };
  recalcTables(data);

  await r2PutJSONSafe(BLOB_PATH, data);

  return data;
}

async function readLocalData() {
  const articlesPath = path.join(process.cwd(), 'data', 'articles.json');
  const fixturesPath = path.join(process.cwd(), 'data', 'fixtures.json');
  const teamsPath = path.join(process.cwd(), 'data', 'teams.json');

  const [articlesFile, fixturesFile, teamsFile] = await Promise.all([
    fs.readFile(articlesPath, 'utf8'),
    fs.readFile(fixturesPath, 'utf8'),
    fs.readFile(teamsPath, 'utf8')
  ]);

  return {
    articles: JSON.parse(articlesFile),
    fixtures: JSON.parse(fixturesFile),
    teams: JSON.parse(teamsFile)
  };
}

function hasDeletedHistory(content, type) {
  return Array.isArray(content?.history) && content.history.some((item) =>
    String(item?.type || '') === type &&
    /delete|remove/i.test(String(item?.action || ''))
  );
}

async function repairBlobData(data) {
  const local = await readLocalData();
  const repaired = { ...data };
  let changed = false;

  if (
    Array.isArray(local.articles) &&
    local.articles.length > 0 &&
    Array.isArray(data.articles) &&
    data.articles.length === 0 &&
    !hasDeletedHistory(data, 'article')
  ) {
    repaired.articles = local.articles;
    changed = true;
  }

  if (
    Array.isArray(local.fixtures) &&
    local.fixtures.length > 0 &&
    Array.isArray(data.fixtures) &&
    data.fixtures.length === 0 &&
    !data.season &&
    !hasDeletedHistory(data, 'fixture')
  ) {
    repaired.fixtures = local.fixtures;
    changed = true;
  }

  return { repaired, changed };
}

async function readData() {
  const data = await r2GetJSON(BLOB_PATH);

  if (!data) {
    return await seed();
  }

  const { repaired, changed } = await repairBlobData(data);

  // Cambio de temporada: archiva la anterior y arranca en cero (una sola vez).
  const seasonChanged = migrateSeason(repaired);

  // Tabla oficial de la URBA: se consulta cada 3 horas como mucho, con tope de 8 s
  // para no demorar la página. Si la URBA no responde, queda la última tabla guardada.
  let synced = false;
  if (urbaSyncDue(repaired)) {
    try {
      await Promise.race([
        syncUrba(repaired),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
      ]);
      synced = true;
    } catch (error) {
      console.error('URBA sync:', error?.message || error);
    }
  }

  if (changed || seasonChanged || synced) {
    await r2PutJSONSafe(BLOB_PATH, repaired);
  }

  return repaired;
}

// ============================================================
// VISTA PÚBLICA
//
// content.json también guarda datos internos (suscriptores del
// newsletter, historial, papelera, borradores). Este endpoint es
// público, así que devolvemos SOLO lo que la web necesita.
// ============================================================

async function readSeedQuiz() {
  try {
    const file = await fs.readFile(
      path.join(process.cwd(), 'data', 'quiz.json'),
      'utf8'
    );
    return JSON.parse(file);
  } catch (_) {
    return null;
  }
}

async function toPublic(data) {
  const now = Date.now();

  const articles = (Array.isArray(data.articles) ? data.articles : []).filter(
    (article) => {
      if (!article || article.published === false) return false;

      // Programadas a futuro: todavía no se muestran.
      if (article.scheduled) {
        const at = new Date(article.publishAt || 0).getTime();
        if (!at || at > now) return false;
      }

      return true;
    }
  ).map((article) =>
    article.scheduled ? { ...article, scheduled: false } : article
  );

  // Quiz: el que se guardó desde el panel; si nunca se guardó uno,
  // usamos el de data/quiz.json.
  let quiz = data.quiz === undefined ? await readSeedQuiz() : data.quiz;
  if (!quiz || quiz.active === false) quiz = null;

  return {
    articles,
    fixtures: Array.isArray(data.fixtures) ? data.fixtures : [],
    results: Array.isArray(data.results) ? data.results : [],
    standings: Array.isArray(data.standings) ? data.standings : [],
    standingsA: Array.isArray(data.standingsA) ? data.standingsA : [],
    standingsSRA: Array.isArray(data.standingsSRA) && data.standingsSRA.length ? data.standingsSRA : computeTable(data, 'sra'),
    urbaLogos: data.urbaSync?.logos && typeof data.urbaSync.logos === 'object' ? data.urbaSync.logos : {},
    urbaSync: data.urbaSync
      ? {
          enabled: data.urbaSync.enabled !== false,
          published: !!data.urbaSync.published,
          lastRun: data.urbaSync.lastRun || '',
          official: Object.fromEntries(
            Object.entries(data.urbaSync.tables || {}).map(([key, t]) => [key, { lastRound: t.lastRound || null }])
          )
        }
      : null,
    season: Number(data.season) || SEASON,
    divisions: Object.fromEntries(
      Object.entries(getDivisions(data)).map(([key, d]) => [key, { name: d.name, competition: d.competition, clubs: d.clubs }])
    ),
    teams: data.teams && typeof data.teams === 'object' ? data.teams : {},
    settings: {
      clubLogos: data.settings?.clubLogos || {},
      nationLogos: data.settings?.nationLogos || {}
    },
    players: Array.isArray(data.players) ? data.players : [],
    games: data.games && typeof data.games === 'object' ? data.games : null,
    quiz
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Método no permitido'
      });
    }

    const data = await toPublic(await readData());

    // Evita que /api/content quede cacheado por Vercel
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );

    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).json(data);

  } catch (error) {
    console.error('ERROR /api/content:', error);

    return res.status(500).json({
      error: 'No se pudo cargar el contenido.',
      detail: error instanceof Error
        ? error.message
        : String(error)
    });
  }
}
 
 

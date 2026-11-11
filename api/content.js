import fs from 'node:fs/promises';
import path from 'node:path';
import { r2GetJSON, r2PutJSONSafe } from '../lib/r2.js';

const BLOB_PATH = 'droprugby/content.json';

// Tabla base de URBA TOP 14 al 10/08 — misma tabla que api/admin.js.
const DEFAULT_STANDINGS_BASE = [
  { team: "Newman", pj: 17, pg: 16, pe: 0, pp: 1, diff: 255, pts: 71 },
  { team: "CASI", pj: 17, pg: 13, pe: 0, pp: 4, diff: 179, pts: 60 },
  { team: "Hindu", pj: 17, pg: 12, pe: 0, pp: 5, diff: 160, pts: 57 },
  { team: "Alumni", pj: 17, pg: 11, pe: 0, pp: 6, diff: 220, pts: 56 },
  { team: "SIC", pj: 17, pg: 11, pe: 0, pp: 6, diff: 127, pts: 51 },
  { team: "Regatas Bella Vista", pj: 17, pg: 9, pe: 0, pp: 8, diff: 63, pts: 45 },
  { team: "Los Tilos", pj: 17, pg: 9, pe: 1, pp: 7, diff: -48, pts: 42 },
  { team: "Belgrano Athletic", pj: 17, pg: 8, pe: 1, pp: 8, diff: -15, pts: 41 },
  { team: "CUBA", pj: 17, pg: 6, pe: 0, pp: 11, diff: 9, pts: 35 },
  { team: "Atletico del Rosario", pj: 17, pg: 6, pe: 0, pp: 11, diff: -96, pts: 29 },
  { team: "Los Matreros", pj: 17, pg: 6, pe: 0, pp: 11, diff: -246, pts: 27 },
  { team: "La Plata", pj: 17, pg: 4, pe: 0, pp: 13, diff: -92, pts: 25 },
  { team: "Buenos Aires C&RC", pj: 17, pg: 4, pe: 0, pp: 13, diff: -210, pts: 19 },
  { team: "Champagnat", pj: 17, pg: 3, pe: 0, pp: 14, diff: -306, pts: 14 }
];

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
    standings: DEFAULT_STANDINGS_BASE.map((row, i) => ({
      position: i + 1,
      team: row.team,
      pj: row.pj,
      pg: row.pg,
      pe: row.pe,
      pp: row.pp,
      diff: row.diff,
      pts: row.pts
    }))
  };

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

  if (changed) {
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
    teams: data.teams && typeof data.teams === 'object' ? data.teams : {},
    settings: {
      clubLogos: data.settings?.clubLogos || {},
      nationLogos: data.settings?.nationLogos || {}
    },
    players: Array.isArray(data.players) ? data.players : [],
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
 
 

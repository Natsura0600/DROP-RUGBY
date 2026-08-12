import { r2GetJSON, r2PutJSONSafe } from '../lib/r2.js';

const PATH = 'droprugby/analytics.json';

function json(res, status, data) {
  res.status(status).json(data);
}

async function read() {
  return (await r2GetJSON(PATH)) || { articles: {} };
}

function ensure(db, id) {
  if (!db.articles[id]) {
    db.articles[id] = {
      views: 0,
      shares: 0,
      readingSeconds: 0,
      readingSamples: 0,
      polls: {},
      daily: {}
    };
  }
  return db.articles[id];
}

function day() {
  return new Date().toISOString().slice(0, 10);
}

function stats(a) {
  return {
    ...a,
    avgReading: a.readingSamples
      ? Math.round(a.readingSeconds / a.readingSamples)
      : 0
  };
}

export default async function handler(req, res) {
  try {
    const db = await read();

    if (req.method === 'GET') {
      const id = String(req.query?.articleId || '');
      if (!id) return json(res, 400, { ok: false, error: 'Falta articleId' });

      const a = ensure(db, id);
      const out = stats(a);

      if (req.query?.pollIndex != null) {
        out.pollResults = a.polls?.[String(req.query.pollIndex)] || {};
      }

      return json(res, 200, { ok: true, stats: out });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Método no permitido' });
    }

    const body = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body || {};

    const id = String(body.articleId || '');
    if (!id) return json(res, 400, { ok: false, error: 'Falta articleId' });

    const a = ensure(db, id);
    const action = body.action;

    if (action === 'view') {
      a.views++;
      const d = day();
      a.daily[d] = a.daily[d] || { views: 0, shares: 0 };
      a.daily[d].views++;
    } else if (action === 'share') {
      a.shares++;
      const d = day();
      a.daily[d] = a.daily[d] || { views: 0, shares: 0 };
      a.daily[d].shares++;
    } else if (action === 'reading') {
      const sec = Math.max(0, Math.min(3600, Number(body.seconds) || 0));
      if (sec) {
        a.readingSeconds += sec;
        a.readingSamples++;
      }
    } else if (action === 'poll') {
      const pi = String(Number(body.pollIndex));
      const oi = String(Number(body.option));
      if (!a.polls[pi]) a.polls[pi] = {};
      a.polls[pi][oi] = (a.polls[pi][oi] || 0) + 1;
    } else {
      return json(res, 400, { ok: false, error: 'Acción inválida' });
    }

    await r2PutJSONSafe(PATH, db);
    return json(res, 200, { ok: true, stats: stats(a) });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e.message || 'Error de analytics'
    });
  }
}
 

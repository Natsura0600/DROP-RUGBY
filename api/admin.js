import { list, put } from '@vercel/blob';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const BLOB_PATH = 'droprugby/content.json';
const COOKIE = 'droprugby_session';
const MAX_AGE = 60 * 60 * 24 * 7;

/* =========================================================
   CONFIGURACIÓN
========================================================= */

function secret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'change-this-secret-in-vercel'
  );
}

/* =========================================================
   SESIONES
========================================================= */

function sign(value) {
  return crypto
    .createHmac('sha256', secret())
    .update(value)
    .digest('hex');
}

function makeToken() {
  const value = `${Date.now()}.${crypto.randomBytes(16).toString('hex')}`;
  return `${value}.${sign(value)}`;
}

function getCookie(req) {
  const raw = req.headers.cookie || '';

  const match = raw.match(
    new RegExp(`${COOKIE}=([^;]+)`)
  );

  if (!match) return null;

  return decodeURIComponent(match[1]);
}

function validToken(req) {
  try {
    const token = getCookie(req);

    if (!token) return false;

    const parts = token.split('.');

    if (parts.length < 3) {
      return false;
    }

    const value = parts.slice(0, 2).join('.');
    const timestamp = Number(parts[0]);

    if (!Number.isFinite(timestamp)) {
      return false;
    }

    if (Date.now() - timestamp > MAX_AGE * 1000) {
      return false;
    }

    const expected = sign(value);

    const providedBuffer = Buffer.from(parts[2]);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      providedBuffer,
      expectedBuffer
    );
  } catch (error) {
    console.error('[session] Error validando sesión:', error);
    return false;
  }
}

function setCookie(res, value, maxAge = MAX_AGE) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
  );
}

/* =========================================================
   DATOS
========================================================= */

function normalizeData(data) {
  return {
    articles: Array.isArray(data?.articles)
      ? data.articles
      : [],

    fixtures: Array.isArray(data?.fixtures)
      ? data.fixtures
      : [],

    results: Array.isArray(data?.results)
      ? data.results
      : []
  };
}

async function readData() {
  try {
    const result = await list({
      prefix: BLOB_PATH,
      limit: 1
    });

    if (result.blobs.length) {
      const blob = result.blobs[0];

      const response = await fetch(blob.url, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(
          `No se pudo leer content.json (${response.status})`
        );
      }

      const data = await response.json();

      return normalizeData(data);
    }
  } catch (error) {
    console.error(
      '[readData] Error leyendo Blob:',
      error
    );
  }

  /*
   * Si todavía no existe el Blob, usamos los JSON
   * iniciales del proyecto.
   */

  let articles = [];
  let fixtures = [];

  try {
    const articlesFile = await fs.readFile(
      path.join(
        process.cwd(),
        'data',
        'articles.json'
      ),
      'utf8'
    );

    articles = JSON.parse(articlesFile);
  } catch (error) {
    console.log(
      '[readData] No existe data/articles.json'
    );
  }

  try {
    const fixturesFile = await fs.readFile(
      path.join(
        process.cwd(),
        'data',
        'fixtures.json'
      ),
      'utf8'
    );

    fixtures = JSON.parse(fixturesFile);
  } catch (error) {
    console.log(
      '[readData] No existe data/fixtures.json'
    );
  }

  return {
    articles: Array.isArray(articles)
      ? articles
      : [],

    fixtures: Array.isArray(fixtures)
      ? fixtures
      : [],

    results: []
  };
}

async function saveData(data) {
  const normalized = normalizeData(data);

  await put(
    BLOB_PATH,
    JSON.stringify(normalized),
    {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 0
    }
  );

  return normalized;
}

/* =========================================================
   LOGIN
========================================================= */

async function login(body, res) {
  const user =
    process.env.ADMIN_USER || 'admin';

  const password =
    process.env.ADMIN_PASSWORD;

  if (!password) {
    return res.status(500).json({
      error:
        'Falta configurar ADMIN_PASSWORD en Vercel.'
    });
  }

  if (
    body.username !== user ||
    body.password !== password
  ) {
    return res.status(401).json({
      error:
        'Usuario o contraseña incorrectos.'
    });
  }

  const token = makeToken();

  setCookie(res, token);

  return res.status(200).json({
    ok: true
  });
}

/* =========================================================
   HANDLER
========================================================= */

export default async function handler(req, res) {
  try {
    /*
     * =====================================================
     * GET
     *
     * El panel utiliza GET /api/admin para comprobar
     * la sesión y cargar el contenido.
     * =====================================================
     */

    if (req.method === 'GET') {
      if (!validToken(req)) {
        return res.status(401).json({
          error: 'Sesión no válida o expirada.'
        });
      }

      const data = await readData();

      return res.status(200).json({
        ok: true,
        ...data
      });
    }

    /*
     * =====================================================
     * POST
     * =====================================================
     */

    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Método no permitido.'
      });
    }

    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body || {};

    /* =====================================================
       LOGIN
    ===================================================== */

    if (body.action === 'login') {
      return await login(body, res);
    }

    /* =====================================================
       LOGOUT
    ===================================================== */

    if (body.action === 'logout') {
      setCookie(res, '', 0);

      return res.status(200).json({
        ok: true
      });
    }

    /* =====================================================
       SESSION
    ===================================================== */

    if (body.action === 'session') {
      if (!validToken(req)) {
        return res.status(401).json({
          error: 'Sesión no válida.'
        });
      }

      return res.status(200).json({
        ok: true
      });
    }

    /* =====================================================
       CUALQUIER OTRA ACCIÓN REQUIERE SESIÓN
    ===================================================== */

    if (!validToken(req)) {
      return res.status(401).json({
        error:
          'Sesión no válida o expirada.'
      });
    }

    /* =====================================================
       LOAD
    ===================================================== */

    if (body.action === 'load') {
      const data = await readData();

      return res.status(200).json({
        ok: true,
        ...data
      });
    }

    /* =====================================================
       SAVE
    ===================================================== */

    if (body.action === 'save') {
      const articles =
        Array.isArray(body.articles)
          ? body.articles
          : null;

      const fixtures =
        Array.isArray(body.fixtures)
          ? body.fixtures
          : null;

      const results =
        Array.isArray(body.results)
          ? body.results
          : [];

      if (!articles || !fixtures) {
        return res.status(400).json({
          error: 'Datos inválidos.'
        });
      }

      const data = {
        articles,
        fixtures,
        results
      };

      await saveData(data);

      return res.status(200).json({
        ok: true,
        articles: articles.length,
        fixtures: fixtures.length,
        results: results.length
      });
    }

    /* =====================================================
       SAVE ARTICLES
    ===================================================== */

    if (body.action === 'saveArticles') {
      if (!Array.isArray(body.articles)) {
        return res.status(400).json({
          error: 'articles debe ser un array.'
        });
      }

      const current = await readData();

      const data = {
        articles: body.articles,
        fixtures: current.fixtures,
        results: current.results
      };

      await saveData(data);

      return res.status(200).json({
        ok: true,
        articles: data.articles.length
      });
    }

    /* =====================================================
       SAVE FIXTURES
    ===================================================== */

    if (body.action === 'saveFixtures') {
      if (!Array.isArray(body.fixtures)) {
        return res.status(400).json({
          error: 'fixtures debe ser un array.'
        });
      }

      const current = await readData();

      const data = {
        articles: current.articles,
        fixtures: body.fixtures,
        results: current.results
      };

      await saveData(data);

      return res.status(200).json({
        ok: true,
        fixtures: data.fixtures.length
      });
    }

    /* =====================================================
       SAVE RESULTS
    ===================================================== */

    if (body.action === 'saveResults') {
      if (!Array.isArray(body.results)) {
        return res.status(400).json({
          error: 'results debe ser un array.'
        });
      }

      const current = await readData();

      const data = {
        articles: current.articles,
        fixtures: current.fixtures,
        results: body.results
      };

      await saveData(data);

      return res.status(200).json({
        ok: true,
        results: data.results.length
      });
    }

    /* =====================================================
       ACCIÓN DESCONOCIDA
    ===================================================== */

    return res.status(400).json({
      error: 'Acción desconocida.'
    });

  } catch (error) {
    console.error(
      '[api/admin] ERROR:',
      error
    );

    return res.status(500).json({
      error: 'Error interno del servidor.',
      detail:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
    });
  }
}

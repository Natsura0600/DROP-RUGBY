import { list, put } from '@vercel/blob';
import crypto from 'node:crypto';

const BLOB_PATH = 'droprugby/content.json';

const COOKIE = 'droprugby_session';

const MAX_AGE = 60 * 60 * 24 * 7; // 7 días


/* =========================================================
   CONFIGURACIÓN
========================================================= */

function getSecret() {

  const secret =
    process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      'Falta configurar ADMIN_SESSION_SECRET en Vercel.'
    );
  }

  return secret;
}


function getAdminUsername() {

  return (
    process.env.ADMIN_USERNAME ||
    process.env.ADMIN_USER ||
    'admin'
  );

}


function getAdminPassword() {

  return (
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASS ||
    ''
  );

}


/* =========================================================
   COOKIES
========================================================= */

function parseCookies(request) {

  const header =
    request.headers.get('cookie') || '';

  const cookies = {};

  header
    .split(';')
    .forEach(part => {

      const index =
        part.indexOf('=');

      if (index === -1) return;

      const key =
        part.slice(0, index).trim();

      const value =
        part.slice(index + 1).trim();

      cookies[key] =
        decodeURIComponent(value);

    });

  return cookies;

}


/* =========================================================
   SESIONES
========================================================= */

function createSession() {

  const timestamp =
    Math.floor(
      Date.now() / 1000
    );

  const random =
    crypto
      .randomBytes(32)
      .toString('hex');

  const payload =
    `${timestamp}.${random}`;

  const signature =
    crypto
      .createHmac(
        'sha256',
        getSecret()
      )
      .update(payload)
      .digest('hex');

  return `${payload}.${signature}`;

}


function verifySession(token) {

  if (!token) {
    return false;
  }

  const parts =
    token.split('.');

  if (parts.length !== 3) {
    return false;
  }

  const [
    timestamp,
    random,
    signature
  ] = parts;

  const payload =
    `${timestamp}.${random}`;

  const expected =
    crypto
      .createHmac(
        'sha256',
        getSecret()
      )
      .update(payload)
      .digest('hex');


  if (
    signature.length !==
    expected.length
  ) {
    return false;
  }


  let validSignature = false;

  try {

    validSignature =
      crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );

  } catch {

    return false;

  }


  if (!validSignature) {
    return false;
  }


  const created =
    Number(timestamp);


  if (!Number.isFinite(created)) {
    return false;
  }


  const now =
    Math.floor(
      Date.now() / 1000
    );


  if (
    now - created >
    MAX_AGE
  ) {
    return false;
  }


  if (
    created > now + 60
  ) {
    return false;
  }


  return true;

}


function sessionCookie(token) {

  const secure =
    process.env.NODE_ENV === 'production'
      ? '; Secure'
      : '';

  return [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
    secure
  ]
    .filter(Boolean)
    .join('; ');

}


function deleteSessionCookie() {

  const secure =
    process.env.NODE_ENV === 'production'
      ? '; Secure'
      : '';

  return [
    `${COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
    secure
  ]
    .filter(Boolean)
    .join('; ');

}


function isAuthenticated(request) {

  const cookies =
    parseCookies(request);

  return verifySession(
    cookies[COOKIE]
  );

}


/* =========================================================
   RESPUESTAS
========================================================= */

function json(
  data,
  status = 200,
  extraHeaders = {}
) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type':
          'application/json; charset=utf-8',

        'Cache-Control':
          'no-store',

        ...extraHeaders
      }
    }
  );

}


function error(
  message,
  status = 400
) {

  return json(
    {
      error: message
    },
    status
  );

}


/* =========================================================
   OBTENER CONTENT.JSON
========================================================= */

async function getContentBlob() {

  const result =
    await list({
      prefix: BLOB_PATH
    });


  const blobs =
    result.blobs || [];


  /*
   * Buscamos exactamente content.json.
   */

  const blob =
    blobs.find(
      item =>
        item.pathname ===
        BLOB_PATH
    );


  return blob || null;

}


async function readContent() {

  const blob =
    await getContentBlob();


  /*
   * Si todavía no existe el archivo,
   * creamos una estructura inicial.
   */

  if (!blob) {

    return {

      articles: [],

      fixtures: [],

      trash: [],

      history: [],

      standings: [],

      players: []

    };

  }


  const response =
    await fetch(
      blob.url,
      {
        cache: 'no-store'
      }
    );


  if (!response.ok) {

    throw new Error(
      'No se pudo leer content.json desde Vercel Blob.'
    );

  }


  const text =
    await response.text();


  if (!text.trim()) {

    return {

      articles: [],

      fixtures: [],

      trash: [],

      history: [],

      standings: [],

      players: []

    };

  }


  try {

    const content =
      JSON.parse(text);


    return {

      ...content,

      articles:
        Array.isArray(content.articles)
          ? content.articles
          : [],

      fixtures:
        Array.isArray(content.fixtures)
          ? content.fixtures
          : [],

      trash:
        Array.isArray(content.trash)
          ? content.trash
          : [],

      history:
        Array.isArray(content.history)
          ? content.history
          : [],

      standings:
        Array.isArray(content.standings)
          ? content.standings
          : [],

      players:
        Array.isArray(content.players)
          ? content.players
          : []

    };

  } catch {

    throw new Error(
      'content.json no contiene JSON válido.'
    );

  }

}


/* =========================================================
   GUARDAR CONTENT.JSON
========================================================= */

async function saveContent(content) {

  const cleanContent = {

    ...content,

    articles:
      Array.isArray(content.articles)
        ? content.articles
        : [],

    fixtures:
      Array.isArray(content.fixtures)
        ? content.fixtures
        : [],

    trash:
      Array.isArray(content.trash)
        ? content.trash
        : [],

    history:
      Array.isArray(content.history)
        ? content.history
        : [],

    standings:
      Array.isArray(content.standings)
        ? content.standings
        : [],

    players:
      Array.isArray(content.players)
        ? content.players
        : []

  };


  const result =
    await put(
      BLOB_PATH,

      JSON.stringify(
        cleanContent,
        null,
        2
      ),

      {
        access: 'public',

        addRandomSuffix: false,

        allowOverwrite: true,

        contentType:
          'application/json; charset=utf-8'
      }
    );


  return result;

}


/* =========================================================
   VALIDACIÓN
========================================================= */

function validateArray(
  value,
  name
) {

  if (
    value !== undefined &&
    !Array.isArray(value)
  ) {

    throw new Error(
      `${name} debe ser un array.`
    );

  }

}


/* =========================================================
   NORMALIZAR NOTICIAS
========================================================= */

function normalizeArticles(
  articles
) {

  return articles.map(
    article => {

      if (
        !article ||
        typeof article !== 'object'
      ) {
        return null;
      }


      return {

        ...article,

        id:
          String(
            article.id ||
            crypto
              .randomBytes(8)
              .toString('hex')
          ),

        title:
          String(
            article.title || ''
          ).trim(),

        category:
          String(
            article.category ||
            'Actualidad'
          ).trim(),

        subcategory:
          String(
            article.subcategory ||
            ''
          ).trim(),

        author:
          String(
            article.author ||
            'DropRugby'
          ).trim(),

        date:
          String(
            article.date ||
            ''
          ).trim(),

        time:
          String(
            article.time ||
            ''
          ).trim(),

        excerpt:
          String(
            article.excerpt ||
            ''
          ).trim(),

        content:
          String(
            article.content ||
            ''
          ),

        featured:
          Boolean(
            article.featured
          ),

        breaking:
          Boolean(
            article.breaking
          ),

        scheduled:
          Boolean(
            article.scheduled
          )

      };

    }
  ).filter(Boolean);

}


/* =========================================================
   NORMALIZAR PARTIDOS
========================================================= */

function normalizeFixtures(
  fixtures
) {

  return fixtures.map(
    fixture => {

      if (
        !fixture ||
        typeof fixture !== 'object'
      ) {
        return null;
      }


      return {

        ...fixture,

        date:
          String(
            fixture.date || ''
          ).trim(),

        competition:
          String(
            fixture.competition ||
            ''
          ).trim(),

        time:
          String(
            fixture.time || ''
          ).trim(),

        home:
          String(
            fixture.home || ''
          ).trim(),

        away:
          String(
            fixture.away || ''
          ).trim(),

        channel:
          String(
            fixture.channel || ''
          ).trim(),

        venue:
          String(
            fixture.venue || ''
          ).trim()

      };

    }
  ).filter(Boolean);

}


/* =========================================================
   NORMALIZAR POSICIONES
========================================================= */

function normalizeStandings(
  standings
) {

  return standings.map(
    team => {

      if (
        !team ||
        typeof team !== 'object'
      ) {
        return null;
      }


      return {

        ...team,

        team:
          String(
            team.team || ''
          ).trim(),

        pj:
          Number(team.pj) || 0,

        pg:
          Number(team.pg) || 0,

        pts:
          Number(team.pts) || 0

      };

    }
  ).filter(Boolean);

}


/* =========================================================
   NORMALIZAR JUGADORES
========================================================= */

function normalizePlayers(
  players
) {

  return players.map(
    player => {

      if (
        !player ||
        typeof player !== 'object'
      ) {
        return null;
      }


      return {

        ...player,

        name:
          String(
            player.name || ''
          ).trim(),

        club:
          String(
            player.club || ''
          ).trim(),

        points:
          Number(
            player.points
          ) || 0,

        tries:
          Number(
            player.tries
          ) || 0

      };

    }
  ).filter(Boolean);

}


/* =========================================================
   ACTION: LOGIN
========================================================= */

async function handleLogin(
  request,
  body
) {

  const username =
    String(
      body.username || ''
    );

  const password =
    String(
      body.password || ''
    );


  const expectedUsername =
    getAdminUsername();

  const expectedPassword =
    getAdminPassword();


  if (!expectedPassword) {

    return error(
      'ADMIN_PASSWORD no está configurado en Vercel.',
      500
    );

  }


  const validUsername =
    username ===
    expectedUsername;


  const validPassword =
    password ===
    expectedPassword;


  if (
    !validUsername ||
    !validPassword
  ) {

    return error(
      'Usuario o contraseña incorrectos.',
      401
    );

  }


  const session =
    createSession();


  return json(
    {
      ok: true,
      authenticated: true
    },
    200,
    {
      'Set-Cookie':
        sessionCookie(session)
    }
  );

}


/* =========================================================
   ACTION: SESSION
========================================================= */

async function handleSession(
  request
) {

  const authenticated =
    isAuthenticated(
      request
    );


  if (!authenticated) {

    return error(
      'No autenticado.',
      401
    );

  }


  return json({
    ok: true,
    authenticated: true
  });

}


/* =========================================================
   ACTION: LOGOUT
========================================================= */

async function handleLogout() {

  return json(
    {
      ok: true
    },
    200,
    {
      'Set-Cookie':
        deleteSessionCookie()
    }
  );

}


/* =========================================================
   ACTION: SAVE
========================================================= */

async function handleSave(
  request,
  body
) {

  if (
    !isAuthenticated(
      request
    )
  ) {

    return error(
      'Sesión expirada. Volvé a iniciar sesión.',
      401
    );

  }


  /*
   * Leemos el contenido actual primero.
   *
   * Esto es MUY importante porque evita
   * borrar campos que ya existen en
   * content.json y que el nuevo panel
   * todavía no conoce.
   */

  const current =
    await readContent();


  /*
   * Solo actualizamos los campos que
   * realmente llegaron desde admin.html.
   */

  const next = {
    ...current
  };


  if (
    body.articles !== undefined
  ) {

    validateArray(
      body.articles,
      'articles'
    );


    next.articles =
      normalizeArticles(
        body.articles
      );

  }


  if (
    body.fixtures !== undefined
  ) {

    validateArray(
      body.fixtures,
      'fixtures'
    );


    next.fixtures =
      normalizeFixtures(
        body.fixtures
      );

  }


  if (
    body.trash !== undefined
  ) {

    validateArray(
      body.trash,
      'trash'
    );


    next.trash =
      normalizeArticles(
        body.trash
      );

  }


  if (
    body.history !== undefined
  ) {

    validateArray(
      body.history,
      'history'
    );


    /*
     * No destruimos la información
     * adicional del historial.
     */

    next.history =
      body.history
        .filter(
          item =>
            item &&
            typeof item === 'object'
        )
        .slice(0, 500);

  }


  if (
    body.standings !== undefined
  ) {

    validateArray(
      body.standings,
      'standings'
    );


    next.standings =
      normalizeStandings(
        body.standings
      );

  }


  if (
    body.players !== undefined
  ) {

    validateArray(
      body.players,
      'players'
    );


    next.players =
      normalizePlayers(
        body.players
      );

  }


  /*
   * Guardamos también la fecha de actualización.
   */

  next.updatedAt =
    new Date().toISOString();


  const saved =
    await saveContent(
      next
    );


  return json({

    ok: true,

    saved: true,

    updatedAt:
      next.updatedAt,

    url:
      saved.url

  });

}


/* =========================================================
   HANDLER PRINCIPAL
========================================================= */

export default async function handler(
  request
) {

  /*
   * Solo aceptamos POST.
   */

  if (
    request.method !== 'POST'
  ) {

    return error(
      'Método no permitido.',
      405
    );

  }


  try {

    let body = {};


    try {

      body =
        await request.json();

    } catch {

      return error(
        'El cuerpo de la petición no es JSON válido.',
        400
      );

    }


    const action =
      String(
        body.action || ''
      ).trim();


    switch (action) {


      /* -----------------------------------------------
         LOGIN
      ------------------------------------------------ */

      case 'login':

        return await handleLogin(
          request,
          body
        );


      /* -----------------------------------------------
         SESSION
      ------------------------------------------------ */

      case 'session':

        return await handleSession(
          request
        );


      /* -----------------------------------------------
         LOGOUT
      ------------------------------------------------ */

      case 'logout':

        return await handleLogout();


      /* -----------------------------------------------
         SAVE
      ------------------------------------------------ */

      case 'save':

        return await handleSave(
          request,
          body
        );


      /* -----------------------------------------------
         ACCIÓN DESCONOCIDA
      ------------------------------------------------ */

      default:

        return error(
          `Acción desconocida: ${action || '(vacía)'}`,
          400
        );

    }

  } catch (err) {

    console.error(
      '❌ ERROR API ADMIN:',
      err
    );


    return error(
      err?.message ||
      'Error interno del servidor.',
      500
    );

  }

}

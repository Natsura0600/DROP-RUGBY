import { list, put } from '@vercel/blob';
import crypto from 'node:crypto';
import { Resend } from 'resend';

const BLOB_PATH = 'droprugby/content.json';
const COOKIE = 'droprugby_session';
const MAX_AGE = 60 * 60 * 24 * 7;

const resend = new Resend(
  process.env.RESEND_API_KEY
);

/* =========================================================
   CONFIGURACIÓN
========================================================= */

function secret() {
  return process.env.ADMIN_SESSION_SECRET;
}

function adminPassword() {
  return process.env.ADMIN_PASSWORD;
}

/* =========================================================
   SESIONES
========================================================= */

function createSession() {
  const timestamp = Date.now().toString();

  const signature = crypto
    .createHmac('sha256', secret())
    .update(timestamp)
    .digest('hex');

  return `${timestamp}.${signature}`;
}

function verifySession(token) {
  if (!token) return false;

  const parts = token.split('.');

  if (parts.length !== 2) {
    return false;
  }

  const [timestamp, signature] = parts;

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  if (
    Date.now() - timestampNumber >
    MAX_AGE * 1000
  ) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret())
    .update(timestamp)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

function getCookie(req, name) {
  const cookieHeader =
    req.headers.cookie || '';

  const cookies = cookieHeader
    .split(';')
    .map(cookie => cookie.trim());

  for (const cookie of cookies) {
    const index = cookie.indexOf('=');

    if (index === -1) {
      continue;
    }

    const key = cookie.slice(0, index);
    const value = cookie.slice(index + 1);

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

function setSessionCookie(res, session) {
  res.setHeader(
    'Set-Cookie',
    [
      `${COOKIE}=${encodeURIComponent(session)}`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${MAX_AGE}`
    ].join('; ')
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    [
      `${COOKIE}=`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      'Path=/',
      'Max-Age=0'
    ].join('; ')
  );
}

/* =========================================================
   VERCEL BLOB
========================================================= */

async function readData() {
  const result = await list({
    prefix: BLOB_PATH,
    limit: 100
  });

  const blob = result.blobs?.find(
    item => item.pathname === BLOB_PATH
  );

  if (!blob) {
    return {
      articles: [],
      fixtures: []
    };
  }

  const response = await fetch(blob.url);

  if (!response.ok) {
    throw new Error(
      `No se pudo leer ${BLOB_PATH}`
    );
  }

  const data = await response.json();

  return {
    articles: Array.isArray(data.articles)
      ? data.articles
      : [],

    fixtures: Array.isArray(data.fixtures)
      ? data.fixtures
      : []
  };
}

async function saveData(data) {
  await put(
    BLOB_PATH,
    JSON.stringify(data, null, 2),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true
    }
  );
}

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =========================================================
   IDENTIFICADOR DEL ARTÍCULO
========================================================= */

function getArticleIdentifier(article) {
  if (!article) {
    return null;
  }

  /*
   * Prioridad:
   *
   * 1. ID
   * 2. slug
   * 3. URL
   * 4. título
   */

  if (article.id) {
    return `id:${String(article.id)}`;
  }

  if (article.slug) {
    return `slug:${String(article.slug)}`;
  }

  if (article.url) {
    return `url:${String(article.url)}`;
  }

  if (article.title) {
    return `title:${String(article.title)
      .trim()
      .toLowerCase()}`;
  }

  return null;
}

/* =========================================================
   NEWSLETTER
========================================================= */

async function sendNewArticleNewsletter(article) {

  console.log(
    '========================================'
  );

  console.log(
    'NEWSLETTER: iniciando envío'
  );

  console.log(
    'NEWSLETTER: artículo:',
    article?.title
  );

  /* -------------------------------------------------------
     VARIABLES
  ------------------------------------------------------- */

  const segmentId =
    process.env.RESEND_SEGMENT_ID;

  if (!process.env.RESEND_API_KEY) {

    throw new Error(
      'Falta RESEND_API_KEY en Vercel.'
    );
  }

  if (!segmentId) {

    throw new Error(
      'Falta RESEND_SEGMENT_ID en Vercel.'
    );
  }

  if (!article) {

    throw new Error(
      'No se recibió la noticia.'
    );
  }

  console.log(
    'NEWSLETTER: segmento:',
    segmentId
  );

  /* -------------------------------------------------------
     DATOS
  ------------------------------------------------------- */

  const title =
    article.title ||
    'Nueva noticia de DropRugby';

  const excerpt =
    article.excerpt ||
    article.description ||
    '';

  const category =
    article.category ||
    'Rugby';

  const articleUrl =
    article.url ||
    article.slug ||
    '';

  const cleanUrl =
    String(articleUrl)
      .replace(/^\/+/, '');

  /*
   * Si existe URL/slug usamos eso.
   * Si no existe, vamos directamente
   * a la página principal para evitar
   * generar una URL rota.
   */

  const fullUrl =
    cleanUrl
      ? `https://www.droprugby.com/${cleanUrl}`
      : 'https://www.droprugby.com/';

  const safeTitle =
    escapeHtml(title);

  const safeExcerpt =
    escapeHtml(excerpt);

  const safeCategory =
    escapeHtml(category);

  console.log(
    'NEWSLETTER: URL:',
    fullUrl
  );

  /* -------------------------------------------------------
     CREAR Y ENVIAR BROADCAST
  ------------------------------------------------------- */

  const result =
    await resend.broadcasts.create({

      segmentId,

      from: 
        'DropRugby <newsletter@droprugby.com>',

      subject:
        `🏉 ${title}`,

      html: `
        <!DOCTYPE html>

        <html lang="es">

        <head>

          <meta charset="UTF-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >

          <title>
            ${safeTitle}
          </title>

        </head>

        <body style="
          margin:0;
          padding:0;
          background:#f4f4f2;
          font-family:Arial,Helvetica,sans-serif;
        ">

          <div style="
            max-width:600px;
            margin:40px auto;
            background:#ffffff;
            padding:40px;
          ">

            <div style="
              margin-bottom:35px;
            ">

              <h1 style="
                margin:0;
                font-size:32px;
                letter-spacing:-1px;
                color:#111;
              ">

                DROP<span style="
                  font-weight:400;
                ">RUGBY</span>

              </h1>

              <p style="
                margin:8px 0 0;
                color:#888;
                font-size:13px;
              ">

                Rugby es una pasión.

              </p>

            </div>

            <p style="
              font-size:12px;
              letter-spacing:2px;
              color:#777;
              margin:0 0 18px;
              text-transform:uppercase;
            ">

              DROPRUGBY · ${safeCategory}

            </p>

            <h2 style="
              font-size:32px;
              line-height:1.2;
              margin:0 0 20px;
              color:#111;
            ">

              ${safeTitle}

            </h2>

            ${
              safeExcerpt
                ? `
                  <p style="
                    font-size:16px;
                    line-height:1.7;
                    color:#444;
                    margin:0 0 25px;
                  ">

                    ${safeExcerpt}

                  </p>
                `
                : ''
            }

            <div style="
              margin:30px 0;
            ">

              <a
                href="${fullUrl}"
                style="
                  display:inline-block;
                  padding:14px 24px;
                  background:#111;
                  color:#fff;
                  text-decoration:none;
                  font-weight:bold;
                  font-size:14px;
                "
              >

                LEER LA NOTICIA →

              </a>

            </div>

            <hr style="
              border:none;
              border-top:1px solid #ddd;
              margin:35px 0;
            ">

            <p style="
              font-size:13px;
              line-height:1.6;
              color:#888;
              margin:0 0 10px;
            ">

              Recibís este email porque estás
              suscripto a la newsletter de
              DropRugby.

            </p>

            <p style="
              font-size:13px;
              color:#888;
              margin:0 0 20px;
            ">

              © 2026 DropRugby

            </p>

            <p style="
              font-size:12px;
              color:#999;
            ">

              {{{RESEND_UNSUBSCRIBE_URL}}}

            </p>

          </div>

        </body>

        </html>
      `,

      send: true
    });

  /* -------------------------------------------------------
     ERROR DE RESEND
  ------------------------------------------------------- */

  if (result.error) {

    console.error(
      '❌ RESEND BROADCAST ERROR:',
      result.error
    );

    throw new Error(
      result.error.message ||
      'Resend rechazó el Broadcast.'
    );
  }

  console.log(
    '✅ NEWSLETTER ENVIADO'
  );

  console.log(
    'Broadcast ID:',
    result.data?.id
  );

  console.log(
    '========================================'
  );

  return result.data;
}

/* =========================================================
   HANDLER
========================================================= */

export default async function handler(req, res) {

  if (req.method !== 'POST') {

    return res.status(405).json({
      error: 'Método no permitido.'
    });
  }

  try {

    /* =====================================================
       CONFIGURACIÓN
    ===================================================== */

    if (!secret()) {

      return res.status(500).json({
        error:
          'Falta configurar ADMIN_SESSION_SECRET.'
      });
    }

    /* =====================================================
       BODY
    ===================================================== */

    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body || {};

    /* =====================================================
       LOGIN
    ===================================================== */

    if (body.action === 'login') {

      const password =
        typeof body.password === 'string'
          ? body.password
          : '';

      if (!adminPassword()) {

        return res.status(500).json({
          error:
            'Falta configurar ADMIN_PASSWORD.'
        });
      }

      if (!password) {

        return res.status(400).json({
          error:
            'Ingresá la contraseña.'
        });
      }

      const passwordBuffer =
        Buffer.from(password);

      const expectedBuffer =
        Buffer.from(adminPassword());

      let passwordCorrect = false;

      if (
        passwordBuffer.length ===
        expectedBuffer.length
      ) {

        passwordCorrect =
          crypto.timingSafeEqual(
            passwordBuffer,
            expectedBuffer
          );
      }

      if (!passwordCorrect) {

        return res.status(401).json({
          error:
            'Contraseña incorrecta.'
        });
      }

      const session =
        createSession();

      setSessionCookie(
        res,
        session
      );

      return res.status(200).json({
        ok: true
      });
    }

    /* =====================================================
       LOGOUT
    ===================================================== */

    if (body.action === 'logout') {

      clearSessionCookie(res);

      return res.status(200).json({
        ok: true
      });
    }

    /* =====================================================
       CHECK
    ===================================================== */

    if (body.action === 'check') {

      const token =
        getCookie(
          req,
          COOKIE
        );

      return res.status(200).json({
        authenticated:
          verifySession(token)
      });
    }

    /* =====================================================
       AUTENTICACIÓN
    ===================================================== */

    const token =
      getCookie(
        req,
        COOKIE
      );

    if (!verifySession(token)) {

      return res.status(401).json({
        error:
          'No autorizado.'
      });
    }

    /* =====================================================
       LOAD
    ===================================================== */

    if (body.action === 'load') {

      const data =
        await readData();

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

      if (!articles || !fixtures) {

        return res.status(400).json({
          error:
            'Datos inválidos.'
        });
      }

      console.log(
        '========================================'
      );

      console.log(
        'ADMIN SAVE'
      );

      console.log(
        'Artículos recibidos:',
        articles.length
      );

      console.log(
        'Fixtures recibidos:',
        fixtures.length
      );

      /* ---------------------------------------------------
         LEER DATOS ANTERIORES
      --------------------------------------------------- */

      let previousData;

      try {

        previousData =
          await readData();

      } catch (error) {

        console.error(
          'ERROR LEYENDO DATOS ANTERIORES:',
          error
        );

        previousData = {
          articles: [],
          fixtures: []
        };
      }

      const previousArticles =
        Array.isArray(
          previousData?.articles
        )
          ? previousData.articles
          : [];

      console.log(
        'Artículos anteriores:',
        previousArticles.length
      );

      /* ---------------------------------------------------
         CREAR MAPA DE ARTÍCULOS ANTERIORES
      --------------------------------------------------- */

      const previousIdentifiers =
        new Set();

      for (
        const article
        of previousArticles
      ) {

        const identifier =
          getArticleIdentifier(article);

        if (identifier) {

          previousIdentifiers.add(
            identifier
          );
        }
      }

      /* ---------------------------------------------------
         DETECTAR NUEVOS
      --------------------------------------------------- */

      const newArticles =
        articles.filter(article => {

          const identifier =
            getArticleIdentifier(article);

          if (!identifier) {

            console.warn(
              'Artículo sin identificador:',
              article?.title
            );

            return false;
          }

          return !previousIdentifiers.has(
            identifier
          );
        });

      console.log(
        '========================================'
      );

      console.log(
        'ARTÍCULOS NUEVOS DETECTADOS:',
        newArticles.length
      );

      console.log(
        'NUEVAS NOTICIAS:',
        newArticles.map(article => ({
          id: article?.id,
          title: article?.title,
          slug: article?.slug,
          url: article?.url
        }))
      );

      console.log(
        '========================================'
      );

      /* ---------------------------------------------------
         GUARDAR DATOS
      --------------------------------------------------- */

      await saveData({
        articles,
        fixtures
      });

      console.log(
        'Contenido guardado correctamente en Blob.'
      );

      /* ---------------------------------------------------
         NEWSLETTER
      --------------------------------------------------- */

      let newsletterSent = 0;
      let newsletterErrors = 0;

      const newsletterResults = [];

      for (
        const article
        of newArticles
      ) {

        try {

          console.log(
            'Intentando enviar newsletter de:',
            article?.title
          );

          const newsletter =
            await sendNewArticleNewsletter(
              article
            );

          newsletterSent++;

          newsletterResults.push({
            title:
              article?.title || '',
            ok: true,
            broadcastId:
              newsletter?.id || null
          });

        } catch (error) {

          newsletterErrors++;

          console.error(
            '❌ ERROR NEWSLETTER:',
            error
          );

          newsletterResults.push({
            title:
              article?.title || '',
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : String(error)
          });
        }
      }

      console.log(
        '========================================'
      );

      console.log(
        'RESULTADO FINAL:'
      );

      console.log(
        'Noticias nuevas:',
        newArticles.length
      );

      console.log(
        'Newsletters enviados:',
        newsletterSent
      );

      console.log(
        'Errores newsletter:',
        newsletterErrors
      );

      console.log(
        '========================================'
      );

      /* ---------------------------------------------------
         RESPUESTA
      --------------------------------------------------- */

      return res.status(200).json({

        ok: true,

        articles:
          articles.length,

        fixtures:
          fixtures.length,

        newArticles:
          newArticles.length,

        newsletterSent,

        newsletterErrors,

        newsletterResults
      });
    }

    /* =====================================================
       ACCIÓN DESCONOCIDA
    ===================================================== */

    return res.status(400).json({
      error:
        'Acción no reconocida.'
    });

  } catch (error) {

    console.error(
      '❌ ADMIN API ERROR:',
      error
    );

    return res.status(500).json({

      error:
        'Error interno del servidor.',

      detail:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
}

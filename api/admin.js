import { list, put } from '@vercel/blob';
import crypto from 'node:crypto';
import { Resend } from 'resend';

const BLOB_PATH = 'droprugby/content.json';
const COOKIE = 'droprugby_session';
const MAX_AGE = 60 * 60 * 24 * 7;

const resend = new Resend(process.env.RESEND_API_KEY);

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

  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  /*
   * La sesión dura 7 días
   */
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
  const cookieHeader = req.headers.cookie || '';

  const cookies = cookieHeader
    .split(';')
    .map(cookie => cookie.trim());

  for (const cookie of cookies) {
    const index = cookie.indexOf('=');

    if (index === -1) continue;

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
   HTML ESCAPE
   Evita romper el email si un título contiene
   caracteres especiales.
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
   NEWSLETTER
========================================================= */

async function sendNewArticleNewsletter(article) {
  const segmentId =
    process.env.RESEND_SEGMENT_ID;

  if (!process.env.RESEND_API_KEY) {
    console.error(
      'Falta RESEND_API_KEY en Vercel.'
    );

    return null;
  }

  if (!segmentId) {
    console.error(
      'Falta RESEND_SEGMENT_ID en Vercel.'
    );

    return null;
  }

  if (!article) {
    console.error(
      'No se recibió la noticia.'
    );

    return null;
  }

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

  /*
   * Si tu artículo ya tiene URL,
   * usamos esa URL.
   */
  const articleUrl =
    article.url ||
    article.slug ||
    '';

  const cleanUrl = String(articleUrl)
    .replace(/^\/+/, '');

  const fullUrl =
    `https://www.droprugby.com/${cleanUrl}`;

  const safeTitle =
    escapeHtml(title);

  const safeExcerpt =
    escapeHtml(excerpt);

  const safeCategory =
    escapeHtml(category);

  const { data, error } =
    await resend.broadcasts.create({
      segmentId,

      from:
        'DropRugby <onboarding@resend.dev>',

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
          <title>${safeTitle}</title>
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

      /*
       * Crea y envía el Broadcast inmediatamente.
       */
      send: true
    });

  if (error) {
    console.error(
      'BROADCAST ERROR:',
      error
    );

    throw new Error(
      error.message ||
      'No se pudo enviar el newsletter.'
    );
  }

  console.log(
    'NEWSLETTER ENVIADO:',
    data?.id
  );

  return data;
}

/* =========================================================
   HANDLER PRINCIPAL
========================================================= */

export default async function handler(req, res) {

  /*
   * Solo POST
   */
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido.'
    });
  }

  try {

    /*
     * Verificación de configuración
     */
    if (!secret()) {
      console.error(
        'Falta ADMIN_SESSION_SECRET.'
      );

      return res.status(500).json({
        error:
          'Falta configurar ADMIN_SESSION_SECRET.'
      });
    }

    /*
     * Body
     */
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
        console.error(
          'Falta ADMIN_PASSWORD.'
        );

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

      /*
       * Comparación segura
       */
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
       VERIFICAR SESIÓN
    ===================================================== */

    if (body.action === 'check') {

      const token =
        getCookie(
          req,
          COOKIE
        );

      const authenticated =
        verifySession(token);

      return res.status(200).json({
        authenticated
      });
    }

    /* =====================================================
       TODAS LAS ACCIONES SIGUIENTES
       REQUIEREN LOGIN
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
       OBTENER DATOS
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
       GUARDAR DATOS
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

      /* ---------------------------------------------------
         LEER DATOS ANTERIORES
      --------------------------------------------------- */

      let previousData = null;

      try {

        previousData =
          await readData();

      } catch (error) {

        console.error(
          'No se pudo leer el contenido anterior:',
          error
        );

        /*
         * Si no existe contenido anterior,
         * tratamos la lista anterior como vacía.
         */
        previousData = {
          articles: [],
          fixtures: []
        };
      }

      /* ---------------------------------------------------
         GUARDAR NUEVOS DATOS
      --------------------------------------------------- */

      await saveData({
        articles,
        fixtures
      });

      /* ---------------------------------------------------
         DETECTAR NOTICIAS NUEVAS
      --------------------------------------------------- */

      const previousArticles =
        Array.isArray(
          previousData?.articles
        )
          ? previousData.articles
          : [];

      const previousIds =
        new Set(
          previousArticles
            .map(article => article?.id)
            .filter(Boolean)
        );

      const newArticles =
        articles.filter(article => {

          if (!article) {
            return false;
          }

          /*
           * Preferimos detectar por ID.
           */
          if (article.id) {
            return !previousIds.has(
              article.id
            );
          }

          /*
           * Fallback por slug/URL/título
           * por si algún artículo viejo
           * no tiene ID.
           */
          const identifier =
            article.slug ||
            article.url ||
            article.title;

          if (!identifier) {
            return false;
          }

          return !previousArticles.some(
            oldArticle => {

              const oldIdentifier =
                oldArticle?.slug ||
                oldArticle?.url ||
                oldArticle?.title;

              return (
                oldIdentifier ===
                identifier
              );
            }
          );
        });

      /* ---------------------------------------------------
         ENVIAR NEWSLETTER
      --------------------------------------------------- */

      let newsletterSent = 0;
      let newsletterErrors = 0;

      for (
        const article
        of newArticles
      ) {

        try {

          await sendNewArticleNewsletter(
            article
          );

          newsletterSent++;

        } catch (error) {

          newsletterErrors++;

          console.error(
            'Error enviando newsletter:',
            article?.title,
            error
          );

          /*
           * Importante:
           *
           * La noticia YA fue guardada.
           * Un error de Resend no debe hacer
           * que se pierda la publicación.
           */
        }
      }

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

        newsletterErrors
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
      'ADMIN API ERROR:',
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

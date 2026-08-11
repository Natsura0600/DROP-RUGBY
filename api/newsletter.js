// ============================================================
// DROPRUGBY - NEWSLETTER
// /api/newsletter.js
// ============================================================

import { Resend } from "resend";
import { list, put } from "@vercel/blob";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const BLOB_PATH = "droprugby/content.json";
const SITE_URL = "https://droprugby.com";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const NEWSLETTER_FROM =
  "DropRugby <newsletter@droprugby.com>";

// ============================================================
// RESPUESTA JSON
// ============================================================

function json(res, status, data) {
  return res.status(status).json(data);
}

// ============================================================
// EMAIL
// ============================================================

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================
// HTML EMAIL DE BIENVENIDA
// ============================================================

function buildWelcomeEmailHtml() {
  return `
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>Bienvenido a DropRugby</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f3f3f1;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f3f3f1;"
  >

    <tr>
      <td
        align="center"
        style="padding:40px 15px;"
      >

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:620px;
            background:#ffffff;
          "
        >

          <!-- HEADER -->

          <tr>
            <td
              style="
                background:#111111;
                padding:32px 40px;
              "
            >

              <div
                style="
                  font-size:30px;
                  line-height:1;
                  font-weight:700;
                  letter-spacing:-1.5px;
                  color:#ffffff;
                "
              >
                DROP<span style="font-weight:400;">RUGBY</span>
              </div>

              <div
                style="
                  margin-top:10px;
                  font-size:10px;
                  line-height:1.4;
                  letter-spacing:2px;
                  color:#bcbcbc;
                  font-weight:700;
                "
              >
                MEDIO DIGITAL DE RUGBY
              </div>

            </td>
          </tr>

          <!-- CONTENT -->

          <tr>
            <td
              style="
                padding:45px 40px 20px;
              "
            >

              <div
                style="
                  font-size:10px;
                  line-height:1.4;
                  letter-spacing:2px;
                  color:#777777;
                  font-weight:700;
                  margin-bottom:14px;
                "
              >
                NEWSLETTER
              </div>

              <h1
                style="
                  margin:0;
                  font-size:34px;
                  line-height:1.15;
                  letter-spacing:-1px;
                  font-weight:700;
                  color:#111111;
                "
              >
                Ya sos parte de DropRugby.
              </h1>

            </td>
          </tr>

          <!-- TEXT -->

          <tr>
            <td
              style="
                padding:10px 40px 25px;
              "
            >

              <p
                style="
                  margin:0;
                  font-size:17px;
                  line-height:1.7;
                  color:#444444;
                "
              >
                Gracias por suscribirte.
                A partir de ahora vas a recibir
                las principales noticias de rugby
                directamente en tu email.
              </p>

            </td>
          </tr>

          <!-- BUTTON -->

          <tr>
            <td
              style="
                padding:10px 40px 45px;
              "
            >

              <a
                href="${SITE_URL}"
                target="_blank"
                style="
                  display:inline-block;
                  background:#111111;
                  color:#ffffff;
                  text-decoration:none;
                  font-size:11px;
                  font-weight:700;
                  letter-spacing:1.2px;
                  padding:16px 24px;
                "
              >
                ENTRAR A DROPRUGBY &nbsp;→
              </a>

            </td>
          </tr>

          <!-- FOOTER -->

          <tr>
            <td
              style="
                background:#f5f5f2;
                padding:25px 40px;
              "
            >

              <p
                style="
                  margin:0 0 8px;
                  font-size:12px;
                  line-height:1.5;
                  color:#777777;
                "
              >
                Recibís este email porque te suscribiste
                al newsletter de DropRugby.
              </p>

              <p
                style="
                  margin:0;
                  font-size:11px;
                  line-height:1.5;
                  color:#999999;
                "
              >
                Rugby es una pasión.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>

  </table>

</body>
</html>
`;
}

// ============================================================
// LEER CONTENT.JSON
// ============================================================

async function readContent() {
  const result = await list({
    prefix: BLOB_PATH,
    limit: 10
  });

  if (!result.blobs.length) {
    return {
      articles: [],
      fixtures: [],
      results: [],
      standings: [],
      standingsBase: [],
      players: [],
      instagram: [],
      trash: [],
      history: [],
      subscribers: [],
      settings: {},
      teams: {
        clubs: {},
        nations: {}
      }
    };
  }

  const blob =
    result.blobs.find(
      (item) => item.pathname === BLOB_PATH
    ) || result.blobs[0];

  const response = await fetch(blob.url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo leer content.json (${response.status})`
    );
  }

  const data = await response.json();

  return {
    ...data,

    articles: Array.isArray(data.articles)
      ? data.articles
      : [],

    fixtures: Array.isArray(data.fixtures)
      ? data.fixtures
      : [],

    results: Array.isArray(data.results)
      ? data.results
      : [],

    standings: Array.isArray(data.standings)
      ? data.standings
      : [],

    standingsBase: Array.isArray(data.standingsBase)
      ? data.standingsBase
      : [],

    players: Array.isArray(data.players)
      ? data.players
      : [],

    instagram: Array.isArray(data.instagram)
      ? data.instagram
      : [],

    trash: Array.isArray(data.trash)
      ? data.trash
      : [],

    history: Array.isArray(data.history)
      ? data.history
      : [],

    subscribers: Array.isArray(data.subscribers)
      ? data.subscribers
      : [],

    settings:
      data.settings &&
      typeof data.settings === "object"
        ? data.settings
        : {},

    teams:
      data.teams &&
      typeof data.teams === "object"
        ? data.teams
        : {
            clubs: {},
            nations: {}
          }
  };
}

// ============================================================
// GUARDAR CONTENT.JSON
// ============================================================

async function saveContent(content) {
  await put(
    BLOB_PATH,
    JSON.stringify(content, null, 2),
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 0
    }
  );

  return content;
}

// ============================================================
// OBTENER BODY
// ============================================================

async function getBody(req) {
  if (
    req.body &&
    typeof req.body === "object" &&
    !Buffer.isBuffer(req.body)
  ) {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {

  // ==========================================================
  // MÉTODO
  // ==========================================================

  if (req.method !== "POST") {
    return json(res, 405, {
      ok: false,
      error: "Método no permitido."
    });
  }

  try {

    // ========================================================
    // RESEND API KEY
    // ========================================================

    if (!process.env.RESEND_API_KEY) {
      console.error(
        "NEWSLETTER ERROR: falta RESEND_API_KEY"
      );

      return json(res, 500, {
        ok: false,
        error:
          "Resend no está configurado correctamente."
      });
    }

    // ========================================================
    // BODY
    // ========================================================

    const body = await getBody(req);

    console.log(
      "NEWSLETTER BODY:",
      body
    );

    // ========================================================
    // EMAIL
    // ========================================================

    const email = normalizeEmail(
      body?.email
    );

    console.log(
      "NEWSLETTER EMAIL:",
      email
    );

    if (!email || !validEmail(email)) {
      console.error(
        "NEWSLETTER ERROR: email inválido:",
        email
      );

      return json(res, 400, {
        ok: false,
        error: "Ingresá un email válido."
      });
    }

    // ========================================================
    // CONFIGURACIÓN RESEND
    // ========================================================

    console.log(
      "NEWSLETTER FROM:",
      NEWSLETTER_FROM
    );

    console.log(
      "NEWSLETTER RESEND API KEY:",
      process.env.RESEND_API_KEY
        ? "CONFIGURADA"
        : "NO CONFIGURADA"
    );

    // ========================================================
    // LEER CONTENT
    // ========================================================

    const content = await readContent();

    if (!Array.isArray(content.subscribers)) {
      content.subscribers = [];
    }

    // ========================================================
    // COMPROBAR DUPLICADO
    // ========================================================

    const alreadySubscribed =
      content.subscribers.some(
        (subscriber) => {

          const subscriberEmail =
            normalizeEmail(
              typeof subscriber === "string"
                ? subscriber
                : subscriber?.email
            );

          return subscriberEmail === email;
        }
      );

    if (alreadySubscribed) {

      console.log(
        "NEWSLETTER: email ya suscripto:",
        email
      );

      return json(res, 200, {
        ok: true,
        alreadySubscribed: true,
        subscribed: true,
        welcomeEmailSent: false,
        message:
          "Este email ya está suscripto."
      });
    }

    // ========================================================
    // CONSTRUIR EMAIL
    // ========================================================

    const welcomeHtml =
      buildWelcomeEmailHtml();

    // ========================================================
    // ENVIAR CON RESEND
    // ========================================================

    console.log(
      "NEWSLETTER: intentando enviar a:",
      email
    );

    const resendResult =
      await resend.emails.send({
        from: NEWSLETTER_FROM,
        to: [email],
        subject:
          "Ya sos parte de DropRugby 🏉",
        html: welcomeHtml
      });

    console.log(
      "NEWSLETTER RESEND RESULT:",
      JSON.stringify(
        resendResult,
        null,
        2
      )
    );

    const resendData =
      resendResult?.data;

    const resendError =
      resendResult?.error;

    // ========================================================
    // RESEND RECHAZÓ
    // ========================================================

    if (resendError) {

      console.error(
        "RESEND NEWSLETTER ERROR:",
        JSON.stringify(
          resendError,
          null,
          2
        )
      );

      return json(res, 500, {
        ok: false,
        subscribed: false,
        welcomeEmailSent: false,
        error:
          "Resend rechazó el envío.",
        detail:
          resendError?.message ||
          "Error desconocido de Resend.",
        resendError
      });
    }

    // ========================================================
    // RESEND ACEPTÓ
    // ========================================================

    console.log(
      "NEWSLETTER: Resend aceptó el envío."
    );

    console.log(
      "NEWSLETTER: RESEND ID:",
      resendData?.id || null
    );

    // ========================================================
    // GUARDAR SUSCRIPTOR
    // ========================================================

    content.subscribers.push({
      email,
      subscribedAt:
        new Date().toISOString()
    });

    await saveContent(content);

    console.log(
      "NEWSLETTER: suscriptor guardado:",
      email
    );

    // ========================================================
    // RESPUESTA FINAL
    // ========================================================

    return json(res, 200, {
      ok: true,
      subscribed: true,
      welcomeEmailSent: true,
      alreadySubscribed: false,
      id: resendData?.id || null,
      message:
        "¡Suscripción realizada correctamente!"
    });

  } catch (error) {

    // ========================================================
    // ERROR GENERAL
    // ========================================================

    console.error(
      "NEWSLETTER ERROR GENERAL:",
      error
    );

    return json(res, 500, {
      ok: false,
      subscribed: false,
      welcomeEmailSent: false,
      error:
        "Error interno del servidor.",
      detail:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
}

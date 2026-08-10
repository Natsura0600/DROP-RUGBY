import { Resend } from "resend";
import { list, put } from "@vercel/blob";

const resend = new Resend(process.env.RESEND_API_KEY);

const BLOB_PATH = "droprugby/content.json";

function json(res, status, data) {
  return res.status(status).json(data);
}

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

async function saveContent(content) {
  await put(
    BLOB_PATH,
    JSON.stringify(content, null, 2),
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType:
        "application/json; charset=utf-8",
      cacheControlMaxAge: 0
    }
  );

  return content;
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function validEmail(email) {
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, {
      error: "Método no permitido"
    });
  }

  try {
    const { email } = req.body || {};

    const emailClean = normalizeEmail(email);

    if (!emailClean || !validEmail(emailClean)) {
      return json(res, 400, {
        error: "Ingresá un email válido."
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return json(res, 500, {
        error:
          "Resend no está configurado correctamente."
      });
    }

    const content = await readContent();

    if (!Array.isArray(content.subscribers)) {
      content.subscribers = [];
    }

    const alreadySubscribed =
      content.subscribers.some(
        (subscriber) =>
          normalizeEmail(
            typeof subscriber === "string"
              ? subscriber
              : subscriber?.email
          ) === emailClean
      );

    if (alreadySubscribed) {
      return json(res, 200, {
        ok: true,
        alreadySubscribed: true,
        message:
          "Este email ya está suscripto."
      });
    }

    content.subscribers.push({
      email: emailClean,
      subscribedAt:
        new Date().toISOString()
    });

    await saveContent(content);

    const { data, error } =
      await resend.emails.send({
        from:
          "DropRugby <newsletter@droprugby.com>",

        to: [emailClean],

        subject:
          "Ya sos parte de DropRugby 🏉",

        html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f5f2;
    font-family:Arial,Helvetica,sans-serif;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>
<tr>
<td align="center">

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

<tr>
<td
  style="
    background:#111111;
    padding:30px 35px;
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

<tr>
<td
  style="
    padding:45px 40px 15px;
  "
>

<div
  style="
    font-size:10px;
    letter-spacing:2px;
    color:#777777;
    font-weight:700;
    margin-bottom:14px;
  "
>
  BIENVENIDO A DROP RUGBY
</div>

<h1
  style="
    margin:0;
    font-size:34px;
    line-height:1.1;
    letter-spacing:-1px;
    font-weight:700;
    color:#111111;
  "
>
  El rugby,<br>
  directo a tu bandeja.
</h1>

</td>
</tr>

<tr>
<td style="padding:15px 40px 5px;">

<p
  style="
    margin:0 0 20px;
    font-size:16px;
    line-height:1.7;
    color:#444444;
  "
>
  Gracias por suscribirte a
  <strong>DropRugby</strong>.
</p>

<p
  style="
    margin:0 0 20px;
    font-size:16px;
    line-height:1.7;
    color:#444444;
  "
>
  Desde ahora vas a recibir las principales
  noticias, análisis, resultados y novedades
  del mundo del rugby.
</p>

<p
  style="
    margin:0;
    font-size:16px;
    line-height:1.7;
    color:#444444;
  "
>
  Queremos que tengas la información
  que importa, cuando importa.
</p>

</td>
</tr>

<tr>
<td style="padding:30px 40px 10px;">
<div
  style="
    height:1px;
    background:#ddddda;
    width:100%;
  "
></div>
</td>
</tr>

<tr>
<td style="padding:25px 40px 10px;">

<div
  style="
    font-size:10px;
    letter-spacing:2px;
    font-weight:700;
    color:#777777;
    margin-bottom:15px;
  "
>
  NUESTRA COBERTURA
</div>

<p
  style="
    margin:0;
    font-size:18px;
    line-height:1.6;
    font-weight:700;
    color:#111111;
  "
>
  LOS PUMAS
  <span style="color:#aaaaaa;"> · </span>
  INTERNACIONAL
  <span style="color:#aaaaaa;"> · </span>
  URBA
</p>

</td>
</tr>

<tr>
<td
  align="left"
  style="padding:30px 40px 40px;"
>

<a
  href="https://droprugby.com"
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
  Gracias por ser parte de la comunidad
  DropRugby.
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
        `
      });

    if (error) {
      console.error(
        "RESEND NEWSLETTER ERROR:",
        error
      );

      return json(res, 200, {
        ok: true,
        subscribed: true,
        welcomeEmailSent: false,
        message:
          "Suscripción guardada, pero no se pudo enviar el email.",
        detail:
          error?.message ||
          "Error de Resend"
      });
    }

    return json(res, 200, {
      ok: true,
      subscribed: true,
      welcomeEmailSent: true,
      id: data?.id || null,
      message:
        "¡Suscripción realizada correctamente!"
    });

  } catch (error) {
    console.error(
      "NEWSLETTER ERROR:",
      error
    );

    return json(res, 500, {
      error:
        "Error interno del servidor.",
      detail:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
}

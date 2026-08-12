// ============================================================
// DROPRUGBY - API ADMIN
// /api/admin.js
// ============================================================

import { Resend } from "resend";
import { r2GetJSON, r2PutJSONSafe } from "../lib/r2.js";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const BLOB_PATH = "droprugby/content.json";
const COOKIE_NAME = "droprugby_session";
const MAX_AGE = 60 * 60 * 24 * 7;
 
const resend = new Resend(
  process.env.RESEND_API_KEY
);

// IMPORTANTE:
// Este dominio debe estar verificado en Resend.
const NEWSLETTER_FROM =
  "DropRugby <newsletter@droprugby.com>";

const SITE_URL = "https://droprugby.com";

// ============================================================
// CONTENIDO POR DEFECTO
// ============================================================

const DEFAULT_STANDINGS_BASE = [
  {
    team: "Newman",
    pj: 17,
    pg: 16,
    pe: 0,
    pp: 1,
    diff: 255,
    pts: 71
  },
  {
    team: "CASI",
    pj: 17,
    pg: 13,
    pe: 0,
    pp: 4,
    diff: 179,
    pts: 60
  },
  {
    team: "Hindu",
    pj: 17,
    pg: 12,
    pe: 0,
    pp: 5,
    diff: 160,
    pts: 57
  },
  {
    team: "Alumni",
    pj: 17,
    pg: 11,
    pe: 0,
    pp: 6,
    diff: 220,
    pts: 56
  },
  {
    team: "SIC",
    pj: 17,
    pg: 11,
    pe: 0,
    pp: 6,
    diff: 127,
    pts: 51
  },
  {
    team: "Regatas Bella Vista",
    pj: 17,
    pg: 9,
    pe: 0,
    pp: 8,
    diff: 63,
    pts: 45
  },
  {
    team: "Los Tilos",
    pj: 17,
    pg: 9,
    pe: 1,
    pp: 7,
    diff: -48,
    pts: 42
  },
  {
    team: "Belgrano Athletic",
    pj: 17,
    pg: 8,
    pe: 1,
    pp: 8,
    diff: -15,
    pts: 41
  },
  {
    team: "CUBA",
    pj: 17,
    pg: 6,
    pe: 0,
    pp: 11,
    diff: 9,
    pts: 35
  },
  {
    team: "Atletico del Rosario",
    pj: 17,
    pg: 6,
    pe: 0,
    pp: 11,
    diff: -96,
    pts: 29
  },
  {
    team: "Los Matreros",
    pj: 17,
    pg: 6,
    pe: 0,
    pp: 11,
    diff: -246,
    pts: 27
  },
  {
    team: "La Plata",
    pj: 17,
    pg: 4,
    pe: 0,
    pp: 13,
    diff: -92,
    pts: 25
  },
  {
    team: "Buenos Aires C&RC",
    pj: 17,
    pg: 4,
    pe: 0,
    pp: 13,
    diff: -210,
    pts: 19
  },
  {
    team: "Champagnat",
    pj: 17,
    pg: 3,
    pe: 0,
    pp: 14,
    diff: -306,
    pts: 14
  }
];

const DEFAULT_CONTENT = {
  articles: [],
  fixtures: [],
  results: [],
  standings: [],

  standingsBase: DEFAULT_STANDINGS_BASE,

  players: [],
  instagram: [],
  trash: [],
  history: [],
  subscribers: [],

  settings: {
    siteName: "DropRugby",
    description: "Noticias de rugby",
    clubLogos: {},
    nationLogos: {}
  },

  teams: {
    clubs: {},
    nations: {}
  }
};

// ============================================================
// UTILIDADES
// ============================================================

function getSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "droprugby-secret-change-this"
  );
}

function makeId(prefix = "item") {
  return `${prefix}_${Date.now()}_${crypto
    .randomBytes(5)
    .toString("hex")}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fixtureKey(fixture) {
  return [
    fixture?.date || "",
    fixture?.time || "",
    fixture?.home ||
      fixture?.team1 ||
      fixture?.local ||
      "",
    fixture?.away ||
      fixture?.team2 ||
      fixture?.visitante ||
      "",
    fixture?.competition || ""
  ]
    .join("|")
    .toLowerCase();
}

function isTop14(fixture) {
  return (
    String(fixture?.competition || "")
      .trim()
      .toUpperCase() === "URBA TOP 14"
  );
}

// ============================================================
// NEWSLETTER
// ============================================================

function getArticleUrl(article) {
  const id = encodeURIComponent(
    article?.id || ""
  );

  return `${SITE_URL}/article.html?id=${id}`;
}

function buildArticleNewsletterHtml(article) {
  const title = escapeHtml(
    article?.title ||
      "Nueva noticia en DropRugby"
  );

  const excerpt = escapeHtml(
    article?.excerpt ||
      "Toda la actualidad del rugby argentino e internacional."
  );

  const category = escapeHtml(
    article?.category || "Rugby"
  );

  const imageUrl = String(
    article?.imageUrl ||
      article?.image ||
      ""
  ).trim();

  const articleUrl =
    getArticleUrl(article);

  const imageBlock = imageUrl
    ? `
      <tr>
        <td style="padding:0 40px;">
          <img
            src="${escapeHtml(imageUrl)}"
            alt="${title}"
            style="
              display:block;
              width:100%;
              max-width:540px;
              height:auto;
              border:0;
            "
          >
        </td>
      </tr>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#eeeeeb;
    font-family:Arial,Helvetica,sans-serif;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="background:#eeeeeb;"
>
<tr>
<td align="center" style="padding:30px 15px;">

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
    padding:30px 40px;
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

<!-- LABEL -->

<tr>
<td
  style="
    padding:42px 40px 12px;
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
  ${category.toUpperCase()}
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
  ${title}
</h1>

</td>
</tr>

${imageBlock}

<!-- EXCERPT -->

<tr>
<td
  style="
    padding:25px 40px 10px;
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
  ${excerpt}
</p>

</td>
</tr>

<!-- BUTTON -->

<tr>
<td
  align="left"
  style="
    padding:30px 40px 40px;
  "
>

<a
  href="${articleUrl}"
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
  LEER LA NOTICIA &nbsp;→
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
  Recibís este email porque estás suscripto
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

async function sendArticleNewsletter(
  article,
  subscribers
) {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      "NEWSLETTER: falta RESEND_API_KEY"
    );

    return {
      attempted: 0,
      sent: 0,
      failed: 0
    };
  }

  if (!Array.isArray(subscribers)) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0
    };
  }

  const emails = [
    ...new Set(
      subscribers
        .map((subscriber) =>
          normalizeEmail(
            typeof subscriber === "string"
              ? subscriber
              : subscriber?.email
          )
        )
        .filter(validEmail)
    )
  ];

  if (!emails.length) {
    console.log(
      "NEWSLETTER: no hay suscriptores."
    );

    return {
      attempted: 0,
      sent: 0,
      failed: 0
    };
  }

  const html =
    buildArticleNewsletterHtml(article);

  let sent = 0;
  let failed = 0;

  const results =
    await Promise.allSettled(
      emails.map(async (email) => {
        const { data, error } =
          await resend.emails.send({
            from: NEWSLETTER_FROM,
            to: [email],
            subject:
              `Nuevo en DropRugby: ${
                article?.title ||
                "Nueva noticia"
              }`,
            html
          });

        if (error) {
          throw new Error(
            `${email}: ${
              error.message ||
              "Error de Resend"
            }`
          );
        }

        return data;
      })
    );

  for (const result of results) {
    if (
      result.status ===
      "fulfilled"
    ) {
      sent++;
    } else {
      failed++;

      console.error(
        "NEWSLETTER SEND ERROR:",
        result.reason
      );
    }
  }

  console.log(
    `NEWSLETTER: ${sent} enviados, ${failed} fallidos de ${emails.length}.`
  );

  return {
    attempted: emails.length,
    sent,
    failed
  };
}

// ============================================================
// COOKIES
// ============================================================

function parseCookies(req) {
  const header =
    req.headers.cookie || "";

  const cookies = {};

  header.split(";").forEach(
    (part) => {
      const index =
        part.indexOf("=");

      if (index === -1) return;

      const key =
        part.slice(0, index).trim();

      const value =
        part.slice(index + 1).trim();

      try {
        cookies[key] =
          decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
    }
  );

  return cookies;
}

function createToken() {
  const timestamp =
    Date.now();

  const random =
    crypto
      .randomBytes(24)
      .toString("hex");

  const value =
    `${timestamp}.${random}`;

  const signature =
    crypto
      .createHmac(
        "sha256",
        getSecret()
      )
      .update(value)
      .digest("hex");

  return `${value}.${signature}`;
}

function validToken(req) {
  try {
    const cookies =
      parseCookies(req);

    const token =
      cookies[COOKIE_NAME];

    if (!token) return false;

    const parts =
      token.split(".");

    if (parts.length !== 3) {
      return false;
    }

    const timestamp =
      Number(parts[0]);

    if (!Number.isFinite(timestamp)) {
      return false;
    }

    if (
      Date.now() -
        timestamp >
      MAX_AGE * 1000
    ) {
      return false;
    }

    const value =
      `${parts[0]}.${parts[1]}`;

    const expected =
      crypto
        .createHmac(
          "sha256",
          getSecret()
        )
        .update(value)
        .digest("hex");

    const receivedBuffer =
      Buffer.from(parts[2]);

    const expectedBuffer =
      Buffer.from(expected);

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    );
  } catch {
    return false;
  }
}

function setCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(
      token
    )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`
  );
}

function clearCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

// ============================================================
// RESPUESTAS
// ============================================================

function json(res, status, data) {
  return res
    .status(status)
    .json(data);
}

// ============================================================
// BODY
// ============================================================

async function getBody(req) {
  if (
    req.body &&
    typeof req.body === "object" &&
    !Buffer.isBuffer(req.body)
  ) {
    return req.body;
  }

  return new Promise(
    (resolve, reject) => {
      let raw = "";

      req.on(
        "data",
        (chunk) => {
          raw += chunk;
        }
      );

      req.on(
        "end",
        () => {
          if (!raw) {
            resolve({});
            return;
          }

          try {
            resolve(
              JSON.parse(raw)
            );
          } catch (error) {
            reject(error);
          }
        }
      );

      req.on(
        "error",
        reject
      );
    }
  );
}

// ============================================================
// NORMALIZACIÓN
// ============================================================

function normalizeContent(data) {
  const content =
    data &&
    typeof data === "object"
      ? data
      : {};

  return {
    ...DEFAULT_CONTENT,
    ...content,

    articles:
      Array.isArray(
        content.articles
      )
        ? content.articles
        : [],

    fixtures:
      Array.isArray(
        content.fixtures
      )
        ? content.fixtures
        : [],

    results:
      Array.isArray(
        content.results
      )
        ? content.results
        : [],

    standings:
      Array.isArray(
        content.standings
      )
        ? content.standings
        : [],

    standingsBase:
      Array.isArray(
        content.standingsBase
      ) &&
      content.standingsBase.length
        ? content.standingsBase
        : DEFAULT_STANDINGS_BASE,

    players:
      Array.isArray(
        content.players
      )
        ? content.players
        : [],

    instagram:
      Array.isArray(
        content.instagram
      )
        ? content.instagram
        : [],

    trash:
      Array.isArray(
        content.trash
      )
        ? content.trash
        : [],

    history:
      Array.isArray(
        content.history
      )
        ? content.history
        : [],

    subscribers:
      Array.isArray(
        content.subscribers
      )
        ? content.subscribers
        : [],

    settings:
      content.settings &&
      typeof content.settings ===
        "object"
        ? {
            ...DEFAULT_CONTENT.settings,
            ...content.settings
          }
        : {
            ...DEFAULT_CONTENT.settings
          },

    teams:
      content.teams &&
      typeof content.teams ===
        "object"
        ? {
            ...DEFAULT_CONTENT.teams,
            ...content.teams
          }
        : {
            ...DEFAULT_CONTENT.teams
          }
  };
}

// ============================================================
// BLOB
// ============================================================

async function readBlobContent() {
  return await r2GetJSON(BLOB_PATH);
}

async function readLocalContent() {
  try {
    const articlesPath =
      path.join(
        process.cwd(),
        "data",
        "articles.json"
      );

    const fixturesPath =
      path.join(
        process.cwd(),
        "data",
        "fixtures.json"
      );

    const teamsPath =
      path.join(
        process.cwd(),
        "data",
        "teams.json"
      );

    const [
      articlesRaw,
      fixturesRaw,
      teamsRaw
    ] = await Promise.all([
      fs.readFile(
        articlesPath,
        "utf8"
      ),
      fs.readFile(
        fixturesPath,
        "utf8"
      ),
      fs.readFile(
        teamsPath,
        "utf8"
      )
    ]);

    return {
      ...DEFAULT_CONTENT,

      articles:
        JSON.parse(
          articlesRaw
        ),

      fixtures:
        JSON.parse(
          fixturesRaw
        ),

      teams:
        JSON.parse(
          teamsRaw
        )
    };
  } catch {
    return {
      ...DEFAULT_CONTENT
    };
  }
}

function hasDeletedHistory(
  content,
  type
) {
  return (
    Array.isArray(
      content?.history
    ) &&
    content.history.some(
      (item) =>
        String(
          item?.type || ""
        ) === type &&
        /delete|remove/i.test(
          String(
            item?.action || ""
          )
        )
    )
  );
}

async function repairLegacyBlobContent(
  blob
) {
  const local =
    await readLocalContent();

  const repaired = {
    ...blob
  };

  let changed = false;

  if (
    Array.isArray(
      local.articles
    ) &&
    local.articles.length > 0 &&
    Array.isArray(
      blob.articles
    ) &&
    blob.articles.length === 0 &&
    !hasDeletedHistory(
      blob,
      "article"
    )
  ) {
    repaired.articles =
      local.articles;

    changed = true;
  }

  if (
    Array.isArray(
      local.fixtures
    ) &&
    local.fixtures.length > 0 &&
    Array.isArray(
      blob.fixtures
    ) &&
    blob.fixtures.length === 0 &&
    !hasDeletedHistory(
      blob,
      "fixture"
    )
  ) {
    repaired.fixtures =
      local.fixtures;

    changed = true;
  }

  return {
    content:
      normalizeContent(
        repaired
      ),
    changed
  };
}

async function readContent(
  options = {}
) {
  const blob =
    await readBlobContent();

  if (blob) {
    const repaired =
      await repairLegacyBlobContent(
        blob
      );

    if (
      repaired.changed &&
      options.persistRepair !==
        false
    ) {
      await saveContent(
        repaired.content
      );
    }

    return repaired.content;
  }

  const local =
    await readLocalContent();

  return normalizeContent(
    local
  );
}

async function saveContent(
  content
) {
  const normalized =
    normalizeContent(
      content
    );

  await r2PutJSONSafe(
    BLOB_PATH,
    normalized
  );

  return normalized;
}

// ============================================================
// HISTORIAL
// ============================================================

function addHistory(
  content,
  action,
  type,
  item
) {
  if (
    !Array.isArray(
      content.history
    )
  ) {
    content.history = [];
  }

  content.history.unshift({
    id: makeId("history"),
    action,
    type,
    itemId:
      item?.id || null,
    title:
      item?.title ||
      (
        item?.home
          ? `${item.home || ""} vs ${
              item.away || ""
            }`
          : ""
      ),
    date:
      new Date().toISOString()
  });

  content.history =
    content.history.slice(
      0,
      200
    );
}

// ============================================================
// PROGRAMACIÓN
// ============================================================

function processScheduledArticles(
  content
) {
  const now =
    Date.now();

  let changed = false;

  content.articles =
    content.articles.map(
      (article) => {
        if (
          article.scheduled &&
          article.publishAt
        ) {
          const publishTime =
            new Date(
              article.publishAt
            ).getTime();

          if (
            Number.isFinite(
              publishTime
            ) &&
            publishTime <= now
          ) {
            changed = true;

            return {
              ...article,
              scheduled: false,
              published: true,
              updatedAt:
                new Date().toISOString()
            };
          }
        }

        return article;
      }
    );

  return changed;
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(
  req,
  res
) {
  try {
    // ========================================================
    // GET
    // ========================================================

    if (
      req.method === "GET"
    ) {
      const action =
        req.query?.action;

      // ------------------------------------------------------
      // SESSION
      // ------------------------------------------------------

      if (
        action === "session" ||
        action === "check-session" ||
        action === "me"
      ) {
        const authenticated =
          validToken(req);

        return json(
          res,
          200,
          {
            authenticated,
            user:
              authenticated
                ? process.env.ADMIN_USER ||
                  "admin"
                : null
          }
        );
      }

      // ------------------------------------------------------
      // GET CONTENT
      // ------------------------------------------------------

      if (
        action === "get" ||
        action === "load"
      ) {
        if (
          !validToken(req)
        ) {
          return json(
            res,
            401,
            {
              ok: false,
              error:
                "Sesión no válida o expirada."
            }
          );
        }

        const content =
          await readContent();

        const changed =
          processScheduledArticles(
            content
          );

        if (changed) {
          await saveContent(
            content
          );
        }

        return json(
          res,
          200,
          {
            ok: true,
            content
          }
        );
      }

      return json(
        res,
        400,
        {
          ok: false,
          error:
            "Acción desconocida."
        }
      );
    }

    // ========================================================
    // POST
    // ========================================================

    if (
      req.method !== "POST"
    ) {
      return json(
        res,
        405,
        {
          ok: false,
          error:
            "Método no permitido."
        }
      );
    }

    const body =
      await getBody(req);

    const action =
      body.action ||
      req.query?.action ||
      "";

    // ========================================================
    // LOGIN
    // ========================================================

    if (
      action === "login" ||
      action === "authenticate"
    ) {
      const username =
        process.env.ADMIN_USER ||
        "admin";

      const password =
        process.env.ADMIN_PASSWORD;

      if (!password) {
        return json(
          res,
          500,
          {
            ok: false,
            error:
              "Falta configurar ADMIN_PASSWORD en Vercel."
          }
        );
      }

      if (
        String(
          body.username || ""
        ) !==
          String(username) ||
        String(
          body.password || ""
        ) !==
          String(password)
      ) {
        return json(
          res,
          401,
          {
            ok: false,
            error:
              "Usuario o contraseña incorrectos."
          }
        );
      }

      const token =
        createToken();

      setCookie(
        res,
        token
      );

      return json(
        res,
        200,
        {
          ok: true,
          authenticated: true,
          user: username
        }
      );
    }

    // ========================================================
    // LOGOUT
    // ========================================================

    if (
      action === "logout" ||
      action === "signout"
    ) {
      clearCookie(res);

      return json(
        res,
        200,
        {
          ok: true
        }
      );
    }

    // ========================================================
    // TODO LO DEMÁS REQUIERE SESIÓN
    // ========================================================

    if (
      !validToken(req)
    ) {
      return json(
        res,
        401,
        {
          ok: false,
          error:
            "Sesión no válida o expirada."
        }
      );
    }

    // ========================================================
    // GET CONTENT POR POST
    // ========================================================

    if (
      action === "get" ||
      action === "load"
    ) {
      const content =
        await readContent();

      const changed =
        processScheduledArticles(
          content
        );

      if (changed) {
        await saveContent(
          content
        );
      }

      return json(
        res,
        200,
        {
          ok: true,
          content
        }
      );
    }

    // ========================================================
    // SAVE GENERAL
    // ========================================================

    if (
      action === "save" ||
      action === "save-all" ||
      action === "update"
    ) {
      const incoming =
        body.content &&
        typeof body.content ===
          "object"
          ? body.content
          : body;

      const current =
        await readContent();

      const merged =
        normalizeContent({
          ...current,
          ...incoming
        });

      await saveContent(
        merged
      );

      return json(
        res,
        200,
        {
          ok: true,
          content: merged
        }
      );
    }

    // ========================================================
    // CREAR / EDITAR NOTICIA
    // ========================================================

    if (
      action === "create-article" ||
      action === "add-article" ||
      action === "article-create"
    ) {
      const article =
        body.article;

      if (
        !article ||
        typeof article !==
          "object"
      ) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Datos de noticia inválidos."
          }
        );
      }

      const content =
        await readContent();

      const now =
        new Date().toISOString();

      const articleId =
        article.id ||
        makeId("article");

      const existingIndex =
        content.articles.findIndex(
          (item) =>
            String(
              item.id
            ) ===
            String(
              articleId
            )
        );

      const isNewArticle =
        existingIndex < 0;

      const normalizedArticle = {
        id: articleId,

        title:
          String(
            article.title ||
              ""
          ).trim(),

        slug:
          article.slug ||
          slugify(
            article.title
          ),

        url:
          `article.html?id=${encodeURIComponent(
            articleId
          )}`,

        category:
          article.category ||
          "Rugby",

        subcategory:
          article.subcategory ||
          "Actualidad",

        author:
          article.author ||
          "DropRugby",

        excerpt:
          article.excerpt ||
          "",

        content:
          article.content ||
          "",

        contentBlocks:
          Array.isArray(article.contentBlocks)
            ? article.contentBlocks
            : [],

        seo:
          article.seo && typeof article.seo === "object"
            ? article.seo
            : {},

        imageAlt:
          article.imageAlt ||
          "",

        imageUrl:
          article.imageUrl ||
          article.image ||
          "",

        date:
          article.date ||
          now.slice(0, 10),

        featured:
          Boolean(
            article.featured
          ),

        published:
          article.scheduled
            ? false
            : article.published !==
              false,

        scheduled:
          Boolean(
            article.scheduled
          ),

        publishAt:
          article.publishAt ||
          null,

        createdAt:
          article.createdAt ||
          now,

        updatedAt:
          now
      };

      if (
        existingIndex >= 0
      ) {
        content.articles[
          existingIndex
        ] = {
          ...content.articles[
            existingIndex
          ],
          ...normalizedArticle
        };

        addHistory(
          content,
          "edit",
          "article",
          normalizedArticle
        );
      } else {
        content.articles.unshift(
          normalizedArticle
        );

        addHistory(
          content,
          "create",
          "article",
          normalizedArticle
        );
      }

      await saveContent(
        content
      );

      // ------------------------------------------------------
      // NEWSLETTER AUTOMÁTICO
      // ------------------------------------------------------

      let newsletter = {
        attempted: 0,
        sent: 0,
        failed: 0
      };

      if (
        isNewArticle &&
        normalizedArticle.published === true &&
        normalizedArticle.scheduled !== true
      ) {
        newsletter =
          await sendArticleNewsletter(
            normalizedArticle,
            content.subscribers
          );
      }

      return json(
        res,
        200,
        {
          ok: true,
          article:
            normalizedArticle,
          content,
          newsletter
        }
      );
    }

    // ========================================================
    // BORRAR NOTICIA
    // ========================================================

    if (
      action === "delete-article" ||
      action === "remove-article"
    ) {
      const id =
        body.id;

      if (!id) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Falta el ID de la noticia."
          }
        );
      }

      const content =
        await readContent();

      const index =
        content.articles.findIndex(
          (article) =>
            String(
              article.id
            ) ===
            String(id)
        );

      if (
        index === -1
      ) {
        return json(
          res,
          404,
          {
            ok: false,
            error:
              "Noticia no encontrada."
          }
        );
      }

      const removed =
        content.articles[index];

      content.articles.splice(
        index,
        1
      );

      if (
        !Array.isArray(
          content.trash
        )
      ) {
        content.trash = [];
      }

      content.trash.unshift({
        ...removed,
        deletedAt:
          new Date().toISOString(),
        deletedType:
          "article"
      });

      addHistory(
        content,
        "delete",
        "article",
        removed
      );

      await saveContent(
        content
      );

      return json(
        res,
        200,
        {
          ok: true,
          content
        }
      );
    }

    // ========================================================
    // CREAR / EDITAR PARTIDO
    // ========================================================

    if (
      action === "create-fixture" ||
      action === "add-fixture" ||
      action === "fixture-create"
    ) {
      const fixture =
        body.fixture;

      if (
        !fixture ||
        typeof fixture !==
          "object"
      ) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Datos de partido inválidos."
          }
        );
      }

      const content =
        await readContent();

      const now =
        new Date().toISOString();

      const incomingFixtureKey =
        fixture.fixtureKey ||
        fixtureKey(
          fixture
        );

      const fixtureId =
        fixture.id ||
        makeId("fixture");

      const normalizedFixture = {
        id: fixtureId,

        fixtureKey:
          incomingFixtureKey,

        home:
          fixture.home ||
          fixture.team1 ||
          fixture.local ||
          "",

        away:
          fixture.away ||
          fixture.team2 ||
          fixture.visitante ||
          "",

        date:
          fixture.date ||
          "",

        time:
          fixture.time ||
          "",

        competition:
          fixture.competition ||
          "URBA TOP 14",

        channel:
          fixture.channel ||
          "",

        venue:
          fixture.venue ||
          "",

        createdAt:
          fixture.createdAt ||
          now,

        updatedAt:
          now
      };

      const existingIndex =
        content.fixtures.findIndex(
          (item) =>
            (
              fixture.id &&
              String(
                item.id || ""
              ) ===
                String(
                  fixture.id
                )
            ) ||
            String(
              item.fixtureKey ||
                fixtureKey(item)
            ) ===
              String(
                incomingFixtureKey
              )
        );

      if (
        existingIndex >= 0
      ) {
        const existingFixture =
          content.fixtures[
            existingIndex
          ];

        content.fixtures[
          existingIndex
        ] = {
          ...existingFixture,
          ...normalizedFixture,
          id:
            existingFixture.id ||
            fixtureId
        };

        addHistory(
          content,
          "edit",
          "fixture",
          normalizedFixture
        );
      } else {
        content.fixtures.push(
          normalizedFixture
        );

        addHistory(
          content,
          "create",
          "fixture",
          normalizedFixture
        );
      }

      await saveContent(
        content
      );

      return json(
        res,
        200,
        {
          ok: true,
          fixture:
            normalizedFixture,
          content
        }
      );
    }

    // ========================================================
    // BORRAR PARTIDO
    // ========================================================

    if (
      action === "delete-fixture" ||
      action === "remove-fixture"
    ) {
      const id =
        body.id;

      if (!id) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Falta el ID del partido."
          }
        );
      }

      const content =
        await readContent();

      const index =
        content.fixtures.findIndex(
          (fixture) =>
            String(
              fixture.id ||
                fixtureKey(
                  fixture
                )
            ) ===
            String(id)
        );

      if (
        index === -1
      ) {
        return json(
          res,
          404,
          {
            ok: false,
            error:
              "Partido no encontrado."
          }
        );
      }

      const removed =
        content.fixtures[index];

      content.fixtures.splice(
        index,
        1
      );

      if (
        !Array.isArray(
          content.trash
        )
      ) {
        content.trash = [];
      }

      content.trash.unshift({
        ...removed,
        deletedAt:
          new Date().toISOString(),
        deletedType:
          "fixture"
      });

      addHistory(
        content,
        "delete",
        "fixture",
        removed
      );

      await saveContent(
        content
      );

      return json(
        res,
        200,
        {
          ok: true,
          content
        }
      );
    }

    // ========================================================
    // GUARDAR RESULTADO TOP 14
    // ========================================================

    if (
      action === "save-result" ||
      action === "create-result" ||
      action === "update-result"
    ) {
      const result =
        body.result;

      if (
        !result ||
        typeof result !==
          "object"
      ) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Datos de resultado inválidos."
          }
        );
      }

      const content =
        await readContent();

      const fixture =
        content.fixtures.find(
          (item) =>
            String(
              item.id || ""
            ) ===
              String(
                result.fixtureId ||
                  ""
              ) ||
            fixtureKey(item) ===
              String(
                result.fixtureKey ||
                  ""
              )
        );

      if (!fixture) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "No se encontró el partido asociado al resultado."
          }
        );
      }

      if (
        !isTop14(fixture)
      ) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Solo se pueden cargar resultados de URBA TOP 14."
          }
        );
      }

      const homeScore =
        Number(
          result.homeScore
        );

      const awayScore =
        Number(
          result.awayScore
        );

      if (
        !Number.isInteger(
          homeScore
        ) ||
        homeScore < 0 ||
        !Number.isInteger(
          awayScore
        ) ||
        awayScore < 0
      ) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Los marcadores deben ser números enteros mayores o iguales a 0."
          }
        );
      }

      const home =
        fixture.home ||
        fixture.team1 ||
        fixture.local ||
        "";

      const away =
        fixture.away ||
        fixture.team2 ||
        fixture.visitante ||
        "";

      let bonusTeam =
        result.bonusTeam ||
        null;

      if (bonusTeam) {
        const bonusString =
          String(
            bonusTeam
          ).trim();

        const homeKey =
          String(home)
            .trim()
            .toLowerCase();

        const awayKey =
          String(away)
            .trim()
            .toLowerCase();

        if (
          bonusString.toLowerCase() !==
            homeKey &&
          bonusString.toLowerCase() !==
            awayKey
        ) {
          return json(
            res,
            400,
            {
              ok: false,
              error:
                "El punto bonus debe pertenecer a uno de los dos equipos."
            }
          );
        }

        bonusTeam =
          bonusString;
      }

      const now =
        new Date().toISOString();

      const resultId =
        result.id ||
        makeId("result");

      const normalizedResult = {
        id: resultId,

        fixtureId:
          fixture.id ||
          fixtureKey(
            fixture
          ),

        fixtureKey:
          fixtureKey(
            fixture
          ),

        date:
          fixture.date ||
          "",

        time:
          fixture.time ||
          "",

        competition:
          "URBA TOP 14",

        home,
        away,

        homeScore,
        awayScore,

        bonusTeam,

        createdAt:
          result.createdAt ||
          now,

        updatedAt:
          now
      };

      const existingIndex =
        content.results.findIndex(
          (item) =>
            String(
              item.id
            ) ===
              String(
                resultId
              ) ||
            String(
              item.fixtureId ||
                ""
            ) ===
              String(
                normalizedResult.fixtureId
              )
        );

      if (
        existingIndex >= 0
      ) {
        content.results[
          existingIndex
        ] = {
          ...content.results[
            existingIndex
          ],
          ...normalizedResult
        };

        addHistory(
          content,
          "edit",
          "result",
          normalizedResult
        );
      } else {
        content.results.push(
          normalizedResult
        );

        addHistory(
          content,
          "create",
          "result",
          normalizedResult
        );
      }

      content.standings =
        calculateStandings(
          content
        );

      await saveContent(
        content
      );

      return json(
        res,
        200,
        {
          ok: true,
          result:
            normalizedResult,
          standings:
            content.standings,
          content
        }
      );
    }

    // ========================================================
    // BORRAR RESULTADO
    // ========================================================

    if (
      action === "delete-result" ||
      action === "remove-result"
    ) {
      const id =
        body.id;

      if (!id) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Falta el ID del resultado."
          }
        );
      }

      const content =
        await readContent();

      const index =
        content.results.findIndex(
          (result) =>
            String(
              result.id
            ) ===
            String(id)
        );

      if (
        index === -1
      ) {
        return json(
          res,
          404,
          {
            ok: false,
            error:
              "Resultado no encontrado."
          }
        );
      }

      const removed =
        content.results[index];

      content.results.splice(
        index,
        1
      );

      content.standings =
        calculateStandings(
          content
        );

      addHistory(
        content,
        "delete",
        "result",
        removed
      );

      await saveContent(
        content
      );

      return json(
        res,
        200,
        {
          ok: true,
          content
        }
      );
    }

    // ========================================================
    // GUARDAR TABLA BASE
    // ========================================================

    if (
      action ===
        "save-standings-base" ||
      action ===
        "update-standings-base"
    ) {
      const rows =
        Array.isArray(
          body.standingsBase
        )
          ? body.standingsBase
          : [];

      const content =
        await readContent();

      content.standingsBase =
        rows
          .map(
            (row) => ({
              team:
                String(
                  row.team ||
                    ""
                ).trim(),

              pj:
                Number(
                  row.pj
                ) || 0,

              pg:
                Number(
                  row.pg
                ) || 0,

              pe:
                Number(
                  row.pe
                ) || 0,

              pp:
                Number(
                  row.pp
                ) || 0,

              diff:
                Number(
                  row.diff
                ) || 0,

              pts:
                Number(
                  row.pts
                ) || 0
            })
          )
          .filter(
            (row) =>
              row.team
          );

      content.standings =
        calculateStandings(
          content
        );

      await saveContent(
        content
      );

      return json(
        res,
        200,
        {
          ok: true,
          standingsBase:
            content.standingsBase,
          standings:
            content.standings,
          content
        }
      );
    }

    // ========================================================
    // CALCULAR / ACTUALIZAR TABLA
    // ========================================================

    if (
      action ===
        "calculate-standings" ||
      action ===
        "update-standings"
    ) {
      const content =
        await readContent();

      content.standings =
        calculateStandings(
          content
        );

      await saveContent(
        content
      );

      return json(
        res,
        200,
        {
          ok: true,
          standings:
            content.standings,
          content
        }
      );
    }

    // ========================================================
    // ACTUALIZAR ESCUDO DE CLUB
    // ========================================================

    if (
      action ===
      "update-club-logo"
    ) {
      const clubId =
        String(
          body.clubId || ""
        ).trim();

      const url =
        String(
          body.url || ""
        ).trim();

      if (!clubId) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Falta el club."
          }
        );
      }

      const content =
        await readContent();

      content.settings =
        content.settings &&
        typeof content.settings ===
          "object"
          ? content.settings
          : {};

      content.settings.clubLogos =
        content.settings
          .clubLogos &&
        typeof content.settings
          .clubLogos ===
          "object"
          ? content.settings
              .clubLogos
          : {};

      if (url) {
        content.settings.clubLogos[
          clubId
        ] = url;
      } else {
        delete content.settings
          .clubLogos[
            clubId
          ];
      }

      await saveContent(
        content
      );

      return json(
        res,
        200,
        {
          ok: true,
          content
        }
      );
    }

    // ========================================================
    // ACTUALIZAR ESCUDO DE SELECCIÓN NACIONAL
    // ========================================================

    if (
      action ===
      "update-nation-logo"
    ) {
      const nationId =
        String(
          body.nationId || ""
        ).trim();

      const url =
        String(
          body.url || ""
        ).trim();

      if (!nationId) {
        return json(
          res,
          400,
          {
            ok: false,
            error:
              "Falta la selección."
          }
        );
      }

      const content =
        await readContent();

      content.settings =
        content.settings &&
        typeof content.settings ===
          "object"
          ? content.settings
          : {};

      content.settings.nationLogos =
        content.settings
          .nationLogos &&
        typeof content.settings
          .nationLogos ===
          "object"
          ? content.settings
              .nationLogos
          : {};

      if (url) {
        content.settings.nationLogos[
          nationId
        ] = url;
      } else {
        delete content.settings
          .nationLogos[
            nationId
          ];
      }

      await saveContent(
        content
      );

      return json(
        res,
        200,
        {
          ok: true,
          content
        }
      );
    }

    // ========================================================
    // ACCIÓN DESCONOCIDA
    // ========================================================

    return json(
      res,
      400,
      {
        ok: false,
        error:
          `Acción desconocida: ${
            action || "(vacía)"
          }`
      }
    );
  } catch (error) {
    console.error(
      "❌ /api/admin ERROR:",
      error
    );

    return json(
      res,
      500,
      {
        ok: false,
        error:
          "Error interno del servidor.",
        detail:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );
  }
}

// ============================================================
// TABLA URBA TOP 14
// ============================================================

const TOP14_OFFICIAL_TEAMS = new Set([
  "newman", "casi", "hindu", "alumni", "sic",
  "regatas bella vista", "los tilos", "belgrano athletic",
  "cuba", "atletico del rosario", "los matreros", "la plata",
  "buenos aires crc", "champagnat"
]);

const TEAM_CANONICAL_NAMES = {
  "newman": "Newman",
  "casi": "CASI",
  "hindu": "Hindu",
  "alumni": "Alumni",
  "sic": "SIC",
  "regatas bella vista": "Regatas Bella Vista",
  "los tilos": "Los Tilos",
  "belgrano athletic": "Belgrano Athletic",
  "cuba": "CUBA",
  "atletico del rosario": "Atletico del Rosario",
  "los matreros": "Los Matreros",
  "la plata": "La Plata",
  "buenos aires crc": "Buenos Aires C&RC",
  "champagnat": "Champagnat"
};

const TEAM_ALIASES = {
  "regatas de bella vista":
    "regatas bella vista",

  "atletico del rosario uba":
    "atletico del rosario",

  "ca atletico del rosario":
    "atletico del rosario",

  "belgrano":
    "belgrano athletic",

  "biei":
    "buenos aires crc",

  "bac":
    "buenos aires crc",

  "champa":
    "champagnat",

  "plaza":
    "atletico del rosario",

  "regatas":
    "regatas bella vista"
};

function normalizeTeamKey(name) {
  let key =
    String(name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /^club\s+/,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const normalized = TEAM_ALIASES[key] || key;
  return normalized;
}

function calculateStandings(
  content
) {
  const teams =
    new Map();

  const baseByTeam =
    new Map();

  // ----------------------------------------------------------
  // BASE
  // ----------------------------------------------------------

  for (
    const base of
      content.standingsBase ||
    []
  ) {
    const cleanName =
      String(
        base.team || ""
      ).trim();

    if (!cleanName) {
      continue;
    }

    baseByTeam.set(
      normalizeTeamKey(
        cleanName
      ),
      {
        pj:
          Number(
            base.pj
          ) || 0,

        pg:
          Number(
            base.pg
          ) || 0,

        pe:
          Number(
            base.pe
          ) || 0,

        pp:
          Number(
            base.pp
          ) || 0,

        diff:
          Number(
            base.diff
          ) || 0,

        pts:
          Number(
            base.pts
          ) || 0
      }
    );
  }

  // ----------------------------------------------------------
  // EQUIPOS
  // ----------------------------------------------------------

  function ensureTeam(name) {
    const clean =
      String(
        name || ""
      ).trim();

    if (!clean) {
      return null;
    }

    const key = normalizeTeamKey(clean);

    if (!TOP14_OFFICIAL_TEAMS.has(key)) {
      return null;
    }

    const canonicalName = TEAM_CANONICAL_NAMES[key] || clean;

    if (!teams.has(key)) {
      const base =
        baseByTeam.get(
          key
        );

      teams.set(
        key,
        {
          team: canonicalName,

          pj:
            base
              ? base.pj
              : 0,

          pg:
            base
              ? base.pg
              : 0,

          pe:
            base
              ? base.pe
              : 0,

          pp:
            base
              ? base.pp
              : 0,

          pf: 0,
          pc: 0,

          baseDiff:
            base
              ? base.diff
              : 0,

          basePts:
            base
              ? base.pts
              : 0,

          diff: 0,
          bonus: 0,

          pts:
            base
              ? base.pts
              : 0
        }
      );
    }

    return teams.get(key);
  }

  // ----------------------------------------------------------
  // EQUIPOS BASE
  // ----------------------------------------------------------

  for (
    const base of
      content.standingsBase ||
    []
  ) {
    ensureTeam(
      base.team
    );
  }

  // ----------------------------------------------------------
  // EQUIPOS DE FIXTURES
  // ----------------------------------------------------------

  for (
    const fixture of
      content.fixtures ||
    []
  ) {
    if (
      !isTop14(fixture)
    ) {
      continue;
    }

    ensureTeam(
      fixture.home ||
        fixture.team1 ||
        fixture.local
    );

    ensureTeam(
      fixture.away ||
        fixture.team2 ||
        fixture.visitante
    );
  }

  // ----------------------------------------------------------
  // RESULTADOS
  // ----------------------------------------------------------

  for (
    const result of
      content.results ||
    []
  ) {
    if (
      String(
        result.competition ||
          ""
      )
        .trim()
        .toUpperCase() !==
      "URBA TOP 14"
    ) {
      continue;
    }

    const home =
      ensureTeam(
        result.home
      );

    const away =
      ensureTeam(
        result.away
      );

    if (
      !home ||
      !away
    ) {
      continue;
    }

    const homeScore =
      Number(
        result.homeScore
      );

    const awayScore =
      Number(
        result.awayScore
      );

    if (
      !Number.isInteger(
        homeScore
      ) ||
      !Number.isInteger(
        awayScore
      )
    ) {
      continue;
    }

    home.pj++;
    away.pj++;

    home.pf +=
      homeScore;

    home.pc +=
      awayScore;

    away.pf +=
      awayScore;

    away.pc +=
      homeScore;

    if (
      homeScore >
      awayScore
    ) {
      home.pg++;
      away.pp++;

      home.pts += 4;
    } else if (
      homeScore <
      awayScore
    ) {
      away.pg++;
      home.pp++;

      away.pts += 4;
    } else {
      home.pe++;
      away.pe++;

      home.pts += 2;
      away.pts += 2;
    }

    const bonus = normalizeTeamKey(result.bonusTeam || "");

    if (
      bonus &&
      bonus === normalizeTeamKey(home.team)
    ) {
      home.bonus++;
      home.pts++;
    }

    if (
      bonus &&
      bonus === normalizeTeamKey(away.team)
    ) {
      away.bonus++;
      away.pts++;
    }
  }

  // ----------------------------------------------------------
  // DIFERENCIA
  // ----------------------------------------------------------

  for (
    const team of
      teams.values()
  ) {
    team.diff =
      team.baseDiff +
      (team.pf - team.pc);
  }

  // ----------------------------------------------------------
  // ORDEN
  // ----------------------------------------------------------

  return [
    ...teams.values()
  ]
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.diff - a.diff ||
        b.pf - a.pf ||
        a.team.localeCompare(
          b.team,
          "es"
        )
    )
    .map(
      (
        team,
        index
      ) => ({
        position:
          index + 1,

        team:
          team.team,

        pj:
          team.pj,

        pg:
          team.pg,

        pe:
          team.pe,

        pp:
          team.pp,

        pf:
          team.pf,

        pc:
          team.pc,

        diff:
          team.diff,

        bonus:
          team.bonus,

        pts:
          team.pts
      })
    );
} 
 

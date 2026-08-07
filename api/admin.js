// ============================================================
// DROPRUGBY - API ADMIN
// /api/admin.js
// ============================================================

import { list, put } from "@vercel/blob";
import crypto from "node:crypto";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const BLOB_PATH = "droprugby/content.json";
const COOKIE_NAME = "droprugby_session";
const MAX_AGE = 60 * 60 * 24 * 7;

const DEFAULT_CONTENT = {
  articles: [],
  fixtures: [],
  standings: [],
  players: [],
  instagram: [],
  trash: [],
  history: [],
  settings: {
    siteName: "DropRugby",
    description: "Noticias de rugby",
  },
};

// ============================================================
// UTILIDADES
// ============================================================

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "Falta ADMIN_SESSION_SECRET en Environment Variables"
    );
  }

  return secret;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};

  header.split(";").forEach((item) => {
    const index = item.indexOf("=");

    if (index === -1) return;

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  });

  return cookies;
}

function json(res, status, data) {
  return res.status(status).json(data);
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
      } catch {
        reject(new Error("JSON inválido"));
      }
    });

    req.on("error", reject);
  });
}

// ============================================================
// SESIONES
// ============================================================

function createSession(username) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${username}.${timestamp}`;

  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");

  return Buffer.from(
    `${payload}.${signature}`
  ).toString("base64url");
}

function verifySession(token) {
  try {
    if (!token) return null;

    const decoded = Buffer.from(
      token,
      "base64url"
    ).toString("utf8");

    const parts = decoded.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const username = parts[0];
    const timestamp = Number(parts[1]);
    const signature = parts[2];

    if (!username || !timestamp || !signature) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    if (now - timestamp > MAX_AGE) {
      return null;
    }

    if (timestamp > now + 60) {
      return null;
    }

    const payload = `${username}.${timestamp}`;

    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");

    if (signature.length !== expected.length) {
      return null;
    }

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );

    if (!valid) {
      return null;
    }

    return {
      username,
      timestamp,
    };
  } catch {
    return null;
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

function requireAuth(req, res) {
  const cookies = parseCookies(req);

  const session = verifySession(
    cookies[COOKIE_NAME]
  );

  if (!session) {
    json(res, 401, {
      ok: false,
      error: "No autorizado",
    });

    return null;
  }

  return session;
}

// ============================================================
// LOGIN
// ============================================================

function checkLogin(username, password) {
  const adminUser =
    process.env.ADMIN_USER || "admin";

  const adminPassword =
    process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error(
      "Falta ADMIN_PASSWORD en Environment Variables"
    );
  }

  return (
    username === adminUser &&
    password === adminPassword
  );
}

// ============================================================
// IDS
// ============================================================

function createId(prefix = "item") {
  return `${prefix}_${Date.now()}_${crypto
    .randomBytes(4)
    .toString("hex")}`;
}

// ============================================================
// BLOB
// ============================================================

async function findContentBlob() {
  const result = await list({
    prefix: BLOB_PATH,
  });

  const blob = result.blobs?.find(
    (item) => item.pathname === BLOB_PATH
  );

  return blob || null;
}

async function loadContent() {
  const blob = await findContentBlob();

  if (!blob) {
    return structuredClone(DEFAULT_CONTENT);
  }

  const response = await fetch(blob.url);

  if (!response.ok) {
    throw new Error(
      `No se pudo leer content.json (${response.status})`
    );
  }

  const data = await response.json();

  return normalizeContent(data);
}

function normalizeContent(data) {
  const content =
    data && typeof data === "object"
      ? data
      : {};

  return {
    ...structuredClone(DEFAULT_CONTENT),
    ...content,

    articles: Array.isArray(content.articles)
      ? content.articles
      : [],

    fixtures: Array.isArray(content.fixtures)
      ? content.fixtures
      : [],

    standings: Array.isArray(content.standings)
      ? content.standings
      : [],

    players: Array.isArray(content.players)
      ? content.players
      : [],

    instagram: Array.isArray(content.instagram)
      ? content.instagram
      : [],

    trash: Array.isArray(content.trash)
      ? content.trash
      : [],

    history: Array.isArray(content.history)
      ? content.history
      : [],

    settings: {
      ...DEFAULT_CONTENT.settings,
      ...(content.settings || {}),
    },
  };
}

async function saveContent(content) {
  const normalized = normalizeContent(content);

  normalized.updatedAt =
    new Date().toISOString();

  const blob = await put(
    BLOB_PATH,
    JSON.stringify(normalized, null, 2),
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    }
  );

  return {
    content: normalized,
    blob,
  };
}

// ============================================================
// HISTORIAL
// ============================================================

function addHistory(
  content,
  action,
  type,
  item = null
) {
  if (!Array.isArray(content.history)) {
    content.history = [];
  }

  content.history.unshift({
    id: createId("history"),
    action,
    type,
    itemId: item?.id || null,

    title:
      item?.title ||
      item?.name ||
      item?.team ||
      item?.player ||
      null,

    date: new Date().toISOString(),
  });

  content.history =
    content.history.slice(0, 300);
}

// ============================================================
// PAPELERA
// ============================================================

function moveToTrash(
  content,
  type,
  item
) {
  if (!Array.isArray(content.trash)) {
    content.trash = [];
  }

  content.trash.unshift({
    id: createId("trash"),
    originalId: item.id,
    type,
    item,
    deletedAt: new Date().toISOString(),
  });
}

// ============================================================
// SEGURIDAD HTML
// ============================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

// ============================================================
// RESEND
// ============================================================

async function sendNewsletter({
  subject,
  html,
  text,
}) {
  const apiKey =
    process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Falta RESEND_API_KEY en Environment Variables"
    );
  }

  const from =
    process.env.RESEND_FROM_EMAIL ||
    "DropRugby <newsletter@droprugby.com>";

  const audienceId =
    process.env.RESEND_AUDIENCE_ID;

  if (!audienceId) {
    throw new Error(
      "Falta RESEND_AUDIENCE_ID en Environment Variables"
    );
  }

  const contactsResponse =
    await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

  const contactsData =
    await contactsResponse.json();

  if (!contactsResponse.ok) {
    throw new Error(
      contactsData?.message ||
        "No se pudieron obtener los contactos"
    );
  }

  const contacts =
    contactsData?.data || [];

  const emails = contacts
    .filter(
      (contact) =>
        contact.email &&
        contact.unsubscribed !== true
    )
    .map(
      (contact) => contact.email
    );

  if (!emails.length) {
    return {
      sent: 0,
      total: 0,
      errors: [],
      message:
        "No hay suscriptores activos",
    };
  }

  let sent = 0;
  const errors = [];

  const chunkSize = 50;

  for (
    let i = 0;
    i < emails.length;
    i += chunkSize
  ) {
    const chunk =
      emails.slice(
        i,
        i + chunkSize
      );

    const response =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            from,
            to: chunk,
            subject,
            html,

            text:
              text ||
              "Nueva noticia de DropRugby.",
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      errors.push(
        data?.message ||
          "Error enviando newsletter"
      );
    } else {
      sent += chunk.length;
    }
  }

  return {
    sent,
    total: emails.length,
    errors,
  };
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
    // CORS
    // ========================================================

    const origin =
      req.headers.origin;

    if (origin) {
      res.setHeader(
        "Access-Control-Allow-Origin",
        origin
      );
    }

    res.setHeader(
      "Access-Control-Allow-Credentials",
      "true"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    // ========================================================
    // GET
    // ========================================================

    if (req.method === "GET") {
      const action =
        req.query?.action;

      // SESSION

      if (
        action === "session" ||
        action === "check-session" ||
        action === "me"
      ) {
        const cookies =
          parseCookies(req);

        const session =
          verifySession(
            cookies[COOKIE_NAME]
          );

        if (!session) {
          return json(res, 401, {
            ok: false,
            authenticated: false,
          });
        }

        return json(res, 200, {
          ok: true,
          authenticated: true,
          user: session.username,
        });
      }

      // CONTENIDO

      const session =
        requireAuth(req, res);

      if (!session) return;

      const content =
        await loadContent();

      return json(res, 200, {
        ok: true,
        content,
      });
    }

    // ========================================================
    // POST
    // ========================================================

    if (req.method === "POST") {
      const body =
        await getBody(req);

      const action =
        body.action ||
        req.query?.action ||
        "save";

      // ======================================================
      // LOGIN
      // ======================================================

      if (
        action === "login" ||
        action === "authenticate"
      ) {
        const username =
          String(
            body.username || ""
          ).trim();

        const password =
          String(
            body.password || ""
          );

        if (!username || !password) {
          return json(res, 400, {
            ok: false,
            error:
              "Usuario y contraseña requeridos",
          });
        }

        if (
          !checkLogin(
            username,
            password
          )
        ) {
          return json(res, 401, {
            ok: false,
            error:
              "Usuario o contraseña incorrectos",
          });
        }

        const token =
          createSession(username);

        setCookie(res, token);

        return json(res, 200, {
          ok: true,
          authenticated: true,
          user: username,
        });
      }

      // ======================================================
      // LOGOUT
      // ======================================================

      if (
        action === "logout" ||
        action === "signout"
      ) {
        clearCookie(res);

        return json(res, 200, {
          ok: true,
          authenticated: false,
        });
      }

      // ======================================================
      // AUTH PARA TODO LO DEMÁS
      // ======================================================

      const session =
        requireAuth(req, res);

      if (!session) return;

      // ======================================================
      // LOAD
      // ======================================================

      if (
        action === "get" ||
        action === "load"
      ) {
        const content =
          await loadContent();

        return json(res, 200, {
          ok: true,
          content,
        });
      }

      // ======================================================
      // SAVE ALL
      // ======================================================

      if (
        action === "save" ||
        action === "save-all" ||
        action === "update"
      ) {
        const current =
          await loadContent();

        const content =
          body.content
            ? body.content
            : {
                articles:
                  body.articles ??
                  current.articles,

                fixtures:
                  body.fixtures ??
                  current.fixtures,

                standings:
                  body.standings ??
                  current.standings,

                players:
                  body.players ??
                  current.players,

                instagram:
                  body.instagram ??
                  current.instagram,

                trash:
                  body.trash ??
                  current.trash,

                history:
                  body.history ??
                  current.history,

                settings:
                  body.settings ??
                  current.settings,
              };

        const merged = {
          ...current,
          ...content,
        };

        addHistory(
          merged,
          "update",
          "content"
        );

        const saved =
          await saveContent(
            merged
          );

        return json(res, 200, {
          ok: true,
          content:
            saved.content,
        });
      }

      // ======================================================
      // ARTÍCULOS
      // ======================================================

      if (
        action === "create-article" ||
        action === "add-article" ||
        action === "article-create"
      ) {
        const content =
          await loadContent();

        const source =
          body.article || body;

        const article = {
          id:
            source.id ||
            createId("article"),

          title:
            source.title || "",

          slug:
            source.slug ||
            String(
              source.title || ""
            )
              .toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-"),

          excerpt:
            source.excerpt || "",

          content:
            source.content ||
            source.contentText ||
            source.text ||
            "",

          image:
            source.image || "",

          category:
            source.category ||
            "Rugby",

          author:
            source.author ||
            "DropRugby",

          date:
            source.date ||
            new Date().toISOString(),

          featured:
            source.featured ?? false,

          published:
            source.published ?? true,

          tags:
            Array.isArray(
              source.tags
            )
              ? source.tags
              : typeof source.tags ===
                "string"
              ? source.tags
                  .split(",")
                  .map((tag) =>
                    tag.trim()
                  )
                  .filter(Boolean)
              : [],

          createdAt:
            source.createdAt ||
            new Date().toISOString(),

          updatedAt:
            new Date().toISOString(),
        };

        const index =
          content.articles.findIndex(
            (item) =>
              item.id === article.id
          );

        if (index >= 0) {
          content.articles[index] = {
            ...content.articles[index],
            ...article,
            updatedAt:
              new Date().toISOString(),
          };

          addHistory(
            content,
            "edit",
            "article",
            article
          );
        } else {
          content.articles.unshift(
            article
          );

          addHistory(
            content,
            "create",
            "article",
            article
          );
        }

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          article,
          content:
            saved.content,
        });
      }

      // DELETE ARTICLE

      if (
        action === "delete-article" ||
        action === "remove-article"
      ) {
        const content =
          await loadContent();

        const id =
          body.id ||
          body.articleId;

        const index =
          content.articles.findIndex(
            (item) =>
              item.id === id
          );

        if (index === -1) {
          return json(res, 404, {
            ok: false,
            error:
              "Noticia no encontrada",
          });
        }

        const [article] =
          content.articles.splice(
            index,
            1
          );

        moveToTrash(
          content,
          "article",
          article
        );

        addHistory(
          content,
          "delete",
          "article",
          article
        );

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          content:
            saved.content,
        });
      }

      // ======================================================
      // PARTIDOS
      // ======================================================

      if (
        action === "create-fixture" ||
        action === "add-fixture" ||
        action === "fixture-create"
      ) {
        const content =
          await loadContent();

        const fixture = {
          ...(body.fixture || body),
        };

        delete fixture.action;

        fixture.id =
          fixture.id ||
          createId("fixture");

        fixture.createdAt =
          fixture.createdAt ||
          new Date().toISOString();

        fixture.updatedAt =
          new Date().toISOString();

        const index =
          content.fixtures.findIndex(
            (item) =>
              item.id ===
              fixture.id
          );

        if (index >= 0) {
          content.fixtures[index] = {
            ...content.fixtures[index],
            ...fixture,
          };

          addHistory(
            content,
            "edit",
            "fixture",
            fixture
          );
        } else {
          content.fixtures.push(
            fixture
          );

          addHistory(
            content,
            "create",
            "fixture",
            fixture
          );
        }

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          fixture,
          content:
            saved.content,
        });
      }

      // DELETE FIXTURE

      if (
        action === "delete-fixture" ||
        action === "remove-fixture"
      ) {
        const content =
          await loadContent();

        const id =
          body.id ||
          body.fixtureId;

        const index =
          content.fixtures.findIndex(
            (item) =>
              item.id === id
          );

        if (index === -1) {
          return json(res, 404, {
            ok: false,
            error:
              "Partido no encontrado",
          });
        }

        const [fixture] =
          content.fixtures.splice(
            index,
            1
          );

        moveToTrash(
          content,
          "fixture",
          fixture
        );

        addHistory(
          content,
          "delete",
          "fixture",
          fixture
        );

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          content:
            saved.content,
        });
      }

      // ======================================================
      // EQUIPOS
      // ======================================================

      if (
        action === "create-team" ||
        action === "add-team" ||
        action === "team-create" ||
        action === "save-team"
      ) {
        const content =
          await loadContent();

        const team = {
          ...(body.team || body),
        };

        delete team.action;

        team.id =
          team.id ||
          createId("team");

        const index =
          content.standings.findIndex(
            (item) =>
              item.id === team.id
          );

        if (index >= 0) {
          content.standings[index] = {
            ...content.standings[index],
            ...team,
          };

          addHistory(
            content,
            "edit",
            "team",
            team
          );
        } else {
          content.standings.push(team);

          addHistory(
            content,
            "create",
            "team",
            team
          );
        }

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          team,
          content:
            saved.content,
        });
      }

      // DELETE TEAM

      if (
        action === "delete-team" ||
        action === "remove-team"
      ) {
        const content =
          await loadContent();

        const id =
          body.id ||
          body.teamId;

        const index =
          content.standings.findIndex(
            (item) =>
              item.id === id
          );

        if (index === -1) {
          return json(res, 404, {
            ok: false,
            error:
              "Equipo no encontrado",
          });
        }

        const [team] =
          content.standings.splice(
            index,
            1
          );

        moveToTrash(
          content,
          "team",
          team
        );

        addHistory(
          content,
          "delete",
          "team",
          team
        );

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          content:
            saved.content,
        });
      }

      // ======================================================
      // JUGADORES
      // ======================================================

      if (
        action === "create-player" ||
        action === "add-player" ||
        action === "player-create"
      ) {
        const content =
          await loadContent();

        const player = {
          ...(body.player || body),
        };

        delete player.action;

        player.id =
          player.id ||
          createId("player");

        player.updatedAt =
          new Date().toISOString();

        const index =
          content.players.findIndex(
            (item) =>
              item.id ===
              player.id
          );

        if (index >= 0) {
          content.players[index] = {
            ...content.players[index],
            ...player,
          };

          addHistory(
            content,
            "edit",
            "player",
            player
          );
        } else {
          content.players.push(
            player
          );

          addHistory(
            content,
            "create",
            "player",
            player
          );
        }

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          player,
          content:
            saved.content,
        });
      }

      // DELETE PLAYER

      if (
        action === "delete-player" ||
        action === "remove-player"
      ) {
        const content =
          await loadContent();

        const id =
          body.id ||
          body.playerId;

        const index =
          content.players.findIndex(
            (item) =>
              item.id === id
          );

        if (index === -1) {
          return json(res, 404, {
            ok: false,
            error:
              "Jugador no encontrado",
          });
        }

        const [player] =
          content.players.splice(
            index,
            1
          );

        moveToTrash(
          content,
          "player",
          player
        );

        addHistory(
          content,
          "delete",
          "player",
          player
        );

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          content:
            saved.content,
        });
      }

      // ======================================================
      // INSTAGRAM
      // ======================================================

      if (
        action === "save-instagram" ||
        action === "create-instagram" ||
        action === "add-instagram"
      ) {
        const content =
          await loadContent();

        const post = {
          ...(body.post ||
            body.instagram ||
            body),
        };

        delete post.action;

        post.id =
          post.id ||
          createId("instagram");

        post.updatedAt =
          new Date().toISOString();

        const index =
          content.instagram.findIndex(
            (item) =>
              item.id === post.id
          );

        if (index >= 0) {
          content.instagram[index] = {
            ...content.instagram[index],
            ...post,
          };

          addHistory(
            content,
            "edit",
            "instagram",
            post
          );
        } else {
          content.instagram.unshift(
            post
          );

          addHistory(
            content,
            "create",
            "instagram",
            post
          );
        }

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          post,
          content:
            saved.content,
        });
      }

      // DELETE INSTAGRAM

      if (
        action === "delete-instagram" ||
        action === "remove-instagram"
      ) {
        const content =
          await loadContent();

        const id =
          body.id ||
          body.postId;

        const index =
          content.instagram.findIndex(
            (item) =>
              item.id === id
          );

        if (index === -1) {
          return json(res, 404, {
            ok: false,
            error:
              "Publicación no encontrada",
          });
        }

        const [post] =
          content.instagram.splice(
            index,
            1
          );

        moveToTrash(
          content,
          "instagram",
          post
        );

        addHistory(
          content,
          "delete",
          "instagram",
          post
        );

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          content:
            saved.content,
        });
      }

      // ======================================================
      // RESTAURAR
      // ======================================================

      if (
        action === "restore" ||
        action === "restore-item"
      ) {
        const content =
          await loadContent();

        const trashId =
          body.id ||
          body.trashId;

        const index =
          content.trash.findIndex(
            (item) =>
              item.id === trashId
          );

        if (index === -1) {
          return json(res, 404, {
            ok: false,
            error:
              "Elemento no encontrado en papelera",
          });
        }

        const [deleted] =
          content.trash.splice(
            index,
            1
          );

        const type =
          deleted.type;

        const item =
          deleted.item;

        if (type === "article") {
          content.articles.unshift(item);
        } else if (type === "fixture") {
          content.fixtures.push(item);
        } else if (type === "team") {
          content.standings.push(item);
        } else if (type === "player") {
          content.players.push(item);
        } else if (type === "instagram") {
          content.instagram.unshift(item);
        }

        addHistory(
          content,
          "restore",
          type,
          item
        );

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          content:
            saved.content,
        });
      }

      // ======================================================
      // ELIMINAR DEFINITIVAMENTE
      // ======================================================

      if (
        action === "permanent-delete" ||
        action === "delete-trash"
      ) {
        const content =
          await loadContent();

        const trashId =
          body.id ||
          body.trashId;

        const index =
          content.trash.findIndex(
            (item) =>
              item.id === trashId
          );

        if (index === -1) {
          return json(res, 404, {
            ok: false,
            error:
              "Elemento no encontrado",
          });
        }

        const [deleted] =
          content.trash.splice(
            index,
            1
          );

        addHistory(
          content,
          "permanent-delete",
          deleted.type,
          deleted.item
        );

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          content:
            saved.content,
        });
      }

      // ======================================================
      // VACIAR PAPELERA
      // ======================================================

      if (
        action === "empty-trash" ||
        action === "clear-trash"
      ) {
        const content =
          await loadContent();

        const count =
          content.trash.length;

        content.trash = [];

        addHistory(
          content,
          "empty-trash",
          "trash",
          {
            name:
              `${count} elementos`,
          }
        );

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          deleted: count,
          content:
            saved.content,
        });
      }

      // ======================================================
      // LIMPIAR HISTORIAL
      // ======================================================

      if (
        action === "clear-history"
      ) {
        const content =
          await loadContent();

        content.history = [];

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          content:
            saved.content,
        });
      }

      // ======================================================
      // NEWSLETTER DE NOTICIA
      // ======================================================

      if (
        action === "send-newsletter" ||
        action === "newsletter" ||
        action ===
          "send-newsletter-article"
      ) {
        let article =
          body.article || null;

        if (
          !article &&
          body.articleId
        ) {
          const content =
            await loadContent();

          article =
            content.articles.find(
              (item) =>
                item.id ===
                body.articleId
            );
        }

        if (!article) {
          return json(res, 404, {
            ok: false,
            error:
              "No se encontró la noticia",
          });
        }

        const subject =
          body.subject ||
          `📰 ${article.title}`;

        const siteUrl =
          process.env.SITE_URL ||
          "https://drop-rugby.vercel.app";

        const articleUrl =
          article.slug
            ? `${siteUrl}/noticia.html?slug=${encodeURIComponent(
                article.slug
              )}`
            : siteUrl;

        const safeTitle =
          escapeHtml(article.title);

        const safeExcerpt =
          escapeHtml(
            article.excerpt ||
              ""
          );

        const safeImage =
          escapeAttribute(
            article.image ||
              ""
          );

        const safeUrl =
          escapeAttribute(
            articleUrl
          );

        const imageHtml =
          article.image
            ? `
              <img
                src="${safeImage}"
                alt="${safeTitle}"
                style="
                  width:100%;
                  max-width:650px;
                  display:block;
                  margin:0 auto 25px;
                  border-radius:8px;
                "
              >
            `
            : "";

        const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#111111;
  font-family:Arial,Helvetica,sans-serif;
  color:#ffffff;
">

<div style="
  max-width:700px;
  margin:0 auto;
  padding:40px 20px;
">

  <div style="
    font-size:28px;
    font-weight:900;
    margin-bottom:35px;
  ">
    DROP<span style="color:#c9ff00;">RUGBY</span>
  </div>

  ${imageHtml}

  <div style="
    font-size:12px;
    font-weight:bold;
    letter-spacing:2px;
    color:#c9ff00;
    margin-bottom:12px;
  ">
    NUEVA NOTICIA
  </div>

  <h1 style="
    font-size:32px;
    line-height:1.15;
    margin:0 0 20px;
    color:#ffffff;
  ">
    ${safeTitle}
  </h1>

  ${
    safeExcerpt
      ? `
        <p style="
          font-size:17px;
          line-height:1.6;
          color:#cccccc;
        ">
          ${safeExcerpt}
        </p>
      `
      : ""
  }

  <a
    href="${safeUrl}"
    style="
      display:inline-block;
      margin-top:20px;
      padding:15px 24px;
      background:#c9ff00;
      color:#000000;
      text-decoration:none;
      font-weight:800;
      border-radius:5px;
    "
  >
    LEER NOTICIA →
  </a>

  <div style="
    margin-top:50px;
    padding-top:20px;
    border-top:1px solid #333333;
    font-size:12px;
    color:#777777;
  ">
    DropRugby · Noticias de rugby
  </div>

</div>

</body>
</html>
        `;

        const result =
          await sendNewsletter({
            subject,
            html,
            text:
              article.excerpt ||
              article.title,
          });

        return json(res, 200, {
          ok: true,
          newsletter: result,
        });
      }

      // ======================================================
      // NEWSLETTER PERSONALIZADO
      // ======================================================

      if (
        action ===
        "send-custom-newsletter"
      ) {
        if (!body.subject) {
          return json(res, 400, {
            ok: false,
            error:
              "Falta el asunto del newsletter",
          });
        }

        if (!body.html) {
          return json(res, 400, {
            ok: false,
            error:
              "Falta el contenido HTML",
          });
        }

        const result =
          await sendNewsletter({
            subject:
              body.subject,

            html:
              body.html,

            text:
              body.text,
          });

        return json(res, 200, {
          ok: true,
          newsletter: result,
        });
      }

      // ======================================================
      // SETTINGS
      // ======================================================

      if (
        action === "save-settings" ||
        action === "update-settings"
      ) {
        const content =
          await loadContent();

        const settings =
          body.settings || {};

        content.settings = {
          ...content.settings,
          ...settings,
        };

        addHistory(
          content,
          "update",
          "settings"
        );

        const saved =
          await saveContent(
            content
          );

        return json(res, 200, {
          ok: true,
          settings:
            saved.content.settings,

          content:
            saved.content,
        });
      }

      // ======================================================
      // ACCIÓN DESCONOCIDA
      // ======================================================

      return json(res, 400, {
        ok: false,
        error:
          `Acción desconocida: ${action}`,
      });
    }

    // ========================================================
    // DELETE
    // ========================================================

    if (req.method === "DELETE") {
      const session =
        requireAuth(req, res);

      if (!session) return;

      const body =
        await getBody(req);

      const content =
        await loadContent();

      const type = body.type;
      const id = body.id;

      if (!type || !id) {
        return json(res, 400, {
          ok: false,
          error:
            "Se requiere type e id",
        });
      }

      const collections = {
        article: "articles",
        articles: "articles",

        fixture: "fixtures",
        fixtures: "fixtures",

        team: "standings",
        standings: "standings",

        player: "players",
        players: "players",

        instagram: "instagram",
      };

      const collectionName =
        collections[type];

      if (!collectionName) {
        return json(res, 400, {
          ok: false,
          error:
            "Tipo de contenido inválido",
        });
      }

      const collection =
        content[collectionName];

      const index =
        collection.findIndex(
          (item) =>
            item.id === id
        );

      if (index === -1) {
        return json(res, 404, {
          ok: false,
          error:
            "Elemento no encontrado",
        });
      }

      const [item] =
        collection.splice(
          index,
          1
        );

      moveToTrash(
        content,
        type,
        item
      );

      addHistory(
        content,
        "delete",
        type,
        item
      );

      const saved =
        await saveContent(
          content
        );

      return json(res, 200, {
        ok: true,
        content:
          saved.content,
      });
    }

    // ========================================================
    // MÉTODO NO PERMITIDO
    // ========================================================

    return json(res, 405, {
      ok: false,
      error:
        "Método no permitido",
    });

  } catch (error) {
    console.error(
      "❌ ERROR API ADMIN:",
      error
    );

    return json(res, 500, {
      ok: false,
      error:
        error?.message ||
        "Error interno del servidor",
    });
  }
}

import {
  r2List,
  r2PutBuffer,
  r2Delete,
  r2KeyFromUrl
} from "../lib/r2.js";
import crypto from "node:crypto";

/* =========================================================
   DROPRUGBY MEDIA API
   /api/media.js
========================================================= */

const PREFIX = "droprugby/media/";
const COOKIE_NAME = "droprugby_session";

const MAX_AGE =
  60 * 60 * 24 * 7;

const MAX_BYTES =
  6 * 1024 * 1024;

const MAX_REQUEST_BYTES =
  9 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml"
  ]);

/* =========================================================
   SECRET
========================================================= */

function getSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "droprugby-secret-change-this"
  );
}

/* =========================================================
   JSON
========================================================= */

function json(
  res,
  status,
  data
) {
  return res
    .status(status)
    .json(data);
}

/* =========================================================
   COOKIES
========================================================= */

function parseCookies(req) {
  const header =
    req.headers.cookie || "";

  const cookies = {};

  header
    .split(";")
    .forEach((part) => {
      const index =
        part.indexOf("=");

      if (index === -1) {
        return;
      }

      const key =
        part
          .slice(0, index)
          .trim();

      const value =
        part
          .slice(index + 1)
          .trim();

      try {
        cookies[key] =
          decodeURIComponent(
            value
          );
      } catch {
        cookies[key] = value;
      }
    });

  return cookies;
}

/* =========================================================
   SESSION
========================================================= */

function validToken(req) {
  try {
    const token =
      parseCookies(req)[
        COOKIE_NAME
      ];

    if (!token) {
      return false;
    }

    const parts =
      token.split(".");

    if (
      parts.length !== 3
    ) {
      return false;
    }

    const timestamp =
      Number(parts[0]);

    if (
      !Number.isFinite(
        timestamp
      )
    ) {
      return false;
    }

    const age =
      Date.now() -
      timestamp;

    if (
      age < 0 ||
      age >
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

    const a =
      Buffer.from(
        parts[2]
      );

    const b =
      Buffer.from(
        expected
      );

    return (
      a.length ===
        b.length &&
      crypto.timingSafeEqual(
        a,
        b
      )
    );
  } catch {
    return false;
  }
}

/* =========================================================
   BODY
========================================================= */

async function getBody(req) {
  if (
    req.body &&
    typeof req.body ===
      "object" &&
    !Buffer.isBuffer(req.body)
  ) {
    return req.body;
  }

  return new Promise(
    (resolve, reject) => {
      let raw = "";
      let settled = false;

      req.on(
        "data",
        (chunk) => {
          if (settled) {
            return;
          }

          raw += chunk;

          if (
            raw.length >
            MAX_REQUEST_BYTES
          ) {
            settled = true;

            reject(
              new Error(
                "Payload demasiado grande."
              )
            );

            try {
              req.destroy();
            } catch {}
          }
        }
      );

      req.on(
        "end",
        () => {
          if (settled) {
            return;
          }

          settled = true;

          if (!raw) {
            resolve({});
            return;
          }

          try {
            resolve(
              JSON.parse(raw)
            );
          } catch {
            reject(
              new Error(
                "El cuerpo de la solicitud no es JSON válido."
              )
            );
          }
        }
      );

      req.on(
        "error",
        (error) => {
          if (settled) {
            return;
          }

          settled = true;
          reject(error);
        }
      );
    }
  );
}

/* =========================================================
   LISTADO COMPLETO
========================================================= */

async function listAllMedia() {
  const items = await r2List(PREFIX);

  return items.sort(
    (a, b) =>
      String(
        b.uploadedAt || ""
      ).localeCompare(
        String(
          a.uploadedAt || ""
        )
      )
  );
}

/* =========================================================
   SAFE FILENAME
========================================================= */

function safeFilename(
  name
) {
  const cleaned =
    String(
      name || "imagen"
    )
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^[-.]+|[-.]+$/g,
        ""
      )
      .slice(0, 100);

  return (
    cleaned ||
    "imagen"
  );
}

/* =========================================================
   CONTENT TYPE
========================================================= */

function normalizeContentType(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

/* =========================================================
   BASE64
========================================================= */

function decodeBase64(
  value
) {
  let base64 =
    String(value || "")
      .trim();

  if (
    base64.startsWith(
      "data:"
    )
  ) {
    const comma =
      base64.indexOf(",");

    if (comma === -1) {
      throw new Error(
        "La imagen base64 no es válida."
      );
    }

    base64 =
      base64.slice(
        comma + 1
      );
  }

  base64 =
    base64.replace(
     (/\s/g),
      ""
    );

  if (!base64) {
    throw new Error(
      "No se recibió información de imagen."
    );
  }

  if (
    !/^[A-Za-z0-9+/]*={0,2}$/.test(
      base64
    )
  ) {
    throw new Error(
      "La imagen base64 no es válida."
    );
  }

  if (
    base64.length % 4 ===
    1
  ) {
    throw new Error(
      "La imagen base64 está incompleta."
    );
  }

  return Buffer.from(
    base64,
    "base64"
  );
}

/* =========================================================
   UPLOAD
========================================================= */

async function uploadImage(
  body
) {
  const contentType =
    normalizeContentType(
      body.contentType
    );

  const filename =
    safeFilename(
      body.filename ||
      "imagen"
    );

  if (
    !ALLOWED_TYPES.has(
      contentType
    )
  ) {
    throw new Error(
      "Formato no permitido. Usá JPG, PNG, WEBP, GIF o SVG."
    );
  }

  if (!body.base64) {
    throw new Error(
      "No se recibió la imagen."
    );
  }

  const buffer =
    decodeBase64(
      body.base64
    );

  if (!buffer.length) {
    throw new Error(
      "La imagen está vacía."
    );
  }

  if (
    buffer.length >
    MAX_BYTES
  ) {
    throw new Error(
      "La imagen supera el límite de 6 MB."
    );
  }

  /*
   * Generamos siempre un pathname único.
   * Así nunca se pisa una imagen anterior
   * aunque tenga el mismo nombre.
   */

  const pathname =
    `${PREFIX}` +
    `${Date.now()}-` +
    `${crypto
      .randomBytes(8)
      .toString("hex")}-` +
    `${filename}`;

  let blob;

  try {
    blob =
      await r2PutBuffer(
        pathname,
        buffer,
        contentType
      );
  } catch (error) {
    console.error(
      "❌ Cloudflare R2 upload error:",
      error
    );

    throw new Error(
      error?.message ||
      "No se pudo guardar la imagen en Cloudflare R2."
    );
  }

  if (
    !blob ||
    !blob.url
  ) {
    throw new Error(
      "Cloudflare R2 no devolvió una URL válida."
    );
  }

  return blob;
}

/* =========================================================
   DELETE
========================================================= */

async function deleteImage(
  url
) {
  const target =
    String(url || "")
      .trim();

  if (!target) {
    throw new Error(
      "Falta la imagen a eliminar."
    );
  }

  const key =
    r2KeyFromUrl(target);

  if (
    !key ||
    !key.startsWith(
      PREFIX
    )
  ) {
    throw new Error(
      "Imagen no encontrada en Media Manager."
    );
  }

  try {
    await r2Delete(
      key
    );
  } catch (error) {
    console.error(
      "❌ Cloudflare R2 delete error:",
      error
    );

    throw new Error(
      error?.message ||
      "No se pudo eliminar la imagen."
    );
  }

  return true;
}

/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {
  /*
   * El Media Manager solamente puede utilizarse
   * con una sesión válida del administrador.
   */

  if (!validToken(req)) {
    return json(
      res,
      401,
      {
        ok: false,
        error: "No autorizado."
      }
    );
  }

  try {
    /* =====================================================
       GET — LISTAR
    ===================================================== */

    if (
      req.method ===
      "GET"
    ) {
      const media =
        await listAllMedia();

      return json(
        res,
        200,
        {
          ok: true,
          media
        }
      );
    }

    /* =====================================================
       SOLO POST DESDE ACÁ
    ===================================================== */

    if (
      req.method !==
      "POST"
    ) {
      res.setHeader(
        "Allow",
        "GET, POST"
      );

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
      String(
        body.action || ""
      )
        .trim()
        .toLowerCase();

    /* =====================================================
       UPLOAD
    ===================================================== */

    if (
      action ===
      "upload"
    ) {
      const media =
        await uploadImage(
          body
        );

      return json(
        res,
        200,
        {
          ok: true,
          media
        }
      );
    }

    /* =====================================================
       DELETE
    ===================================================== */

    if (
      action ===
      "delete"
    ) {
      await deleteImage(
        body.url
      );

      return json(
        res,
        200,
        {
          ok: true
        }
      );
    }

    /* =====================================================
       ACCIÓN DESCONOCIDA
    ===================================================== */

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
      "❌ /api/media ERROR:",
      error
    );

    return json(
      res,
      500,
      {
        ok: false,
        error:
          error?.message ||
          "Error interno del Media Manager."
      }
    );
  }
}

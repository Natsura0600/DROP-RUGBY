// ============================================================
// DROPRUGBY - CLOUDFLARE R2
// /lib/r2.js
//
// Reemplaza a @vercel/blob. Usa el SDK de S3 (R2 es compatible
// con la API de S3). Requiere estas variables de entorno en
// Vercel:
//
//   R2_ACCOUNT_ID
//   R2_ACCESS_KEY_ID
//   R2_SECRET_ACCESS_KEY
//   R2_BUCKET_NAME
//   R2_PUBLIC_URL   (ej: https://pub-xxxxxxxx.r2.dev, sin barra al final)
// ============================================================

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";

/* =========================================================
   ENV
========================================================= */

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Configurala en Vercel (Settings → Environment Variables).`
    );
  }

  return value;
}

function getBucket() {
  return requireEnv("R2_BUCKET_NAME");
}

function getPublicBase() {
  return requireEnv("R2_PUBLIC_URL").replace(/\/+$/, "");
}

/* =========================================================
   CLIENTE (cacheado entre invocaciones)
========================================================= */

let cachedClient = null;

function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  return cachedClient;
}

/* =========================================================
   URLs
========================================================= */

export function r2PublicUrl(key) {
  return `${getPublicBase()}/${key}`;
}

// Dado un URL público, intenta recuperar el key del objeto.
// Devuelve null si el URL no pertenece a nuestro bucket público.
export function r2KeyFromUrl(url) {
  const base = getPublicBase();
  const clean = String(url || "").trim();

  if (clean.startsWith(`${base}/`)) {
    return clean.slice(base.length + 1);
  }

  return null;
}

/* =========================================================
   TIPO DE CONTENIDO POR EXTENSIÓN
   (ListObjectsV2 no devuelve Content-Type, así que lo
   inferimos por la extensión del archivo)
========================================================= */

const EXTENSION_TYPES = {
  webp: "image/webp",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif"
};

export function contentTypeFromKey(key) {
  const ext = String(key || "")
    .split(".")
    .pop()
    .toLowerCase();

  return EXTENSION_TYPES[ext] || "application/octet-stream";
}

/* =========================================================
   LEER TEXTO / JSON
========================================================= */

export async function r2GetText(key) {
  try {
    const client = getClient();

    const response = await client.send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: key
      })
    );

    return await response.Body.transformToString("utf-8");
  } catch (error) {
    if (
      error?.name === "NoSuchKey" ||
      error?.Code === "NoSuchKey" ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }

    throw error;
  }
}

export async function r2GetJSON(key) {
  const text = await r2GetText(key);

  if (text === null) {
    return null;
  }

  return JSON.parse(text);
}

/* =========================================================
   ESCRIBIR TEXTO / BUFFER
========================================================= */

export async function r2PutText(
  key,
  text,
  contentType = "application/json; charset=utf-8"
) {
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: text,
      ContentType: contentType,
      CacheControl: "no-store, no-cache, must-revalidate"
    })
  );
}

export async function r2PutBuffer(
  key,
  buffer,
  contentType,
  cacheControl = "public, max-age=31536000, immutable"
) {
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: cacheControl
    })
  );

  return {
    key,
    pathname: key,
    url: r2PublicUrl(key),
    size: buffer.length,
    contentType,
    uploadedAt: new Date().toISOString()
  };
}

/* =========================================================
   BORRAR
========================================================= */

export async function r2Delete(key) {
  const client = getClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key
    })
  );
}

/* =========================================================
   LISTAR (con paginación automática)
========================================================= */

export async function r2List(prefix) {
  const client = getClient();
  const items = [];

  let continuationToken;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: getBucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    );

    (response.Contents || []).forEach((item) => {
      if (!item.Key) return;

      items.push({
        key: item.Key,
        pathname: item.Key,
        size: item.Size || 0,
        contentType: contentTypeFromKey(item.Key),
        url: r2PublicUrl(item.Key),
        uploadedAt: item.LastModified
          ? new Date(item.LastModified).toISOString()
          : null
      });
    });

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return items;
}

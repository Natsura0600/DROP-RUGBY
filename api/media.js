import { list, put, del } from '@vercel/blob';
import crypto from 'node:crypto';

const PREFIX = 'droprugby/media/';
const INDEX_PATH = 'droprugby/media-index.json';
const COOKIE_NAME = 'droprugby_session';
const MAX_AGE = 60 * 60 * 24 * 7;
const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'droprugby-secret-change-this';
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index === -1) return;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try { cookies[key] = decodeURIComponent(value); } catch { cookies[key] = value; }
  });
  return cookies;
}

function validToken(req) {
  try {
    const token = parseCookies(req)[COOKIE_NAME];
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const timestamp = Number(parts[0]);
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > MAX_AGE * 1000) return false;
    const value = `${parts[0]}.${parts[1]}`;
    const expected = crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
    const a = Buffer.from(parts[2]);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function json(res, status, data) {
  return res.status(status).json(data);
}

async function getBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 10_000_000) reject(new Error('Payload demasiado grande.')); });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}


async function readMediaIndex() {
  try {
    const result = await list({ prefix: INDEX_PATH, limit: 10 });
    const blob = result.blobs?.find(item => item.pathname === INDEX_PATH);
    if (!blob?.url) return [];
    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) return [];
    const content = await response.json();
    return Array.isArray(content.media) ? content.media : [];
  } catch (error) {
    console.error('Media catalog read error:', error);
    return [];
  }
}

async function saveMediaIndex(media) {
  try {
    const result = await list({ prefix: INDEX_PATH, limit: 10 });
    const blob = result.blobs?.find(item => item.pathname === INDEX_PATH);
    let content = {};
    if (blob?.url) {
      const response = await fetch(blob.url, { cache: 'no-store' });
      if (response.ok) content = await response.json();
    }
    content = content && typeof content === 'object' ? content : {};
    content.media = media;
    await put(INDEX_PATH, JSON.stringify(content, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 0
    });
  } catch (error) {
    console.error('Media catalog save error:', error);
    throw new Error(`La imagen se subió, pero no se pudo guardar el índice: ${error?.message || 'error desconocido'}`);
  }
}

function safeFilename(name) {
  return String(name || 'imagen')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100) || 'imagen';
}

export default async function handler(req, res) {
  if (!validToken(req)) return json(res, 401, { ok: false, error: 'No autorizado.' });

  try {
    if (req.method === 'GET') {
      const result = await list({ prefix: PREFIX, limit: 1000 });
      const blobs = result.blobs
        .filter(item => item.contentType?.startsWith('image/'));
      const catalog = await readMediaIndex();
      const byUrl = new Map();
      [...catalog, ...blobs].forEach(item => {
        if (item?.url) byUrl.set(item.url, item);
      });
      const media = [...byUrl.values()]
        .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
      return json(res, 200, { ok: true, media });
    }

    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Método no permitido.' });

    const body = await getBody(req);
    const action = String(body.action || '');

    if (action === 'upload') {
      const contentType = String(body.contentType || '');
      const base64 = String(body.base64 || '');
      const filename = safeFilename(body.filename || 'imagen');
      if (!ALLOWED_TYPES.has(contentType)) return json(res, 400, { ok: false, error: 'Formato no permitido. Usá JPG, PNG, WEBP, GIF o SVG.' });
      if (!base64) return json(res, 400, { ok: false, error: 'No se recibió la imagen.' });

      const buffer = Buffer.from(base64, 'base64');
      if (!buffer.length) return json(res, 400, { ok: false, error: 'La imagen está vacía.' });
      if (buffer.length > MAX_BYTES) return json(res, 413, { ok: false, error: 'La imagen supera el límite de 6 MB.' });

      const pathname = `${PREFIX}${Date.now()}-${crypto.randomBytes(5).toString('hex')}-${filename}`;
      const blob = await put(pathname, buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType,
        cacheControlMaxAge: 31536000,
        allowOverwrite: false
      });

      const catalog = await readMediaIndex();
      const nextCatalog = [blob, ...catalog.filter(item => item?.url !== blob.url)];
      await saveMediaIndex(nextCatalog);

      return json(res, 200, { ok: true, media: blob });
    }

    if (action === 'delete') {
      const url = String(body.url || '');
      if (!url) return json(res, 400, { ok: false, error: 'Falta la imagen a eliminar.' });
      const result = await list({ prefix: PREFIX, limit: 1000 });
      const blob = result.blobs.find(item => item.url === url);
      if (!blob) return json(res, 404, { ok: false, error: 'Imagen no encontrada.' });
      await del(blob.url);
      const catalog = await readMediaIndex();
      await saveMediaIndex(catalog.filter(item => item?.url !== url));
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { ok: false, error: `Acción desconocida: ${action || '(vacía)'}` });
  } catch (error) {
    console.error('❌ /api/media ERROR:', error);
    return json(res, 500, { ok: false, error: error?.message || 'Error interno del Media Manager.' });
  }
}

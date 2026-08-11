import { list, put, del } from '@vercel/blob';
import crypto from 'node:crypto';

const PREFIX = 'droprugby/media/';
const COOKIE_NAME = 'droprugby_session';
const MAX_AGE = 60 * 60 * 24 * 7;

// Vercel Functions have a request-body limit. The browser compresses images
// before sending them, so keep the server limit conservative as well.
const MAX_BYTES = 3 * 1024 * 1024;

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
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
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
    if (!Number.isFinite(timestamp)) return false;
    if (Date.now() - timestamp > MAX_AGE * 1000) return false;
    if (Date.now() - timestamp < -60 * 1000) return false;

    const value = `${parts[0]}.${parts[1]}`;
    const expected = crypto
      .createHmac('sha256', getSecret())
      .update(value)
      .digest('hex');

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
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', chunk => {
      raw += chunk;

      // Stop reading an obviously oversized request early.
      if (raw.length > 4_200_000) {
        reject(new Error('Payload demasiado grande. La imagen debe ser más chica.'));
      }
    });

    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function safeFilename(name) {
  return String(name || 'imagen')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100) || 'imagen';
}

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export default async function handler(req, res) {
  if (!validToken(req)) {
    return json(res, 401, {
      ok: false,
      error: 'No autorizado. Volvé a iniciar sesión en el panel.'
    });
  }

  try {
    if (!hasBlobToken()) {
      return json(res, 500, {
        ok: false,
        error: 'Falta BLOB_READ_WRITE_TOKEN en las variables de entorno de Vercel.'
      });
    }

    if (req.method === 'GET') {
      const result = await list({
        prefix: PREFIX,
        limit: 1000
      });

      const media = result.blobs
        .filter(item => item.contentType?.startsWith('image/'))
        .sort(
          (a, b) =>
            new Date(b.uploadedAt || 0) -
            new Date(a.uploadedAt || 0)
        );

      return json(res, 200, {
        ok: true,
        media
      });
    }

    if (req.method !== 'POST') {
      return json(res, 405, {
        ok: false,
        error: 'Método no permitido.'
      });
    }

    const body = await getBody(req);
    const action = String(body.action || '');

    if (action === 'upload') {
      const contentType = String(body.contentType || '');
      const base64 = String(body.base64 || '');
      const filename = safeFilename(body.filename || 'imagen');

      if (!ALLOWED_TYPES.has(contentType)) {
        return json(res, 400, {
          ok: false,
          error: 'Formato no permitido. Usá JPG, PNG, WEBP, GIF o SVG.'
        });
      }

      if (!base64) {
        return json(res, 400, {
          ok: false,
          error: 'No se recibió la imagen.'
        });
      }

      // A base64 string is ~33% larger than the original binary.
      // Check its approximate decoded size before allocating the Buffer.
      const estimatedBytes = Math.floor((base64.length * 3) / 4);

      if (estimatedBytes > MAX_BYTES) {
        return json(res, 413, {
          ok: false,
          error: 'La imagen supera el límite de 3 MB. El panel intenta comprimirla automáticamente; si aparece este mensaje, elegí una imagen más chica.'
        });
      }

      let buffer;
      try {
        buffer = Buffer.from(base64, 'base64');
      } catch {
        return json(res, 400, {
          ok: false,
          error: 'La imagen no pudo ser decodificada.'
        });
      }

      if (!buffer.length) {
        return json(res, 400, {
          ok: false,
          error: 'La imagen está vacía.'
        });
      }

      if (buffer.length > MAX_BYTES) {
        return json(res, 413, {
          ok: false,
          error: 'La imagen supera el límite de 3 MB.'
        });
      }

      const pathname =
        `${PREFIX}${Date.now()}-${crypto.randomBytes(5).toString('hex')}-${filename}`;

      const blob = await put(pathname, buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType,
        cacheControlMaxAge: 31536000,
        allowOverwrite: false
      });

      return json(res, 200, {
        ok: true,
        media: blob
      });
    }

    if (action === 'delete') {
      const url = String(body.url || '');

      if (!url) {
        return json(res, 400, {
          ok: false,
          error: 'Falta la imagen a eliminar.'
        });
      }

      const result = await list({
        prefix: PREFIX,
        limit: 1000
      });

      const blob = result.blobs.find(item => item.url === url);

      if (!blob) {
        return json(res, 404, {
          ok: false,
          error: 'Imagen no encontrada.'
        });
      }

      await del(blob.url);

      return json(res, 200, {
        ok: true
      });
    }

    return json(res, 400, {
      ok: false,
      error: `Acción desconocida: ${action || '(vacía)'}`
    });
  } catch (error) {
    console.error('❌ /api/media ERROR:', error);

    return json(res, 500, {
      ok: false,
      error: error?.message || 'Error interno del Media Manager.'
    });
  }
}

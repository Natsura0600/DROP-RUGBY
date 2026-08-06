import { list, put } from '@vercel/blob';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const BLOB_PATH = 'droprugby/content.json';
const COOKIE = 'droprugby_session';
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'change-this-secret-in-vercel';
}
function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}
function makeToken() {
  const value = `${Date.now()}.${crypto.randomBytes(16).toString('hex')}`;
  return `${value}.${sign(value)}`;
}
function validToken(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!match) return false;
  const parts = decodeURIComponent(match[1]).split('.');
  if (parts.length < 3) return false;
  const value = parts.slice(0, 2).join('.');
  const timestamp = Number(parts[0]);
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > MAX_AGE * 1000) return false;
  return crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(sign(value)));
}
function setCookie(res, value, maxAge = MAX_AGE) {
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}
async function readData() {
  const result = await list({ prefix: BLOB_PATH, limit: 1 });
  if (!result.blobs.length) {
    const [articles, fixtures] = await Promise.all([
      fs.readFile(path.join(process.cwd(), 'data/articles.json'), 'utf8'),
      fs.readFile(path.join(process.cwd(), 'data/fixtures.json'), 'utf8')
    ]);
    return { articles: JSON.parse(articles), fixtures: JSON.parse(fixtures) };
  }
  const r = await fetch(result.blobs[0].url, { cache: 'no-store' });
  return r.json();
}
async function saveData(data) {
  await put(BLOB_PATH, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 0
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
    const body = req.body || {};

    if (body.action === 'login') {
      const user = process.env.ADMIN_USER || 'admin';
      const password = process.env.ADMIN_PASSWORD;
      if (!password) return res.status(500).json({ error: 'Falta configurar ADMIN_PASSWORD en Vercel.' });
      if (body.username !== user || body.password !== password) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
      setCookie(res, makeToken());
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'logout') {
      setCookie(res, '', 0);
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'session') {
      if (!validToken(req)) return res.status(401).json({ error: 'Sesión no válida.' });
      return res.status(200).json({ ok: true });
    }

    if (!validToken(req)) return res.status(401).json({ error: 'Sesión no válida o expirada.' });

    if (body.action === 'save') {
      const articles = Array.isArray(body.articles) ? body.articles : null;
      const fixtures = Array.isArray(body.fixtures) ? body.fixtures : null;
      if (!articles || !fixtures) return res.status(400).json({ error: 'Datos inválidos.' });
      await saveData({ articles, fixtures });
      return res.status(200).json({ ok: true, articles: articles.length, fixtures: fixtures.length });
    }

    return res.status(400).json({ error: 'Acción desconocida.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno.', detail: error.message });
  }
}

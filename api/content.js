import { list, put } from '@vercel/blob';
import fs from 'node:fs/promises';
import path from 'node:path';

const BLOB_PATH = 'droprugby/content.json';

async function seed() {
  const [articles, fixtures] = await Promise.all([
    fs.readFile(path.join(process.cwd(), 'data/articles.json'), 'utf8')),
    fs.readFile(path.join(process.cwd(), 'data/fixtures.json'), 'utf8')
  ]);
  const data = { articles: JSON.parse(articles), fixtures: JSON.parse(fixtures) };
  await put(BLOB_PATH, JSON.stringify(data), { access: 'public', addRandomSuffix: false, contentType: 'application/json; charset=utf-8' });
  return data;
}

async function readData() {
  const result = await list({ prefix: BLOB_PATH, limit: 1 });
  if (!result.blobs.length) return seed();
  const res = await fetch(result.blobs[0].url, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo leer el contenido guardado.');
  return res.json();
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await readData();
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo cargar el contenido.', detail: error.message });
  }
}

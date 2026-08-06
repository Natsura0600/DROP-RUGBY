import { list, put } from '@vercel/blob';
import fs from 'node:fs/promises';
import path from 'node:path';

const BLOB_PATH = 'droprugby/content.json';

async function seed() {
  const articlesPath = path.join(process.cwd(), 'data', 'articles.json');
  const fixturesPath = path.join(process.cwd(), 'data', 'fixtures.json');

  const [articlesFile, fixturesFile] = await Promise.all([
    fs.readFile(articlesPath, 'utf8'),
    fs.readFile(fixturesPath, 'utf8')
  ]);

  const data = {
    articles: JSON.parse(articlesFile),
    fixtures: JSON.parse(fixturesFile)
  };

  await put(
    BLOB_PATH,
    JSON.stringify(data),
    {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json; charset=utf-8',
      allowOverwrite: true
    }
  );

  return data;
}

async function readData() {
  const result = await list({
    prefix: BLOB_PATH,
    limit: 1
  });

  if (!result.blobs.length) {
    return await seed();
  }

  const response = await fetch(result.blobs[0].url, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('No se pudo leer el contenido guardado.');
  }

  return await response.json();
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Método no permitido'
      });
    }

    const data = await readData();

    res.setHeader(
      'Cache-Control',
      's-maxage=30, stale-while-revalidate=120'
    );

    return res.status(200).json(data);
  } catch (error) {
    console.error('ERROR /api/content:', error);

    return res.status(500).json({
      error: 'No se pudo cargar el contenido.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

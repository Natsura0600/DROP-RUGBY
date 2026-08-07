import { get, put } from '@vercel/blob';
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
      contentType: 'application/json',
      allowOverwrite: true,
      cacheControlMaxAge: 60
    }
  );

  return data;
}

async function readData() {
  const result = await get(BLOB_PATH, {
    access: 'public',
    useCache: false
  });

  if (!result) {
    return await seed();
  }

  if (!result.stream) {
    throw new Error(
      `No se pudo leer ${BLOB_PATH} desde Vercel Blob.`
    );
  }

  const text = await new Response(result.stream).text();

  return JSON.parse(text);
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
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );

    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).json(data);

  } catch (error) {
    console.error('ERROR /api/content:', error);

    return res.status(500).json({
      error: 'No se pudo cargar el contenido.',
      detail: error instanceof Error
        ? error.message
        : String(error)
    });
  }
}

import { get, put } from '@vercel/blob';
import fs from 'node:fs/promises';
import path from 'node:path';

const BLOB_PATH = 'droprugby/content.json';


/* =========================================================
   DATOS INICIALES
========================================================= */

async function seed() {

  const articlesPath =
    path.join(
      process.cwd(),
      'data',
      'articles.json'
    );

  const fixturesPath =
    path.join(
      process.cwd(),
      'data',
      'fixtures.json'
    );


  let articles = [];
  let fixtures = [];


  try {

    const [
      articlesFile,
      fixturesFile
    ] = await Promise.all([

      fs.readFile(
        articlesPath,
        'utf8'
      ),

      fs.readFile(
        fixturesPath,
        'utf8'
      )

    ]);


    articles =
      JSON.parse(
        articlesFile
      );


    fixtures =
      JSON.parse(
        fixturesFile
      );

  } catch (error) {

    console.error(
      'No se pudieron cargar los datos iniciales:',
      error
    );

  }


  const data = {

    articles:
      Array.isArray(articles)
        ? articles
        : [],

    fixtures:
      Array.isArray(fixtures)
        ? fixtures
        : [],

    trash: [],

    history: [],

    standings: [],

    players: [],

    updatedAt:
      new Date().toISOString()

  };


  await put(

    BLOB_PATH,

    JSON.stringify(
      data,
      null,
      2
    ),

    {

      access: 'public',

      addRandomSuffix: false,

      allowOverwrite: true,

      contentType:
        'application/json',

      cacheControlMaxAge: 60

    }

  );


  return data;

}


/* =========================================================
   LEER BLOB
========================================================= */

async function readData() {

  const result =
    await get(

      BLOB_PATH,

      {

        access: 'public',

        useCache: false

      }

    );


  /*
   * Si todavía no existe content.json,
   * creamos uno automáticamente.
   */

  if (!result) {

    return await seed();

  }


  if (!result.stream) {

    throw new Error(
      `No se pudo leer ${BLOB_PATH} desde Vercel Blob.`
    );

  }


  const text =
    await new Response(
      result.stream
    ).text();


  let data;


  try {

    data =
      JSON.parse(text);

  } catch {

    throw new Error(
      'content.json contiene JSON inválido.'
    );

  }


  /*
   * Compatibilidad con tu estructura anterior.
   *
   * Si tu Blob ya existe con:
   *
   * {
   *   articles: [],
   *   fixtures: []
   * }
   *
   * agregamos automáticamente
   * los nuevos campos.
   */

  data.articles =
    Array.isArray(data.articles)
      ? data.articles
      : [];


  data.fixtures =
    Array.isArray(data.fixtures)
      ? data.fixtures
      : [];


  data.trash =
    Array.isArray(data.trash)
      ? data.trash
      : [];


  data.history =
    Array.isArray(data.history)
      ? data.history
      : [];


  data.standings =
    Array.isArray(data.standings)
      ? data.standings
      : [];


  data.players =
    Array.isArray(data.players)
      ? data.players
      : [];


  return data;

}


/* =========================================================
   FECHA / PUBLICACIÓN
========================================================= */

function isPublished(article) {

  if (!article) {
    return false;
  }


  /*
   * Las noticias normales se muestran.
   */

  if (!article.scheduled) {
    return true;
  }


  /*
   * Si está programada necesitamos
   * fecha y hora.
   */

  if (!article.date) {
    return false;
  }


  const time =
    article.time || '00:00';


  const publishAt =
    new Date(
      `${article.date}T${time}:00`
    );


  if (
    Number.isNaN(
      publishAt.getTime()
    )
  ) {

    return false;

  }


  return (
    publishAt.getTime() <=
    Date.now()
  );

}


/* =========================================================
   DATOS PÚBLICOS
========================================================= */

function buildPublicData(data) {

  /*
   * IMPORTANTE:
   *
   * No enviamos trash ni history
   * al visitante de la web.
   */

  const articles =
    data.articles
      .filter(isPublished)
      .map(article => ({
        ...article,

        /*
         * Una vez llegada la fecha de
         * publicación, para la web
         * deja de importar que esté
         * marcado como scheduled.
         */

        scheduled:
          false

      }));


  return {

    articles,

    fixtures:
      data.fixtures,

    standings:
      data.standings,

    players:
      data.players,

    updatedAt:
      data.updatedAt || null

  };

}


/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {

  try {

    if (
      req.method !== 'GET'
    ) {

      return res.status(405).json({

        error:
          'Método no permitido'

      });

    }


    const data =
      await readData();


    /*
     * Solo mandamos información
     * pública al navegador.
     */

    const publicData =
      buildPublicData(
        data
      );


    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );

    res.setHeader(
      'Pragma',
      'no-cache'
    );

    res.setHeader(
      'Expires',
      '0'
    );


    return res
      .status(200)
      .json(
        publicData
      );

  } catch (error) {

    console.error(
      'ERROR /api/content:',
      error
    );


    return res
      .status(500)
      .json({

        error:
          'No se pudo cargar el contenido.',

        detail:
          error instanceof Error
            ? error.message
            : String(error)

      });

  }

}

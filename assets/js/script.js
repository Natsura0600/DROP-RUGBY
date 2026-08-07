/*
=========================================================
DropRugby V6
Script principal
=========================================================

Funciones:

- Menú mobile
- Animaciones
- Noticias dinámicas
- Categorías
- Calendario
- Preview calendario
- Buscador
- Newsletter
- Tabla URBA Top 14

window.ASSET_BASE debe definirse ANTES de este script
en páginas dentro de /noticias/.

Ejemplo:

<script>
  window.ASSET_BASE = "../";
</script>

<script src="../script.js"></script>

=========================================================
*/


const BASE =
  window.ASSET_BASE || "";


/* =========================================================
   CACHE GENERAL
========================================================= */

let CONTENT_CACHE = null;


/* =========================================================
   MENÚ MOBILE
========================================================= */

const menuBtn =
  document.querySelector(
    ".menu-btn"
  );

const mobileNav =
  document.querySelector(
    ".mobile-nav"
  );


if (
  menuBtn &&
  mobileNav
) {

  menuBtn.addEventListener(
    "click",
    () => {

      const open =
        mobileNav.classList.toggle(
          "open"
        );

      menuBtn.setAttribute(
        "aria-expanded",
        String(open)
      );

    }
  );


  mobileNav
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        () => {

          mobileNav.classList.remove(
            "open"
          );

          menuBtn.setAttribute(
            "aria-expanded",
            "false"
          );

        }
      );

    });

}


/* =========================================================
   ANIMACIONES SCROLL
========================================================= */

let observer = null;


if (
  "IntersectionObserver"
  in window
) {

  observer =
    new IntersectionObserver(
      entries => {

        entries.forEach(
          entry => {

            if (
              entry.isIntersecting
            ) {

              entry.target.classList.add(
                "visible"
              );

              observer.unobserve(
                entry.target
              );

            }

          }
        );

      },
      {
        threshold: 0.12
      }
    );

}


function observeReveals(
  root = document
) {

  if (!observer) return;

  root
    .querySelectorAll(
      ".reveal:not(.visible)"
    )
    .forEach(
      element =>
        observer.observe(
          element
        )
    );

}


observeReveals();


/* =========================================================
   NEWSLETTER
========================================================= */

document
  .querySelectorAll(
    ".newsletter-form"
  )
  .forEach(form => {

    form.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        form.classList.add(
          "submitted"
        );

      }
    );

  });


/* =========================================================
   CARGA GENERAL DE CONTENIDO
========================================================= */

async function loadContent() {

  if (CONTENT_CACHE) {
    return CONTENT_CACHE;
  }


  /*
   * Primero intentamos la API.
   */

  try {

    const response =
      await fetch(
        BASE + "api/content",
        {
          cache: "no-store"
        }
      );


    if (
      !response.ok
    ) {
      throw new Error(
        "API unavailable"
      );
    }


    const data =
      await response.json();


    CONTENT_CACHE = {

      articles:
        Array.isArray(
          data.articles
        )
          ? data.articles
          : [],

      fixtures:
        Array.isArray(
          data.fixtures
        )
          ? data.fixtures
          : [],

      standings:
        Array.isArray(
          data.standings
        )
          ? data.standings
          : [],

      players:
        Array.isArray(
          data.players
        )
          ? data.players
          : [],

      history:
        Array.isArray(
          data.history
        )
          ? data.history
          : []

    };


    return CONTENT_CACHE;


  } catch (error) {

    console.warn(
      "No se pudo cargar /api/content. Usando fallback.",
      error
    );

  }


  /*
   * Fallback local.
   */

  const localArticles =
    localStorage.getItem(
      "droprugby_articles"
    );

  const localFixtures =
    localStorage.getItem(
      "droprugby_fixtures"
    );

  const localStandings =
    localStorage.getItem(
      "droprugby_standings"
    );


  let articles = [];

  let fixtures = [];

  let standings = [];


  if (localArticles) {

    try {

      articles =
        JSON.parse(
          localArticles
        );

    } catch {}

  }


  if (localFixtures) {

    try {

      fixtures =
        JSON.parse(
          localFixtures
        );

    } catch {}

  }


  if (localStandings) {

    try {

      standings =
        JSON.parse(
          localStandings
        );

    } catch {}

  }


  /*
   * Datos globales de fallback.
   */

  if (
    window.DROP_RUGBY_DATA
  ) {

    if (
      !articles.length &&
      Array.isArray(
        window.DROP_RUGBY_DATA.articles
      )
    ) {

      articles =
        window.DROP_RUGBY_DATA.articles;

    }


    if (
      !fixtures.length &&
      Array.isArray(
        window.DROP_RUGBY_DATA.fixtures
      )
    ) {

      fixtures =
        window.DROP_RUGBY_DATA.fixtures;

    }


    if (
      !standings.length &&
      Array.isArray(
        window.DROP_RUGBY_DATA.standings
      )
    ) {

      standings =
        window.DROP_RUGBY_DATA.standings;

    }

  }


  /*
   * Intentar articles.json.
   */

  if (!articles.length) {

    try {

      const response =
        await fetch(
          BASE +
          "data/articles.json"
        );

      if (response.ok) {

        articles =
          await response.json();

      }

    } catch {}

  }


  /*
   * Intentar fixtures.json.
   */

  if (!fixtures.length) {

    try {

      const response =
        await fetch(
          BASE +
          "data/fixtures.json"
        );

      if (response.ok) {

        fixtures =
          await response.json();

      }

    } catch {}

  }


  CONTENT_CACHE = {

    articles:
      Array.isArray(articles)
        ? articles
        : [],

    fixtures:
      Array.isArray(fixtures)
        ? fixtures
        : [],

    standings:
      Array.isArray(standings)
        ? standings
        : [],

    players: [],

    history: []

  };


  return CONTENT_CACHE;
}


/* =========================================================
   HELPERS
========================================================= */

async function loadArticles() {

  const data =
    await loadContent();

  return data.articles;
}


async function loadFixtures() {

  const data =
    await loadContent();

  return data.fixtures;
}


async function loadStandings() {

  const data =
    await loadContent();

  return data.standings;
}


const MESES = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC"
];


const DIAS = [
  "DOMINGO",
  "LUNES",
  "MARTES",
  "MIÉRCOLES",
  "JUEVES",
  "VIERNES",
  "SÁBADO"
];


function escapeHTML(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>'"]/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      }[character])
  );

}


function formatDateShort(
  iso
) {

  if (!iso) return "";

  const [
    y,
    m,
    d
  ] =
    iso
      .split("-")
      .map(Number);


  return `${String(d).padStart(2, "0")} ${MESES[m - 1]} ${y}`;
}


function dateFromISO(
  iso
) {

  const [
    y,
    m,
    d
  ] =
    iso
      .split("-")
      .map(Number);


  return new Date(
    y,
    m - 1,
    d
  );
}


function isoFromDate(
  date
) {

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}


/* =========================================================
   STORY CARD
========================================================= */

function storyCardHTML(
  article,
  options = {}
) {

  const featuredClass =
    options.featured
      ? "story-featured"
      : "";


  const category =
    escapeHTML(
      article.category ||
      ""
    );


  const subcategory =
    escapeHTML(
      article.subcategory ||
      ""
    );


  const title =
    escapeHTML(
      article.title ||
      ""
    );


  const excerpt =
    escapeHTML(
      article.excerpt ||
      ""
    );


  const author =
    escapeHTML(
      article.author ||
      "DropRugby"
    );


  const articleURL =
    BASE +
    (
      article.url ||
      `article.html?id=${encodeURIComponent(article.id || "")}`
    );


  const visual =
    article.imageUrl

      ? `

        <div
          class="story-image photo-not-clickable"
        >

          <img
            src="${escapeHTML(article.imageUrl)}"
            alt=""
            loading="lazy"
          >

        </div>

      `

      : `

        <div
          class="
            story-image
            ph-image
            photo-not-clickable
            ${escapeHTML(
              article.imageClass ||
              "img-tone-1"
            )}
          "
        ></div>

      `;


  return `

    <article
      class="
        story
        ${featuredClass}
        reveal
      "
    >

      ${visual}

      <div class="story-body">

        <p class="category">
          ${category.toUpperCase()}
          ·
          ${subcategory.toUpperCase()}
        </p>

        <h3>

          <a href="${articleURL}">
            ${title}
          </a>

        </h3>

        <p>
          ${excerpt}
        </p>

        <div class="meta">

          Por ${author}

          ·

          ${formatDateShort(
            article.date
          ).toUpperCase()}

        </div>

      </div>

    </article>

  `;
}


/* =========================================================
   HOME
========================================================= */

async function renderHome() {

  const grid =
    document.getElementById(
      "home-top-stories"
    );

  const pumasEl =
    document.getElementById(
      "home-los-pumas"
    );

  const superRugbyEl =
    document.getElementById(
      "home-super-rugby"
    );

  const urbaTop14El =
    document.getElementById(
      "home-urba-top14"
    );

  const urbaEl =
    document.getElementById(
      "home-urba"
    );

  const heroEl =
    document.getElementById(
      "home-hero"
    );


  if (
    !grid &&
    !heroEl
  ) {
    return;
  }


  const articles =
    (await loadArticles())
      .slice()
      .sort(
        (a, b) =>
          (b.date || "")
            .localeCompare(
              a.date || ""
            )
      );


  const featured =
    articles.find(
      article =>
        article.featured
    ) ||
    articles[0];


  if (
    heroEl &&
    featured
  ) {

    const heroVisual =
      featured.imageUrl

        ? `

          <div
            class="
              hero-image
              photo-not-clickable
            "
          >

            <img
              src="${escapeHTML(
                featured.imageUrl
              )}"
              alt=""
              loading="eager"
            >

            <div
              class="image-overlay"
            ></div>

            <div
              class="hero-card-caption"
            >

              <span>
                TOP STORY ·
                ${escapeHTML(
                  featured.category ||
                  ""
                ).toUpperCase()}
              </span>

              <h2>
                ${escapeHTML(
                  featured.title ||
                  ""
                )}
              </h2>

            </div>

          </div>

        `

        : `

          <div
            class="
              hero-image
              ${
                escapeHTML(
                  featured.imageClass ||
                  "img-tone-1"
                )
              }
              photo-not-clickable
              ph-image
            "
          >

            <div
              class="image-overlay"
            ></div>

            <div
              class="hero-card-caption"
            >

              <span>
                TOP STORY ·
                ${escapeHTML(
                  featured.category ||
                  ""
                ).toUpperCase()}
              </span>

              <h2>
                ${escapeHTML(
                  featured.title ||
                  ""
                )}
              </h2>

            </div>

          </div>

        `;


    heroEl.innerHTML = `

      <div
        class="hero-card-inner"
      >
        ${heroVisual}
      </div>

    `;


    const heroLink =
      document.getElementById(
        "home-hero-link"
      );


    if (heroLink) {

      heroLink.href =
        BASE +
        (
          featured.url ||
          `article.html?id=${encodeURIComponent(
            featured.id || ""
          )}`
        );

    }

  }


  const rest =
    articles.filter(
      article =>
        !featured ||
        article.id !== featured.id
    );


  if (grid) {

    grid.innerHTML =
      rest
        .slice(0, 3)
        .map(
          (article, index) =>
            storyCardHTML(
              article,
              {
                featured:
                  index === 0
              }
            )
        )
        .join("");

  }


  function renderCategory(
    name,
    element,
    amount = 3
  ) {

    if (!element) return;


    const items =
      articles
        .filter(
          article =>
            article.category === name
        )
        .slice(
          0,
          amount
        );


    element.innerHTML =
      items.length

        ? items
            .map(
              article =>
                storyCardHTML(
                  article
                )
            )
            .join("")

        : `

          <p class="empty-state">
            Todavía no hay noticias
            publicadas en esta categoría.
          </p>

        `;
  }


  renderCategory(
    "Los Pumas",
    pumasEl
  );


  renderCategory(
    "Super Rugby",
    superRugbyEl
  );


  renderCategory(
    "URBA TOP 14",
    urbaTop14El
  );


  renderCategory(
    "URBA",
    urbaEl
  );


  observeReveals();
}


/* =========================================================
   PÁGINA DE CATEGORÍA
========================================================= */

async function renderCategoryPage(
  categoryName
) {

  const grid =
    document.getElementById(
      "category-grid"
    );


  if (!grid) return;


  const articles =
    (await loadArticles())
      .filter(
        article =>
          article.category ===
          categoryName
      )
      .sort(
        (a, b) =>
          (b.date || "")
            .localeCompare(
              a.date || ""
            )
      );


  const chips =
    document.querySelectorAll(
      ".filter-bar .filter-chip"
    );


  let activeFilter =
    "TODAS";


  function paint() {

    const filtered =
      activeFilter === "TODAS"

        ? articles

        : articles.filter(
            article =>
              String(
                article.subcategory ||
                ""
              ).toUpperCase() ===
              activeFilter
          );


    grid.innerHTML =
      filtered.length

        ? filtered
            .map(
              article =>
                storyCardHTML(
                  article
                )
            )
            .join("")

        : `

          <p class="empty-state">
            No hay noticias para
            este filtro todavía.
          </p>

        `;


    observeReveals();
  }


  chips.forEach(
    chip => {

      chip.addEventListener(
        "click",
        () => {

          chips.forEach(
            button =>
              button.classList.remove(
                "active"
              )
          );


          chip.classList.add(
            "active"
          );


          activeFilter =
            chip.dataset.filter;


          paint();

        }
      );

    }
  );


  paint();
}


/* =========================================================
   CALENDARIO
========================================================= */

async function renderCalendar() {

  const listEl =
    document.getElementById(
      "calendar-list"
    );


  if (!listEl) return;


  const fixtures =
    await loadFixtures();


  const compBtns =
    document.querySelectorAll(
      ".competition-select .filter-chip"
    );


  const dateBtns =
    document.querySelectorAll(
      ".date-filter-bar .date-chip"
    );


  const dayLabel =
    document.getElementById(
      "day-nav-label"
    );


  const prevBtn =
    document.getElementById(
      "day-prev"
    );


  const nextBtn =
    document.getElementById(
      "day-next"
    );


  const todayBtn =
    document.getElementById(
      "day-today"
    );


  let activeCompetition =
    "TODAS";


  let mode =
    "dia";


  let currentDate =
    new Date();


  currentDate.setHours(
    0,
    0,
    0,
    0
  );


  const availableDates =
    fixtures
      .map(
        fixture =>
          fixture.date
      )
      .filter(Boolean)
      .sort();


  if (
    availableDates.length &&
    !fixtures.some(
      fixture =>
        fixture.date ===
        isoFromDate(
          currentDate
        )
    )
  ) {

    currentDate =
      dateFromISO(
        availableDates[0]
      );

  }


  function groupByDateAndCompetition(
    items
  ) {

    const grouped = {};


    items.forEach(
      fixture => {

        if (
          !grouped[fixture.date]
        ) {

          grouped[
            fixture.date
          ] = {};

        }


        if (
          !grouped[
            fixture.date
          ][
            fixture.competition
          ]
        ) {

          grouped[
            fixture.date
          ][
            fixture.competition
          ] = [];

        }


        grouped[
          fixture.date
        ][
          fixture.competition
        ].push(
          fixture
        );

      }
    );


    return grouped;
  }


  function getRangeDates() {

    if (
      mode === "semana"
    ) {

      const start =
        new Date(
          currentDate
        );


      const day =
        start.getDay();


      const diffToMonday =
        (day + 6) % 7;


      start.setDate(
        start.getDate() -
        diffToMonday
      );


      return Array.from(
        {
          length: 7
        },
        (_, index) => {

          const date =
            new Date(
              start
            );


          date.setDate(
            start.getDate() +
            index
          );


          return isoFromDate(
            date
          );

        }
      );

    }


    if (
      mode === "finde"
    ) {

      const start =
        new Date(
          currentDate
        );


      const day =
        start.getDay();


      const diffToSaturday =
        (6 - day + 7) % 7;


      const saturday =
        new Date(
          start
        );


      saturday.setDate(
        start.getDate() +
        diffToSaturday
      );


      const sunday =
        new Date(
          saturday
        );


      sunday.setDate(
        saturday.getDate() +
        1
      );


      return [
        isoFromDate(
          saturday
        ),
        isoFromDate(
          sunday
        )
      ];

    }


    if (
      mode === "manana"
    ) {

      const tomorrow =
        new Date(
          currentDate
        );


      tomorrow.setDate(
        tomorrow.getDate() +
        1
      );


      return [
        isoFromDate(
          tomorrow
        )
      ];

    }


    return [
      isoFromDate(
        currentDate
      )
    ];
  }


  function updateDayLabel() {

    if (
      mode === "dia"
    ) {

      dayLabel.textContent =
        `${DIAS[currentDate.getDay()]} · ${formatDateShort(
          isoFromDate(
            currentDate
          )
        )}`;

    }

    else if (
      mode === "manana"
    ) {

      const tomorrow =
        new Date(
          currentDate
        );


      tomorrow.setDate(
        tomorrow.getDate() +
        1
      );


      dayLabel.textContent =
        `${DIAS[tomorrow.getDay()]} · ${formatDateShort(
          isoFromDate(
            tomorrow
          )
        )}`;

    }

    else if (
      mode === "finde"
    ) {

      dayLabel.textContent =
        "FIN DE SEMANA";

    }

    else {

      dayLabel.textContent =
        "TODA LA SEMANA";

    }

  }


  function paint() {

    updateDayLabel();


    const dates =
      getRangeDates();


    let filtered =
      fixtures.filter(
        fixture =>
          dates.includes(
            fixture.date
          )
      );


    if (
      activeCompetition !==
      "TODAS"
    ) {

      filtered =
        filtered.filter(
          fixture =>
            String(
              fixture.competition ||
              ""
            ).toUpperCase() ===
            activeCompetition
        );

    }


    const grouped =
      groupByDateAndCompetition(
        filtered
      );


    const sortedDates =
      Object.keys(
        grouped
      ).sort();


    if (
      !sortedDates.length
    ) {

      listEl.innerHTML = `

        <p class="empty-state">
          No hay partidos cargados
          para este filtro.
          Probá con otra competición
          o fecha.
        </p>

      `;

      return;
    }


    listEl.innerHTML =
      sortedDates
        .map(
          date => {

            const dt =
              dateFromISO(
                date
              );


            const competitions =
              grouped[date];


            const competitionsHTML =
              Object.keys(
                competitions
              )
                .sort()
                .map(
                  competitionName => {

                    const rows =
                      competitions[
                        competitionName
                      ]
                        .slice()
                        .sort(
                          (a, b) =>
                            String(
                              a.time || ""
                            ).localeCompare(
                              String(
                                b.time || ""
                              )
                            )
                        )
                        .map(
                          fixture => `

                            <div class="match-row">

                              <div class="match-time">
                                ${escapeHTML(
                                  fixture.time ||
                                  ""
                                )}
                              </div>

                              <div class="match-teams">

                                ${escapeHTML(
                                  fixture.home ||
                                  ""
                                )}

                                vs.

                                ${escapeHTML(
                                  fixture.away ||
                                  ""
                                )}

                              </div>

                              <div class="match-channel">

                                ${escapeHTML(
                                  fixture.channel ||
                                  ""
                                )}

                              </div>

                            </div>

                          `
                        )
                        .join("");


                    return `

                      <div class="competition-block">

                        <div class="competition-name">

                          ${escapeHTML(
                            competitionName
                          ).toUpperCase()}

                        </div>

                        ${rows}

                      </div>

                    `;

                  }
                )
                .join("");


            return `

              <div class="day-block">

                <div class="day-block-header">

                  <span class="dow">

                    ${DIAS[
                      dt.getDay()
                    ]}

                  </span>

                  <span class="full-date">

                    ${formatDateShort(
                      date
                    )}

                  </span>

                </div>

                ${competitionsHTML}

              </div>

            `;

          }
        )
        .join("");
  }


  compBtns.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          compBtns.forEach(
            item =>
              item.classList.remove(
                "active"
              )
          );


          button.classList.add(
            "active"
          );


          activeCompetition =
            button.dataset.filter;


          paint();

        }
      );

    }
  );


  dateBtns.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          dateBtns.forEach(
            item =>
              item.classList.remove(
                "active"
              )
          );


          button.classList.add(
            "active"
          );


          mode =
            button.dataset.mode;


          paint();

        }
      );

    }
  );


  if (prevBtn) {

    prevBtn.addEventListener(
      "click",
      () => {

        currentDate.setDate(
          currentDate.getDate() -
          (
            mode === "semana"
              ? 7
              : 1
          )
        );


        paint();

      }
    );

  }


  if (nextBtn) {

    nextBtn.addEventListener(
      "click",
      () => {

        currentDate.setDate(
          currentDate.getDate() +
          (
            mode === "semana"
              ? 7
              : 1
          )
        );


        paint();

      }
    );

  }


  if (todayBtn) {

    todayBtn.addEventListener(
      "click",
      () => {

        currentDate =
          new Date();


        currentDate.setHours(
          0,
          0,
          0,
          0
        );


        mode =
          "dia";


        dateBtns.forEach(
          button =>
            button.classList.toggle(
              "active",
              button.dataset.mode ===
              "dia"
            )
        );


        paint();

      }
    );

  }


  paint();
}


/* =========================================================
   CALENDARIO HOME
========================================================= */

async function renderCalendarPreview() {

  const element =
    document.getElementById(
      "home-calendar-preview"
    );


  if (!element) return;


  const fixtures =
    (await loadFixtures())
      .slice()
      .sort(
        (a, b) =>
          (
            String(a.date || "") +
            String(a.time || "")
          ).localeCompare(
            String(b.date || "") +
            String(b.time || "")
          )
      );


  const upcoming =
    fixtures.slice(
      0,
      6
    );


  if (
    !upcoming.length
  ) {

    element.innerHTML = `

      <p class="empty-state">
        No hay próximos partidos cargados.
      </p>

    `;

    return;
  }


  element.innerHTML =
    upcoming
      .map(
        fixture => `

          <div class="match-row">

            <div class="match-time">

              ${escapeHTML(
                fixture.time ||
                ""
              )}

            </div>

            <div class="match-teams">

              ${escapeHTML(
                fixture.home ||
                ""
              )}

              vs.

              ${escapeHTML(
                fixture.away ||
                ""
              )}

              <span
                style="
                  color:var(--muted-light);
                  font-weight:400;
                "
              >

                —
                ${escapeHTML(
                  fixture.competition ||
                  ""
                )}

              </span>

            </div>

            <div class="match-channel">

              ${escapeHTML(
                fixture.channel ||
                ""
              )}

            </div>

          </div>

        `
      )
      .join("");
}


/* =========================================================
   TABLA URBA TOP 14
========================================================= */

async function renderURBAStandings() {

  const container =
    document.getElementById(
      "urba-standings"
    );


  if (!container) {
    return;
  }


  let standings =
    await loadStandings();


  standings =
    standings
      .slice()
      .sort(
        (a, b) =>
          Number(b.pts || 0) -
          Number(a.pts || 0)
      );


  if (
    !standings.length
  ) {

    container.innerHTML = `

      <div class="standings-empty">

        <p>
          Todavía no hay una tabla
          de posiciones cargada.
        </p>

      </div>

    `;

    return;
  }


  container.innerHTML = `

    <div class="standings-table">

      <div class="standings-header">

        <div>
          POS.
        </div>

        <div>
          CLUB
        </div>

        <div>
          PJ
        </div>

        <div>
          PG
        </div>

        <div>
          PTS
        </div>

      </div>


      ${standings
        .map(
          (club, index) => `

            <div
              class="
                standings-row
                ${
                  index < 4
                    ? "standings-top"
                    : ""
                }
              "
            >

              <div
                class="standing-position"
              >

                ${index + 1}

              </div>


              <div
                class="standing-club"
              >

                ${
                  club.logo

                    ? `

                      <img
                        src="${escapeHTML(
                          club.logo
                        )}"
                        alt="${escapeHTML(
                          club.team ||
                          ""
                        )}"
                        loading="lazy"
                      >

                    `

                    : `

                      <div
                        class="
                          standing-logo-placeholder
                        "
                      >

                        ${escapeHTML(
                          String(
                            club.team ||
                            "?"
                          )
                            .charAt(0)
                            .toUpperCase()
                        )}

                      </div>

                    `
                }


                <strong>

                  ${escapeHTML(
                    club.team ||
                    "Club"
                  )}

                </strong>

              </div>


              <div>

                ${Number(
                  club.pj || 0
                )}

              </div>


              <div>

                ${Number(
                  club.pg || 0
                )}

              </div>


              <div
                class="standing-points"
              >

                ${Number(
                  club.pts || 0
                )}

              </div>

            </div>

          `
        )
        .join("")}

    </div>

  `;
}


/* =========================================================
   BUSCADOR GLOBAL
========================================================= */

function setupSearch() {

  const openButtons =
    document.querySelectorAll(
      ".search-btn"
    );


  const overlay =
    document.getElementById(
      "search-overlay"
    );


  const closeButton =
    document.getElementById(
      "search-close"
    );


  const input =
    document.getElementById(
      "search-input"
    );


  const results =
    document.getElementById(
      "search-results"
    );


  if (
    !overlay ||
    !openButtons.length ||
    !input ||
    !results
  ) {
    return;
  }


  let articlesForSearch =
    [];


  async function ensureData() {

    if (
      !articlesForSearch.length
    ) {

      articlesForSearch =
        await loadArticles();

    }

  }


  openButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        async () => {

          overlay.classList.add(
            "open"
          );


          input.focus();


          await ensureData();

        }
      );

    }
  );


  closeButton?.addEventListener(
    "click",
    () =>
      overlay.classList.remove(
        "open"
      )
  );


  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        overlay
      ) {

        overlay.classList.remove(
          "open"
        );

      }

    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Escape"
      ) {

        overlay.classList.remove(
          "open"
        );

      }

    }
  );


  input.addEventListener(
    "input",
    () => {

      const query =
        input.value
          .trim()
          .toLowerCase();


      if (!query) {

        results.innerHTML =
          "";

        return;

      }


      const matches =
        articlesForSearch.filter(
          article => {

            const title =
              String(
                article.title ||
                ""
              ).toLowerCase();


            const category =
              String(
                article.category ||
                ""
              ).toLowerCase();


            const subcategory =
              String(
                article.subcategory ||
                ""
              ).toLowerCase();


            const excerpt =
              String(
                article.excerpt ||
                ""
              ).toLowerCase();


            return (
              title.includes(query) ||
              category.includes(query) ||
              subcategory.includes(query) ||
              excerpt.includes(query)
            );

          }
        );


      results.innerHTML =
        matches.length

          ? matches
              .map(
                article => `

                  <a
                    class="search-result"
                    href="${BASE}${escapeHTML(
                      article.url ||
                      `article.html?id=${encodeURIComponent(
                        article.id ||
                        ""
                      )}`
                    )}"
                  >

                    <p class="category">

                      ${escapeHTML(
                        article.category ||
                        ""
                      ).toUpperCase()}

                      ·

                      ${escapeHTML(
                        article.subcategory ||
                        ""
                      ).toUpperCase()}

                    </p>

                    <h3>

                      ${escapeHTML(
                        article.title ||
                        ""
                      )}

                    </h3>

                  </a>

                `
              )
              .join("")

          : `

            <p class="search-empty">

              Sin resultados para
              "${escapeHTML(
                input.value
              )}".

            </p>

          `;

    }
  );
}


/* =========================================================
   NEWSLETTER REAL
========================================================= */

function setupNewsletter() {

  const newsletterForm =
    document.getElementById(
      "newsletter-form"
    );


  if (!newsletterForm) {
    return;
  }


  newsletterForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const emailInput =
        document.getElementById(
          "newsletter-email"
        );


      const submitButton =
        document.getElementById(
          "newsletter-submit"
        );


      const message =
        document.getElementById(
          "newsletter-message"
        );


      const email =
        emailInput?.value
          .trim() || "";


      if (!email) {

        if (message) {

          message.textContent =
            "Ingresá tu email.";

        }

        return;
      }


      submitButton.disabled =
        true;


      submitButton.innerHTML =
        "Enviando...";


      if (message) {

        message.textContent =
          "Procesando suscripción...";

      }


      try {

        const response =
          await fetch(
            "/api/newsletter",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  email
                })
            }
          );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result.error ||
            "No se pudo completar la suscripción."
          );

        }


        if (message) {

          message.textContent =
            "¡Listo! Revisá tu email 🏉";

        }


        if (emailInput) {

          emailInput.value =
            "";

        }


        newsletterForm.classList.add(
          "submitted"
        );


      } catch (error) {

        console.error(
          "Newsletter:",
          error
        );


        if (message) {

          message.textContent =
            error.message ||
            "Ocurrió un error. Intentá nuevamente.";

        }


      } finally {

        submitButton.disabled =
          false;


        submitButton.innerHTML =
          'Suscribirme <span>→</span>';

      }

    }
  );
}


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupSearch();

    setupNewsletter();

    renderHome();

    renderCalendarPreview();

    renderCalendar();

    renderURBAStandings();


    const categoryElement =
      document.getElementById(
        "category-grid"
      );


    if (
      categoryElement
    ) {

      renderCategoryPage(
        categoryElement.dataset.category
      );

    }

  }
);

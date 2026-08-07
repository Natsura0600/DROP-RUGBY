
/* ==========================================================================
   DropRugby V6 — script.js

   Funciones:
   - Menú mobile
   - Animaciones al scroll
   - Buscador global
   - Noticias dinámicas
   - Filtros por categoría
   - Calendario dinámico
   - Preview del calendario en home
   - Fallback a articles.json / fixtures.json
   - Integración con /api/content
   - Newsletter /api/newsletter

   Para páginas dentro de /noticias/:
   definir ANTES de este script:

   <script>
     window.ASSET_BASE = "../";
   </script>
   ========================================================================== */

const BASE = window.ASSET_BASE || "";


/* ==========================================================================
   MENÚ MOBILE
   ========================================================================== */

function setupMobileMenu() {
  const menuBtn = document.querySelector(".menu-btn");
  const mobileNav = document.querySelector(".mobile-nav");

  if (!menuBtn || !mobileNav) return;

  menuBtn.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");

    menuBtn.setAttribute(
      "aria-expanded",
      open ? "true" : "false"
    );
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");

      menuBtn.setAttribute(
        "aria-expanded",
        "false"
      );
    });
  });
}


/* ==========================================================================
   ANIMACIONES AL SCROLL
   ========================================================================== */

let revealObserver = null;

function setupRevealObserver() {
  if (!("IntersectionObserver" in window)) {
    document
      .querySelectorAll(".reveal")
      .forEach((el) => {
        el.classList.add("visible");
      });

    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("visible");

        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12
    }
  );

  observeReveals();
}

function observeReveals(root = document) {
  if (!revealObserver) return;

  root
    .querySelectorAll(".reveal:not(.visible)")
    .forEach((el) => {
      revealObserver.observe(el);
    });
}


/* ==========================================================================
   NEWSLETTER
   ========================================================================== */

function setupNewsletter() {
  const forms = document.querySelectorAll(
    ".newsletter-form, #newsletter-form"
  );

  forms.forEach((form) => {
    if (form.dataset.newsletterReady === "true") {
      return;
    }

    form.dataset.newsletterReady = "true";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput =
        form.querySelector("#newsletter-email") ||
        form.querySelector('input[type="email"]');

      const submitButton =
        form.querySelector("#newsletter-submit") ||
        form.querySelector('button[type="submit"]');

      const message =
        form.querySelector("#newsletter-message") ||
        form.querySelector(".newsletter-message");

      if (!emailInput || !submitButton) {
        return;
      }

      const email = emailInput.value.trim();

      if (!email) {
        if (message) {
          message.textContent =
            "Ingresá tu email.";
        }

        return;
      }

      submitButton.disabled = true;
      submitButton.innerHTML = "Enviando...";

      if (message) {
        message.textContent =
          "Procesando suscripción...";
      }

      try {
        const response = await fetch(
          BASE + "api/newsletter",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              email
            })
          }
        );

        let result = {};

        try {
          result = await response.json();
        } catch {
          result = {};
        }

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

        emailInput.value = "";

        form.classList.add("submitted");
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
        submitButton.disabled = false;

        submitButton.innerHTML =
          'Suscribirme <span>→</span>';
      }
    });
  });
}


/* ==========================================================================
   CACHE DE DATOS
   ========================================================================== */

let ARTICLES_CACHE = null;
let FIXTURES_CACHE = null;


/* ==========================================================================
   CARGAR NOTICIAS

   Prioridad:
   1. /api/content
   2. localStorage
   3. DROP_RUGBY_DATA
   4. data/articles.json
   ========================================================================== */

async function loadArticles() {
  if (Array.isArray(ARTICLES_CACHE)) {
    return ARTICLES_CACHE;
  }

  /* -----------------------------------------
     1. API
     ----------------------------------------- */

  try {
    const response = await fetch(
      BASE + "api/content",
      {
        cache: "no-store"
      }
    );

    if (response.ok) {
      const data =
        await response.json();

      if (Array.isArray(data.articles)) {
        ARTICLES_CACHE = data.articles;

        return ARTICLES_CACHE;
      }
    }
  } catch (error) {
    console.warn(
      "No se pudo cargar /api/content:",
      error
    );
  }


  /* -----------------------------------------
     2. localStorage
     ----------------------------------------- */

  try {
    const local =
      localStorage.getItem(
        "droprugby_articles"
      );

    if (local) {
      const parsed =
        JSON.parse(local);

      if (Array.isArray(parsed)) {
        ARTICLES_CACHE = parsed;

        return ARTICLES_CACHE;
      }
    }
  } catch (error) {
    console.warn(
      "No se pudo leer localStorage:",
      error
    );
  }


  /* -----------------------------------------
     3. DROP_RUGBY_DATA
     ----------------------------------------- */

  if (
    window.DROP_RUGBY_DATA &&
    Array.isArray(
      window.DROP_RUGBY_DATA.articles
    )
  ) {
    ARTICLES_CACHE =
      window.DROP_RUGBY_DATA.articles;

    return ARTICLES_CACHE;
  }


  /* -----------------------------------------
     4. articles.json
     ----------------------------------------- */

  try {
    const response = await fetch(
      BASE + "data/articles.json",
      {
        cache: "no-store"
      }
    );

    if (response.ok) {
      const data =
        await response.json();

      if (Array.isArray(data)) {
        ARTICLES_CACHE = data;

        return ARTICLES_CACHE;
      }

      if (
        data &&
        Array.isArray(data.articles)
      ) {
        ARTICLES_CACHE =
          data.articles;

        return ARTICLES_CACHE;
      }
    }
  } catch (error) {
    console.error(
      "No se pudo cargar data/articles.json:",
      error
    );
  }


  ARTICLES_CACHE = [];

  return ARTICLES_CACHE;
}


/* ==========================================================================
   CARGAR PARTIDOS

   Prioridad:
   1. /api/content
   2. localStorage
   3. DROP_RUGBY_DATA
   4. data/fixtures.json
   ========================================================================== */

async function loadFixtures() {
  if (Array.isArray(FIXTURES_CACHE)) {
    return FIXTURES_CACHE;
  }


  /* -----------------------------------------
     1. API
     ----------------------------------------- */

  try {
    const response = await fetch(
      BASE + "api/content",
      {
        cache: "no-store"
      }
    );

    if (response.ok) {
      const data =
        await response.json();

      if (Array.isArray(data.fixtures)) {
        FIXTURES_CACHE = data.fixtures;

        return FIXTURES_CACHE;
      }
    }
  } catch (error) {
    console.warn(
      "No se pudo cargar el calendario dinámico:",
      error
    );
  }


  /* -----------------------------------------
     2. localStorage
     ----------------------------------------- */

  try {
    const local =
      localStorage.getItem(
        "droprugby_fixtures"
      );

    if (local) {
      const parsed =
        JSON.parse(local);

      if (Array.isArray(parsed)) {
        FIXTURES_CACHE = parsed;

        return FIXTURES_CACHE;
      }
    }
  } catch (error) {
    console.warn(
      "No se pudo leer fixtures de localStorage:",
      error
    );
  }


  /* -----------------------------------------
     3. DROP_RUGBY_DATA
     ----------------------------------------- */

  if (
    window.DROP_RUGBY_DATA &&
    Array.isArray(
      window.DROP_RUGBY_DATA.fixtures
    )
  ) {
    FIXTURES_CACHE =
      window.DROP_RUGBY_DATA.fixtures;

    return FIXTURES_CACHE;
  }


  /* -----------------------------------------
     4. fixtures.json
     ----------------------------------------- */

  try {
    const response = await fetch(
      BASE + "data/fixtures.json",
      {
        cache: "no-store"
      }
    );

    if (response.ok) {
      const data =
        await response.json();

      if (Array.isArray(data)) {
        FIXTURES_CACHE = data;

        return FIXTURES_CACHE;
      }

      if (
        data &&
        Array.isArray(data.fixtures)
      ) {
        FIXTURES_CACHE =
          data.fixtures;

        return FIXTURES_CACHE;
      }
    }
  } catch (error) {
    console.error(
      "No se pudo cargar data/fixtures.json:",
      error
    );
  }


  FIXTURES_CACHE = [];

  return FIXTURES_CACHE;
}


/* ==========================================================================
   UTILIDADES
   ========================================================================== */

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
  return String(value ?? "")
    .replace(
      /[&<>'"]/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[char]
    );
}


function formatDateShort(iso) {
  if (!iso) return "";

  const parts =
    String(iso).split("-");

  if (parts.length !== 3) {
    return iso;
  }

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  const day =
    Number(parts[2]);

  if (
    !year ||
    !month ||
    !day
  ) {
    return iso;
  }

  return `${String(day).padStart(
    2,
    "0"
  )} ${MESES[month - 1]} ${year}`;
}


function formatDateAdmin(iso) {
  if (!iso) return "";

  const parts =
    String(iso).split("-");

  if (parts.length !== 3) {
    return iso;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


function dateFromISO(iso) {
  const parts =
    String(iso).split("-");

  if (parts.length !== 3) {
    return new Date();
  }

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  const day =
    Number(parts[2]);

  return new Date(
    year,
    month - 1,
    day
  );
}


function isoFromDate(date) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0")
  ].join("-");
}


function normalizeCategory(value) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}


function articleURL(article) {
  if (!article || !article.url) {
    return "#";
  }

  return BASE + article.url;
}


/* ==========================================================================
   TARJETA DE NOTICIA
   ========================================================================== */

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
      "ACTUALIDAD"
    );

  const subcategory =
    escapeHTML(
      article.subcategory ||
      "Actualidad"
    );

  const title =
    escapeHTML(
      article.title ||
      "Sin título"
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

  const date =
    formatDateShort(
      article.date
    ).toUpperCase();


  let visual = "";


  if (article.imageUrl) {
    visual = `
      <div class="story-image photo-not-clickable">
        <img
          src="${escapeHTML(article.imageUrl)}"
          alt=""
          loading="lazy"
        >
      </div>
    `;
  } else {
    visual = `
      <div
        class="story-image ph-image photo-not-clickable ${
          escapeHTML(
            article.imageClass ||
            "img-tone-1"
          )
        }"
      ></div>
    `;
  }


  return `
    <article class="story ${featuredClass} reveal">

      ${visual}

      <div class="story-body">

        <p class="category">
          ${category} · ${subcategory}
        </p>

        <h3>
          <a href="${articleURL(article)}">
            ${title}
          </a>
        </h3>

        <p>
          ${excerpt}
        </p>

        <div class="meta">
          Por ${author} · ${date}
        </div>

      </div>

    </article>
  `;
}


/* ==========================================================================
   HOME
   ========================================================================== */

async function renderHome() {
  const grid =
    document.getElementById(
      "home-top-stories"
    );

  const pumasEl =
    document.getElementById(
      "home-los-pumas"
    );

  const srEl =
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
    !heroEl &&
    !pumasEl &&
    !srEl &&
    !urbaTop14El &&
    !urbaEl
  ) {
    return;
  }


  const articles =
    (await loadArticles())
      .slice()
      .filter(
        (article) =>
          article &&
          article.title
      )
      .sort(
        (a, b) =>
          String(b.date || "")
            .localeCompare(
              String(a.date || "")
            )
      );


  const featured =
    articles.find(
      (article) =>
        article.featured === true
    ) ||
    articles[0];


  /* -----------------------------------------
     HERO
     ----------------------------------------- */

  if (
    heroEl &&
    featured
  ) {
    const title =
      escapeHTML(
        featured.title
      );

    const category =
      escapeHTML(
        featured.category ||
        "ACTUALIDAD"
      );


    let heroVisual = "";


    if (featured.imageUrl) {
      heroVisual = `
        <div class="hero-image photo-not-clickable">

          <img
            src="${escapeHTML(
              featured.imageUrl
            )}"
            alt=""
            loading="eager"
          >

          <div class="image-overlay"></div>

          <div class="hero-card-caption">
            <span>
              TOP STORY · ${category}
            </span>

            <h2>
              ${title}
            </h2>
          </div>

        </div>
      `;
    } else {
      heroVisual = `
        <div
          class="hero-image ${
            escapeHTML(
              featured.imageClass ||
              "img-tone-1"
            )
          } photo-not-clickable ph-image"
        >

          <div class="image-overlay"></div>

          <div class="hero-card-caption">

            <span>
              TOP STORY · ${category}
            </span>

            <h2>
              ${title}
            </h2>

          </div>

        </div>
      `;
    }


    heroEl.innerHTML = `
      <div class="hero-card-inner">
        ${heroVisual}
      </div>
    `;


    const heroLink =
      document.getElementById(
        "home-hero-link"
      );


    if (heroLink) {
      heroLink.href =
        articleURL(featured);
    }
  }


  /* -----------------------------------------
     ÚLTIMAS NOTICIAS
     ----------------------------------------- */

  const rest =
    articles.filter(
      (article) =>
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


  /* -----------------------------------------
     CATEGORÍAS
     ----------------------------------------- */

  function renderCategory(
    categoryName,
    element,
    amount = 3
  ) {
    if (!element) return;

    const normalized =
      normalizeCategory(
        categoryName
      );


    const items =
      articles
        .filter(
          (article) =>
            normalizeCategory(
              article.category
            ) === normalized
        )
        .slice(0, amount);


    if (!items.length) {
      element.innerHTML = `
        <p class="empty-state">
          Todavía no hay noticias publicadas
          en esta categoría.
        </p>
      `;

      return;
    }


    element.innerHTML =
      items
        .map((article) =>
          storyCardHTML(article)
        )
        .join("");
  }


  renderCategory(
    "Los Pumas",
    pumasEl
  );

  renderCategory(
    "Super Rugby",
    srEl
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


/* ==========================================================================
   PÁGINA DE CATEGORÍA
   ========================================================================== */

async function renderCategoryPage(
  categoryName
) {
  const grid =
    document.getElementById(
      "category-grid"
    );

  if (!grid) return;


  const normalizedCategory =
    normalizeCategory(
      categoryName
    );


  const articles =
    (await loadArticles())
      .filter(
        (article) =>
          normalizeCategory(
            article.category
          ) === normalizedCategory
      )
      .sort(
        (a, b) =>
          String(b.date || "")
            .localeCompare(
              String(a.date || "")
            )
      );


  const chips =
    document.querySelectorAll(
      ".filter-bar .filter-chip"
    );


  let activeFilter = "TODAS";


  function paint() {
    const filtered =
      activeFilter === "TODAS"
        ? articles
        : articles.filter(
            (article) =>
              normalizeCategory(
                article.subcategory
              ) ===
              normalizeCategory(
                activeFilter
              )
          );


    if (!filtered.length) {
      grid.innerHTML = `
        <p class="empty-state">
          No hay noticias para este filtro todavía.
        </p>
      `;

      return;
    }


    grid.innerHTML =
      filtered
        .map((article) =>
          storyCardHTML(article)
        )
        .join("");


    observeReveals();
  }


  chips.forEach((chip) => {
    chip.addEventListener(
      "click",
      () => {
        chips.forEach(
          (item) =>
            item.classList.remove(
              "active"
            )
        );

        chip.classList.add(
          "active"
        );

        activeFilter =
          chip.dataset.filter ||
          "TODAS";

        paint();
      }
    );
  });


  paint();
}


/* ==========================================================================
   CALENDARIO
   ========================================================================== */

async function renderCalendar() {
  const listEl =
    document.getElementById(
      "calendar-list"
    );

  if (!listEl) return;


  const fixtures =
    (await loadFixtures())
      .filter(
        (fixture) =>
          fixture &&
          fixture.date
      )
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


  const competitionButtons =
    document.querySelectorAll(
      ".competition-select .filter-chip"
    );


  const dateButtons =
    document.querySelectorAll(
      ".date-filter-bar .date-chip"
    );


  const dayLabel =
    document.getElementById(
      "day-nav-label"
    );


  const prevButton =
    document.getElementById(
      "day-prev"
    );


  const nextButton =
    document.getElementById(
      "day-next"
    );


  const todayButton =
    document.getElementById(
      "day-today"
    );


  let activeCompetition =
    "TODAS";


  let mode = "dia";


  let currentDate =
    new Date();


  currentDate.setHours(
    0,
    0,
    0,
    0
  );


  /* -----------------------------------------
     Si hoy no tiene partidos,
     arrancamos desde el próximo fixture.
     ----------------------------------------- */

  const availableDates =
    fixtures
      .map(
        (fixture) =>
          fixture.date
      )
      .filter(Boolean)
      .sort();


  const todayISO =
    isoFromDate(
      currentDate
    );


  if (
    availableDates.length &&
    !fixtures.some(
      (fixture) =>
        fixture.date ===
        todayISO
    )
  ) {
    currentDate =
      dateFromISO(
        availableDates[0]
      );
  }


  /* -----------------------------------------
     Rango de fechas
     ----------------------------------------- */

  function getRangeDates() {
    if (mode === "semana") {
      const start =
        new Date(currentDate);

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
            new Date(start);

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


    if (mode === "finde") {
      const date =
        new Date(currentDate);

      const day =
        date.getDay();


      /*
       * Si estamos lunes-viernes,
       * buscamos el próximo sábado.
       *
       * Si estamos sábado/domingo,
       * usamos ese fin de semana.
       */

      let diffToSaturday =
        (6 - day + 7) % 7;


      if (
        day === 0
      ) {
        diffToSaturday = -1;
      }


      const saturday =
        new Date(date);

      saturday.setDate(
        saturday.getDate() +
          diffToSaturday
      );


      const sunday =
        new Date(saturday);

      sunday.setDate(
        sunday.getDate() +
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


    if (mode === "manana") {
      const tomorrow =
        new Date(currentDate);

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


  /* -----------------------------------------
     Etiqueta de navegación
     ----------------------------------------- */

  function updateDayLabel() {
    if (!dayLabel) return;


    if (mode === "dia") {
      dayLabel.textContent =
        `${DIAS[currentDate.getDay()]} · ${formatDateShort(
          isoFromDate(currentDate)
        )}`;

      return;
    }


    if (mode === "manana") {
      const tomorrow =
        new Date(currentDate);

      tomorrow.setDate(
        tomorrow.getDate() +
          1
      );


      dayLabel.textContent =
        `${DIAS[tomorrow.getDay()]} · ${formatDateShort(
          isoFromDate(tomorrow)
        )}`;

      return;
    }


    if (mode === "finde") {
      dayLabel.textContent =
        "FIN DE SEMANA";

      return;
    }


    if (mode === "semana") {
      dayLabel.textContent =
        "TODA LA SEMANA";
    }
  }


  /* -----------------------------------------
     Agrupar
     ----------------------------------------- */

  function groupByDateAndCompetition(
    items
  ) {
    const grouped = {};


    items.forEach(
      (fixture) => {
        if (!grouped[fixture.date]) {
          grouped[fixture.date] = {};
        }


        if (
          !grouped[fixture.date][
            fixture.competition
          ]
        ) {
          grouped[fixture.date][
            fixture.competition
          ] = [];
        }


        grouped[fixture.date][
          fixture.competition
        ].push(fixture);
      }
    );


    return grouped;
  }


  /* -----------------------------------------
     Render calendario
     ----------------------------------------- */

  function paint() {
    updateDayLabel();


    const dates =
      getRangeDates();


    let filtered =
      fixtures.filter(
        (fixture) =>
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
          (fixture) =>
            normalizeCategory(
              fixture.competition
            ) ===
            normalizeCategory(
              activeCompetition
            )
        );
    }


    const grouped =
      groupByDateAndCompetition(
        filtered
      );


    const sortedDates =
      Object.keys(grouped)
        .sort();


    if (!sortedDates.length) {
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
          (date) => {
            const dt =
              dateFromISO(
                date
              );


            const competitions =
              grouped[date];


            const competitionHTML =
              Object.keys(
                competitions
              )
                .sort()
                .map(
                  (competition) => {
                    const matches =
                      competitions[
                        competition
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
                        );


                    const rows =
                      matches
                        .map(
                          (fixture) => `
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
                                <span>vs.</span>
                                ${escapeHTML(
                                  fixture.away ||
                                    ""
                                )}
                              </div>

                              <div class="match-channel">
                                ${escapeHTML(
                                  fixture.channel ||
                                    "—"
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
                            competition
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
                    ${DIAS[dt.getDay()]}
                  </span>

                  <span class="full-date">
                    ${formatDateShort(
                      date
                    )}
                  </span>

                </div>

                ${competitionHTML}

              </div>
            `;
          }
        )
        .join("");
  }


  /* -----------------------------------------
     Filtro competición
     ----------------------------------------- */

  competitionButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          competitionButtons.forEach(
            (item) =>
              item.classList.remove(
                "active"
              )
          );


          button.classList.add(
            "active"
          );


          activeCompetition =
            button.dataset.filter ||
            "TODAS";


          paint();
        }
      );
    }
  );


  /* -----------------------------------------
     Filtro fecha
     ----------------------------------------- */

  dateButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          dateButtons.forEach(
            (item) =>
              item.classList.remove(
                "active"
              )
          );


          button.classList.add(
            "active"
          );


          mode =
            button.dataset.mode ||
            "dia";


          paint();
        }
      );
    }
  );


  /* -----------------------------------------
     Anterior
     ----------------------------------------- */

  if (prevButton) {
    prevButton.addEventListener(
      "click",
      () => {
        if (
          mode === "semana"
        ) {
          currentDate.setDate(
            currentDate.getDate() -
              7
          );
        } else {
          currentDate.setDate(
            currentDate.getDate() -
              1
          );
        }


        paint();
      }
    );
  }


  /* -----------------------------------------
     Siguiente
     ----------------------------------------- */

  if (nextButton) {
    nextButton.addEventListener(
      "click",
      () => {
        if (
          mode === "semana"
        ) {
          currentDate.setDate(
            currentDate.getDate() +
              7
          );
        } else {
          currentDate.setDate(
            currentDate.getDate() +
              1
          );
        }


        paint();
      }
    );
  }


  /* -----------------------------------------
     HOY
     ----------------------------------------- */

  if (todayButton) {
    todayButton.addEventListener(
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


        mode = "dia";


        dateButtons.forEach(
          (button) => {
            button.classList.toggle(
              "active",
              button.dataset.mode ===
                "dia"
            );
          }
        );


        paint();
      }
    );
  }


  paint();
}


/* ==========================================================================
   PREVIEW CALENDARIO HOME
   ========================================================================== */

async function renderCalendarPreview() {
  const element =
    document.getElementById(
      "home-calendar-preview"
    );

  if (!element) return;


  const fixtures =
    (await loadFixtures())
      .filter(
        (fixture) =>
          fixture &&
          fixture.date
      )
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
    fixtures.slice(0, 6);


  if (!upcoming.length) {
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
        (fixture) => `
          <div class="match-row">

            <div class="match-time">
              ${escapeHTML(
                fixture.time || ""
              )}
            </div>

            <div class="match-teams">

              ${escapeHTML(
                fixture.home || ""
              )}

              <span>vs.</span>

              ${escapeHTML(
                fixture.away || ""
              )}

              <span
                style="
                  color:var(--muted-light);
                  font-weight:400;
                "
              >
                — ${escapeHTML(
                  fixture.competition ||
                    ""
                )}
              </span>

            </div>

            <div class="match-channel">
              ${escapeHTML(
                fixture.channel ||
                  "—"
              )}
            </div>

          </div>
        `
      )
      .join("");
}


/* ==========================================================================
   BUSCADOR GLOBAL
   ========================================================================== */

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


  let articlesForSearch = [];


  async function ensureData() {
    if (
      articlesForSearch.length
    ) {
      return;
    }


    articlesForSearch =
      await loadArticles();
  }


  openButtons.forEach(
    (button) => {
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


  if (closeButton) {
    closeButton.addEventListener(
      "click",
      () => {
        overlay.classList.remove(
          "open"
        );
      }
    );
  }


  overlay.addEventListener(
    "click",
    (event) => {
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
    (event) => {
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
    async () => {
      await ensureData();


      const query =
        input.value
          .trim()
          .toLowerCase();


      if (!query) {
        results.innerHTML = "";

        return;
      }


      const matches =
        articlesForSearch.filter(
          (article) => {
            const title =
              String(
                article.title || ""
              ).toLowerCase();

            const category =
              String(
                article.category || ""
              ).toLowerCase();

            const subcategory =
              String(
                article.subcategory ||
                  ""
              ).toLowerCase();

            const excerpt =
              String(
                article.excerpt || ""
              ).toLowerCase();


            return (
              title.includes(query) ||
              category.includes(query) ||
              subcategory.includes(
                query
              ) ||
              excerpt.includes(query)
            );
          }
        );


      if (!matches.length) {
        results.innerHTML = `
          <p class="search-empty">
            Sin resultados para
            "${escapeHTML(
              input.value
            )}".
          </p>
        `;

        return;
      }


      results.innerHTML =
        matches
          .slice(0, 20)
          .map(
            (article) => `
              <a
                class="search-result"
                href="${articleURL(
                  article
                )}"
              >

                <p class="category">
                  ${escapeHTML(
                    article.category ||
                      "ACTUALIDAD"
                  ).toUpperCase()}
                  ·
                  ${escapeHTML(
                    article.subcategory ||
                      "ACTUALIDAD"
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
          .join("");
    }
  );
}


/* ==========================================================================
   ACTUALIZACIÓN DE DATOS
   ========================================================================== */

function setupDataUpdateListener() {
  window.addEventListener(
    "droprugby:data-updated",
    () => {
      ARTICLES_CACHE = null;
      FIXTURES_CACHE = null;

      renderHome();
      renderCalendarPreview();
      renderCalendar();
    }
  );
}


/* ==========================================================================
   INIT
   ========================================================================== */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupMobileMenu();

    setupRevealObserver();

    setupNewsletter();

    setupSearch();

    setupDataUpdateListener();


    /* -----------------------------------------
       Home
       ----------------------------------------- */

    try {
      await renderHome();
    } catch (error) {
      console.error(
        "Error renderizando home:",
        error
      );
    }


    /* -----------------------------------------
       Calendario preview
       ----------------------------------------- */

    try {
      await renderCalendarPreview();
    } catch (error) {
      console.error(
        "Error renderizando preview calendario:",
        error
      );
    }


    /* -----------------------------------------
       Calendario completo
       ----------------------------------------- */

    try {
      await renderCalendar();
    } catch (error) {
      console.error(
        "Error renderizando calendario:",
        error
      );
    }


    /* -----------------------------------------
       Página de categoría
       ----------------------------------------- */

    const categoryGrid =
      document.getElementById(
        "category-grid"
      );


    if (categoryGrid) {
      const category =
        categoryGrid.dataset.category;


      if (category) {
        try {
          await renderCategoryPage(
            category
          );
        } catch (error) {
          console.error(
            "Error renderizando categoría:",
            error
          );
        }
      }
    }


    /* -----------------------------------------
       Reveals finales
       ----------------------------------------- */

    observeReveals();
  }
);


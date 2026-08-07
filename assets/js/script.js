/* ==========================================================================
   DropRugby V5 — script.js
   Sistema dinámico de noticias, calendario, buscador, newsletter y navegación.

   Los datos principales vienen de:
   /api/content

   Fallback:
   window.DROP_RUGBY_DATA
   /data/articles.json
   /data/fixtures.json

   Las noticias creadas desde el admin utilizan:
   article.html?id=ID
========================================================================== */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURACIÓN
  ========================================================= */

  const BASE = window.ASSET_BASE || "";

  let ARTICLES_CACHE = null;
  let FIXTURES_CACHE = null;

  /* =========================================================
     UTILIDADES
  ========================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }

  function safeURL(value) {
    return String(value ?? "")
      .replace(/"/g, "&quot;")
      .replace(/</g, "%3C")
      .replace(/>/g, "%3E");
  }

  function slugify(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70);
  }

  const MESES = [
    "ENE", "FEB", "MAR", "ABR",
    "MAY", "JUN", "JUL", "AGO",
    "SEP", "OCT", "NOV", "DIC"
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

  function formatDateShort(iso) {
    if (!iso) return "";

    const parts = String(iso).split("-").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return "";
    }

    const [year, month, day] = parts;

    return `${String(day).padStart(2, "0")} ${MESES[month - 1] || ""} ${year}`;
  }

  function dateFromISO(iso) {
    const [year, month, day] = String(iso)
      .split("-")
      .map(Number);

    return new Date(year, month - 1, day);
  }

  function isoFromDate(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function normalizeCategory(value) {
    return String(value || "")
      .trim()
      .toUpperCase();
  }

  /* =========================================================
     MENÚ MOBILE
  ========================================================= */

  function setupMobileMenu() {
    const menuBtn = $(".menu-btn");
    const mobileNav = $(".mobile-nav");

    if (!menuBtn || !mobileNav) return;

    menuBtn.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("open");

      menuBtn.setAttribute(
        "aria-expanded",
        String(open)
      );
    });

    $$("a", mobileNav).forEach(link => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("open");

        menuBtn.setAttribute(
          "aria-expanded",
          "false"
        );
      });
    });
  }

  /* =========================================================
     ANIMACIONES REVEAL
  ========================================================= */

  let revealObserver = null;

  function setupRevealObserver() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach(el =>
        el.classList.add("visible")
      );
      return;
    }

    revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
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
      .forEach(el => revealObserver.observe(el));
  }

  /* =========================================================
     CARGA DE CONTENIDO
  ========================================================= */

  async function loadContent() {
    try {
      const response = await fetch(
        `${BASE}api/content`,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("API unavailable");
      }

      const data = await response.json();

      return {
        articles: Array.isArray(data.articles)
          ? data.articles
          : [],

        fixtures: Array.isArray(data.fixtures)
          ? data.fixtures
          : []
      };

    } catch (error) {
      console.warn(
        "No se pudo cargar /api/content:",
        error
      );

      return null;
    }
  }

  async function loadArticles() {
    if (ARTICLES_CACHE) {
      return ARTICLES_CACHE;
    }

    /* -----------------------------------------
       1. API PRINCIPAL
    ----------------------------------------- */

    const content = await loadContent();

    if (content && Array.isArray(content.articles)) {
      ARTICLES_CACHE = content.articles;
      return ARTICLES_CACHE;
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
        const parsed = JSON.parse(local);

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
       3. DATA.JS
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
       4. JSON LOCAL
    ----------------------------------------- */

    try {
      const response = await fetch(
        `${BASE}data/articles.json`,
        {
          cache: "no-store"
        }
      );

      if (response.ok) {
        const data = await response.json();

        ARTICLES_CACHE =
          Array.isArray(data)
            ? data
            : [];

        return ARTICLES_CACHE;
      }

    } catch (error) {
      console.warn(
        "No se pudo cargar articles.json:",
        error
      );
    }

    ARTICLES_CACHE = [];

    return ARTICLES_CACHE;
  }

  async function loadFixtures() {
    if (FIXTURES_CACHE) {
      return FIXTURES_CACHE;
    }

    /* -----------------------------------------
       1. API PRINCIPAL
    ----------------------------------------- */

    const content = await loadContent();

    if (content && Array.isArray(content.fixtures)) {
      FIXTURES_CACHE = content.fixtures;
      return FIXTURES_CACHE;
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
        const parsed = JSON.parse(local);

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
       3. DATA.JS
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
       4. JSON LOCAL
    ----------------------------------------- */

    try {
      const response = await fetch(
        `${BASE}data/fixtures.json`,
        {
          cache: "no-store"
        }
      );

      if (response.ok) {
        const data = await response.json();

        FIXTURES_CACHE =
          Array.isArray(data)
            ? data
            : [];

        return FIXTURES_CACHE;
      }

    } catch (error) {
      console.warn(
        "No se pudo cargar fixtures.json:",
        error
      );
    }

    FIXTURES_CACHE = [];

    return FIXTURES_CACHE;
  }

  /* =========================================================
     GENERADOR DE URL DE NOTICIAS
  ========================================================= */

  function articleURL(article) {
    if (!article) {
      return "#";
    }

    /*
      Las noticias nuevas creadas desde el admin
      ya vienen con:

      article.html?id=...

      Las antiguas pueden tener una URL manual.
    */

    if (article.url) {
      return `${BASE}${article.url}`;
    }

    if (article.id) {
      return `${BASE}article.html?id=${encodeURIComponent(
        article.id
      )}`;
    }

    return "#";
  }

  /* =========================================================
     TARJETA DE NOTICIA
  ========================================================= */

  function storyCardHTML(article, options = {}) {
    const featuredClass =
      options.featured
        ? "story-featured"
        : "";

    const category =
      escapeHTML(
        article.category || "RUGBY"
      );

    const subcategory =
      escapeHTML(
        article.subcategory || "ACTUALIDAD"
      );

    const title =
      escapeHTML(
        article.title || "Sin título"
      );

    const excerpt =
      escapeHTML(
        article.excerpt || ""
      );

    const author =
      escapeHTML(
        article.author || "DropRugby"
      );

    const date =
      formatDateShort(article.date);

    let visual = "";

    if (article.imageUrl) {

      visual = `
        <div class="story-image photo-not-clickable">
          <img
            src="${safeURL(article.imageUrl)}"
            alt=""
            loading="lazy"
          >
        </div>
      `;

    } else {

      visual = `
        <div class="story-image ph-image photo-not-clickable ${
          escapeHTML(
            article.imageClass || "img-tone-1"
          )
        }"></div>
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
            Por ${author} · ${escapeHTML(
              date
            )}
          </div>

        </div>

      </article>
    `;
  }

  /* =========================================================
     HERO DE HOME
  ========================================================= */

  async function renderHomeHero(featured) {
    const heroEl = $("#home-hero");

    if (!heroEl || !featured) {
      return;
    }

    const category =
      escapeHTML(
        featured.category || "RUGBY"
      );

    const title =
      escapeHTML(
        featured.title || "Sin título"
      );

    let heroVisual = "";

    if (featured.imageUrl) {

      heroVisual = `
        <div class="hero-image photo-not-clickable">

          <img
            src="${safeURL(featured.imageUrl)}"
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
        <div class="hero-image ${
          escapeHTML(
            featured.imageClass ||
            "img-tone-1"
          )
        } photo-not-clickable ph-image">

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
      $("#home-hero-link");

    if (heroLink) {
      heroLink.href =
        articleURL(featured);
    }
  }

  /* =========================================================
     HOME
  ========================================================= */

  async function renderHome() {

    const grid =
      $("#home-top-stories");

    const pumasEl =
      $("#home-los-pumas");

    const superRugbyEl =
      $("#home-super-rugby");

    const urbaTop14El =
      $("#home-urba-top14");

    const urbaEl =
      $("#home-urba");

    const heroEl =
      $("#home-hero");

    if (
      !grid &&
      !pumasEl &&
      !superRugbyEl &&
      !urbaTop14El &&
      !urbaEl &&
      !heroEl
    ) {
      return;
    }

    const articles =
      (await loadArticles())
        .slice()
        .sort((a, b) =>
          String(b.date || "").localeCompare(
            String(a.date || "")
          )
        );

    if (!articles.length) {
      if (grid) {
        grid.innerHTML = `
          <p class="empty-state">
            Todavía no hay noticias publicadas.
          </p>
        `;
      }

      return;
    }

    /* -----------------------------------------
       NOTICIA DESTACADA
    ----------------------------------------- */

    const featured =
      articles.find(
        article => article.featured
      ) || articles[0];

    await renderHomeHero(featured);

    /* -----------------------------------------
       ÚLTIMAS NOTICIAS
    ----------------------------------------- */

    const rest =
      articles.filter(
        article =>
          article.id !== featured.id
      );

    if (grid) {

      grid.innerHTML =
        rest
          .slice(0, 3)
          .map((article, index) =>
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
      element
    ) {

      if (!element) return;

      const items =
        articles
          .filter(
            article =>
              normalizeCategory(
                article.category
              ) ===
              normalizeCategory(
                categoryName
              )
          )
          .slice(0, 3);

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
          .map(article =>
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
     PÁGINAS DE CATEGORÍA
  ========================================================= */

  async function renderCategoryPage(
    categoryName
  ) {

    const grid =
      $("#category-grid");

    if (!grid) return;

    const articles =
      (await loadArticles())
        .filter(article =>
          normalizeCategory(
            article.category
          ) ===
          normalizeCategory(
            categoryName
          )
        )
        .sort((a, b) =>
          String(b.date || "").localeCompare(
            String(a.date || "")
          )
        );

    const chips =
      $$(".filter-bar .filter-chip");

    let activeFilter = "TODAS";

    function paint() {

      const filtered =
        activeFilter === "TODAS"
          ? articles
          : articles.filter(article =>
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
          .map(article =>
            storyCardHTML(article)
          )
          .join("");

      observeReveals();
    }

    chips.forEach(chip => {

      chip.addEventListener(
        "click",
        () => {

          chips.forEach(
            item =>
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

  /* =========================================================
     CALENDARIO
  ========================================================= */

  async function renderCalendar() {

    const listEl =
      $("#calendar-list");

    if (!listEl) return;

    const fixtures =
      await loadFixtures();

    const competitionButtons =
      $(
        ".competition-select .filter-chip"
      );

    const dateButtons =
      $(
        ".date-filter-bar .date-chip"
      );

    const dayLabel =
      $("#day-nav-label");

    const prevBtn =
      $("#day-prev");

    const nextBtn =
      $("#day-next");

    const todayBtn =
      $("#day-today");

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

    /* -----------------------------------------
       FECHA INICIAL
    ----------------------------------------- */

    const availableDates =
      fixtures
        .map(
          fixture => fixture.date
        )
        .filter(Boolean)
        .sort();

    if (
      availableDates.length &&
      !fixtures.some(
        fixture =>
          fixture.date ===
          isoFromDate(currentDate)
      )
    ) {

      currentDate =
        dateFromISO(
          availableDates[0]
        );

    }

    /* -----------------------------------------
       AGRUPAR
    ----------------------------------------- */

    function groupByDateAndCompetition(
      items
    ) {

      const grouped = {};

      items.forEach(fixture => {

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

      });

      return grouped;
    }

    /* -----------------------------------------
       RANGOS
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
          { length: 7 },
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

        const start =
          new Date(currentDate);

        const day =
          start.getDay();

        const diffToSaturday =
          (6 - day + 7) % 7;

        const saturday =
          new Date(start);

        saturday.setDate(
          saturday.getDate() +
          diffToSaturday
        );

        const sunday =
          new Date(saturday);

        sunday.setDate(
          sunday.getDate() + 1
        );

        return [
          isoFromDate(saturday),
          isoFromDate(sunday)
        ];
      }

      if (mode === "manana") {

        const tomorrow =
          new Date(currentDate);

        tomorrow.setDate(
          tomorrow.getDate() + 1
        );

        return [
          isoFromDate(
            tomorrow
          )
        ];
      }

      return [
        isoFromDate(currentDate)
      ];
    }

    /* -----------------------------------------
       LABEL
    ----------------------------------------- */

    function updateDayLabel() {

      if (!dayLabel) return;

      if (mode === "dia") {

        dayLabel.textContent =
          `${DIAS[currentDate.getDay()]} · ${formatDateShort(
            isoFromDate(currentDate)
          )}`;

      } else if (
        mode === "manana"
      ) {

        const tomorrow =
          new Date(currentDate);

        tomorrow.setDate(
          tomorrow.getDate() + 1
        );

        dayLabel.textContent =
          `${DIAS[tomorrow.getDay()]} · ${formatDateShort(
            isoFromDate(tomorrow)
          )}`;

      } else if (
        mode === "finde"
      ) {

        dayLabel.textContent =
          "FIN DE SEMANA";

      } else {

        dayLabel.textContent =
          "TODA LA SEMANA";
      }
    }

    /* -----------------------------------------
       PINTAR CALENDARIO
    ----------------------------------------- */

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
        sortedDates.map(date => {

          const dateObject =
            dateFromISO(date);

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
                                fixture.time
                              )}
                            </div>

                            <div class="match-teams">
                              ${escapeHTML(
                                fixture.home
                              )}
                              vs.
                              ${escapeHTML(
                                fixture.away
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
                    dateObject.getDay()
                  ]}
                </span>

                <span class="full-date">
                  ${formatDateShort(date)}
                </span>

              </div>

              ${competitionsHTML}

            </div>
          `;

        }).join("");
    }

    /* -----------------------------------------
       COMPETICIONES
    ----------------------------------------- */

    competitionButtons.forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            competitionButtons.forEach(
              item =>
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
       FECHAS
    ----------------------------------------- */

    dateButtons.forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            dateButtons.forEach(
              item =>
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
       ANTERIOR
    ----------------------------------------- */

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

    /* -----------------------------------------
       SIGUIENTE
    ----------------------------------------- */

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

    /* -----------------------------------------
       HOY
    ----------------------------------------- */

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

          mode = "dia";

          dateButtons.forEach(
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
     PREVIEW CALENDARIO HOME
  ========================================================= */

  async function renderCalendarPreview() {

    const element =
      $("#home-calendar-preview");

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
          fixture => `
            <div class="match-row">

              <div class="match-time">
                ${escapeHTML(
                  fixture.time
                )}
              </div>

              <div class="match-teams">

                ${escapeHTML(
                  fixture.home
                )}

                vs.

                ${escapeHTML(
                  fixture.away
                )}

                <span
                  style="
                    color:var(--muted-light);
                    font-weight:400;
                  "
                >
                  —
                  ${escapeHTML(
                    fixture.competition
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

  /* =========================================================
     BUSCADOR GLOBAL
  ========================================================= */

  function setupSearch() {

    const openButtons =
      $$(".search-btn");

    const overlay =
      $("#search-overlay");

    const closeButton =
      $("#search-close");

    const input =
      $("#search-input");

    const results =
      $("#search-results");

    if (
      !overlay ||
      !openButtons.length ||
      !input ||
      !results
    ) {
      return;
    }

    let articlesForSearch = [];

    async function ensureSearchData() {

      if (
        articlesForSearch.length
      ) {
        return;
      }

      articlesForSearch =
        await loadArticles();
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

            await ensureSearchData();

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
      event => {

        if (
          event.target === overlay
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
          event.key === "Escape"
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

          results.innerHTML = "";

          return;
        }

        const matches =
          articlesForSearch.filter(
            article => {

              const searchable = [
                article.title,
                article.category,
                article.subcategory,
                article.excerpt,
                article.author
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              return searchable.includes(
                query
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
            .map(
              article => `
                <a
                  class="search-result"
                  href="${articleURL(
                    article
                  )}"
                >

                  <p class="category">
                    ${escapeHTML(
                      article.category ||
                      "RUGBY"
                    ).toUpperCase()}
                    ·
                    ${escapeHTML(
                      article.subcategory ||
                      "ACTUALIDAD"
                    ).toUpperCase()}
                  </p>

                  <h3>
                    ${escapeHTML(
                      article.title
                    )}
                  </h3>

                </a>
              `
            )
            .join("");
      }
    );
  }

  /* =========================================================
     NEWSLETTER
  ========================================================= */

  function setupNewsletter() {

    const forms =
      $$(".newsletter-form");

    forms.forEach(form => {

      /*
        Evitamos agregar dos listeners
        si el HTML utiliza ambas clases.
      */

      if (
        form.dataset.newsletterReady ===
        "true"
      ) {
        return;
      }

      form.dataset.newsletterReady =
        "true";

      form.addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          const emailInput =
            form.querySelector(
              "#newsletter-email"
            ) ||
            form.querySelector(
              'input[type="email"]'
            );

          const submitButton =
            form.querySelector(
              "#newsletter-submit"
            ) ||
            form.querySelector(
              'button[type="submit"]'
            );

          const message =
            form.querySelector(
              "#newsletter-message"
            ) ||
            form.querySelector(
              "small"
            );

          if (!emailInput) {
            return;
          }

          const email =
            emailInput.value.trim();

          if (!email) {

            if (message) {
              message.textContent =
                "Ingresá tu email.";
            }

            return;
          }

          const validEmail =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/
              .test(email);

          if (!validEmail) {

            if (message) {
              message.textContent =
                "Ingresá un email válido.";
            }

            return;
          }

          if (submitButton) {

            submitButton.disabled =
              true;

            submitButton.innerHTML =
              "Enviando...";
          }

          if (message) {

            message.textContent =
              "Procesando suscripción...";
          }

          try {

            const response =
              await fetch(
                `${BASE}api/newsletter`,
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
              result =
                await response.json();
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

            form.classList.add(
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

            if (submitButton) {

              submitButton.disabled =
                false;

              submitButton.innerHTML =
                `Suscribirme <span>→</span>`;
            }
          }
        }
      );
    });
  }

  /* =========================================================
     ACTUALIZACIÓN DE DATOS
  ========================================================= */

  function setupDataRefresh() {

    window.addEventListener(
      "droprugby:data-updated",
      () => {

        ARTICLES_CACHE = null;
        FIXTURES_CACHE = null;

        renderHome();
        renderCalendarPreview();
        renderCalendar();

        const categoryGrid =
          $("#category-grid");

        if (categoryGrid) {

          renderCategoryPage(
            categoryGrid.dataset.category
          );
        }

      }
    );
  }

  /* =========================================================
     INICIALIZACIÓN
  ========================================================= */

  async function init() {

    setupMobileMenu();

    setupRevealObserver();

    setupSearch();

    setupNewsletter();

    setupDataRefresh();

    /*
      Cargamos todo en paralelo.
    */

    await Promise.allSettled([
      renderHome(),
      renderCalendarPreview(),
      renderCalendar()
    ]);

    const categoryGrid =
      $("#category-grid");

    if (
      categoryGrid &&
      categoryGrid.dataset.category
    ) {

      await renderCategoryPage(
        categoryGrid.dataset.category
      );
    }

    observeReveals();
  }

  /* =========================================================
     DOM READY
  ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }

})();

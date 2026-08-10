/* ==========================================================================
   DropRugby V4 — script.js

   Menú mobile
   Animaciones al scroll
   Buscador global
   Filtros de categoría
   Calendario dinámico
   Render de noticias
   Escudos de clubes
   Tabla URBA
   ========================================================================== */

const BASE = window.ASSET_BASE || "";

/* ==========================================================================
   ESCUDOS DE CLUBES
   ========================================================================== */

const DROP_RUGBY_TEAMS = {
  alumni: {
    name: "Alumni",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231144578748476/Alumni.png",
    aliases: ["alumni"]
  },

  buenos_aires_crc: {
    name: "Buenos Aires C&RC",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231158994698280/bacrc.png",
    aliases: ["biei", "buenos aires c&rc", "buenos aires"]
  },

  belgrano_athletic: {
    name: "Belgrano Athletic",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231180058493030/belgrano.png",
    aliases: ["belgrano", "belgrano athletic", "bac"]
  },

  casi: {
    name: "CASI",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231191177592933/CASI.png",
    aliases: ["casi"]
  },

  champagnat: {
    name: "Champagnat",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231198433611856/Champagnat.png",
    aliases: ["champa", "champagnat"]
  },

  cuba: {
    name: "CUBA",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231210794229770/cuba.png",
    aliases: ["cuba"]
  },

  newman: {
    name: "Newman",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231225570893844/escudo-NWM.png",
    aliases: ["newman"]
  },

  hindu: {
    name: "Hindú",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231245988503602/Hindu_.png",
    aliases: ["hindu", "hindú"]
  },

  la_plata: {
    name: "La Plata",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231255010578452/La_Plata.png",
    aliases: ["la plata"]
  },

  los_tilos: {
    name: "Los Tilos",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231263948509274/lostilos.png",
    aliases: ["los tilos"]
  },

  los_matreros: {
    name: "Los Matreros",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231275109552228/Matereros_.png",
    aliases: ["los matreros", "matreros"]
  },

  regatas_bella_vista: {
    name: "Regatas Bella Vista",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231286635634729/REGATAS_bv.png",
    aliases: ["regatas", "regatas bella vista"]
  },

  atletico_del_rosario: {
    name: "Atletico del Rosario",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231293858226186/rosario.png",
    aliases: ["plaza", "atletico del rosario", "atlético del rosario"]
  },

  sic: {
    name: "SIC",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231304788578314/SIC_.png",
    aliases: ["sic"]
  }
};

function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getTeamByName(value) {
  const key = normalizeTeamName(value);

  return Object.values(DROP_RUGBY_TEAMS).find(team =>
    team.aliases.some(alias => normalizeTeamName(alias) === key) ||
    normalizeTeamName(team.name) === key
  ) || null;
}

let TEAMS_LOADED = false;
let TEAMS_LOADING = null;

async function loadTeams() {
  if (TEAMS_LOADED) return DROP_RUGBY_TEAMS;
  if (TEAMS_LOADING) return TEAMS_LOADING;

  TEAMS_LOADING = (async () => {
    try {
      const apiRes = await fetch(
        BASE + "api/content?t=" + Date.now(),
        { cache: "no-store" }
      );

      if (apiRes.ok) {
        const content = await apiRes.json();

        const clubLogos = content?.settings?.clubLogos || {};

        if (
          content?.teams?.clubs &&
          typeof content.teams.clubs === "object"
        ) {
          Object.entries(content.teams.clubs).forEach(([id, team]) => {
            if (!team || typeof team !== "object") return;

            DROP_RUGBY_TEAMS[id] = {
              name: team.name || id,
              logo: clubLogos[id] || team.logo || "",
              aliases: Array.isArray(team.aliases)
                ? team.aliases
                : []
            };
          });
        }

        Object.entries(clubLogos).forEach(([id, logo]) => {
          if (DROP_RUGBY_TEAMS[id]) {
            DROP_RUGBY_TEAMS[id].logo = logo;
          }
        });
      }
    } catch (error) {
      try {
        const res = await fetch(
          BASE + "data/teams.json",
          { cache: "no-store" }
        );

        if (res.ok) {
          const data = await res.json();

          if (data?.clubs && typeof data.clubs === "object") {
            Object.entries(data.clubs).forEach(([id, team]) => {
              if (!team || typeof team !== "object") return;

              DROP_RUGBY_TEAMS[id] = {
                name: team.name || id,
                logo: team.logo || "",
                aliases: Array.isArray(team.aliases)
                  ? team.aliases
                  : []
              };
            });
          }
        }
      } catch (_) {
        /* Mantener registro incorporado */
      }
    }

    TEAMS_LOADED = true;
    return DROP_RUGBY_TEAMS;
  })();

  return TEAMS_LOADING;
}

function teamShield(value, className = "team-shield") {
  const team = getTeamByName(value);

  if (!team) {
    const initials = String(value || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(word => word[0])
      .join("")
      .toUpperCase() || "?";

    return `
      <span
        class="${className} team-shield-fallback"
        aria-hidden="true"
      >${initials}</span>
    `;
  }

  const safeName = String(team.name || "")
    .replace(/'/g, "\\'");

  const fallbackLetters = String(team.name || "?")
    .slice(0, 2)
    .toUpperCase();

  return `
    <img
      class="${className}"
      src="${team.logo}"
      alt="Escudo de ${team.name}"
      loading="lazy"
      referrerpolicy="no-referrer"
      onerror="this.onerror=null;this.replaceWith(
        Object.assign(
          document.createElement('span'),
          {
            className:'${className} team-shield-fallback',
            textContent:'${fallbackLetters}'
          }
        )
      )"
    >
  `;
}


/* ==========================================================================
   MENÚ MOBILE
   ========================================================================== */

const menuBtn = document.querySelector(".menu-btn");
const mobileNav = document.querySelector(".mobile-nav");

if (menuBtn && mobileNav) {
  menuBtn.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");

    menuBtn.setAttribute(
      "aria-expanded",
      open ? "true" : "false"
    );
  });

  mobileNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });
}


/* ==========================================================================
   ANIMACIONES AL SCROLL
   ========================================================================== */

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

function observeReveals(root = document) {
  root
    .querySelectorAll(".reveal:not(.visible)")
    .forEach(el => observer.observe(el));
}

observeReveals();


/* ==========================================================================
   NEWSLETTER
   ========================================================================== */

document.querySelectorAll(".newsletter-form").forEach(form => {
  form.addEventListener("submit", e => {
    e.preventDefault();
    form.classList.add("submitted");
  });
});


/* ==========================================================================
   CARGA DE NOTICIAS
   ========================================================================== */

let ARTICLES_CACHE = null;

async function loadArticles() {
  if (ARTICLES_CACHE) return ARTICLES_CACHE;

  try {
    const res = await fetch(
      BASE + "api/content?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error("API unavailable");
    }

    const data = await res.json();

    ARTICLES_CACHE = Array.isArray(data.articles)
      ? data.articles
      : [];

    return ARTICLES_CACHE;
  } catch (_) {
    const local = localStorage.getItem("droprugby_articles");

    if (local) {
      try {
        ARTICLES_CACHE = JSON.parse(local);
        return ARTICLES_CACHE;
      } catch (_) {}
    }

    if (window.DROP_RUGBY_DATA?.articles) {
      ARTICLES_CACHE = window.DROP_RUGBY_DATA.articles;
      return ARTICLES_CACHE;
    }

    try {
      const res = await fetch(
        BASE + "data/articles.json",
        { cache: "no-store" }
      );

      ARTICLES_CACHE = await res.json();
    } catch (_) {
      ARTICLES_CACHE = [];
    }

    return ARTICLES_CACHE;
  }
}


/* ==========================================================================
   CARGA DE FIXTURES
   ========================================================================== */

let FIXTURES_CACHE = null;

async function loadFixtures() {
  if (FIXTURES_CACHE) return FIXTURES_CACHE;

  try {
    const res = await fetch(
      BASE + "api/content?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error("API unavailable");
    }

    const data = await res.json();

    FIXTURES_CACHE = Array.isArray(data.fixtures)
      ? data.fixtures
      : [];

    return FIXTURES_CACHE;
  } catch (_) {
    const local = localStorage.getItem("droprugby_fixtures");

    if (local) {
      try {
        FIXTURES_CACHE = JSON.parse(local);
        return FIXTURES_CACHE;
      } catch (_) {}
    }

    if (window.DROP_RUGBY_DATA?.fixtures) {
      FIXTURES_CACHE = window.DROP_RUGBY_DATA.fixtures;
      return FIXTURES_CACHE;
    }

    try {
      const res = await fetch(
        BASE + "data/fixtures.json",
        { cache: "no-store" }
      );

      FIXTURES_CACHE = await res.json();
    } catch (_) {
      FIXTURES_CACHE = [];
    }

    return FIXTURES_CACHE;
  }
}


/* ==========================================================================
   CARGA DE TABLA
   ========================================================================== */

let STANDINGS_CACHE = null;

async function loadStandings() {
  if (STANDINGS_CACHE) return STANDINGS_CACHE;

  try {
    const res = await fetch(
      BASE + "api/content?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error("API unavailable");
    }

    const data = await res.json();

    if (
      Array.isArray(data.standings) &&
      data.standings.length
    ) {
      STANDINGS_CACHE = data.standings;
      return STANDINGS_CACHE;
    }

    throw new Error("empty");
  } catch (_) {
    STANDINGS_CACHE =
      window.DROP_RUGBY_DATA?.standings || [];

    return STANDINGS_CACHE;
  }
}


/* ==========================================================================
   UTILIDADES DE FECHA
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

function formatDateShort(iso) {
  if (!iso) return "";

  const parts = String(iso).split("-").map(Number);

  if (parts.length !== 3) {
    return String(iso);
  }

  const [y, m, d] = parts;

  return `${String(d).padStart(2, "0")} ${MESES[m - 1]} ${y}`;
}

function dateFromISO(iso) {
  const [y, m, d] = String(iso)
    .split("-")
    .map(Number);

  return new Date(y, m - 1, d);
}

function isoFromDate(dt) {
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0")
  ].join("-");
}

function getTodayISO() {
  const now = new Date();

  return isoFromDate(now);
}


/* ==========================================================================
   TARJETAS DE NOTICIAS
   ========================================================================== */

function storyCardHTML(article, opts = {}) {
  const featuredClass = opts.featured
    ? "story-featured"
    : "";

  const visual = article.imageUrl
    ? `
      <div class="story-image photo-not-clickable">
        <img
          src="${String(article.imageUrl).replace(/"/g, "&quot;")}"
          alt=""
          loading="lazy"
        >
      </div>
    `
    : `
      <div class="story-image ph-image photo-not-clickable ${
        article.imageClass || "img-tone-1"
      }"></div>
    `;

  const category = String(
    article.category || "Rugby"
  ).toUpperCase();

  const subcategory = String(
    article.subcategory || "ACTUALIDAD"
  ).toUpperCase();

  const articleUrl =
    `article.html?id=${encodeURIComponent(article.id || "")}`;

  const title = String(
    article.title || "Sin título"
  );

  const excerpt = String(
    article.excerpt || ""
  );

  const author = String(
    article.author || "DropRugby"
  );

  const date =
    article.date ||
    new Date().toISOString().slice(0, 10);

  return `
    <article class="story ${featuredClass} reveal">
      ${visual}

      <div class="story-body">
        <p class="category">
          ${category} · ${subcategory}
        </p>

        <h3>
          <a href="${BASE}${articleUrl}">
            ${title}
          </a>
        </h3>

        <p>${excerpt}</p>

        <div class="meta">
          Por ${author} ·
          ${formatDateShort(date).toUpperCase()}
        </div>
      </div>
    </article>
  `;
}


/* ==========================================================================
   PORTADA
   ========================================================================== */

async function renderHome() {
  await loadTeams();

  const grid =
    document.getElementById("home-top-stories");

  const pumasEl =
    document.getElementById("home-los-pumas");

  const srEl =
    document.getElementById("home-super-rugby");

  const urbaTop14El =
    document.getElementById("home-urba-top14");

  const urbaEl =
    document.getElementById("home-urba");

  const heroEl =
    document.getElementById("home-hero");

  if (!grid && !heroEl) return;

  const articles = (await loadArticles())
    .filter(
      a =>
        a.published !== false &&
        !a.scheduled
    )
    .slice()
    .sort(
      (a, b) =>
        String(b.date || "").localeCompare(
          String(a.date || "")
        )
    );

  const featured =
    articles.find(a => a.featured) ||
    articles[0];

  if (heroEl && featured) {
    const heroVisual = featured.imageUrl
      ? `
        <div class="hero-image photo-not-clickable">
          <img
            src="${String(featured.imageUrl).replace(/"/g, "&quot;")}"
            alt=""
            loading="eager"
          >

          <div class="image-overlay"></div>

          <div class="hero-card-caption">
            <span>
              TOP STORY ·
              ${String(featured.category || "RUGBY").toUpperCase()}
            </span>

            <h2>${featured.title}</h2>
          </div>
        </div>
      `
      : `
        <div class="hero-image ${
          featured.imageClass || "img-tone-1"
        } photo-not-clickable ph-image">

          <div class="image-overlay"></div>

          <div class="hero-card-caption">
            <span>
              TOP STORY ·
              ${String(featured.category || "RUGBY").toUpperCase()}
            </span>

            <h2>${featured.title}</h2>
          </div>
        </div>
      `;

    const canonicalHeroUrl =
      `${BASE}article.html?id=${encodeURIComponent(
        featured.id || ""
      )}`;

    heroEl.innerHTML = `
      <a
        class="hero-card-inner hero-card-link"
        href="${canonicalHeroUrl}"
      >
        ${heroVisual}
      </a>
    `;

    const heroLink =
      document.getElementById("home-hero-link");

    if (heroLink) {
      heroLink.href = canonicalHeroUrl;
    }
  }

  const rest = articles.filter(
    a => a.id !== (featured && featured.id)
  );

  if (grid) {
    grid.innerHTML = rest
      .slice(0, 3)
      .map((a, i) =>
        storyCardHTML(a, {
          featured: i === 0
        })
      )
      .join("");
  }

  const byCategory = (
    name,
    el,
    n = 3
  ) => {
    if (!el) return;

    const items = articles
      .filter(
        a =>
          a.category === name &&
          a.published !== false &&
          !a.scheduled
      )
      .slice(0, n);

    el.innerHTML = items.length
      ? items.map(a =>
          storyCardHTML(a)
        ).join("")
      : `
        <p class="empty-state">
          Todavía no hay noticias publicadas
          en esta categoría.
        </p>
      `;
  };

  byCategory(
    "Los Pumas",
    pumasEl
  );

  byCategory(
    "Super Rugby",
    srEl
  );

  byCategory(
    "URBA TOP 14",
    urbaTop14El
  );

  byCategory(
    "URBA",
    urbaEl
  );

  observeReveals();
}


/* ==========================================================================
   PÁGINA DE CATEGORÍA
   ========================================================================== */

async function renderCategoryPage(categoryName) {
  const grid =
    document.getElementById("category-grid");

  if (!grid) return;

  const articles = (await loadArticles())
    .filter(
      a =>
        a.category === categoryName &&
        a.published !== false &&
        !a.scheduled
    )
    .sort(
      (a, b) =>
        String(b.date || "").localeCompare(
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
            a =>
              String(a.subcategory || "")
                .toUpperCase() ===
              activeFilter
          );

    grid.innerHTML = filtered.length
      ? filtered.map(a =>
          storyCardHTML(a)
        ).join("")
      : `
        <p class="empty-state">
          No hay noticias para este filtro todavía.
        </p>
      `;

    observeReveals();
  }

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c =>
        c.classList.remove("active")
      );

      chip.classList.add("active");

      activeFilter =
        chip.dataset.filter;

      paint();
    });
  });

  paint();
}


/* ==========================================================================
   CALENDARIO
   ========================================================================== */

async function renderCalendar() {
  await loadTeams();

  const listEl =
    document.getElementById("calendar-list");

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
    document.getElementById("day-prev");

  const nextBtn =
    document.getElementById("day-next");

  const todayBtn =
    document.getElementById("day-today");

  let activeCompetition = "TODAS";

  let mode = "dia";

  /*
   * IMPORTANTE:
   *
   * currentDate representa SIEMPRE la fecha real
   * seleccionada por el usuario.
   *
   * NO se reemplaza por la fecha del primer fixture.
   */

  let currentDate = new Date();

  currentDate.setHours(
    0,
    0,
    0,
    0
  );


  function groupByDateAndCompetition(items) {
    const byDate = {};

    items.forEach(f => {
      if (!f || !f.date) return;

      if (!byDate[f.date]) {
        byDate[f.date] = {};
      }

      if (!byDate[f.date][f.competition]) {
        byDate[f.date][f.competition] = [];
      }

      byDate[f.date][f.competition].push(f);
    });

    return byDate;
  }


  function getRangeDates() {

    /* ---------------- HOY ---------------- */

    if (mode === "dia") {
      return [
        isoFromDate(currentDate)
      ];
    }


    /* ---------------- MAÑANA ---------------- */

    if (mode === "manana") {
      const d =
        new Date(currentDate);

      d.setDate(
        d.getDate() + 1
      );

      return [
        isoFromDate(d)
      ];
    }


    /* ---------------- FIN DE SEMANA ---------------- */

    if (mode === "finde") {
      const start =
        new Date(currentDate);

      const day =
        start.getDay();

      /*
       * Buscamos el sábado correspondiente.
       *
       * Domingo = 0
       * Lunes = 1
       * ...
       * Sábado = 6
       */

      let diffToSaturday;

      if (day === 0) {
        diffToSaturday = -1;
      } else {
        diffToSaturday = 6 - day;
      }

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


    /* ---------------- SEMANA ---------------- */

    if (mode === "semana") {
      const start =
        new Date(currentDate);

      const day =
        start.getDay();

      /*
       * Convertimos la fecha seleccionada
       * en lunes de esa semana.
       */

      const diffToMonday =
        (day + 6) % 7;

      start.setDate(
        start.getDate() -
        diffToMonday
      );

      return Array.from(
        { length: 7 },
        (_, i) => {
          const d =
            new Date(start);

          d.setDate(
            start.getDate() + i
          );

          return isoFromDate(d);
        }
      );
    }

    return [
      isoFromDate(currentDate)
    ];
  }


  function updateDayLabel() {
    if (!dayLabel) return;

    if (mode === "dia") {
      dayLabel.textContent =
        `${DIAS[currentDate.getDay()]} · ` +
        `${formatDateShort(
          isoFromDate(currentDate)
        )}`;
      return;
    }


    if (mode === "manana") {
      const d =
        new Date(currentDate);

      d.setDate(
        d.getDate() + 1
      );

      dayLabel.textContent =
        `${DIAS[d.getDay()]} · ` +
        `${formatDateShort(
          isoFromDate(d)
        )}`;

      return;
    }


    if (mode === "finde") {
      const dates =
        getRangeDates();

      dayLabel.textContent =
        `${formatDateShort(
          dates[0]
        )} — ${formatDateShort(
          dates[1]
        )}`;

      return;
    }


    if (mode === "semana") {
      const dates =
        getRangeDates();

      dayLabel.textContent =
        `${formatDateShort(
          dates[0]
        )} — ${formatDateShort(
          dates[6]
        )}`;
    }
  }


  function paint() {
    updateDayLabel();

    const dates =
      getRangeDates();

    let filtered =
      fixtures.filter(
        f =>
          f &&
          dates.includes(f.date)
      );

    if (
      activeCompetition !==
      "TODAS"
    ) {
      filtered =
        filtered.filter(
          f =>
            String(
              f.competition || ""
            ).toUpperCase() ===
            activeCompetition
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
          No hay partidos cargados para
          este filtro. Probá con otra
          competición o fecha.
        </p>
      `;

      return;
    }

    listEl.innerHTML =
      sortedDates.map(date => {

        const dt =
          dateFromISO(date);

        const comps =
          grouped[date];

        const compsHTML =
          Object.keys(comps)
            .sort()
            .map(compName => {

              const rows =
                comps[compName]
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
                  .map(f => `
                    <div class="match-row">

                      <div class="match-time">
                        ${f.time || "--:--"}
                      </div>

                      <div class="match-teams team-matchup">

                        <span class="team-side">
                          ${teamShield(f.home)}

                          <span>
                            ${f.home || ""}
                          </span>
                        </span>

                        <span class="team-vs">
                          vs.
                        </span>

                        <span class="team-side team-side-away">

                          <span>
                            ${f.away || ""}
                          </span>

                          ${teamShield(f.away)}

                        </span>

                      </div>

                      <div class="match-channel">
                        ${f.channel || ""}
                      </div>

                    </div>
                  `)
                  .join("");

              return `
                <div class="competition-block">

                  <div class="competition-name">
                    ${String(
                      compName || ""
                    ).toUpperCase()}
                  </div>

                  ${rows}

                </div>
              `;
            })
            .join("");

        return `
          <div class="day-block">

            <div class="day-block-header">

              <span class="dow">
                ${DIAS[dt.getDay()]}
              </span>

              <span class="full-date">
                ${formatDateShort(date)}
              </span>

            </div>

            ${compsHTML}

          </div>
        `;
      })
      .join("");
  }


  /* ---------------- FILTROS DE COMPETICIÓN ---------------- */

  compBtns.forEach(btn => {
    btn.addEventListener("click", () => {

      compBtns.forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      activeCompetition =
        btn.dataset.filter ||
        "TODAS";

      paint();
    });
  });


  /* ---------------- FILTROS DE FECHA ---------------- */

  dateBtns.forEach(btn => {
    btn.addEventListener("click", () => {

      dateBtns.forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      mode =
        btn.dataset.mode ||
        "dia";

      paint();
    });
  });


  /* ---------------- DÍA ANTERIOR ---------------- */

  if (prevBtn) {
    prevBtn.addEventListener(
      "click",
      () => {

        if (mode === "semana") {
          currentDate.setDate(
            currentDate.getDate() - 7
          );
        } else {
          currentDate.setDate(
            currentDate.getDate() - 1
          );
        }

        paint();
      }
    );
  }


  /* ---------------- DÍA SIGUIENTE ---------------- */

  if (nextBtn) {
    nextBtn.addEventListener(
      "click",
      () => {

        if (mode === "semana") {
          currentDate.setDate(
            currentDate.getDate() + 7
          );
        } else {
          currentDate.setDate(
            currentDate.getDate() + 1
          );
        }

        paint();
      }
    );
  }


  /* ---------------- VOLVER A HOY ---------------- */

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

        dateBtns.forEach(b =>
          b.classList.toggle(
            "active",
            b.dataset.mode === "dia"
          )
        );

        paint();
      }
    );
  }


  /* ---------------- PRIMER RENDER ---------------- */

  paint();
}


/* ==========================================================================
   PREVIEW DEL CALENDARIO EN HOME
   ========================================================================== */

async function renderCalendarPreview() {
  await loadTeams();

  const el =
    document.getElementById(
      "home-calendar-preview"
    );

  if (!el) return;

  const fixtures =
    await loadFixtures();

  /*
   * Acá también corregimos el problema:
   *
   * Antes:
   *   fixtures.slice(0, 6)
   *
   * Eso podía mostrar partidos pasados.
   *
   * Ahora tomamos solamente partidos
   * que todavía no ocurrieron.
   */

  const now =
    new Date();

  const upcoming =
    fixtures
      .filter(f => {
        if (!f || !f.date) {
          return false;
        }

        const dateTime =
          new Date(
            `${f.date}T${f.time || "00:00"}`
          );

        return dateTime >= now;
      })
      .slice()
      .sort((a, b) =>
        (
          String(a.date) +
          String(a.time || "")
        ).localeCompare(
          String(b.date) +
          String(b.time || "")
        )
      )
      .slice(0, 6);

  if (!upcoming.length) {
    el.innerHTML = `
      <p class="empty-state">
        No hay próximos partidos cargados.
      </p>
    `;

    return;
  }

  el.innerHTML =
    upcoming.map(f => `
      <div class="match-row">

        <div class="match-time">
          ${f.time || "--:--"}
        </div>

        <div class="match-teams team-matchup">

          <span class="team-side">
            ${teamShield(f.home)}

            <span>
              ${f.home || ""}
            </span>
          </span>

          <span class="team-vs">
            vs.
          </span>

          <span class="team-side team-side-away">

            <span>
              ${f.away || ""}
            </span>

            ${teamShield(f.away)}

          </span>

          <span
            style="
              color:var(--muted-light);
              font-weight:400;
            "
          >
            — ${f.competition || ""}
          </span>

        </div>

        <div class="match-channel">
          ${f.channel || ""}
        </div>

      </div>
    `).join("");
}


/* ==========================================================================
   TABLA DE POSICIONES URBA TOP 14
   ========================================================================== */

async function renderUrbaStandings() {
  await loadTeams();

  const el =
    document.getElementById(
      "urba-standings"
    );

  if (!el) return;

  const standings =
    (await loadStandings())
      .slice()
      .sort(
        (a, b) =>
          (Number(b.pts) - Number(a.pts)) ||
          (Number(b.diff) - Number(a.diff))
      );

  if (!standings.length) {
    el.innerHTML = `
      <p class="muted">
        Todavía no hay tabla cargada.
      </p>
    `;

    return;
  }

  const updated =
    window.DROP_RUGBY_DATA
      ?.standingsUpdated;

  const updatedLabel =
    updated
      ? formatDateShort(updated)
      : "";

  const relegationFrom =
    Math.max(
      0,
      standings.length - 2
    );

  el.innerHTML = `
    ${
      updatedLabel
        ? `<div class="standings-updated">
             Actualizada · ${updatedLabel}
           </div>`
        : ""
    }

    <div class="table-scroll">

      <table class="standings-table">

        <thead>
          <tr>
            <th class="col-pos">#</th>
            <th class="col-team">Equipo</th>
            <th>PJ</th>
            <th>PG</th>
            <th>PE</th>
            <th>PP</th>
            <th>DIF</th>
            <th>PTS</th>
          </tr>
        </thead>

        <tbody>

          ${standings.map((team, i) => `
            <tr
              class="${
                i >= relegationFrom
                  ? "is-relegation"
                  : ""
              }"
            >

              <td>
                ${i + 1}
              </td>

              <td class="standings-team">
                ${teamShield(team.team)}
                <span>
                  ${team.team || ""}
                </span>
              </td>

              <td>
                ${team.pj ?? 0}
              </td>

              <td>
                ${team.pg ?? 0}
              </td>

              <td>
                ${team.pe ?? 0}
              </td>

              <td>
                ${team.pp ?? 0}
              </td>

              <td
                class="${
                  Number(team.diff) > 0
                    ? "is-positive"
                    : Number(team.diff) < 0
                      ? "is-negative"
                      : ""
                }"
              >
                ${
                  Number(team.diff) > 0
                    ? "+"
                    : ""
                }${team.diff ?? 0}
              </td>

              <td>
                ${team.pts ?? 0}
              </td>

            </tr>
          `).join("")}

        </tbody>

      </table>

    </div>

    <div class="standings-legend">

      <span>
        <i class="dot dot-ok"></i>
        Permanencia
      </span>

      <span>
        <i class="dot dot-down"></i>
        Descenso
      </span>

    </div>
  `;
}


/* ==========================================================================
   BUSCADOR GLOBAL
   ========================================================================== */

function setupSearch() {
  const openBtns =
    document.querySelectorAll(
      ".search-btn"
    );

  const overlay =
    document.getElementById(
      "search-overlay"
    );

  const closeBtn =
    document.getElementById(
      "search-close"
    );

  const input =
    document.getElementById(
      "search-input"
    );

  const resultsEl =
    document.getElementById(
      "search-results"
    );

  if (
    !overlay ||
    !openBtns.length ||
    !input ||
    !resultsEl
  ) {
    return;
  }

  let articlesForSearch = [];

  async function ensureData() {
    if (!articlesForSearch.length) {
      articlesForSearch =
        await loadArticles();
    }
  }

  openBtns.forEach(btn => {
    btn.addEventListener(
      "click",
      async () => {

        overlay.classList.add("open");

        input.focus();

        await ensureData();
      }
    );
  });

  if (closeBtn) {
    closeBtn.addEventListener(
      "click",
      () =>
        overlay.classList.remove(
          "open"
        )
    );
  }

  overlay.addEventListener(
    "click",
    e => {
      if (e.target === overlay) {
        overlay.classList.remove(
          "open"
        );
      }
    }
  );

  document.addEventListener(
    "keydown",
    e => {
      if (e.key === "Escape") {
        overlay.classList.remove(
          "open"
        );
      }
    }
  );

  input.addEventListener(
    "input",
    () => {

      const q =
        input.value
          .trim()
          .toLowerCase();

      if (!q) {
        resultsEl.innerHTML = "";
        return;
      }

      const matches =
        articlesForSearch.filter(
          a => {

            const title =
              String(
                a.title || ""
              ).toLowerCase();

            const category =
              String(
                a.category || ""
              ).toLowerCase();

            const subcategory =
              String(
                a.subcategory || ""
              ).toLowerCase();

            const excerpt =
              String(
                a.excerpt || ""
              ).toLowerCase();

            return (
              title.includes(q) ||
              category.includes(q) ||
              subcategory.includes(q) ||
              excerpt.includes(q)
            );
          }
        );

      resultsEl.innerHTML =
        matches.length
          ? matches.map(a => {

              const articleUrl =
                `article.html?id=${
                  encodeURIComponent(
                    a.id || ""
                  )
                }`;

              return `
                <a
                  class="search-result"
                  href="${BASE}${articleUrl}"
                >

                  <p class="category">
                    ${String(
                      a.category || "RUGBY"
                    ).toUpperCase()}
                    ·
                    ${String(
                      a.subcategory ||
                      "ACTUALIDAD"
                    ).toUpperCase()}
                  </p>

                  <h3>
                    ${a.title || ""}
                  </h3>

                </a>
              `;
            }).join("")
          : `
            <p class="search-empty">
              Sin resultados para
              "${input.value}".
            </p>
          `;
    }
  );
}


/* ==========================================================================
   INIT
   ========================================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupSearch();

    renderHome();

    renderCalendarPreview();

    renderCalendar();

    renderUrbaStandings();

    const catEl =
      document.getElementById(
        "category-grid"
      );

    if (catEl) {
      renderCategoryPage(
        catEl.dataset.category
      );
    }
  }
);

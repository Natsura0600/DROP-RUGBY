/* ==========================================================================
   DropRugby V4 — script.js
   Menú mobile, animaciones al scroll, buscador global, filtros de categoría,
   calendario dinámico y render de noticias desde API / JSON.
   ========================================================================== */

const BASE = window.ASSET_BASE || "";

/* ==========================================================================
   ESCUDOS DE CLUBES
   ========================================================================== */

const DROP_RUGBY_TEAMS = {
  alumni: {
    name: "Alumni",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231144578748476/Alumni.png?ex=6a7aa63e&is=6a7954be&hm=9f4164664975b62a1e9f20901996b0d6289ce03daa54e1e9ba4fc5b7d14a75b1",
    aliases: ["alumni"]
  },

  buenos_aires_crc: {
    name: "Buenos Aires C&RC",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231158994698280/bacrc.png?ex=6a7aa642&is=6a7954c2&hm=c4c43fac190082d97f6a02d90ce7e57856521c6a3b0a472eb7c97cf29bc14a38",
    aliases: ["biei", "buenos aires c&rc", "buenos aires"]
  },

  belgrano_athletic: {
    name: "Belgrano Athletic",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231180058493030/belgrano.png?ex=6a7aa647&is=6a7954c7&hm=b8c7a4db0391182c473393e0718ba00eb337462a03e3e74b616bab8c8c295a6f",
    aliases: ["belgrano", "belgrano athletic", "bac"]
  },

  casi: {
    name: "CASI",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231191177592933/CASI.png?ex=6a7aa649&is=6a7954c9&hm=29d8b98d0c855b6449f8a9087945bf2a645ad5919609cf3b0c363e5026960307",
    aliases: ["casi"]
  },

  champagnat: {
    name: "Champagnat",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231198433611856/Champagnat.png?ex=6a7aa64b&is=6a7954cb&hm=3b5c378a760c5da1ad69bb20205ba244cb2020c34b1ab6b5443b6404d32024f7",
    aliases: ["champa", "champagnat"]
  },

  cuba: {
    name: "CUBA",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231210794229770/cuba.png?ex=6a7aa64e&is=6a7954ce&hm=4ff0286bf047c3abb1c730949064e0409fa406b41455bb18fa602bcd0554a8f2",
    aliases: ["cuba"]
  },

  newman: {
    name: "Newman",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231225570893844/escudo-NWM.png?ex=6a7aa651&is=6a7954d1&hm=0c44dcb4d688acba0b8a6c990da8a95728cb1ad2e992ab8fdc7b5727142afc3d",
    aliases: ["newman"]
  },

  hindu: {
    name: "Hindú",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231245988503602/Hindu_.png?ex=6a7aa656&is=6a7954d6&hm=1f5db71c31d3a19d794877f4de81e570980dd2d8407534d880c00a3c04d8e238",
    aliases: ["hindu", "hindú"]
  },

  la_plata: {
    name: "La Plata",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231255010578452/La_Plata.png?ex=6a7aa658&is=6a7954d8&hm=f75842ee416b247f0d6e74caf492804f0a5d015a8417db8bb185040708af4c0d",
    aliases: ["la plata"]
  },

  los_tilos: {
    name: "Los Tilos",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231263948509274/lostilos.png?ex=6a7aa65b&is=6a7954db&hm=a199264f70210b93f4a6cc58af6cb4b875a842160d4f05bce3420e383a1786cc",
    aliases: ["los tilos"]
  },

  los_matreros: {
    name: "Los Matreros",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231275109552228/Matereros_.png?ex=6a7aa65d&is=6a7954dd&hm=17229d6d8869fbe875ca22a8c97f2679b48ccf0e73ec50db16a3cca8301f953b",
    aliases: ["los matreros", "matreros"]
  },

  regatas_bella_vista: {
    name: "Regatas Bella Vista",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231286635634729/REGATAS_bv.png?ex=6a7aa660&is=6a7954e0&hm=e26cce232240881c54d25a0e8d43bc1841c71f3950aa4699fd45b65d20c643bd",
    aliases: ["regatas", "regatas bella vista"]
  },

  atletico_del_rosario: {
    name: "Atletico del Rosario",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231293858226186/rosario.png?ex=6a7aa662&is=6a7954e2&hm=94ec235340236bf245fd7380de7905518da04584180a7314140d35185156f7fb",
    aliases: ["plaza", "atletico del rosario", "atlético del rosario"]
  },

  sic: {
    name: "SIC",
    logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231304788578314/SIC_.png?ex=6a7aa664&is=6a7954e4&hm=7dec2e5910159475effa86892ca268033077a628aec7163bd7baf07336ad9557",
    aliases: ["sic"]
  }
};


/* ==========================================================================
   EQUIPOS
   ========================================================================== */

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
    normalizeTeamName(team.name) === key ||
    team.aliases.some(alias => normalizeTeamName(alias) === key)
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
          if (DROP_RUGBY_TEAMS[id] && logo) {
            DROP_RUGBY_TEAMS[id].logo = logo;
          }
        });
      }
    } catch (error) {
      /* Se usa el registro incorporado como fallback. */
    }

    /*
      Segundo fallback: teams.json.
      No reemplaza los equipos ya conocidos si no hay información.
    */
    try {
      const res = await fetch(
        BASE + "data/teams.json?t=" + Date.now(),
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();

        if (data?.clubs && typeof data.clubs === "object") {
          Object.entries(data.clubs).forEach(([id, team]) => {
            if (!team || typeof team !== "object") return;

            const existing = DROP_RUGBY_TEAMS[id];

            DROP_RUGBY_TEAMS[id] = {
              name: team.name || existing?.name || id,
              logo: team.logo || existing?.logo || "",
              aliases: Array.isArray(team.aliases)
                ? team.aliases
                : existing?.aliases || []
            };
          });
        }
      }
    } catch (error) {
      /* Fallback incorporado. */
    }

    TEAMS_LOADED = true;
    return DROP_RUGBY_TEAMS;
  })();

  return TEAMS_LOADING;
}


/* ==========================================================================
   ESCUDO
   ========================================================================== */

function teamShield(value, className = "team-shield") {
  const team = getTeamByName(value);

  if (!team) {
    const initials =
      String(value || "?")
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

  const logo = String(team.logo || "").replace(/"/g, "&quot;");
  const name = String(team.name || value).replace(/"/g, "&quot;");

  if (!logo) {
    const initials =
      String(team.name || value)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase();

    return `
      <span
        class="${className} team-shield-fallback"
        aria-label="Escudo de ${name}"
      >${initials}</span>
    `;
  }

  return `
    <img
      class="${className}"
      src="${logo}"
      alt="Escudo de ${name}"
      loading="lazy"
      referrerpolicy="no-referrer"
      onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline-flex';"
    >
    <span
      class="${className} team-shield-fallback"
      style="display:none"
      aria-hidden="true"
    >${name.slice(0, 2).toUpperCase()}</span>
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
    menuBtn.setAttribute("aria-expanded", String(open));
  });

  mobileNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });
}


/* ==========================================================================
   ANIMACIONES
   ========================================================================== */

let observer = null;

if ("IntersectionObserver" in window) {
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12
  });
}

function observeReveals(root = document) {
  if (!observer) return;

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
   ARTÍCULOS
   ========================================================================== */

let ARTICLES_CACHE = null;

async function loadArticles() {
  if (ARTICLES_CACHE) return ARTICLES_CACHE;

  try {
    const res = await fetch(
      BASE + "api/content?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!res.ok) throw new Error("API unavailable");

    const data = await res.json();

    ARTICLES_CACHE = Array.isArray(data.articles)
      ? data.articles
      : [];

    return ARTICLES_CACHE;
  } catch (error) {
    /* Continúa con fallbacks. */
  }

  try {
    const local = localStorage.getItem("droprugby_articles");

    if (local) {
      ARTICLES_CACHE = JSON.parse(local);

      if (Array.isArray(ARTICLES_CACHE)) {
        return ARTICLES_CACHE;
      }
    }
  } catch (error) {}

  if (window.DROP_RUGBY_DATA?.articles) {
    ARTICLES_CACHE = window.DROP_RUGBY_DATA.articles;
    return ARTICLES_CACHE;
  }

  try {
    const res = await fetch(
      BASE + "data/articles.json?t=" + Date.now(),
      { cache: "no-store" }
    );

    ARTICLES_CACHE = await res.json();

    if (!Array.isArray(ARTICLES_CACHE)) {
      ARTICLES_CACHE = [];
    }
  } catch (error) {
    ARTICLES_CACHE = [];
  }

  return ARTICLES_CACHE;
}


/* ==========================================================================
   FIXTURES
   ========================================================================== */

let FIXTURES_CACHE = null;

async function loadFixtures() {
  if (FIXTURES_CACHE) return FIXTURES_CACHE;

  try {
    const res = await fetch(
      BASE + "api/content?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!res.ok) throw new Error("API unavailable");

    const data = await res.json();

    FIXTURES_CACHE = Array.isArray(data.fixtures)
      ? data.fixtures
      : [];

    return FIXTURES_CACHE;
  } catch (error) {
    /* Continúa con fallbacks. */
  }

  try {
    const local = localStorage.getItem("droprugby_fixtures");

    if (local) {
      FIXTURES_CACHE = JSON.parse(local);

      if (Array.isArray(FIXTURES_CACHE)) {
        return FIXTURES_CACHE;
      }
    }
  } catch (error) {}

  if (window.DROP_RUGBY_DATA?.fixtures) {
    FIXTURES_CACHE = window.DROP_RUGBY_DATA.fixtures;
    return FIXTURES_CACHE;
  }

  try {
    const res = await fetch(
      BASE + "data/fixtures.json?t=" + Date.now(),
      { cache: "no-store" }
    );

    FIXTURES_CACHE = await res.json();

    if (!Array.isArray(FIXTURES_CACHE)) {
      FIXTURES_CACHE = [];
    }
  } catch (error) {
    FIXTURES_CACHE = [];
  }

  return FIXTURES_CACHE;
}


/* ==========================================================================
   TABLA
   ========================================================================== */

let STANDINGS_CACHE = null;

async function loadStandings() {
  if (STANDINGS_CACHE) return STANDINGS_CACHE;

  try {
    const res = await fetch(
      BASE + "api/content?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!res.ok) throw new Error("API unavailable");

    const data = await res.json();

    if (Array.isArray(data.standings)) {
      STANDINGS_CACHE = data.standings;
      return STANDINGS_CACHE;
    }
  } catch (error) {}

  STANDINGS_CACHE =
    window.DROP_RUGBY_DATA?.standings || [];

  return STANDINGS_CACHE;
}


/* ==========================================================================
   FECHAS
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


/*
  IMPORTANTE:
  Nunca usamos new Date("YYYY-MM-DD") porque JavaScript puede interpretarlo
  como UTC y provocar un día de diferencia según la zona horaria.
*/

function dateFromISO(iso) {
  const parts = String(iso || "").split("-").map(Number);

  if (
    parts.length !== 3 ||
    !parts[0] ||
    !parts[1] ||
    !parts[2]
  ) {
    return null;
  }

  const [y, m, d] = parts;

  return new Date(y, m - 1, d);
}

function isoFromDate(dt) {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) {
    return "";
  }

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

function formatDateShort(iso) {
  const dt = dateFromISO(iso);

  if (!dt) return "";

  return `${String(dt.getDate()).padStart(2, "0")} ${
    MESES[dt.getMonth()]
  } ${dt.getFullYear()}`;
}


/* ==========================================================================
   STORY CARD
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

  const category =
    String(article.category || "Rugby").toUpperCase();

  const subcategory =
    String(article.subcategory || "ACTUALIDAD").toUpperCase();

  const articleUrl =
    `article.html?id=${encodeURIComponent(article.id || "")}`;

  const title =
    String(article.title || "Sin título");

  const excerpt =
    String(article.excerpt || "");

  const author =
    String(article.author || "DropRugby");

  const date =
    article.date || getTodayISO();

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
          Por ${author} · ${formatDateShort(date).toUpperCase()}
        </div>
      </div>
    </article>
  `;
}


/* ==========================================================================
   HOME
   ========================================================================== */

async function renderHome() {
  await loadTeams();

  const grid = document.getElementById("home-top-stories");
  const pumasEl = document.getElementById("home-los-pumas");
  const srEl = document.getElementById("home-super-rugby");
  const urbaTop14El =
    document.getElementById("home-urba-top14");
  const urbaEl =
    document.getElementById("home-urba");
  const heroEl =
    document.getElementById("home-hero");

  if (!grid && !heroEl) return;

  const articles = (await loadArticles())
    .filter(a =>
      a.published !== false &&
      !a.scheduled
    )
    .slice()
    .sort((a, b) =>
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
              TOP STORY · ${String(
                featured.category || "RUGBY"
              ).toUpperCase()}
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
              TOP STORY · ${String(
                featured.category || "RUGBY"
              ).toUpperCase()}
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

  const byCategory = (name, el, n = 3) => {
    if (!el) return;

    const items = articles
      .filter(a =>
        a.category === name &&
        a.published !== false &&
        !a.scheduled
      )
      .slice(0, n);

    el.innerHTML = items.length
      ? items.map(a => storyCardHTML(a)).join("")
      : `
        <p class="empty-state">
          Todavía no hay noticias publicadas
          en esta categoría.
        </p>
      `;
  };

  byCategory("Los Pumas", pumasEl);
  byCategory("Super Rugby", srEl);
  byCategory("URBA TOP 14", urbaTop14El);
  byCategory("URBA", urbaEl);

  observeReveals();
}


/* ==========================================================================
   CATEGORÍAS
   ========================================================================== */

async function renderCategoryPage(categoryName) {
  const grid =
    document.getElementById("category-grid");

  if (!grid) return;

  const articles = (await loadArticles())
    .filter(a =>
      a.category === categoryName &&
      a.published !== false &&
      !a.scheduled
    )
    .sort((a, b) =>
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
        : articles.filter(a =>
            String(a.subcategory || "")
              .toUpperCase() === activeFilter
          );

    grid.innerHTML = filtered.length
      ? filtered.map(a => storyCardHTML(a)).join("")
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
        chip.dataset.filter || "TODAS";

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

  const fixtures = await loadFixtures();

  const compBtns =
    document.querySelectorAll(
      ".competition-select .filter-chip"
    );

  const dateBtns =
    document.querySelectorAll(
      ".date-filter-bar .date-chip"
    );

  const dayLabel =
    document.getElementById("day-nav-label");

  const prevBtn =
    document.getElementById("day-prev");

  const nextBtn =
    document.getElementById("day-next");

  const todayBtn =
    document.getElementById("day-today");

  let activeCompetition = "TODAS";

  let mode = "dia";

  /*
    ESTA ES LA CORRECCIÓN PRINCIPAL.

    currentDate SIEMPRE comienza en HOY.
    No se modifica buscando el primer fixture disponible.
  */
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);


  /* ----------------------------------------------------------
     Normalización de fixtures
     ---------------------------------------------------------- */

  const normalizedFixtures = fixtures
    .filter(f => f && f.date)
    .map(f => ({
      ...f,
      date: String(f.date).slice(0, 10),
      time: String(f.time || "00:00"),
      competition: String(
        f.competition || "RUGBY"
      ),
      home: String(f.home || "Local"),
      away: String(f.away || "Visitante"),
      channel: String(f.channel || "")
    }))
    .filter(f => dateFromISO(f.date));


  function groupByDateAndCompetition(items) {
    const byDate = {};

    items.forEach(f => {
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
    /*
      DÍA
    */
    if (mode === "dia") {
      return [
        isoFromDate(currentDate)
      ];
    }


    /*
      MAÑANA
    */
    if (mode === "manana") {
      const d = new Date(currentDate);

      d.setDate(
        d.getDate() + 1
      );

      return [
        isoFromDate(d)
      ];
    }


    /*
      FIN DE SEMANA
    */
    if (mode === "finde") {
      const start = new Date(currentDate);

      const day = start.getDay();

      const diffToSat =
        (6 - day + 7) % 7;

      const sat = new Date(start);

      sat.setDate(
        sat.getDate() + diffToSat
      );

      const sun = new Date(sat);

      sun.setDate(
        sun.getDate() + 1
      );

      return [
        isoFromDate(sat),
        isoFromDate(sun)
      ];
    }


    /*
      TODA LA SEMANA
    */
    if (mode === "semana") {
      const start = new Date(currentDate);

      const day = start.getDay();

      const diffToMonday =
        (day + 6) % 7;

      start.setDate(
        start.getDate() - diffToMonday
      );

      return Array.from(
        { length: 7 },
        (_, i) => {
          const d = new Date(start);

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
        `${DIAS[currentDate.getDay()]} · ${formatDateShort(
          isoFromDate(currentDate)
        )}`;

      return;
    }


    if (mode === "manana") {
      const d = new Date(currentDate);

      d.setDate(
        d.getDate() + 1
      );

      dayLabel.textContent =
        `${DIAS[d.getDay()]} · ${formatDateShort(
          isoFromDate(d)
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


  function paint() {
    updateDayLabel();

    const dates =
      getRangeDates();

    let filtered =
      normalizedFixtures.filter(
        f => dates.includes(f.date)
      );


    if (activeCompetition !== "TODAS") {
      filtered =
        filtered.filter(f =>
          String(f.competition)
            .toUpperCase() ===
          activeCompetition.toUpperCase()
        );
    }


    const grouped =
      groupByDateAndCompetition(filtered);

    const sortedDates =
      Object.keys(grouped).sort();


    if (!sortedDates.length) {
      listEl.innerHTML = `
        <p class="empty-state">
          No hay partidos cargados para este filtro.
          Probá con otra competición o fecha.
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
                  .sort((a, b) =>
                    String(a.time).localeCompare(
                      String(b.time)
                    )
                  )
                  .map(f => `
                    <div class="match-row">

                      <div class="match-time">
                        ${f.time}
                      </div>

                      <div class="match-teams team-matchup">

                        <span class="team-side">
                          ${teamShield(f.home)}
                          <span>${f.home}</span>
                        </span>

                        <span class="team-vs">
                          vs.
                        </span>

                        <span class="team-side team-side-away">
                          <span>${f.away}</span>
                          ${teamShield(f.away)}
                        </span>

                      </div>

                      <div class="match-channel">
                        ${f.channel}
                      </div>

                    </div>
                  `)
                  .join("");


              return `
                <div class="competition-block">

                  <div class="competition-name">
                    ${compName.toUpperCase()}
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


  /* ----------------------------------------------------------
     Competición
     ---------------------------------------------------------- */

  compBtns.forEach(btn => {
    btn.addEventListener("click", () => {

      compBtns.forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      activeCompetition =
        btn.dataset.filter || "TODAS";

      paint();
    });
  });


  /* ----------------------------------------------------------
     Fecha
     ---------------------------------------------------------- */

  dateBtns.forEach(btn => {
    btn.addEventListener("click", () => {

      dateBtns.forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      mode =
        btn.dataset.mode || "dia";

      paint();
    });
  });


  /* ----------------------------------------------------------
     Día anterior
     ---------------------------------------------------------- */

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {

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
    });
  }


  /* ----------------------------------------------------------
     Día siguiente
     ---------------------------------------------------------- */

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {

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
    });
  }


  /* ----------------------------------------------------------
     HOY
     ---------------------------------------------------------- */

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {

      currentDate = new Date();

      currentDate.setHours(
        0,
        0,
        0,
        0
      );

      mode = "dia";

      dateBtns.forEach(b => {
        b.classList.toggle(
          "active",
          b.dataset.mode === "dia"
        );
      });

      paint();
    });
  }


  /*
    Pintamos inicialmente HOY.
    NO buscamos el primer partido disponible.
  */
  paint();
}


/* ==========================================================================
   PREVIEW CALENDARIO HOME
   ========================================================================== */

async function renderCalendarPreview() {
  await loadTeams();

  const el =
    document.getElementById(
      "home-calendar-preview"
    );

  if (!el) return;

  const today =
    getTodayISO();

  const fixtures =
    (await loadFixtures())
      .filter(f =>
        f &&
        f.date &&
        String(f.date).slice(0, 10) >= today
      )
      .slice()
      .sort((a, b) =>
        (
          String(a.date) +
          String(a.time || "")
        ).localeCompare(
          String(b.date) +
          String(b.time || "")
        )
      );


  const upcoming =
    fixtures.slice(0, 6);


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
          ${f.time || ""}
        </div>

        <div class="match-teams team-matchup">

          <span class="team-side">
            ${teamShield(f.home)}
            <span>${f.home}</span>
          </span>

          <span class="team-vs">
            vs.
          </span>

          <span class="team-side team-side-away">
            <span>${f.away}</span>
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
    `)
    .join("");
}


/* ==========================================================================
   TABLA URBA TOP 14
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
      .sort((a, b) =>
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
    window.DROP_RUGBY_DATA?.standingsUpdated;

  const updatedLabel =
    updated
      ? formatDateShort(updated)
      : "";


  const relegationFrom =
    Math.max(
      standings.length - 2,
      0
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
            <tr class="${
              i >= relegationFrom
                ? "is-relegation"
                : ""
            }">

              <td>
                ${i + 1}
              </td>

              <td class="standing-team">
                ${teamShield(team.team)}
                <span>${team.team}</span>
              </td>

              <td>${team.pj ?? 0}</td>
              <td>${team.pg ?? 0}</td>
              <td>${team.pe ?? 0}</td>
              <td>${team.pp ?? 0}</td>

              <td class="${
                Number(team.diff) > 0
                  ? "is-positive"
                  : Number(team.diff) < 0
                    ? "is-negative"
                    : ""
              }">
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
    document.querySelectorAll(".search-btn");

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
      () => {
        overlay.classList.remove("open");
      }
    );
  }


  overlay.addEventListener(
    "click",
    e => {
      if (e.target === overlay) {
        overlay.classList.remove("open");
      }
    }
  );


  document.addEventListener(
    "keydown",
    e => {
      if (e.key === "Escape") {
        overlay.classList.remove("open");
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
        articlesForSearch.filter(a => {

          const title =
            String(a.title || "")
              .toLowerCase();

          const category =
            String(a.category || "")
              .toLowerCase();

          const subcategory =
            String(a.subcategory || "")
              .toLowerCase();

          const excerpt =
            String(a.excerpt || "")
              .toLowerCase();

          return (
            title.includes(q) ||
            category.includes(q) ||
            subcategory.includes(q) ||
            excerpt.includes(q)
          );
        });


      resultsEl.innerHTML =
        matches.length

          ? matches.map(a => `
              <a
                class="search-result"
                href="${BASE}article.html?id=${encodeURIComponent(
                  a.id || ""
                )}"
              >

                <p class="category">
                  ${String(
                    a.category || "RUGBY"
                  ).toUpperCase()}
                  ·
                  ${String(
                    a.subcategory || "ACTUALIDAD"
                  ).toUpperCase()}
                </p>

                <h3>
                  ${a.title || "Sin título"}
                </h3>

              </a>
            `).join("")

          : `
            <p class="search-empty">
              Sin resultados para "${input.value}".
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

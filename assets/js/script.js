/* ==========================================================================
   DropRugby V5 — script.js
   Optimizado para:
   - Una sola carga de /api/content por página
   - Caché de datos en memoria
   - Calendario con fecha real
   - Escudos de clubes
   - Noticias
   - Buscador
   - Tabla URBA
   - Menú mobile
   - Fallbacks locales
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
   UTILIDADES DE EQUIPOS
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

function applyTeamData(content) {
  if (!content) return;

  const clubLogos = content?.settings?.clubLogos || {};

  if (content?.teams?.clubs && typeof content.teams.clubs === "object") {
    Object.entries(content.teams.clubs).forEach(([id, team]) => {
      if (!team || typeof team !== "object") return;

      DROP_RUGBY_TEAMS[id] = {
        name: team.name || id,
        logo: clubLogos[id] || team.logo || "",
        aliases: Array.isArray(team.aliases) ? team.aliases : []
      };
    });
  }

  Object.entries(clubLogos).forEach(([id, logo]) => {
    if (DROP_RUGBY_TEAMS[id]) {
      DROP_RUGBY_TEAMS[id].logo = logo;
    }
  });
}

function teamShield(value, className = "team-shield") {
  const team = getTeamByName(value);

  if (!team || !team.logo) {
    const initials =
      String(value || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase() || "?";

    return `<span class="${className} team-shield-fallback" aria-hidden="true">${initials}</span>`;
  }

  const safeLogo = String(team.logo).replace(/"/g, "&quot;");
  const safeName = String(team.name).replace(/"/g, "&quot;");

  return `
    <img
      class="${className}"
      src="${safeLogo}"
      alt="Escudo de ${safeName}"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      onerror="this.onerror=null;this.style.display='none';"
    >
  `;
}


/* ==========================================================================
   DATOS GLOBALES
   ========================================================================== */

let CONTENT_CACHE = null;
let CONTENT_LOADING = null;

let ARTICLES_CACHE = null;
let FIXTURES_CACHE = null;
let STANDINGS_CACHE = null;
let TEAMS_LOADED = false;


/* ==========================================================================
   CARGA ÚNICA DE API
   ========================================================================== */

async function loadContent() {
  if (CONTENT_CACHE) {
    return CONTENT_CACHE;
  }

  if (CONTENT_LOADING) {
    return CONTENT_LOADING;
  }

  CONTENT_LOADING = (async () => {
    try {
      const response = await fetch(
        BASE + "api/content",
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("API unavailable");
      }

      const data = await response.json();

      CONTENT_CACHE = data || {};

      applyTeamData(CONTENT_CACHE);

      return CONTENT_CACHE;

    } catch (error) {
      CONTENT_CACHE = null;
      return null;
    }
  })();

  return CONTENT_LOADING;
}


/* ==========================================================================
   ARTÍCULOS
   ========================================================================== */

async function loadArticles() {
  if (ARTICLES_CACHE) {
    return ARTICLES_CACHE;
  }

  const content = await loadContent();

  if (content && Array.isArray(content.articles)) {
    ARTICLES_CACHE = content.articles;
    return ARTICLES_CACHE;
  }

  try {
    const localStorageData = localStorage.getItem("droprugby_articles");

    if (localStorageData) {
      ARTICLES_CACHE = JSON.parse(localStorageData);

      if (Array.isArray(ARTICLES_CACHE)) {
        return ARTICLES_CACHE;
      }
    }
  } catch (_) {}

  if (Array.isArray(window.DROP_RUGBY_DATA?.articles)) {
    ARTICLES_CACHE = window.DROP_RUGBY_DATA.articles;
    return ARTICLES_CACHE;
  }

  try {
    const response = await fetch(
      BASE + "data/articles.json",
      { cache: "default" }
    );

    if (!response.ok) {
      throw new Error();
    }

    ARTICLES_CACHE = await response.json();

    if (!Array.isArray(ARTICLES_CACHE)) {
      ARTICLES_CACHE = [];
    }

  } catch (_) {
    ARTICLES_CACHE = [];
  }

  return ARTICLES_CACHE;
}


/* ==========================================================================
   FIXTURES
   ========================================================================== */

async function loadFixtures() {
  if (FIXTURES_CACHE) {
    return FIXTURES_CACHE;
  }

  const content = await loadContent();

  if (content && Array.isArray(content.fixtures)) {
    FIXTURES_CACHE = content.fixtures;
    return FIXTURES_CACHE;
  }

  try {
    const localStorageData = localStorage.getItem("droprugby_fixtures");

    if (localStorageData) {
      FIXTURES_CACHE = JSON.parse(localStorageData);

      if (Array.isArray(FIXTURES_CACHE)) {
        return FIXTURES_CACHE;
      }
    }
  } catch (_) {}

  if (Array.isArray(window.DROP_RUGBY_DATA?.fixtures)) {
    FIXTURES_CACHE = window.DROP_RUGBY_DATA.fixtures;
    return FIXTURES_CACHE;
  }

  try {
    const response = await fetch(
      BASE + "data/fixtures.json",
      { cache: "default" }
    );

    if (!response.ok) {
      throw new Error();
    }

    FIXTURES_CACHE = await response.json();

    if (!Array.isArray(FIXTURES_CACHE)) {
      FIXTURES_CACHE = [];
    }

  } catch (_) {
    FIXTURES_CACHE = [];
  }

  return FIXTURES_CACHE;
}


/* ==========================================================================
   TABLA
   ========================================================================== */

async function loadStandings() {
  if (STANDINGS_CACHE) {
    return STANDINGS_CACHE;
  }

  const content = await loadContent();

  if (content && Array.isArray(content.standings)) {
    STANDINGS_CACHE = content.standings;
    return STANDINGS_CACHE;
  }

  STANDINGS_CACHE =
    Array.isArray(window.DROP_RUGBY_DATA?.standings)
      ? window.DROP_RUGBY_DATA.standings
      : [];

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

function formatDateShort(iso) {
  if (!iso) return "";

  const parts = String(iso).split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return String(iso);
  }

  const [year, month, day] = parts;

  return `${String(day).padStart(2, "0")} ${MESES[month - 1]} ${year}`;
}

function dateFromISO(iso) {
  const [year, month, day] = String(iso).split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function isoFromDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getTodayISO() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return isoFromDate(today);
}


/* ==========================================================================
   HTML / SEGURIDAD
   ========================================================================== */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
}


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
      String(open)
    );
  });

  mobileNav.querySelectorAll("a").forEach(link => {
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
   ANIMACIONES
   ========================================================================== */

let revealObserver = null;

function setupRevealObserver() {
  if (!("IntersectionObserver" in window)) {
    document
      .querySelectorAll(".reveal")
      .forEach(el => el.classList.add("visible"));

    return;
  }

  revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("visible");

        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12
    }
  );
}

function observeReveals(root = document) {
  if (!revealObserver) return;

  root
    .querySelectorAll(".reveal:not(.visible)")
    .forEach(el => revealObserver.observe(el));
}


/* ==========================================================================
   NEWSLETTER
   ========================================================================== */

function setupNewsletter() {
  document.querySelectorAll(".newsletter-form").forEach(form => {
    form.addEventListener("submit", async event => {
      event.preventDefault();

      const input = form.querySelector(
        'input[type="email"], input[name="email"]'
      );

      const button = form.querySelector("#newsletter-submit");
      const message = form.querySelector("#newsletter-message");

      if (!input || !message) {
        console.error("Newsletter: faltan elementos del formulario.");
        return;
      }

      const email = input.value.trim().toLowerCase();

      // -----------------------------
      // VALIDAR EMAIL
      // -----------------------------

      if (!email || !input.checkValidity()) {
        message.textContent = "Ingresá un email válido.";
        message.classList.remove("success");
        message.classList.add("error");
        input.focus();
        return;
      }

      // -----------------------------
      // ESTADO ENVIANDO
      // -----------------------------

      if (button) {
        button.disabled = true;
        button.innerHTML = 'Enviando… <span>→</span>';
      }

      message.textContent = "Procesando suscripción…";
      message.classList.remove("success", "error");

      try {

        // -----------------------------
        // LLAMAR AL BACKEND
        // -----------------------------

        const response = await fetch(
          BASE + "api/newsletter",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              email: email
            })
          }
        );

        const data = await response.json().catch(() => ({}));

        // -----------------------------
        // ERROR
        // -----------------------------

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
            "No se pudo completar la suscripción."
          );
        }

        // -----------------------------
        // ÉXITO REAL
        // -----------------------------

        form.classList.add("submitted");

        message.textContent =
          "¡Listo! Ya estás suscripto a Drop Rugby.";

        message.classList.remove("error");
        message.classList.add("success");

        input.value = "";

        if (button) {
          button.disabled = false;
          button.innerHTML = 'Suscripto ✓';
        }

      } catch (error) {

        console.error(
          "NEWSLETTER FRONTEND ERROR:",
          error
        );

        message.textContent =
          error.message ||
          "No se pudo completar la suscripción.";

        message.classList.remove("success");
        message.classList.add("error");

        if (button) {
          button.disabled = false;
          button.innerHTML =
            'Suscribirme <span>→</span>';
        }
      }
    });
  });
}


/* ==========================================================================
   TARJETAS DE NOTICIAS
   ========================================================================== */

function storyCardHTML(article, options = {}) {
  const featuredClass =
    options.featured
      ? "story-featured"
      : "";

  const title =
    escapeHTML(article.title || "Sin título");

  const excerpt =
    escapeHTML(article.excerpt || "");

  const category =
    escapeHTML(
      String(article.category || "Rugby").toUpperCase()
    );

  const subcategory =
    escapeHTML(
      String(article.subcategory || "ACTUALIDAD").toUpperCase()
    );

  const author =
    escapeHTML(article.author || "DropRugby");

  const date =
    article.date ||
    getTodayISO();

  const visual = article.imageUrl
    ? `
      <div class="story-image photo-not-clickable">
        <img
          src="${escapeHTML(article.imageUrl)}"
          alt=""
          loading="lazy"
          decoding="async"
        >
      </div>
    `
    : `
      <div class="story-image ph-image photo-not-clickable ${escapeHTML(
        article.imageClass || "img-tone-1"
      )}"></div>
    `;

  const articleUrl =
    `${BASE}article.html?id=${encodeURIComponent(article.id || "")}`;

  return `
    <article class="story ${featuredClass} reveal">
      ${visual}

      <div class="story-body">

        <p class="category">
          ${category} · ${subcategory}
        </p>

        <h3>
          <a href="${articleUrl}">
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
  const grid = document.getElementById("home-top-stories");
  const pumasEl = document.getElementById("home-los-pumas");
  const srEl = document.getElementById("home-super-rugby");
  const urbaTop14El = document.getElementById("home-urba-top14");
  const urbaEl = document.getElementById("home-urba");
  const heroEl = document.getElementById("home-hero");

  if (!grid && !heroEl && !pumasEl && !srEl && !urbaTop14El && !urbaEl) {
    return;
  }

  const articles = (await loadArticles())
    .filter(article =>
      article.published !== false &&
      !article.scheduled
    )
    .slice()
    .sort((a, b) =>
      String(b.date || "").localeCompare(
        String(a.date || "")
      )
    );

  const featured =
    articles.find(article => article.featured) ||
    articles[0];

  if (heroEl && featured) {
    const category =
      escapeHTML(
        String(featured.category || "RUGBY").toUpperCase()
      );

    const title =
      escapeHTML(featured.title || "");

    const heroVisual = featured.imageUrl
      ? `
        <div class="hero-image photo-not-clickable">
          <img
            src="${escapeHTML(featured.imageUrl)}"
            alt=""
            loading="eager"
            decoding="async"
          >

          <div class="image-overlay"></div>

          <div class="hero-card-caption">
            <span>TOP STORY · ${category}</span>
            <h2>${title}</h2>
          </div>
        </div>
      `
      : `
        <div class="hero-image ${escapeHTML(
          featured.imageClass || "img-tone-1"
        )} photo-not-clickable ph-image">

          <div class="image-overlay"></div>

          <div class="hero-card-caption">
            <span>TOP STORY · ${category}</span>
            <h2>${title}</h2>
          </div>

        </div>
      `;

    const canonicalHeroUrl =
      `${BASE}article.html?id=${encodeURIComponent(featured.id || "")}`;

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

  const featuredId =
    featured ? featured.id : null;

  const rest =
    articles.filter(article =>
      article.id !== featuredId
    );

  if (grid) {
    grid.innerHTML =
      rest
        .slice(0, 3)
        .map((article, index) =>
          storyCardHTML(
            article,
            { featured: index === 0 }
          )
        )
        .join("");
  }

  function renderCategory(
    categoryName,
    element,
    amount = 3
  ) {
    if (!element) return;

    const items =
      articles
        .filter(article =>
          article.category === categoryName
        )
        .slice(0, amount);

    element.innerHTML =
      items.length
        ? items.map(article =>
            storyCardHTML(article)
          ).join("")
        : `
          <p class="empty-state">
            Todavía no hay noticias publicadas en esta categoría.
          </p>
        `;
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
   CATEGORÍAS
   ========================================================================== */

async function renderCategoryPage(categoryName) {
  const grid =
    document.getElementById("category-grid");

  if (!grid) return;

  const articles =
    (await loadArticles())
      .filter(article =>
        article.category === categoryName &&
        article.published !== false &&
        !article.scheduled
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
        : articles.filter(article =>
            String(article.subcategory || "")
              .toUpperCase() === activeFilter
          );

    grid.innerHTML =
      filtered.length
        ? filtered.map(article =>
            storyCardHTML(article)
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
      chips.forEach(button =>
        button.classList.remove("active")
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
   CALENDARIO — mini rectángulos por competición
   ========================================================================== */

const COMPETITION_ORDER = [
  "LOS PUMAS",
  "SUPER RUGBY",
  "URBA TOP 14",
  "URBA"
];

function competitionSortKey(name) {
  const upper = String(name || "").trim().toUpperCase();
  const index = COMPETITION_ORDER.indexOf(upper);

  return index === -1 ? 99 : index;
}

function sortCompetitionNames(names) {
  return names.sort(
    (a, b) => competitionSortKey(a) - competitionSortKey(b)
  );
}

function renderFixtureTile(fixture) {
  const home = escapeHTML(fixture.home || "");
  const away = escapeHTML(fixture.away || "");
  const time = escapeHTML(fixture.time || "--:--");
  const channel = escapeHTML(fixture.channel || "");
  const venue = escapeHTML(fixture.venue || "");
  const meta = channel || venue;

  return `
    <article
      class="fixture-tile"
      aria-label="${home} vs ${away}, ${time}"
    >
      <time class="fixture-tile-time">${time}</time>

      <div class="fixture-tile-matchup">
        <div class="fixture-tile-team">
          ${teamShield(fixture.home, "team-shield fixture-tile-shield")}
          <span class="fixture-tile-name">${home}</span>
        </div>

        <span class="fixture-tile-vs">vs</span>

        <div class="fixture-tile-team fixture-tile-team-away">
          ${teamShield(fixture.away, "team-shield fixture-tile-shield")}
          <span class="fixture-tile-name">${away}</span>
        </div>
      </div>

      ${
        meta
          ? `<p class="fixture-tile-meta">${meta}</p>`
          : ""
      }
    </article>
  `;
}

function renderCompetitionSections(competitions) {
  const competitionNames = sortCompetitionNames(
    Object.keys(competitions)
  );

  return competitionNames
    .map(competitionName => {
      const rows = competitions[competitionName]
        .slice()
        .sort((a, b) =>
          String(a.time || "").localeCompare(
            String(b.time || "")
          )
        )
        .map(renderFixtureTile)
        .join("");

      return `
        <section class="competition-section">

          <div class="competition-name">
            ${escapeHTML(
              String(competitionName).toUpperCase()
            )}
          </div>

          <div class="fixture-grid">
            ${rows}
          </div>

        </section>
      `;
    })
    .join("");
}


/* ==========================================================================
   CALENDARIO
   ========================================================================== */

async function renderCalendar() {
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
    IMPORTANTE:
    La fecha inicial SIEMPRE es la fecha real del dispositivo.
    No se reemplaza por el primer fixture disponible.
  */

  let currentDate = new Date();

  currentDate.setHours(
    0,
    0,
    0,
    0
  );


  function groupByDateAndCompetition(items) {
    const grouped = {};

    items.forEach(fixture => {
      if (!fixture || !fixture.date) {
        return;
      }

      if (!grouped[fixture.date]) {
        grouped[fixture.date] = {};
      }

      const competition =
        fixture.competition || "RUGBY";

      if (!grouped[fixture.date][competition]) {
        grouped[fixture.date][competition] = [];
      }

      grouped[fixture.date][competition].push(
        fixture
      );
    });

    return grouped;
  }


  function getRangeDates() {
    if (mode === "semana") {
      const start =
        new Date(currentDate);

      const day =
        start.getDay();

      const diffToMonday =
        (day + 6) % 7;

      start.setDate(
        start.getDate() - diffToMonday
      );

      return Array.from(
        { length: 7 },
        (_, index) => {
          const date =
            new Date(start);

          date.setDate(
            start.getDate() + index
          );

          return isoFromDate(date);
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
        saturday.getDate() + diffToSaturday
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
        isoFromDate(tomorrow)
      ];
    }


    return [
      isoFromDate(currentDate)
    ];
  }


  function updateDayLabel() {
    if (!dayLabel) return;

    if (mode === "dia") {
      const date =
        isoFromDate(currentDate);

      dayLabel.textContent =
        `${DIAS[currentDate.getDay()]} · ${formatDateShort(date)}`;

      return;
    }


    if (mode === "manana") {
      const tomorrow =
        new Date(currentDate);

      tomorrow.setDate(
        tomorrow.getDate() + 1
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


    dayLabel.textContent =
      "TODA LA SEMANA";
  }


  function paint() {
    updateDayLabel();

    const dates =
      getRangeDates();

    let filtered =
      fixtures.filter(fixture =>
        dates.includes(fixture.date)
      );

    if (activeCompetition !== "TODAS") {
      filtered =
        filtered.filter(fixture =>
          String(fixture.competition || "")
            .toUpperCase() === activeCompetition
        );
    }

    const grouped =
      groupByDateAndCompetition(
        filtered
      );

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

        const competitions =
          grouped[date];

        const competitionsHTML =
          renderCompetitionSections(competitions);


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

            <div class="day-block-body">
              ${competitionsHTML}
            </div>

          </div>
        `;
      })
      .join("");
  }


  compBtns.forEach(button => {
    button.addEventListener("click", () => {

      compBtns.forEach(btn =>
        btn.classList.remove("active")
      );

      button.classList.add("active");

      activeCompetition =
        button.dataset.filter ||
        "TODAS";

      paint();
    });
  });


  dateBtns.forEach(button => {
    button.addEventListener("click", () => {

      dateBtns.forEach(btn =>
        btn.classList.remove("active")
      );

      button.classList.add("active");

      mode =
        button.dataset.mode ||
        "dia";

      paint();
    });
  });


  if (prevBtn) {
    prevBtn.addEventListener(
      "click",
      () => {

        currentDate.setDate(
          currentDate.getDate() -
          (mode === "semana" ? 7 : 1)
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
          (mode === "semana" ? 7 : 1)
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

        mode = "dia";

        dateBtns.forEach(button => {
          button.classList.toggle(
            "active",
            button.dataset.mode === "dia"
          );
        });

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
      .slice()
      .sort((a, b) =>
        `${a.date || ""}${a.time || ""}`
          .localeCompare(
            `${b.date || ""}${b.time || ""}`
          )
      );

  const upcoming =
    fixtures.slice(0, 6);

  if (!upcoming.length) {
    element.innerHTML = `
      <p class="empty-state">
        No hay partidos cargados.
      </p>
    `;

    return;
  }


  const grouped = {};

  upcoming.forEach(fixture => {
    const competition =
      fixture.competition || "RUGBY";

    if (!grouped[competition]) {
      grouped[competition] = [];
    }

    grouped[competition].push(fixture);
  });

  element.classList.add("calendar-preview");

  element.innerHTML =
    renderCompetitionSections(grouped);
}


/* ==========================================================================
   TABLA URBA TOP 14
   ========================================================================== */

async function renderUrbaStandings() {
  const element =
    document.getElementById(
      "urba-standings"
    );

  if (!element) return;

  const standings =
    (await loadStandings())
      .slice()
      .sort((a, b) =>
        (Number(b.pts) || 0) -
        (Number(a.pts) || 0) ||
        (Number(b.diff) || 0) -
        (Number(a.diff) || 0)
      );

  if (!standings.length) {
    element.innerHTML = `
      <p class="muted">
        Todavía no hay tabla cargada.
      </p>
    `;

    return;
  }


  const updated =
    window.DROP_RUGBY_DATA?.standingsUpdated || "";

  const updatedLabel =
    updated
      ? formatDateShort(updated)
      : "";


  const relegationFrom =
    Math.max(
      0,
      standings.length - 2
    );


  element.innerHTML = `
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

          ${standings.map((team, index) => {

            const diff =
              Number(team.diff) || 0;

            const pts =
              Number(team.pts) || 0;

            const rowClass =
              index >= relegationFrom
                ? "is-relegation"
                : "";

            const diffClass =
              diff > 0
                ? "is-positive"
                : diff < 0
                  ? "is-negative"
                  : "";

            return `
              <tr class="${rowClass}">

                <td class="col-pos">
                  ${index + 1}
                </td>

                <td class="col-team">
                  <div class="standing-team">
                    ${teamShield(team.team)}
                    <span>
                      ${escapeHTML(team.team || "")}
                    </span>
                  </div>
                </td>

                <td>${Number(team.pj) || 0}</td>
                <td>${Number(team.pg) || 0}</td>
                <td>${Number(team.pe) || 0}</td>
                <td>${Number(team.pp) || 0}</td>

                <td class="${diffClass}">
                  ${diff > 0 ? "+" : ""}${diff}
                </td>

                <td>
                  ${pts}
                </td>

              </tr>
            `;
          }).join("")}

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
   BUSCADOR
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


  let articlesForSearch = null;


  async function ensureSearchData() {
    if (!articlesForSearch) {
      articlesForSearch =
        await loadArticles();
    }
  }


  openButtons.forEach(button => {
    button.addEventListener(
      "click",
      async () => {

        overlay.classList.add("open");

        input.focus();

        await ensureSearchData();
      }
    );
  });


  if (closeButton) {
    closeButton.addEventListener(
      "click",
      () => {
        overlay.classList.remove("open");
      }
    );
  }


  overlay.addEventListener(
    "click",
    event => {
      if (event.target === overlay) {
        overlay.classList.remove("open");
      }
    }
  );


  document.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape") {
        overlay.classList.remove("open");
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
        (articlesForSearch || [])
          .filter(article => {

            const title =
              String(article.title || "")
                .toLowerCase();

            const category =
              String(article.category || "")
                .toLowerCase();

            const subcategory =
              String(article.subcategory || "")
                .toLowerCase();

            const excerpt =
              String(article.excerpt || "")
                .toLowerCase();

            return (
              title.includes(query) ||
              category.includes(query) ||
              subcategory.includes(query) ||
              excerpt.includes(query)
            );
          });


      if (!matches.length) {
        results.innerHTML = `
          <p class="search-empty">
            Sin resultados para "${escapeHTML(input.value)}".
          </p>
        `;

        return;
      }


      results.innerHTML =
        matches.map(article => {

          const category =
            escapeHTML(
              String(
                article.category || "RUGBY"
              ).toUpperCase()
            );

          const subcategory =
            escapeHTML(
              String(
                article.subcategory ||
                "ACTUALIDAD"
              ).toUpperCase()
            );

          const title =
            escapeHTML(
              article.title || ""
            );

          const url =
            `${BASE}article.html?id=${encodeURIComponent(
              article.id || ""
            )}`;

          return `
            <a
              class="search-result"
              href="${url}"
            >

              <p class="category">
                ${category} · ${subcategory}
              </p>

              <h3>
                ${title}
              </h3>

            </a>
          `;
        })
        .join("");
    }
  );
}


/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */

async function initDropRugby() {
  setupMobileMenu();

  setupRevealObserver();

  setupNewsletter();

  setupSearch();

  /*
    Las funciones comprueban internamente si los elementos existen.
    Por eso podemos lanzarlas sin hacer peticiones innecesarias.
  */

  await Promise.all([
    renderHome(),
    renderCalendarPreview(),
    renderCalendar(),
    renderUrbaStandings()
  ]);

  const categoryGrid =
    document.getElementById(
      "category-grid"
    );

  if (categoryGrid) {
    await renderCategoryPage(
      categoryGrid.dataset.category
    );
  }

  observeReveals();
}


if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initDropRugby,
    { once: true }
  );
} else {
  initDropRugby();
}

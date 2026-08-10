/* ==========================================================================
   DropRugby V4 — script.js
   Menú mobile, animaciones al scroll, buscador global, filtros de categoría,
   calendario dinámico y render de noticias desde data/articles.json.

   window.ASSET_BASE debe definirse ANTES de este script en páginas dentro
   de /noticias/ (ej: "../") para que las rutas a data/ y noticias/ funcionen.
   ========================================================================== */

const BASE = window.ASSET_BASE || "";

/* ---------- Escudos de clubes ----------
   Los escudos entregados por el usuario se sirven desde sus URLs originales.
   Los alias permiten resolver diferencias entre el nombre visual y el nombre
   usado en fixtures/tabla sin duplicar datos.
*/
const DROP_RUGBY_TEAMS = {
  alumni: { name: "Alumni", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231144578748476/Alumni.png?ex=6a7aa63e&is=6a7954be&hm=9f4164664975b62a1e9f20901996b0d6289ce03daa54e1e9ba4fc5b7d14a75b1", aliases: ["alumni"] },
  buenos_aires_crc: { name: "Buenos Aires C&RC", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231158994698280/bacrc.png?ex=6a7aa642&is=6a7954c2&hm=c4c43fac190082d97f6a02d90ce7e57856521c6a3b0a472eb7c97cf29bc14a38", aliases: ["biei", "buenos aires c&rc", "buenos aires"] },
  belgrano_athletic: { name: "Belgrano Athletic", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231180058493030/belgrano.png?ex=6a7aa647&is=6a7954c7&hm=b8c7a4db0391182c473393e0718ba00eb337462a03e3e74b616bab8c8c295a6f", aliases: ["belgrano", "belgrano athletic", "bac"] },
  casi: { name: "CASI", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231191177592933/CASI.png?ex=6a7aa649&is=6a7954c9&hm=29d8b98d0c855b6449f8a9087945bf2a645ad5919609cf3b0c363e5026960307", aliases: ["casi"] },
  champagnat: { name: "Champagnat", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231198433611856/Champagnat.png?ex=6a7aa64b&is=6a7954cb&hm=3b5c378a760c5da1ad69bb20205ba244cb2020c34b1ab6b5443b6404d32024f7", aliases: ["champa", "champagnat"] },
  cuba: { name: "CUBA", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231210794229770/cuba.png?ex=6a7aa64e&is=6a7954ce&hm=4ff0286bf047c3abb1c730949064e0409fa406b41455bb18fa602bcd0554a8f2", aliases: ["cuba"] },
  newman: { name: "Newman", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231225570893844/escudo-NWM.png?ex=6a7aa651&is=6a7954d1&hm=0c44dcb4d688acba0b8a6c990da8a95728cb1ad2e992ab8fdc7b5727142afc3d", aliases: ["newman"] },
  hindu: { name: "Hindú", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231245988503602/Hindu_.png?ex=6a7aa656&is=6a7954d6&hm=1f5db71c31d3a19d794877f4de81e570980dd2d8407534d880c00a3c04d8e238", aliases: ["hindu", "hindú"] },
  la_plata: { name: "La Plata", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231255010578452/La_Plata.png?ex=6a7aa658&is=6a7954d8&hm=f75842ee416b247f0d6e74caf492804f0a5d015a8417db8bb185040708af4c0d", aliases: ["la plata"] },
  los_tilos: { name: "Los Tilos", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231263948509274/lostilos.png?ex=6a7aa65b&is=6a7954db&hm=a199264f70210b93f4a6cc58af6cb4b875a842160d4f05bce3420e383a1786cc", aliases: ["los tilos"] },
  los_matreros: { name: "Los Matreros", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231275109552228/Matereros_.png?ex=6a7aa65d&is=6a7954dd&hm=17229d6d8869fbe875ca22a8c97f2679b48ccf0e73ec50db16a3cca8301f953b", aliases: ["los matreros", "matreros"] },
  regatas_bella_vista: { name: "Regatas Bella Vista", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231286635634729/REGATAS_bv.png?ex=6a7aa660&is=6a7954e0&hm=e26cce232240881c54d25a0e8d43bc1841c71f3950aa4699fd45b65d20c643bd", aliases: ["regatas", "regatas bella vista"] },
  atletico_del_rosario: { name: "Atletico del Rosario", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231293858226186/rosario.png?ex=6a7aa662&is=6a7954e2&hm=94ec235340236bf245fd7380de7905518da04584180a7314140d35185156f7fb", aliases: ["plaza", "atletico del rosario", "atlético del rosario"] },
  sic: { name: "SIC", logo: "https://cdn.discordapp.com/attachments/1536231065184903278/1536231304788578314/SIC_.png?ex=6a7aa664&is=6a7954e4&hm=7dec2e5910159475effa86892ca268033077a628aec7163bd7baf07336ad9557", aliases: ["sic"] }
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
      const res = await fetch(BASE + "data/teams.json", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.clubs && typeof data.clubs === "object") {
          Object.entries(data.clubs).forEach(([id, team]) => {
            if (!team || typeof team !== "object") return;
            DROP_RUGBY_TEAMS[id] = {
              name: team.name || id,
              logo: team.logo || "",
              aliases: Array.isArray(team.aliases) ? team.aliases : []
            };
          });
        }
      }
    } catch (_) {
      // Conserva el registro incorporado como fallback.
    }

    TEAMS_LOADED = true;
    return DROP_RUGBY_TEAMS;
  })();

  return TEAMS_LOADING;
}

function teamShield(value, className = "team-shield") {
  const team = getTeamByName(value);
  if (!team) {
    const initials = String(value || "?").trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "?";
    return `<span class="${className} team-shield-fallback" aria-hidden="true">${initials}</span>`;
  }
  return `<img class="${className}" src="${team.logo}" alt="Escudo de ${team.name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'${className} team-shield-fallback',textContent:'${team.name.slice(0,2).toUpperCase()}'}))">`;
}


/* ---------- Menú mobile ---------- */
const menuBtn = document.querySelector(".menu-btn");
const mobileNav = document.querySelector(".mobile-nav");
if (menuBtn && mobileNav) {
  menuBtn.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  mobileNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Animaciones al hacer scroll ---------- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

function observeReveals(root = document) {
  root.querySelectorAll(".reveal:not(.visible)").forEach(el => observer.observe(el));
}
observeReveals();

/* ---------- Newsletter (placeholder hasta conectar proveedor real) ---------- */
document.querySelectorAll(".newsletter-form").forEach(form => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.classList.add("submitted");
  });
});

/* ---------- Carga de datos ---------- */
let ARTICLES_CACHE = null;
async function loadArticles() {
  if (ARTICLES_CACHE) return ARTICLES_CACHE;
  try {
    const res = await fetch(BASE + "api/content?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("API unavailable");
    const data = await res.json();
    ARTICLES_CACHE = Array.isArray(data.articles) ? data.articles : [];
    return ARTICLES_CACHE;
  } catch (_) {}
  const local = localStorage.getItem("droprugby_articles");
  if (local) { try { ARTICLES_CACHE = JSON.parse(local); return ARTICLES_CACHE; } catch (_) {} }
  if (window.DROP_RUGBY_DATA?.articles) { ARTICLES_CACHE = window.DROP_RUGBY_DATA.articles; return ARTICLES_CACHE; }
  try { const res = await fetch(BASE + "data/articles.json"); ARTICLES_CACHE = await res.json(); }
  catch (_) { ARTICLES_CACHE = []; }
  return ARTICLES_CACHE;
}

let FIXTURES_CACHE = null;
async function loadFixtures() {
  if (FIXTURES_CACHE) return FIXTURES_CACHE;
  try {
    const res = await fetch(BASE + "api/content?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("API unavailable");
    const data = await res.json();
    FIXTURES_CACHE = Array.isArray(data.fixtures) ? data.fixtures : [];
    return FIXTURES_CACHE;
  } catch (_) {}
  const local = localStorage.getItem("droprugby_fixtures");
  if (local) { try { FIXTURES_CACHE = JSON.parse(local); return FIXTURES_CACHE; } catch (_) {} }
  if (window.DROP_RUGBY_DATA?.fixtures) { FIXTURES_CACHE = window.DROP_RUGBY_DATA.fixtures; return FIXTURES_CACHE; }
  try { const res = await fetch(BASE + "data/fixtures.json"); FIXTURES_CACHE = await res.json(); }
  catch (_) { FIXTURES_CACHE = []; }
  return FIXTURES_CACHE;
}

let STANDINGS_CACHE = null;
async function loadStandings() {
  if (STANDINGS_CACHE) return STANDINGS_CACHE;
  try {
    const res = await fetch(BASE + "api/content?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("API unavailable");
    const data = await res.json();
    if (Array.isArray(data.standings) && data.standings.length) {
      STANDINGS_CACHE = data.standings;
      return STANDINGS_CACHE;
    }
    throw new Error("empty");
  } catch (_) {}
  STANDINGS_CACHE = window.DROP_RUGBY_DATA?.standings || [];
  return STANDINGS_CACHE;
}

/* ---------- Utilidades ---------- */
const MESES = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
const DIAS = ["DOMINGO","LUNES","MARTES","MIÉRCOLES","JUEVES","VIERNES","SÁBADO"];

function formatDateShort(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2,"0")} ${MESES[m-1]} ${y}`;
}
function dateFromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function isoFromDate(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}

function storyCardHTML(article, opts = {}) {
  const featuredClass = opts.featured ? "story-featured" : "";
  const visual = article.imageUrl
    ? `<div class="story-image photo-not-clickable"><img src="${String(article.imageUrl).replace(/"/g, '&quot;')}" alt="" loading="lazy"></div>`
    : `<div class="story-image ph-image photo-not-clickable ${article.imageClass || 'img-tone-1'}"></div>`;
  const category = String(article.category || 'Rugby').toUpperCase();
  const subcategory = String(article.subcategory || 'ACTUALIDAD').toUpperCase();
  // Las noticias administradas usan article.html?id=... como ruta dinámica.
  // Si el JSON trae una ruta legacy dentro de /noticias/, la convertimos para
  // evitar enlaces rotos a archivos HTML que no existen físicamente.
  const articleId = encodeURIComponent(article.id || "");
  const articleUrl = (article.url && !String(article.url).startsWith("noticias/"))
    ? article.url
    : `article.html?id=${articleId}`;
  const title = String(article.title || 'Sin título');
  const excerpt = String(article.excerpt || '');
  const author = String(article.author || 'DropRugby');
  const date = article.date || new Date().toISOString().slice(0, 10);
  return `
    <article class="story ${featuredClass} reveal">
      ${visual}
      <div class="story-body">
        <p class="category">${category} · ${subcategory}</p>
        <h3><a href="${BASE}${articleUrl}">${title}</a></h3>
        <p>${excerpt}</p>
        <div class="meta">Por ${author} · ${formatDateShort(date).toUpperCase()}</div>
      </div>
    </article>`;
}

/* ---------- Render: portada ---------- */
async function renderHome() {
  await loadTeams();
  const grid = document.getElementById("home-top-stories");
  const pumasEl = document.getElementById("home-los-pumas");
  const srEl = document.getElementById("home-super-rugby");
  const urbaTop14El = document.getElementById("home-urba-top14");
  const urbaEl = document.getElementById("home-urba");
  const heroEl = document.getElementById("home-hero");
  if (!grid && !heroEl) return;

  const articles = (await loadArticles()).filter(a => a.published !== false && !a.scheduled).slice().sort((a,b) => b.date.localeCompare(a.date));
  const featured = articles.find(a => a.featured) || articles[0];

  if (heroEl && featured) {
    const heroVisual = featured.imageUrl
      ? `<div class="hero-image photo-not-clickable"><img src="${String(featured.imageUrl).replace(/"/g, '&quot;')}" alt="" loading="eager"><div class="image-overlay"></div><div class="hero-card-caption"><span>TOP STORY · ${featured.category.toUpperCase()}</span><h2>${featured.title}</h2></div></div>`
      : `<div class="hero-image ${featured.imageClass || 'img-tone-1'} photo-not-clickable ph-image"><div class="image-overlay"></div><div class="hero-card-caption"><span>TOP STORY · ${featured.category.toUpperCase()}</span><h2>${featured.title}</h2></div></div>`;
    heroEl.innerHTML = `<div class="hero-card-inner">${heroVisual}</div>`;
    const heroLink = document.getElementById("home-hero-link");
    if (heroLink) {
      const featuredId = encodeURIComponent(featured.id || "");
      const featuredUrl = (featured.url && !String(featured.url).startsWith("noticias/"))
        ? featured.url
        : `article.html?id=${featuredId}`;
      heroLink.href = BASE + featuredUrl;
    }
  }

  const rest = articles.filter(a => a.id !== (featured && featured.id));
  if (grid) {
    grid.innerHTML = rest.slice(0, 3).map((a, i) => storyCardHTML(a, { featured: i === 0 })).join("");
  }

  const byCategory = (name, el, n = 3) => {
    if (!el) return;
    const items = articles.filter(a => a.category === name && a.published !== false && !a.scheduled).slice(0, n);
    el.innerHTML = items.length
      ? items.map(a => storyCardHTML(a)).join("")
      : `<p class="empty-state">Todavía no hay noticias publicadas en esta categoría.</p>`;
  };
  byCategory("Los Pumas", pumasEl);
  byCategory("Super Rugby", srEl);
  byCategory("URBA TOP 14", urbaTop14El);
  byCategory("URBA", urbaEl);

  observeReveals();
}

/* ---------- Render: página de categoría con filtros ---------- */
async function renderCategoryPage(categoryName) {
  const grid = document.getElementById("category-grid");
  if (!grid) return;
  const articles = (await loadArticles())
    .filter(a => a.category === categoryName && a.published !== false && !a.scheduled)
    .sort((a,b) => b.date.localeCompare(a.date));

  const chips = document.querySelectorAll(".filter-bar .filter-chip");
  let activeFilter = "TODAS";

  function paint() {
    const filtered = activeFilter === "TODAS"
      ? articles
      : articles.filter(a => a.subcategory.toUpperCase() === activeFilter);
    grid.innerHTML = filtered.length
      ? filtered.map(a => storyCardHTML(a)).join("")
      : `<p class="empty-state">No hay noticias para este filtro todavía.</p>`;
    observeReveals();
  }

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.dataset.filter;
      paint();
    });
  });

  paint();
}

/* ---------- Render: calendario ---------- */
async function renderCalendar() {
  await loadTeams();
  const listEl = document.getElementById("calendar-list");
  if (!listEl) return;
  const fixtures = await loadFixtures();

  const compBtns = document.querySelectorAll(".competition-select .filter-chip");
  const dateBtns = document.querySelectorAll(".date-filter-bar .date-chip");
  const dayLabel = document.getElementById("day-nav-label");
  const prevBtn = document.getElementById("day-prev");
  const nextBtn = document.getElementById("day-next");
  const todayBtn = document.getElementById("day-today");

  let activeCompetition = "TODAS";
  let mode = "dia"; // dia | manana | finde | semana
  let currentDate = new Date();
  currentDate.setHours(0,0,0,0);

  // Usar la fecha del fixture más próximo si "hoy" no tiene partidos, para que la demo se vea poblada
  // No reemplazar HOY por la primera fecha con partidos.
  // El calendario debe respetar la fecha real del dispositivo aunque ese día
  // no haya encuentros cargados.
  function groupByDateAndCompetition(items) {
    const byDate = {};
    items.forEach(f => {
      byDate[f.date] = byDate[f.date] || {};
      byDate[f.date][f.competition] = byDate[f.date][f.competition] || [];
      byDate[f.date][f.competition].push(f);
    });
    return byDate;
  }

  function getRangeDates() {
    if (mode === "semana") {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diffToMonday = (day + 6) % 7;
      start.setDate(start.getDate() - diffToMonday);
      return Array.from({length: 7}, (_, i) => {
        const d = new Date(start); d.setDate(start.getDate() + i); return isoFromDate(d);
      });
    }
    if (mode === "finde") {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diffToSat = (6 - day + 7) % 7;
      const sat = new Date(start); sat.setDate(start.getDate() + diffToSat);
      const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
      return [isoFromDate(sat), isoFromDate(sun)];
    }
    if (mode === "manana") {
      const d = new Date(currentDate); d.setDate(d.getDate() + 1);
      return [isoFromDate(d)];
    }
    return [isoFromDate(currentDate)];
  }

  function updateDayLabel() {
    if (mode === "dia") {
      dayLabel.textContent = `${DIAS[currentDate.getDay()]} · ${formatDateShort(isoFromDate(currentDate))}`;
    } else if (mode === "manana") {
      const d = new Date(currentDate); d.setDate(d.getDate()+1);
      dayLabel.textContent = `${DIAS[d.getDay()]} · ${formatDateShort(isoFromDate(d))}`;
    } else if (mode === "finde") {
      dayLabel.textContent = "FIN DE SEMANA";
    } else {
      dayLabel.textContent = "TODA LA SEMANA";
    }
  }

  function paint() {
    updateDayLabel();
    const dates = getRangeDates();
    let filtered = fixtures.filter(f => dates.includes(f.date));
    if (activeCompetition !== "TODAS") {
      filtered = filtered.filter(f => f.competition.toUpperCase() === activeCompetition);
    }
    const grouped = groupByDateAndCompetition(filtered);
    const sortedDates = Object.keys(grouped).sort();

    if (!sortedDates.length) {
      listEl.innerHTML = `<p class="empty-state">No hay partidos cargados para este filtro. Probá con otra competición o fecha.</p>`;
      return;
    }

    listEl.innerHTML = sortedDates.map(date => {
      const dt = dateFromISO(date);
      const comps = grouped[date];
      const compsHTML = Object.keys(comps).sort().map(compName => {
        const rows = comps[compName].sort((a,b) => a.time.localeCompare(b.time)).map(f => `
          <div class="match-row">
            <div class="match-time">${f.time}</div>
            <div class="match-teams team-matchup">
              <span class="team-side">${teamShield(f.home)}<span>${f.home}</span></span>
              <span class="team-vs">vs.</span>
              <span class="team-side team-side-away"><span>${f.away}</span>${teamShield(f.away)}</span>
            </div>
            <div class="match-channel">${f.channel}</div>
          </div>`).join("");
        return `
          <div class="competition-block">
            <div class="competition-name">${compName.toUpperCase()}</div>
            ${rows}
          </div>`;
      }).join("");

      return `
        <div class="day-block">
          <div class="day-block-header">
            <span class="dow">${DIAS[dt.getDay()]}</span>
            <span class="full-date">${formatDateShort(date)}</span>
          </div>
          ${compsHTML}
        </div>`;
    }).join("");
  }

  compBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      compBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCompetition = btn.dataset.filter;
      paint();
    });
  });

  dateBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      dateBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      paint();
    });
  });

  if (prevBtn) prevBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - (mode === "semana" ? 7 : 1));
    paint();
  });
  if (nextBtn) nextBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + (mode === "semana" ? 7 : 1));
    paint();
  });
  if (todayBtn) todayBtn.addEventListener("click", () => {
    currentDate = new Date(); currentDate.setHours(0,0,0,0);
    mode = "dia";
    dateBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === "dia"));
    paint();
  });

  paint();
}

/* ---------- Render: preview del calendario en la home ---------- */
async function renderCalendarPreview() {
  await loadTeams();
  const el = document.getElementById("home-calendar-preview");
  if (!el) return;
  const fixtures = (await loadFixtures()).slice().sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
  const upcoming = fixtures.slice(0, 6);
  el.innerHTML = upcoming.map(f => `
    <div class="match-row">
      <div class="match-time">${f.time}</div>
      <div class="match-teams team-matchup">
        <span class="team-side">${teamShield(f.home)}<span>${f.home}</span></span>
        <span class="team-vs">vs.</span>
        <span class="team-side team-side-away"><span>${f.away}</span>${teamShield(f.away)}</span>
        <span style="color:var(--muted-light); font-weight:400;">— ${f.competition}</span>
      </div>
      <div class="match-channel">${f.channel}</div>
    </div>`).join("");
}

/* ---------- Tabla de posiciones URBA TOP 14 ---------- */
async function renderUrbaStandings() {
  await loadTeams();
  const el = document.getElementById("urba-standings");
  if (!el) return;

  const standings = (await loadStandings())
    .slice()
    .sort((a, b) => (b.pts - a.pts) || (b.diff - a.diff));

  if (!standings.length) {
    el.innerHTML = `<p class="muted">Todavía no hay tabla cargada.</p>`;
    return;
  }

  const updated = window.DROP_RUGBY_DATA?.standingsUpdated;
  const updatedLabel = updated ? formatDateShort(updated) : "";
  const relegationFrom = standings.length - 2; // últimos 2 equipos: descenso

  el.innerHTML = `
    ${updatedLabel ? `<p class="standings-updated">Actualizada · ${updatedLabel}</p>` : ""}
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
            <tr class="${i >= relegationFrom ? "is-relegation" : ""}">
              <td class="col-pos">${i + 1}</td>
              <td class="col-team"><span class="team-cell">${teamShield(team.team)}<span>${team.team}</span></span></td>
              <td>${team.pj}</td>
              <td>${team.pg}</td>
              <td>${team.pe}</td>
              <td>${team.pp}</td>
              <td class="${team.diff > 0 ? "is-positive" : team.diff < 0 ? "is-negative" : ""}">${team.diff > 0 ? "+" : ""}${team.diff}</td>
              <td class="col-pts">${team.pts}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="standings-legend">
      <span><i class="dot dot-ok"></i>Permanencia</span>
      <span><i class="dot dot-down"></i>Descenso</span>
    </div>
  `;
}

/* ---------- Buscador global ---------- */
function setupSearch() {
  const openBtns = document.querySelectorAll(".search-btn");
  const overlay = document.getElementById("search-overlay");
  const closeBtn = document.getElementById("search-close");
  const input = document.getElementById("search-input");
  const resultsEl = document.getElementById("search-results");
  if (!overlay || !openBtns.length) return;

  let articlesForSearch = [];

  async function ensureData() {
    if (!articlesForSearch.length) articlesForSearch = await loadArticles();
  }

  openBtns.forEach(btn => btn.addEventListener("click", async () => {
    overlay.classList.add("open");
    input.focus();
    await ensureData();
  }));
  closeBtn.addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") overlay.classList.remove("open"); });

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { resultsEl.innerHTML = ""; return; }
    const matches = articlesForSearch.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.subcategory.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q)
    );
    resultsEl.innerHTML = matches.length
      ? matches.map(a => `
          <a class="search-result" href="${BASE}${a.url}">
            <p class="category">${a.category.toUpperCase()} · ${a.subcategory.toUpperCase()}</p>
            <h3>${a.title}</h3>
          </a>`).join("")
      : `<p class="search-empty">Sin resultados para "${input.value}".</p>`;
  });
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  renderHome();
  renderCalendarPreview();
  renderCalendar();
  renderUrbaStandings();
  const catEl = document.getElementById("category-grid");
  if (catEl) renderCategoryPage(catEl.dataset.category);
});

/* ==========================================================================
   DropRugby V4 — script.js
   Menú mobile, animaciones al scroll, buscador global, filtros de categoría,
   calendario dinámico y render de noticias desde data/articles.json.

   window.ASSET_BASE debe definirse ANTES de este script en páginas dentro
   de /noticias/ (ej: "../") para que las rutas a data/ y noticias/ funcionen.
   ========================================================================== */

const BASE = window.ASSET_BASE || "";

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
  return `
    <article class="story ${featuredClass} reveal">
      ${visual}
      <div class="story-body">
        <p class="category">${article.category.toUpperCase()} · ${article.subcategory.toUpperCase()}</p>
        <h3><a href="${BASE}${article.url}">${article.title}</a></h3>
        <p>${article.excerpt}</p>
        <div class="meta">Por ${article.author} · ${formatDateShort(article.date).toUpperCase()}</div>
      </div>
    </article>`;
}

/* ---------- Render: portada ---------- */
async function renderHome() {
  const grid = document.getElementById("home-top-stories");
  const pumasEl = document.getElementById("home-los-pumas");
  const srEl = document.getElementById("home-super-rugby");
  const urbaTop14El = document.getElementById("home-urba-top14");
  const urbaEl = document.getElementById("home-urba");
  const heroEl = document.getElementById("home-hero");
  if (!grid && !heroEl) return;

  const articles = (await loadArticles()).slice().sort((a,b) => b.date.localeCompare(a.date));
  const featured = articles.find(a => a.featured) || articles[0];

  if (heroEl && featured) {
    const heroVisual = featured.imageUrl
      ? `<div class="hero-image photo-not-clickable"><img src="${String(featured.imageUrl).replace(/"/g, '&quot;')}" alt="" loading="eager"><div class="image-overlay"></div><div class="hero-card-caption"><span>TOP STORY · ${featured.category.toUpperCase()}</span><h2>${featured.title}</h2></div></div>`
      : `<div class="hero-image ${featured.imageClass || 'img-tone-1'} photo-not-clickable ph-image"><div class="image-overlay"></div><div class="hero-card-caption"><span>TOP STORY · ${featured.category.toUpperCase()}</span><h2>${featured.title}</h2></div></div>`;
    heroEl.innerHTML = `<div class="hero-card-inner">${heroVisual}</div>`;
    const heroLink = document.getElementById("home-hero-link");
    if (heroLink) heroLink.href = BASE + featured.url;
  }

  const rest = articles.filter(a => a.id !== (featured && featured.id));
  if (grid) {
    grid.innerHTML = rest.slice(0, 3).map((a, i) => storyCardHTML(a, { featured: i === 0 })).join("");
  }

  const byCategory = (name, el, n = 3) => {
    if (!el) return;
    const items = articles.filter(a => a.category === name).slice(0, n);
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
    .filter(a => a.category === categoryName)
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
  const availableDates = fixtures.map(f => f.date).sort();
  if (availableDates.length && !fixtures.some(f => f.date === isoFromDate(currentDate))) {
    currentDate = dateFromISO(availableDates[0]);
  }

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
            <div class="match-teams">${f.home} vs. ${f.away}</div>
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
  const el = document.getElementById("home-calendar-preview");
  if (!el) return;
  const fixtures = (await loadFixtures()).slice().sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
  const upcoming = fixtures.slice(0, 6);
  el.innerHTML = upcoming.map(f => `
    <div class="match-row">
      <div class="match-time">${f.time}</div>
      <div class="match-teams">${f.home} vs. ${f.away} <span style="color:var(--muted-light); font-weight:400;">— ${f.competition}</span></div>
      <div class="match-channel">${f.channel}</div>
    </div>`).join("");
}

/* ---------- Tabla de posiciones URBA TOP 14 ---------- */
async function renderUrbaStandings() {
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
              <td class="col-team">${team.team}</td>
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

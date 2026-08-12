/* =========================================================
   DROPRUGBY ADMIN
   ========================================================= */

"use strict";

const state = {
  content: {
    articles: [],
    fixtures: [],
    results: [],
    standings: [],
    standingsBase: [],
    settings: {},
    media: []
  },
  section: "dashboard",
  media: [],
  clubs: {},
  nations: {}
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const makeId = (prefix = "item") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function toast(title, message = "", type = "ok") {
  const container = $("#toast-container");

  if (!container) {
    console.log(`[${type}] ${title}: ${message}`);
    return;
  }

  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.innerHTML =
    `<strong>${esc(title)}</strong><span>${esc(message)}</span>`;

  container.appendChild(element);

  setTimeout(() => {
    element.style.opacity = "0";
    element.style.transform = "translateY(8px)";
    setTimeout(() => element.remove(), 250);
  }, 3200);
}

function fmt(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function fmtDT(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const TOP14_TEAMS = [
  "Newman",
  "CASI",
  "Hindú",
  "Alumni",
  "SIC",
  "Regatas Bella Vista",
  "Los Tilos",
  "Belgrano Athletic",
  "CUBA",
  "Atletico del Rosario",
  "Los Matreros",
  "La Plata",
  "Buenos Aires C&RC",
  "Champagnat"
];

const TOP14_ALIASES = {
  "belgrano": "Belgrano Athletic",
  "belgrano athletic": "Belgrano Athletic",
  "hindu": "Hindú",
  "hindú": "Hindú",
  "regatas": "Regatas Bella Vista",
  "regatas bella vista": "Regatas Bella Vista",
  "regatas de bella vista": "Regatas Bella Vista",
  "plaza": "Atletico del Rosario",
  "atletico del rosario": "Atletico del Rosario",
  "atletico del rosario uba": "Atletico del Rosario",
  "ca atletico del rosario": "Atletico del Rosario",
  "biei": "Buenos Aires C&RC",
  "bac": "Buenos Aires C&RC",
  "buenos aires crc": "Buenos Aires C&RC",
  "buenos aires c&rc": "Buenos Aires C&RC",
  "champa": "Champagnat",
  "champagnat": "Champagnat",
  "la plata": "La Plata",
  "cuba": "CUBA",
  "newman": "Newman",
  "alumni": "Alumni",
  "casi": "CASI",
  "sic": "SIC",
  "los tilos": "Los Tilos",
  "los matreros": "Los Matreros"
};

function normalizeTop14Team(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^club\s+/, "").replace(/\s+/g, " ").trim();
  return TOP14_ALIASES[key] || raw;
}

function isOfficialTop14Team(name) {
  return TOP14_TEAMS.includes(normalizeTop14Team(name));
}

function fixtureKey(fixture) {
  const competition = String(fixture.competition || "").trim().toUpperCase();
  const home = fixture.home || fixture.team1 || fixture.local || "";
  const away = fixture.away || fixture.team2 || fixture.visitante || "";
  return [

    fixture.date || "",
    fixture.time || "",
    competition === "URBA TOP 14" ? normalizeTop14Team(home) : home,
    competition === "URBA TOP 14" ? normalizeTop14Team(away) : away,
    fixture.competition || ""
  ]
    .join("|")
    .toLowerCase();
}

function isURBATop14(fixture) {
  return String(fixture?.competition || "")
    .trim()
    .toUpperCase() === "URBA TOP 14";
}

function getFixtureName(fixture) {
  const home =
    fixture.home ||
    fixture.team1 ||
    fixture.local ||
    "Local";

  const away =
    fixture.away ||
    fixture.team2 ||
    fixture.visitante ||
    "Visitante";

  const competition = String(fixture.competition || "").trim().toUpperCase();
  if (competition === "URBA TOP 14") {
    return `${normalizeTop14Team(home)} vs ${normalizeTop14Team(away)}`;
  }
  return `${home} vs ${away}`;
}

/* =========================================================
   API ADMIN
========================================================= */

async function api(action, body = {}) {
  const response = await fetch("/api/admin", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action,
      ...body
    })
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Respuesta inválida del servidor (${response.status})`
    );
  }

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.error ||
      data.message ||
      "Error en el servidor"
    );
  }

  return data;
}

async function getContent(showToast = false) {
  const response = await fetch(
    "/api/admin?action=get",
    {
      credentials: "include",
      cache: "no-store"
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    throw new Error("No se pudo leer la respuesta del servidor.");
  }

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error ||
      "No se pudo cargar el contenido"
    );
  }

  state.content = normalizeContent(data.content);

  renderAll();

  if (showToast) {
    toast("Actualizado", "Contenido actualizado.");
  }
}

function normalizeContent(content) {
  const data =
    content &&
    typeof content === "object"
      ? content
      : {};

  return {
    articles: Array.isArray(data.articles)
      ? data.articles
      : [],

    fixtures: Array.isArray(data.fixtures)
      ? data.fixtures
      : [],

    results: Array.isArray(data.results)
      ? data.results
      : [],

    standings: Array.isArray(data.standings)
      ? data.standings
      : [],

    standingsBase: Array.isArray(data.standingsBase)
      ? data.standingsBase
      : [],

    settings:
      data.settings &&
      typeof data.settings === "object"
        ? data.settings
        : {},

    media: Array.isArray(data.media)
      ? data.media
      : []
  };
}

function showApp(user = "admin") {
  $("#login-screen")?.classList.add("hidden");
  $("#admin-app")?.classList.remove("hidden");

  if ($("#admin-username")) {
    $("#admin-username").textContent = user;
  }

  getContent().catch((error) => {
    toast("Error", error.message, "error");
  });
}

function showLogin() {
  $("#login-screen")?.classList.remove("hidden");
  $("#admin-app")?.classList.add("hidden");
}

async function checkSession() {
  try {
    const response = await fetch(
      "/api/admin?action=session",
      {
        credentials: "include",
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (data.authenticated) {
      showApp(data.user || "admin");
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

/* =========================================================
   NAVEGACIÓN
========================================================= */

function switchSection(section) {
  state.section = section;

  $$(".section").forEach((element) => {
    element.classList.toggle(
      "active",
      element.id === `section-${section}`
    );
  });

  $$(".nav-item").forEach((element) => {
    element.classList.toggle(
      "active",
      element.dataset.section === section
    );
  });

  const titles = {
    dashboard: "Dashboard",
    articles: "Noticias",
    fixtures: "Partidos",
    results: "Resultados TOP 14",
    media: "Media Manager"
  };

  if ($("#page-title")) {
    $("#page-title").textContent =
      titles[section] || "Dashboard";
  }

  closeSidebar();

  if (section === "articles") renderArticles();
  if (section === "fixtures") renderFixtures();
  if (section === "results") renderResults();
  if (section === "media") loadMedia();
}

function closeSidebar() {
  $("#sidebar")?.classList.remove("open");
  $("#sidebar-overlay")?.classList.remove("show");
}

function renderAll() {
  renderCounts();
  renderDashboard();
  renderArticles();
  renderFixtures();
  renderResults();

  if (state.section === "media") {
    renderMedia();
  }
}

function renderCounts() {
  const content = state.content;

  $("#nav-articles-count").textContent =
    content.articles.length;

  $("#nav-fixtures-count").textContent =
    content.fixtures.length;

  $("#nav-results-count").textContent =
    content.results.length;

  $("#stat-articles").textContent =
    content.articles.length;

  $("#stat-fixtures").textContent =
    content.fixtures.length;

  $("#stat-results").textContent =
    content.results.length;

  $("#stat-scheduled").textContent =
    content.articles.filter(
      (article) =>
        article.scheduled &&
        article.publishAt &&
        new Date(article.publishAt).getTime() > Date.now()
    ).length;
}

/* =========================================================
   DASHBOARD
========================================================= */

function articleStatus(article) {
  if (
    article.scheduled &&
    article.publishAt &&
    new Date(article.publishAt).getTime() > Date.now()
  ) {
    return `
      <span class="badge scheduled">
        PROGRAMADA · ${esc(fmtDT(article.publishAt))}
      </span>
    `;
  }

  if (article.published === false) {
    return `<span class="badge">BORRADOR</span>`;
  }

  return `<span class="badge live">PUBLICADA</span>`;
}

function renderDashboard() {
  const articles =
    [...state.content.articles]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.date || 0) -
          new Date(a.createdAt || a.date || 0)
      );

  $("#dashboard-articles").innerHTML =
    articles
      .slice(0, 6)
      .map(
        (article) => `
          <div class="list-item">
            <div>
              <b>${esc(article.title || "Sin título")}</b>
              <small class="muted">
                ${esc(article.category || "Rugby")} · ${fmt(article.date)}
              </small>
            </div>
            <div>${articleStatus(article)}</div>
          </div>
        `
      )
      .join("") ||
    `<div class="list-item muted">No hay noticias.</div>`;

  const scheduled =
    articles
      .filter(
        (article) =>
          article.scheduled &&
          article.publishAt &&
          new Date(article.publishAt).getTime() > Date.now()
      )
      .sort(
        (a, b) =>
          new Date(a.publishAt) -
          new Date(b.publishAt)
      );

  $("#dashboard-scheduled").innerHTML =
    scheduled
      .slice(0, 6)
      .map(
        (article) => `
          <div class="list-item">
            <div>
              <b>${esc(article.title || "Sin título")}</b>
              <small class="muted">
                ${esc(article.category || "Rugby")}
              </small>
            </div>
            <span class="badge scheduled">
              ${esc(fmtDT(article.publishAt))}
            </span>
          </div>
        `
      )
      .join("") ||
    `<div class="list-item muted">
      No hay noticias programadas.
    </div>`;

  const pending = getPendingFixtures();

  $("#dashboard-pending-results").innerHTML =
    pending
      .slice(0, 6)
      .map(
        (fixture) => `
          <article class="dashboard-fixture-card">
            <div class="dashboard-fixture-date">
              <span>${esc(fixture.date || "—")}</span>
              <small>${fixture.time ? esc(fixture.time) : ""}</small>
            </div>
            <div class="dashboard-fixture-main">
              <b>${esc(getFixtureName(fixture))}</b>
              <small>URBA TOP 14 · resultado pendiente</small>
            </div>
            <button class="action" data-add-result="${esc(fixture.id || fixtureKey(fixture))}">CARGAR</button>
          </article>
        `
      )
      .join("") ||
    `<div class="list-item muted">
      No hay resultados pendientes.
    </div>`;
}

/* =========================================================
   NOTICIAS
========================================================= */

function filteredArticles() {
  const query =
    ($("#article-search")?.value || "")
      .trim()
      .toLowerCase();

  const category =
    $("#article-category-filter")?.value || "";

  return state.content.articles.filter(
    (article) => {
      const text = [
        article.title,
        article.excerpt,
        article.author,
        article.category
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || text.includes(query)) &&
        (!category || article.category === category)
      );
    }
  );
}

function renderArticles() {
  const rows =
    filteredArticles().sort(
      (a, b) =>
        new Date(b.createdAt || b.date || 0) -
        new Date(a.createdAt || a.date || 0)
    );

  $("#articles-table").innerHTML =
    rows
      .map(
        (article) => `
          <tr>
            <td class="title-cell">
              ${esc(article.title || "Sin título")}
              <small>${esc(article.author || "DropRugby")}</small>
            </td>

            <td>${esc(article.category || "Rugby")}</td>

            <td>${esc(fmt(article.date))}</td>

            <td>${articleStatus(article)}</td>

            <td>
              <div class="actions">
                <button class="action" data-stats-article="${esc(article.id)}">📈 STATS</button>
                <button
                  class="action"
                  data-edit-article="${esc(article.id)}"
                >
                  EDITAR
                </button>

                <button
                  class="action"
                  data-delete-article="${esc(article.id)}"
                >
                  BORRAR
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join("") ||
    `<tr>
      <td colspan="5" class="muted">
        No hay noticias.
      </td>
    </tr>`;
}

function articleForm(article = {}) {
  const publishDate = article.publishAt ? new Date(article.publishAt) : null;
  const localPublish = publishDate && !Number.isNaN(publishDate.getTime())
    ? new Date(publishDate.getTime() - publishDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    : "";
  const imageUrl = article.imageUrl || article.image || "";
  const isPublished = article.published !== false;
  const statusText = article.scheduled ? "Programada" : (isPublished ? "Publicada" : "Borrador");

  return `
    <div class="article-composer">
      <div class="article-composer-intro">
        <div>
          <span class="article-composer-eyebrow">REDACCIÓN DROPRUGBY</span>
          <h3>${article.id ? "Editar noticia" : "Nueva noticia"}</h3>
          <p>Prepará la nota, ordená el contenido y dejala lista para publicar.</p>
        </div>
        <div class="article-status-pill ${article.scheduled ? "scheduled" : (isPublished ? "published" : "draft")}">
          <span></span>${statusText}
        </div>
      </div>

      <section class="composer-section composer-main-section">
        <div class="composer-section-head">
          <div><span>01</span><div><strong>Información principal</strong><small>Título, copete y datos editoriales.</small></div></div>
        </div>

        <label class="composer-title-field">
          <span>Título de la noticia</span>
          <input name="title" required value="${esc(article.title || "")}" placeholder="Escribí un título claro y atractivo...">
        </label>

        <div class="composer-meta-grid">
          <label>
            <span>Categoría</span>
            <select name="category">
              ${["Los Pumas","Super Rugby","URBA TOP 14","Internacional","Rugby"].map(category => `<option ${article.category === category ? "selected" : ""}>${category}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Autor</span>
            <input name="author" value="${esc(article.author || "DropRugby")}" placeholder="Autor de la nota">
          </label>
          <label>
            <span>Fecha</span>
            <input type="date" name="date" value="${esc(String(article.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10))}">
          </label>
        </div>

        <label class="composer-excerpt-field">
          <span>Bajada / copete</span>
          <textarea name="excerpt" rows="3" placeholder="Contale al lector en pocas líneas qué va a encontrar en la noticia...">${esc(article.excerpt || "")}</textarea>
        </label>
      </section>

      <section class="composer-section composer-media-section">
        <div class="composer-section-head">
          <div><span>02</span><div><strong>Imagen de portada</strong><small>Elegí una imagen existente o subí una nueva.</small></div></div>
          <span class="composer-section-tag">MEDIA MANAGER</span>
        </div>
        <div class="composer-cover-grid">
          <div class="composer-cover-preview ${imageUrl ? "has-image" : ""}" id="article-image-preview">
            ${imageUrl ? `<img src="${esc(imageUrl)}" alt="Vista previa">` : `<div class="composer-cover-empty"><b>＋</b><span>Sin imagen de portada</span><small>Elegí una imagen para darle identidad a la noticia.</small></div>`}
          </div>
          <div class="composer-cover-controls">
            <input name="imageUrl" id="article-image-url" value="${esc(imageUrl)}" readonly aria-label="Imagen seleccionada">
            <div class="composer-cover-actions">
              <button type="button" class="btn primary" id="article-pick-image">ELEGIR DE MEDIA MANAGER</button>
              <button type="button" class="action upload-inline" id="article-upload-image">SUBIR IMAGEN</button>
              <input id="article-inline-upload" type="file" accept="image/*" hidden>
            </div>
            <label><span>Texto ALT</span><input name="imageAlt" value="${esc(article.imageAlt || article.seo?.imageAlt || "")}" placeholder="Describí la imagen para accesibilidad"></label>
            <p class="form-help">No necesitás pegar URLs. La imagen queda vinculada directamente a la noticia.</p>
          </div>
        </div>
      </section>

      <section class="composer-section composer-content-section">
        <div class="composer-section-head">
          <div><span>03</span><div><strong>Contenido</strong><small>Construí la noticia por bloques y mirá el resultado mientras escribís.</small></div></div>
          <button type="button" class="action" id="article-review">✓ REVISAR NOTICIA</button>
        </div>
        <div class="builder-toolbar article-builder-toolbar" id="article-builder-toolbar">
          <div class="builder-toolbar-group"><span>Texto</span><button type="button" data-add-block="text">Párrafo</button><button type="button" data-add-block="quote">Cita</button><button type="button" data-add-block="separator">Separador</button></div>
          <div class="builder-toolbar-group"><span>Multimedia</span><button type="button" data-add-block="image">Imagen</button><button type="button" data-add-block="gallery">Galería</button><button type="button" data-add-block="video">Video</button></div>
          <div class="builder-toolbar-group"><span>Datos</span><button type="button" data-add-block="table">Tabla</button><button type="button" data-add-block="poll">Encuesta</button></div>
        </div>
        <div class="article-workspace">
          <div class="article-editor-pane">
            <div class="pane-label"><span>EDITOR</span><small>Arrastrá para ordenar · cada bloque se guarda al editar</small></div>
            <div id="article-blocks" class="article-blocks"></div>
            <input type="hidden" name="contentBlocks" id="article-content-blocks">
            <label class="builder-legacy-label"><span>Contenido de respaldo</span><textarea name="content" rows="3" placeholder="Solo se usa como respaldo para noticias antiguas.">${esc(article.content || "")}</textarea></label>
          </div>
          <aside class="article-live-pane">
            <div class="pane-label"><span>VISTA PREVIA</span><small>Así se verá en el sitio</small></div>
            <div id="article-live-preview" class="article-live-preview"></div>
          </aside>
        </div>
      </section>

      <section class="composer-section composer-publish-section">
        <div class="composer-section-head">
          <div><span>04</span><div><strong>Publicación</strong><small>Definí cuándo y cómo aparece la noticia.</small></div></div>
        </div>
        <div class="composer-publish-grid">
          <label class="composer-check-card ${article.featured ? "active" : ""}"><input type="checkbox" name="featured" ${article.featured ? "checked" : ""}><span><b>Destacada</b><small>Mostrar como contenido destacado.</small></span></label>
          <label class="composer-check-card ${isPublished ? "active" : ""}"><input type="checkbox" name="published" ${isPublished ? "checked" : ""}><span><b>Publicada</b><small>Disponible públicamente.</small></span></label>
          <label class="composer-check-card ${article.scheduled ? "active" : ""}"><input type="checkbox" name="scheduled" ${article.scheduled ? "checked" : ""}><span><b>Programar</b><small>Publicar automáticamente más tarde.</small></span></label>
        </div>
        <div class="composer-schedule-row">
          <label><span>Fecha y hora de publicación</span><input type="datetime-local" name="publishAt" value="${esc(localPublish)}"></label>
          <div class="composer-publish-note">Si programás la noticia, quedará como borrador hasta la fecha indicada.</div>
        </div>
      </section>

      <section class="composer-section composer-seo-section">
        <div class="composer-section-head">
          <div><span>05</span><div><strong>SEO</strong><small>Dejá la noticia lista para buscadores.</small></div></div>
          <span id="seo-score" class="seo-score">Sin revisar</span>
        </div>
        <div class="composer-seo-grid">
          <label><span>Título SEO</span><input name="seoTitle" value="${esc(article.seo?.title || article.seoTitle || "")}" maxlength="60" placeholder="Título para Google"></label>
          <label><span>Descripción SEO</span><textarea name="seoDescription" rows="3" maxlength="160" placeholder="Descripción para buscadores...">${esc(article.seo?.description || article.seoDescription || article.excerpt || "")}</textarea></label>
        </div>
      </section>
    </div>
  `;
}

async function openArticleStats(articleId) {
  try {
    const r=await fetch(`/api/analytics?articleId=${encodeURIComponent(articleId)}`,{cache:'no-store'});
    const data=await r.json(); if(!r.ok||!data.ok) throw new Error(data.error||'No se pudieron cargar las estadísticas.');
    const a=data.stats||{}; const days=Object.entries(a.daily||{}).sort((x,y)=>x[0].localeCompare(y[0])).slice(-7); const max=Math.max(1,...days.map(([,v])=>v.views||0));
    const bars=days.map(([d,v])=>`<div class="stats-bar-col"><div class="stats-bar" style="height:${Math.max(8,((v.views||0)/max)*120)}px" title="${v.views||0} visitas"></div><small>${esc(d.slice(5))}</small></div>`).join('');
    const avg=a.avgReading||0; const mins=Math.floor(avg/60), secs=avg%60;
    openModal('Estadísticas de la noticia',`<div class="article-stats"><div class="stats-kpis"><div><strong>${Number(a.uniqueViews ?? a.views ?? 0).toLocaleString('es-AR')}</strong><span>Vistas únicas</span></div><div><strong>${mins}:${String(secs).padStart(2,'0')}</strong><span>Lectura promedio</span></div><div><strong>${Number(a.shares||0).toLocaleString('es-AR')}</strong><span>Compartidos</span></div><div><strong>${Object.values(a.reactions||{}).reduce((n,v)=>n+Number(v||0),0).toLocaleString('es-AR')}</strong><span>Reacciones</span></div></div><h3>Visitas · últimos 7 días</h3><div class="stats-chart">${bars||'<span class="muted">Todavía no hay datos.</span>'}</div><div class="stats-reactions">${Object.entries(a.reactions||{}).map(([k,v])=>`<span>${k} ${v}</span>`).join('')||'<span class="muted">Sin reacciones.</span>'}</div></div>`,async()=>{});
  } catch(e){toast('Estadísticas',e.message,'error');}
}

function openArticle(article = {}) {
  openModal(
    article.id
      ? "Editar noticia"
      : "Nueva noticia",
    articleForm(article),
    async (fd) => {
      let publishAt = null;

      if (value(fd, "publishAt")) {
        const date = new Date(
          value(fd, "publishAt")
        );

        if (Number.isNaN(date.getTime())) {
          throw new Error(
            "La fecha de publicación no es válida."
          );
        }

        publishAt = date.toISOString();
      }

      const scheduled =
        checked(fd, "scheduled") &&
        Boolean(publishAt);

      const articleData = {
        id:
          article.id ||
          undefined,

        title:
          value(fd, "title"),

        slug:
          article.slug ||
          slugify(value(fd, "title")),

        url:
          article.id
            ? `article.html?id=${encodeURIComponent(article.id)}`
            : "",

        category:
          value(fd, "category") ||
          "Rugby",

        subcategory:
          article.subcategory ||
          "Actualidad",

        author:
          value(fd, "author") ||
          "DropRugby",

        excerpt:
          value(fd, "excerpt"),

        content:
          value(fd, "content"),

        contentBlocks:
          parseContentBlocks(value(fd, "contentBlocks")),

        seo: {
          title: value(fd, "seoTitle"),
          description: value(fd, "seoDescription"),
          imageAlt: value(fd, "imageAlt")
        },

        imageAlt:
          value(fd, "imageAlt"),

        imageUrl:
          value(fd, "imageUrl"),

        date:
          value(fd, "date"),

        featured:
          checked(fd, "featured"),

        published:
          scheduled
            ? false
            : checked(fd, "published"),

        scheduled,

        publishAt,

        createdAt:
          article.createdAt ||
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString()
      };

      await api(
        "create-article",
        { article: articleData }
      );
    }
  );

  requestAnimationFrame(() => {
    bindArticleMediaControls();
    bindArticleBuilder(article);
    bindArticleReview();
  });
}


function parseContentBlocks(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function blockLabel(type) {
  return ({text:"Texto",image:"Imagen",gallery:"Galería",video:"Video",quote:"Cita",table:"Tabla",poll:"Encuesta",separator:"Separador"})[type] || "Bloque";
}

function bindArticleBuilder(article = {}) {
  const root = $("#article-blocks");
  const hidden = $("#article-content-blocks");
  const preview = $("#article-live-preview");
  const form = $("#modal-form");
  if (!root || !hidden || !form) return;

  let blocks = Array.isArray(article.contentBlocks) ? structuredClone(article.contentBlocks) : [];
  if (!blocks.length && String(article.content || "").trim()) {
    blocks = [{ type: "text", text: String(article.content || "") }];
  }

  const renderPreviewBlock = (b) => {
    const type = b.type || "text";
    if (type === "text") {
      const text = String(b.text || "").trim();
      return text ? `<p>${esc(text).replace(/\n/g, "<br>")}</p>` : "";
    }
    if (type === "image") {
      return b.url ? `<figure><img src="${esc(b.url)}" alt="${esc(b.alt || "")}">${b.alt ? `<figcaption>${esc(b.alt)}</figcaption>` : ""}</figure>` : "";
    }
    if (type === "gallery") {
      const urls = Array.isArray(b.urls) ? b.urls.filter(Boolean).slice(0, 6) : [];
      return urls.length ? `<div class="live-gallery">${urls.map(u => `<img src="${esc(u)}" alt="">`).join("")}</div>` : "";
    }
    if (type === "video") {
      return b.url ? `<div class="live-video"><span>▶</span><small>VIDEO</small><strong>${esc(b.url)}</strong></div>` : "";
    }
    if (type === "quote") {
      return b.text ? `<blockquote>“${esc(b.text)}”${b.author ? `<cite>— ${esc(b.author)}</cite>` : ""}</blockquote>` : "";
    }
    if (type === "table") {
      const rows = Array.isArray(b.rows) ? b.rows : [];
      return rows.length ? `<table>${rows.map((r, ri) => `<tr>${r.map(c => `<${ri === 0 ? "th" : "td"}>${esc(c)}</${ri === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</table>` : "";
    }
    if (type === "poll") {
      const options = Array.isArray(b.options) ? b.options.filter(Boolean) : [];
      return b.question ? `<div class="live-poll"><strong>${esc(b.question)}</strong>${options.map(o => `<button type="button" disabled>${esc(o)}</button>`).join("")}<small>ENCUESTA</small></div>` : "";
    }
    if (type === "separator") return `<hr>`;
    return "";
  };

  const updatePreview = () => {
    if (!preview) return;
    const title = form.elements.title?.value || "Título de la noticia";
    const excerpt = form.elements.excerpt?.value || "";
    const image = form.elements.imageUrl?.value || "";
    const fallback = form.elements.content?.value || "";
    let body = blocks.map(renderPreviewBlock).join("");
    if (!body && fallback.trim()) body = `<p>${esc(fallback).replace(/\n/g, "<br>")}</p>`;

    preview.innerHTML = `
      ${image ? `<img class="live-cover" src="${esc(image)}" alt="">` : `<div class="live-cover live-cover-empty">Sin imagen de portada</div>`}
      <div class="live-article-content">
        <div class="live-kicker">${esc(form.elements.category?.value || "Rugby").toUpperCase()}</div>
        <h1>${esc(title)}</h1>
        ${excerpt ? `<p class="live-excerpt">${esc(excerpt)}</p>` : ""}
        <div class="live-divider"></div>
        <div class="live-body">${body || `<p class="live-placeholder">Agregá bloques para ver la noticia.</p>`}</div>
      </div>`;
  };

  const sync = () => {
    hidden.value = JSON.stringify(blocks);
    updatePreview();
  };

  const render = () => {
    root.innerHTML = blocks.map((b, i) => {
      const type = b.type || "text";
      const body = type === "text"
        ? `<div class="inline-editor" data-inline-editor data-block-field="text" contenteditable="true" spellcheck="true">${esc(b.text || "").replace(/\n/g, "<br>")}</div>`
        : type === "image"
          ? `<div class="block-media-selector">
              <div class="block-media-selected">${b.url ? `<img src="${esc(b.url)}" alt=""><span>${esc(mediaName({url:b.url}))}</span>` : `<span class="block-media-empty">Ninguna imagen seleccionada</span>`}</div>
              <button type="button" class="action" data-media-block-pick="image">🖼️ ELEGIR DE MEDIA MANAGER</button>
              <input data-block-field="alt" placeholder="Texto ALT" value="${esc(b.alt || "")}">
            </div>`
          : type === "gallery"
            ? `<div class="block-media-selector">
                <div class="block-gallery-selected">
                  ${(Array.isArray(b.urls) ? b.urls : []).map((u,ui) => `<div class="block-gallery-thumb"><img src="${esc(u)}" alt=""><button type="button" data-gallery-remove="${ui}" title="Quitar">×</button></div>`).join("") || `<span class="block-media-empty">No hay imágenes seleccionadas</span>`}
                </div>
                <button type="button" class="action" data-media-block-pick="gallery">🖼️ ELEGIR DE MEDIA MANAGER</button>
              </div>`
            : type === "video"
              ? `<input data-block-field="url" placeholder="URL de YouTube o video" value="${esc(b.url || "")}">`
              : type === "quote"
                ? `<div class="inline-editor quote-inline" data-inline-editor data-block-field="text" contenteditable="true">${esc(b.text || "").replace(/\n/g, "<br>")}</div><input data-block-field="author" placeholder="Autor" value="${esc(b.author || "")}">`
                : type === "table"
                  ? `<textarea data-block-field="rows" rows="5" placeholder="Fila por línea, columnas separadas por |">${esc((b.rows || []).map(r => r.join(" | ")).join("\n"))}</textarea>`
                  : type === "poll"
                    ? `<input data-block-field="question" placeholder="Pregunta" value="${esc(b.question || "")}"><textarea data-block-field="options" rows="4" placeholder="Una opción por línea">${esc((b.options || []).join("\n"))}</textarea>`
                    : `<div class="separator-preview"></div>`;

      return `<div class="article-block" draggable="true" data-index="${i}" data-type="${esc(type)}">
        <div class="article-block-head">
          <span class="block-drag" title="Arrastrar para mover">⠿</span>
          <strong>${blockLabel(type)}</strong>
          <div class="block-actions">
            <button type="button" class="action block-up" title="Subir">↑</button>
            <button type="button" class="action block-down" title="Bajar">↓</button>
            <button type="button" class="action danger block-remove" title="Eliminar">×</button>
          </div>
        </div>
        <div class="article-block-body">${body}</div>
      </div>`;
    }).join("");

    root.querySelectorAll(".article-block").forEach(card => {
      const i = Number(card.dataset.index);
      const b = blocks[i];

      card.querySelector("[data-media-block-pick=\"image\"]")?.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          await refreshMediaForPicker();
          openArticleBlockMediaPicker("single", (urls) => {
            b.url = urls[0] || "";
            render();
            sync();
          });
        } catch (error) {
          toast("Media Manager", error.message, "error");
        }
      });

      card.querySelector("[data-media-block-pick=\"gallery\"]")?.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          await refreshMediaForPicker();
          openArticleBlockMediaPicker("multiple", (urls) => {
            b.urls = urls;
            render();
            sync();
          }, Array.isArray(b.urls) ? b.urls : []);
        } catch (error) {
          toast("Media Manager", error.message, "error");
        }
      });

      card.querySelectorAll("[data-gallery-remove]").forEach(btn => {
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          const index = Number(btn.dataset.galleryRemove);
          if (!Number.isInteger(index)) return;
          b.urls = (Array.isArray(b.urls) ? b.urls : []).filter((_, ui) => ui !== index);
          render();
          sync();
        });
      });

      card.querySelectorAll("[data-block-field]").forEach(el => {
        el.addEventListener("input", () => {
          const f = el.dataset.blockField;
          if (el.matches("[data-inline-editor]")) b[f] = el.innerText.replace(/\u00a0/g, " ");
          else if (f === "urls" || f === "options") b[f] = el.value.split(/\n+/).map(x => x.trim()).filter(Boolean);
          else if (f === "rows") b.rows = el.value.split(/\n+/).map(row => row.split("|").map(x => x.trim()).filter(Boolean)).filter(r => r.length);
          else b[f] = el.value;
          sync();
        });
      });

      card.querySelector(".block-remove")?.addEventListener("click", () => { blocks.splice(i, 1); render(); sync(); });
      card.querySelector(".block-up")?.addEventListener("click", () => { if (i > 0) { [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; render(); sync(); }});
      card.querySelector(".block-down")?.addEventListener("click", () => { if (i < blocks.length - 1) { [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]]; render(); sync(); }});

      card.addEventListener("dragstart", event => {
        card.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(i));
      });
      card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
      card.addEventListener("dragover", event => { event.preventDefault(); card.classList.add("drag-over"); event.dataTransfer.dropEffect = "move"; });
      card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
      card.addEventListener("drop", event => {
        event.preventDefault();
        card.classList.remove("drag-over");
        const from = Number(event.dataTransfer.getData("text/plain"));
        const to = Number(card.dataset.index);
        if (!Number.isInteger(from) || from === to) return;
        const [moved] = blocks.splice(from, 1);
        blocks.splice(to, 0, moved);
        render();
        sync();
      });
    });

    sync();
  };

  $("#article-builder-toolbar")?.querySelectorAll("[data-add-block]").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.addBlock;
      blocks.push(type === "poll" ? { type, question: "", options: ["Opción A", "Opción B"] } : { type, ...(type === "gallery" ? { urls: [] } : {}) });
      render();
      sync();
      const cards = root.querySelectorAll(".article-block");
      cards[cards.length - 1]?.querySelector("[data-inline-editor]")?.focus();
    });
  });

  ["title", "excerpt", "imageUrl", "category", "content"].forEach(name => {
    form.elements[name]?.addEventListener("input", updatePreview);
    form.elements[name]?.addEventListener("change", updatePreview);
  });

  render();
}

function bindArticleReview() {
  $("#article-review")?.addEventListener("click", async () => {
    const form=$("#modal-form"); if(!form) return;
    const fd=new FormData(form); const result=await reviewArticle(fd);
    const issues=result.issues.map(x=>`<li class="check-bad">⚠️ ${esc(x)}</li>`).join("");
    const ok=result.ok.map(x=>`<li class="check-good">✅ ${esc(x)}</li>`).join("");
    openModal("Revisión antes de publicar", `<div class="prepublish-review"><strong>${result.score}/100</strong><ul>${issues}${ok}</ul><p class="form-help">La revisión es preventiva: no bloquea la publicación si decidís continuar.</p></div>`, async()=>{});
  });
}

async function reviewArticle(fd) {
  const issues=[], ok=[]; const title=value(fd,"title"), excerpt=value(fd,"excerpt"), seo=value(fd,"seoDescription"), alt=value(fd,"imageAlt"), image=value(fd,"imageUrl"), content=value(fd,"content"), blocks=parseContentBlocks(value(fd,"contentBlocks"));
  if(title.length<10) issues.push("El título es demasiado corto."); else ok.push("Título correcto.");
  if(!value(fd,"category")) issues.push("Falta categoría."); else ok.push("Categoría correcta.");
  if(!image) issues.push("La noticia no tiene imagen de portada."); else ok.push("Imagen de portada seleccionada.");
  if(image) { try { const r=await fetch(image,{method:"HEAD",cache:"no-store"}); if(!r.ok) issues.push("La imagen de portada no responde correctamente."); else ok.push("Imagen accesible."); } catch { issues.push("No se pudo comprobar la imagen."); } }
  if(image && !alt) issues.push("Falta el texto ALT de la imagen."); else if(image) ok.push("Texto ALT presente.");
  if(seo.length<80) issues.push("La descripción SEO es demasiado corta o está vacía."); else ok.push("Descripción SEO correcta.");
  if(!excerpt) issues.push("Falta bajada/copete."); else ok.push("Bajada/copete presente.");
  if(!content && !blocks.length) issues.push("No hay contenido en la noticia."); else ok.push("Contenido presente.");
  const text=[content,...blocks.map(b=>JSON.stringify(b))].join(" ");
  const urls=[...text.matchAll(/https?:\/\/[^\s"'<>]+/g)].map(m=>m[0].replace(/[),.;]+$/,""));
  for(const u of urls.slice(0,8)){try{const r=await fetch(u,{method:"HEAD",mode:"no-cors"}); if(r.type!=="opaque"&&!r.ok) issues.push(`Hay un enlace que no responde: ${u}`);}catch{issues.push(`No se pudo comprobar un enlace: ${u}`);}}
  const score=Math.max(0,Math.round(100-(issues.length*12)+(ok.length*2))); return {issues,ok,score};
}

function bindArticleMediaControls() {
  $("#article-upload-image")?.addEventListener("click", () => {
    $("#article-inline-upload")?.click();
  });

  $("#article-pick-image")?.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const button = event.currentTarget;
      if (button.dataset.busy === "1") return;
      button.dataset.busy = "1";

      try {
        // No dependemos del estado viejo: consultamos la biblioteca real
        // cada vez que se abre el selector.
        await refreshMediaForPicker();

        openMediaPicker((url) => {
          const input = $("#article-image-url");
          if (input) {
            input.value = url;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
          updateArticleImagePreview(url);
        });
      } catch (error) {
        toast("Media Manager", error.message, "error");
      } finally {
        button.dataset.busy = "0";
      }
    }
  );

  $("#article-inline-upload")?.addEventListener(
    "change",
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      try {
        const prepared =
          await optimizeImage(file);

        const data =
          await mediaApi(
            "upload",
            prepared
          );

        if (!data.media?.url) {
          throw new Error(
            "El servidor no devolvió la URL de la imagen."
          );
        }

        await loadMedia(false);

        const input =
          $("#article-image-url");

        if (input) {
          input.value =
            data.media.url;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }

        updateArticleImagePreview(
          data.media.url
        );

        renderMedia();

        toast(
          "Imagen subida",
          "La imagen quedó seleccionada para la noticia."
        );
      } catch (error) {
        toast(
          "Error al subir",
          error.message,
          "error"
        );
      }

      event.target.value = "";
    }
  );
}

/* =========================================================
   PARTIDOS
========================================================= */

function filteredFixtures() {
  const query =
    ($("#fixture-search")?.value || "")
      .trim()
      .toLowerCase();

  const competition =
    $("#fixture-competition-filter")?.value || "";

  return state.content.fixtures.filter(
    (fixture) => {
      const text = [
        fixture.home,
        fixture.away,
        fixture.team1,
        fixture.team2,
        fixture.local,
        fixture.visitante,
        fixture.competition,
        fixture.venue,
        fixture.channel
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || text.includes(query)) &&
        (!competition ||
          fixture.competition === competition)
      );
    }
  );
}

function renderFixtures() {
  const rows =
    filteredFixtures().sort(
      (a, b) =>
        String(a.date || "").localeCompare(
          String(b.date || "")
        ) ||
        String(a.time || "").localeCompare(
          String(b.time || "")
        )
    );

  $("#fixtures-table").innerHTML =
    rows
      .map(
        (fixture) => `
          <tr>
            <td class="title-cell">
              ${esc(getFixtureName(fixture))}
            </td>

            <td>
              ${esc(
                fixture.date ||
                fmt(fixture.datetime)
              )}
            </td>

            <td>
              ${esc(fixture.time || "—")}
            </td>

            <td>
              ${esc(
                fixture.competition || "—"
              )}
            </td>

            <td>
              <div class="actions">
                <button
                  class="action"
                  data-edit-fixture="${esc(
                    fixture.id ||
                    fixtureKey(fixture)
                  )}"
                >
                  EDITAR
                </button>

                <button
                  class="action"
                  data-delete-fixture="${esc(
                    fixture.id ||
                    fixtureKey(fixture)
                  )}"
                >
                  BORRAR
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join("") ||
    `<tr>
      <td colspan="5" class="muted">
        No hay partidos.
      </td>
    </tr>`;
}

function fixtureForm(fixture = {}) {
  return `
    <div class="form-grid">

      <label>
        Local
        <input
          name="home"
          required
          value="${esc(
            fixture.home ||
            fixture.team1 ||
            fixture.local ||
            ""
          )}"
        >
      </label>

      <label>
        Visitante
        <input
          name="away"
          required
          value="${esc(
            fixture.away ||
            fixture.team2 ||
            fixture.visitante ||
            ""
          )}"
        >
      </label>

      <label>
        Fecha
        <input
          type="date"
          name="date"
          required
          value="${esc(
            fixture.date || ""
          )}"
        >
      </label>

      <label>
        Hora
        <input
          type="time"
          name="time"
          value="${esc(
            fixture.time || ""
          )}"
        >
      </label>

      <label>
        Competición
        <select name="competition">
          ${[
            "Los Pumas",
            "Super Rugby",
            "URBA TOP 14"
          ]
            .map(
              (competition) =>
                `<option ${
                  fixture.competition === competition
                    ? "selected"
                    : ""
                }>${competition}</option>`
            )
            .join("")}
        </select>
      </label>

      <label>
        Canal
        <input
          name="channel"
          value="${esc(
            fixture.channel || ""
          )}"
          placeholder="ESPN / URBA Play / Disney+"
        >
      </label>

      <label class="full">
        Cancha / sede
        <input
          name="venue"
          value="${esc(
            fixture.venue || ""
          )}"
        >
      </label>

      <p class="form-help full">
        Los resultados NO se cargan acá. El marcador se administra
        exclusivamente desde "Resultados TOP 14".
      </p>

    </div>
  `;
}

function openFixture(fixture = {}) {
  const isExistingFixture =
    Boolean(
      fixture.id ||
      fixtureKey(fixture)
    );

  openModal(
    isExistingFixture
      ? "Editar partido"
      : "Nuevo partido",
    fixtureForm(fixture),
    async (fd) => {
      const fixtureData = {
        id:
          fixture.id ||
          undefined,

        home:
          value(fd, "home"),

        away:
          value(fd, "away"),

        date:
          value(fd, "date"),

        time:
          value(fd, "time"),

        competition:
          value(fd, "competition"),

        channel:
          value(fd, "channel"),

        venue:
          value(fd, "venue")
      };

      fixtureData.fixtureKey =
        fixtureKey(fixtureData);

      await api(
        "create-fixture",
        { fixture: fixtureData }
      );
    }
  );
}

/* =========================================================
   RESULTADOS
========================================================= */

function resultForFixture(fixture) {
  const key =
    fixture.id ||
    fixtureKey(fixture);

  return state.content.results.find(
    (result) =>
      String(
        result.fixtureId || ""
      ) === String(key) ||
      String(
        result.fixtureKey || ""
      ) === fixtureKey(fixture)
  );
}

function getPendingFixtures() {
  return state.content.fixtures
    .filter(isURBATop14)
    .filter(
      (fixture) =>
        !resultForFixture(fixture)
    )
    .sort(
      (a, b) =>
        String(a.date || "").localeCompare(
          String(b.date || "")
        )
    );
}

function renderResults() {
  const results = [...state.content.results]
    .filter((result) => String(result.competition || '').toUpperCase() === 'URBA TOP 14')
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const list = $('#results-list');
  if (list) {
    list.innerHTML = results.length ? `
      <div class="results-loaded">
        ${results.map((result, index) => `
          <article class="result-item" style="animation-delay:${Math.min(index * 35, 280)}ms">
            <div>
              <div class="result-match">
                <strong>${esc(result.home || 'Local')}</strong>
                <span class="score-pill">${esc(result.homeScore ?? '0')} — ${esc(result.awayScore ?? '0')}</span>
                <strong>${esc(result.away || 'Visitante')}</strong>
              </div>
              <div class="result-meta">
                <span>${esc(result.date || '—')}${result.time ? ` · ${esc(result.time)}` : ''}</span>
                <span>•</span>
                <span>Bonus: ${result.bonusTeam ? esc(result.bonusTeam) : 'ninguno'}</span>
              </div>
            </div>
            <div class="result-actions">
              <button class="action" data-edit-result="${esc(result.id)}">EDITAR</button>
              <button class="action danger" data-delete-result="${esc(result.id)}">BORRAR</button>
            </div>
          </article>
        `).join('')}
      </div>` : `
        <div class="results-empty">
          <strong>No hay resultados cargados</strong>
          <span>Los resultados que agregues aparecerán organizados acá.</span>
        </div>`;
  }

  renderStandingsTable();
  renderStandingsBaseEditor();

  const pending = getPendingFixtures();
  const pendingRoot = $('#results-pending');
  if (pendingRoot) {
    pendingRoot.innerHTML = pending.length ? `
      <div class="pending-header">
        <span>PARTIDOS SIN RESULTADO</span>
        <span>${pending.length} pendientes</span>
      </div>
      <div class="result-pending-list">
        ${pending.map((fixture, index) => `
          <article class="pending-result-item" style="animation-delay:${Math.min(index * 30, 240)}ms">
            <div>
              <div class="pending-match">${esc(getFixtureName(fixture))}</div>
              <span class="pending-date">${esc(fixture.date || '—')}${fixture.time ? ` · ${esc(fixture.time)}` : ''}</span>
            </div>
            <button class="action pending-load" data-add-result="${esc(fixture.id || fixtureKey(fixture))}">CARGAR RESULTADO</button>
          </article>
        `).join('')}
      </div>` : '';
  }
}

function calculateStandings() {
  const teams = new Map();
  const baseByTeam = new Map();

  (state.content.standingsBase || [])
    .forEach((base) => {
      const cleanName = normalizeTop14Team(base.team);
      if (!cleanName) return;

      baseByTeam.set(
        cleanName.toLowerCase(),
        {
          pj: Number(base.pj) || 0,
          pg: Number(base.pg) || 0,
          pe: Number(base.pe) || 0,
          pp: Number(base.pp) || 0,
          diff: Number(base.diff) || 0,
          pts: Number(base.pts) || 0
        }
      );
    });

  const ensureTeam = (name) => {
    const clean = normalizeTop14Team(name);
    if (!clean || !isOfficialTop14Team(clean)) return null;

    const key = clean.toLowerCase();

    if (!teams.has(key)) {
      const base =
        baseByTeam.get(key);

      teams.set(key, {
        team: clean,
        pj: base ? base.pj : 0,
        pg: base ? base.pg : 0,
        pe: base ? base.pe : 0,
        pp: base ? base.pp : 0,
        pf: 0,
        pc: 0,
        baseDiff: base ? base.diff : 0,
        diff: 0,
        bonus: 0,
        pts: base ? base.pts : 0
      });
    }

    return teams.get(key);
  };

  (state.content.standingsBase || [])
    .forEach((base) =>
      ensureTeam(base.team)
    );

  state.content.fixtures
    .filter(isURBATop14)
    .forEach((fixture) => {
      ensureTeam(
        fixture.home ||
        fixture.team1 ||
        fixture.local
      );

      ensureTeam(
        fixture.away ||
        fixture.team2 ||
        fixture.visitante
      );
    });

  state.content.results
    .filter(
      (result) =>
        String(
          result.competition || ""
        ).toUpperCase() ===
        "URBA TOP 14"
    )
    .forEach((result) => {
      const home =
        ensureTeam(result.home);

      const away =
        ensureTeam(result.away);

      if (!home || !away) return;

      const hs =
        Number(result.homeScore);

      const as =
        Number(result.awayScore);

      if (
        !Number.isFinite(hs) ||
        !Number.isFinite(as)
      ) {
        return;
      }

      home.pj++;
      away.pj++;

      home.pf += hs;
      home.pc += as;

      away.pf += as;
      away.pc += hs;

      if (hs > as) {
        home.pg++;
        away.pp++;
        home.pts += 4;
      } else if (hs < as) {
        away.pg++;
        home.pp++;
        away.pts += 4;
      } else {
        home.pe++;
        away.pe++;
        home.pts += 2;
        away.pts += 2;
      }

      const bonus = normalizeTop14Team(result.bonusTeam || "").toLowerCase();

      if (
        bonus &&
        bonus ===
          home.team.toLowerCase()
      ) {
        home.bonus++;
        home.pts++;
      }

      if (
        bonus &&
        bonus ===
          away.team.toLowerCase()
      ) {
        away.bonus++;
        away.pts++;
      }
    });

  return [...teams.values()]
    .map((team) => ({
      ...team,
      diff:
        (team.baseDiff || 0) +
        (team.pf - team.pc)
    }))
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.diff - a.diff ||
        b.pf - a.pf ||
        a.team.localeCompare(b.team)
    );
}

function renderStandingsTable() {
  const standings =
    calculateStandings();

  $("#results-standings-table").innerHTML =
    standings
      .map(
        (team, index) => `
          <tr>
            <td>
              <strong>${index + 1}</strong>
            </td>

            <td>
              <strong>${esc(team.team)}</strong>
            </td>

            <td>${team.pj}</td>
            <td>${team.pg}</td>
            <td>${team.pe}</td>
            <td>${team.pp}</td>
            <td>${team.pf}</td>
            <td>${team.pc}</td>

            <td>
              ${
                team.diff > 0
                  ? "+"
                  : ""
              }${team.diff}
            </td>

            <td>${team.bonus}</td>

            <td>
              <strong>${team.pts}</strong>
            </td>
          </tr>
        `
      )
      .join("") ||
    `<tr>
      <td colspan="11" class="muted">
        No hay equipos de URBA TOP 14.
      </td>
    </tr>`;
}

function renderStandingsBaseEditor() {
  const tbody =
    $("#standings-base-table");

  if (!tbody) return;

  const rows =
    state.content.standingsBase?.length
      ? state.content.standingsBase
      : [
          {
            team: "",
            pj: 0,
            pg: 0,
            pe: 0,
            pp: 0,
            diff: 0,
            pts: 0
          }
        ];

  tbody.innerHTML =
    rows
      .map(
        (row, i) => `
          <tr data-row="${i}">
            <td>
              <input
                type="text"
                class="sb-team"
                value="${esc(row.team ?? "")}"
                placeholder="Nombre del equipo"
              >
            </td>

            <td>
              <input
                type="number"
                class="sb-pj"
                value="${Number(row.pj) || 0}"
                style="width:56px;"
              >
            </td>

            <td>
              <input
                type="number"
                class="sb-pg"
                value="${Number(row.pg) || 0}"
                style="width:56px;"
              >
            </td>

            <td>
              <input
                type="number"
                class="sb-pe"
                value="${Number(row.pe) || 0}"
                style="width:56px;"
              >
            </td>

            <td>
              <input
                type="number"
                class="sb-pp"
                value="${Number(row.pp) || 0}"
                style="width:56px;"
              >
            </td>

            <td>
              <input
                type="number"
                class="sb-diff"
                value="${Number(row.diff) || 0}"
                style="width:64px;"
              >
            </td>

            <td>
              <input
                type="number"
                class="sb-pts"
                value="${Number(row.pts) || 0}"
                style="width:64px;"
              >
            </td>

            <td>
              <button
                class="action sb-remove"
                data-remove="${i}"
              >
                ✕
              </button>
            </td>
          </tr>
        `
      )
      .join("");

  tbody
    .querySelectorAll(".sb-remove")
    .forEach((btn) => {
      btn.addEventListener(
        "click",
        () => {
          const rows =
            readStandingsBaseFromForm();

          const idx =
            Number(btn.dataset.remove);

          rows.splice(idx, 1);

          state.content.standingsBase =
            rows;

          renderStandingsBaseEditor();
        }
      );
    });
}

function readStandingsBaseFromForm() {
  return $$("#standings-base-table tr")
    .map((tr) => ({
      team:
        tr.querySelector(".sb-team")
          ?.value.trim() || "",

      pj:
        Number(
          tr.querySelector(".sb-pj")
            ?.value
        ) || 0,

      pg:
        Number(
          tr.querySelector(".sb-pg")
            ?.value
        ) || 0,

      pe:
        Number(
          tr.querySelector(".sb-pe")
            ?.value
        ) || 0,

      pp:
        Number(
          tr.querySelector(".sb-pp")
            ?.value
        ) || 0,

      diff:
        Number(
          tr.querySelector(".sb-diff")
            ?.value
        ) || 0,

      pts:
        Number(
          tr.querySelector(".sb-pts")
            ?.value
        ) || 0
    }));
}

$("#standings-base-add-row")
  ?.addEventListener(
    "click",
    () => {
      const rows =
        readStandingsBaseFromForm();

      rows.push({
        team: "",
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        diff: 0,
        pts: 0
      });

      state.content.standingsBase =
        rows;

      renderStandingsBaseEditor();
    }
  );

$("#standings-base-save")
  ?.addEventListener(
    "click",
    async () => {
      const rows =
        readStandingsBaseFromForm()
          .filter(
            (row) => row.team
          );

      try {
        const data =
          await api(
            "save-standings-base",
            {
              standingsBase: rows
            }
          );

        state.content.standingsBase =
          data.standingsBase ||
          rows;

        state.content.standings =
          data.standings ||
          state.content.standings;

        renderStandingsBaseEditor();
        renderStandingsTable();

        toast(
          "Guardado",
          "Tabla base actualizada."
        );
      } catch (error) {
        toast(
          "Error",
          error.message,
          "error"
        );
      }
    }
  );

/* =========================================================
   MODALES
========================================================= */

function closeModal() {
  $("#modal-root").innerHTML = "";
}

function openModal(
  title,
  html,
  onSubmit
) {
  const root =
    $("#modal-root");

  root.innerHTML = `
    <div class="modal-back ${/noticia/i.test(title) ? "article-modal-back" : ""}">
      <div class="modal ${/noticia/i.test(title) ? "article-modal" : ""}">

        <div class="modal-head">
          <h2>${esc(title)}</h2>

          <button
            type="button"
            class="modal-close"
          >
            ×
          </button>
        </div>

        <form id="modal-form">

          <div class="modal-body">
            ${html}
          </div>

          <div class="modal-actions">

            <button
              type="button"
              class="action modal-cancel"
            >
              CANCELAR
            </button>

            <button
              class="btn primary"
              type="submit"
            >
              GUARDAR
            </button>

          </div>
        </form>

      </div>
    </div>
  `;

  root.querySelector(
    ".modal-close"
  ).onclick =
    closeModal;

  root.querySelector(
    ".modal-cancel"
  ).onclick =
    closeModal;

  root.querySelector(
    ".modal-back"
  ).addEventListener(
    "click",
    (event) => {
      if (
        event.target.classList.contains(
          "modal-back"
        )
      ) {
        closeModal();
      }
    }
  );

  root.querySelector(
    "#modal-form"
  ).onsubmit =
    async (event) => {
      event.preventDefault();

      const button =
        event.submitter;

      button.disabled = true;

      try {
        await onSubmit(
          new FormData(
            event.target
          )
        );

        closeModal();

        await getContent();

        toast(
          "Guardado",
          "Los cambios fueron guardados."
        );
      } catch (error) {
        toast(
          "Error",
          error.message,
          "error"
        );

        button.disabled = false;
      }
    };
}

function value(fd, key) {
  return String(
    fd.get(key) || ""
  ).trim();
}

function checked(fd, key) {
  return fd.get(key) === "on";
}

/* =========================================================
   RESULTADO FORM
========================================================= */

function getFixtureByReference(
  reference
) {
  return state.content.fixtures.find(
    (fixture) => {
      const id =
        String(fixture.id || "");

      const key =
        fixtureKey(fixture);

      return (
        id === String(reference) ||
        key === String(reference)
      );
    }
  );
}

function resultForm(
  existing = {},
  selectedFixture = null
) {
  const usedFixtureKeys =
    new Set(
      state.content.results
        .filter(
          (result) =>
            !existing.id ||
            String(result.id) !==
              String(existing.id)
        )
        .map(
          (result) =>
            String(
              result.fixtureId ||
              result.fixtureKey ||
              ""
            )
        )
    );

  const fixtures =
    state.content.fixtures
      .filter(isURBATop14)
      .filter((fixture) => {
        const key =
          String(
            fixture.id ||
            fixtureKey(fixture)
          );

        return (
          !usedFixtureKeys.has(key) ||
          (
            selectedFixture &&
            key ===
              String(
                selectedFixture.id ||
                fixtureKey(
                  selectedFixture
                )
              )
          )
        );
      })
      .sort(
        (a, b) =>
          String(a.date || "").localeCompare(
            String(b.date || "")
          )
      );

  if (
    !fixtures.length &&
    !existing.id
  ) {
    return `
      <div class="empty-state">
        No hay partidos de URBA TOP 14 disponibles
        para cargar un resultado.
        Primero creá el partido desde "Partidos".
      </div>
    `;
  }

  const currentFixture =
    selectedFixture ||
    getFixtureByReference(
      existing.fixtureId ||
      existing.fixtureKey ||
      ""
    );

  const selectedValue =
    currentFixture
      ? String(
          currentFixture.id ||
          fixtureKey(currentFixture)
        )
      : "";

  return `
    <div class="form-grid">

      <label class="full">
        Partido

        <select
          name="fixtureRef"
          required
        >
          <option value="">
            Seleccioná un partido...
          </option>

          ${fixtures
            .map(
              (fixture) => {
                const key =
                  String(
                    fixture.id ||
                    fixtureKey(fixture)
                  );

                return `
                  <option
                    value="${esc(key)}"
                    ${
                      key === selectedValue
                        ? "selected"
                        : ""
                    }
                  >
                    ${esc(
                      getFixtureName(
                        fixture
                      )
                    )}
                    — ${esc(
                      fixture.date || ""
                    )}
                    ${
                      fixture.time
                        ? ` · ${esc(
                            fixture.time
                          )}`
                        : ""
                    }
                  </option>
                `;
              }
            )
            .join("")}
        </select>
      </label>

      <label>
        ${esc(
          currentFixture?.home ||
          "Local"
        )}

        <input
          type="number"
          name="homeScore"
          min="0"
          step="1"
          required
          value="${esc(
            existing.homeScore ?? ""
          )}"
        >
      </label>

      <label>
        ${esc(
          currentFixture?.away ||
          "Visitante"
        )}

        <input
          type="number"
          name="awayScore"
          min="0"
          step="1"
          required
          value="${esc(
            existing.awayScore ?? ""
          )}"
        >
      </label>

      <label class="full">
        Punto bonus

        <select name="bonusTeam">

          <option
            value=""
            ${
              !existing.bonusTeam
                ? "selected"
                : ""
            }
          >
            Ninguno
          </option>

          <option
            value="${esc(
              currentFixture?.home || ""
            )}"
            ${
              existing.bonusTeam ===
              currentFixture?.home
                ? "selected"
                : ""
            }
          >
            ${esc(
              currentFixture?.home ||
              "Local"
            )}
          </option>

          <option
            value="${esc(
              currentFixture?.away || ""
            )}"
            ${
              existing.bonusTeam ===
              currentFixture?.away
                ? "selected"
                : ""
            }
          >
            ${esc(
              currentFixture?.away ||
              "Visitante"
            )}
          </option>

        </select>
      </label>

      <p class="form-help full">
        Victoria = 4 puntos · Empate = 2 puntos ·
        Derrota = 0 puntos · Punto bonus = +1 punto.
      </p>

    </div>
  `;
}

function openResult(
  existing = {},
  fixture = null
) {
  const target =
    fixture ||
    getFixtureByReference(
      existing.fixtureId ||
      existing.fixtureKey ||
      ""
    );

  openModal(
    existing.id
      ? "Editar resultado"
      : "Cargar resultado",

    resultForm(
      existing,
      target
    ),

    async (fd) => {
      const fixtureRef =
        value(
          fd,
          "fixtureRef"
        );

      const selected =
        getFixtureByReference(
          fixtureRef
        );

      if (!selected) {
        throw new Error(
          "Seleccioná un partido válido."
        );
      }

      const homeScore =
        Number(
          value(
            fd,
            "homeScore"
          )
        );

      const awayScore =
        Number(
          value(
            fd,
            "awayScore"
          )
        );

      if (
        !Number.isInteger(homeScore) ||
        homeScore < 0 ||
        !Number.isInteger(awayScore) ||
        awayScore < 0
      ) {
        throw new Error(
          "Los resultados deben ser números enteros mayores o iguales a 0."
        );
      }

      const result = {
        id:
          existing.id ||
          undefined,

        fixtureId:
          selected.id ||
          fixtureKey(selected),

        fixtureKey:
          fixtureKey(selected),

        date:
          selected.date || "",

        time:
          selected.time || "",

        competition:
          "URBA TOP 14",

        home:
          selected.home ||
          selected.team1 ||
          selected.local ||
          "",

        away:
          selected.away ||
          selected.team2 ||
          selected.visitante ||
          "",

        homeScore,

        awayScore,

        bonusTeam:
          value(
            fd,
            "bonusTeam"
          ) || null
      };

      await api(
        "save-result",
        { result }
      );
    }
  );
}

/* =========================================================
   BORRADO / CONFIRMACIÓN INTERNA
========================================================= */

function askConfirm(title, message, confirmLabel = "ELIMINAR") {
  return new Promise(resolve => {
    const root = $("#modal-root");
    root.innerHTML = `
      <div class="modal-back confirm-back">
        <div class="confirm-modal" role="dialog" aria-modal="true">
          <div class="confirm-icon">!</div>
          <div class="confirm-copy">
            <span class="section-eyebrow">CONFIRMACIÓN</span>
            <h2>${esc(title)}</h2>
            <p>${esc(message)}</p>
          </div>
          <div class="confirm-actions">
            <button type="button" class="action confirm-cancel">CANCELAR</button>
            <button type="button" class="action danger confirm-ok">${esc(confirmLabel)}</button>
          </div>
        </div>
      </div>`;
    const finish = value => { root.innerHTML = ""; resolve(value); };
    root.querySelector(".confirm-cancel")?.addEventListener("click", () => finish(false));
    root.querySelector(".confirm-ok")?.addEventListener("click", () => finish(true));
    root.querySelector(".confirm-back")?.addEventListener("click", e => { if (e.target === e.currentTarget) finish(false); });
  });
}

async function deleteItem(action, itemId) {
  if (!(await askConfirm("¿Borrar este elemento?", "Esta acción no se puede deshacer.", "BORRAR"))) return;

  try {
    await api(
      action,
      { id: itemId }
    );

    await getContent();

    toast(
      "Eliminado",
      "El elemento fue eliminado."
    );
  } catch (error) {
    toast(
      "Error",
      error.message,
      "error"
    );
  }
}

/* =========================================================
   MEDIA MANAGER
========================================================= */

async function mediaApi(
  action,
  body = {}
) {
  const response =
    await fetch(
      "/api/media",
      {
        method:
          action === "list"
            ? "GET"
            : "POST",

        credentials:
          "include",

        headers:
          action === "list"
            ? {}
            : {
                "Content-Type":
                  "application/json"
              },

        body:
          action === "list"
            ? undefined
            : JSON.stringify({
                action,
                ...body
              })
      }
    );

  let data = {};

  try {
    data =
      await response.json();
  } catch {
    throw new Error(
      "Respuesta inválida del servidor."
    );
  }

  if (
    !response.ok ||
    data.ok === false
  ) {
    throw new Error(
      data.error ||
      "Error en Media Manager"
    );
  }

  return data;
}

async function loadMedia(
  showToast = false
) {
  try {
    const data =
      await mediaApi("list");

    state.media =
      Array.isArray(data.media)
        ? data.media
        : [];

    await loadClubs();

    renderMedia();
    renderClubLogos();
    renderNationLogos();

    if (showToast) {
      toast(
        "Media actualizado",
        `${state.media.length} imágenes disponibles.`
      );
    }
  } catch (error) {
    toast(
      "Media Manager",
      error.message,
      "error"
    );
  }
}

function mediaName(item) {
  return String(
    item.pathname ||
    item.url ||
    ""
  )
    .split("/")
    .pop() ||
    "imagen";
}

function renderMedia() {
  const grid = $("#media-grid");
  if (!grid) return;

  const q = String($("#media-search")?.value || "").trim().toLowerCase();
  const type = String($("#media-type-filter")?.value || "");
  const sort = String($("#media-sort")?.value || "newest");

  const items = state.media
    .filter((item) => {
      const name = mediaName(item).toLowerCase();
      return (!q || name.includes(q)) &&
        (!type || item.contentType === type);
    })
    .sort((a, b) => {
      if (sort === "name") return mediaName(a).localeCompare(mediaName(b), "es");
      if (sort === "oldest") return String(a.uploadedAt || "").localeCompare(String(b.uploadedAt || ""));
      if (sort === "size") return (Number(b.size) || 0) - (Number(a.size) || 0);
      return String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || ""));
    });

  const formatName = (type) => ({
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/gif": "GIF",
    "image/svg+xml": "SVG"
  }[type] || "IMG");

  const formatBytes = (bytes) => {
    const n = Number(bytes) || 0;
    if (!n) return "—";
    if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.round(n / 1024)} KB`;
  };

  grid.innerHTML = items.map((item) => `
    <article class="media-card">
      <button type="button" class="media-thumb" data-media-preview="${esc(item.url)}" title="Ver imagen">
        <span class="media-format">${formatName(item.contentType)}</span>
        <img src="${esc(item.url)}" alt="${esc(mediaName(item))}" loading="lazy">
      </button>
      <div class="media-info">
        <strong title="${esc(mediaName(item))}">${esc(mediaName(item))}</strong>
        <small>${formatBytes(item.size)} · ${esc(item.contentType || "imagen")}</small>
      </div>
      <div class="media-actions">
        <button class="action" data-media-use="${esc(item.url)}">USAR</button>
        <button class="action" data-media-copy="${esc(item.url)}">COPIAR</button>
        <button class="action danger" data-media-delete="${esc(item.url)}">ELIMINAR</button>
      </div>
    </article>
  `).join("") || `
    <div class="media-empty">
      <strong>${q || type ? "No encontramos imágenes" : "Tu biblioteca está vacía"}</strong>
      <span>${q || type ? "Probá con otro filtro o término de búsqueda." : "Arrastrá imágenes al área superior para empezar."}</span>
    </div>
  `;

  const total = state.media.length;
  const webp = state.media.filter((item) => item.contentType === "image/webp").length;
  const bytes = state.media.reduce((sum, item) => sum + (Number(item.size) || 0), 0);

  if ($("#nav-media-count")) $("#nav-media-count").textContent = total;
  if ($("#media-stat-total")) $("#media-stat-total").textContent = total;
  if ($("#media-stat-webp")) $("#media-stat-webp").textContent = webp;
  if ($("#media-stat-size")) $("#media-stat-size").textContent = formatBytes(bytes);
  if ($("#media-results-label")) {
    $("#media-results-label").textContent = `${items.length} ${items.length === 1 ? "archivo" : "archivos"}`;
  }
}

function openMediaPreview(url) {
  openModal(
    "Vista previa",
    `<div class="media-preview-modal"><img src="${esc(url)}" alt="Vista previa"><button type="button" class="action" data-media-preview-copy="${esc(url)}">COPIAR URL</button></div>`,
    async () => {}
  );
  $("#modal-root")?.querySelector("[data-media-preview-copy]")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("URL copiada", "La dirección quedó en el portapapeles.");
    } catch {
      toast("Error", "No se pudo copiar la URL.", "error");
    }
  });
}

/* =========================================================
   CLUBES
========================================================= */

async function loadClubs() {
  if (
    Object.keys(state.clubs).length &&
    Object.keys(state.nations).length
  ) {
    return state.clubs;
  }

  try {
    const response =
      await fetch(
        "/data/teams.json",
        {
          cache: "no-store"
        }
      );

    const data =
      await response.json();

    state.clubs =
      data?.clubs || {};

    state.nations =
      data?.nations || {};
  } catch {
    state.clubs = {};
    state.nations = {};
  }

  renderClubLogos();
  renderNationLogos();

  return state.clubs;
}

function logoFilterValue(inputId, statusId) {
  const q = String($(inputId)?.value || "").trim().toLowerCase();
  const status = String($(statusId)?.value || "all");
  return { q, status };
}

function renderLogoCard({ id, name, meta, current, kind }) {
  const hasLogo = Boolean(current);
  const actionAttr = kind === "club" ? `data-club-pick="${esc(id)}"` : `data-nation-pick="${esc(id)}"`;
  const clearAttr = kind === "club" ? `data-club-clear="${esc(id)}"` : `data-nation-clear="${esc(id)}"`;
  return `
    <article class="logo-card ${hasLogo ? "has-logo" : "missing-logo"}">
      <div class="logo-card-visual">
        ${hasLogo ? `<img src="${esc(current)}" alt="${esc(name)}" loading="lazy">` : `<span class="logo-placeholder">${esc(name.slice(0,1).toUpperCase())}</span>`}
        <span class="logo-status ${hasLogo ? "ok" : "missing"}">${hasLogo ? "ASIGNADO" : "SIN ESCUDO"}</span>
      </div>
      <div class="logo-card-body">
        <div class="logo-card-title">
          <strong>${esc(name)}</strong>
          <small>${esc(meta || id)}</small>
        </div>
        <div class="logo-card-actions">
          <button class="action logo-main-action" ${actionAttr}>${hasLogo ? "CAMBIAR" : "ELEGIR"}</button>
          ${hasLogo ? `<button class="action logo-clear-action" ${clearAttr}>QUITAR</button>` : ""}
        </div>
      </div>
    </article>`;
}

function getLogoFilterData(kind) {
  const isNation = kind === "nation";
  const collection = isNation ? state.nations : state.clubs;
  const settings = isNation
    ? (state.content.settings?.nationLogos || {})
    : (state.content.settings?.clubLogos || {});
  const search = String($(isNation ? "#nation-logo-search" : "#club-logo-search")?.value || "").trim().toLowerCase();
  const filter = String($(isNation ? "#nation-logo-filter" : "#club-logo-filter")?.value || "");

  return Object.entries(collection || {})
    .map(([id, item]) => {
      const current = settings[id] || item.logo || "";
      const label = `${item.name || ""} ${item.shortName || ""} ${id}`.toLowerCase();
      return { id, item, current, assigned: Boolean(current), label };
    })
    .filter(row => !search || row.label.includes(search))
    .filter(row => !filter || (filter === "assigned" ? row.assigned : !row.assigned))
    .sort((a, b) => String(a.item.name || "").localeCompare(String(b.item.name || ""), "es"));
}

function renderLogoRows(kind) {
  const isNation = kind === "nation";
  const root = $(isNation ? "#nation-logo-grid" : "#club-logo-grid");
  if (!root) return;

  const rows = getLogoFilterData(kind);
  const collection = isNation ? state.nations : state.clubs;
  const allRows = Object.entries(collection || {}).map(([id, item]) => {
    const settings = isNation ? (state.content.settings?.nationLogos || {}) : (state.content.settings?.clubLogos || {});
    return Boolean(settings[id] || item.logo || "");
  });
  const assigned = allRows.filter(Boolean).length;

  const countEl = $(isNation ? "#nation-logo-count" : "#club-logo-count");
  const summaryEl = $(isNation ? "#nation-logo-summary" : "#club-logo-summary");
  if (countEl) countEl.textContent = `${rows.length} ${isNation ? "selecciones" : "clubes"}`;
  if (summaryEl) summaryEl.textContent = `${assigned}/${allRows.length}`;

  root.innerHTML = rows.map(({ id, item, current }) => `
    <div class="club-logo-row">
      <div class="club-logo-preview">
        ${current ? `<img src="${esc(current)}" alt="${esc(item.name || id)}" loading="lazy">` : `<span>—</span>`}
      </div>
      <div class="club-logo-name">
        <strong>${esc(item.name || id)}</strong>
        <small>${esc(item.shortName || id)}</small>
        <span class="logo-status ${current ? "has" : "none"}">${current ? "Con escudo" : "Sin escudo"}</span>
      </div>
      <button class="action" data-${isNation ? "nation" : "club"}-pick="${esc(id)}">${current ? "CAMBIAR" : "ELEGIR"}</button>
      ${current ? `<button class="action danger" data-${isNation ? "nation" : "club"}-clear="${esc(id)}">QUITAR</button>` : `<span></span>`}
    </div>
  `).join("") || `<div class="empty-state"><strong>No hay resultados</strong><span>Probá con otro término o filtro.</span></div>`;
}

function renderClubLogos() {
  renderLogoRows("club");
}

function renderNationLogos() {
  renderLogoRows("nation");
}

async function assignClubLogo(
  id,
  url
) {
  const current = {
    ...(state.content.settings
      ?.clubLogos || {})
  };

  if (url) {
    current[id] = url;
  } else {
    delete current[id];
  }

  const data =
    await api(
      "update-club-logo",
      {
        clubId: id,
        url: url || ""
      }
    );

  state.content =
    normalizeContent(
      data.content ||
      state.content
    );

  renderClubLogos();

  toast(
    "Escudo actualizado",
    "El cambio ya queda guardado para todo el sitio."
  );
}

async function assignNationLogo(
  id,
  url
) {
  const current = {
    ...(state.content.settings
      ?.nationLogos || {})
  };

  if (url) {
    current[id] = url;
  } else {
    delete current[id];
  }

  const data =
    await api(
      "update-nation-logo",
      {
        nationId: id,
        url: url || ""
      }
    );

  state.content =
    normalizeContent(
      data.content ||
      state.content
    );

  renderNationLogos();

  toast(
    "Escudo actualizado",
    "El cambio ya queda guardado para todo el sitio."
  );
}

/* =========================================================
   SUBIDA DE IMÁGENES
========================================================= */

function dataUrlToPayload(
  dataUrl
) {
  const match =
    String(dataUrl).match(
      /^data:([^;]+);base64,(.+)$/
    );

  if (!match) {
    throw new Error(
      "No se pudo preparar la imagen."
    );
  }

  return {
    contentType:
      match[1],

    base64:
      match[2]
  };
}

function optimizeImage(file) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onerror = () =>
        reject(
          new Error(
            "No se pudo leer la imagen."
          )
        );

      reader.onload = () => {
        if (
          file.type ===
          "image/svg+xml"
        ) {
          const clean =
            file.name
              .replace(
                /\.[^.]+$/,
                ""
              )
              .replace(
                /[^a-zA-Z0-9_-]+/g,
                "-"
              )
              .slice(0, 70) ||
            "imagen";

          const payload =
            dataUrlToPayload(
              reader.result
            );

          const bytes =
            Math.ceil(
              payload.base64.length *
              3 /
              4
            );

          if (
            bytes >
            2 * 1024 * 1024
          ) {
            return reject(
              new Error(
                "El SVG supera 2 MB."
              )
            );
          }

          return resolve({
            ...payload,
            filename:
              `${clean}.svg`
          });
        }

        const img =
          new Image();

        img.onerror = () =>
          reject(
            new Error(
              "La imagen no es válida o no se pudo procesar."
            )
          );

        img.onload = () => {
          const TARGET =
            2 * 1024 * 1024;

          let scale =
            Math.min(
              1,
              1600 /
                Math.max(
                  img.naturalWidth ||
                    1,
                  img.naturalHeight ||
                    1
                )
            );

          const clean =
            file.name
              .replace(
                /\.[^.]+$/,
                ""
              )
              .replace(
                /[^a-zA-Z0-9_-]+/g,
                "-"
              )
              .slice(0, 70) ||
            "imagen";

          try {
            let result;

            for (
              let attempt = 0;
              attempt < 8;
              attempt++
            ) {
              const canvas =
                document.createElement(
                  "canvas"
                );

              canvas.width =
                Math.max(
                  1,
                  Math.round(
                    (img.naturalWidth ||
                      1) *
                    scale
                  )
                );

              canvas.height =
                Math.max(
                  1,
                  Math.round(
                    (img.naturalHeight ||
                      1) *
                    scale
                  )
                );

              const ctx =
                canvas.getContext(
                  "2d",
                  {
                    alpha: true
                  }
                );

              if (!ctx) {
                throw new Error(
                  "No se pudo preparar la imagen."
                );
              }

              ctx.drawImage(
                img,
                0,
                0,
                canvas.width,
                canvas.height
              );

              let quality =
                0.82;

              let dataUrl =
                canvas.toDataURL(
                  "image/webp",
                  quality
                );

              let payload =
                dataUrlToPayload(
                  dataUrl
                );

              let bytes =
                Math.ceil(
                  payload.base64
                    .length *
                    3 /
                    4
                );

              while (
                bytes > TARGET &&
                quality > 0.45
              ) {
                quality -= 0.08;

                dataUrl =
                  canvas.toDataURL(
                    "image/webp",
                    quality
                  );

                payload =
                  dataUrlToPayload(
                    dataUrl
                  );

                bytes =
                  Math.ceil(
                    payload.base64
                      .length *
                    3 /
                    4
                  );
              }

              result =
                payload;

              if (
                bytes <= TARGET
              ) {
                break;
              }

              scale *= 0.78;
            }

            const bytes =
              Math.ceil(
                result.base64.length *
                3 /
                4
              );

            if (
              bytes > TARGET
            ) {
              return reject(
                new Error(
                  "La imagen sigue siendo demasiado pesada."
                )
              );
            }

            resolve({
              ...result,
              contentType:
                "image/webp",
              filename:
                `${clean}.webp`
            });
          } catch (error) {
            reject(error);
          }
        };

        img.src =
          reader.result;
      };

      reader.readAsDataURL(file);
    }
  );
}

async function uploadMediaFiles(
  files
) {
  const filesToUpload =
    [...files];

  if (
    !filesToUpload.length
  ) {
    return;
  }

  let uploaded = 0;

  for (
    const file of filesToUpload
  ) {
    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      toast(
        "Archivo omitido",
        `${file.name} no es una imagen.`,
        "error"
      );

      continue;
    }

    try {
      toast(
        "Preparando imagen",
        file.name
      );

      const prepared =
        await optimizeImage(
          file
        );

      const data =
        await mediaApi(
          "upload",
          prepared
        );

      if (
        !data.media?.url
      ) {
        throw new Error(
          "El servidor no devolvió la URL de la imagen."
        );
      }

      uploaded++;

      toast(
        "Imagen guardada",
        file.name
      );
    } catch (error) {
      toast(
        "Error al guardar",
        `${file.name}: ${error.message}`,
        "error"
      );
    }
  }

  await loadMedia(false);

  if (uploaded) {
    toast(
      "Media actualizado",
      `${uploaded} imagen${
        uploaded === 1
          ? ""
          : "es"
      } guardada${
        uploaded === 1
          ? ""
          : "s"
      } correctamente.`
    );
  }
}

/* =========================================================
   SELECTOR DE IMÁGENES
========================================================= */

function getMediaItemUrl(item) {
  return String(
    item?.url ||
    item?.publicUrl ||
    item?.publicURL ||
    item?.src ||
    item?.pathname ||
    ""
  ).trim();
}

async function refreshMediaForPicker() {
  const data = await mediaApi("list");
  state.media = Array.isArray(data.media) ? data.media : [];
  return state.media;
}


function openArticleBlockMediaPicker(mode = "single", callback, selected = []) {
  const items = Array.isArray(state.media) ? [...state.media] : [];
  const initial = new Set((selected || []).map(String));
  const overlay = document.createElement("div");
  overlay.className = "modal-back media-picker-back";
  overlay.innerHTML = `
    <div class="modal media-picker-modal article-block-media-picker" role="dialog" aria-modal="true" aria-label="Elegir imágenes del Media Manager">
      <div class="modal-head">
        <div>
          <span class="section-eyebrow">MEDIA MANAGER</span>
          <h2>${mode === "multiple" ? "Elegir imágenes para la galería" : "Elegir imagen"}</h2>
        </div>
        <button type="button" class="modal-close picker-close" aria-label="Cerrar">×</button>
      </div>
      <div class="modal-body">
        <div class="block-picker-tools">
          <input type="search" class="block-picker-search" placeholder="Buscar imagen..." autocomplete="off">
          <span class="block-picker-count"></span>
        </div>
        <p class="media-picker-help">${mode === "multiple" ? "Seleccioná varias imágenes. Después hacé clic en AGREGAR A GALERÍA." : "Elegí una imagen ya cargada para insertarla en este bloque."}</p>
        <div class="media-picker-grid block-picker-grid"></div>
      </div>
      ${mode === "multiple" ? `<div class="modal-foot block-picker-foot"><span class="block-picker-selected-count">0 seleccionadas</span><button type="button" class="action primary block-picker-confirm">AGREGAR A GALERÍA</button></div>` : ""}
    </div>
  `;
  document.body.appendChild(overlay);

  const grid = overlay.querySelector(".block-picker-grid");
  const search = overlay.querySelector(".block-picker-search");
  const count = overlay.querySelector(".block-picker-count");
  const selectedCount = overlay.querySelector(".block-picker-selected-count");
  const selectedUrls = new Set(initial);

  const renderItems = () => {
    const q = String(search?.value || "").trim().toLowerCase();
    const filtered = items.filter(item => {
      const name = mediaName(item).toLowerCase();
      return !q || name.includes(q);
    });
    if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? "imagen" : "imágenes"}`;
    grid.innerHTML = filtered.map(item => {
      const url = getMediaItemUrl(item);
      if (!url) return "";
      const active = selectedUrls.has(url);
      return `<button type="button" class="media-picker-item ${active ? "is-selected" : ""}" data-block-picker-url="${esc(url)}" title="${esc(mediaName(item))}">
        <span class="media-picker-image"><img src="${esc(url)}" alt="${esc(mediaName(item))}" loading="lazy"></span>
        <span class="media-picker-name">${esc(mediaName(item))}</span>
        <span class="media-picker-use">${mode === "multiple" ? (active ? "✓ SELECCIONADA" : "SELECCIONAR") : "USAR IMAGEN"}</span>
      </button>`;
    }).join("") || `<div class="empty-state media-picker-empty"><strong>No encontramos imágenes.</strong><span>Probá con otro término.</span></div>`;

    grid.querySelectorAll("[data-block-picker-url]").forEach(btn => {
      btn.addEventListener("click", () => {
        const url = String(btn.dataset.blockPickerUrl || "");
        if (mode === "single") {
          callback([url]);
          overlay.remove();
          return;
        }
        if (selectedUrls.has(url)) selectedUrls.delete(url);
        else selectedUrls.add(url);
        renderItems();
        updateCount();
      });
    });
  };

  const updateCount = () => {
    if (selectedCount) selectedCount.textContent = `${selectedUrls.size} ${selectedUrls.size === 1 ? "seleccionada" : "seleccionadas"}`;
  };

  const close = () => overlay.remove();
  overlay.querySelector(".picker-close")?.addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  search?.addEventListener("input", renderItems);
  overlay.querySelector(".block-picker-confirm")?.addEventListener("click", () => {
    callback([...selectedUrls]);
    close();
  });

  renderItems();
  updateCount();
  search?.focus();
}

function openMediaPicker(callback) {
  const items = Array.isArray(state.media) ? [...state.media] : [];
  const overlay = document.createElement("div");
  overlay.className = "modal-back media-picker-back";
  overlay.setAttribute("role", "presentation");
  overlay.innerHTML = `
    <div class="modal media-picker-modal" role="dialog" aria-modal="true" aria-label="Elegir imagen">
      <div class="modal-head">
        <div>
          <span class="section-eyebrow">MEDIA MANAGER</span>
          <h2>Elegir imagen</h2>
        </div>
        <button type="button" class="modal-close media-picker-close" aria-label="Cerrar">×</button>
      </div>
      <div class="modal-body">
        <p class="media-picker-help">Elegí una imagen ya cargada. Al hacer clic se usará como portada de esta noticia.</p>
        <div class="media-picker-grid">
          ${items.map((item) => {
            const url = getMediaItemUrl(item);
            if (!url) return "";
            const name = mediaName(item);
            return `
              <button type="button" class="media-picker-item" data-picker-url="${esc(url)}" title="Usar ${esc(name)}">
                <span class="media-picker-image"><img src="${esc(url)}" alt="${esc(name)}" loading="lazy"></span>
                <span class="media-picker-name">${esc(name)}</span>
                <span class="media-picker-use">USAR IMAGEN</span>
              </button>
            `;
          }).join("") || `
            <div class="empty-state media-picker-empty">
              <strong>No hay imágenes disponibles.</strong>
              <span>Volvé al Media Manager y cargá una imagen.</span>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  // Se monta directamente sobre BODY para que ningún contenedor del modal
  // de la noticia pueda tapar o interceptar los clics del selector.
  document.body.appendChild(overlay);

  let closed = false;
  const finish = (url = "") => {
    if (closed) return;
    closed = true;
    if (url) callback(url);
    overlay.remove();
  };

  overlay.querySelector(".media-picker-close")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    finish();
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) finish();
  });

  overlay.querySelectorAll("[data-picker-url]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      finish(String(btn.dataset.pickerUrl || "").trim());
    });
  });
}


/* =========================================================
   NUEVO: ELEGIR DÓNDE USAR LA IMAGEN
========================================================= */

function openMediaUseMenu(
  url
) {
  openModal(
    "¿Dónde querés usar esta imagen?",

    `
      <div class="media-use-menu">

        <button
          type="button"
          class="action media-use-option"
          data-use-destination="article"
        >
          <strong>NOTICIA</strong>
          <span>
            Usar como imagen de portada de una noticia.
          </span>
        </button>

        <button
          type="button"
          class="action media-use-option"
          data-use-destination="club"
        >
          <strong>ESCUDO DE CLUB</strong>
          <span>
            Asignar esta imagen como escudo de un club.
          </span>
        </button>

        <button
          type="button"
          class="action media-use-option"
          data-use-destination="nation"
        >
          <strong>SELECCIÓN NACIONAL</strong>
          <span>
            Asignar esta imagen como escudo de una selección (Los Pumas y demás).
          </span>
        </button>

        <button
          type="button"
          class="action media-use-option"
          data-use-destination="copy"
        >
          <strong>COPIAR URL</strong>
          <span>
            Copiar la dirección de la imagen.
          </span>
        </button>

      </div>
    `,

    async () => {}
  );

  $("#modal-root")
    ?.querySelectorAll(
      "[data-use-destination]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const destination =
            button.dataset
              .useDestination;

          if (
            destination ===
            "copy"
          ) {
            try {
              await navigator.clipboard.writeText(
                url
              );

              closeModal();

              toast(
                "URL copiada",
                "La dirección de la imagen quedó en el portapapeles."
              );
            } catch {
              toast(
                "Error",
                "No se pudo copiar la URL.",
                "error"
              );
            }

            return;
          }

          if (
            destination ===
            "article"
          ) {
            closeModal();

            openArticle({
              imageUrl: url,
              image: url
            });

            return;
          }

          if (
            destination ===
            "club"
          ) {
            closeModal();

            await loadClubs();

            openClubLogoPicker(
              url
            );

            return;
          }

          if (
            destination ===
            "nation"
          ) {
            closeModal();

            await loadClubs();

            openNationLogoPicker(
              url
            );

            return;
          }
        }
      );
    });
}

function openClubLogoPicker(
  url
) {
  const clubs =
    Object.entries(
      state.clubs || {}
    );

  if (!clubs.length) {
    toast(
      "Sin clubes",
      "No hay clubes configurados para asignar la imagen.",
      "error"
    );

    return;
  }

  openModal(
    "Elegir club",

    `
      <div class="form-grid">

        <label class="full">
          Club

          <select
            id="media-use-club"
          >
            <option value="">
              Seleccioná un club...
            </option>

            ${clubs
              .map(
                ([id, club]) => `
                  <option
                    value="${esc(id)}"
                  >
                    ${esc(
                      club.name ||
                      id
                    )}
                  </option>
                `
              )
              .join("")}
          </select>
        </label>

        <div
          class="full article-image-preview"
        >
          <img
            src="${esc(url)}"
            alt="Imagen seleccionada"
          >
        </div>

      </div>
    `,

    async () => {
      const select =
        $("#media-use-club");

      const clubId =
        select?.value || "";

      if (!clubId) {
        throw new Error(
          "Seleccioná un club."
        );
      }

      await assignClubLogo(
        clubId,
        url
      );
    }
  );
}

function openNationLogoPicker(
  url
) {
  const nations =
    Object.entries(
      state.nations || {}
    );

  if (!nations.length) {
    toast(
      "Sin selecciones",
      "No hay selecciones configuradas para asignar la imagen.",
      "error"
    );

    return;
  }

  openModal(
    "Elegir selección",

    `
      <div class="form-grid">

        <label class="full">
          Selección

          <select
            id="media-use-nation"
          >
            <option value="">
              Seleccioná una selección...
            </option>

            ${nations
              .map(
                ([id, nation]) => `
                  <option
                    value="${esc(id)}"
                  >
                    ${esc(
                      nation.name ||
                      id
                    )}
                    ${
                      nation.shortName
                        ? ` (${esc(
                            nation.shortName
                          )})`
                        : ""
                    }
                  </option>
                `
              )
              .join("")}
          </select>
        </label>

        <div
          class="full article-image-preview"
        >
          <img
            src="${esc(url)}"
            alt="Imagen seleccionada"
          >
        </div>

      </div>
    `,

    async () => {
      const select =
        $("#media-use-nation");

      const nationId =
        select?.value || "";

      if (!nationId) {
        throw new Error(
          "Seleccioná una selección."
        );
      }

      await assignNationLogo(
        nationId,
        url
      );
    }
  );
}

function updateArticleImagePreview(
  url
) {
  const preview =
    $("#article-image-preview");

  if (!preview) return;

  preview.innerHTML =
    url
      ? `
        <img
          src="${esc(url)}"
          alt="Vista previa"
        >
      `
      : `
        <span>
          Sin imagen seleccionada
        </span>
      `;
}

/* =========================================================
   EVENTOS
========================================================= */

document.addEventListener(
  "click",
  async (event) => {
    const siteNav = event.target.closest("[data-site-nav]");
    if (siteNav) {
      window.location.assign(siteNav.dataset.siteNav || "/");
      return;
    }

    const nav =
      event.target.closest(
        ".nav-item"
      );

    if (nav) {
      switchSection(
        nav.dataset.section
      );

      return;
    }

    const go =
      event.target.closest(
        "[data-go]"
      );

    if (go) {
      switchSection(
        go.dataset.go
      );

      return;
    }

    /* =====================================================
       PREVIEW DE IMAGEN
    ===================================================== */

    const mediaPreview =
      event.target.closest("[data-media-preview]");

    if (mediaPreview) {
      openMediaPreview(mediaPreview.dataset.mediaPreview);
      return;
    }

    /* =====================================================
       COPIAR URL
    ===================================================== */

    const mediaCopy =
      event.target.closest(
        "[data-media-copy]"
      );

    if (mediaCopy) {
      navigator.clipboard?.writeText(
        mediaCopy.dataset.mediaCopy
      );

      toast(
        "URL copiada",
        "La dirección quedó en el portapapeles."
      );

      return;
    }

    /* =====================================================
       USAR IMAGEN
    ===================================================== */

    const mediaUse =
      event.target.closest(
        "[data-media-use]"
      );

    if (mediaUse) {
      const url =
        mediaUse.dataset.mediaUse;

      if (!url) {
        toast(
          "Error",
          "La imagen no tiene una URL válida.",
          "error"
        );

        return;
      }

      openMediaUseMenu(
        url
      );

      return;
    }

    /* =====================================================
       ELEGIR ESCUDO
    ===================================================== */

    const clubPick =
      event.target.closest(
        "[data-club-pick]"
      );

    if (clubPick) {
      loadMedia().then(
        () =>
          openMediaPicker(
            async (url) => {
              try {
                await assignClubLogo(
                  clubPick.dataset
                    .clubPick,
                  url
                );
              } catch (error) {
                toast(
                  "Error",
                  error.message,
                  "error"
                );
              }
            }
          )
      );

      return;
    }

    /* =====================================================
       QUITAR ESCUDO
    ===================================================== */

    const clubClear =
      event.target.closest(
        "[data-club-clear]"
      );

    if (clubClear) {
      if (!(await askConfirm("¿Quitar este escudo?", "El club volverá a usar su escudo predeterminado si existe.", "QUITAR"))) return;
      assignClubLogo(
        clubClear.dataset
          .clubClear,
        ""
      ).catch(
        (error) =>
          toast(
            "Error",
            error.message,
            "error"
          )
      );

      return;
    }

    /* =====================================================
       ELEGIR ESCUDO DE SELECCIÓN
    ===================================================== */

    const nationPick =
      event.target.closest(
        "[data-nation-pick]"
      );

    if (nationPick) {
      loadMedia().then(
        () =>
          openMediaPicker(
            async (url) => {
              try {
                await assignNationLogo(
                  nationPick.dataset
                    .nationPick,
                  url
                );
              } catch (error) {
                toast(
                  "Error",
                  error.message,
                  "error"
                );
              }
            }
          )
      );

      return;
    }

    /* =====================================================
       QUITAR ESCUDO DE SELECCIÓN
    ===================================================== */

    const nationClear =
      event.target.closest(
        "[data-nation-clear]"
      );

    if (nationClear) {
      if (!(await askConfirm("¿Quitar este escudo?", "La selección volverá a usar su escudo predeterminado si existe.", "QUITAR"))) return;
      assignNationLogo(
        nationClear.dataset
          .nationClear,
        ""
      ).catch(
        (error) =>
          toast(
            "Error",
            error.message,
            "error"
          )
      );

      return;
    }

    /* =====================================================
       ELIMINAR IMAGEN
    ===================================================== */

    const mediaDelete =
      event.target.closest(
        "[data-media-delete]"
      );

    if (mediaDelete) {
      if (!(await askConfirm("¿Eliminar esta imagen?", "Si está usada en el sitio, dejará de mostrarse. Esta acción no se puede deshacer.", "ELIMINAR"))) return;
      mediaApi(
        "delete",
        {
          url:
            mediaDelete.dataset
              .mediaDelete
        }
      )
        .then(() => {
          toast(
            "Imagen eliminada"
          );

          loadMedia();
        })
        .catch(
          (error) =>
            toast(
              "Error",
              error.message,
              "error"
            )
        );

      return;
    }

    /* =====================================================
       NUEVA NOTICIA
    ===================================================== */

    if (
      event.target.closest(
        "#dashboard-new-article"
      ) ||
      event.target.closest(
        "#new-article-button"
      )
    ) {
      openArticle();

      return;
    }

    /* =====================================================
       NUEVO PARTIDO
    ===================================================== */

    if (
      event.target.closest(
        "#new-fixture-button"
      )
    ) {
      openFixture();

      return;
    }

    /* =====================================================
       NUEVO RESULTADO
    ===================================================== */

    if (
      event.target.closest(
        "#new-result-button"
      )
    ) {
      openResult();

      return;
    }

    /* =====================================================
       CARGAR RESULTADO
    ===================================================== */

    const addResult =
      event.target.closest(
        "[data-add-result]"
      );

    if (addResult) {
      const fixture =
        getFixtureByReference(
          addResult.dataset
            .addResult
        );

      if (fixture) {
        openResult(
          {},
          fixture
        );
      }

      return;
    }

    const statsArticle = event.target.closest("[data-stats-article]");
    if (statsArticle) { openArticleStats(statsArticle.dataset.statsArticle); return; }

    /* =====================================================
       EDITAR NOTICIA
    ===================================================== */

    const editArticle =
      event.target.closest(
        "[data-edit-article]"
      );

    if (editArticle) {
      const article =
        state.content.articles.find(
          (item) =>
            String(item.id) ===
            String(
              editArticle.dataset
                .editArticle
            )
        );

      if (article) {
        openArticle(
          article
        );
      }

      return;
    }

    /* =====================================================
       BORRAR NOTICIA
    ===================================================== */

    const deleteArticle =
      event.target.closest(
        "[data-delete-article]"
      );

    if (deleteArticle) {
      deleteItem(
        "delete-article",
        deleteArticle.dataset
          .deleteArticle
      );

      return;
    }

    /* =====================================================
       EDITAR PARTIDO
    ===================================================== */

    const editFixture =
      event.target.closest(
        "[data-edit-fixture]"
      );

    if (editFixture) {
      const fixture =
        getFixtureByReference(
          editFixture.dataset
            .editFixture
        );

      if (fixture) {
        openFixture(
          fixture
        );
      }

      return;
    }

    /* =====================================================
       BORRAR PARTIDO
    ===================================================== */

    const deleteFixture =
      event.target.closest(
        "[data-delete-fixture]"
      );

    if (deleteFixture) {
      deleteItem(
        "delete-fixture",
        deleteFixture.dataset
          .deleteFixture
      );

      return;
    }

    /* =====================================================
       EDITAR RESULTADO
    ===================================================== */

    const editResult =
      event.target.closest(
        "[data-edit-result]"
      );

    if (editResult) {
      const result =
        state.content.results.find(
          (item) =>
            String(item.id) ===
            String(
              editResult.dataset
                .editResult
            )
        );

      if (result) {
        openResult(
          result
        );
      }

      return;
    }

    /* =====================================================
       BORRAR RESULTADO
    ===================================================== */

    const deleteResult =
      event.target.closest(
        "[data-delete-result]"
      );

    if (deleteResult) {
      deleteItem(
        "delete-result",
        deleteResult.dataset
          .deleteResult
      );
    }
  }
);

/* =========================================================
   LOGIN
========================================================= */

$("#login-form")
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      $("#login-error").textContent =
        "";

      try {
        const data =
          await api(
            "login",
            {
              username:
                $("#login-user")
                  .value,

              password:
                $("#login-password")
                  .value
            }
          );

        showApp(
          data.user ||
          "admin"
        );

        $("#login-password")
          .value = "";
      } catch (error) {
        $("#login-error")
          .textContent =
          error.message;

        toast(
          "Error de acceso",
          error.message,
          "error"
        );
      }
    }
  );

/* =========================================================
   LOGOUT
========================================================= */

$("#logout-button")
  ?.addEventListener(
    "click",
    async () => {
      try {
        await api(
          "logout"
        );
      } catch {
        // La sesión visual se limpia igual.
      }

      showLogin();
    }
  );

/* =========================================================
   REFRESH
========================================================= */

$("#refresh-button")
  ?.addEventListener(
    "click",
    () => {
      getContent(true)
        .catch(
          (error) =>
            toast(
              "Error",
              error.message,
              "error"
            )
        );
    }
  );

/* =========================================================
   SIDEBAR
========================================================= */

$("#menu-button")
  ?.addEventListener(
    "click",
    () => {
      $("#sidebar")
        ?.classList.add(
          "open"
        );

      $("#sidebar-overlay")
        ?.classList.add(
          "show"
        );
    }
  );

$("#sidebar-close")
  ?.addEventListener(
    "click",
    closeSidebar
  );

$("#sidebar-overlay")
  ?.addEventListener(
    "click",
    closeSidebar
  );

/* =========================================================
   FILTROS
========================================================= */

$("#article-search")
  ?.addEventListener(
    "input",
    renderArticles
  );

$("#article-category-filter")
  ?.addEventListener(
    "change",
    renderArticles
  );

$("#media-search")
  ?.addEventListener(
    "input",
    renderMedia
  );

$("#media-type-filter")
  ?.addEventListener(
    "change",
    renderMedia
  );

$("#media-upload-input")
  ?.addEventListener(
    "change",
    (event) => {
      uploadMediaFiles(
        event.target.files
      );

      event.target.value =
        "";
    }
  );

$("#club-logo-search")?.addEventListener("input", renderClubLogos);
$("#club-logo-status")?.addEventListener("change", renderClubLogos);
$("#nation-logo-search")?.addEventListener("input", renderNationLogos);
$("#nation-logo-status")?.addEventListener("change", renderNationLogos);

$("#media-search")?.addEventListener("input", renderMedia);
$("#media-type-filter")?.addEventListener("change", renderMedia);
$("#media-sort")?.addEventListener("change", renderMedia);
$("#media-refresh")?.addEventListener("click", () => loadMedia(true));

$("#media-dropzone-button")?.addEventListener("click", () => {
  $("#media-upload-input")?.click();
});

const mediaDropzone = $("#media-dropzone");
mediaDropzone?.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  $("#media-upload-input")?.click();
});
["dragenter", "dragover"].forEach((eventName) => {
  mediaDropzone?.addEventListener(eventName, (event) => {
    event.preventDefault();
    mediaDropzone.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  mediaDropzone?.addEventListener(eventName, (event) => {
    event.preventDefault();
    mediaDropzone.classList.remove("dragover");
  });
});
mediaDropzone?.addEventListener("drop", (event) => {
  const files = event.dataTransfer?.files;
  if (files?.length) uploadMediaFiles(files);
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u" && !event.target.matches("input,textarea,select")) {
    event.preventDefault();
    $("#media-upload-input")?.click();
  }
});

$("#fixture-search")
  ?.addEventListener(
    "input",
    renderFixtures
  );

$("#fixture-competition-filter")
  ?.addEventListener(
    "change",
    renderFixtures
  );

/* =========================================================
   FILTROS DE ESCUDOS
========================================================= */

["club-logo-search", "club-logo-filter"].forEach(id => {
  const el = document.getElementById(id);
  el?.addEventListener("input", renderClubLogos);
  el?.addEventListener("change", renderClubLogos);
});
["nation-logo-search", "nation-logo-filter"].forEach(id => {
  const el = document.getElementById(id);
  el?.addEventListener("input", renderNationLogos);
  el?.addEventListener("change", renderNationLogos);
});

/* =========================================================
   ESC
========================================================= */

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape"
    ) {
      closeModal();
      closeSidebar();
    }
  }
);

/* =========================================================
   INICIO
========================================================= */

checkSession();

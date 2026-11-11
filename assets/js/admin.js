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
      : [],

    players: Array.isArray(data.players)
      ? data.players
      : [],

    games:
      data.games &&
      typeof data.games === "object"
        ? data.games
        : null,

    quiz:
      data.quiz &&
      typeof data.quiz === "object"
        ? data.quiz
        : null
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
    quiz: "Quiz",
    games: "Juegos",
    players: "Jugadores",
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
  if (section === "players") renderPlayersAdmin();
  if (section === "games") renderGamesAdmin();
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
  renderQuizAdmin();
  renderPlayersAdmin();
  renderGamesAdmin();
  renderGamesDashboard();

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


  if ($("#nav-quiz-count")) {
    $("#nav-quiz-count").textContent =
      Array.isArray(content.quiz?.questions)
        ? content.quiz.questions.length
        : 0;
  }

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
  const publishDate =
    article.publishAt
      ? new Date(article.publishAt)
      : null;

  const localPublish =
    publishDate &&
    !Number.isNaN(publishDate.getTime())
      ? new Date(
          publishDate.getTime() -
          publishDate.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16)
      : "";

  const imageUrl =
    article.imageUrl ||
    article.image ||
    "";

  return `
    <div class="form-grid">

      <label class="full">
        Título
        <input
          name="title"
          required
          value="${esc(article.title || "")}"
        >
      </label>

      <label>
        Categoría
        <select name="category">
          ${[
            "Los Pumas",
            "Super Rugby",
            "URBA TOP 14",
            "Internacional",
            "Rugby"
          ]
            .map(
              (category) =>
                `<option ${
                  article.category === category
                    ? "selected"
                    : ""
                }>${category}</option>`
            )
            .join("")}
        </select>
      </label>

      <label>
        Autor
        <input
          name="author"
          value="${esc(article.author || "DropRugby")}"
        >
      </label>

      <label class="full">
        Bajada / copete
        <textarea name="excerpt" rows="3">${esc(
          article.excerpt || ""
        )}</textarea>
      </label>

      <div class="full media-field">
        <label>Imagen de portada</label>

        <div class="media-inline">
          <input
            name="imageUrl"
            id="article-image-url"
            placeholder="Seleccioná una imagen del Media Manager"
            value="${esc(imageUrl)}"
            readonly
          >

          <button
            type="button"
            class="action"
            id="article-pick-image"
          >
            ELEGIR
          </button>

          <button
            type="button"
            class="action upload-inline"
            id="article-upload-image"
          >
            SUBIR IMAGEN
          </button>
          <input
            id="article-inline-upload"
            type="file"
            accept="image/*"
            hidden
          >
        </div>

        <div
          id="article-image-preview"
          class="article-image-preview"
        >
          ${
            imageUrl
              ? `<img src="${esc(imageUrl)}" alt="Vista previa">`
              : `<span>Sin imagen seleccionada</span>`
          }
        </div>

        <p class="form-help">
          Las imágenes se guardan en el Media Manager.
          No necesitás pegar enlaces externos.
        </p>
      </div>

      <label>
        Fecha de la noticia
        <input
          type="date"
          name="date"
          value="${esc(
            String(article.date || "").slice(0, 10) ||
            new Date().toISOString().slice(0, 10)
          )}"
        >
      </label>

      <label>
        Programar para
        <input
          type="datetime-local"
          name="publishAt"
          value="${esc(localPublish)}"
        >
      </label>

      <label class="full">
        Contenido
        <textarea
          name="content"
          rows="12"
          placeholder="Escribí la noticia. Separá los párrafos con una línea en blanco."
        >${esc(article.content || "")}</textarea>
      </label>

      <label class="check">
        <input
          type="checkbox"
          name="featured"
          ${article.featured ? "checked" : ""}
        >
        Noticia destacada
      </label>

      <label class="check">
        <input
          type="checkbox"
          name="published"
          ${article.published !== false ? "checked" : ""}
        >
        Publicada
      </label>

      <label class="check">
        <input
          type="checkbox"
          name="scheduled"
          ${article.scheduled ? "checked" : ""}
        >
        Programar publicación
      </label>

      <p class="form-help full">
        Si marcás "Programar publicación", la noticia no se mostrará
        públicamente hasta la fecha y hora elegidas.
      </p>

    </div>
  `;
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

  requestAnimationFrame(
    bindArticleMediaControls
  );
}

function bindArticleMediaControls() {
  $("#article-upload-image")?.addEventListener("click", () => {
    $("#article-inline-upload")?.click();
  });

  $("#article-pick-image")?.addEventListener(
    "click",
    () => {
      loadMedia().then(() => {
        openMediaPicker((url) => {
          const input =
            $("#article-image-url");

          if (input) {
            input.value = url;
          }

          updateArticleImagePreview(url);
        });
      });
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
    <div class="modal-back">
      <div class="modal">

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

function openMediaPicker(callback) {
  const items = Array.isArray(state.media) ? state.media : [];
  const root = $("#modal-root");
  const pickerId = `media-picker-${Date.now()}`;

  // No reemplazamos el modal actual: el formulario de la noticia
  // debe seguir vivo para no perder los campos ya completados.
  const overlay = document.createElement("div");
  overlay.className = "modal-back media-picker-back";
  overlay.id = pickerId;
  overlay.innerHTML = `
    <div class="modal media-picker-modal" role="dialog" aria-modal="true" aria-label="Elegir imagen">
      <div class="modal-head">
        <h2>Elegir imagen</h2>
        <button type="button" class="modal-close media-picker-close" aria-label="Cerrar">×</button>
      </div>
      <div class="modal-body">
        <div class="media-picker-grid">
          ${
            items.map((item) => {
              const url = String(item.url || "");
              if (!url) return "";
              return `
                <button
                  type="button"
                  class="media-picker-item"
                  data-picker-url="${esc(url)}"
                >
                  <img src="${esc(url)}" alt="${esc(mediaName(item))}" loading="lazy">
                  <span>${esc(mediaName(item))}</span>
                </button>
              `;
            }).join("") || `
              <div class="empty-state">
                No hay imágenes cargadas todavía.
              </div>
            `
          }
        </div>
      </div>
    </div>
  `;

  root.appendChild(overlay);

  const finish = (url = "") => {
    if (url) callback(url);
    overlay.remove();
  };

  overlay.querySelector(".media-picker-close")?.addEventListener("click", () => finish());
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) finish();
  });

  overlay.querySelectorAll("[data-picker-url]").forEach((btn) => {
    btn.addEventListener("click", () => {
      finish(btn.dataset.pickerUrl || "");
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
   QUIZ SEMANAL
   Se guarda con la acción "save-quiz" y se publica en la home
   y en /quiz. Cambiar el id (botón NUEVO QUIZ) hace que los
   lectores puedan volver a jugar.
========================================================= */

let quizDraft = null;
let quizDirty = false;

function blankQuizQuestion() {
  return {
    id: makeId("q"),
    q: "",
    options: ["", "", "", ""],
    correct: 0,
    explain: ""
  };
}

// Mientras no se haya guardado ningún quiz, el sitio muestra el de
// data/quiz.json: lo precargamos para editar sobre lo que está publicado.
let quizSeed = null;
let quizSeedRequested = false;

async function loadQuizSeed() {
  if (quizSeedRequested) return;
  quizSeedRequested = true;

  try {
    const response = await fetch("/data/quiz.json", { cache: "no-store" });
    if (!response.ok) return;
    quizSeed = await response.json();
    if (!state.content.quiz) renderQuizAdmin();
  } catch (_) {}
}

function quizFromContent() {
  const quiz = state.content.quiz || quizSeed;

  return {
    id: quiz?.id || makeId("quiz"),
    title: quiz?.title || "",
    intro: quiz?.intro || "",
    week: quiz?.week || "",
    active: quiz ? quiz.active !== false : true,
    updatedAt: quiz?.updatedAt || "",
    questions: (Array.isArray(quiz?.questions) ? quiz.questions : []).map(
      (question) => ({
        id: question.id || makeId("q"),
        q: question.q || "",
        options: [0, 1, 2, 3].map((i) => question.options?.[i] || ""),
        correct: Number(question.correct) || 0,
        explain: question.explain || ""
      })
    )
  };
}

function paintQuizStatus() {
  const box = $("#quiz-status");
  if (!box || !quizDraft) return;

  const count = quizDraft.questions.length;

  if ($("#quiz-count-label")) {
    $("#quiz-count-label").textContent =
      `${count} ${count === 1 ? "pregunta" : "preguntas"}`;
  }

  box.className = "quiz-status";

  if (quizDirty) {
    box.classList.add("dirty");
    box.innerHTML = "<i></i>Tenés cambios sin guardar. Tocá GUARDAR QUIZ para publicarlos.";
    return;
  }

  const saved = state.content.quiz;

  if (!saved) {
    box.innerHTML = "<i></i>Este es el quiz de ejemplo que hoy muestra el sitio. Editalo y guardá para publicar el tuyo.";
    return;
  }

  if (saved.active === false) {
    box.innerHTML = "<i></i>Quiz oculto: no se muestra en el sitio.";
    return;
  }

  box.classList.add("live");
  box.innerHTML = saved.updatedAt
    ? `<i></i>Publicado en el sitio · última actualización ${esc(fmtDT(saved.updatedAt))}`
    : "<i></i>Publicado en el sitio.";
}

function paintQuizQuestions() {
  const list = $("#quiz-questions");
  if (!list || !quizDraft) return;

  if (!quizDraft.questions.length) {
    list.innerHTML = `
      <div class="quiz-empty-admin">
        <strong>Sin preguntas todavía.</strong><br>
        Sumá la primera con “+ AGREGAR PREGUNTA”.
      </div>`;
    return;
  }

  const total = quizDraft.questions.length;

  list.innerHTML = quizDraft.questions.map((question, qi) => `
    <div class="quiz-q" data-qi="${qi}">
      <div class="quiz-q-head">
        <strong>PREGUNTA ${qi + 1}</strong>
        <div>
          <button type="button" class="action" data-quiz-act="up" title="Subir" ${qi === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="action" data-quiz-act="down" title="Bajar" ${qi === total - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="action danger" data-quiz-act="delete">ELIMINAR</button>
        </div>
      </div>

      <label>Pregunta
        <textarea rows="2" maxlength="300" data-quiz-field="q" placeholder="¿Cuántos puntos vale un try?">${esc(question.q)}</textarea>
      </label>

      <label>Opciones <span class="quiz-hint">Marcá con el círculo cuál es la correcta. Podés dejar vacías las que no uses (mínimo 2).</span></label>
      <div class="quiz-opts">
        ${question.options.map((option, oi) => `
          <div class="quiz-opt ${question.correct === oi ? "correct" : ""}">
            <input type="radio" name="quiz-correct-${qi}" value="${oi}" ${question.correct === oi ? "checked" : ""} aria-label="Opción ${oi + 1} es la correcta">
            <input type="text" maxlength="160" data-quiz-option="${oi}" value="${esc(option)}" placeholder="Opción ${"ABCD"[oi]}">
          </div>`).join("")}
      </div>

      <label>Explicación <span class="quiz-hint">Se muestra después de responder (opcional).</span>
        <input type="text" maxlength="400" data-quiz-field="explain" value="${esc(question.explain)}" placeholder="El try vale 5 puntos; con la conversión, 7.">
      </label>
    </div>`).join("");
}

function renderQuizAdmin(force = false) {
  if (!$("#section-quiz")) return;

  // No pisamos lo que se está editando si llega un refresco de contenido.
  if (quizDirty && !force) {
    paintQuizStatus();
    return;
  }

  if (!state.content.quiz) loadQuizSeed();

  quizDraft = quizFromContent();
  quizDirty = false;

  $("#quiz-title").value = quizDraft.title;
  $("#quiz-intro").value = quizDraft.intro;
  $("#quiz-week").value = quizDraft.week;
  $("#quiz-active").checked = quizDraft.active;

  paintQuizQuestions();
  paintQuizStatus();
}

function markQuizDirty() {
  quizDirty = true;
  paintQuizStatus();
}

async function saveQuiz() {
  if (!quizDraft) return;

  if (!quizDraft.title.trim()) {
    toast("Falta el título", "Poné un título para el quiz.", "error");
    $("#quiz-title")?.focus();
    return;
  }

  for (let i = 0; i < quizDraft.questions.length; i++) {
    const question = quizDraft.questions[i];
    const filled = question.options.filter((option) => option.trim()).length;

    if (!question.q.trim()) {
      toast("Pregunta incompleta", `La pregunta ${i + 1} no tiene texto.`, "error");
      return;
    }

    if (filled < 2) {
      toast("Faltan opciones", `La pregunta ${i + 1} necesita al menos 2 opciones.`, "error");
      return;
    }

    if (!String(question.options[question.correct] || "").trim()) {
      toast("Respuesta correcta vacía", `En la pregunta ${i + 1}, la opción marcada como correcta está vacía.`, "error");
      return;
    }
  }

  if (quizDraft.active && !quizDraft.questions.length) {
    toast("Sin preguntas", "Agregá al menos una pregunta o desmarcá “Visible en el sitio”.", "error");
    return;
  }

  const button = $("#quiz-save");

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "GUARDANDO…";
    }

    const data = await api("save-quiz", { quiz: quizDraft });

    state.content.quiz = data.quiz;
    quizDirty = false;

    renderQuizAdmin(true);
    renderCounts();

    toast("Quiz guardado", "Ya está publicado en el sitio.");
  } catch (error) {
    toast("Error", error.message, "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "GUARDAR QUIZ";
    }
  }
}

async function startNewQuiz() {
  const ok = await askConfirm(
    "¿Empezar un quiz nuevo?",
    "Se vacían las preguntas actuales y los lectores van a poder jugar de nuevo. No se publica hasta que toques GUARDAR QUIZ.",
    "EMPEZAR"
  );

  if (!ok) return;

  const weekLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long"
  }).format(new Date());

  quizDraft = {
    id: makeId("quiz"),
    title: "",
    intro: "",
    week: `Semana del ${weekLabel}`,
    active: true,
    questions: [blankQuizQuestion()]
  };

  $("#quiz-title").value = "";
  $("#quiz-intro").value = "";
  $("#quiz-week").value = quizDraft.week;
  $("#quiz-active").checked = true;

  paintQuizQuestions();
  markQuizDirty();
  $("#quiz-title")?.focus();
}

$("#quiz-save")?.addEventListener("click", saveQuiz);
$("#quiz-new")?.addEventListener("click", startNewQuiz);

$("#quiz-add")?.addEventListener("click", () => {
  if (!quizDraft) return;

  quizDraft.questions.push(blankQuizQuestion());
  paintQuizQuestions();
  markQuizDirty();

  const cards = $$("#quiz-questions .quiz-q");
  const last = cards[cards.length - 1];
  last?.scrollIntoView({ behavior: "smooth", block: "center" });
  last?.querySelector("textarea")?.focus({ preventScroll: true });
});

$("#section-quiz")?.addEventListener("input", (event) => {
  if (!quizDraft) return;

  const target = event.target;

  if (target.id === "quiz-title") quizDraft.title = target.value;
  else if (target.id === "quiz-intro") quizDraft.intro = target.value;
  else if (target.id === "quiz-week") quizDraft.week = target.value;
  else if (target.id === "quiz-active") quizDraft.active = target.checked;
  else {
    const card = target.closest(".quiz-q");
    if (!card) return;

    const question = quizDraft.questions[Number(card.dataset.qi)];
    if (!question) return;

    if (target.dataset.quizField) {
      question[target.dataset.quizField] = target.value;
    } else if (target.dataset.quizOption !== undefined) {
      question.options[Number(target.dataset.quizOption)] = target.value;
    } else if (target.type === "radio") {
      question.correct = Number(target.value);
      card.querySelectorAll(".quiz-opt").forEach((option, i) => {
        option.classList.toggle("correct", i === question.correct);
      });
    }
  }

  markQuizDirty();
});

$("#section-quiz")?.addEventListener("change", (event) => {
  if (event.target.id === "quiz-active" && quizDraft) {
    quizDraft.active = event.target.checked;
    markQuizDirty();
  }
});

$("#quiz-questions")?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-quiz-act]");
  if (!button || !quizDraft) return;

  const index = Number(button.closest(".quiz-q")?.dataset.qi);
  const list = quizDraft.questions;
  const act = button.dataset.quizAct;

  if (act === "delete") {
    const ok = await askConfirm(
      "¿Eliminar esta pregunta?",
      "Se quita del quiz cuando guardes.",
      "ELIMINAR"
    );
    if (!ok) return;
    list.splice(index, 1);
  }

  if (act === "up" && index > 0) {
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
  }

  if (act === "down" && index < list.length - 1) {
    [list[index + 1], list[index]] = [list[index], list[index + 1]];
  }

  paintQuizQuestions();
  markQuizDirty();
});

window.addEventListener("beforeunload", (event) => {
  if (quizDirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

/* =========================================================
   INICIO
========================================================= */

checkSession();


/* ==========================================================================
   JUGADORES Y JUEGOS — utilidades compartidas
   ========================================================================== */

const TOP14_NAMES = [
  "Newman", "CASI", "Hindú", "Alumni", "SIC", "Regatas Bella Vista", "Los Tilos",
  "Belgrano Athletic", "CUBA", "Atletico del Rosario", "Los Matreros", "La Plata",
  "Buenos Aires C&RC", "Champagnat"
];

const PLAYER_POSITIONS = [
  [1, "1 · Pilar"], [2, "2 · Hooker"], [3, "3 · Pilar"],
  [4, "4 · Segunda línea"], [5, "5 · Segunda línea"], [6, "6 · Ala"],
  [7, "7 · Ala"], [8, "8 · Octavo"], [9, "9 · Medio scrum"],
  [10, "10 · Apertura"], [11, "11 · Wing"], [12, "12 · Centro"],
  [13, "13 · Centro"], [14, "14 · Wing"], [15, "15 · Fullback"]
];

const PLAYER_POSITION_NAMES = {
  pilar: 1, "pilar izquierdo": 1, hooker: 2, talonador: 2, "pilar derecho": 3,
  "segunda linea": 4, "2da linea": 4, segunda: 4, ala: 6, "ala ciego": 6, "ala abierto": 7,
  octavo: 8, "numero 8": 8, "medio scrum": 9, scrum: 9, apertura: 10, "medio apertura": 10,
  centro: 12, "primer centro": 12, "segundo centro": 13, wing: 11, "wing izquierdo": 11,
  "wing derecho": 14, fullback: 15
};

const normKey = (value) =>
  String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

function positionLabel(n) {
  return PLAYER_POSITIONS.find(([num]) => num === Number(n))?.[1] || "Sin puesto";
}

function normalizePlayer(p) {
  let first = cleanText(p?.first);
  let last = cleanText(p?.last);
  if (!last) {
    const parts = cleanText(p?.name).split(" ").filter(Boolean);
    first = parts.length > 1 ? parts[0] : "";
    last = parts.slice(parts.length > 1 ? 1 : 0).join(" ");
  }
  const position = Number(p?.position);
  return {
    first,
    last,
    name: `${first} ${last}`.trim(),
    club: canonicalClub(p?.club),
    position: Number.isInteger(position) && position >= 1 && position <= 15 ? position : null
  };
}

/* ---- clubes ---- */

let teamsSeed = null;
let teamsSeedRequested = false;
let clubIndex = new Map();
let clubNames = TOP14_NAMES.slice();

function buildClubIndex() {
  clubIndex = new Map();
  const add = (club) => {
    if (!club?.name) return;
    for (const key of [club.name, ...(Array.isArray(club.aliases) ? club.aliases : [])]) {
      if (!clubIndex.has(normKey(key))) clubIndex.set(normKey(key), club.name);
    }
  };
  TOP14_NAMES.forEach((name) => add({ name }));
  Object.values(teamsSeed?.clubs || {}).forEach(add);
  Object.values(state.content.teams?.clubs || {}).forEach(add);
  clubNames = [...new Set(clubIndex.values())].sort((a, b) => a.localeCompare(b));
}

function canonicalClub(value) {
  const raw = cleanText(value);
  return clubIndex.get(normKey(raw)) || raw;
}

async function loadTeamsSeed() {
  if (teamsSeedRequested) return;
  teamsSeedRequested = true;
  try {
    const response = await fetch("/data/teams.json", { cache: "no-store" });
    if (response.ok) {
      teamsSeed = await response.json();
      buildClubIndex();
      renderPlayersAdmin();
      renderGamesAdmin();
      renderGamesDashboard();
    }
  } catch (_) {}
}

/* ---- Wordle: mismas reglas que assets/js/games.js ---- */

function wordLetters(value) {
  return String(value || "")
    .normalize("NFC")
    .toUpperCase()
    .replace(/Ñ/g, "\u0001")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0001/g, "Ñ")
    .replace(/[^A-ZÑ]/g, "");
}

function wordleWord(player) {
  if (!player.last || /\s/.test(player.last.trim())) return "";
  const word = wordLetters(player.last);
  return word.length >= 4 && word.length <= 9 ? word : "";
}

function wordlePool(players) {
  const seen = new Set();
  return players
    .map((player) => ({ word: wordleWord(player), player }))
    .filter((e) => e.word && !seen.has(e.word) && seen.add(e.word))
    .sort((a, b) => a.word.localeCompare(b.word));
}

function wordleHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


/* ==========================================================================
   JUGADORES
   Se guardan con la acción "save-players" (content.players).
   Mientras no se haya guardado nada desde el panel, el sitio usa
   data/players.json: lo precargamos para editar sobre lo publicado.
   ========================================================================== */

let playersDraft = [];
let playersDirty = false;
let playersSeed = null;
let playersSeedRequested = false;
let playerEditing = -1;

async function loadPlayersSeed() {
  if (playersSeedRequested) return;
  playersSeedRequested = true;
  try {
    const response = await fetch("/data/players.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    playersSeed = Array.isArray(data) ? data : Array.isArray(data.players) ? data.players : [];
    renderPlayersAdmin();
    renderGamesAdmin();
    renderGamesDashboard();
    renderCounts();
  } catch (_) {}
}

/** Lo que hoy ve el sitio: lo guardado en el panel o, si no hay, la base. */
function livePlayers() {
  const saved = state.content.players;
  return (saved.length ? saved : playersSeed || []).map(normalizePlayer);
}

/** Lo que se está editando (incluye cambios sin guardar). */
function workingPlayers() {
  return playersDirty ? playersDraft : livePlayers();
}

function markPlayersDirty() {
  playersDirty = true;
  paintPlayersStatus();
  paintPlayersClubs();
}

function paintPlayersStatus() {
  const box = $("#players-status");
  if (!box) return;

  if (playersDirty) {
    box.className = "quiz-status dirty";
    box.innerHTML = "<i></i>Tenés cambios sin guardar. Tocá GUARDAR JUGADORES para publicarlos.";
    return;
  }

  if (!state.content.players.length && playersDraft.length) {
    box.className = "quiz-status";
    box.innerHTML = `<i></i>Estos ${playersDraft.length} jugadores son la base que hoy usa el sitio. Editalos y guardá para administrarlos desde el panel.`;
    return;
  }

  box.className = "quiz-status live";
  box.innerHTML = `<i></i>${playersDraft.length} jugadores publicados.`;
}

function paintPlayersClubs() {
  const box = $("#players-clubs");
  if (!box) return;
  const filter = $("#players-club-filter")?.value || "";
  const counts = {};
  playersDraft.forEach((p) => { counts[p.club] = (counts[p.club] || 0) + 1; });
  const names = [...new Set([...TOP14_NAMES.map(canonicalClub), ...Object.keys(counts)])];

  box.innerHTML = names.map((name) => {
    const n = counts[name] || 0;
    const cls = n === 0 ? "empty" : n >= 15 ? "full" : "part";
    return `<button type="button" class="club-chip ${cls} ${filter === name ? "active" : ""}" data-club-chip="${esc(name)}">
      <span>${esc(name)}</span><b>${n}</b></button>`;
  }).join("");
}

function paintPlayersControls() {
  const options = clubNames.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
  const clubSel = $("#player-club");
  if (clubSel) {
    const current = clubSel.value;
    clubSel.innerHTML = options;
    if (current) clubSel.value = current;
  }
  const filter = $("#players-club-filter");
  if (filter) {
    const current = filter.value;
    filter.innerHTML = `<option value="">Todos los clubes</option>` + options;
    filter.value = current;
  }
  const pos = $("#player-position");
  if (pos && pos.options.length <= 1) {
    pos.innerHTML = `<option value="">Sin puesto</option>` +
      PLAYER_POSITIONS.map(([n, label]) => `<option value="${n}">${esc(label)}</option>`).join("");
  }
}

function paintPlayersTable() {
  const body = $("#players-table");
  if (!body) return;
  const q = normKey($("#players-search")?.value);
  const club = $("#players-club-filter")?.value || "";

  const rows = playersDraft
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => (!club || p.club === club) && (!q || normKey(p.name).includes(q)))
    .sort((a, b) =>
      a.p.club.localeCompare(b.p.club) ||
      (a.p.position || 99) - (b.p.position || 99) ||
      a.p.last.localeCompare(b.p.last));

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="5"><div class="empty-state"><strong>Sin jugadores</strong>${playersDraft.length ? "Ninguno coincide con el filtro." : "Importá un CSV o agregá uno a mano."}</div></td></tr>`;
    return;
  }

  const LIMIT = 300;
  body.innerHTML = rows.slice(0, LIMIT).map(({ p, i }) => `
    <tr class="${i === playerEditing ? "editing" : ""}">
      <td>${p.position ? `<span class="pos-badge">${p.position}</span> ${esc(positionLabel(p.position).split(" · ")[1])}` : `<span class="muted">Sin puesto</span>`}</td>
      <td>${esc(p.first)} <b>${esc(p.last)}</b></td>
      <td>${esc(p.club)}</td>
      <td>${wordleWord(p) ? `<span class="pill ok">${esc(wordleWord(p))}</span>` : `<span class="muted" title="El Wordle usa apellidos de una sola palabra, de 4 a 9 letras">—</span>`}</td>
      <td class="row-actions">
        <button type="button" class="action" data-player-edit="${i}">EDITAR</button>
        <button type="button" class="action danger" data-player-del="${i}">ELIMINAR</button>
      </td>
    </tr>`).join("") +
    (rows.length > LIMIT ? `<tr><td colspan="5" class="muted">Mostrando ${LIMIT} de ${rows.length}. Usá el buscador o tocá un club.</td></tr>` : "");
}

function resetPlayerForm() {
  playerEditing = -1;
  const form = $("#player-form");
  if (!form) return;
  $("#player-first").value = "";
  $("#player-last").value = "";
  $("#player-form-title").textContent = "Agregar jugador";
  $("#player-add").textContent = "+ AGREGAR";
  $("#player-cancel").classList.add("hidden");
}

function renderPlayersAdmin(force = false) {
  if (!$("#section-players")) return;
  loadTeamsSeed();
  if (!state.content.players.length) loadPlayersSeed();
  buildClubIndex();

  if (!playersDirty || force) {
    playersDraft = livePlayers();
    playersDirty = false;
    resetPlayerForm();
  }

  paintPlayersControls();
  paintPlayersStatus();
  paintPlayersClubs();
  paintPlayersTable();
}

function playerKey(p) {
  return `${normKey(p.club)}|${normKey(p.name)}`;
}

function addPlayers(list, replace) {
  const next = replace ? [] : playersDraft.slice();
  const seen = new Set(next.map(playerKey));
  let added = 0, repeated = 0;
  for (const p of list) {
    if (seen.has(playerKey(p))) { repeated++; continue; }
    seen.add(playerKey(p));
    next.push(p);
    added++;
  }
  playersDraft = next;
  if (added || replace) markPlayersDirty();
  paintPlayersTable();
  return { added, repeated };
}

function parsePlayersCSV(text) {
  const first = text.split(/\r?\n/)[0] || "";
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";"
    : (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? "\t" : ",";
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

function importPlayersFromText(text) {
  const rows = parsePlayersCSV(text.replace(/^﻿/, ""));
  if (!rows.length) return;

  const header = rows[0].map(normKey);
  const hasHeader = header.includes("club");
  let iClub = 0, iFirst = -1, iLast = -1, iFull = -1, iPos = -1;

  if (hasHeader) {
    iClub = header.indexOf("club");
    iFirst = header.indexOf("nombre");
    iLast = header.indexOf("apellido");
    iFull = header.indexOf("jugador");
    iPos = Math.max(header.indexOf("puesto"), header.indexOf("posicion"));
    rows.shift();
  } else if (rows[0].length >= 4) {
    iFirst = 1; iLast = 2; iPos = 3;
  } else {
    iFull = 1; iPos = 2;
  }

  const valid = [], errors = [];
  rows.forEach((r, n) => {
    const line = n + (hasHeader ? 2 : 1);
    const raw = iLast >= 0
      ? { first: iFirst >= 0 ? r[iFirst] : "", last: r[iLast] }
      : { name: r[iFull >= 0 ? iFull : iFirst] };
    const clubRaw = cleanText(r[iClub]);
    const posRaw = iPos >= 0 ? cleanText(r[iPos]) : "";
    const club = clubIndex.get(normKey(clubRaw));
    const player = normalizePlayer({ ...raw, club: club || clubRaw });

    if (!player.last) return errors.push(`Línea ${line}: falta el apellido.`);
    if (!club) return errors.push(`Línea ${line}: club desconocido “${clubRaw}” (${player.name}).`);
    if (posRaw) {
      const position = /^\d+$/.test(posRaw) ? Number(posRaw) : PLAYER_POSITION_NAMES[normKey(posRaw)];
      if (!(position >= 1 && position <= 15)) return errors.push(`Línea ${line}: puesto no válido “${posRaw}” (${player.name}).`);
      player.position = position;
    }
    valid.push(player);
  });

  const { added, repeated } = addPlayers(valid, $("#players-replace")?.checked);
  const report = $("#players-import-report");
  if (report) {
    report.innerHTML = `<b>${added}</b> jugadores listos para guardar` +
      (repeated ? `, ${repeated} repetidos ignorados` : "") +
      (errors.length ? `.<br>⚠ ${errors.length} filas ignoradas:<br>${errors.slice(0, 15).map(esc).join("<br>")}${errors.length > 15 ? "<br>…" : ""}` : ".");
  }
  toast("Importación lista", `${added} jugadores agregados. Falta guardar.`, errors.length ? "error" : "ok");
}

function exportPlayersCSV() {
  const quote = (v) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = ["club,nombre,apellido,puesto"].concat(
    playersDraft
      .slice()
      .sort((a, b) => a.club.localeCompare(b.club) || (a.position || 99) - (b.position || 99))
      .map((p) => [p.club, p.first, p.last, p.position || ""].map(quote).join(","))
  );
  const blob = new Blob(["﻿" + lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "jugadores-droprugby.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

async function savePlayers() {
  const button = $("#players-save");
  try {
    if (button) { button.disabled = true; button.textContent = "GUARDANDO…"; }
    const data = await api("save-players", { players: playersDraft });
    state.content.players = Array.isArray(data.players) ? data.players : playersDraft;
    playersDirty = false;
    renderCounts();
    renderPlayersAdmin(true);
    renderGamesAdmin();
    renderGamesDashboard();
    toast("Jugadores guardados", `${state.content.players.length} jugadores publicados.`);
  } catch (error) {
    toast("No se pudo guardar", error.message || "Probá de nuevo.", "error");
  } finally {
    if (button) { button.disabled = false; button.textContent = "GUARDAR JUGADORES"; }
  }
}

$("#players-save")?.addEventListener("click", savePlayers);
$("#players-export")?.addEventListener("click", exportPlayersCSV);
$("#players-search")?.addEventListener("input", paintPlayersTable);
$("#players-club-filter")?.addEventListener("change", () => { paintPlayersTable(); paintPlayersClubs(); });

$("#players-clubs")?.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-club-chip]");
  if (!chip) return;
  const filter = $("#players-club-filter");
  filter.value = filter.value === chip.dataset.clubChip ? "" : chip.dataset.clubChip;
  if ($("#player-club") && filter.value) $("#player-club").value = filter.value;
  paintPlayersTable();
  paintPlayersClubs();
});

$("#players-import")?.addEventListener("click", async () => {
  const file = $("#players-file")?.files?.[0];
  const pasted = $("#players-paste")?.value || "";
  const text = file ? await file.text() : pasted;
  if (!text.trim()) { toast("Nada para importar", "Elegí un archivo o pegá el texto.", "error"); return; }
  if ($("#players-replace")?.checked && !confirm("Se van a reemplazar todos los jugadores actuales cuando guardes. ¿Seguir?")) return;
  importPlayersFromText(text);
  if ($("#players-file")) $("#players-file").value = "";
  if ($("#players-paste")) $("#players-paste").value = "";
});

$("#player-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const player = normalizePlayer({
    first: $("#player-first").value,
    last: $("#player-last").value,
    club: $("#player-club").value,
    position: $("#player-position").value
  });

  if (!player.last || !player.club) {
    toast("Faltan datos", "Poné el apellido y elegí el club.", "error");
    $("#player-last").focus();
    return;
  }

  const clash = playersDraft.findIndex((p, i) => i !== playerEditing && playerKey(p) === playerKey(player));
  if (clash >= 0) {
    toast("Ya estaba", `${player.name} ya figura en ${player.club}.`, "error");
    return;
  }

  if (playerEditing >= 0) {
    playersDraft[playerEditing] = player;
    toast("Jugador actualizado", "Falta guardar para publicarlo.");
  } else {
    playersDraft.push(player);
  }

  resetPlayerForm();
  markPlayersDirty();
  paintPlayersTable();
  $("#player-first").focus();
});

$("#player-cancel")?.addEventListener("click", () => { resetPlayerForm(); paintPlayersTable(); });

$("#players-table")?.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-player-edit]");
  const del = event.target.closest("[data-player-del]");

  if (edit) {
    playerEditing = Number(edit.dataset.playerEdit);
    const p = playersDraft[playerEditing];
    if (!p) return;
    $("#player-first").value = p.first;
    $("#player-last").value = p.last;
    if (![...$("#player-club").options].some((o) => o.value === p.club)) {
      $("#player-club").insertAdjacentHTML("beforeend", `<option value="${esc(p.club)}">${esc(p.club)}</option>`);
    }
    $("#player-club").value = p.club;
    $("#player-position").value = p.position ? String(p.position) : "";
    $("#player-form-title").textContent = "Editar jugador";
    $("#player-add").textContent = "GUARDAR CAMBIOS";
    $("#player-cancel").classList.remove("hidden");
    paintPlayersTable();
    $("#player-form").scrollIntoView({ behavior: "smooth", block: "center" });
    $("#player-last").focus({ preventScroll: true });
    return;
  }

  if (del) {
    const index = Number(del.dataset.playerDel);
    const p = playersDraft[index];
    if (!p || !confirm(`¿Eliminar a ${p.name} (${p.club})?`)) return;
    playersDraft.splice(index, 1);
    resetPlayerForm();
    markPlayersDirty();
    paintPlayersTable();
  }
});


/* ==========================================================================
   JUEGOS
   Configuración de Rugby XV, Wordle, Escudos y Quiz.
   Se guarda con la acción "save-games" (content.games) y el sitio la lee
   de /api/content. Los valores por defecto son los de assets/js/script.js.
   ========================================================================== */

const GAME_DEFAULTS = {
  xv: { enabled: true, times: [60, 90, 0], flex: { pilares: true, segundas: true, alas: true, centros: true, wings: true } },
  wordle: { enabled: true, attempts: 6, hintClubAfter: 3, hintPositionAfter: 5, manualDate: "", manualPlayer: "" },
  escudos: { enabled: true, rounds: 10 },
  quiz: { enabled: true }
};

const GAME_LABELS = { xv: "Rugby XV", wordle: "Wordle", escudos: "Escudos", quiz: "Quiz" };

let gamesDraft = null;
let gamesDirty = false;

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function gamesFromContent() {
  const r = state.content.games || {};
  const d = GAME_DEFAULTS;
  const times = Array.isArray(r.xv?.times)
    ? [...new Set(r.xv.times.map((t) => clampInt(t, 0, 600, -1)).filter((t) => t >= 0))].slice(0, 4)
    : [];
  return {
    xv: {
      enabled: r.xv?.enabled !== false,
      times: times.length ? times : d.xv.times.slice(),
      flex: { ...d.xv.flex, ...(r.xv?.flex && typeof r.xv.flex === "object" ? r.xv.flex : {}) }
    },
    wordle: {
      enabled: r.wordle?.enabled !== false,
      attempts: clampInt(r.wordle?.attempts, 3, 10, d.wordle.attempts),
      hintClubAfter: clampInt(r.wordle?.hintClubAfter, 0, 10, d.wordle.hintClubAfter),
      hintPositionAfter: clampInt(r.wordle?.hintPositionAfter, 0, 10, d.wordle.hintPositionAfter),
      manualDate: String(r.wordle?.manualDate || ""),
      manualPlayer: String(r.wordle?.manualPlayer || "")
    },
    escudos: { enabled: r.escudos?.enabled !== false, rounds: clampInt(r.escudos?.rounds, 3, 14, d.escudos.rounds) },
    quiz: { enabled: r.quiz?.enabled !== false }
  };
}

function paintGamesStatus() {
  const box = $("#games-status");
  if (!box || !gamesDraft) return;
  const active = Object.keys(GAME_LABELS).filter((id) => gamesDraft[id].enabled).length;

  if ($("#nav-games-count")) $("#nav-games-count").textContent = active;

  if (gamesDirty) {
    box.className = "quiz-status dirty";
    box.innerHTML = "<i></i>Tenés cambios sin guardar. Tocá GUARDAR JUEGOS para publicarlos.";
    return;
  }
  box.className = "quiz-status live";
  box.innerHTML = `<i></i>${active} de 4 juegos activos en el sitio.` +
    (state.content.games?.updatedAt ? ` Último cambio: ${esc(new Date(state.content.games.updatedAt).toLocaleString("es-AR"))}.` : " Configuración por defecto.");
}

function paintGamesInfo() {
  if (!gamesDraft) return;
  const players = workingPlayers();
  const withPos = players.filter((p) => p.position);
  const squads = new Set(withPos.map((p) => p.club)).size;
  const pool = wordlePool(players);
  const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };

  set("#g-xv-info", `${withPos.length} jugadores con puesto · ${squads} clubes`);
  set("#g-wordle-info", `${pool.length} apellidos jugables`);

  const logos = state.content.settings?.clubLogos || {};
  const withLogo = Object.values(logos).filter(Boolean).length;
  set("#g-escudos-info", withLogo ? `${withLogo} clubes con escudo` : "Escudos del sitio");
  const questions = (state.content.quiz || quizSeed)?.questions?.length || 0;
  set("#g-quiz-info", `${questions} preguntas`);

  // Jugador del día
  const today = todayISO();
  const box = $("#g-wordle-today");
  if (box) {
    if (!pool.length) {
      box.textContent = "Todavía no hay apellidos jugables: cargá jugadores.";
    } else {
      const manual = gamesDraft.wordle.manualDate === today && gamesDraft.wordle.manualPlayer
        ? pool.find((e) => normKey(e.player.name) === normKey(gamesDraft.wordle.manualPlayer))
        : null;
      const entry = manual || pool[wordleHash("droprugby-" + today) % pool.length];
      box.innerHTML = `Hoy sale: <b>${esc(entry.player.name)}</b> (${esc(entry.player.club)}) · ${entry.word.length} letras ${manual ? '<span class="pill ok">elegido a mano</span>' : '<span class="pill">automático</span>'}`;
    }
  }

  const select = $("#g-wordle-player");
  if (select) {
    const current = gamesDraft.wordle.manualPlayer;
    select.innerHTML = `<option value="">Automático</option>` + pool
      .map((e) => `<option value="${esc(e.player.name)}">${esc(e.word)} — ${esc(e.player.name)} (${esc(e.player.club)})</option>`).join("");
    select.value = pool.some((e) => e.player.name === current) ? current : "";
  }
}

function paintGamesForm() {
  if (!gamesDraft) return;
  const g = gamesDraft;
  const check = (id, value) => { const el = $(id); if (el) el.checked = !!value; };
  const val = (id, value) => { const el = $(id); if (el) el.value = value; };

  check("#g-xv-enabled", g.xv.enabled);
  check("#g-wordle-enabled", g.wordle.enabled);
  check("#g-escudos-enabled", g.escudos.enabled);
  check("#g-quiz-enabled", g.quiz.enabled);

  $$("#g-xv-times input").forEach((input) => { input.checked = g.xv.times.includes(Number(input.value)); });
  $$("#g-xv-flex input").forEach((input) => { input.checked = g.xv.flex[input.value] !== false; });

  val("#g-wordle-attempts", g.wordle.attempts);
  val("#g-wordle-club", g.wordle.hintClubAfter);
  val("#g-wordle-pos", g.wordle.hintPositionAfter);
  val("#g-wordle-date", g.wordle.manualDate || todayISO());
  val("#g-escudos-rounds", g.escudos.rounds);

  $$("[data-game-panel]").forEach((panel) => {
    panel.classList.toggle("off", !g[panel.dataset.gamePanel].enabled);
  });
}

function renderGamesAdmin(force = false) {
  if (!$("#section-games")) return;
  loadTeamsSeed();
  if (!state.content.players.length) loadPlayersSeed();
  if (!state.content.quiz && typeof loadQuizSeed === "function") loadQuizSeed();

  if (!gamesDirty || force || !gamesDraft) {
    gamesDraft = gamesFromContent();
    gamesDirty = false;
    paintGamesForm();
  }
  paintGamesInfo();
  paintGamesStatus();
}

function readGamesForm() {
  const g = gamesDraft;
  g.xv.enabled = $("#g-xv-enabled").checked;
  g.wordle.enabled = $("#g-wordle-enabled").checked;
  g.escudos.enabled = $("#g-escudos-enabled").checked;
  g.quiz.enabled = $("#g-quiz-enabled").checked;

  // De menor a mayor; "sin tiempo" (0) siempre al final.
  g.xv.times = $$("#g-xv-times input:checked")
    .map((i) => Number(i.value))
    .sort((a, b) => (a || Infinity) - (b || Infinity));
  $$("#g-xv-flex input").forEach((input) => { g.xv.flex[input.value] = input.checked; });

  g.wordle.attempts = clampInt($("#g-wordle-attempts").value, 3, 10, 6);
  g.wordle.hintClubAfter = clampInt($("#g-wordle-club").value, 0, 10, 3);
  g.wordle.hintPositionAfter = clampInt($("#g-wordle-pos").value, 0, 10, 5);
  g.wordle.manualPlayer = $("#g-wordle-player").value;
  g.wordle.manualDate = g.wordle.manualPlayer ? $("#g-wordle-date").value || todayISO() : "";
  g.escudos.rounds = clampInt($("#g-escudos-rounds").value, 3, 14, 10);
}

async function saveGames() {
  if (!gamesDraft) return;
  readGamesForm();

  if (!gamesDraft.xv.times.length) {
    toast("Falta un tiempo", "Rugby XV necesita al menos una opción de tiempo.", "error");
    return;
  }
  if (gamesDraft.xv.times.length > 4) {
    toast("Demasiados tiempos", "Elegí hasta 4 opciones de tiempo para Rugby XV.", "error");
    return;
  }

  const button = $("#games-save");
  try {
    if (button) { button.disabled = true; button.textContent = "GUARDANDO…"; }
    const data = await api("save-games", { games: gamesDraft });
    state.content.games = data.games || gamesDraft;
    gamesDirty = false;
    renderGamesAdmin(true);
    renderGamesDashboard();
    toast("Juegos guardados", "La configuración ya está en el sitio.");
  } catch (error) {
    toast("No se pudo guardar", error.message || "Probá de nuevo.", "error");
  } finally {
    if (button) { button.disabled = false; button.textContent = "GUARDAR JUEGOS"; }
  }
}

$("#games-save")?.addEventListener("click", saveGames);

const onGamesChange = (event) => {
  if (!gamesDraft || !event.target.matches("input, select")) return;
  readGamesForm();
  gamesDirty = true;
  $$("[data-game-panel]").forEach((panel) => {
    panel.classList.toggle("off", !gamesDraft[panel.dataset.gamePanel].enabled);
  });
  paintGamesInfo();
  paintGamesStatus();
};
$("#section-games")?.addEventListener("change", onGamesChange);


/* ==========================================================================
   DASHBOARD — juegos y planteles
   ========================================================================== */

function renderGamesDashboard() {
  buildClubIndex();
  const players = livePlayers();
  const games = gamesFromContent();

  const counts = {};
  players.forEach((p) => { counts[p.club] = (counts[p.club] || 0) + 1; });
  const top14 = TOP14_NAMES.map(canonicalClub);
  const squads = top14.filter((name) => counts[name]).length;

  if ($("#stat-players")) $("#stat-players").textContent = players.length;
  if ($("#stat-squads")) $("#stat-squads").textContent = squads;
  if ($("#nav-players-count")) $("#nav-players-count").textContent = players.length;
  if ($("#nav-games-count") && !gamesDirty) {
    $("#nav-games-count").textContent = Object.keys(GAME_LABELS).filter((id) => games[id].enabled).length;
  }

  const gamesBox = $("#dashboard-games");
  if (gamesBox) {
    const pool = wordlePool(players);
    const detail = {
      xv: `${games.xv.times.map((t) => (t ? t + " s" : "sin tiempo")).join(" · ")}`,
      wordle: `${games.wordle.attempts} intentos · ${pool.length} apellidos`,
      escudos: `${games.escudos.rounds} rondas`,
      quiz: `${(state.content.quiz || quizSeed)?.questions?.length || 0} preguntas`
    };
    gamesBox.innerHTML = Object.entries(GAME_LABELS).map(([id, label]) => `
      <div class="list-item">
        <div><b>${label}</b><small class="muted">${esc(detail[id])}</small></div>
        <span class="pill ${games[id].enabled ? "ok" : "off"}">${games[id].enabled ? "Activo" : "Pausado"}</span>
      </div>`).join("");
  }

  const squadsBox = $("#dashboard-squads");
  if (squadsBox) {
    squadsBox.innerHTML = `<div class="squad-bars">` + top14.map((name) => {
      const n = counts[name] || 0;
      return `<div class="squad-bar ${n ? "" : "empty"}"><span>${esc(name)}</span><i><u style="width:${Math.min(100, (n / 15) * 100)}%"></u></i><b>${n}</b></div>`;
    }).join("") + `</div>`;
  }
}

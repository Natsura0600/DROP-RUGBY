/* =========================================================
   DROPRUGBY ADMIN
   Versión simple:
   - Noticias
   - Programación de noticias
   - Partidos (sin resultados)
   - Resultados URBA TOP 14
   - Tabla calculada automáticamente
========================================================= */

"use strict";

const state = {
  content: {
    articles: [],
    fixtures: [],
    results: [],
    standings: [],
    standingsBase: [],
    settings: {}
  },
  section: "dashboard"
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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

function fixtureKey(fixture) {
  return [
    fixture.date || "",
    fixture.time || "",
    fixture.home || fixture.team1 || fixture.local || "",
    fixture.away || fixture.team2 || fixture.visitante || "",
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

  return `${home} vs ${away}`;
}

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
        : {}
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
    results: "Resultados TOP 14"
  };

  if ($("#page-title")) {
    $("#page-title").textContent =
      titles[section] || "Dashboard";
  }

  closeSidebar();

  if (section === "articles") renderArticles();
  if (section === "fixtures") renderFixtures();
  if (section === "results") renderResults();
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
              <small class="muted">${esc(article.category || "Rugby")}</small>
            </div>
            <span class="badge scheduled">${esc(fmtDT(article.publishAt))}</span>
          </div>
        `
      )
      .join("") ||
    `<div class="list-item muted">No hay noticias programadas.</div>`;

  const pending =
    getPendingFixtures();

  $("#dashboard-pending-results").innerHTML =
    pending
      .slice(0, 6)
      .map(
        (fixture) => `
          <div class="list-item">
            <div>
              <b>${esc(getFixtureName(fixture))}</b>
              <small class="muted">
                ${esc(fixture.date || "—")}
                ${fixture.time ? ` · ${esc(fixture.time)}` : ""}
              </small>
            </div>
            <button class="action" data-add-result="${esc(fixture.id || fixtureKey(fixture))}">
              CARGAR RESULTADO
            </button>
          </div>
        `
      )
      .join("") ||
    `<div class="list-item muted">No hay resultados pendientes.</div>`;
}

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
    `<tr><td colspan="5" class="muted">No hay noticias.</td></tr>`;
}

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

            <td>${esc(fixture.date || fmt(fixture.datetime))}</td>

            <td>${esc(fixture.time || "—")}</td>

            <td>${esc(fixture.competition || "—")}</td>

            <td>
              <div class="actions">
                <button
                  class="action"
                  data-edit-fixture="${esc(fixture.id || fixtureKey(fixture))}"
                >
                  EDITAR
                </button>

                <button
                  class="action"
                  data-delete-fixture="${esc(fixture.id || fixtureKey(fixture))}"
                >
                  BORRAR
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join("") ||
    `<tr><td colspan="5" class="muted">No hay partidos.</td></tr>`;
}

/* =========================================================
   RESULTADOS
========================================================= */

function resultForFixture(fixture) {
  const key =
    fixture.id || fixtureKey(fixture);

  return state.content.results.find(
    (result) =>
      String(result.fixtureId || "") === String(key) ||
      String(result.fixtureKey || "") === fixtureKey(fixture)
  );
}

function getPendingFixtures() {
  return state.content.fixtures
    .filter(isURBATop14)
    .filter((fixture) => !resultForFixture(fixture))
    .sort(
      (a, b) =>
        String(a.date || "").localeCompare(
          String(b.date || "")
        )
    );
}

function renderResults() {
  const results =
    [...state.content.results]
      .filter(
        (result) =>
          String(result.competition || "")
            .toUpperCase() === "URBA TOP 14"
      )
      .sort(
        (a, b) =>
          String(b.date || "").localeCompare(
            String(a.date || "")
          )
      );

  $("#results-list").innerHTML =
    results
      .map(
        (result) => `
          <div class="list-item result-row">
            <div>
              <b>
                ${esc(result.home || "Local")}
                <strong>${esc(result.homeScore)}</strong>
                —
                <strong>${esc(result.awayScore)}</strong>
                ${esc(result.away || "Visitante")}
              </b>

              <small class="muted">
                ${esc(result.date || "—")}
                · Bonus:
                ${result.bonusTeam ? esc(result.bonusTeam) : "ninguno"}
              </small>
            </div>

            <div class="actions">
              <button
                class="action"
                data-edit-result="${esc(result.id)}"
              >
                EDITAR
              </button>

              <button
                class="action"
                data-delete-result="${esc(result.id)}"
              >
                BORRAR
              </button>
            </div>
          </div>
        `
      )
      .join("") ||
    `<div class="list-item muted">Todavía no hay resultados cargados.</div>`;

  renderStandingsTable();
  renderStandingsBaseEditor();

  const pending = getPendingFixtures();

  $("#results-pending").innerHTML = pending.length
    ? `
      <div class="result-pending-list">
        <div class="result-pending-title">
          PARTIDOS SIN RESULTADO
        </div>
        ${pending
          .map(
            (fixture) => `
              <div class="list-item">
                <div>
                  <b>${esc(getFixtureName(fixture))}</b>
                  <small class="muted">
                    ${esc(fixture.date || "—")}
                    ${fixture.time ? ` · ${esc(fixture.time)}` : ""}
                  </small>
                </div>
                <button
                  class="action"
                  data-add-result="${esc(fixture.id || fixtureKey(fixture))}"
                >
                  CARGAR
                </button>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : "";
}

function calculateStandings() {
  const teams = new Map();

  // Tabla base: fechas ya jugadas antes de empezar a cargar
  // resultado por resultado desde este panel.
  const baseByTeam = new Map();

  (state.content.standingsBase || []).forEach((base) => {
    const cleanName = String(base.team || "").trim();
    if (!cleanName) return;

    baseByTeam.set(cleanName.toLowerCase(), {
      pj: Number(base.pj) || 0,
      pg: Number(base.pg) || 0,
      pe: Number(base.pe) || 0,
      pp: Number(base.pp) || 0,
      diff: Number(base.diff) || 0,
      pts: Number(base.pts) || 0
    });
  });

  const ensureTeam = (name) => {
    const clean = String(name || "").trim();

    if (!clean) return null;

    const key = clean.toLowerCase();

    if (!teams.has(key)) {
      const base = baseByTeam.get(key);

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

  (state.content.standingsBase || []).forEach((base) => ensureTeam(base.team));

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
        String(result.competition || "")
          .toUpperCase() === "URBA TOP 14"
    )
    .forEach((result) => {
      const home = ensureTeam(result.home);
      const away = ensureTeam(result.away);

      if (!home || !away) return;

      const hs = Number(result.homeScore);
      const as = Number(result.awayScore);

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

      const bonus =
        String(result.bonusTeam || "")
          .trim()
          .toLowerCase();

      if (
        bonus &&
        bonus === home.team.toLowerCase()
      ) {
        home.bonus++;
        home.pts++;
      }

      if (
        bonus &&
        bonus === away.team.toLowerCase()
      ) {
        away.bonus++;
        away.pts++;
      }
    });

  return [...teams.values()]
    .map((team) => ({
      ...team,
      diff: (team.baseDiff || 0) + (team.pf - team.pc)
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
  const standings = calculateStandings();

  $("#results-standings-table").innerHTML =
    standings
      .map(
        (team, index) => `
          <tr>
            <td><strong>${index + 1}</strong></td>
            <td><strong>${esc(team.team)}</strong></td>
            <td>${team.pj}</td>
            <td>${team.pg}</td>
            <td>${team.pe}</td>
            <td>${team.pp}</td>
            <td>${team.pf}</td>
            <td>${team.pc}</td>
            <td>${team.diff > 0 ? "+" : ""}${team.diff}</td>
            <td>${team.bonus}</td>
            <td><strong>${team.pts}</strong></td>
          </tr>
        `
      )
      .join("") ||
    `<tr><td colspan="11" class="muted">No hay equipos de URBA TOP 14.</td></tr>`;
}

function renderStandingsBaseEditor() {
  const tbody = $("#standings-base-table");
  if (!tbody) return;

  const rows = state.content.standingsBase?.length
    ? state.content.standingsBase
    : [{ team: "", pj: 0, pg: 0, pe: 0, pp: 0, diff: 0, pts: 0 }];

  tbody.innerHTML = rows
    .map(
      (row, i) => `
        <tr data-row="${i}">
          <td><input type="text" class="sb-team" value="${esc(row.team ?? "")}" placeholder="Nombre del equipo"></td>
          <td><input type="number" class="sb-pj" value="${Number(row.pj) || 0}" style="width:56px;"></td>
          <td><input type="number" class="sb-pg" value="${Number(row.pg) || 0}" style="width:56px;"></td>
          <td><input type="number" class="sb-pe" value="${Number(row.pe) || 0}" style="width:56px;"></td>
          <td><input type="number" class="sb-pp" value="${Number(row.pp) || 0}" style="width:56px;"></td>
          <td><input type="number" class="sb-diff" value="${Number(row.diff) || 0}" style="width:64px;"></td>
          <td><input type="number" class="sb-pts" value="${Number(row.pts) || 0}" style="width:64px;"></td>
          <td><button class="action sb-remove" data-remove="${i}">✕</button></td>
        </tr>
      `
    )
    .join("");

  tbody.querySelectorAll(".sb-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rows = readStandingsBaseFromForm();
      const idx = Number(btn.dataset.remove);
      rows.splice(idx, 1);
      state.content.standingsBase = rows;
      renderStandingsBaseEditor();
    });
  });
}

function readStandingsBaseFromForm() {
  return $$("#standings-base-table tr").map((tr) => ({
    team: tr.querySelector(".sb-team")?.value.trim() || "",
    pj: Number(tr.querySelector(".sb-pj")?.value) || 0,
    pg: Number(tr.querySelector(".sb-pg")?.value) || 0,
    pe: Number(tr.querySelector(".sb-pe")?.value) || 0,
    pp: Number(tr.querySelector(".sb-pp")?.value) || 0,
    diff: Number(tr.querySelector(".sb-diff")?.value) || 0,
    pts: Number(tr.querySelector(".sb-pts")?.value) || 0
  }));
}

$("#standings-base-add-row")?.addEventListener("click", () => {
  const rows = readStandingsBaseFromForm();
  rows.push({ team: "", pj: 0, pg: 0, pe: 0, pp: 0, diff: 0, pts: 0 });
  state.content.standingsBase = rows;
  renderStandingsBaseEditor();
});

$("#standings-base-save")?.addEventListener("click", async () => {
  const rows = readStandingsBaseFromForm().filter((row) => row.team);

  try {
    const data = await api("save-standings-base", { standingsBase: rows });
    state.content.standingsBase = data.standingsBase || rows;
    state.content.standings = data.standings || state.content.standings;
    renderStandingsBaseEditor();
    renderStandingsTable();
    toast("Guardado", "Tabla base actualizada.");
  } catch (error) {
    toast("Error", error.message, "error");
  }
});

/* =========================================================
   MODALES
========================================================= */

function closeModal() {
  $("#modal-root").innerHTML = "";
}

function openModal(title, html, onSubmit) {
  const root = $("#modal-root");

  root.innerHTML = `
    <div class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button type="button" class="modal-close">×</button>
        </div>

        <form id="modal-form">
          <div class="modal-body">${html}</div>

          <div class="modal-actions">
            <button type="button" class="action modal-cancel">
              CANCELAR
            </button>

            <button class="btn primary" type="submit">
              GUARDAR
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  root.querySelector(".modal-close").onclick =
    closeModal;

  root.querySelector(".modal-cancel").onclick =
    closeModal;

  root.querySelector(".modal-back").addEventListener(
    "click",
    (event) => {
      if (event.target.classList.contains("modal-back")) {
        closeModal();
      }
    }
  );

  root.querySelector("#modal-form").onsubmit =
    async (event) => {
      event.preventDefault();

      const button =
        event.submitter;

      button.disabled = true;

      try {
        await onSubmit(
          new FormData(event.target)
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
  return String(fd.get(key) || "").trim();
}

function checked(fd, key) {
  return fd.get(key) === "on";
}

/* =========================================================
   NOTICIAS
========================================================= */

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
            "URBA",
            "Internacional",
            "Rugby"
          ]
            .map(
              (category) =>
                `<option ${article.category === category ? "selected" : ""}>${category}</option>`
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
        <textarea name="excerpt" rows="3">${esc(article.excerpt || "")}</textarea>
      </label>

      <label class="full">
        URL de imagen pública
        <input
          name="imageUrl"
          placeholder="https://..."
          value="${esc(article.imageUrl || article.image || "")}"
        >
      </label>

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

        category:
          value(fd, "category") ||
          "Rugby",

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
}

/* =========================================================
   PARTIDOS
========================================================= */

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
          value="${esc(fixture.date || "")}"
        >
      </label>

      <label>
        Hora
        <input
          type="time"
          name="time"
          value="${esc(fixture.time || "")}"
        >
      </label>

      <label>
        Competición
        <select name="competition">
          ${[
            "Los Pumas",
            "Super Rugby",
            "URBA TOP 14",
            "URBA"
          ]
            .map(
              (competition) =>
                `<option ${fixture.competition === competition ? "selected" : ""}>${competition}</option>`
            )
            .join("")}
        </select>
      </label>

      <label>
        Canal
        <input
          name="channel"
          value="${esc(fixture.channel || "")}"
          placeholder="ESPN / URBA Play / Disney+"
        >
      </label>

      <label class="full">
        Cancha / sede
        <input
          name="venue"
          value="${esc(fixture.venue || "")}"
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
    Boolean(fixture.id || fixtureKey(fixture));

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

        fixtureKey:
          fixtureKey(fixture),

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

function getFixtureByReference(reference) {
  return state.content.fixtures.find(
    (fixture) => {
      const id = String(fixture.id || "");
      const key = fixtureKey(fixture);
      return id === String(reference) || key === String(reference);
    }
  );
}

function resultForm(existing = {}, selectedFixture = null) {
  const usedFixtureKeys =
    new Set(
      state.content.results
        .filter(
          (result) =>
            !existing.id ||
            String(result.id) !== String(existing.id)
        )
        .map(
          (result) =>
            String(result.fixtureId || result.fixtureKey || "")
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
            (
              key ===
              String(
                selectedFixture.id ||
                fixtureKey(selectedFixture)
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
        <select name="fixtureRef" required>
          <option value="">Seleccioná un partido...</option>

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
                    ${key === selectedValue ? "selected" : ""}
                  >
                    ${esc(getFixtureName(fixture))}
                    — ${esc(fixture.date || "")}
                    ${fixture.time ? ` · ${esc(fixture.time)}` : ""}
                  </option>
                `;
              }
            )
            .join("")}
        </select>
      </label>

      <label>
        ${esc(currentFixture?.home || "Local")}
        <input
          type="number"
          name="homeScore"
          min="0"
          step="1"
          required
          value="${esc(existing.homeScore ?? "")}"
        >
      </label>

      <label>
        ${esc(currentFixture?.away || "Visitante")}
        <input
          type="number"
          name="awayScore"
          min="0"
          step="1"
          required
          value="${esc(existing.awayScore ?? "")}"
        >
      </label>

      <label class="full">
        Punto bonus
        <select name="bonusTeam">
          <option value="" ${!existing.bonusTeam ? "selected" : ""}>
            Ninguno
          </option>
          <option
            value="${esc(currentFixture?.home || "")}"
            ${existing.bonusTeam === currentFixture?.home ? "selected" : ""}
          >
            ${esc(currentFixture?.home || "Local")}
          </option>
          <option
            value="${esc(currentFixture?.away || "")}"
            ${existing.bonusTeam === currentFixture?.away ? "selected" : ""}
          >
            ${esc(currentFixture?.away || "Visitante")}
          </option>
        </select>
      </label>

      <p class="form-help full">
        Victoria = 4 puntos · Empate = 2 puntos · Derrota = 0 puntos ·
        Punto bonus = +1 punto.
      </p>

    </div>
  `;
}

function openResult(existing = {}, fixture = null) {
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
    resultForm(existing, target),
    async (fd) => {
      const fixtureRef =
        value(fd, "fixtureRef");

      const selected =
        getFixtureByReference(fixtureRef);

      if (!selected) {
        throw new Error(
          "Seleccioná un partido válido."
        );
      }

      const homeScore =
        Number(value(fd, "homeScore"));

      const awayScore =
        Number(value(fd, "awayScore"));

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
          value(fd, "bonusTeam") || null
      };

      await api(
        "save-result",
        { result }
      );
    }
  );
}

/* =========================================================
   BORRADO
========================================================= */

async function deleteItem(action, itemId) {
  if (
    !confirm(
      "¿Seguro que querés borrar este elemento?"
    )
  ) {
    return;
  }

  try {
    await api(action, { id: itemId });
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
   EVENTOS
========================================================= */

document.addEventListener("click", (event) => {
  const nav =
    event.target.closest(".nav-item");

  if (nav) {
    switchSection(
      nav.dataset.section
    );
    return;
  }

  const go =
    event.target.closest("[data-go]");

  if (go) {
    switchSection(go.dataset.go);
    return;
  }

  if (
    event.target.closest("#dashboard-new-article") ||
    event.target.closest("#new-article-button")
  ) {
    openArticle();
    return;
  }

  if (
    event.target.closest("#new-fixture-button")
  ) {
    openFixture();
    return;
  }

  if (
    event.target.closest("#new-result-button")
  ) {
    openResult();
    return;
  }

  const addResult =
    event.target.closest("[data-add-result]");

  if (addResult) {
    const fixture =
      getFixtureByReference(
        addResult.dataset.addResult
      );

    if (fixture) {
      openResult({}, fixture);
    }

    return;
  }

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
            editArticle.dataset.editArticle
          )
      );

    if (article) {
      openArticle(article);
    }

    return;
  }

  const deleteArticle =
    event.target.closest(
      "[data-delete-article]"
    );

  if (deleteArticle) {
    deleteItem(
      "delete-article",
      deleteArticle.dataset.deleteArticle
    );

    return;
  }

  const editFixture =
    event.target.closest(
      "[data-edit-fixture]"
    );

  if (editFixture) {
    const fixture =
      getFixtureByReference(
        editFixture.dataset.editFixture
      );

    if (fixture) {
      openFixture(fixture);
    }

    return;
  }

  const deleteFixture =
    event.target.closest(
      "[data-delete-fixture]"
    );

  if (deleteFixture) {
    deleteItem(
      "delete-fixture",
      deleteFixture.dataset.deleteFixture
    );

    return;
  }

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
            editResult.dataset.editResult
          )
      );

    if (result) {
      openResult(result);
    }

    return;
  }

  const deleteResult =
    event.target.closest(
      "[data-delete-result]"
    );

  if (deleteResult) {
    deleteItem(
      "delete-result",
      deleteResult.dataset.deleteResult
    );
  }
});

$("#login-form")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    $("#login-error").textContent = "";

    try {
      const data = await api(
        "login",
        {
          username:
            $("#login-user").value,

          password:
            $("#login-password").value
        }
      );

      showApp(
        data.user || "admin"
      );

      $("#login-password").value = "";
    } catch (error) {
      $("#login-error").textContent =
        error.message;

      toast(
        "Error de acceso",
        error.message,
        "error"
      );
    }
  }
);

$("#logout-button")?.addEventListener(
  "click",
  async () => {
    try {
      await api("logout");
    } catch {
      // La sesión visual se limpia igual.
    }

    showLogin();
  }
);

$("#refresh-button")?.addEventListener(
  "click",
  () => {
    getContent(true).catch((error) =>
      toast(
        "Error",
        error.message,
        "error"
      )
    );
  }
);

$("#menu-button")?.addEventListener(
  "click",
  () => {
    $("#sidebar")?.classList.add("open");
    $("#sidebar-overlay")?.classList.add("show");
  }
);

$("#sidebar-close")?.addEventListener(
  "click",
  closeSidebar
);

$("#sidebar-overlay")?.addEventListener(
  "click",
  closeSidebar
);

$("#article-search")?.addEventListener(
  "input",
  renderArticles
);

$("#article-category-filter")?.addEventListener(
  "change",
  renderArticles
);

$("#fixture-search")?.addEventListener(
  "input",
  renderFixtures
);

$("#fixture-competition-filter")?.addEventListener(
  "change",
  renderFixtures
);

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeSidebar();
    }
  }
);

checkSession();

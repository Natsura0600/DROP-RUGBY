/* ============================================================
   DROP RUGBY — ADMIN JS
============================================================ */

"use strict";


/* ============================================================
   STATE
============================================================ */

const state = {

  articles: [],
  fixtures: [],
  standings: [],
  players: [],
  trash: [],
  history: [],

  currentSection: "dashboard",

  editingArticle: null,
  editingFixture: null,
  editingTeam: null,
  editingPlayer: null,

  confirmCallback: null

};


/* ============================================================
   DOM HELPERS
============================================================ */

const $ = (selector) =>
  document.querySelector(selector);


const $$ = (selector) =>
  document.querySelectorAll(selector);


function escapeHTML(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getId(item) {

  return (
    item?.id ??
    item?._id ??
    item?.slug ??
    crypto.randomUUID()
  );

}


function normalizeArray(value) {

  if (Array.isArray(value)) {
    return value;
  }

  return [];

}


/* ============================================================
   API
============================================================ */

async function apiRequest(action, options = {}) {

  const {
    method = "GET",
    body = null
  } = options;


  const url =
    `/api/admin?action=${encodeURIComponent(action)}`;


  const request = {

    method,

    credentials: "include",

    headers: {
      "Accept": "application/json"
    }

  };


  if (body !== null) {

    request.headers["Content-Type"] =
      "application/json";

    request.body =
      JSON.stringify(body);

  }


  const response =
    await fetch(url, request);


  let data = null;

  try {

    data =
      await response.json();

  } catch {

    data = {};

  }


  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      `Error ${response.status}`
    );

  }


  return data;

}


/* ============================================================
   LOGIN
============================================================ */

async function checkSession() {

  try {

    const data =
      await apiRequest("session");

    if (
      data?.authenticated ||
      data?.loggedIn ||
      data?.user
    ) {

      showAdmin();

      if (data.user) {
        updateAdminUser(data.user);
      }

      await loadAll();

      return true;

    }

  } catch (error) {

    console.log(
      "Sesión no iniciada:",
      error.message
    );

  }

  showLogin();

  return false;

}


function showLogin() {

  const login =
    $("#login-screen");

  const app =
    $("#admin-app");


  if (login) {
    login.hidden = false;
  }

  if (app) {
    app.hidden = true;
  }

}


function showAdmin() {

  const login =
    $("#login-screen");

  const app =
    $("#admin-app");


  if (login) {
    login.hidden = true;
  }

  if (app) {
    app.hidden = false;
  }

}


function updateAdminUser(username) {

  const element =
    $("#admin-username");

  if (!element) {
    return;
  }

  if (typeof username === "object") {

    username =
      username.username ||
      username.name ||
      "Admin";

  }

  element.textContent =
    username || "Admin";

}


/* ============================================================
   LOGIN SUBMIT
============================================================ */

async function handleLogin(event) {

  event.preventDefault();


  const username =
    $("#login-user")?.value.trim();

  const password =
    $("#login-password")?.value;


  const errorElement =
    $("#login-error");


  if (errorElement) {
    errorElement.hidden = true;
  }


  const button =
    $("#login-form button[type='submit']");


  const originalText =
    button?.innerHTML;


  if (button) {

    button.disabled = true;

    button.innerHTML =
      "Ingresando...";

  }


  try {

    const data =
      await apiRequest("login", {

        method: "POST",

        body: {
          username,
          password
        }

      });


    if (
      data?.success === false ||
      data?.authenticated === false
    ) {

      throw new Error(
        data?.error ||
        "Usuario o contraseña incorrectos."
      );

    }


    showAdmin();


    updateAdminUser(
      data?.user ||
      username ||
      "Admin"
    );


    await loadAll();


    showToast(
      "Sesión iniciada correctamente.",
      "success"
    );


  } catch (error) {

    if (errorElement) {

      errorElement.textContent =
        error.message ||
        "No se pudo iniciar sesión.";

      errorElement.hidden = false;

    }

  } finally {

    if (button) {

      button.disabled = false;

      button.innerHTML =
        originalText;

    }

  }

}


/* ============================================================
   LOGOUT
============================================================ */

async function logout() {

  try {

    await apiRequest("logout", {
      method: "POST"
    });

  } catch (error) {

    console.warn(
      "Logout:",
      error.message
    );

  }


  state.articles = [];
  state.fixtures = [];
  state.standings = [];
  state.players = [];
  state.trash = [];
  state.history = [];


  showLogin();

  showToast(
    "Sesión cerrada.",
    "success"
  );

}


/* ============================================================
   LOAD EVERYTHING
============================================================ */

async function loadAll() {

  try {

    const data =
      await apiRequest("data");


    state.articles =
      normalizeArray(
        data?.articles ||
        data?.content?.articles
      );


    state.fixtures =
      normalizeArray(
        data?.fixtures ||
        data?.content?.fixtures
      );


    state.standings =
      normalizeArray(
        data?.standings ||
        data?.content?.standings ||
        data?.teams
      );


    state.players =
      normalizeArray(
        data?.players ||
        data?.content?.players
      );


    state.trash =
      normalizeArray(
        data?.trash ||
        data?.content?.trash
      );


    state.history =
      normalizeArray(
        data?.history ||
        data?.content?.history
      );


    renderEverything();


  } catch (error) {

    console.error(
      "Error cargando datos:",
      error
    );


    /*
      Compatibilidad adicional:
      Si el endpoint "data" no existe pero
      el API devuelve el contenido directamente,
      intentamos cargar desde /api/admin.
    */

    try {

      const fallback =
        await fetch(
          "/api/admin",
          {
            credentials: "include"
          }
        );


      if (fallback.ok) {

        const data =
          await fallback.json();


        state.articles =
          normalizeArray(data?.articles);

        state.fixtures =
          normalizeArray(data?.fixtures);

        state.standings =
          normalizeArray(
            data?.standings ||
            data?.teams
          );

        state.players =
          normalizeArray(data?.players);

        state.trash =
          normalizeArray(data?.trash);

        state.history =
          normalizeArray(data?.history);


        renderEverything();

      }

    } catch (fallbackError) {

      console.error(
        fallbackError
      );

      showToast(
        "No se pudieron cargar los datos.",
        "error"
      );

    }

  }

}


/* ============================================================
   RENDER EVERYTHING
============================================================ */

function renderEverything() {

  updateStats();

  renderDashboard();

  renderArticles();

  renderFixtures();

  renderStandings();

  renderPlayers();

  renderInstagram();

  renderTrash();

  renderHistory();

  updateTrashCount();

}


/* ============================================================
   STATS
============================================================ */

function updateStats() {

  const articleCount =
    $("#stat-articles");

  const fixtureCount =
    $("#stat-fixtures");

  const teamCount =
    $("#stat-teams");

  const playerCount =
    $("#stat-players");


  if (articleCount) {

    articleCount.textContent =
      state.articles.length;

  }


  if (fixtureCount) {

    fixtureCount.textContent =
      state.fixtures.length;

  }


  if (teamCount) {

    teamCount.textContent =
      state.standings.length;

  }


  if (playerCount) {

    playerCount.textContent =
      state.players.length;

  }

}


/* ============================================================
   SECTION NAVIGATION
============================================================ */

function showSection(section) {

  if (!section) {
    return;
  }


  state.currentSection =
    section;


  $$(".admin-section")
    .forEach(element => {

      element.classList.toggle(
        "active",
        element.id ===
          `section-${section}`
      );

    });


  $$(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.section ===
          section
      );

    });


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  const sidebar =
    $(".sidebar");

  if (sidebar) {
    sidebar.classList.remove(
      "mobile-open"
    );
  }

}


/* ============================================================
   DASHBOARD
============================================================ */

function renderDashboard() {

  renderDashboardArticles();

  renderDashboardFixtures();

}


function renderDashboardArticles() {

  const container =
    $("#dashboard-articles");

  if (!container) {
    return;
  }


  const articles =
    [...state.articles]
      .sort(
        (a, b) =>
          getDateValue(b) -
          getDateValue(a)
      )
      .slice(0, 6);


  if (!articles.length) {

    container.innerHTML =
      emptyState(
        "📰",
        "No hay noticias",
        "Creá tu primera noticia."
      );

    return;

  }


  container.innerHTML =
    articles
      .map(article => {

        const image =
          article.image ||
          article.imageUrl ||
          article.cover ||
          "";


        return `
          <div class="dashboard-item">

            ${
              image
                ? `
                  <div class="dashboard-thumb">
                    <img
                      src="${escapeHTML(image)}"
                      alt=""
                    >
                  </div>
                `
                : ""
            }

            <div class="dashboard-item-main">

              <div class="dashboard-item-title">
                ${escapeHTML(
                  article.title ||
                  "Sin título"
                )}
              </div>

              <div class="dashboard-item-meta">
                ${escapeHTML(
                  article.category ||
                  "Rugby"
                )}
                ·
                ${formatDate(
                  article.date ||
                  article.createdAt
                )}
              </div>

            </div>

          </div>
        `;

      })
      .join("");

}


function renderDashboardFixtures() {

  const container =
    $("#dashboard-fixtures");

  if (!container) {
    return;
  }


  const fixtures =
    [...state.fixtures]
      .sort(
        (a, b) =>
          getFixtureDateValue(a) -
          getFixtureDateValue(b)
      )
      .slice(0, 6);


  if (!fixtures.length) {

    container.innerHTML =
      emptyState(
        "🏉",
        "No hay partidos",
        "Agregá un partido al calendario."
      );

    return;

  }


  container.innerHTML =
    fixtures
      .map(fixture => {

        const home =
          fixture.home ||
          fixture.homeTeam ||
          fixture.local ||
          "Local";


        const away =
          fixture.away ||
          fixture.awayTeam ||
          fixture.visitante ||
          "Visitante";


        return `
          <div class="dashboard-item">

            <div class="dashboard-item-main">

              <div class="dashboard-item-title">
                ${escapeHTML(home)}
                <span class="text-muted">
                  vs
                </span>
                ${escapeHTML(away)}
              </div>

              <div class="dashboard-item-meta">

                ${formatFixtureDate(fixture)}

                ${
                  fixture.competition
                    ? ` · ${escapeHTML(
                        fixture.competition
                      )}`
                    : ""
                }

              </div>

            </div>

          </div>
        `;

      })
      .join("");

}


/* ============================================================
   ARTICLES
============================================================ */

function renderArticles() {

  const container =
    $("#articles-table");

  if (!container) {
    return;
  }


  const search =
    $("#article-search")
      ?.value
      ?.toLowerCase()
      .trim() || "";


  const filter =
    $("#article-filter")
      ?.value ||
      "all";


  let articles =
    [...state.articles];


  if (search) {

    articles =
      articles.filter(article => {

        const text =
          [
            article.title,
            article.excerpt,
            article.content,
            article.category
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


        return text.includes(search);

      });

  }


  if (filter !== "all") {

    articles =
      articles.filter(
        article =>
          getArticleStatus(article) ===
          filter
      );

  }


  articles.sort(
    (a, b) =>
      getDateValue(b) -
      getDateValue(a)
  );


  if (!articles.length) {

    container.innerHTML =
      emptyState(
        "📰",
        "No hay noticias",
        "Probá cambiar los filtros o crear una noticia."
      );

    return;

  }


  container.innerHTML = `

    <table class="admin-table">

      <thead>

        <tr>

          <th>Noticia</th>
          <th>Categoría</th>
          <th>Estado</th>
          <th>Fecha</th>
          <th></th>

        </tr>

      </thead>

      <tbody>

        ${articles.map(article => {

          const id =
            getId(article);


          return `

            <tr>

              <td>

                <div class="table-title">
                  ${escapeHTML(
                    article.title ||
                    "Sin título"
                  )}
                </div>

                <div class="table-subtitle">
                  ID:
                  ${escapeHTML(id)}
                </div>

              </td>


              <td>
                ${escapeHTML(
                  article.category ||
                  "Rugby"
                )}
              </td>


              <td>
                ${statusBadge(
                  getArticleStatus(article)
                )}
              </td>


              <td>
                ${formatDate(
                  article.date ||
                  article.createdAt
                )}
              </td>


              <td>

                <div class="table-actions">

                  <button
                    class="icon-btn"
                    title="Editar"
                    data-edit-article="${escapeHTML(id)}"
                  >
                    ✎
                  </button>

                  <button
                    class="icon-btn accent"
                    title="Newsletter"
                    data-newsletter-article="${escapeHTML(id)}"
                  >
                    ✉
                  </button>

                  <button
                    class="icon-btn danger"
                    title="Eliminar"
                    data-delete-article="${escapeHTML(id)}"
                  >
                    ×
                  </button>

                </div>

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


/* ============================================================
   ARTICLE MODAL
============================================================ */

function openArticleModal(article = null) {

  state.editingArticle =
    article;


  const modal =
    $("#article-modal");


  if (!modal) {
    return;
  }


  $("#article-modal-title").textContent =
    article
      ? "Editar noticia"
      : "Nueva noticia";


  $("#article-id").value =
    article
      ? getId(article)
      : "";


  $("#article-title").value =
    article?.title ||
    "";


  $("#article-category").value =
    article?.category ||
    "Rugby";


  $("#article-status").value =
    getArticleStatus(article) ||
    "published";


  $("#article-image").value =
    article?.image ||
    article?.imageUrl ||
    article?.cover ||
    "";


  $("#article-excerpt").value =
    article?.excerpt ||
    article?.description ||
    "";


  $("#article-content").value =
    article?.content ||
    article?.body ||
    "";


  $("#article-date").value =
    toDatetimeLocal(
      article?.publishAt ||
      article?.publishedAt ||
      article?.date
    );


  toggleScheduleFields();


  modal.hidden = false;

}


function closeModal(id) {

  const modal =
    document.getElementById(id);

  if (!modal) {
    return;
  }

  modal.hidden = true;

}


function toggleScheduleFields() {

  const status =
    $("#article-status")?.value;


  const fields =
    $("#schedule-fields");


  if (!fields) {
    return;
  }


  fields.hidden =
    status !== "scheduled";

}


async function saveArticle(event) {

  event.preventDefault();


  const id =
    $("#article-id").value.trim();


  const article = {

    id:
      id ||
      crypto.randomUUID(),

    title:
      $("#article-title").value.trim(),

    category:
      $("#article-category").value,

    status:
      $("#article-status").value,

    image:
      $("#article-image").value.trim(),

    excerpt:
      $("#article-excerpt").value.trim(),

    content:
      $("#article-content").value,

    publishAt:
      $("#article-date").value ||
      null,

    date:
      $("#article-date").value ||
      new Date().toISOString()

  };


  if (!article.title) {

    showToast(
      "El título es obligatorio.",
      "error"
    );

    return;

  }


  const submit =
    $("#article-form button[type='submit']");


  setButtonLoading(
    submit,
    true,
    "Guardando..."
  );


  try {

    const action =
      id
        ? "update-article"
        : "create-article";


    await apiRequest(
      action,
      {
        method: "POST",
        body: article
      }
    );


    closeModal("article-modal");


    showToast(
      id
        ? "Noticia actualizada."
        : "Noticia creada.",
      "success"
    );


    await loadAll();


  } catch (error) {

    showToast(
      error.message ||
      "No se pudo guardar la noticia.",
      "error"
    );

  } finally {

    setButtonLoading(
      submit,
      false,
      "Guardar noticia"
    );

  }

}


/* ============================================================
   ARTICLE DELETE
============================================================ */

function deleteArticle(id) {

  const article =
    findById(
      state.articles,
      id
    );


  if (!article) {
    return;
  }


  openConfirm(
    "Enviar a papelera",
    `¿Querés mover "${article.title || "esta noticia"}" a la papelera?`,
    async () => {

      try {

        await apiRequest(
          "delete-article",
          {
            method: "POST",
            body: {
              id
            }
          }
        );


        showToast(
          "Noticia enviada a la papelera.",
          "success"
        );


        await loadAll();


      } catch (error) {

        showToast(
          error.message,
          "error"
        );

      }

    }
  );

}


/* ============================================================
   NEWSLETTER
============================================================ */

function newsletterArticle(id) {

  const article =
    findById(
      state.articles,
      id
    );


  if (!article) {
    return;
  }


  openConfirm(
    "Enviar newsletter",
    `¿Querés enviar el newsletter de "${article.title}"?`,
    async () => {

      try {

        await apiRequest(
          "newsletter",
          {
            method: "POST",
            body: {
              articleId: id,
              article
            }
          }
        );


        showToast(
          "Newsletter enviado correctamente.",
          "success"
        );


      } catch (error) {

        showToast(
          error.message ||
          "No se pudo enviar el newsletter.",
          "error"
        );

      }

    }
  );

}


/* ============================================================
   FIXTURES
============================================================ */

function renderFixtures() {

  const container =
    $("#fixtures-table");

  if (!container) {
    return;
  }


  const search =
    $("#fixture-search")
      ?.value
      ?.toLowerCase()
      .trim() || "";


  let fixtures =
    [...state.fixtures];


  if (search) {

    fixtures =
      fixtures.filter(fixture => {

        const text =
          [
            fixture.home,
            fixture.homeTeam,
            fixture.local,
            fixture.away,
            fixture.awayTeam,
            fixture.visitante,
            fixture.competition,
            fixture.venue
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


        return text.includes(search);

      });

  }


  fixtures.sort(
    (a, b) =>
      getFixtureDateValue(a) -
      getFixtureDateValue(b)
  );


  if (!fixtures.length) {

    container.innerHTML =
      emptyState(
        "🏉",
        "No hay partidos",
        "Agregá un nuevo partido."
      );

    return;

  }


  container.innerHTML = `

    <table class="admin-table">

      <thead>

        <tr>

          <th>Fecha</th>
          <th>Partido</th>
          <th>Competición</th>
          <th>Estado</th>
          <th></th>

        </tr>

      </thead>

      <tbody>

        ${fixtures.map(fixture => {

          const id =
            getId(fixture);


          const home =
            fixture.home ||
            fixture.homeTeam ||
            fixture.local ||
            "Local";


          const away =
            fixture.away ||
            fixture.awayTeam ||
            fixture.visitante ||
            "Visitante";


          const status =
            fixture.status ||
            "scheduled";


          return `

            <tr>

              <td>
                ${formatFixtureDate(fixture)}
              </td>


              <td>

                <div class="table-title">

                  ${escapeHTML(home)}

                  <span class="text-muted">
                    vs
                  </span>

                  ${escapeHTML(away)}

                </div>

                ${
                  fixture.venue
                    ? `
                      <div class="table-subtitle">
                        ${escapeHTML(
                          fixture.venue
                        )}
                      </div>
                    `
                    : ""
                }

              </td>


              <td>
                ${escapeHTML(
                  fixture.competition ||
                  "—"
                )}
              </td>


              <td>
                ${statusBadge(status)}
              </td>


              <td>

                <div class="table-actions">

                  <button
                    class="icon-btn"
                    title="Editar"
                    data-edit-fixture="${escapeHTML(id)}"
                  >
                    ✎
                  </button>

                  <button
                    class="icon-btn danger"
                    title="Eliminar"
                    data-delete-fixture="${escapeHTML(id)}"
                  >
                    ×
                  </button>

                </div>

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


function openFixtureModal(fixture = null) {

  state.editingFixture =
    fixture;


  $("#fixture-modal-title").textContent =
    fixture
      ? "Editar partido"
      : "Nuevo partido";


  $("#fixture-id").value =
    fixture
      ? getId(fixture)
      : "";


  $("#fixture-date").value =
    normalizeDateInput(
      fixture?.date
    );


  $("#fixture-time").value =
    fixture?.time ||
    "";


  $("#fixture-competition").value =
    fixture?.competition ||
    "";


  $("#fixture-home").value =
    fixture?.home ||
    fixture?.homeTeam ||
    fixture?.local ||
    "";


  $("#fixture-away").value =
    fixture?.away ||
    fixture?.awayTeam ||
    fixture?.visitante ||
    "";


  $("#fixture-home-score").value =
    fixture?.homeScore ??
    fixture?.scoreHome ??
    "";


  $("#fixture-away-score").value =
    fixture?.awayScore ??
    fixture?.scoreAway ??
    "";


  $("#fixture-venue").value =
    fixture?.venue ||
    "";


  $("#fixture-status").value =
    fixture?.status ||
    "scheduled";


  $("#fixture-modal").hidden =
    false;

}


async function saveFixture(event) {

  event.preventDefault();


  const id =
    $("#fixture-id").value.trim();


  const fixture = {

    id:
      id ||
      crypto.randomUUID(),

    date:
      $("#fixture-date").value,

    time:
      $("#fixture-time").value,

    competition:
      $("#fixture-competition").value.trim(),

    home:
      $("#fixture-home").value.trim(),

    away:
      $("#fixture-away").value.trim(),

    homeScore:
      numberOrNull(
        $("#fixture-home-score").value
      ),

    awayScore:
      numberOrNull(
        $("#fixture-away-score").value
      ),

    venue:
      $("#fixture-venue").value.trim(),

    status:
      $("#fixture-status").value

  };


  if (
    !fixture.home ||
    !fixture.away ||
    !fixture.date
  ) {

    showToast(
      "Completá fecha, local y visitante.",
      "error"
    );

    return;

  }


  const submit =
    $("#fixture-form button[type='submit']");


  setButtonLoading(
    submit,
    true,
    "Guardando..."
  );


  try {

    await apiRequest(
      id
        ? "update-fixture"
        : "create-fixture",
      {
        method: "POST",
        body: fixture
      }
    );


    closeModal("fixture-modal");


    showToast(
      id
        ? "Partido actualizado."
        : "Partido creado.",
      "success"
    );


    await loadAll();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  } finally {

    setButtonLoading(
      submit,
      false,
      "Guardar partido"
    );

  }

}


function deleteFixture(id) {

  const fixture =
    findById(
      state.fixtures,
      id
    );


  if (!fixture) {
    return;
  }


  openConfirm(
    "Eliminar partido",
    "El partido será enviado a la papelera.",
    async () => {

      try {

        await apiRequest(
          "delete-fixture",
          {
            method: "POST",
            body: { id }
          }
        );


        showToast(
          "Partido eliminado.",
          "success"
        );


        await loadAll();


      } catch (error) {

        showToast(
          error.message,
          "error"
        );

      }

    }
  );

}


/* ============================================================
   STANDINGS
============================================================ */

function renderStandings() {

  const container =
    $("#standings-table");

  if (!container) {
    return;
  }


  if (!state.standings.length) {

    container.innerHTML =
      emptyState(
        "🏆",
        "No hay equipos",
        "Agregá un equipo para empezar."
      );

    return;

  }


  const teams =
    [...state.standings]
      .sort(
        (a, b) =>
          Number(b.points ?? b.pts ?? 0) -
          Number(a.points ?? a.pts ?? 0)
      );


  container.innerHTML = `

    <table class="admin-table">

      <thead>

        <tr>

          <th>#</th>
          <th>Equipo</th>
          <th>PJ</th>
          <th>PG</th>
          <th>PE</th>
          <th>PP</th>
          <th>PF</th>
          <th>PC</th>
          <th>PTS</th>
          <th></th>

        </tr>

      </thead>

      <tbody>

        ${teams.map((team, index) => {

          const id =
            getId(team);


          return `

            <tr>

              <td>
                <strong>
                  ${index + 1}
                </strong>
              </td>

              <td>
                <div class="table-title">
                  ${escapeHTML(
                    team.name ||
                    team.team ||
                    "Equipo"
                  )}
                </div>
              </td>

              <td>${num(team.played ?? team.pj)}</td>
              <td>${num(team.wins ?? team.pg)}</td>
              <td>${num(team.draws ?? team.pe)}</td>
              <td>${num(team.losses ?? team.pp)}</td>
              <td>${num(team.pointsFor ?? team.pf)}</td>
              <td>${num(team.pointsAgainst ?? team.pc)}</td>
              <td>
                <strong class="text-accent">
                  ${num(team.points ?? team.pts)}
                </strong>
              </td>

              <td>

                <div class="table-actions">

                  <button
                    class="icon-btn"
                    title="Editar"
                    data-edit-team="${escapeHTML(id)}"
                  >
                    ✎
                  </button>

                  <button
                    class="icon-btn danger"
                    title="Eliminar"
                    data-delete-team="${escapeHTML(id)}"
                  >
                    ×
                  </button>

                </div>

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


function openTeamModal(team = null) {

  state.editingTeam =
    team;


  $("#team-modal-title").textContent =
    team
      ? "Editar equipo"
      : "Nuevo equipo";


  $("#team-id").value =
    team
      ? getId(team)
      : "";


  $("#team-name").value =
    team?.name ||
    team?.team ||
    "";


  $("#team-played").value =
    team?.played ??
    team?.pj ??
    0;


  $("#team-wins").value =
    team?.wins ??
    team?.pg ??
    0;


  $("#team-draws").value =
    team?.draws ??
    team?.pe ??
    0;


  $("#team-losses").value =
    team?.losses ??
    team?.pp ??
    0;


  $("#team-points-for").value =
    team?.pointsFor ??
    team?.pf ??
    0;


  $("#team-points-against").value =
    team?.pointsAgainst ??
    team?.pc ??
    0;


  $("#team-points").value =
    team?.points ??
    team?.pts ??
    0;


  $("#team-modal").hidden =
    false;

}


async function saveTeam(event) {

  event.preventDefault();


  const id =
    $("#team-id").value.trim();


  const team = {

    id:
      id ||
      crypto.randomUUID(),

    name:
      $("#team-name").value.trim(),

    played:
      numberOrZero(
        $("#team-played").value
      ),

    wins:
      numberOrZero(
        $("#team-wins").value
      ),

    draws:
      numberOrZero(
        $("#team-draws").value
      ),

    losses:
      numberOrZero(
        $("#team-losses").value
      ),

    pointsFor:
      numberOrZero(
        $("#team-points-for").value
      ),

    pointsAgainst:
      numberOrZero(
        $("#team-points-against").value
      ),

    points:
      numberOrZero(
        $("#team-points").value
      )

  };


  if (!team.name) {

    showToast(
      "El nombre del equipo es obligatorio.",
      "error"
    );

    return;

  }


  try {

    await apiRequest(
      id
        ? "update-team"
        : "create-team",
      {
        method: "POST",
        body: team
      }
    );


    closeModal("team-modal");


    showToast(
      id
        ? "Equipo actualizado."
        : "Equipo creado.",
      "success"
    );


    await loadAll();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


function deleteTeam(id) {

  openConfirm(
    "Eliminar equipo",
    "El equipo será enviado a la papelera.",
    async () => {

      try {

        await apiRequest(
          "delete-team",
          {
            method: "POST",
            body: { id }
          }
        );


        showToast(
          "Equipo eliminado.",
          "success"
        );


        await loadAll();


      } catch (error) {

        showToast(
          error.message,
          "error"
        );

      }

    }
  );

}


/* ============================================================
   PLAYERS
============================================================ */

function renderPlayers() {

  const container =
    $("#players-table");

  if (!container) {
    return;
  }


  const search =
    $("#player-search")
      ?.value
      ?.toLowerCase()
      .trim() || "";


  let players =
    [...state.players];


  if (search) {

    players =
      players.filter(player => {

        const text =
          [
            player.name,
            player.position,
            player.team
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


        return text.includes(search);

      });

  }


  if (!players.length) {

    container.innerHTML =
      emptyState(
        "👤",
        "No hay jugadores",
        "Agregá un nuevo jugador."
      );

    return;

  }


  container.innerHTML = `

    <table class="admin-table">

      <thead>

        <tr>

          <th>Jugador</th>
          <th>Equipo</th>
          <th>Posición</th>
          <th>Número</th>
          <th>Edad</th>
          <th></th>

        </tr>

      </thead>

      <tbody>

        ${players.map(player => {

          const id =
            getId(player);


          return `

            <tr>

              <td>

                <div class="table-title">
                  ${escapeHTML(
                    player.name ||
                    "Sin nombre"
                  )}
                </div>

              </td>


              <td>
                ${escapeHTML(
                  player.team ||
                  "—"
                )}
              </td>


              <td>
                ${escapeHTML(
                  player.position ||
                  "—"
                )}
              </td>


              <td>
                ${player.number ?? "—"}
              </td>


              <td>
                ${player.age ?? "—"}
              </td>


              <td>

                <div class="table-actions">

                  <button
                    class="icon-btn"
                    title="Editar"
                    data-edit-player="${escapeHTML(id)}"
                  >
                    ✎
                  </button>

                  <button
                    class="icon-btn danger"
                    title="Eliminar"
                    data-delete-player="${escapeHTML(id)}"
                  >
                    ×
                  </button>

                </div>

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


function openPlayerModal(player = null) {

  state.editingPlayer =
    player;


  $("#player-modal-title").textContent =
    player
      ? "Editar jugador"
      : "Nuevo jugador";


  $("#player-id").value =
    player
      ? getId(player)
      : "";


  $("#player-name").value =
    player?.name ||
    "";


  $("#player-position").value =
    player?.position ||
    "";


  $("#player-team").value =
    player?.team ||
    "";


  $("#player-number").value =
    player?.number ??
    "";


  $("#player-age").value =
    player?.age ??
    "";


  $("#player-image").value =
    player?.image ||
    player?.imageUrl ||
    "";


  $("#player-modal").hidden =
    false;

}


async function savePlayer(event) {

  event.preventDefault();


  const id =
    $("#player-id").value.trim();


  const player = {

    id:
      id ||
      crypto.randomUUID(),

    name:
      $("#player-name").value.trim(),

    position:
      $("#player-position").value.trim(),

    team:
      $("#player-team").value.trim(),

    number:
      numberOrNull(
        $("#player-number").value
      ),

    age:
      numberOrNull(
        $("#player-age").value
      ),

    image:
      $("#player-image").value.trim()

  };


  if (!player.name) {

    showToast(
      "El nombre es obligatorio.",
      "error"
    );

    return;

  }


  try {

    await apiRequest(
      id
        ? "update-player"
        : "create-player",
      {
        method: "POST",
        body: player
      }
    );


    closeModal("player-modal");


    showToast(
      id
        ? "Jugador actualizado."
        : "Jugador creado.",
      "success"
    );


    await loadAll();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


function deletePlayer(id) {

  openConfirm(
    "Eliminar jugador",
    "El jugador será enviado a la papelera.",
    async () => {

      try {

        await apiRequest(
          "delete-player",
          {
            method: "POST",
            body: { id }
          }
        );


        showToast(
          "Jugador eliminado.",
          "success"
        );


        await loadAll();


      } catch (error) {

        showToast(
          error.message,
          "error"
        );

      }

    }
  );

}


/* ============================================================
   INSTAGRAM
============================================================ */

function renderInstagram() {

  const container =
    $("#instagram-news");

  if (!container) {
    return;
  }


  const articles =
    state.articles.slice(0, 30);


  if (!articles.length) {

    container.innerHTML =
      emptyState(
        "◎",
        "No hay noticias",
        "Creá una noticia para generar contenido."
      );

    return;

  }


  container.innerHTML =
    articles
      .map(article => {

        const id =
          getId(article);


        const image =
          article.image ||
          article.imageUrl ||
          "";


        return `

          <div
            class="instagram-item"
            data-instagram-id="${escapeHTML(id)}"
          >

            ${
              image
                ? `
                  <img
                    src="${escapeHTML(image)}"
                    alt=""
                  >
                `
                : `
                  <div class="dashboard-thumb">
                    📰
                  </div>
                `
            }


            <div class="instagram-item-content">

              <strong>
                ${escapeHTML(
                  article.title ||
                  "Sin título"
                )}
              </strong>

              <span>
                ${escapeHTML(
                  article.category ||
                  "Rugby"
                )}
              </span>

            </div>

          </div>

        `;

      })
      .join("");

}


function generateInstagram(article) {

  if (!article) {
    return;
  }


  const title =
    article.title ||
    "";


  const excerpt =
    article.excerpt ||
    article.description ||
    "";


  const category =
    article.category ||
    "Rugby";


  const url =
    article.url ||
    article.link ||
    "";


  const text = `

🏉 DROP RUGBY

${title}

${excerpt}

📰 ${category}

${url}

#DropRugby #Rugby #Argentina #RugbyArgentino

  `.trim();


  const output =
    $("#instagram-output");


  if (output) {
    output.value = text;
  }


  $$(".instagram-item")
    .forEach(item => {

      item.classList.toggle(
        "active",
        item.dataset.instagramId ===
          String(getId(article))
      );

    });

}


async function copyInstagram() {

  const output =
    $("#instagram-output");


  if (
    !output ||
    !output.value
  ) {

    showToast(
      "Primero seleccioná una noticia.",
      "warning"
    );

    return;

  }


  try {

    await navigator.clipboard.writeText(
      output.value
    );


    showToast(
      "Publicación copiada.",
      "success"
    );


  } catch {

    output.select();

    document.execCommand("copy");


    showToast(
      "Publicación copiada.",
      "success"
    );

  }

}


/* ============================================================
   TRASH
============================================================ */

function renderTrash() {

  const container =
    $("#trash-table");

  if (!container) {
    return;
  }


  if (!state.trash.length) {

    container.innerHTML =
      emptyState(
        "♲",
        "La papelera está vacía",
        "Los elementos eliminados aparecerán acá."
      );

    return;

  }


  container.innerHTML = `

    <table class="admin-table">

      <thead>

        <tr>

          <th>Elemento</th>
          <th>Tipo</th>
          <th>Fecha</th>
          <th></th>

        </tr>

      </thead>

      <tbody>

        ${state.trash.map(item => {

          const id =
            getId(item);


          const type =
            item.type ||
            item.kind ||
            "Contenido";


          const name =
            item.title ||
            item.name ||
            item.home
              ? `${item.home || ""} vs ${item.away || ""}`
              : "Elemento";


          return `

            <tr>

              <td>

                <div class="table-title">
                  ${escapeHTML(name)}
                </div>

              </td>


              <td>
                ${escapeHTML(type)}
              </td>


              <td>
                ${formatDate(
                  item.deletedAt ||
                  item.date
                )}
              </td>


              <td>

                <div class="table-actions">

                  <button
                    class="icon-btn accent"
                    title="Restaurar"
                    data-restore="${escapeHTML(id)}"
                  >
                    ↶
                  </button>

                  <button
                    class="icon-btn danger"
                    title="Eliminar definitivamente"
                    data-hard-delete="${escapeHTML(id)}"
                  >
                    ×
                  </button>

                </div>

              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


function updateTrashCount() {

  const element =
    $("#trash-count");

  if (!element) {
    return;
  }


  element.textContent =
    state.trash.length;

}


function restoreTrash(id) {

  openConfirm(
    "Restaurar elemento",
    "¿Querés restaurar este elemento?",
    async () => {

      try {

        await apiRequest(
          "restore",
          {
            method: "POST",
            body: { id }
          }
        );


        showToast(
          "Elemento restaurado.",
          "success"
        );


        await loadAll();


      } catch (error) {

        showToast(
          error.message,
          "error"
        );

      }

    }
  );

}


function hardDelete(id) {

  openConfirm(
    "Eliminar definitivamente",
    "Este elemento será eliminado permanentemente.",
    async () => {

      try {

        await apiRequest(
          "hard-delete",
          {
            method: "POST",
            body: { id }
          }
        );


        showToast(
          "Elemento eliminado definitivamente.",
          "success"
        );


        await loadAll();


      } catch (error) {

        showToast(
          error.message,
          "error"
        );

      }

    }
  );

}


function emptyTrash() {

  if (!state.trash.length) {

    showToast(
      "La papelera ya está vacía.",
      "warning"
    );

    return;

  }


  openConfirm(
    "Vaciar papelera",
    "Todos los elementos de la papelera serán eliminados definitivamente.",
    async () => {

      try {

        await apiRequest(
          "empty-trash",
          {
            method: "POST"
          }
        );


        showToast(
          "Papelera vaciada.",
          "success"
        );


        await loadAll();


      } catch (error) {

        showToast(
          error.message,
          "error"
        );

      }

    }
  );

}


/* ============================================================
   HISTORY
============================================================ */

function renderHistory() {

  const container =
    $("#history-list");

  if (!container) {
    return;
  }


  if (!state.history.length) {

    container.innerHTML =
      emptyState(
        "◴",
        "No hay actividad",
        "Los cambios aparecerán acá."
      );

    return;

  }


  const history =
    [...state.history]
      .sort(
        (a, b) =>
          getDateValue(b) -
          getDateValue(a)
      )
      .slice(0, 100);


  container.innerHTML =
    history
      .map(item => {

        return `

          <div class="history-item">

            <div class="history-dot"></div>

            <div class="history-main">

              <strong>
                ${escapeHTML(
                  item.action ||
                  item.title ||
                  "Cambio realizado"
                )}
              </strong>

              <p>
                ${escapeHTML(
                  item.description ||
                  item.message ||
                  item.details ||
                  ""
                )}
              </p>

            </div>

            <div class="history-time">

              ${formatDate(
                item.createdAt ||
                item.date ||
                item.timestamp
              )}

            </div>

          </div>

        `;

      })
      .join("");

}


/* ============================================================
   DATA EXPORT
============================================================ */

function exportData() {

  const data = {

    articles:
      state.articles,

    fixtures:
      state.fixtures,

    standings:
      state.standings,

    players:
      state.players,

    trash:
      state.trash,

    history:
      state.history,

    exportedAt:
      new Date().toISOString()

  };


  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href =
    url;


  link.download =
    `droprugby-backup-${formatFileDate(
      new Date()
    )}.json`;


  document.body.appendChild(link);

  link.click();

  link.remove();


  URL.revokeObjectURL(url);


  showToast(
    "Backup exportado.",
    "success"
  );

}


/* ============================================================
   SYSTEM STATUS
============================================================ */

async function checkSystemStatus() {

  const element =
    $("#system-status");

  if (!element) {
    return;
  }


  try {

    await apiRequest("session");


    element.textContent =
      "● API conectada";


    element.style.color =
      "var(--success)";


  } catch {

    element.textContent =
      "● Error de conexión";


    element.style.color =
      "var(--danger)";

  }

}


/* ============================================================
   CONFIRM MODAL
============================================================ */

function openConfirm(
  title,
  message,
  callback
) {

  $("#confirm-title").textContent =
    title;


  $("#confirm-message").textContent =
    message;


  state.confirmCallback =
    callback;


  $("#confirm-modal").hidden =
    false;

}


async function confirmAction() {

  const callback =
    state.confirmCallback;


  state.confirmCallback =
    null;


  closeModal(
    "confirm-modal"
  );


  if (typeof callback === "function") {

    await callback();

  }

}


/* ============================================================
   TOAST
============================================================ */

function showToast(
  message,
  type = "success"
) {

  const container =
    $("#toast-container");


  if (!container) {
    return;
  }


  const toast =
    document.createElement("div");


  toast.className =
    `toast ${type}`;


  toast.textContent =
    message;


  container.appendChild(toast);


  setTimeout(
    () => {

      toast.style.opacity =
        "0";

      toast.style.transform =
        "translateX(20px)";


      setTimeout(
        () => toast.remove(),
        250
      );

    },
    3500
  );

}


/* ============================================================
   EVENT DELEGATION
============================================================ */

function setupDelegatedEvents() {

  document.addEventListener(
    "click",
    event => {

      const target =
        event.target.closest(
          "[data-section], [data-section-target], [data-action], [data-edit-article], [data-delete-article], [data-newsletter-article], [data-edit-fixture], [data-delete-fixture], [data-edit-team], [data-delete-team], [data-edit-player], [data-delete-player], [data-instagram-id], [data-restore], [data-hard-delete], [data-close-modal]"
        );


      if (!target) {
        return;
      }


      if (
        target.dataset.section
      ) {

        showSection(
          target.dataset.section
        );

        return;

      }


      if (
        target.dataset.sectionTarget
      ) {

        showSection(
          target.dataset.sectionTarget
        );

        return;

      }


      if (
        target.dataset.action
      ) {

        const action =
          target.dataset.action;


        if (
          action ===
          "new-article"
        ) {

          openArticleModal();

        }


        if (
          action ===
          "new-fixture"
        ) {

          openFixtureModal();

        }


        if (
          action ===
          "new-team"
        ) {

          openTeamModal();

        }


        if (
          action ===
          "new-player"
        ) {

          openPlayerModal();

        }


        return;

      }


      if (
        target.dataset.editArticle
      ) {

        const item =
          findById(
            state.articles,
            target.dataset.editArticle
          );


        if (item) {
          openArticleModal(item);
        }


        return;

      }


      if (
        target.dataset.deleteArticle
      ) {

        deleteArticle(
          target.dataset.deleteArticle
        );

        return;

      }


      if (
        target.dataset.newsletterArticle
      ) {

        newsletterArticle(
          target.dataset.newsletterArticle
        );

        return;

      }


      if (
        target.dataset.editFixture
      ) {

        const item =
          findById(
            state.fixtures,
            target.dataset.editFixture
          );


        if (item) {
          openFixtureModal(item);
        }


        return;

      }


      if (
        target.dataset.deleteFixture
      ) {

        deleteFixture(
          target.dataset.deleteFixture
        );

        return;

      }


      if (
        target.dataset.editTeam
      ) {

        const item =
          findById(
            state.standings,
            target.dataset.editTeam
          );


        if (item) {
          openTeamModal(item);
        }


        return;

      }


      if (
        target.dataset.deleteTeam
      ) {

        deleteTeam(
          target.dataset.deleteTeam
        );

        return;

      }


      if (
        target.dataset.editPlayer
      ) {

        const item =
          findById(
            state.players,
            target.dataset.editPlayer
          );


        if (item) {
          openPlayerModal(item);
        }


        return;

      }


      if (
        target.dataset.deletePlayer
      ) {

        deletePlayer(
          target.dataset.deletePlayer
        );

        return;

      }


      if (
        target.dataset.instagramId
      ) {

        const article =
          findById(
            state.articles,
            target.dataset.instagramId
          );


        generateInstagram(
          article
        );


        return;

      }


      if (
        target.dataset.restore
      ) {

        restoreTrash(
          target.dataset.restore
        );

        return;

      }


      if (
        target.dataset.hardDelete
      ) {

        hardDelete(
          target.dataset.hardDelete
        );

        return;

      }


      if (
        target.dataset.closeModal
      ) {

        closeModal(
          target.dataset.closeModal
        );

      }

    }
  );

}


/* ============================================================
   EVENT LISTENERS
============================================================ */

function setupEvents() {

  $("#login-form")
    ?.addEventListener(
      "submit",
      handleLogin
    );


  $("#logout-btn")
    ?.addEventListener(
      "click",
      logout
    );


  $("#article-form")
    ?.addEventListener(
      "submit",
      saveArticle
    );


  $("#fixture-form")
    ?.addEventListener(
      "submit",
      saveFixture
    );


  $("#team-form")
    ?.addEventListener(
      "submit",
      saveTeam
    );


  $("#player-form")
    ?.addEventListener(
      "submit",
      savePlayer
    );


  $("#article-status")
    ?.addEventListener(
      "change",
      toggleScheduleFields
    );


  $("#article-search")
    ?.addEventListener(
      "input",
      renderArticles
    );


  $("#article-filter")
    ?.addEventListener(
      "change",
      renderArticles
    );


  $("#fixture-search")
    ?.addEventListener(
      "input",
      renderFixtures
    );


  $("#player-search")
    ?.addEventListener(
      "input",
      renderPlayers
    );


  $("#copy-instagram")
    ?.addEventListener(
      "click",
      copyInstagram
    );


  $("#empty-trash-btn")
    ?.addEventListener(
      "click",
      emptyTrash
    );


  $("#export-data-btn")
    ?.addEventListener(
      "click",
      exportData
    );


  $("#refresh-data-btn")
    ?.addEventListener(
      "click",
      async () => {

        await loadAll();

        showToast(
          "Datos actualizados.",
          "success"
        );

      }
    );


  $("#confirm-cancel")
    ?.addEventListener(
      "click",
      () => closeModal(
        "confirm-modal"
      )
    );


  $("#confirm-ok")
    ?.addEventListener(
      "click",
      confirmAction
    );


  $("#mobile-menu-btn")
    ?.addEventListener(
      "click",
      () => {

        $(".sidebar")
          ?.classList
          .toggle(
            "mobile-open"
          );

      }
    );


  setupDelegatedEvents();


  /*
    Cerrar modal haciendo click
    en el fondo.
  */

  $$(".modal-backdrop")
    .forEach(backdrop => {

      backdrop.addEventListener(
        "click",
        () => {

          const modal =
            backdrop.closest(".modal");

          if (modal) {
            closeModal(modal.id);
          }

        }
      );

    });


  /*
    Escape cierra modales.
  */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key !==
        "Escape"
      ) {

        return;

      }


      $$(".modal")
        .forEach(modal => {

          if (!modal.hidden) {
            closeModal(modal.id);
          }

        });

    }
  );

}


/* ============================================================
   HELPERS
============================================================ */

function findById(
  array,
  id
) {

  return array.find(
    item =>
      String(getId(item)) ===
      String(id)
  );

}


function getDateValue(item) {

  if (!item) {
    return 0;
  }


  const value =
    item.publishAt ||
    item.publishedAt ||
    item.date ||
    item.createdAt ||
    item.timestamp;


  const date =
    new Date(value);


  const time =
    date.getTime();


  return Number.isNaN(time)
    ? 0
    : time;

}


function getFixtureDateValue(
  fixture
) {

  if (!fixture) {
    return 0;
  }


  const date =
    fixture.date || "";


  const time =
    fixture.time || "";


  const value =
    `${date}T${time || "00:00"}`;


  const parsed =
    new Date(value);


  if (!Number.isNaN(
    parsed.getTime()
  )) {

    return parsed.getTime();

  }


  return getDateValue(
    fixture
  );

}


function getArticleStatus(
  article
) {

  if (!article) {
    return "draft";
  }


  if (article.status) {
    return article.status;
  }


  if (
    article.scheduled ||
    article.publishAt
  ) {

    return "scheduled";

  }


  if (
    article.published === false
  ) {

    return "draft";

  }


  return "published";

}


function statusBadge(status) {

  const normalized =
    String(status || "")
      .toLowerCase();


  const labels = {

    published: "Publicada",

    scheduled: "Programada",

    draft: "Borrador",

    live: "En vivo",

    finished: "Finalizado",

    postponed: "Postergado",

    scheduled: "Próximo"

  };


  return `

    <span
      class="status-badge status-${escapeHTML(
        normalized
      )}"
    >
      ${escapeHTML(
        labels[normalized] ||
        status ||
        "—"
      )}
    </span>

  `;

}


function formatDate(
  value
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return escapeHTML(
      value
    );

  }


  return new Intl.DateTimeFormat(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  ).format(date);

}


function formatFixtureDate(
  fixture
) {

  if (!fixture?.date) {
    return "—";
  }


  const date =
    new Date(
      `${fixture.date}T${
        fixture.time ||
        "00:00"
      }`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return escapeHTML(
      fixture.date
    );

  }


  let result =
    new Intl.DateTimeFormat(
      "es-AR",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    ).format(date);


  if (fixture.time) {

    result +=
      ` · ${escapeHTML(
        fixture.time
      )}`;

  }


  return result;

}


function normalizeDateInput(
  value
) {

  if (!value) {
    return "";
  }


  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      String(value)
    )
  ) {

    return value;

  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


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


function toDatetimeLocal(
  value
) {

  if (!value) {
    return "";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  const pad =
    number =>
      String(number)
        .padStart(2, "0");


  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}`
  );

}


function formatFileDate(
  date
) {

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


function numberOrZero(
  value
) {

  const number =
    Number(value);


  return Number.isFinite(number)
    ? number
    : 0;

}


function numberOrNull(
  value
) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {

    return null;

  }


  const number =
    Number(value);


  return Number.isFinite(number)
    ? number
    : null;

}


function num(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "0";

  }


  return escapeHTML(
    value
  );

}


function emptyState(
  icon,
  title,
  description
) {

  return `

    <div class="empty-state">

      <div class="empty-state-icon">
        ${icon}
      </div>

      <strong>
        ${escapeHTML(title)}
      </strong>

      <span>
        ${escapeHTML(description)}
      </span>

    </div>

  `;

}


function setButtonLoading(
  button,
  loading,
  text
) {

  if (!button) {
    return;
  }


  if (loading) {

    button.dataset.originalText =
      button.innerHTML;

    button.disabled = true;

    button.innerHTML =
      text;

  } else {

    button.disabled = false;

    button.innerHTML =
      button.dataset.originalText ||
      text;

  }

}


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupEvents();

    await checkSession();

    await checkSystemStatus();

  }
);

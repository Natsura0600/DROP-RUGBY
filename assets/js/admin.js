/* =========================================================
   DROPRUGBY ADMIN JS
   ========================================================= */

"use strict";


// =========================================================
// STATE
// =========================================================

const state = {
  content: {
    articles: [],
    fixtures: [],
    standings: [],
    players: [],
    instagram: [],
    trash: [],
    history: [],
    settings: {}
  },

  currentSection: "dashboard",

  articleSearch: "",
  articleCategory: "",

  fixtureSearch: "",
  fixtureStatus: "",

  playerSearch: "",

  confirmCallback: null
};


// =========================================================
// HELPERS
// =========================================================

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  Array.from(document.querySelectorAll(selector));


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatDate(value) {

  if (!value) {
    return "Sin fecha";
  }

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


function formatDateTime(value) {

  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}


function slugify(text) {

  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


function showToast(
  title,
  message = "",
  type = "success"
) {

  const container =
    $("#toast-container");

  if (!container) return;

  const toast =
    document.createElement("div");

  toast.className =
    `toast ${type}`;

  toast.innerHTML = `
    <strong>${escapeHTML(title)}</strong>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform =
      "translateY(10px)";

    setTimeout(() => {
      toast.remove();
    }, 250);

  }, 3500);
}


function openModal(id) {

  const modal = $(`#${id}`);

  if (!modal) return;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}


function closeModal(id) {

  const modal = $(`#${id}`);

  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  if (!document.querySelector(".modal.open")) {
    document.body.style.overflow = "";
  }
}


function closeAllModals() {

  $$(".modal.open").forEach(
    (modal) => {
      modal.classList.remove("open");
      modal.setAttribute(
        "aria-hidden",
        "true"
      );
    }
  );

  document.body.style.overflow = "";
}


function confirmAction(
  title,
  message,
  callback
) {

  state.confirmCallback = callback;

  $("#confirm-title").textContent =
    title;

  $("#confirm-message").textContent =
    message;

  openModal("confirm-modal");
}


// =========================================================
// API
// =========================================================

async function api(
  action,
  data = {},
  method = "POST"
) {

  const options = {
    method,
    credentials: "include",
    headers: {
      "Content-Type":
        "application/json"
    }
  };

  if (method !== "GET") {
    options.body =
      JSON.stringify({
        action,
        ...data
      });
  }

  let url = "/api/admin";

  if (method === "GET") {
    url +=
      `?action=${encodeURIComponent(action)}`;
  }

  const response =
    await fetch(url, options);

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Respuesta inválida del servidor (${response.status})`
    );
  }

  if (!response.ok || result.ok === false) {

    if (response.status === 401) {
      logoutLocal();
    }

    throw new Error(
      result.error ||
      "Ocurrió un error"
    );
  }

  return result;
}


// =========================================================
// LOGIN
// =========================================================

async function login(
  username,
  password
) {

  const button =
    $("#login-form button[type='submit']");

  const original =
    button.innerHTML;

  button.disabled = true;
  button.innerHTML =
    "INGRESANDO...";

  $("#login-error").textContent =
    "";

  try {

    const result =
      await api(
        "login",
        {
          username,
          password
        }
      );

    $("#admin-username")
      .textContent =
      result.user || username;

    showApp();

    await loadContent();

  } catch (error) {

    $("#login-error")
      .textContent =
      error.message ||
      "No se pudo iniciar sesión";

  } finally {

    button.disabled = false;
    button.innerHTML =
      original;
  }
}


function logoutLocal() {

  $("#admin-app")
    .classList.add("hidden");

  $("#login-screen")
    .classList.remove("hidden");
}


async function logout() {

  try {

    await api("logout");

  } catch {
    // Aunque falle la petición,
    // limpiamos la interfaz.
  }

  logoutLocal();

  showToast(
    "Sesión cerrada",
    "Hasta luego."
  );
}


// =========================================================
// SESSION CHECK
// =========================================================

async function checkSession() {

  try {

    const result =
      await api(
        "session",
        {},
        "GET"
      );

    if (
      result.ok &&
      result.authenticated
    ) {

      $("#admin-username")
        .textContent =
        result.user || "admin";

      showApp();

      await loadContent();

      return true;
    }

  } catch {
    // Usuario no autenticado
  }

  $("#login-screen")
    .classList.remove("hidden");

  $("#admin-app")
    .classList.add("hidden");

  return false;
}


// =========================================================
// APP
// =========================================================

function showApp() {

  $("#login-screen")
    .classList.add("hidden");

  $("#admin-app")
    .classList.remove("hidden");
}


// =========================================================
// LOAD CONTENT
// =========================================================

async function loadContent(
  showNotification = false
) {

  try {

    const result =
      await api(
        "get",
        {},
        "GET"
      );

    state.content =
      normalizeContent(
        result.content
      );

    renderAll();

    if (showNotification) {

      showToast(
        "Actualizado",
        "El contenido fue actualizado."
      );
    }

  } catch (error) {

    showToast(
      "Error",
      error.message,
      "error"
    );
  }
}


function normalizeContent(content) {

  const data =
    content &&
    typeof content === "object"
      ? content
      : {};

  return {

    ...data,

    articles:
      Array.isArray(data.articles)
        ? data.articles
        : [],

    fixtures:
      Array.isArray(data.fixtures)
        ? data.fixtures
        : [],

    standings:
      Array.isArray(data.standings)
        ? data.standings
        : [],

    players:
      Array.isArray(data.players)
        ? data.players
        : [],

    instagram:
      Array.isArray(data.instagram)
        ? data.instagram
        : [],

    trash:
      Array.isArray(data.trash)
        ? data.trash
        : [],

    history:
      Array.isArray(data.history)
        ? data.history
        : [],

    settings:
      data.settings || {}
  };
}


// =========================================================
// NAVIGATION
// =========================================================

function navigate(section) {

  const target =
    $(`#section-${section}`);

  if (!target) return;

  state.currentSection =
    section;

  $$(".admin-section")
    .forEach((item) => {
      item.classList.remove("active");
    });

  target.classList.add("active");

  $$(".nav-item")
    .forEach((item) => {

      item.classList.toggle(
        "active",
        item.dataset.section === section
      );

    });

  const titles = {
    dashboard: "Dashboard",
    articles: "Noticias",
    fixtures: "Partidos",
    standings: "Posiciones",
    players: "Jugadores",
    instagram: "Instagram",
    trash: "Papelera",
    history: "Historial",
    settings: "Configuración"
  };

  $("#page-title")
    .textContent =
    titles[section] ||
    "Dashboard";

  closeSidebar();
}


function openSidebar() {

  $("#sidebar")
    .classList.add("open");

  $("#sidebar-overlay")
    .classList.add("open");
}


function closeSidebar() {

  $("#sidebar")
    .classList.remove("open");

  $("#sidebar-overlay")
    .classList.remove("open");
}


// =========================================================
// RENDER ALL
// =========================================================

function renderAll() {

  renderStats();
  renderDashboardArticles();
  renderDashboardHistory();

  renderArticles();
  renderFixtures();
  renderStandings();
  renderPlayers();
  renderInstagram();
  renderTrash();
  renderHistory();
  renderSettings();

  updateNavCounts();
}


// =========================================================
// STATS
// =========================================================

function renderStats() {

  $("#stat-articles")
    .textContent =
    state.content.articles.length;

  $("#stat-fixtures")
    .textContent =
    state.content.fixtures.length;

  $("#stat-teams")
    .textContent =
    state.content.standings.length;

  $("#stat-players")
    .textContent =
    state.content.players.length;
}


function updateNavCounts() {

  $("#nav-articles-count")
    .textContent =
    state.content.articles.length;

  $("#nav-fixtures-count")
    .textContent =
    state.content.fixtures.length;

  $("#nav-players-count")
    .textContent =
    state.content.players.length;

  $("#nav-trash-count")
    .textContent =
    state.content.trash.length;
}


// =========================================================
// DASHBOARD
// =========================================================

function renderDashboardArticles() {

  const container =
    $("#dashboard-articles");

  const articles =
    state.content.articles
      .slice(0, 5);

  if (!articles.length) {

    container.innerHTML = `
      <div class="empty-state small">
        No hay noticias todavía.
      </div>
    `;

    return;
  }

  container.innerHTML =
    articles.map(article => {

      const image =
        article.image
          ? `background-image:url("${escapeHTML(article.image)}")`
          : "";

      return `
        <div class="dashboard-article">

          <div
            class="dashboard-article-image"
            style="${image}"
          ></div>

          <div class="dashboard-article-info">

            <strong>
              ${escapeHTML(
                article.title ||
                "Sin título"
              )}
            </strong>

            <small>
              ${escapeHTML(
                article.category ||
                "Rugby"
              )}
              ·
              ${formatDate(
                article.date ||
                article.createdAt
              )}
            </small>

          </div>

        </div>
      `;

    }).join("");
}


function renderDashboardHistory() {

  const container =
    $("#dashboard-history");

  const history =
    state.content.history
      .slice(0, 6);

  if (!history.length) {

    container.innerHTML = `
      <div class="empty-state small">
        No hay actividad.
      </div>
    `;

    return;
  }

  container.innerHTML =
    history.map(item => {

      return `
        <div class="activity-item">

          <div class="activity-dot"></div>

          <div class="activity-info">

            <strong>
              ${escapeHTML(
                historyLabel(item)
              )}
            </strong>

            <small>
              ${formatDateTime(item.date)}
            </small>

          </div>

        </div>
      `;

    }).join("");
}


function historyLabel(item) {

  const actionNames = {
    create: "Creado",
    edit: "Editado",
    update: "Actualizado",
    delete: "Eliminado",
    restore: "Restaurado",
    "permanent-delete":
      "Eliminado definitivamente",
    "empty-trash":
      "Papelera vaciada"
  };

  const action =
    actionNames[item.action] ||
    item.action ||
    "Acción";

  if (item.title) {
    return `${action}: ${item.title}`;
  }

  if (item.type) {
    return `${action}: ${item.type}`;
  }

  return action;
}


// =========================================================
// ARTICLES
// =========================================================

function renderArticles() {

  const container =
    $("#articles-table");

  let articles =
    [...state.content.articles];

  const search =
    state.articleSearch
      .trim()
      .toLowerCase();

  if (search) {

    articles =
      articles.filter(article => {

        const text =
          [
            article.title,
            article.excerpt,
            article.category,
            article.author
          ]
            .join(" ")
            .toLowerCase();

        return text.includes(search);
      });
  }

  if (state.articleCategory) {

    articles =
      articles.filter(
        article =>
          article.category ===
          state.articleCategory
      );
  }

  if (!articles.length) {

    container.innerHTML = `
      <div class="empty-state">
        No se encontraron noticias.
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <table class="admin-table">

      <thead>
        <tr>
          <th>NOTICIA</th>
          <th>CATEGORÍA</th>
          <th>AUTOR</th>
          <th>FECHA</th>
          <th>ESTADO</th>
          <th></th>
        </tr>
      </thead>

      <tbody>

        ${articles.map(article => `

          <tr>

            <td>
              <div class="table-title">
                ${escapeHTML(
                  article.title ||
                  "Sin título"
                )}
              </div>
            </td>

            <td>
              <span class="badge">
                ${escapeHTML(
                  article.category ||
                  "Rugby"
                )}
              </span>
            </td>

            <td>
              ${escapeHTML(
                article.author ||
                "DropRugby"
              )}
            </td>

            <td>
              ${formatDate(
                article.date ||
                article.createdAt
              )}
            </td>

            <td>
              ${
                article.published === false
                  ? `
                    <span class="badge badge-red">
                      BORRADOR
                    </span>
                  `
                  : `
                    <span class="badge badge-green">
                      PUBLICADA
                    </span>
                  `
              }
            </td>

            <td>

              <div class="table-actions">

                <button
                  class="table-action"
                  title="Editar"
                  data-edit-article="${escapeHTML(article.id)}"
                >
                  ✎
                </button>

                <button
                  class="table-action"
                  title="Newsletter"
                  data-newsletter-article="${escapeHTML(article.id)}"
                >
                  ✉
                </button>

                <button
                  class="table-action danger"
                  title="Eliminar"
                  data-delete-article="${escapeHTML(article.id)}"
                >
                  ×
                </button>

              </div>

            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>
  `;

  bindDynamicArticleButtons();
}


function bindDynamicArticleButtons() {

  $$("[data-edit-article]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openArticleModal(
            button.dataset.editArticle
          );

        }
      );

    });


  $$("[data-delete-article]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteArticle(
            button.dataset.deleteArticle
          );

        }
      );

    });


  $$("[data-newsletter-article]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          sendArticleNewsletter(
            button.dataset.newsletterArticle
          );

        }
      );

    });
}


// =========================================================
// ARTICLE MODAL
// =========================================================

function resetArticleForm() {

  $("#article-form").reset();

  $("#article-id").value = "";

  $("#article-author").value =
    "DropRugby";

  $("#article-modal-title")
    .textContent =
    "Nueva noticia";
}


function openArticleModal(id = null) {

  resetArticleForm();

  if (id) {

    const article =
      state.content.articles.find(
        item => item.id === id
      );

    if (!article) return;

    $("#article-id").value =
      article.id || "";

    $("#article-title").value =
      article.title || "";

    $("#article-category").value =
      article.category || "Rugby";

    $("#article-author").value =
      article.author || "DropRugby";

    $("#article-image").value =
      article.image || "";

    $("#article-excerpt").value =
      article.excerpt || "";

    $("#article-content").value =
      article.content || "";

    $("#article-tags").value =
      Array.isArray(article.tags)
        ? article.tags.join(", ")
        : article.tags || "";

    $("#article-featured").checked =
      article.featured === true;

    $("#article-modal-title")
      .textContent =
      "Editar noticia";
  }

  openModal("article-modal");
}


async function saveArticle(event) {

  event.preventDefault();

  const id =
    $("#article-id").value.trim();

  const title =
    $("#article-title").value.trim();

  if (!title) {
    showToast(
      "Falta el título",
      "Ingresá un título.",
      "error"
    );

    return;
  }

  const tags =
    $("#article-tags").value
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean);

  const article = {

    id: id || undefined,

    title,

    slug: slugify(title),

    category:
      $("#article-category").value,

    author:
      $("#article-author").value.trim() ||
      "DropRugby",

    image:
      $("#article-image").value.trim(),

    excerpt:
      $("#article-excerpt").value.trim(),

    content:
      $("#article-content").value.trim(),

    tags,

    featured:
      $("#article-featured").checked,

    published: true,

    date:
      id
        ? (
            state.content.articles.find(
              item => item.id === id
            )?.date ||
            new Date().toISOString()
          )
        : new Date().toISOString()
  };

  try {

    const result =
      await api(
        "create-article",
        {
          article
        }
      );

    state.content =
      normalizeContent(
        result.content
      );

    closeModal("article-modal");

    renderAll();

    showToast(
      id
        ? "Noticia actualizada"
        : "Noticia creada",
      id
        ? "Los cambios fueron guardados."
        : "La noticia fue publicada."
    );

  } catch (error) {

    showToast(
      "Error",
      error.message,
      "error"
    );
  }
}


async function deleteArticle(id) {

  const article =
    state.content.articles.find(
      item => item.id === id
    );

  if (!article) return;

  confirmAction(
    "¿Eliminar noticia?",
    `La noticia "${article.title}" será enviada a la papelera.`,
    async () => {

      try {

        const result =
          await api(
            "delete-article",
            {
              id
            }
          );

        state.content =
          normalizeContent(
            result.content
          );

        renderAll();

        showToast(
          "Noticia eliminada",
          "Fue enviada a la papelera."
        );

      } catch (error) {

        showToast(
          "Error",
          error.message,
          "error"
        );
      }

    }
  );
}


async function sendArticleNewsletter(id) {

  const article =
    state.content.articles.find(
      item => item.id === id
    );

  if (!article) return;

  confirmAction(
    "Enviar newsletter",
    `¿Querés enviar "${article.title}" a todos los suscriptores?`,
    async () => {

      showToast(
        "Enviando...",
        "Preparando newsletter."
      );

      try {

        const result =
          await api(
            "send-newsletter",
            {
              articleId: id
            }
          );

        showToast(
          "Newsletter enviado",
          `${result.newsletter?.sent || 0} destinatarios procesados.`
        );

      } catch (error) {

        showToast(
          "Error de newsletter",
          error.message,
          "error"
        );
      }

    }
  );
}


// =========================================================
// FIXTURES
// =========================================================

function renderFixtures() {

  const container =
    $("#fixtures-table");

  let fixtures =
    [...state.content.fixtures];

  const search =
    state.fixtureSearch
      .trim()
      .toLowerCase();

  if (search) {

    fixtures =
      fixtures.filter(fixture => {

        const text =
          [
            fixture.home,
            fixture.away,
            fixture.homeTeam,
            fixture.awayTeam,
            fixture.competition,
            fixture.venue
          ]
            .join(" ")
            .toLowerCase();

        return text.includes(search);
      });
  }

  if (state.fixtureStatus) {

    fixtures =
      fixtures.filter(
        fixture =>
          fixture.status ===
          state.fixtureStatus
      );
  }

  if (!fixtures.length) {

    container.innerHTML = `
      <div class="empty-state">
        No hay partidos registrados.
      </div>
    `;

    return;
  }

  fixtures.sort(
    (a, b) =>
      String(a.date || "")
        .localeCompare(
          String(b.date || "")
        )
  );

  container.innerHTML = `
    <table class="admin-table">

      <thead>

        <tr>
          <th>FECHA</th>
          <th>PARTIDO</th>
          <th>COMPETICIÓN</th>
          <th>RESULTADO</th>
          <th>ESTADO</th>
          <th></th>
        </tr>

      </thead>

      <tbody>

        ${fixtures.map(fixture => {

          const home =
            fixture.home ||
            fixture.homeTeam ||
            "Local";

          const away =
            fixture.away ||
            fixture.awayTeam ||
            "Visitante";

          const finished =
            fixture.status ===
            "finished";

          return `
            <tr>

              <td>
                ${formatDate(
                  fixture.date
                )}

                ${
                  fixture.time
                    ? `<small style="display:block;color:#555">${escapeHTML(fixture.time)}</small>`
                    : ""
                }
              </td>

              <td>
                <strong style="color:#ddd">
                  ${escapeHTML(home)}
                </strong>

                <span style="color:#555">
                  vs
                </span>

                <strong style="color:#ddd">
                  ${escapeHTML(away)}
                </strong>
              </td>

              <td>
                ${escapeHTML(
                  fixture.competition ||
                  "—"
                )}
              </td>

              <td>
                ${
                  finished
                    ? `
                      <strong style="color:#ddd">
                        ${fixture.homeScore ?? "-"}
                        -
                        ${fixture.awayScore ?? "-"}
                      </strong>
                    `
                    : `
                      <span style="color:#555">
                        —
                      </span>
                    `
                }
              </td>

              <td>

                <span class="badge ${
                  finished
                    ? ""
                    : "badge-green"
                }">

                  ${
                    finished
                      ? "FINALIZADO"
                      : "PRÓXIMO"
                  }

                </span>

              </td>

              <td>

                <div class="table-actions">

                  <button
                    class="table-action"
                    data-edit-fixture="${escapeHTML(fixture.id)}"
                  >
                    ✎
                  </button>

                  <button
                    class="table-action danger"
                    data-delete-fixture="${escapeHTML(fixture.id)}"
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

  $$("[data-edit-fixture]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          openFixtureModal(
            button.dataset.editFixture
          )
      );

    });

  $$("[data-delete-fixture]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          deleteFixture(
            button.dataset.deleteFixture
          )
      );

    });
}


function resetFixtureForm() {

  $("#fixture-form").reset();

  $("#fixture-id").value = "";

  $("#fixture-status").value =
    "upcoming";

  $("#fixture-modal-title")
    .textContent =
    "Nuevo partido";
}


function openFixtureModal(id = null) {

  resetFixtureForm();

  if (id) {

    const fixture =
      state.content.fixtures.find(
        item => item.id === id
      );

    if (!fixture) return;

    $("#fixture-id").value =
      fixture.id || "";

    $("#fixture-date").value =
      fixture.date || "";

    $("#fixture-time").value =
      fixture.time || "";

    $("#fixture-competition").value =
      fixture.competition || "";

    $("#fixture-venue").value =
      fixture.venue || "";

    $("#fixture-home").value =
      fixture.home ||
      fixture.homeTeam ||
      "";

    $("#fixture-away").value =
      fixture.away ||
      fixture.awayTeam ||
      "";

    $("#fixture-home-score").value =
      fixture.homeScore ?? "";

    $("#fixture-away-score").value =
      fixture.awayScore ?? "";

    $("#fixture-status").value =
      fixture.status || "upcoming";

    $("#fixture-modal-title")
      .textContent =
      "Editar partido";
  }

  openModal("fixture-modal");
}


async function saveFixture(event) {

  event.preventDefault();

  const id =
    $("#fixture-id").value.trim();

  const fixture = {

    id: id || undefined,

    date:
      $("#fixture-date").value,

    time:
      $("#fixture-time").value,

    competition:
      $("#fixture-competition").value.trim(),

    venue:
      $("#fixture-venue").value.trim(),

    home:
      $("#fixture-home").value.trim(),

    away:
      $("#fixture-away").value.trim(),

    homeScore:
      $("#fixture-home-score").value === ""
        ? null
        : Number(
            $("#fixture-home-score").value
          ),

    awayScore:
      $("#fixture-away-score").value === ""
        ? null
        : Number(
            $("#fixture-away-score").value
          ),

    status:
      $("#fixture-status").value
  };

  try {

    const result =
      await api(
        "create-fixture",
        {
          fixture
        }
      );

    state.content =
      normalizeContent(
        result.content
      );

    closeModal("fixture-modal");

    renderAll();

    showToast(
      id
        ? "Partido actualizado"
        : "Partido creado",
      "Los cambios fueron guardados."
    );

  } catch (error) {

    showToast(
      "Error",
      error.message,
      "error"
    );
  }
}


async function deleteFixture(id) {

  const fixture =
    state.content.fixtures.find(
      item => item.id === id
    );

  if (!fixture) return;

  const home =
    fixture.home ||
    fixture.homeTeam ||
    "Local";

  const away =
    fixture.away ||
    fixture.awayTeam ||
    "Visitante";

  confirmAction(
    "¿Eliminar partido?",
    `${home} vs ${away} será enviado a la papelera.`,
    async () => {

      try {

        const result =
          await api(
            "delete-fixture",
            {
              id
            }
          );

        state.content =
          normalizeContent(
            result.content
          );

        renderAll();

        showToast(
          "Partido eliminado",
          "Fue enviado a la papelera."
        );

      } catch (error) {

        showToast(
          "Error",
          error.message,
          "error"
        );
      }

    }
  );
}


// =========================================================
// STANDINGS
// =========================================================

function renderStandings() {

  const container =
    $("#standings-table");

  const teams =
    [...state.content.standings];

  if (!teams.length) {

    container.innerHTML = `
      <div class="empty-state">
        No hay equipos registrados.
      </div>
    `;

    return;
  }

  teams.sort(
    (a, b) =>
      Number(b.points || 0) -
      Number(a.points || 0)
  );

  container.innerHTML = `
    <table class="admin-table">

      <thead>

        <tr>
          <th>#</th>
          <th>EQUIPO</th>
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

        ${teams.map((team, index) => `

          <tr>

            <td>
              <strong style="color:#666">
                ${index + 1}
              </strong>
            </td>

            <td>
              <strong style="color:#ddd">
                ${escapeHTML(
                  team.name ||
                  team.team ||
                  "Equipo"
                )}
              </strong>
            </td>

            <td>${team.played || 0}</td>
            <td>${team.wins || 0}</td>
            <td>${team.draws || 0}</td>
            <td>${team.losses || 0}</td>
            <td>${team.pointsFor || 0}</td>
            <td>${team.pointsAgainst || 0}</td>

            <td>
              <strong style="color:var(--accent)">
                ${team.points || 0}
              </strong>
            </td>

            <td>

              <div class="table-actions">

                <button
                  class="table-action"
                  data-edit-team="${escapeHTML(team.id)}"
                >
                  ✎
                </button>

                <button
                  class="table-action danger"
                  data-delete-team="${escapeHTML(team.id)}"
                >
                  ×
                </button>

              </div>

            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>
  `;

  $$("[data-edit-team]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          openTeamModal(
            button.dataset.editTeam
          )
      );

    });

  $$("[data-delete-team]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          deleteTeam(
            button.dataset.deleteTeam
          )
      );

    });
}


function resetTeamForm() {

  $("#team-form").reset();

  $("#team-id").value = "";

  [
    "team-played",
    "team-wins",
    "team-draws",
    "team-losses",
    "team-points-for",
    "team-points-against",
    "team-points"
  ].forEach(id => {
    $(`#${id}`).value = 0;
  });
}


function openTeamModal(id = null) {

  resetTeamForm();

  if (id) {

    const team =
      state.content.standings.find(
        item => item.id === id
      );

    if (!team) return;

    $("#team-id").value =
      team.id || "";

    $("#team-name").value =
      team.name ||
      team.team ||
      "";

    $("#team-played").value =
      team.played || 0;

    $("#team-wins").value =
      team.wins || 0;

    $("#team-draws").value =
      team.draws || 0;

    $("#team-losses").value =
      team.losses || 0;

    $("#team-points-for").value =
      team.pointsFor || 0;

    $("#team-points-against").value =
      team.pointsAgainst || 0;

    $("#team-points").value =
      team.points || 0;
  }

  openModal("team-modal");
}


async function saveTeam(event) {

  event.preventDefault();

  const id =
    $("#team-id").value.trim();

  const team = {

    id: id || undefined,

    name:
      $("#team-name").value.trim(),

    played:
      Number(
        $("#team-played").value || 0
      ),

    wins:
      Number(
        $("#team-wins").value || 0
      ),

    draws:
      Number(
        $("#team-draws").value || 0
      ),

    losses:
      Number(
        $("#team-losses").value || 0
      ),

    pointsFor:
      Number(
        $("#team-points-for").value || 0
      ),

    pointsAgainst:
      Number(
        $("#team-points-against").value || 0
      ),

    points:
      Number(
        $("#team-points").value || 0
      )
  };

  try {

    const result =
      await api(
        "save-team",
        {
          team
        }
      );

    state.content =
      normalizeContent(
        result.content
      );

    closeModal("team-modal");

    renderAll();

    showToast(
      id
        ? "Equipo actualizado"
        : "Equipo creado",
      "Los cambios fueron guardados."
    );

  } catch (error) {

    showToast(
      "Error",
      error.message,
      "error"
    );
  }
}


async function deleteTeam(id) {

  const team =
    state.content.standings.find(
      item => item.id === id
    );

  if (!team) return;

  const name =
    team.name ||
    team.team ||
    "este equipo";

  confirmAction(
    "¿Eliminar equipo?",
    `${name} será enviado a la papelera.`,
    async () => {

      try {

        const result =
          await api(
            "delete-team",
            {
              id
            }
          );

        state.content =
          normalizeContent(
            result.content
          );

        renderAll();

        showToast(
          "Equipo eliminado",
          "Fue enviado a la papelera."
        );

      } catch (error) {

        showToast(
          "Error",
          error.message,
          "error"
        );
      }

    }
  );
}


// =========================================================
// PLAYERS
// =========================================================

function renderPlayers() {

  const container =
    $("#players-grid");

  let players =
    [...state.content.players];

  const search =
    state.playerSearch
      .trim()
      .toLowerCase();

  if (search) {

    players =
      players.filter(player => {

        const text =
          [
            player.name,
            player.position,
            player.team,
            player.country
          ]
            .join(" ")
            .toLowerCase();

        return text.includes(search);
      });
  }

  if (!players.length) {

    container.innerHTML = `
      <div class="panel-card empty-state">
        No hay jugadores registrados.
      </div>
    `;

    return;
  }

  container.innerHTML =
    players.map(player => {

      const image =
        player.image
          ? `
            <img
              src="${escapeHTML(player.image)}"
              alt="${escapeHTML(player.name || "")}"
              onerror="this.style.display='none'"
            >
          `
          : `
            <div class="player-placeholder">
              ♟
            </div>
          `;

      return `
        <article class="player-card">

          <div class="player-image">
            ${image}
          </div>

          <div class="player-info">

            <strong>
              ${escapeHTML(
                player.name ||
                "Jugador"
              )}
            </strong>

            <span>
              ${escapeHTML(
                player.position ||
                "Sin posición"
              )}
              ${
                player.team
                  ? ` · ${escapeHTML(player.team)}`
                  : ""
              }
            </span>

            <div class="player-actions">

              <button
                class="btn btn-secondary"
                data-edit-player="${escapeHTML(player.id)}"
              >
                EDITAR
              </button>

              <button
                class="btn btn-danger"
                data-delete-player="${escapeHTML(player.id)}"
              >
                ELIMINAR
              </button>

            </div>

          </div>

        </article>
      `;

    }).join("");

  $$("[data-edit-player]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          openPlayerModal(
            button.dataset.editPlayer
          )
      );

    });

  $$("[data-delete-player]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          deletePlayer(
            button.dataset.deletePlayer
          )
      );

    });
}


function resetPlayerForm() {

  $("#player-form").reset();

  $("#player-id").value = "";
}


function openPlayerModal(id = null) {

  resetPlayerForm();

  if (id) {

    const player =
      state.content.players.find(
        item => item.id === id
      );

    if (!player) return;

    $("#player-id").value =
      player.id || "";

    $("#player-name").value =
      player.name || "";

    $("#player-position").value =
      player.position || "";

    $("#player-team").value =
      player.team || "";

    $("#player-number").value =
      player.number ?? "";

    $("#player-country").value =
      player.country || "";

    $("#player-image").value =
      player.image || "";

    $("#player-bio").value =
      player.bio || "";
  }

  openModal("player-modal");
}


async function savePlayer(event) {

  event.preventDefault();

  const id =
    $("#player-id").value.trim();

  const player = {

    id: id || undefined,

    name:
      $("#player-name").value.trim(),

    position:
      $("#player-position").value.trim(),

    team:
      $("#player-team").value.trim(),

    number:
      $("#player-number").value === ""
        ? null
        : Number(
            $("#player-number").value
          ),

    country:
      $("#player-country").value.trim(),

    image:
      $("#player-image").value.trim(),

    bio:
      $("#player-bio").value.trim()
  };

  try {

    const result =
      await api(
        "create-player",
        {
          player
        }
      );

    state.content =
      normalizeContent(
        result.content
      );

    closeModal("player-modal");

    renderAll();

    showToast(
      id
        ? "Jugador actualizado"
        : "Jugador creado",
      "Los cambios fueron guardados."
    );

  } catch (error) {

    showToast(
      "Error",
      error.message,
      "error"
    );
  }
}


async function deletePlayer(id) {

  const player =
    state.content.players.find(
      item => item.id === id
    );

  if (!player) return;

  confirmAction(
    "¿Eliminar jugador?",
    `${player.name || "El jugador"} será enviado a la papelera.`,
    async () => {

      try {

        const result =
          await api(
            "delete-player",
            {
              id
            }
          );

        state.content =
          normalizeContent(
            result.content
          );

        renderAll();

        showToast(
          "Jugador eliminado",
          "Fue enviado a la papelera."
        );

      } catch (error) {

        showToast(
          "Error",
          error.message,
          "error"
        );
      }

    }
  );
}


// =========================================================
// INSTAGRAM
// =========================================================

function renderInstagram() {

  const container =
    $("#instagram-grid");

  const posts =
    state.content.instagram;

  if (!posts.length) {

    container.innerHTML = `
      <div class="panel-card empty-state">
        No hay publicaciones de Instagram.
      </div>
    `;

    return;
  }

  container.innerHTML =
    posts.map(post => {

      const image =
        post.image
          ? `background-image:url("${escapeHTML(post.image)}")`
          : "";

      return `
        <article class="instagram-card">

          <div
            class="instagram-image"
            style="${image}"
          ></div>

          <div class="instagram-content">

            <strong>
              ${escapeHTML(
                post.title ||
                "Publicación de Instagram"
              )}
            </strong>

            <p>
              ${escapeHTML(
                post.caption ||
                ""
              )}
            </p>

            ${
              post.url
                ? `
                  <a
                    class="instagram-link"
                    href="${escapeHTML(post.url)}"
                    target="_blank"
                    rel="noopener"
                  >
                    VER EN INSTAGRAM ↗
                  </a>
                `
                : ""
            }

            <div class="instagram-actions">

              <button
                class="btn btn-secondary"
                data-edit-instagram="${escapeHTML(post.id)}"
              >
                EDITAR
              </button>

              <button
                class="btn btn-danger"
                data-delete-instagram="${escapeHTML(post.id)}"
              >
                ELIMINAR
              </button>

            </div>

          </div>

        </article>
      `;

    }).join("");

  $$("[data-edit-instagram]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          openInstagramModal(
            button.dataset.editInstagram
          )
      );

    });

  $$("[data-delete-instagram]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          deleteInstagram(
            button.dataset.deleteInstagram
          )
      );

    });
}


function resetInstagramForm() {

  $("#instagram-form").reset();

  $("#instagram-id").value = "";
}


function openInstagramModal(id = null) {

  resetInstagramForm();

  if (id) {

    const post =
      state.content.instagram.find(
        item => item.id === id
      );

    if (!post) return;

    $("#instagram-id").value =
      post.id || "";

    $("#instagram-title").value =
      post.title || "";

    $("#instagram-url").value =
      post.url || "";

    $("#instagram-image").value =
      post.image || "";

    $("#instagram-caption").value =
      post.caption || "";
  }

  openModal("instagram-modal");
}


async function saveInstagram(event) {

  event.preventDefault();

  const id =
    $("#instagram-id").value.trim();

  const post = {

    id: id || undefined,

    title:
      $("#instagram-title").value.trim(),

    url:
      $("#instagram-url").value.trim(),

    image:
      $("#instagram-image").value.trim(),

    caption:
      $("#instagram-caption").value.trim()
  };

  try {

    const result =
      await api(
        "save-instagram",
        {
          post
        }
      );

    state.content =
      normalizeContent(
        result.content
      );

    closeModal("instagram-modal");

    renderAll();

    showToast(
      id
        ? "Publicación actualizada"
        : "Publicación creada",
      "Los cambios fueron guardados."
    );

  } catch (error) {

    showToast(
      "Error",
      error.message,
      "error"
    );
  }
}


async function deleteInstagram(id) {

  const post =
    state.content.instagram.find(
      item => item.id === id
    );

  if (!post) return;

  confirmAction(
    "¿Eliminar publicación?",
    "La publicación será enviada a la papelera.",
    async () => {

      try {

        const result =
          await api(
            "delete-instagram",
            {
              id
            }
          );

        state.content =
          normalizeContent(
            result.content
          );

        renderAll();

        showToast(
          "Publicación eliminada",
          "Fue enviada a la papelera."
        );

      } catch (error) {

        showToast(
          "Error",
          error.message,
          "error"
        );
      }

    }
  );
}


// =========================================================
// TRASH
// =========================================================

function renderTrash() {

  const container =
    $("#trash-list");

  const trash =
    state.content.trash;

  if (!trash.length) {

    container.innerHTML = `
      <div class="empty-state">
        La papelera está vacía.
      </div>
    `;

    return;
  }

  container.innerHTML =
    trash.map(item => {

      const title =
        item.item?.title ||
        item.item?.name ||
        item.item?.team ||
        item.item?.player ||
        "Elemento";

      return `
        <div class="trash-item">

          <div class="trash-icon">
            ⌫
          </div>

          <div class="trash-info">

            <strong>
              ${escapeHTML(title)}
            </strong>

            <small>
              ${escapeHTML(item.type || "contenido")}
              ·
              eliminado
              ${formatDateTime(item.deletedAt)}
            </small>

          </div>

          <div class="trash-actions">

            <button
              class="btn btn-secondary"
              data-restore="${escapeHTML(item.id)}"
            >
              RESTAURAR
            </button>

            <button
              class="btn btn-danger"
              data-permanent-delete="${escapeHTML(item.id)}"
            >
              ELIMINAR
            </button>

          </div>

        </div>
      `;

    }).join("");

  $$("[data-restore]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          restoreTrash(
            button.dataset.restore
          )
      );

    });

  $$("[data-permanent-delete]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          permanentDelete(
            button.dataset.permanentDelete
          )
      );

    });
}


async function restoreTrash(id) {

  try {

    const result =
      await api(
        "restore",
        {
          id
        }
      );

    state.content =
      normalizeContent(
        result.content
      );

    renderAll();

    showToast(
      "Contenido restaurado",
      "El elemento volvió a su sección."
    );

  } catch (error) {

    showToast(
      "Error",
      error.message,
      "error"
    );
  }
}


async function permanentDelete(id) {

  confirmAction(
    "¿Eliminar definitivamente?",
    "Este contenido no podrá recuperarse.",
    async () => {

      try {

        const result =
          await api(
            "permanent-delete",
            {
              id
            }
          );

        state.content =
          normalizeContent(
            result.content
          );

        renderAll();

        showToast(
          "Eliminado definitivamente",
          "El contenido fue eliminado."
        );

      } catch (error) {

        showToast(
          "Error",
          error.message,
          "error"
        );
      }

    }
  );
}


async function emptyTrash() {

  if (
    !state.content.trash.length
  ) {

    showToast(
      "Papelera vacía",
      "No hay elementos para eliminar."
    );

    return;
  }

  confirmAction(
    "¿Vaciar papelera?",
    "Todos los elementos serán eliminados definitivamente.",
    async () => {

      try {

        const result =
          await api(
            "empty-trash"
          );

        state.content =
          normalizeContent(
            result.content
          );

        renderAll();

        showToast(
          "Papelera vaciada",
          `${result.deleted || 0} elementos eliminados.`
        );

      } catch (error) {

        showToast(
          "Error",
          error.message,
          "error"
        );
      }

    }
  );
}


// =========================================================
// HISTORY
// =========================================================

function renderHistory() {

  const container =
    $("#history-list");

  const history =
    state.content.history;

  if (!history.length) {

    container.innerHTML = `
      <div class="empty-state">
        No hay registros en el historial.
      </div>
    `;

    return;
  }

  container.innerHTML =
    history.map(item => {

      return `
        <div class="history-row">

          <div class="history-dot"></div>

          <div class="history-action">
            ${escapeHTML(
              item.action ||
              "acción"
            )}
          </div>

          <div class="history-description">
            ${escapeHTML(
              item.title ||
              item.type ||
              "Contenido"
            )}
          </div>

          <div class="history-date">
            ${formatDateTime(item.date)}
          </div>

        </div>
      `;

    }).join("");
}


async function clearHistory() {

  if (
    !state.content.history.length
  ) {

    showToast(
      "Historial vacío",
      "No hay registros."
    );

    return;
  }

  confirmAction(
    "¿Limpiar historial?",
    "Se eliminarán todos los registros de actividad.",
    async () => {

      try {

        const result =
          await api(
            "clear-history"
          );

        state.content =
          normalizeContent(
            result.content
          );

        renderAll();

        showToast(
          "Historial limpiado",
          "Se eliminaron los registros."
        );

      } catch (error) {

        showToast(
          "Error",
          error.message,
          "error"
        );
      }

    }
  );
}


// =========================================================
// SETTINGS
// =========================================================

function renderSettings() {

  const settings =
    state.content.settings ||
    {};

  $("#settings-site-name").value =
    settings.siteName ||
    "DropRugby";

  $("#settings-site-description").value =
    settings.description ||
    "Noticias de rugby";
}


async function saveSettings(event) {

  event.preventDefault();

  const settings = {

    siteName:
      $("#settings-site-name")
        .value
        .trim(),

    description:
      $("#settings-site-description")
        .value
        .trim()
  };

  try {

    const result =
      await api(
        "save-settings",
        {
          settings
        }
      );

    state.content =
      normalizeContent(
        result.content
      );

    showToast(
      "Configuración guardada",
      "Los cambios fueron guardados."
    );

  } catch (error) {

    showToast(
      "Error",
      error.message,
      "error"
    );
  }
}


// =========================================================
// EVENTS
// =========================================================

function bindEvents() {

  // LOGIN

  $("#login-form")
    .addEventListener(
      "submit",
      event => {

        event.preventDefault();

        login(
          $("#login-user").value.trim(),
          $("#login-password").value
        );

      }
    );


  // LOGOUT

  $("#logout-button")
    .addEventListener(
      "click",
      logout
    );


  // NAVIGATION

  $$(".nav-item")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          navigate(
            button.dataset.section
          )
      );

    });


  // MOBILE

  $("#menu-button")
    .addEventListener(
      "click",
      openSidebar
    );

  $("#sidebar-close")
    .addEventListener(
      "click",
      closeSidebar
    );

  $("#sidebar-overlay")
    .addEventListener(
      "click",
      closeSidebar
    );


  // REFRESH

  $("#refresh-button")
    .addEventListener(
      "click",
      () =>
        loadContent(true)
    );


  // ARTICLE

  $("#new-article-button")
    .addEventListener(
      "click",
      () =>
        openArticleModal()
    );

  $("#dashboard-new-article")
    .addEventListener(
      "click",
      () => {

        navigate("articles");
        openArticleModal();

      }
    );

  $("#article-form")
    .addEventListener(
      "submit",
      saveArticle
    );


  // FIXTURE

  $("#new-fixture-button")
    .addEventListener(
      "click",
      () =>
        openFixtureModal()
    );

  $("#fixture-form")
    .addEventListener(
      "submit",
      saveFixture
    );


  // TEAM

  $("#new-team-button")
    .addEventListener(
      "click",
      () =>
        openTeamModal()
    );

  $("#team-form")
    .addEventListener(
      "submit",
      saveTeam
    );


  // PLAYER

  $("#new-player-button")
    .addEventListener(
      "click",
      () =>
        openPlayerModal()
    );

  $("#player-form")
    .addEventListener(
      "submit",
      savePlayer
    );


  // INSTAGRAM

  $("#new-instagram-button")
    .addEventListener(
      "click",
      () =>
        openInstagramModal()
    );

  $("#instagram-form")
    .addEventListener(
      "submit",
      saveInstagram
    );


  // TRASH

  $("#empty-trash-button")
    .addEventListener(
      "click",
      emptyTrash
    );


  // HISTORY

  $("#clear-history-button")
    .addEventListener(
      "click",
      clearHistory
    );


  // SETTINGS

  $("#settings-form")
    .addEventListener(
      "submit",
      saveSettings
    );


  // SEARCH ARTICLES

  $("#article-search")
    .addEventListener(
      "input",
      event => {

        state.articleSearch =
          event.target.value;

        renderArticles();

      }
    );


  $("#article-category-filter")
    .addEventListener(
      "change",
      event => {

        state.articleCategory =
          event.target.value;

        renderArticles();

      }
    );


  // SEARCH FIXTURES

  $("#fixture-search")
    .addEventListener(
      "input",
      event => {

        state.fixtureSearch =
          event.target.value;

        renderFixtures();

      }
    );


  $("#fixture-status-filter")
    .addEventListener(
      "change",
      event => {

        state.fixtureStatus =
          event.target.value;

        renderFixtures();

      }
    );


  // SEARCH PLAYERS

  $("#player-search")
    .addEventListener(
      "input",
      event => {

        state.playerSearch =
          event.target.value;

        renderPlayers();

      }
    );


  // CLOSE MODALS

  $$("[data-close-modal]")
    .forEach(element => {

      element.addEventListener(
        "click",
        event => {

          const modal =
            event.currentTarget.closest(
              ".modal"
            );

          if (modal) {
            closeModal(modal.id);
          }

        }
      );

    });


  // CONFIRM

  $("#confirm-cancel")
    .addEventListener(
      "click",
      () =>
        closeModal("confirm-modal")
    );


  $("#confirm-ok")
    .addEventListener(
      "click",
      async () => {

        const callback =
          state.confirmCallback;

        state.confirmCallback =
          null;

        closeModal(
          "confirm-modal"
        );

        if (callback) {
          await callback();
        }

      }
    );


  // QUICK ACTIONS

  $$("[data-quick]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const type =
            button.dataset.quick;

          if (type === "article") {
            navigate("articles");
            openArticleModal();
          }

          if (type === "fixture") {
            navigate("fixtures");
            openFixtureModal();
          }

          if (type === "team") {
            navigate("standings");
            openTeamModal();
          }

          if (type === "player") {
            navigate("players");
            openPlayerModal();
          }

        }
      );

    });


  // GO TO SECTION

  $$("[data-go-section]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          navigate(
            button.dataset.goSection
          );

        }
      );

    });


  // ESCAPE

  document.addEventListener(
    "keydown",
    event => {

      if (event.key === "Escape") {
        closeAllModals();
        closeSidebar();
      }

    }
  );

}


// =========================================================
// START
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    bindEvents();

    await checkSession();

  }
);

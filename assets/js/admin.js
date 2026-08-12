/* =========================================================
   DROP RUGBY — ADMIN JS
========================================================= */

const API_BASE = "/api";
const state = {
  user: null,
  content: {
    articles: [],
    fixtures: [],
    standings: [],
    scorers: [],
    clubs: [],
    nations: [],
    settings: {},
  },
  media: [],
  currentSection: "dashboard",
  editingArticleId: null,
  editingFixtureId: null,
  editingStandingId: null,
  editingScorerId: null,
  editingClubId: null,
  editingNationId: null,
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) =>
  Array.from(parent.querySelectorAll(selector));

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const slugify = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function showToast(message, type = "success") {
  let container = $("#toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data?.message
        ? data.message
        : typeof data === "string" && data
          ? data
          : `Error ${response.status}`;

    throw new Error(message);
  }

  return data;
}

async function checkSession() {
  try {
    const data = await apiFetch(`${API_BASE}/auth/me`);

    state.user = data?.user || data || null;

    if (!state.user) {
      window.location.href = "/login.html";
      return false;
    }

    return true;
  } catch (error) {
    console.error(error);
    window.location.href = "/login.html";
    return false;
  }
}

async function loadContent() {
  try {
    const data = await apiFetch(`${API_BASE}/content`);

    state.content = {
      articles: data?.articles || [],
      fixtures: data?.fixtures || [],
      standings: data?.standings || [],
      scorers: data?.scorers || [],
      clubs: data?.clubs || [],
      nations: data?.nations || [],
      settings: data?.settings || {},
    };

    return state.content;
  } catch (error) {
    console.error(error);
    showToast("No se pudo cargar el contenido", "error");
    return state.content;
  }
}

async function loadMedia() {
  try {
    const data = await apiFetch(`${API_BASE}/media`);
    state.media = Array.isArray(data) ? data : data?.media || [];
    return state.media;
  } catch (error) {
    console.error(error);
    state.media = [];
    showToast("No se pudo cargar Media Manager", "error");
    return [];
  }
}

function getArticleStatus(article) {
  if (article?.scheduledAt && !article?.published) {
    return "scheduled";
  }

  if (article?.published) {
    return "live";
  }

  return "draft";
}

function articleStatusLabel(article) {
  const status = getArticleStatus(article);

  if (status === "live") return "PUBLICADA";
  if (status === "scheduled") return "PROGRAMADA";
  return "BORRADOR";
}

function articleStatusClass(article) {
  const status = getArticleStatus(article);

  if (status === "live") return "live";
  if (status === "scheduled") return "scheduled";
  return "";
}

function renderDashboard() {
  const articles = [...(state.content.articles || [])]
    .sort((a, b) => {
      const da = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const db = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return db - da;
    })
    .slice(0, 8);

  const articlesContainer = $("#dashboard-articles");

  if (articlesContainer) {
    articlesContainer.innerHTML =
      articles
        .map(
          (article) => `
          <div class="list-item">
            <div>
              <b>${esc(article.title || "Sin título")}</b>
              <small>
                ${esc(article.category || "Sin categoría")}
                ${article.publishedAt ? ` · ${esc(formatDate(article.publishedAt))}` : ""}
              </small>
            </div>
            <div>
              <span class="badge ${articleStatusClass(article)}">
                ${articleStatusLabel(article)}
              </span>
            </div>
          </div>
        `,
        )
        .join("") ||
      `<div class="list-item muted">No hay noticias cargadas.</div>`;
  }

  const scheduledContainer = $("#dashboard-scheduled");

  if (scheduledContainer) {
    const scheduled = (state.content.articles || [])
      .filter((article) => article.scheduledAt && !article.published)
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime(),
      )
      .slice(0, 8);

    scheduledContainer.innerHTML =
      scheduled
        .map(
          (article) => `
          <div class="list-item">
            <div>
              <b>${esc(article.title || "Sin título")}</b>
              <small>${esc(formatDateTime(article.scheduledAt))}</small>
            </div>
            <div>
              <span class="badge scheduled">PROGRAMADA</span>
            </div>
          </div>
        `,
        )
        .join("") ||
      `<div class="list-item muted">No hay noticias programadas.</div>`;
  }

  renderStats();
}

function renderStats() {
  const articles = state.content.articles || [];
  const fixtures = state.content.fixtures || [];
  const clubs = state.content.clubs || [];
  const nations = state.content.nations || [];

  const articleCount = $("#stat-articles");
  const fixtureCount = $("#stat-fixtures");
  const clubCount = $("#stat-clubs");
  const nationCount = $("#stat-nations");

  if (articleCount) articleCount.textContent = articles.length;
  if (fixtureCount) fixtureCount.textContent = fixtures.length;
  if (clubCount) clubCount.textContent = clubs.length;
  if (nationCount) nationCount.textContent = nations.length;
}

function showSection(section) {
  state.currentSection = section;

  $$(".section").forEach((element) => {
    element.classList.toggle("active", element.id === `section-${section}`);
  });

  $$(".nav-item").forEach((element) => {
    element.classList.toggle(
      "active",
      element.dataset.section === section,
    );
  });

  const title = $("#page-title");

  const titles = {
    dashboard: "Dashboard",
    articles: "Noticias",
    fixtures: "Partidos",
    standings: "Tablas",
    scorers: "Goleadores",
    media: "Media Manager",
    clubs: "Clubes",
    nations: "Selecciones",
    settings: "Configuración",
  };

  if (title) {
    title.textContent = titles[section] || "Administración";
  }

  if (section === "dashboard") renderDashboard();
  if (section === "articles") renderArticles();
  if (section === "fixtures") renderFixtures();
  if (section === "standings") renderStandings();
  if (section === "scorers") renderScorers();
  if (section === "media") renderMedia();
  if (section === "clubs") renderClubs();
  if (section === "nations") renderNations();
  if (section === "settings") renderSettings();
}

function renderArticles() {
  const tbody = $("#articles-table-body");
  if (!tbody) return;

  const articles = [...(state.content.articles || [])];

  const search = ($("#articles-search")?.value || "").trim().toLowerCase();
  const category = ($("#articles-category-filter")?.value || "").trim();

  const filtered = articles.filter((article) => {
    const matchesSearch =
      !search ||
      String(article.title || "")
        .toLowerCase()
        .includes(search);

    const matchesCategory =
      !category || String(article.category || "") === category;

    return matchesSearch && matchesCategory;
  });

  tbody.innerHTML =
    filtered
      .map(
        (article) => `
        <tr>
          <td>
            <div class="title-cell">
              <strong>${esc(article.title || "Sin título")}</strong>
              <small>${esc(article.slug || "")}</small>
            </div>
          </td>
          <td>${esc(article.category || "—")}</td>
          <td>${esc(formatDate(article.publishedAt || article.createdAt))}</td>
          <td>
            <span class="badge ${articleStatusClass(article)}">
              ${articleStatusLabel(article)}
            </span>
          </td>
          <td>
            <div class="row-actions">
              <button
                class="action"
                type="button"
                data-edit-article="${esc(article.id)}"
              >
                Editar
              </button>
              <button
                class="action danger"
                type="button"
                data-delete-article="${esc(article.id)}"
              >
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      `,
      )
      .join("") ||
    `
      <tr>
        <td colspan="5" class="empty-cell">
          No hay noticias.
        </td>
      </tr>
    `;

  $$("#articles-table-body [data-edit-article]").forEach((button) => {
    button.addEventListener("click", () => {
      openArticleEditor(button.dataset.editArticle);
    });
  });

  $$("#articles-table-body [data-delete-article]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteArticle(button.dataset.deleteArticle);
    });
  });
}

function articleFormTemplate(article = {}) {
  const image = article.image || article.imageUrl || "";

  return `
    <div class="form-grid">
      <label>
        <span>Título</span>
        <input
          id="article-title"
          type="text"
          value="${esc(article.title || "")}"
          autocomplete="off"
        />
      </label>

      <label>
        <span>Slug</span>
        <input
          id="article-slug"
          type="text"
          value="${esc(article.slug || "")}"
          autocomplete="off"
        />
      </label>

      <label>
        <span>Categoría</span>
        <select id="article-category">
          <option value="">Seleccionar categoría</option>
          <option value="Los Pumas" ${article.category === "Los Pumas" ? "selected" : ""}>
            Los Pumas
          </option>
          <option value="URBA TOP 14" ${article.category === "URBA TOP 14" ? "selected" : ""}>
            URBA TOP 14
          </option>
          <option value="Internacional" ${article.category === "Internacional" ? "selected" : ""}>
            Internacional
          </option>
          <option value="Rugby Nacional" ${article.category === "Rugby Nacional" ? "selected" : ""}>
            Rugby Nacional
          </option>
        </select>
      </label>

      <label>
        <span>Imagen</span>

        <div class="media-inline">
          <input
            id="article-image"
            type="text"
            value="${esc(image)}"
            placeholder="URL de imagen"
            autocomplete="off"
          />

          <button
            id="article-select-image"
            class="action"
            type="button"
          >
            ELEGIR
          </button>

          <button
            id="article-upload-image"
            class="action"
            type="button"
          >
            SUBIR IMAGEN
          </button>
        </div>

        <div
          id="article-image-preview"
          class="article-image-preview"
        >
          ${
            image
              ? `<img src="${esc(image)}" alt="Vista previa" />`
              : `<span>Sin imagen seleccionada</span>`
          }
        </div>
      </label>

      <label>
        <span>Resumen</span>
        <textarea id="article-excerpt">${esc(article.excerpt || "")}</textarea>
      </label>

      <label>
        <span>Contenido</span>
        <textarea id="article-content">${esc(article.content || "")}</textarea>
      </label>

      <div class="form-grid two">
        <label class="check">
          <input
            id="article-featured"
            type="checkbox"
            ${article.featured ? "checked" : ""}
          />
          <span>NOTICIA DESTACADA</span>
        </label>

        <label class="check">
          <input
            id="article-published"
            type="checkbox"
            ${article.published ? "checked" : ""}
          />
          <span>PUBLICADA</span>
        </label>
      </div>

      <label class="check">
        <input
          id="article-scheduled"
          type="checkbox"
          ${article.scheduledAt ? "checked" : ""}
        />
        <span>PROGRAMAR PUBLICACIÓN</span>
      </label>

      <div id="article-schedule-fields" class="schedule-fields">
        <label>
          <span>Fecha y hora de publicación</span>
          <input
            id="article-scheduled-at"
            type="datetime-local"
            value="${esc(
              article.scheduledAt
                ? String(article.scheduledAt).slice(0, 16)
                : "",
            )}"
          />
        </label>
      </div>

      <p class="form-help">
        Si marcás "Programar publicación", la noticia no se mostrará
        públicamente hasta la fecha y hora elegidas.
      </p>
    </div>
  `;
}

function openModal(content, options = {}) {
  closeModal();

  const overlay = document.createElement("div");
  overlay.className = "modal-back";
  overlay.id = "active-modal";

  overlay.innerHTML = `
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="${esc(options.title || "Ventana")}"
    >
      ${
        options.title
          ? `
            <div class="modal-head">
              <h3>${esc(options.title)}</h3>
              <button
                type="button"
                class="modal-close"
                data-close-modal
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          `
          : ""
      }

      <div class="modal-body">
        ${content}
      </div>

      ${
        options.actions
          ? `
            <div class="modal-actions">
              ${options.actions}
            </div>
          `
          : ""
      }
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    if (
      event.target === overlay ||
      event.target.closest("[data-close-modal]")
    ) {
      closeModal();
    }
  });

  return overlay;
}

function closeModal() {
  $("#active-modal")?.remove();
  $(".media-picker-back")?.remove();
}

function openArticleEditor(articleId = null) {
  const article = articleId
    ? (state.content.articles || []).find(
        (item) => String(item.id) === String(articleId),
      )
    : null;

  state.editingArticleId = article?.id || null;

  const overlay = openModal(articleFormTemplate(article || {}), {
    title: article ? "Editar noticia" : "Nueva noticia",
    actions: `
      <button type="button" class="btn secondary" data-close-modal>
        CANCELAR
      </button>
      <button type="button" class="btn primary" id="save-article">
        GUARDAR
      </button>
    `,
  });

  const titleInput = $("#article-title", overlay);
  const slugInput = $("#article-slug", overlay);

  titleInput?.addEventListener("input", () => {
    if (!article) {
      slugInput.value = slugify(titleInput.value);
    }
  });

  const scheduledCheckbox = $("#article-scheduled", overlay);
  const scheduleFields = $("#article-schedule-fields", overlay);

  function updateScheduleVisibility() {
    if (!scheduleFields || !scheduledCheckbox) return;

    scheduleFields.style.display = scheduledCheckbox.checked
      ? "block"
      : "none";
  }

  scheduledCheckbox?.addEventListener("change", updateScheduleVisibility);
  updateScheduleVisibility();

  const imageInput = $("#article-image", overlay);
  const preview = $("#article-image-preview", overlay);

  function updateArticleImagePreview(value) {
    if (!preview) return;

    const url = String(value || "").trim();

    preview.innerHTML = url
      ? `<img src="${esc(url)}" alt="Vista previa" />`
      : `<span>Sin imagen seleccionada</span>`;
  }

  imageInput?.addEventListener("input", () => {
    updateArticleImagePreview(imageInput.value);
  });

  $("#article-select-image", overlay)?.addEventListener(
    "click",
    async () => {
      await openMediaPicker({
        onSelect: (media) => {
          const url =
            media?.url ||
            media?.src ||
            media?.path ||
            media?.file ||
            "";

          if (!url) return;

          imageInput.value = url;
          updateArticleImagePreview(url);
        },
      });
    },
  );

  $("#article-upload-image", overlay)?.addEventListener(
    "click",
    async () => {
      await uploadArticleImage({
        onUploaded: (media) => {
          const url =
            media?.url ||
            media?.src ||
            media?.path ||
            media?.file ||
            "";

          if (!url) return;

          imageInput.value = url;
          updateArticleImagePreview(url);
        },
      });
    },
  );

  $("#save-article", overlay)?.addEventListener("click", () => {
    saveArticle(overlay);
  });
}

async function saveArticle(overlay) {
  const title = $("#article-title", overlay)?.value.trim() || "";
  const slug = $("#article-slug", overlay)?.value.trim() || slugify(title);
  const category = $("#article-category", overlay)?.value || "";
  const image = $("#article-image", overlay)?.value.trim() || "";
  const excerpt = $("#article-excerpt", overlay)?.value || "";
  const content = $("#article-content", overlay)?.value || "";
  const featured = $("#article-featured", overlay)?.checked || false;
  const published = $("#article-published", overlay)?.checked || false;
  const scheduled = $("#article-scheduled", overlay)?.checked || false;
  const scheduledAt = $("#article-scheduled-at", overlay)?.value || "";

  if (!title) {
    showToast("Ingresá un título", "error");
    return;
  }

  const payload = {
    title,
    slug,
    category,
    image,
    excerpt,
    content,
    featured,
    published: scheduled ? false : published,
    scheduledAt: scheduled ? scheduledAt : null,
  };

  try {
    const id = state.editingArticleId;

    const data = await apiFetch(
      id
        ? `${API_BASE}/articles/${encodeURIComponent(id)}`
        : `${API_BASE}/articles`,
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      },
    );

    const article = data?.article || data;

    if (id) {
      const index = state.content.articles.findIndex(
        (item) => String(item.id) === String(id),
      );

      if (index >= 0) {
        state.content.articles[index] = article;
      }
    } else {
      state.content.articles.unshift(article);
    }

    closeModal();
    renderArticles();
    renderDashboard();
    showToast("Noticia guardada correctamente");
  } catch (error) {
    console.error(error);
    showToast(error.message || "No se pudo guardar la noticia", "error");
  }
}

async function deleteArticle(id) {
  if (!confirm("¿Seguro que querés eliminar esta noticia?")) return;

  try {
    await apiFetch(`${API_BASE}/articles/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    state.content.articles = state.content.articles.filter(
      (article) => String(article.id) !== String(id),
    );

    renderArticles();
    renderDashboard();
    showToast("Noticia eliminada");
  } catch (error) {
    console.error(error);
    showToast(error.message || "No se pudo eliminar", "error");
  }
}

(() => {

  const state = {
    articles: [],
    fixtures: [],
    standings: [],
    editingArticle: null,
    editingFixture: null
  };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const esc = s =>
    String(s ?? '').replace(
      /[&<>'"]/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[c])
    );

  const formatDate = iso => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const today = () =>
    new Date().toISOString().slice(0, 10);

  const slugify = s =>
    String(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70);


  /* =========================================================
     API
  ========================================================= */

  async function api(action, payload = {}) {

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });

    let data = {};

    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      throw new Error(
        data.error || 'Ocurrió un error.'
      );
    }

    return data;
  }


  /* =========================================================
     CARGAR DATOS
  ========================================================= */

  async function loadData() {

    const res = await fetch(
      '/api/content',
      {
        cache: 'no-store'
      }
    );

    if (!res.ok) {
      throw new Error(
        'No se pudo conectar con el contenido de DropRugby.'
      );
    }

    const data = await res.json();

    state.articles =
      Array.isArray(data.articles)
        ? data.articles
        : [];

    state.fixtures =
      Array.isArray(data.fixtures)
        ? data.fixtures
        : [];

    state.standings =
      Array.isArray(data.standings)
        ? data.standings
        : [];
  }


  /* =========================================================
     GUARDAR DATOS
  ========================================================= */

  async function saveData() {

    await api('save', {
      articles: state.articles,
      fixtures: state.fixtures,
      standings: state.standings
    });

    window.dispatchEvent(
      new Event('droprugby:data-updated')
    );
  }


  /* =========================================================
     NAVEGACIÓN
  ========================================================= */

  function showApp() {

    $('#login-view').hidden = true;
    $('#app-view').hidden = false;

    renderAll();
  }


  function switchSection(name) {

    $$('.admin-section').forEach(section => {
      section.classList.toggle(
        'active',
        section.id === `section-${name}`
      );
    });

    $$('.admin-nav').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.section === name
      );
    });

    const titles = {
      dashboard: 'Dashboard',
      articles: 'Noticias',
      fixtures: 'Partidos',
      standings: 'Tabla URBA',
      data: 'Datos y respaldo'
    };

    const title = $('#section-title');

    if (title) {
      title.textContent =
        titles[name] || name;
    }
  }


  /* =========================================================
     DASHBOARD
  ========================================================= */

  function renderDashboard() {

    if ($('#stat-articles')) {
      $('#stat-articles').textContent =
        state.articles.length;
    }

    if ($('#stat-fixtures')) {
      $('#stat-fixtures').textContent =
        state.fixtures.length;
    }

    const articlesContainer =
      $('#dashboard-articles');

    if (articlesContainer) {

      articlesContainer.innerHTML =
        state.articles
          .slice()
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date)
          )
          .slice(0, 5)
          .map(article => `

            <div class="admin-list-item">

              <div>

                <strong>
                  ${esc(article.title)}
                </strong>

                <small>
                  ${esc(article.category)}
                  ·
                  ${esc(article.author || 'DropRugby')}
                </small>

              </div>

              <span class="date">
                ${formatDate(article.date)}
              </span>

            </div>

          `)
          .join('')
        ||
        '<p class="admin-muted">No hay noticias.</p>';
    }


    const fixturesContainer =
      $('#dashboard-fixtures');

    if (fixturesContainer) {

      fixturesContainer.innerHTML =
        state.fixtures
          .slice()
          .sort(
            (a, b) =>
              (a.date + a.time)
                .localeCompare(
                  b.date + b.time
                )
          )
          .slice(0, 5)
          .map(fixture => `

            <div class="admin-list-item">

              <div>

                <strong>
                  ${esc(fixture.home)}
                  vs.
                  ${esc(fixture.away)}
                </strong>

                <small>
                  ${esc(fixture.competition)}
                  ·
                  ${esc(fixture.channel || '')}
                </small>

              </div>

              <span class="date">

                ${formatDate(fixture.date)}

                <br>

                ${esc(fixture.time)}

              </span>

            </div>

          `)
          .join('')
        ||
        '<p class="admin-muted">No hay partidos.</p>';
    }
  }


  /* =========================================================
     NOTICIAS
  ========================================================= */

  function renderArticles() {

    const search =
      ($('#article-search')?.value || '')
        .toLowerCase();

    const category =
      $('#article-filter')?.value || 'TODAS';

    const rows =
      state.articles
        .slice()
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date)
        )
        .filter(article => {

          const categoryOK =
            category === 'TODAS' ||
            article.category === category;

          const searchOK =
            !search ||
            `
              ${article.title}
              ${article.category}
              ${article.subcategory || ''}
            `
              .toLowerCase()
              .includes(search);

          return categoryOK && searchOK;
        });


    const table =
      $('#articles-table');

    if (!table) return;


    table.innerHTML =
      rows
        .map(article => `

          <tr>

            <td>

              <strong>
                ${esc(article.title)}
              </strong>

              <br>

              <small>
                ${esc(article.author || 'DropRugby')}
              </small>

            </td>

            <td>

              ${esc(article.category)}

              <br>

              <small>
                ${esc(
                  article.subcategory ||
                  'Actualidad'
                )}
              </small>

            </td>

            <td>
              ${formatDate(article.date)}
            </td>

            <td>
              <span class="badge">
                PUBLICADA
              </span>
            </td>

            <td>

              <div class="row-actions">

                <button
                  data-edit-article="${esc(article.id)}"
                >
                  Editar
                </button>

                <button
                  data-delete-article="${esc(article.id)}"
                >
                  Eliminar
                </button>

              </div>

            </td>

          </tr>

        `)
        .join('')
      ||
      `
        <tr>
          <td
            colspan="5"
            class="empty-row"
          >
            No hay noticias con esos filtros.
          </td>
        </tr>
      `;
  }


  /* =========================================================
     PARTIDOS
  ========================================================= */

  function renderFixtures() {

    const search =
      ($('#fixture-search')?.value || '')
        .toLowerCase();

    const competition =
      $('#fixture-filter')?.value || 'TODAS';


    const rows =
      state.fixtures
        .map((fixture, index) => ({
          ...fixture,
          _i: index
        }))
        .sort(
          (a, b) =>
            (a.date + a.time)
              .localeCompare(
                b.date + b.time
              )
        )
        .filter(fixture => {

          const competitionOK =
            competition === 'TODAS' ||
            fixture.competition === competition;

          const searchOK =
            !search ||
            `
              ${fixture.home}
              ${fixture.away}
              ${fixture.competition}
            `
              .toLowerCase()
              .includes(search);

          return (
            competitionOK &&
            searchOK
          );
        });


    const table =
      $('#fixtures-table');

    if (!table) return;


    table.innerHTML =
      rows
        .map(fixture => `

          <tr>

            <td>

              <strong>
                ${formatDate(fixture.date)}
              </strong>

            </td>

            <td>
              ${esc(fixture.competition)}
            </td>

            <td>

              <strong>
                ${esc(fixture.home)}
                —
                ${esc(fixture.away)}
              </strong>

              ${
                fixture.venue
                  ? `
                    <br>
                    <small>
                      ${esc(fixture.venue)}
                    </small>
                  `
                  : ''
              }

            </td>

            <td>
              ${esc(fixture.time)}
            </td>

            <td>
              ${esc(fixture.channel || '—')}
            </td>

            <td>

              <div class="row-actions">

                <button
                  data-edit-fixture="${fixture._i}"
                >
                  Editar
                </button>

                <button
                  data-delete-fixture="${fixture._i}"
                >
                  Eliminar
                </button>

              </div>

            </td>

          </tr>

        `)
        .join('')
      ||
      `
        <tr>
          <td
            colspan="6"
            class="empty-row"
          >
            No hay partidos con esos filtros.
          </td>
        </tr>
      `;
  }


  /* =========================================================
     TABLA URBA - ADMIN
  ========================================================= */

  function renderStandings() {

    const tbody =
      $('#standings-admin-body');

    if (!tbody) return;


    const rows =
      state.standings
        .map((team, index) => ({
          ...team,
          _index: index
        }))
        .sort(
          (a, b) =>
            Number(b.pts || 0) -
            Number(a.pts || 0)
        );


    if (!rows.length) {

      tbody.innerHTML = `

        <tr>

          <td
            colspan="7"
            class="empty-row"
          >
            No hay clubes cargados.
          </td>

        </tr>

      `;

      return;
    }


    tbody.innerHTML =
      rows
        .map((team, position) => `

          <tr>

            <td>

              <strong>
                ${position + 1}
              </strong>

            </td>

            <td>

              <div class="standing-logo-preview">

                ${
                  team.logo
                    ? `
                      <img
                        src="${esc(team.logo)}"
                        alt=""
                        onerror="
                          this.style.display='none'
                        "
                      >
                    `
                    : `
                      <span>
                        ${esc(
                          String(team.team || '?')
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </span>
                    `
                }

              </div>

            </td>

            <td>

              <div class="standing-admin-fields">

                <input
                  class="standing-team"
                  data-index="${team._index}"
                  value="${esc(team.team || '')}"
                  placeholder="Nombre del club"
                >

                <input
                  class="standing-logo"
                  data-index="${team._index}"
                  value="${esc(team.logo || '')}"
                  placeholder="URL del escudo"
                >

              </div>

            </td>

            <td>

              <input
                class="standing-number standing-pj"
                data-index="${team._index}"
                type="number"
                min="0"
                value="${Number(team.pj || 0)}"
              >

            </td>

            <td>

              <input
                class="standing-number standing-pg"
                data-index="${team._index}"
                type="number"
                min="0"
                value="${Number(team.pg || 0)}"
              >

            </td>

            <td>

              <input
                class="standing-number standing-pts"
                data-index="${team._index}"
                type="number"
                min="0"
                value="${Number(team.pts || 0)}"
              >

            </td>

            <td>

              <button
                type="button"
                class="standing-delete"
                data-delete-standing="${team._index}"
              >
                Eliminar
              </button>

            </td>

          </tr>

        `)
        .join('');
  }


  /* =========================================================
     RENDER GENERAL
  ========================================================= */

  function renderAll() {

    renderDashboard();

    renderArticles();

    renderFixtures();

    renderStandings();
  }


  /* =========================================================
     NOTICIAS - EDITOR
  ========================================================= */

  function openArticle(id = null) {

    state.editingArticle = id;

    const article =
      id
        ? state.articles.find(
            item => item.id === id
          )
        : null;


    $('#modal-kicker').textContent =
      article
        ? 'EDITAR PUBLICACIÓN'
        : 'NUEVA PUBLICACIÓN';

    $('#modal-title').textContent =
      article
        ? 'Editar noticia'
        : 'Nueva noticia';


    $('#article-id').value =
      article?.id || '';

    $('#article-title').value =
      article?.title || '';

    $('#article-category').value =
      article?.category || 'Los Pumas';

    $('#article-subcategory').value =
      article?.subcategory || 'Actualidad';

    $('#article-author').value =
      article?.author || 'DropRugby';

    $('#article-date').value =
      article?.date || today();

    $('#article-image').value =
      article?.imageUrl ||
      article?.imageClass ||
      'img-tone-1';

    $('#article-excerpt').value =
      article?.excerpt || '';

    $('#article-content').value =
      article?.content || '';

    $('#article-featured').checked =
      !!article?.featured;


    $('#editor-modal').hidden = false;
  }


  async function saveArticle(e) {

    e.preventDefault();


    const title =
      $('#article-title')
        .value
        .trim();


    const id =
      $('#article-id').value ||
      `${slugify(title)}-${Date.now()
        .toString()
        .slice(-5)}`;


    const image =
      $('#article-image')
        .value
        .trim() ||
      'img-tone-1';


    const article = {

      id,

      title,

      category:
        $('#article-category').value,

      subcategory:
        $('#article-subcategory')
          .value
          .trim(),

      date:
        $('#article-date').value,

      author:
        $('#article-author')
          .value
          .trim(),

      excerpt:
        $('#article-excerpt')
          .value
          .trim(),

      content:
        $('#article-content')
          .value
          .trim(),

      featured:
        $('#article-featured').checked,

      url:
        `article.html?id=${encodeURIComponent(id)}`
    };


    if (
      /^(https?:\/\/|\/|\.\/|\.\.\/)/i
        .test(image)
    ) {

      article.imageUrl = image;

    } else {

      article.imageClass = image;

    }


    if (article.featured) {

      state.articles.forEach(
        item => item.featured = false
      );

    }


    const index =
      state.articles.findIndex(
        item => item.id === id
      );


    if (index >= 0) {

      state.articles[index] =
        article;

    } else {

      state.articles.push(
        article
      );

    }


    try {

      await saveData();

      closeModals();

      renderAll();

      switchSection('articles');

      toast(
        'Noticia publicada correctamente.'
      );

    } catch (error) {

      alert(error.message);

    }
  }


  async function deleteArticle(id) {

    if (
      !confirm(
        '¿Eliminar esta noticia?'
      )
    ) {
      return;
    }


    state.articles =
      state.articles.filter(
        article =>
          article.id !== id
      );


    try {

      await saveData();

      renderAll();

      toast(
        'Noticia eliminada.'
      );

    } catch (error) {

      alert(error.message);

    }
  }


  /* =========================================================
     PARTIDOS - EDITOR
  ========================================================= */

  function openFixture(index = null) {

    state.editingFixture = index;

    const fixture =
      index !== null
        ? state.fixtures[index]
        : null;


    $('#fixture-modal-title').textContent =
      fixture
        ? 'Editar partido'
        : 'Nuevo partido';


    $('#fixture-index').value =
      index === null
        ? ''
        : index;


    $('#fixture-competition').value =
      fixture?.competition ||
      'Los Pumas';

    $('#fixture-home').value =
      fixture?.home || '';

    $('#fixture-away').value =
      fixture?.away || '';

    $('#fixture-date').value =
      fixture?.date || today();

    $('#fixture-time').value =
      fixture?.time || '16:00';

    $('#fixture-venue').value =
      fixture?.venue || '';

    $('#fixture-channel').value =
      fixture?.channel || 'ESPN';


    $('#fixture-modal').hidden =
      false;
  }


  async function saveFixture(e) {

    e.preventDefault();


    const index =
      $('#fixture-index').value;


    const fixture = {

      date:
        $('#fixture-date').value,

      competition:
        $('#fixture-competition').value,

      time:
        $('#fixture-time').value,

      home:
        $('#fixture-home')
          .value
          .trim(),

      away:
        $('#fixture-away')
          .value
          .trim(),

      channel:
        $('#fixture-channel')
          .value
          .trim(),

      venue:
        $('#fixture-venue')
          .value
          .trim()

    };


    if (index === '') {

      state.fixtures.push(
        fixture
      );

    } else {

      state.fixtures[
        Number(index)
      ] = fixture;

    }


    try {

      await saveData();

      closeModals();

      renderAll();

      switchSection('fixtures');

      toast(
        'Partido guardado.'
      );

    } catch (error) {

      alert(error.message);

    }
  }


  async function deleteFixture(i) {

    if (
      !confirm(
        '¿Eliminar este partido?'
      )
    ) {
      return;
    }


    state.fixtures.splice(
      Number(i),
      1
    );


    try {

      await saveData();

      renderAll();

      toast(
        'Partido eliminado.'
      );

    } catch (error) {

      alert(error.message);

    }
  }


  /* =========================================================
     TABLA URBA - ACCIONES
  ========================================================= */

  function addStanding() {

    state.standings.push({

      team: 'Nuevo club',

      logo: '',

      pj: 0,

      pg: 0,

      pts: 0

    });


    renderStandings();
  }


  async function saveStandings() {

    const rows =
      $$('#standings-admin-body tr');


    const standings = [];


    rows.forEach(row => {

      const index =
        Number(
          row.querySelector(
            '.standing-team'
          )?.dataset.index
        );


      if (
        !Number.isInteger(index) ||
        !state.standings[index]
      ) {
        return;
      }


      const team =
        row.querySelector(
          '.standing-team'
        )?.value
          .trim() || '';


      const logo =
        row.querySelector(
          '.standing-logo'
        )?.value
          .trim() || '';


      const pj =
        Number(
          row.querySelector(
            '.standing-pj'
          )?.value || 0
        );


      const pg =
        Number(
          row.querySelector(
            '.standing-pg'
          )?.value || 0
        );


      const pts =
        Number(
          row.querySelector(
            '.standing-pts'
          )?.value || 0
        );


      if (!team) {
        return;
      }


      standings.push({

        team,

        logo,

        pj: Math.max(
          0,
          pj
        ),

        pg: Math.max(
          0,
          pg
        ),

        pts: Math.max(
          0,
          pts
        )

      });

    });


    state.standings =
      standings;


    try {

      await saveData();

      renderStandings();

      toast(
        'Tabla de posiciones guardada correctamente.'
      );

    } catch (error) {

      alert(error.message);

    }
  }


  /* =========================================================
     ELIMINAR CLUB
  ========================================================= */

  async function deleteStanding(index) {

    const team =
      state.standings[index];


    if (!team) return;


    if (
      !confirm(
        `¿Eliminar ${team.team || 'este club'}?`
      )
    ) {
      return;
    }


    state.standings.splice(
      index,
      1
    );


    renderStandings();
  }


  /* =========================================================
     MODALES
  ========================================================= */

  function closeModals() {

    if ($('#editor-modal')) {
      $('#editor-modal').hidden =
        true;
    }

    if ($('#fixture-modal')) {
      $('#fixture-modal').hidden =
        true;
    }
  }


  /* =========================================================
     EXPORTAR
  ========================================================= */

  function exportData() {

    const blob =
      new Blob(
        [
          JSON.stringify(
            {
              articles:
                state.articles,

              fixtures:
                state.fixtures,

              standings:
                state.standings
            },
            null,
            2
          )
        ],
        {
          type:
            'application/json'
        }
      );


    const a =
      document.createElement('a');


    a.href =
      URL.createObjectURL(
        blob
      );


    a.download =
      'droprugby-backup.json';


    a.click();


    URL.revokeObjectURL(
      a.href
    );
  }


  /* =========================================================
     IMPORTAR
  ========================================================= */

  function importData(file) {

    if (!file) return;


    const reader =
      new FileReader();


    reader.onload =
      async () => {

        try {

          const data =
            JSON.parse(
              reader.result
            );


          if (
            !Array.isArray(
              data.articles
            ) ||
            !Array.isArray(
              data.fixtures
            )
          ) {

            throw new Error(
              'El archivo no tiene un formato DropRugby válido.'
            );

          }


          state.articles =
            data.articles;


          state.fixtures =
            data.fixtures;


          state.standings =
            Array.isArray(
              data.standings
            )
              ? data.standings
              : [];


          await saveData();

          renderAll();


          alert(
            'Datos importados correctamente.'
          );


        } catch (error) {

          alert(
            error.message ||
            'El archivo no tiene un formato DropRugby válido.'
          );

        }

      };


    reader.readAsText(
      file
    );
  }


  /* =========================================================
     RESET
  ========================================================= */

  async function resetData() {

    if (
      !confirm(
        'Esto reemplazará el contenido online por los datos demo iniciales. ¿Continuar?'
      )
    ) {
      return;
    }


    try {

      const articlesResponse =
        await fetch(
          '/data/articles.json'
        );


      const articles =
        await articlesResponse.json();


      const fixturesResponse =
        await fetch(
          '/data/fixtures.json'
        );


      const fixtures =
        await fixturesResponse.json();


      state.articles =
        articles;

      state.fixtures =
        fixtures;


      /*
       * No borramos standings.
       * La tabla se administra desde
       * el panel.
       */


      await saveData();

      renderAll();


      toast(
        'Datos demo restaurados.'
      );


    } catch (error) {

      alert(
        error.message
      );

    }
  }


  /* =========================================================
     TOAST
  ========================================================= */

  function toast(message) {

    let toastElement =
      $('#admin-toast');


    if (!toastElement) {

      toastElement =
        document.createElement(
          'div'
        );

      toastElement.id =
        'admin-toast';

      document.body.appendChild(
        toastElement
      );
    }


    toastElement.textContent =
      message;


    toastElement.classList.add(
      'show'
    );


    clearTimeout(
      window.__toast
    );


    window.__toast =
      setTimeout(
        () =>
          toastElement.classList.remove(
            'show'
          ),
        2600
      );
  }


  /* =========================================================
     LOGIN
  ========================================================= */

  async function login(e) {

    e.preventDefault();


    const button =
      $('#login-form button');


    button.disabled =
      true;


    $('#login-error')
      .textContent = '';


    try {

      await api(
        'login',
        {
          username:
            $('#login-user')
              .value
              .trim(),

          password:
            $('#login-pass')
              .value
        }
      );


      await loadData();

      showApp();


    } catch (error) {

      $('#login-error')
        .textContent =
        error.message;


    } finally {

      button.disabled =
        false;

    }
  }


  async function logout() {

    try {

      await api(
        'logout'
      );

    } finally {

      location.reload();

    }
  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  $('#login-form')
    ?.addEventListener(
      'submit',
      login
    );


  $('#logout-btn')
    ?.addEventListener(
      'click',
      logout
    );


  $$('.admin-nav')
    .forEach(button => {

      button.addEventListener(
        'click',
        () =>
          switchSection(
            button.dataset.section
          )
      );

    });


  $$('[data-go]')
    .forEach(button => {

      button.addEventListener(
        'click',
        () =>
          switchSection(
            button.dataset.go
          )
      );

    });


  $$('[data-action="new-article"]')
    .forEach(button => {

      button.addEventListener(
        'click',
        () => openArticle()
      );

    });


  $$('[data-action="new-fixture"]')
    .forEach(button => {

      button.addEventListener(
        'click',
        () => openFixture()
      );

    });


  $('#add-standing')
    ?.addEventListener(
      'click',
      addStanding
    );


  $('#save-standings')
    ?.addEventListener(
      'click',
      saveStandings
    );


  $('#article-form')
    ?.addEventListener(
      'submit',
      saveArticle
    );


  $('#fixture-form')
    ?.addEventListener(
      'submit',
      saveFixture
    );


  $$('[data-close]')
    .forEach(button => {

      button.addEventListener(
        'click',
        closeModals
      );

    });


  $('#article-search')
    ?.addEventListener(
      'input',
      renderArticles
    );


  $('#article-filter')
    ?.addEventListener(
      'change',
      renderArticles
    );


  $('#fixture-search')
    ?.addEventListener(
      'input',
      renderFixtures
    );


  $('#fixture-filter')
    ?.addEventListener(
      'change',
      renderFixtures
    );


  document.addEventListener(
    'click',
    event => {

      const editArticle =
        event.target.closest(
          '[data-edit-article]'
        );


      const deleteArticleButton =
        event.target.closest(
          '[data-delete-article]'
        );


      const editFixture =
        event.target.closest(
          '[data-edit-fixture]'
        );


      const deleteFixtureButton =
        event.target.closest(
          '[data-delete-fixture]'
        );


      const deleteStandingButton =
        event.target.closest(
          '[data-delete-standing]'
        );


      if (editArticle) {

        openArticle(
          editArticle.dataset.editArticle
        );

      }


      if (deleteArticleButton) {

        deleteArticle(
          deleteArticleButton
            .dataset
            .deleteArticle
        );

      }


      if (editFixture) {

        openFixture(
          Number(
            editFixture
              .dataset
              .editFixture
          )
        );

      }


      if (deleteFixtureButton) {

        deleteFixture(
          Number(
            deleteFixtureButton
              .dataset
              .deleteFixture
          )
        );

      }


      if (deleteStandingButton) {

        deleteStanding(
          Number(
            deleteStandingButton
              .dataset
              .deleteStanding
          )
        );

      }

    }
  );


  $('#export-data')
    ?.addEventListener(
      'click',
      exportData
    );


  $('#import-data')
    ?.addEventListener(
      'change',
      event =>
        importData(
          event.target.files[0]
        )
    );


  $('#reset-data')
    ?.addEventListener(
      'click',
      resetData
    );


  /* =========================================================
     INICIO
  ========================================================= */

  (async () => {

    try {

      await api(
        'session'
      );

      await loadData();

      showApp();

    } catch {}

  })();

})();

/* ==========================================================================
   DropRugby — script.js
   Datos (una sola carga de /api/content), layout compartido, noticias,
   calendario, tabla URBA, artículo, quiz semanal, buscador y newsletter.
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


/* Escudos locales (assets/clubs). Los links de Discord vencen; si un club
   no tiene logo o tiene uno de Discord, usamos el archivo propio. */
const LOCAL_CLUB_LOGOS = {
  newman: "/assets/clubs/newman.png",
  cuba: "/assets/clubs/cuba.png",
  la_plata: "/assets/clubs/la_plata.png",
  regatas_bella_vista: "/assets/clubs/regatas_bella_vista.png",
  sic: "/assets/clubs/sic.png",
  buenos_aires_crc: "/assets/clubs/buenos_aires_crc.png",
  belgrano_athletic: "/assets/clubs/belgrano_athletic.png",
  los_matreros: "/assets/clubs/los_matreros.png",
  champagnat: "/assets/clubs/champagnat.png",
  los_tilos: "/assets/clubs/los_tilos.png"
};

function applyLocalLogos() {
  Object.entries(LOCAL_CLUB_LOGOS).forEach(([id, logo]) => {
    const team = DROP_RUGBY_TEAMS[id];
    if (team && (!team.logo || /discordapp\.com/.test(team.logo))) team.logo = logo;
  });
}
applyLocalLogos();

/* ==========================================================================
   ESCUDOS DE SELECCIONES
   ========================================================================== */

const DROP_RUGBY_NATIONS = {};

// Selecciones/equipos de desarrollo que pueden aparecer en fixtures aunque
// no estén definidos como una entrada independiente en teams.json.
const DROP_RUGBY_NATION_ALIASES = {
  "argentina xv": "argentina",
  "argentina-xv": "argentina",
  "pumas xv": "argentina"
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

function findConfiguredLogo(logoMap, id, team) {
  const map = logoMap && typeof logoMap === "object" ? logoMap : {};
  const candidates = [
    id,
    team?.id,
    team?.name,
    team?.shortName,
    ...(Array.isArray(team?.aliases) ? team.aliases : [])
  ].filter(Boolean);

  const entries = Object.entries(map);
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeTeamName(candidate);
    const exact = entries.find(([key]) => normalizeTeamName(key) === normalizedCandidate);
    if (exact && exact[1]) return String(exact[1]);
  }

  return "";
}

function registerNation(id, team, nationLogos) {
  if (!team || typeof team !== "object") return;

  const name = team.name || id;
  const shortName = team.shortName || "";
  const aliases = [
    ...(Array.isArray(team.aliases) ? team.aliases : []),
    shortName,
    name
  ].filter(Boolean);

  DROP_RUGBY_NATIONS[id] = {
    id,
    name,
    shortName,
    logo: findConfiguredLogo(nationLogos, id, team) || team.logo || "",
    aliases
  };
}

function applyTeamData(content) {
  if (!content) return;

  const clubLogos = content?.settings?.clubLogos || {};
  const nationLogos = content?.settings?.nationLogos || {};

  if (content?.teams?.clubs && typeof content.teams.clubs === "object") {
    Object.entries(content.teams.clubs).forEach(([id, team]) => {
      if (!team || typeof team !== "object") return;

      DROP_RUGBY_TEAMS[id] = {
        id,
        name: team.name || id,
        logo: findConfiguredLogo(clubLogos, id, team) || team.logo || "",
        aliases: Array.isArray(team.aliases) ? team.aliases : []
      };
    });
  }

  if (content?.teams?.nations && typeof content.teams.nations === "object") {
    Object.entries(content.teams.nations).forEach(([id, team]) => {
      registerNation(id, team, nationLogos);
    });
  }

  Object.entries(clubLogos).forEach(([id, logo]) => {
    if (DROP_RUGBY_TEAMS[id] && logo) {
      DROP_RUGBY_TEAMS[id].logo = logo;
    }
  });

  applyLocalLogos();

  Object.entries(nationLogos).forEach(([key, logo]) => {
    if (!logo) return;
    const nation = Object.values(DROP_RUGBY_NATIONS).find(item =>
      normalizeTeamName(item.id) === normalizeTeamName(key) ||
      normalizeTeamName(item.name) === normalizeTeamName(key) ||
      normalizeTeamName(item.shortName) === normalizeTeamName(key) ||
      item.aliases.some(alias => normalizeTeamName(alias) === normalizeTeamName(key))
    );
    if (nation) nation.logo = logo;
  });
}

function getNationByName(value) {
  const key = normalizeTeamName(value);
  const aliasId = DROP_RUGBY_NATION_ALIASES[key];

  if (aliasId && DROP_RUGBY_NATIONS[aliasId]) {
    return DROP_RUGBY_NATIONS[aliasId];
  }

  return Object.values(DROP_RUGBY_NATIONS).find(nation =>
    normalizeTeamName(nation.id) === key ||
    normalizeTeamName(nation.name) === key ||
    normalizeTeamName(nation.shortName) === key ||
    nation.aliases.some(alias => normalizeTeamName(alias) === key)
  ) || null;
}

function getTeamByName(value) {
  const key = normalizeTeamName(value);

  const club = Object.values(DROP_RUGBY_TEAMS).find(team =>
    normalizeTeamName(team.name) === key ||
    team.aliases.some(alias => normalizeTeamName(alias) === key)
  );

  if (club) return club;
  return getNationByName(value);
}

function teamShield(value, className = "team-shield") {
  const team = getTeamByName(value);
  const initials =
    String(team?.name || value || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(word => word[0])
      .join("")
      .toUpperCase() || "?";

  if (!team || !team.logo) {
    return `<span class="${className} team-shield-fallback" aria-hidden="true">${initials}</span>`;
  }

  const safeLogo = String(team.logo).replace(/"/g, "&quot;");
  const safeName = String(team.name).replace(/"/g, "&quot;");
  const fallback = `<span class="${className} team-shield-fallback" aria-hidden="true">${initials}</span>`;

  return `
    <span class="team-shield-wrap" aria-label="Escudo de ${safeName}">
      <img
        class="${className}"
        src="${safeLogo}"
        alt="Escudo de ${safeName}"
        loading="eager"
        decoding="async"
        referrerpolicy="no-referrer"
        onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline-flex';"
      >
      <span class="${className} team-shield-fallback" aria-hidden="true" style="display:none">${initials}</span>
    </span>
  `;
}


/* ==========================================================================
   DATOS GLOBALES
   ========================================================================== */

let CONTENT_CACHE = null;
let CONTENT_LOADING = null;

let FIXTURES_CACHE = null;
let STANDINGS_CACHE = null;
let TEAMS_LOADED = false;
let LOCAL_TEAMS_CACHE = null;

async function loadLocalTeams() {
  if (LOCAL_TEAMS_CACHE) return LOCAL_TEAMS_CACHE;

  try {
    const response = await fetch(BASE + "data/teams.json", { cache: "no-store" });
    if (!response.ok) throw new Error("teams.json unavailable");
    const data = await response.json();
    LOCAL_TEAMS_CACHE = data && typeof data === "object" ? data : {};
  } catch (_) {
    LOCAL_TEAMS_CACHE = {};
  }

  return LOCAL_TEAMS_CACHE;
}


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
      const localTeams = await loadLocalTeams();

      CONTENT_CACHE = data || {};

      // El contenido remoto puede provenir de una versión anterior del blob
      // sin teams.nations. Mezclamos siempre el catálogo local para que los
      // fixtures sigan encontrando las selecciones y sus aliases. Los logos
      // guardados en settings.nationLogos tienen prioridad.
      CONTENT_CACHE.teams = {
        clubs: {
          ...(localTeams.clubs || {}),
          ...(CONTENT_CACHE.teams?.clubs || {})
        },
        nations: {
          ...(localTeams.nations || {}),
          ...(CONTENT_CACHE.teams?.nations || {})
        }
      };

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
   CALENDARIO — mini rectángulos por competición
   ========================================================================== */

const COMPETITION_ORDER = [
  "LOS PUMAS",
  "SUPER RUGBY",
  "URBA TOP 14"
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
   TABLA URBA TOP 14
   ========================================================================== */

async function renderUrbaStandings() {
  const element =
    document.getElementById(
      "urba-standings"
    );

  if (!element) return;

  const TOP14_NAMES = new Set([
    "newman", "casi", "hindu", "alumni", "sic",
    "regatas bella vista", "los tilos", "belgrano athletic",
    "cuba", "atletico del rosario", "los matreros", "la plata",
    "buenos aires c&rc", "champagnat"
  ]);

  const TOP14_ALIASES = {
    "belgrano": "belgrano athletic",
    "regatas": "regatas bella vista",
    "plaza": "atletico del rosario",
    "biei": "buenos aires c&rc",
    "bac": "buenos aires c&rc",
    "champa": "champagnat"
  };

  const normalizePublicTeam = (name) =>
    String(name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const standings =
    (await loadStandings())
      .filter((team) => {
        const key = normalizePublicTeam(team.team);
        return TOP14_NAMES.has(TOP14_ALIASES[key] || key);
      })
      .map((team) => ({
        ...team,
        team:
          TOP14_ALIASES[normalizePublicTeam(team.team)] ||
          team.team
      }))
      .slice(0, 14)
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
   LAYOUT COMPARTIDO (header y footer)
   Una sola definición para todas las páginas: si cambia el menú, se cambia acá.
   ========================================================================== */

const SITE_NAV = [
  ["index.html", "Inicio", "home"],
  ["rugby-xv.html", "Rugby XV", "xv"],
  ["escudos.html", "Escudos", "escudos"],
  ["mayor-menor.html", "Mayor o menor", "mayormenor"],
  ["wordle.html", "Wordle", "wordle"],
  ["quiz.html", "Quiz", "quiz"],
  ["urba-top-14.html", "URBA Top 14", "urba"],
  ["calendario.html", "Calendario", "calendario"],
  ["contacto.html", "Contacto", "contacto"]
];

const SOCIAL = {
  instagram: "https://www.instagram.com/drop_rugby/",
  tiktok: "https://www.tiktok.com/@drop.rugby",
  mail: "contactodroprugby@gmail.com"
};

const ICONS = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2.2 1.6 3.7 3.8 4v3c-1.4 0-2.7-.4-3.8-1.1v6.300c0 3.200-2.400 5.800-5.700 5.800a5.700 5.700 0 0 1-1-11.300v3.200a2.600 2.600 0 1 0 3.500 2.400V3z"/></svg>'
};

function renderLayout() {
  const page = document.body.dataset.page || "";
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");

  const linkHTML = ([href, label, key]) =>
    `<a href="${BASE}${href}" class="${key === page ? "active" : ""}${key === "quiz" ? " nav-quiz" : ""}">${label}</a>`;
  const navLinks = SITE_NAV.map(linkHTML).join("");
  // En escritorio el logo ya lleva al inicio: se omite "Inicio" para que entre el menú.
  const desktopLinks = SITE_NAV.slice(1).map(linkHTML).join("");

  if (header) {
    header.outerHTML = `
      <div class="read-progress" aria-hidden="true"><i id="read-progress-bar"></i></div>
      <header class="site-header">
        <div class="wrap header-inner">
          <a class="brand" href="${BASE}index.html" aria-label="DropRugby inicio">
            <img src="/logo.png" alt="" width="42" height="42">
            <span class="drop-wordmark">Drop<span>Rugby</span></span>
          </a>
          <nav class="main-nav" aria-label="Navegación principal">${desktopLinks}</nav>
          <div class="header-tools">
            <a class="icon-btn social" href="${SOCIAL.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.instagram}</a>
            <a class="icon-btn social" href="${SOCIAL.tiktok}" target="_blank" rel="noopener" aria-label="TikTok">${ICONS.tiktok}</a>
            <button class="icon-btn menu-btn" type="button" aria-label="Abrir menú" aria-expanded="false"><span></span><span></span><span></span></button>
          </div>
        </div>
        <nav class="mobile-nav" aria-label="Menú">
          ${navLinks}
          <div class="mobile-social">
            <a href="${SOCIAL.instagram}" target="_blank" rel="noopener">Instagram ↗</a>
            <a href="${SOCIAL.tiktok}" target="_blank" rel="noopener">TikTok ↗</a>
          </div>
        </nav>
      </header>`;
  }

  if (footer) {
    footer.outerHTML = `
      <footer class="site-footer">
        <div class="wrap">
          <div class="footer-grid">
            <div>
              <a class="brand" href="${BASE}index.html">
                <img src="/logo.png" alt="" width="42" height="42" loading="lazy">
                <span class="drop-wordmark">Drop<span>Rugby</span></span>
              </a>
              <p>Minijuegos de rugby: armá tu XV, adiviná escudos y jugá con el URBA Top 14.</p>
            </div>
            <div class="footer-col">
              <strong>SECCIONES</strong>
              ${SITE_NAV.slice(1, 8).map(([href, label]) => `<a href="${BASE}${href}">${label}</a>`).join("")}
            </div>
            <div class="footer-col">
              <strong>SEGUINOS</strong>
              <a href="${SOCIAL.instagram}" target="_blank" rel="noopener">Instagram</a>
              <a href="${SOCIAL.tiktok}" target="_blank" rel="noopener">TikTok</a>
              <a href="${BASE}contacto.html">Contacto</a>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} DropRugby</span>
            <span>Rugby para jugar</span>
          </div>
        </div>
      </footer>
      <button class="to-top" id="to-top" type="button" aria-label="Volver arriba">↑</button>`;
  }
}

function setupMobileMenu() {
  const btn = document.querySelector(".menu-btn");
  const nav = document.querySelector(".mobile-nav");
  if (!btn || !nav) return;

  const set = open => {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", () => set(!nav.classList.contains("open")));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => set(false)));
  window.addEventListener("resize", () => { if (window.innerWidth > 1100) set(false); });
}

function setupScrollUI() {
  const bar = document.getElementById("read-progress-bar");
  const toTop = document.getElementById("to-top");
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    if (toTop) toTop.classList.toggle("show", y > 900);

    if (bar) {
      const body = document.querySelector(".article-body");
      if (!body) { bar.style.width = "0"; return; }
      const start = body.offsetTop - 120;
      const end = body.offsetTop + body.offsetHeight - window.innerHeight * 0.6;
      const pct = Math.max(0, Math.min(1, (y - start) / Math.max(1, end - start)));
      bar.style.width = (pct * 100).toFixed(1) + "%";
    }
  }

  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  toTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  update();
}

let revealObserver = null;

function observeReveals(root = document) {
  const items = root.querySelectorAll(".reveal:not(.visible)");
  if (!("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("visible"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
  }
  items.forEach(el => revealObserver.observe(el));
}


/* ==========================================================================
   AYUDAS DE ROTULADO
   ========================================================================== */

function categoryLabel(category) {
  const key = normalizeTeamName(category);
  if (key === "super rugby") return "Internacional";
  if (key === "urba top 14") return "URBA Top 14";
  return category || "Rugby";
}

/* ==========================================================================
   PRÓXIMOS PARTIDOS Y TABLA (home)
   ========================================================================== */

async function renderMatches() {
  const rail = document.getElementById("home-matches");
  if (!rail) return;

  const fixtures = (await loadFixtures())
    .filter(f => f && f.date)
    .slice()
    .sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`));

  const today = getTodayISO();
  let list = fixtures.filter(f => f.date >= today).slice(0, 10);
  const title = document.getElementById("home-matches-title");

  if (!list.length) {
    // Sin partidos futuros cargados: mostramos los últimos para no dejar la franja vacía.
    list = fixtures.slice(-6).reverse();
    if (title && list.length) title.textContent = "Últimos partidos";
  }

  if (!list.length) {
    rail.outerHTML = `<p class="empty-state">Todavía no hay partidos cargados.</p>`;
    return;
  }

  rail.innerHTML = list.map(f => {
    const d = dateFromISO(f.date);
    const day = f.date === today ? "HOY" : `${DIAS[d.getDay()].slice(0, 3)} ${formatDateShort(f.date).slice(0, 6)}`;
    return `
      <article class="match-card">
        <div class="match-top"><b>${escapeHTML(String(categoryLabel(f.competition || "Rugby")).toUpperCase())}</b><span>${day}</span></div>
        <div class="match-team">${teamShield(f.home)}<span>${escapeHTML(f.home || "")}</span></div>
        <div class="match-team">${teamShield(f.away)}<span>${escapeHTML(f.away || "")}</span></div>
        <div class="match-foot"><time>${escapeHTML(f.time || "--:--")}</time><span>${escapeHTML(f.channel || f.venue || "")}</span></div>
      </article>`;
  }).join("");
}

async function renderMiniStandings() {
  const el = document.getElementById("home-standings");
  if (!el) return;

  const rows = (await loadStandings())
    .slice()
    .sort((a, b) => (Number(b.pts) || 0) - (Number(a.pts) || 0) || (Number(b.diff) || 0) - (Number(a.diff) || 0))
    .slice(0, 6);

  if (!rows.length) {
    el.closest(".side-card")?.remove();
    return;
  }

  el.innerHTML = `
    <table class="mini-table">
      ${rows.map((t, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><div class="standing-team">${teamShield(t.team)}<span>${escapeHTML(t.team || "")}</span></div></td>
          <td>${Number(t.pts) || 0}</td>
        </tr>`).join("")}
    </table>`;
}


/* ==========================================================================
   QUIZ SEMANAL
   El contenido se edita desde el panel (sección "Quiz semanal").
   ========================================================================== */

let QUIZ_CACHE;

async function loadQuiz() {
  if (QUIZ_CACHE !== undefined) return QUIZ_CACHE;

  let quiz = (await loadContent())?.quiz;

  if (!quiz) {
    try {
      const response = await fetch(BASE + "data/quiz.json", { cache: "no-store" });
      if (response.ok) quiz = await response.json();
    } catch (_) {}
  }

  const questions = Array.isArray(quiz?.questions)
    ? quiz.questions.filter(q => q && q.q && Array.isArray(q.options) && q.options.filter(Boolean).length >= 2)
    : [];

  QUIZ_CACHE = quiz && quiz.active !== false && questions.length
    ? { ...quiz, id: quiz.id || "quiz", title: quiz.title || "Quiz semanal", questions }
    : null;

  return QUIZ_CACHE;
}

function quizStore(quiz, value) {
  const key = `drop_quiz_${quiz.id}`;
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
  return null;
}

function quizVerdict(score, total) {
  const pct = total ? score / total : 0;
  if (pct === 1) return ["Puntaje perfecto.", "Capitán indiscutido: no se te escapó ni una."];
  if (pct >= 0.7) return ["Gran partido.", "Titular asegurado para el fin de semana."];
  if (pct >= 0.4) return ["Zafaste.", "Arrancás en el banco, pero entrás en el segundo tiempo."];
  return ["A entrenar.", "Te toca tercer tiempo de estudio. La semana que viene hay revancha."];
}

function mountQuiz(el, quiz) {
  const total = quiz.questions.length;
  const letters = "ABCDEF";
  let index = 0;
  let score = 0;
  let marks = [];

  const top = () => `
    <div class="quiz-top">
      <span class="drop-kicker">${escapeHTML(quiz.week || "Quiz semanal")}</span>
      <span class="quiz-score">${score} / ${total}</span>
    </div>
    <div class="quiz-bar">${quiz.questions.map((_, i) =>
      `<i class="${marks[i] === true ? "ok" : marks[i] === false ? "bad" : i === index ? "now" : ""}"></i>`
    ).join("")}</div>`;

  function intro() {
    el.innerHTML = `
      <div class="quiz-top"><span class="drop-kicker">${escapeHTML(quiz.week || "Quiz semanal")}</span><span class="quiz-score">${total} preguntas</span></div>
      <h3>${escapeHTML(quiz.title)}</h3>
      ${quiz.intro ? `<p class="quiz-intro-text">${escapeHTML(quiz.intro)}</p>` : ""}
      <div class="quiz-actions"><button class="btn accent" type="button" data-start>Empezar el quiz →</button></div>`;
    el.querySelector("[data-start]").addEventListener("click", () => { index = 0; score = 0; marks = []; question(); });
  }

  function question() {
    const q = quiz.questions[index];
    const options = q.options.map((text, i) => ({ text, i })).filter(o => String(o.text || "").trim());

    el.innerHTML = `
      ${top()}
      <h3>${escapeHTML(q.q)}</h3>
      <div class="quiz-options">
        ${options.map((o, n) => `<button class="quiz-option" type="button" data-option="${o.i}"><b>${letters[n]}</b><span>${escapeHTML(o.text)}</span></button>`).join("")}
      </div>
      <div data-feedback></div>
      <div class="quiz-actions"></div>`;

    el.querySelectorAll(".quiz-option").forEach(btn => btn.addEventListener("click", () => {
      const picked = Number(btn.dataset.option);
      const correct = Number(q.correct) || 0;
      const ok = picked === correct;

      marks[index] = ok;
      if (ok) score++;

      el.querySelectorAll(".quiz-option").forEach(b => {
        b.disabled = true;
        const i = Number(b.dataset.option);
        if (i === correct) b.classList.add("is-correct");
        else if (i === picked) b.classList.add("is-wrong");
      });

      el.querySelector(".quiz-score").textContent = `${score} / ${total}`;
      el.querySelector(".quiz-bar").children[index].className = ok ? "ok" : "bad";

      el.querySelector("[data-feedback]").innerHTML = `
        <div class="quiz-feedback ${ok ? "ok" : "bad"}" role="status">
          <strong>${ok ? "¡Correcto!" : "No era esa."}</strong>
          ${q.explain ? escapeHTML(q.explain) : ok ? "" : `La respuesta correcta: ${escapeHTML(q.options[correct] || "")}.`}
        </div>`;

      const last = index === total - 1;
      const actions = el.querySelector(".quiz-actions");
      actions.innerHTML = `<button class="btn" type="button">${last ? "Ver mi resultado →" : "Siguiente pregunta →"}</button>`;
      const nextBtn = actions.firstElementChild;
      nextBtn.addEventListener("click", () => {
        if (last) { quizStore(quiz, { score, total, marks }); result(); }
        else { index++; question(); }
      });
      nextBtn.focus({ preventScroll: true });
    }));
  }

  function result() {
    const [headline, line] = quizVerdict(score, total);
    const pageUrl = new URL(BASE + "quiz.html", location.href).href;
    const text = `Saqué ${score}/${total} en el quiz semanal de DropRugby 🏉 ¿Me ganás?`;
    index = -1;

    el.innerHTML = `
      ${top()}
      <div class="quiz-result">
        <div class="quiz-result-score">${score}<small> / ${total}</small></div>
        <h3>${headline}</h3>
        <p>${line}</p>
        <div class="quiz-share">
          <a class="chip" href="https://wa.me/?text=${encodeURIComponent(text + " " + pageUrl)}" target="_blank" rel="noopener">Desafiar por WhatsApp</a>
          <a class="chip" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener">Compartir en X</a>
          <button class="chip" type="button" data-copy>Copiar resultado</button>
        </div>
      </div>
      <div class="quiz-actions">
        <button class="btn ghost" type="button" data-retry>Jugar de nuevo</button>
        <a class="btn" href="${BASE}index.html#noticias">Seguir leyendo →</a>
      </div>`;

    el.querySelector("[data-copy]").addEventListener("click", async event => {
      try {
        await navigator.clipboard.writeText(`${text} ${pageUrl}`);
        event.currentTarget.textContent = "¡Copiado!";
      } catch (_) {}
    });

    el.querySelector("[data-retry]").addEventListener("click", () => {
      quizStore(quiz, null);
      index = 0; score = 0; marks = [];
      question();
    });
  }

  const saved = quizStore(quiz);
  if (saved && saved.total === total) {
    score = Number(saved.score) || 0;
    marks = Array.isArray(saved.marks) ? saved.marks : [];
    result();
  } else {
    intro();
  }
}

async function renderQuiz() {
  const mounts = document.querySelectorAll("[data-quiz]");
  if (!mounts.length) return;

  const quiz = await loadQuiz();
  const band = document.getElementById("quiz-band");

  if (!quiz) {
    // En la home la franja se oculta; en quiz.html avisamos.
    if (band) band.remove();
    mounts.forEach(el => {
      if (!el.isConnected) return;
      el.innerHTML = `<div class="quiz-empty"><h3>El quiz vuelve pronto.</h3><p>Estamos preparando las preguntas de esta semana.</p></div>`;
    });
    return;
  }

  const set = (id, value) => { const el = document.getElementById(id); if (el && value) el.textContent = value; };
  set("quiz-title", quiz.title);
  set("quiz-intro", quiz.intro);
  set("quiz-count", String(quiz.questions.length));

  mounts.forEach(el => mountQuiz(el, quiz));
}


/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */

async function initDropRugby() {
  renderLayout();
  setupMobileMenu();
  setupScrollUI();

  await Promise.all([
    renderMatches(),
    renderMiniStandings(),
    renderCalendar(),
    renderUrbaStandings(),
    renderQuiz(),
    typeof renderGames === "function" ? renderGames() : null
  ].map(p => Promise.resolve(p).catch(error => console.error("DropRugby:", error))));

  observeReveals();
  window.dispatchEvent(new Event("scroll"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDropRugby, { once: true });
} else {
  initDropRugby();
}

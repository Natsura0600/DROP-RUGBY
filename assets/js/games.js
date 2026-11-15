/* ==========================================================================
   DropRugby — minijuegos
   Se carga después de script.js y usa sus helpers (loadContent, loadStandings,
   loadGameSettings, teamShield, getTeamByName, escapeHTML…).
   initDropRugby() llama a renderGames().

   Juegos: Rugby XV (rugby-xv.html), Wordle (wordle.html), Escudos (escudos.html).
   La configuración de cada juego se edita en el panel (sección "Juegos").
   ========================================================================== */

/* ---------- utilidades ---------- */

// Clubes por división (temporada 2027). Los que valen son los del panel,
// que llegan en /api/content → divisions; estos son el respaldo.
const DEFAULT_DIVISION_CLUBS = {
  top14: [
    "Newman", "CASI", "SIC", "Buenos Aires C&RC", "Belgrano Athletic", "Regatas Bella Vista",
    "Hindú", "Los Tilos", "CUBA", "Atletico del Rosario", "La Plata", "Alumni",
    "San Cirano", "San Luis"
  ],
  primeraA: [
    "Manuel Belgrano", "Banco Nación", "Lomas Athletic", "Curupaytí", "San Fernando", "Pucará",
    "Gimnasia y Esgrima", "Hurling", "San Andrés", "Pueyrredón", "Olivos", "Deportiva Francesa",
    "Champagnat", "Los Matreros"
  ],
  sra: ["Pampas", "Tarucas", "Dogos XV", "Capibaras XV", "Peñarol Rugby", "Selknam", "Cobras", "Yacaré XV"]
};

const DIVISION_TABLE_KEY = { primeraA: "standingsA", sra: "standingsSRA" };
const DIVISION_LABEL = { top14: "Top 14", primeraA: "Primera A", sra: "Super Rugby Américas" };

// Super Rugby Américas (SRA): sus jugadores van en un modo aparte de Rugby XV.
const SRA_TEAMS = [
  { name: "Pampas", aliases: ["Pampas XV"] },
  { name: "Tarucas", aliases: [] },
  { name: "Dogos XV", aliases: ["Dogos"] },
  { name: "Capibaras XV", aliases: ["Capibaras"] },
  { name: "Peñarol Rugby", aliases: ["Penarol Rugby", "Peñarol", "Penarol"] },
  { name: "Selknam", aliases: [] },
  { name: "Cobras", aliases: ["Cobras Brasil", "Cobras Brasil XV"] },
  { name: "Yacaré XV", aliases: ["Yacare XV", "Yacaré", "Yacare"] }
];

const SRA_KEYS = new Set(SRA_TEAMS.flatMap(t => [t.name, ...t.aliases]).map(n => normalizeTeamName(n)));

function isSraClub(name) {
  return SRA_KEYS.has(normalizeTeamName(name));
}

async function divisionClubNames(division) {
  const content = await loadContent();
  const saved = content?.divisions?.[division]?.clubs;
  return Array.isArray(saved) && saved.length ? saved : DEFAULT_DIVISION_CLUBS[division] || [];
}

function gStore(key, value) {
  const k = `drop_game_${key}`;
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(k) || "null");
    if (value === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(value));
  } catch (_) {}
  return null;
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(list, n = 1) {
  return shuffle(list).slice(0, n);
}

async function copyText(text, button) {
  const original = button ? button.textContent : "";
  let ok = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    ok = false;
    window.prompt("Copiá este texto:", text);
  }
  if (button && ok) {
    button.textContent = "¡Copiado!";
    setTimeout(() => { button.textContent = original; }, 1800);
  }
}

/** Reinicia una animación CSS de clase (shake, pop-in…). */
function replay(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

const reducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Papelitos de festejo. */
function confetti(amount = 70) {
  if (reducedMotion()) return;
  const layer = document.createElement("div");
  layer.className = "confetti";
  layer.setAttribute("aria-hidden", "true");
  const colors = ["#d71920", "#111315", "#f4f1ec", "#16835b", "#e8a100"];
  for (let i = 0; i < amount; i++) {
    const bit = document.createElement("i");
    bit.style.left = Math.random() * 100 + "%";
    bit.style.background = colors[i % colors.length];
    bit.style.animationDelay = Math.random() * 0.5 + "s";
    bit.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
    bit.style.setProperty("--drift", (Math.random() * 240 - 120).toFixed(0) + "px");
    bit.style.setProperty("--spin", (Math.random() * 900 - 450).toFixed(0) + "deg");
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3600);
}

/** Clave de comparación: minúsculas, sin tildes ni signos. */
function nameKey(value) {
  return normalizeTeamName(value).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Letras para el Wordle: mayúsculas, sin tildes, conservando la Ñ. */
function wordLetters(value) {
  return String(value || "")
    .normalize("NFC")
    .toUpperCase()
    .replace(/Ñ/g, "\u0001")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0001/g, "Ñ")
    .replace(/[^A-ZÑ]/g, "");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** Clubes de una división: los de su tabla (en su orden) más los que falten. */
async function loadClubs(division = "top14") {
  const content = await loadContent();
  const names = await divisionClubNames(division);
  const inDivision = new Set(names.map(name => normalizeTeamName(getTeamByName(name)?.name || name)));
  const tableKey = DIVISION_TABLE_KEY[division];
  const table = tableKey
    ? (Array.isArray(content?.[tableKey]) ? content[tableKey] : [])
    : await loadStandings();
  const standings = table.filter(row => inDivision.has(normalizeTeamName(getTeamByName(row.team)?.name || row.team)));
  const seen = new Set();
  const out = [];
  const add = (name, row) => {
    if (!name) return;
    const team = getTeamByName(name);
    const canonical = team?.name || name;
    const key = normalizeTeamName(canonical);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ name: canonical, logo: team?.logo || "", row: row || null });
  };
  standings.forEach(row => add(row.team, row));
  names.forEach(name => add(name, null));
  return out;
}

let PLAYERS_CACHE;

/** Jugadores: primero los guardados desde el panel; si no hay, data/players.json. */
async function loadPlayers() {
  if (PLAYERS_CACHE) return PLAYERS_CACHE;

  const content = await loadContent();

  const clean = list => (Array.isArray(list) ? list : [])
    .filter(p => p && (p.name || p.last))
    .map(p => {
      let first = String(p.first || "").trim();
      let last = String(p.last || "").trim();
      if (!last) {
        const parts = String(p.name || "").trim().split(/\s+/);
        first = parts.length > 1 ? parts[0] : "";
        last = parts.slice(parts.length > 1 ? 1 : 0).join(" ");
      }
      const positions = playerPositions(p);
      return {
        first,
        last,
        name: `${first} ${last}`.trim(),
        club: getTeamByName(p.club)?.name || String(p.club || "").trim(),
        position: positions[0] || null,
        positions
      };
    });

  PLAYERS_CACHE = clean(content?.players);

  if (!PLAYERS_CACHE.length) {
    try {
      const response = await fetch(BASE + "data/players.json", { cache: "no-store" });
      const data = response.ok ? await response.json() : {};
      PLAYERS_CACHE = clean(Array.isArray(data) ? data : data.players);
    } catch (_) {
      PLAYERS_CACHE = [];
    }
  }

  return PLAYERS_CACHE;
}

/** Puestos de un jugador (1 a 15). Acepta "positions" (varios) o "position" (uno). */
function playerPositions(p) {
  const raw = Array.isArray(p?.positions) ? p.positions : [p?.position];
  return [...new Set(raw.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 15))];
}

/** Comprueba que una imagen cargue de verdad. */
function imageLoads(src) {
  return new Promise(resolve => {
    if (!src) return resolve(false);
    const img = new Image();
    const timer = setTimeout(() => resolve(false), 6000);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.referrerPolicy = "no-referrer";
    img.src = src;
  });
}

function gamePaused(root) {
  root.innerHTML = `<div class="quiz-empty"><h3>Este juego está en pausa.</h3><p>Volvé pronto: mientras tanto, probá los otros.</p>
    <div class="quiz-actions center"><a class="btn accent" href="${BASE}/#juegos">Ver los juegos</a></div></div>`;
}

/* ==========================================================================
   1) RUGBY XV — escribí jugadores y armá el equipo contra reloj
   ========================================================================== */

// Cancha vista desde atrás del equipo: el 15 abajo de todo y la formación
// sube hasta los forwards arriba. El 11 va a la izquierda y el 14 a la derecha.
const XV_POSITIONS = [
  { n: 15, name: "Fullback", short: "Fullback", role: "fullback", row: 6, col: 3 },
  { n: 11, name: "Wing", short: "Wing", role: "wing", row: 6, col: 1 },
  { n: 14, name: "Wing", short: "Wing", role: "wing", row: 6, col: 5 },
  { n: 12, name: "Centro", short: "Centro", role: "centro", row: 5, col: 2 },
  { n: 13, name: "Centro", short: "Centro", role: "centro", row: 5, col: 4 },
  { n: 9, name: "Medio scrum", short: "M. scrum", role: "medio scrum", row: 4, col: 2 },
  { n: 10, name: "Apertura", short: "Apertura", role: "apertura", row: 4, col: 4 },
  { n: 6, name: "Ala", short: "Ala", role: "ala", row: 3, col: 1 },
  { n: 8, name: "Octavo", short: "Octavo", role: "octavo", row: 3, col: 3 },
  { n: 7, name: "Ala", short: "Ala", role: "ala", row: 3, col: 5 },
  { n: 4, name: "Segunda línea", short: "2ª línea", role: "segunda línea", row: 2, col: 2 },
  { n: 5, name: "Segunda línea", short: "2ª línea", role: "segunda línea", row: 2, col: 4 },
  { n: 1, name: "Pilar izquierdo", short: "Pilar", role: "pilar", row: 1, col: 2 },
  { n: 2, name: "Hooker", short: "Hooker", role: "hooker", row: 1, col: 3 },
  { n: 3, name: "Pilar derecho", short: "Pilar", role: "pilar", row: 1, col: 4 }
];

const XV_PARTICLES = new Set(["de", "del", "la", "las", "los", "di", "da", "san", "y", "van", "von", "mc"]);

function xvPosition(n) {
  return XV_POSITIONS.find(p => p.n === Number(n));
}

function xvPositionLabel(n) {
  const pos = xvPosition(n);
  return pos ? `${pos.n} · ${pos.name}` : "";
}

/** "Wing o fullback", "Pilar", "Centro o apertura"… a partir de los números. */
function xvRolesLabel(positions) {
  const roles = [...new Set((positions || []).map(n => xvPosition(n)?.role).filter(Boolean))];
  if (!roles.length) return "";
  const text = roles.length > 1 ? `${roles.slice(0, -1).join(", ")} o ${roles[roles.length - 1]}` : roles[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Puestos donde puede entrar un jugador: solo los que tiene cargados en el panel. */
function xvSlotsForPlayer(player) {
  return [...new Set(player.positions || [])].sort((a, b) => a - b);
}

/**
 * Busca jugadores a partir de lo que escribió la persona.
 * Acepta apellido solo, nombre + apellido y errores de tipeo chicos.
 * El nombre de pila solo no alcanza (hay demasiados "Tomás").
 */
function xvFind(players, text) {
  const q = nameKey(text);
  if (q.length < 2) return [];

  const exactFull = players.filter(p => p._full === q);
  if (exactFull.length) return exactFull;

  const exactLast = players.filter(p => p._last === q);
  if (exactLast.length) return exactLast;

  const tokens = q.split(" ");
  const subset = players.filter(p =>
    tokens.every(t => p._tokens.includes(t)) && tokens.some(t => p._surname.includes(t))
  );
  if (subset.length) return subset;

  // Tolerancia a errores de tipeo: 1 letra cada ~5.
  const tolerance = q.length >= 9 ? 2 : q.length >= 5 ? 1 : 0;
  if (!tolerance) return [];
  const scored = players
    .map(p => ({
      p,
      d: Math.min(
        levenshtein(q, p._last),
        levenshtein(q, p._full),
        ...p._surname.map(s => (s.length >= 5 ? levenshtein(q, s) : 9))
      )
    }))
    .filter(x => x.d <= tolerance)
    .sort((a, b) => a.d - b.d);
  if (!scored.length) return [];
  return scored.filter(x => x.d === scored[0].d).map(x => x.p);
}

async function mountRugbyXV(root) {
  const settings = (await loadGameSettings()).xv;
  if (!settings.enabled) return gamePaused(root);

  const allPlayers = (await loadPlayers())
    .filter(p => p.positions.length)
    .map(p => {
      const full = nameKey(p.name);
      const last = nameKey(p.last);
      return {
        ...p,
        _full: full,
        _last: last,
        _tokens: full.split(" "),
        _surname: last.split(" ").filter(t => !XV_PARTICLES.has(t))
      };
    });

  const competitions = [
    { id: "urba", label: "URBA", sub: "Top 14 y Primera A", logo: "/assets/competitions/urba.png", filter: p => !isSraClub(p.club) },
    { id: "sra", label: "SRA", sub: "Super Rugby Américas", logo: "/assets/competitions/sra.png", filter: p => isSraClub(p.club) }
  ].map(c => ({ ...c, players: allPlayers.filter(c.filter) }))
    .map(c => ({ ...c, ready: c.players.length >= 15 }));

  if (!competitions.some(c => c.ready)) {
    root.innerHTML = `<div class="quiz-empty"><h3>Rugby XV vuelve pronto.</h3><p>Estamos cargando los planteles.</p></div>`;
    return;
  }

  let competition = competitions.find(c => c.ready);
  let players = competition.players;

  const modes = (settings.times.length ? settings.times : [60, 90, 0]).map(secs => ({
    id: String(secs),
    secs,
    label: secs ? `${secs} segundos` : "Sin tiempo"
  }));
  // Los récords de URBA conservan la clave de antes.
  const bestKey = id => (competition.id === "urba" ? `xv_best_${id}` : `xv_best_${competition.id}_${id}`);
  let mode = modes[0];

  function menu() {
    root.innerHTML = `
      <div class="xv-menu">
        <span class="drop-kicker">Elegí cómo jugar</span>
        <h3>¿Cuántos del XV te acordás?</h3>
        <p class="quiz-intro-text">Elegí la competencia y el tiempo. Escribí el apellido de un jugador y lo ubicamos en su puesto. Un jugador por puesto: si el suyo ya está ocupado, rebota.</p>
        <div class="xv-step">1 · Competencia</div>
        <div class="xv-modes xv-comps">
          ${competitions.map(c => `<button type="button" class="xv-mode xv-comp ${c.id === competition.id ? "active" : ""}" data-comp="${c.id}" ${c.ready ? "" : "disabled"}>
              <span class="xv-comp-logo"><img src="${c.logo}" alt="" loading="lazy"></span>
              <strong>${c.label}</strong><small>${c.ready ? `${c.sub} · ${c.players.length} jugadores` : `${c.sub} · planteles en carga`}</small></button>`).join("")}
        </div>
        <div class="xv-step">2 · Tiempo</div>
        <div class="xv-modes" id="xv-times">
          ${modes.map(m => {
            const best = gStore(bestKey(m.id));
            return `<button type="button" class="xv-mode ${m.id === mode.id ? "active" : ""}" data-mode="${m.id}">
              <span class="xv-mode-icon">${m.secs ? m.secs + "″" : "∞"}</span>
              <strong>${m.label}</strong><small>${best ? "Récord: " + best + "/15" : "Sin récord"}</small></button>`;
          }).join("")}
        </div>
        <div class="quiz-actions"><button class="btn accent" type="button" data-start>Empezar →</button></div>
      </div>`;
    root.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => {
      mode = modes.find(m => m.id === b.dataset.mode);
      root.querySelectorAll("[data-mode]").forEach(x => x.classList.toggle("active", x === b));
    }));
    root.querySelectorAll("[data-comp]").forEach(b => b.addEventListener("click", () => {
      const next = competitions.find(c => c.id === b.dataset.comp);
      if (!next?.ready) return;
      competition = next;
      menu(); // repinta récords de esa competencia
    }));
    root.querySelector("[data-start]").addEventListener("click", play);
  }

  function pitchHTML(lineup, final) {
    return `<div class="xv-pitch ${final ? "xv-final" : ""}" role="group" aria-label="Cancha de rugby">
      ${XV_POSITIONS.map(p => {
        const pick = lineup[p.n];
        return `<div class="xv-slot ${pick ? "filled" : ""}" data-n="${p.n}" style="grid-row:${p.row};grid-column:${p.col}">
          <span class="xv-num">${p.n}</span>
          <span class="xv-shield">${pick && pick.club ? teamShield(pick.club, "team-shield") : ""}</span>
          <span class="xv-name ${pick ? "" : "muted"}">${escapeHTML(pick ? pick.last : p.short)}</span>
        </div>`;
      }).join("")}
    </div>`;
  }

  function play() {
    players = competition.players;
    const lineup = {};
    const used = new Set();
    const started = Date.now();
    let timer = null;
    let over = false;

    root.innerHTML = `
      <div class="xv-top">
        <div class="xv-top-left"><img class="xv-top-logo" src="${competition.logo}" alt="${competition.label}"><div><span class="drop-kicker">${competition.label} · ${mode.label}</span><strong class="xv-count" id="xv-count">0 / 15</strong></div></div>
        <div class="xv-clock ${mode.secs ? "" : "hidden"}" id="xv-clock">${mode.secs}</div>
        <button class="btn ghost small" type="button" data-finish>Terminar</button>
      </div>
      <div class="xv-timebar ${mode.secs ? "" : "hidden"}"><i id="xv-timebar"></i></div>
      <form class="xv-input-row" id="xv-form" autocomplete="off">
        <div class="xv-field">
          <input id="xv-input" type="text" maxlength="50" placeholder="Apellido del jugador…" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="send"
            role="combobox" aria-expanded="false" aria-controls="xv-suggest" aria-autocomplete="list">
          <div class="xv-suggest hidden" id="xv-suggest" role="listbox" aria-label="Jugadores con ese apellido"></div>
        </div>
        <button class="btn accent" type="submit">Ubicar</button>
      </form>
      <div class="xv-chooser hidden" id="xv-chooser" role="group" aria-label="Elegí el puesto"></div>
      <div class="xv-msg" id="xv-msg" role="status" aria-live="polite">Arrancá con quien quieras. Escribí el apellido y elegí al jugador.</div>
      ${pitchHTML(lineup, false)}`;

    const input = root.querySelector("#xv-input");
    const msg = root.querySelector("#xv-msg");
    const say = (text, type) => { msg.textContent = text; msg.className = "xv-msg" + (type ? " " + type : ""); replay(msg, "msg-in"); };
    const count = () => Object.keys(lineup).length;
    const slotEl = n => root.querySelector(`.xv-slot[data-n="${n}"]`);
    input.focus({ preventScroll: true });

    function finish(reason) {
      if (over) return;
      over = true;
      clearInterval(timer);
      const done = count();
      const best = Math.max(Number(gStore(bestKey(mode.id))) || 0, done);
      gStore(bestKey(mode.id), best);
      const secs = Math.round((Date.now() - started) / 1000);
      const title = done === 15 ? "¡XV completo!" : reason === "time" ? "Se acabó el tiempo." : "Cerraste el partido.";
      const shareLines = [...XV_POSITIONS].sort((a, b) => a.n - b.n)
        .map(p => `${p.n}. ${lineup[p.n] ? lineup[p.n].name : "—"}`).join("\n");

      root.innerHTML = `
        <div class="quiz-top"><span class="drop-kicker">${competition.label} · ${mode.label}</span><span class="quiz-score">Récord: ${best}/15</span></div>
        <div class="quiz-result-score pop-in">${done}<small>/15</small></div>
        <h3>${title}</h3>
        <p class="quiz-intro-text">${done === 15 ? `Lo armaste en ${secs} segundos.` : done ? "Estos son los que lograste ubicar." : "Esta vez no entró ninguno. ¡Revancha!"}</p>
        ${pitchHTML(lineup, true)}
        <div class="quiz-actions">
          <button class="btn accent" type="button" data-again>Jugar de nuevo</button>
          <button class="btn ghost" type="button" data-menu>Cambiar modo</button>
          <button class="btn ghost" type="button" data-share>Copiar mi XV</button>
        </div>`;
      root.querySelector("[data-again]").addEventListener("click", play);
      root.querySelector("[data-menu]").addEventListener("click", menu);
      root.querySelector("[data-share]").addEventListener("click", e =>
        copyText(`Armé ${done}/15 de mi XV ${competition.label} en DropRugby (${mode.label}) 🏉\n${shareLines}\n${location.origin}/rugby-xv`, e.currentTarget));
      if (done === 15) confetti();
    }

    if (mode.secs) {
      const clock = root.querySelector("#xv-clock");
      const bar = root.querySelector("#xv-timebar");
      const endAt = Date.now() + mode.secs * 1000;
      timer = setInterval(() => {
        if (!root.isConnected) { clearInterval(timer); return; }
        const ms = Math.max(0, endAt - Date.now());
        const left = Math.ceil(ms / 1000);
        clock.textContent = left;
        clock.classList.toggle("low", left <= 10);
        bar.style.width = (ms / (mode.secs * 10)).toFixed(1) + "%";
        bar.classList.toggle("low", left <= 10);
        if (ms <= 0) finish("time");
      }, 200);
    }

    root.querySelector("[data-finish]").addEventListener("click", () => finish("manual"));

    const suggest = root.querySelector("#xv-suggest");
    const chooser = root.querySelector("#xv-chooser");
    let options = [];      // jugadores de la lista desplegable
    let active = -1;       // opción resaltada con el teclado
    let choosing = null;   // jugador esperando que elijas el puesto

    const freeSlots = player => xvSlotsForPlayer(player).filter(n => !lineup[n]);

    function optionState(player) {
      if (used.has(player)) return { cls: "used", text: "Ya está en tu equipo" };
      const slots = freeSlots(player);
      if (!slots.length) return { cls: "full", text: "Su puesto está ocupado" };
      if (slots.length > 1) return { cls: "", text: `Elegí puesto: ${slots.join(" o ")}` };
      return { cls: "", text: `Entra de ${xvPositionLabel(slots[0])}` };
    }

    function closeSuggest() {
      options = [];
      active = -1;
      suggest.classList.add("hidden");
      suggest.innerHTML = "";
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }

    function paintSuggest() {
      if (!options.length) { closeSuggest(); return; }
      suggest.innerHTML = `
        <div class="xv-suggest-head">${options.length === 1 ? "1 jugador" : `${options.length} jugadores`} con ese apellido</div>
        ${options.map((player, i) => {
          const state = optionState(player);
          return `<button type="button" role="option" id="xv-opt-${i}" class="xv-option ${state.cls} ${i === active ? "active" : ""}" data-i="${i}" aria-selected="${i === active}">
            <span class="xv-option-shield">${player.club ? teamShield(player.club, "team-shield") : ""}</span>
            <span class="xv-option-main"><b>${escapeHTML(player.name)}</b><small>${escapeHTML(player.club || "")} · ${escapeHTML(xvRolesLabel(player.positions))}</small></span>
            <span class="xv-option-state">${escapeHTML(state.text)}</span>
          </button>`;
        }).join("")}`;
      suggest.classList.remove("hidden");
      input.setAttribute("aria-expanded", "true");
      if (active >= 0) input.setAttribute("aria-activedescendant", `xv-opt-${active}`);
      else input.removeAttribute("aria-activedescendant");
    }

    // La lista se abre cuando lo escrito ya es un apellido (no adivina por la primera letra).
    function refreshSuggest() {
      if (choosing) cancelChoose();
      const text = input.value.trim();
      const found = text.length >= 2 ? xvFind(players, text) : [];
      options = found
        .slice()
        .sort((a, b) => Number(used.has(a)) - Number(used.has(b)) || Number(!freeSlots(a).length) - Number(!freeSlots(b).length) || a.name.localeCompare(b.name));
      active = options.findIndex(p => !used.has(p) && freeSlots(p).length);
      paintSuggest();
    }

    function setPickable(slots) {
      root.querySelectorAll(".xv-slot.pickable").forEach(el => el.classList.remove("pickable"));
      slots.forEach(n => slotEl(n)?.classList.add("pickable"));
    }

    function cancelChoose() {
      choosing = null;
      chooser.classList.add("hidden");
      chooser.innerHTML = "";
      setPickable([]);
    }

    function place(player, slot) {
      cancelChoose();
      lineup[slot] = player;
      used.add(player);
      const el = slotEl(slot);
      el.classList.add("filled");
      el.querySelector(".xv-shield").innerHTML = player.club ? teamShield(player.club, "team-shield") : "";
      const nameEl = el.querySelector(".xv-name");
      nameEl.textContent = player.last;
      nameEl.classList.remove("muted");
      replay(el, "pop-in");
      const counter = root.querySelector("#xv-count");
      counter.textContent = `${count()} / 15`;
      replay(counter, "pop-in");
      say(`✓ ${player.name} (${player.club}) — ${xvPositionLabel(slot)}`, "ok");
      input.value = "";
      closeSuggest();
      input.focus({ preventScroll: true });
      if (count() === 15) finish("complete");
    }

    // Jugador con más de un puesto libre: se elige en botones o tocando la cancha.
    function choose(player, slots) {
      closeSuggest();
      choosing = { player, slots };
      chooser.innerHTML = `
        <span class="xv-chooser-q">¿Dónde ponés a <b>${escapeHTML(player.name)}</b>?</span>
        <span class="xv-chooser-opts">
          ${slots.map(n => `<button type="button" class="btn accent small" data-slot="${n}">${escapeHTML(xvPositionLabel(n))}</button>`).join("")}
          <button type="button" class="btn ghost small" data-cancel>Cancelar</button>
        </span>`;
      chooser.classList.remove("hidden");
      replay(chooser, "msg-in");
      setPickable(slots);
      say("Elegí el puesto: tocá un botón o la camiseta que titila en la cancha.", "");
      chooser.querySelector("[data-slot]")?.focus({ preventScroll: true });
    }

    function pick(player) {
      if (over || !player) return;
      if (used.has(player)) {
        say(`${player.name} ya está en tu equipo.`, "bad");
        replay(slotEl(Object.keys(lineup).find(n => lineup[n] === player)), "shake");
        return;
      }
      const slots = freeSlots(player);
      if (!slots.length) {
        const all = xvSlotsForPlayer(player);
        const holders = [...new Set(all.map(n => lineup[n].last))].join(", ").replace(/, ([^,]*)$/, " y $1");
        say(`${player.name} juega de ${xvRolesLabel(player.positions).toLowerCase()} y ${all.length > 1 ? "esos puestos ya los ocupan" : "ese puesto ya lo ocupa"} ${holders}. ¡Rebota!`, "bad");
        all.forEach(n => replay(slotEl(n), "shake"));
        input.value = "";
        closeSuggest();
        return;
      }
      if (slots.length === 1) place(player, slots[0]);
      else choose(player, slots);
    }

    input.addEventListener("input", refreshSuggest);

    input.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        if (choosing) cancelChoose();
        closeSuggest();
        return;
      }
      if (!options.length || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      active = (active + step + options.length) % options.length;
      paintSuggest();
    });

    suggest.addEventListener("mousedown", event => event.preventDefault()); // no pierde el foco el campo
    suggest.addEventListener("click", event => {
      const btn = event.target.closest("[data-i]");
      if (btn) pick(options[Number(btn.dataset.i)]);
    });

    chooser.addEventListener("click", event => {
      const slotBtn = event.target.closest("[data-slot]");
      if (slotBtn && choosing) { place(choosing.player, Number(slotBtn.dataset.slot)); return; }
      if (event.target.closest("[data-cancel]")) {
        cancelChoose();
        say("Cancelado. Escribí otro apellido.", "");
        input.focus({ preventScroll: true });
      }
    });

    root.querySelector(".xv-pitch").addEventListener("click", event => {
      const el = event.target.closest(".xv-slot.pickable");
      if (el && choosing) place(choosing.player, Number(el.dataset.n));
    });

    // Al salir del campo se cierra la lista (salvo que se esté tocando una opción).
    input.addEventListener("blur", () => setTimeout(() => {
      if (!suggest.contains(document.activeElement)) closeSuggest();
    }, 120));

    root.querySelector("#xv-form").addEventListener("submit", event => {
      event.preventDefault();
      if (over) return;

      if (choosing) {
        // Enter con el selector abierto: el primer puesto ofrecido.
        place(choosing.player, choosing.slots[0]);
        return;
      }

      const text = input.value.trim();
      if (!text) return;

      if (!options.length) refreshSuggest();

      if (!options.length) {
        const onlyFirst = players.some(p => nameKey(p.first).split(" ").includes(nameKey(text)));
        say(onlyFirst ? `Hay muchos "${text}": escribí el apellido.` : `No encontramos a "${text}". Probá con el apellido.`, "bad");
        replay(input, "shake");
        input.value = "";
        closeSuggest();
        return;
      }

      // Con un solo jugador (o uno resaltado con las flechas) se elige directo.
      const available = options.filter(p => !used.has(p) && freeSlots(p).length);
      if (options.length === 1) { pick(options[0]); return; }
      if (active >= 0 && (available.length <= 1 || suggest.dataset.arrowed === "1")) { pick(options[active]); return; }
      if (available.length === 1) { pick(available[0]); return; }
      if (!available.length) { pick(options[0]); return; }

      say(`Hay ${options.length} con ese apellido: elegí uno de la lista.`, "");
      replay(suggest, "shake");
    });

    input.addEventListener("keydown", event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") suggest.dataset.arrowed = "1";
      else if (event.key.length === 1 || event.key === "Backspace") delete suggest.dataset.arrowed;
    });
  }

  menu();
}

/* ==========================================================================
   2) WORDLE — adiviná el apellido del jugador del día, letra por letra
   Verde: letra en su lugar. Naranja: está, pero en otro lugar. Gris: no está.
   ========================================================================== */

const WD_KEYS = ["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"];
const WD_MIN = 4;
const WD_MAX = 9;

function wdToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function wdHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Devuelve "correct" | "present" | "absent" por letra, con la regla clásica de repetidas. */
function wdScore(guess, secret) {
  const result = Array(secret.length).fill("absent");
  const remaining = {};
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) result[i] = "correct";
    else remaining[secret[i]] = (remaining[secret[i]] || 0) + 1;
  }
  for (let i = 0; i < secret.length; i++) {
    if (result[i] !== "correct" && remaining[guess[i]] > 0) {
      result[i] = "present";
      remaining[guess[i]]--;
    }
  }
  return result;
}

/** Jugadores que sirven para el Wordle: apellido de una sola palabra, 4 a 9 letras. */
function wdPool(players) {
  const seen = new Set();
  return players
    .filter(p => p.last && !/\s/.test(p.last.trim()))
    .map(p => ({ word: wordLetters(p.last), player: p }))
    .filter(e => e.word.length >= WD_MIN && e.word.length <= WD_MAX && !seen.has(e.word) && seen.add(e.word))
    .sort((a, b) => a.word.localeCompare(b.word));
}

function wdCountdown() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((next - now) / 1000));
  const pad = n => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

async function mountPlayerWordle(root) {
  const settings = (await loadGameSettings()).wordle;
  if (!settings.enabled) return gamePaused(root);

  const pool = wdPool((await loadPlayers()).filter(p => !isSraClub(p.club)));
  if (pool.length < 5) {
    root.innerHTML = `<div class="quiz-empty"><h3>El Wordle vuelve pronto.</h3><p>Estamos cargando los jugadores.</p></div>`;
    return;
  }

  const MAX = settings.attempts;
  const date = wdToday();
  const STORE = `wordle_v2_${date}`;
  const STATS = "wordle_v2_stats";

  let daily = true;
  let entry;          // { word, player }
  let guesses = [];   // palabras ya enviadas
  let current = "";   // lo que se está tipeando
  let over = false;
  let busy = false;   // animación de volteo en curso
  let tick = null;

  function dailyEntry() {
    if (settings.manualDate === date && settings.manualPlayer) {
      const wanted = nameKey(settings.manualPlayer);
      const manual = pool.find(e => nameKey(e.player.name) === wanted);
      if (manual) return manual;
    }
    return pool[wdHash("droprugby-" + date) % pool.length];
  }

  const won = () => guesses.includes(entry.word);
  const failed = () => guesses.filter(g => g !== entry.word).length;

  function saveDaily() {
    if (daily) gStore(STORE, { word: entry.word, guesses });
  }

  function recordStats() {
    if (!daily) return;
    const state = gStore(STORE) || {};
    if (state.counted) return;
    const stats = gStore(STATS) || { played: 0, wins: 0, streak: 0, best: 0, dist: {} };
    stats.played++;
    if (won()) {
      stats.wins++;
      stats.streak++;
      stats.best = Math.max(stats.best, stats.streak);
      stats.dist[guesses.length] = (stats.dist[guesses.length] || 0) + 1;
    } else {
      stats.streak = 0;
    }
    gStore(STATS, stats);
    gStore(STORE, { word: entry.word, guesses, counted: true });
  }

  function start(isDaily) {
    daily = isDaily;
    guesses = [];
    current = "";
    busy = false;
    if (daily) {
      entry = dailyEntry();
      const saved = gStore(STORE);
      if (saved && saved.word === entry.word && Array.isArray(saved.guesses)) {
        guesses = saved.guesses.filter(g => typeof g === "string" && g.length === entry.word.length).slice(0, MAX);
      }
    } else {
      const others = pool.filter(e => e !== entry);
      entry = others[Math.floor(Math.random() * others.length)];
    }
    over = won() || guesses.length >= MAX;
    paint();
  }

  function keyStates(rows = guesses) {
    const rank = { absent: 1, present: 2, correct: 3 };
    const map = {};
    rows.forEach(g => wdScore(g, entry.word).forEach((state, i) => {
      if (!map[g[i]] || rank[state] > rank[map[g[i]]]) map[g[i]] = state;
    }));
    return map;
  }

  function hintsHTML() {
    const fails = failed();
    const p = entry.player;
    const chip = (label, after, value) => {
      if (!after) return "";
      const open = over || fails >= after;
      return `<div class="wd-hint ${open ? "open" : ""}"><small>${label}</small>${open ? value : `<span>🔒 tras ${after} ${after === 1 ? "intento" : "intentos"}</span>`}</div>`;
    };
    return `<div class="wd-hints">
      <div class="wd-hint open"><small>Apellido</small><span>${entry.word.length} letras</span></div>
      ${chip("Club", settings.hintClubAfter, `<span class="wd-hint-club">${teamShield(p.club, "team-shield")} ${escapeHTML(p.club)}</span>`)}
      ${chip("Puesto", settings.hintPositionAfter, `<span>${p.positions.length ? escapeHTML(xvRolesLabel(p.positions)) : "—"}</span>`)}
    </div>`;
  }

  function boardHTML(animateRow) {
    const n = entry.word.length;
    let html = "";
    for (let r = 0; r < MAX; r++) {
      const sent = guesses[r];
      const typing = !sent && r === guesses.length && !over;
      const letters = sent || (typing ? current : "");
      const states = sent ? wdScore(sent, entry.word) : [];
      html += `<div class="wd-row" data-row="${r}">`;
      for (let i = 0; i < n; i++) {
        const ch = letters[i] || "";
        const cls = sent ? (r === animateRow ? `flip ${states[i]}` : `done ${states[i]}`) : ch ? "filled" : "";
        const delay = sent && r === animateRow ? ` style="animation-delay:${i * 160}ms"` : "";
        html += `<div class="wd-tile ${cls}"${delay}>${ch}</div>`;
      }
      html += `</div>`;
    }
    return `<div class="wd-board" style="--n:${n}" aria-label="Tablero">${html}</div>`;
  }

  function keyboardHTML(states) {
    const key = k => `<button type="button" class="wd-key ${states[k] || ""}" data-key="${k}">${k}</button>`;
    return `<div class="wd-keyboard" aria-label="Teclado">
      <div class="wd-krow">${[...WD_KEYS[0]].map(key).join("")}</div>
      <div class="wd-krow">${[...WD_KEYS[1]].map(key).join("")}</div>
      <div class="wd-krow"><button type="button" class="wd-key wide" data-key="ENTER">Enviar</button>${[...WD_KEYS[2]].map(key).join("")}<button type="button" class="wd-key wide" data-key="BACK" aria-label="Borrar">⌫</button></div>
    </div>`;
  }

  function statsHTML() {
    const stats = gStore(STATS) || { played: 0, wins: 0, streak: 0, best: 0, dist: {} };
    const pct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    const top = Math.max(1, ...Object.values(stats.dist || {}));
    const bars = Array.from({ length: MAX }, (_, i) => {
      const v = (stats.dist || {})[i + 1] || 0;
      return `<div class="wd-dist-row ${won() && guesses.length === i + 1 ? "now" : ""}"><b>${i + 1}</b><i style="width:${Math.max(8, (v / top) * 100)}%">${v}</i></div>`;
    }).join("");
    return `<div class="wd-stats">
        <div><strong>${stats.played}</strong><span>Jugados</span></div>
        <div><strong>${pct}%</strong><span>Ganados</span></div>
        <div><strong>${stats.streak}</strong><span>Racha</span></div>
        <div><strong>${stats.best}</strong><span>Mejor racha</span></div>
      </div>
      <div class="wd-dist">${bars}</div>`;
  }

  function resultHTML() {
    const p = entry.player;
    const ok = won();
    return `<div class="wd-result ${ok ? "win" : "lose"}">
      <span class="drop-kicker">${ok ? (guesses.length === 1 ? "¡De primera!" : "¡Lo sacaste!") : "Se acabaron los intentos"}</span>
      <div class="wd-answer">${teamShield(p.club, "team-shield big")}
        <div><strong>${escapeHTML(p.name)}</strong><span>${escapeHTML(p.club)}${p.positions.length ? " · " + escapeHTML(xvRolesLabel(p.positions)) : ""}</span></div>
      </div>
      ${daily ? statsHTML() : ""}
      <div class="quiz-actions">
        <button class="btn accent" type="button" data-share>Compartir resultado</button>
        <button class="btn ghost" type="button" data-practice>Jugar otro (práctica)</button>
      </div>
      ${daily ? `<p class="wd-next">Próximo jugador en <b id="wd-countdown">${wdCountdown()}</b></p>` : ""}
    </div>`;
  }

  function paint(animateRow = -1) {
    clearInterval(tick);
    const showEnd = over && animateRow < 0;
    root.innerHTML = `
      <div class="quiz-top">
        <span class="drop-kicker">${daily ? "Jugador del día" : "Práctica"}</span>
        <span class="quiz-score">${Math.min(guesses.length + (over ? 0 : 1), MAX)} / ${MAX}</span>
      </div>
      ${hintsHTML()}
      <div class="xv-msg wd-msg ${over ? (won() ? "ok" : "bad") : ""}" id="wd-msg" role="status" aria-live="polite">${over ? (won() ? "¡Bien jugado!" : `Era ${escapeHTML(entry.word)}.`) : "Escribí un apellido y tocá Enviar."}</div>
      ${boardHTML(animateRow)}
      ${showEnd ? resultHTML() : keyboardHTML(animateRow >= 0 ? keyStates(guesses.slice(0, animateRow)) : keyStates())}`;

    root.querySelectorAll("[data-key]").forEach(btn => btn.addEventListener("click", () => {
      press(btn.dataset.key);
      btn.blur();
    }));

    if (showEnd) {
      root.querySelector("[data-share]").addEventListener("click", e => {
        const emoji = { correct: "🟩", present: "🟧", absent: "⬛" };
        const grid = guesses.map(g => wdScore(g, entry.word).map(s => emoji[s]).join("")).join("\n");
        copyText(`DropRugby Wordle ${daily ? date + " " : ""}${won() ? guesses.length : "X"}/${MAX} 🏉\n${grid}\n${location.origin}/wordle`, e.currentTarget);
      });
      root.querySelector("[data-practice]").addEventListener("click", () => start(false));
      const clock = root.querySelector("#wd-countdown");
      if (clock) tick = setInterval(() => {
        if (!clock.isConnected) { clearInterval(tick); return; }
        clock.textContent = wdCountdown();
      }, 1000);
    }
  }

  function say(text, type) {
    const msg = root.querySelector("#wd-msg");
    if (!msg) return;
    msg.textContent = text;
    msg.className = "xv-msg wd-msg" + (type ? " " + type : "");
    replay(msg, "msg-in");
  }

  function updateTyping() {
    const row = root.querySelector(`.wd-row[data-row="${guesses.length}"]`);
    if (!row) return;
    [...row.children].forEach((tile, i) => {
      const ch = current[i] || "";
      if (tile.textContent !== ch) {
        tile.textContent = ch;
        tile.classList.toggle("filled", !!ch);
        if (ch) replay(tile, "pop-in");
      }
    });
  }

  function press(key) {
    if (over || busy) return;
    const n = entry.word.length;

    if (key === "BACK") { current = current.slice(0, -1); updateTyping(); return; }

    if (key === "ENTER") {
      const row = root.querySelector(`.wd-row[data-row="${guesses.length}"]`);
      if (current.length < n) {
        say(`Faltan letras: el apellido tiene ${n}.`, "bad");
        replay(row, "shake");
        return;
      }
      if (guesses.includes(current)) {
        say("Ese ya lo probaste.", "bad");
        replay(row, "shake");
        return;
      }
      const index = guesses.length;
      guesses.push(current);
      current = "";
      over = won() || guesses.length >= MAX;
      saveDaily();
      busy = true;
      paint(index);
      const wait = reducedMotion() ? 50 : n * 160 + 520;
      setTimeout(() => {
        busy = false;
        if (!root.isConnected) return;
        if (over) recordStats();
        paint();
        if (over && won()) {
          root.querySelectorAll(`.wd-row[data-row="${index}"] .wd-tile`).forEach((t, i) => {
            t.style.animationDelay = i * 70 + "ms";
            t.classList.add("bounce");
          });
          confetti();
        }
      }, wait);
      return;
    }

    if (current.length < n && /^[A-ZÑ]$/.test(key)) {
      current += key;
      updateTyping();
    }
  }

  // Teclado físico.
  document.addEventListener("keydown", event => {
    if (!root.isConnected || event.ctrlKey || event.metaKey || event.altKey) return;
    const tag = (event.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (event.key === "Enter") {
      // Enter sobre un botón o link (Compartir, Jugar otro, menú) hace su click normal.
      if (tag === "button" || tag === "a") return;
      event.preventDefault();
      press("ENTER");
    } else if (event.key === "Backspace") {
      event.preventDefault();
      press("BACK");
    } else if (event.key.length === 1) {
      const letter = wordLetters(event.key);
      if (letter.length === 1) press(letter);
    }
  });

  start(true);
}

/* ==========================================================================
   3) ESCUDOS — ¿de qué club es?
   ========================================================================== */

async function mountShieldGame(root) {
  const settings = (await loadGameSettings()).escudos;
  if (!settings.enabled) return gamePaused(root);

  root.innerHTML = `<p class="empty-state">Preparando los escudos…</p>`;
  // Solo clubes de la URBA: los escudos de Super Rugby Américas no entran.
  const all = [...await loadClubs("top14"), ...await loadClubs("primeraA")]
    .filter(c => c.logo && !isSraClub(c.name));
  const checks = await Promise.all(all.map(c => imageLoads(c.logo)));
  const clubs = all.filter((_, i) => checks[i]);

  if (clubs.length < 4) {
    root.innerHTML = `<div class="quiz-empty"><h3>El juego vuelve pronto.</h3><p>Estamos actualizando los escudos de los clubes.</p></div>`;
    return;
  }

  const ROUNDS = Math.min(settings.rounds, clubs.length);
  const KEY = "escudos_best";
  let deck, round, score, locked, marks;

  function start() {
    deck = pickRandom(clubs, ROUNDS);
    round = 0;
    score = 0;
    marks = [];
    ask();
  }

  function ask() {
    locked = false;
    const answer = deck[round];
    const options = shuffle([answer, ...pickRandom(clubs.filter(c => c !== answer), 3)]);
    root.innerHTML = `
      <div class="quiz-top"><span class="drop-kicker">Ronda ${round + 1} de ${ROUNDS}</span><span class="quiz-score">${score} pts</span></div>
      <div class="quiz-bar">${deck.map((_, i) => `<i class="${marks[i] === true ? "ok" : marks[i] === false ? "bad" : i === round ? "now" : ""}"></i>`).join("")}</div>
      <div class="shield-stage"><img class="pop-in" src="${escapeHTML(answer.logo)}" alt="Escudo a adivinar" referrerpolicy="no-referrer"></div>
      <h3 class="shield-q">¿De qué club es este escudo?</h3>
      <div class="quiz-options two">
        ${options.map((c, i) => `<button type="button" class="quiz-option" data-name="${escapeHTML(c.name)}"><b>${"ABCD"[i]}</b>${escapeHTML(c.name)}</button>`).join("")}
      </div>
      <div class="quiz-feedback hidden" id="shield-feedback"></div>`;

    root.querySelectorAll(".quiz-option").forEach(btn => btn.addEventListener("click", () => {
      if (locked) return;
      locked = true;
      const right = btn.dataset.name === answer.name;
      marks[round] = right;
      if (right) score++;
      root.querySelectorAll(".quiz-option").forEach(b => {
        b.disabled = true;
        if (b.dataset.name === answer.name) b.classList.add("is-correct");
        else if (b === btn) { b.classList.add("is-wrong"); replay(b, "shake"); }
      });
      const fb = root.querySelector("#shield-feedback");
      fb.classList.remove("hidden");
      fb.classList.add(right ? "ok" : "bad");
      // Acierto: pasa enseguida. Error: avisa "Fallaste", muestra el club y sigue solo.
      fb.innerHTML = right
        ? `<strong>¡Eso es!</strong> ${escapeHTML(answer.name)}.`
        : `<strong>¡Fallaste!</strong> Era ${escapeHTML(answer.name)}.`;
      if (!right) replay(fb, "shake");
      let moved = false;
      const advance = () => {
        if (moved) return;
        moved = true;
        round++;
        round < ROUNDS ? ask() : finish();
      };
      setTimeout(advance, right ? 650 : 1700);
      fb.addEventListener("click", advance); // tocar el aviso lo saltea
    }));
  }

  function finish() {
    const best = Math.max(Number(gStore(KEY)) || 0, score);
    gStore(KEY, best);
    const verdict = score === ROUNDS ? "Hincha de fierro." : score >= ROUNDS * 0.7 ? "Conocés la cancha." : score >= ROUNDS * 0.4 ? "Vas bien, falta tercer tiempo." : "A mirar más rugby de clubes.";
    root.innerHTML = `
      <div class="quiz-top"><span class="drop-kicker">Resultado</span><span class="quiz-score">Récord: ${best}</span></div>
      <div class="quiz-result-score pop-in">${score}<small>/${ROUNDS}</small></div>
      <h3>${verdict}</h3>
      <div class="quiz-actions">
        <button class="btn accent" type="button" data-again>Jugar de nuevo</button>
        <button class="btn ghost" type="button" data-share>Compartir</button>
      </div>`;
    root.querySelector("[data-again]").addEventListener("click", start);
    root.querySelector("[data-share]").addEventListener("click", e =>
      copyText(`Adiviné ${score}/${ROUNDS} escudos de la URBA en DropRugby 🏉 ¿Me ganás? ${location.origin}/escudos`, e.currentTarget));
    if (score === ROUNDS) confetti();
  }

  start();
}

/* ==========================================================================
   4) URBA TOP 14 — clubes y planteles
   ========================================================================== */

async function mountUrbaClubs(root, division = "top14") {
  const [clubs, players] = await Promise.all([loadClubs(division), loadPlayers()]);
  if (!clubs.length) { root.innerHTML = `<p class="empty-state">Todavía no hay clubes cargados.</p>`; return; }

  const squadOf = name => players
    .filter(p => normalizeTeamName(p.club) === normalizeTeamName(name))
    .sort((a, b) => (a.position || 99) - (b.position || 99) || a.last.localeCompare(b.last));

  root.innerHTML = clubs.map((c, i) => {
    const row = c.row;
    const squad = squadOf(c.name);
    return `
      <article class="club-card reveal" style="transition-delay:${(i % 4) * 60}ms">
        <div class="club-head">${teamShield(c.name, "team-shield big")}<div><h3>${escapeHTML(c.name)}</h3>
          <span>${row && Number(row.pj) > 0 ? `${i + 1}° · ${Number(row.pts) || 0} pts · ${Number(row.pg) || 0}G ${Number(row.pe) || 0}E ${Number(row.pp) || 0}P` : DIVISION_LABEL[division] || "Top 14"}</span></div></div>
        ${squad.length ? `
        <details class="club-squad">
          <summary>Ver el plantel <i>${squad.length} jugadores</i></summary>
          <ol class="club-players">${squad.map(p => `<li><b>${p.positions.length ? p.positions.join("/") : "·"}</b><span>${escapeHTML(p.name)}</span></li>`).join("")}</ol>
        </details>` : `<p class="club-empty">Plantel en carga.</p>`}
      </article>`;
  }).join("");
  observeReveals(root);
}

/* ==========================================================================
   5) HOME — números, clubes y jugador del día
   ========================================================================== */

function countUp(el, target) {
  if (!el) return;
  if (reducedMotion() || !target) { el.textContent = target; return; }
  const start = performance.now();
  const duration = 900;
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function mountHome() {
  const [clubs, players, settings] = await Promise.all([loadClubs(), loadPlayers(), loadGameSettings()]);

  const stats = document.getElementById("home-stats");
  if (stats) {
    const squads = new Set(players.map(p => normalizeTeamName(p.club))).size;
    const games = ["xv", "wordle", "escudos", "quiz"].filter(id => settings[id].enabled).length;
    const values = { players: players.length, clubs: clubs.length, squads, games };
    const run = () => stats.querySelectorAll("[data-stat]").forEach(el => countUp(el, values[el.dataset.stat] || 0));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { run(); io.disconnect(); }
      }, { threshold: 0.3 });
      io.observe(stats);
    } else run();
  }

  const rail = document.getElementById("home-clubs");
  if (rail) {
    const withLogo = clubs.filter(c => c.logo);
    if (withLogo.length >= 4) {
      const items = withLogo.map(c => `<a href="${BASE}/urba-top-14#clubes" title="${escapeHTML(c.name)}">${teamShield(c.name, "team-shield big")}<span>${escapeHTML(c.name)}</span></a>`).join("");
      rail.innerHTML = `<div class="club-marquee-track">${items}${items}</div>`;
    } else {
      rail.closest("section")?.remove();
    }
  }

  const clock = document.getElementById("home-wordle-countdown");
  if (clock) {
    const paint = () => { clock.textContent = wdCountdown(); };
    paint();
    setInterval(paint, 1000);
  }

  const played = document.getElementById("home-wordle-state");
  if (played) {
    const saved = gStore(`wordle_v2_${wdToday()}`);
    played.textContent = saved?.counted ? "Ya jugaste hoy: mirá tus números." : saved?.guesses?.length ? "Tenés una partida empezada." : "Todavía no jugaste el de hoy.";
  }
}

/* Pestañas de sección: se marca la que está a la vista. */
function watchSectionTabs() {
  const tabs = [...document.querySelectorAll(".division-tabs a")];
  const targets = tabs.map(tab => document.querySelector(tab.getAttribute("href"))).filter(Boolean);
  if (tabs.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        tabs.forEach(tab => tab.classList.toggle("active", tab.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    targets.forEach(t => io.observe(t));
  }
}

/* ---------- despachador ---------- */

async function renderGames() {
  const page = document.body.dataset.page;

  if (page === "home") return mountHome();

  if (page === "sra" || page === "urba") watchSectionTabs();

  if (page === "sra") {
    const sraClubs = document.getElementById("sra-clubs");
    if (sraClubs) await mountUrbaClubs(sraClubs, "sra");
    return;
  }

  if (page === "urba") {
    const top14 = document.getElementById("urba-clubs");
    const primeraA = document.getElementById("urba-clubs-a");
    await Promise.all([
      top14 ? mountUrbaClubs(top14, "top14") : null,
      primeraA ? mountUrbaClubs(primeraA, "primeraA") : null
    ]);
    return;
  }

  const mount = document.querySelector("[data-game]");
  if (!mount) return;
  if (page === "xv") await mountRugbyXV(mount);
  else if (page === "wordle") await mountPlayerWordle(mount);
  else if (page === "escudos") await mountShieldGame(mount);
}

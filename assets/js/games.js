/* ==========================================================================
   DropRugby — minijuegos
   Se carga después de script.js y usa sus helpers (loadStandings, teamShield,
   getTeamByName, escapeHTML…). renderGames() la llama initDropRugby().
   Páginas: rugby-xv.html, escudos.html, mayor-menor.html
   ========================================================================== */

/* ---------- utilidades ---------- */

const TOP14_CLUBS = [
  "Newman", "CASI", "Hindu", "Alumni", "SIC", "Regatas Bella Vista", "Los Tilos",
  "Belgrano Athletic", "CUBA", "Atletico del Rosario", "Los Matreros", "La Plata",
  "Buenos Aires C&RC", "Champagnat"
];

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
  try {
    await navigator.clipboard.writeText(text);
    if (button) button.textContent = "¡Copiado!";
  } catch (_) {
    window.prompt("Copiá este texto:", text);
  }
  if (button) setTimeout(() => { button.textContent = original; }, 1800);
}

/** Clubes del Top 14: usa la tabla (si hay) y completa con la lista fija. */
async function loadClubs() {
  const standings = await loadStandings();
  const names = standings.length ? standings.map(r => r.team).filter(Boolean) : TOP14_CLUBS;
  const seen = new Set();
  return names
    .map(name => {
      const team = getTeamByName(name);
      return { name: team?.name || name, logo: team?.logo || "", row: standings.find(r => r.team === name) || null };
    })
    .filter(c => !seen.has(c.name) && seen.add(c.name));
}

let PLAYERS_CACHE;
async function loadPlayers() {
  if (PLAYERS_CACHE) return PLAYERS_CACHE;
  try {
    const response = await fetch(BASE + "data/players.json", { cache: "no-store" });
    const data = response.ok ? await response.json() : {};
    const list = Array.isArray(data) ? data : data.players;
    PLAYERS_CACHE = (Array.isArray(list) ? list : []).filter(p => p && p.name);
  } catch (_) {
    PLAYERS_CACHE = [];
  }
  return PLAYERS_CACHE;
}

/** Comprueba que el escudo cargue de verdad (los links externos a veces vencen). */
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

/* ==========================================================================
   1) RUGBY XV — armá tu equipo ideal
   ========================================================================== */

const XV_POSITIONS = [
  { n: 1, name: "Pilar izquierdo", short: "Pilar", row: 6, col: 2 },
  { n: 2, name: "Hooker", short: "Hooker", row: 6, col: 3 },
  { n: 3, name: "Pilar derecho", short: "Pilar", row: 6, col: 4 },
  { n: 4, name: "Segunda línea", short: "2ª línea", row: 5, col: 2 },
  { n: 5, name: "Segunda línea", short: "2ª línea", row: 5, col: 4 },
  { n: 6, name: "Ala ciego", short: "Ala", row: 4, col: 1 },
  { n: 8, name: "Octavo", short: "Octavo", row: 4, col: 3 },
  { n: 7, name: "Ala abierto", short: "Ala", row: 4, col: 5 },
  { n: 9, name: "Medio scrum", short: "Scrum", row: 3, col: 2 },
  { n: 10, name: "Apertura", short: "Apertura", row: 3, col: 4 },
  { n: 12, name: "Primer centro", short: "Centro", row: 2, col: 2 },
  { n: 13, name: "Segundo centro", short: "Centro", row: 2, col: 4 },
  { n: 11, name: "Wing izquierdo", short: "Wing", row: 1, col: 1 },
  { n: 15, name: "Fullback", short: "Fullback", row: 1, col: 3 },
  { n: 14, name: "Wing derecho", short: "Wing", row: 1, col: 5 }
];

async function mountRugbyXV(root) {
  const [clubs, players] = await Promise.all([loadClubs(), loadPlayers()]);
  const KEY = "xv";
  let lineup = gStore(KEY) || {};
  let editing = null;

  const clubOptions = clubs.map(c => `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`).join("");

  function slotHTML(p) {
    const pick = lineup[p.n];
    return `
      <button type="button" class="xv-slot ${pick ? "filled" : ""}" data-n="${p.n}" style="grid-row:${p.row};grid-column:${p.col}">
        <span class="xv-num">${p.n}</span>
        ${pick ? `<span class="xv-shield">${pick.club ? teamShield(pick.club, "team-shield") : ""}</span>
                  <span class="xv-name">${escapeHTML(pick.name)}</span>`
               : `<span class="xv-plus">+</span><span class="xv-name muted">${escapeHTML(p.short)}</span>`}
      </button>`;
  }

  function summary() {
    const done = XV_POSITIONS.filter(p => lineup[p.n]).length;
    return `${done} / 15`;
  }

  function shareText() {
    const lines = [...XV_POSITIONS].sort((a, b) => a.n - b.n).map(p => {
      const pick = lineup[p.n];
      return `${p.n}. ${pick ? pick.name + (pick.club ? ` (${pick.club})` : "") : "—"}`;
    });
    return `Mi XV ideal en DropRugby 🏉\n${lines.join("\n")}\n${location.origin}/rugby-xv`;
  }

  function paint() {
    root.innerHTML = `
      <div class="xv-top">
        <div><span class="drop-kicker">Tu equipo</span><strong class="xv-count">${summary()} puestos</strong></div>
        <div class="xv-actions">
          <button class="btn ghost" type="button" data-reset>Reiniciar</button>
          <button class="btn accent" type="button" data-share>Copiar mi XV</button>
        </div>
      </div>
      <div class="xv-pitch" role="group" aria-label="Cancha de rugby">
        ${XV_POSITIONS.map(slotHTML).join("")}
      </div>
      <div class="xv-hint">Tocá un puesto para elegir jugador y club.${players.length ? "" : " Escribí el nombre que quieras: es tu equipo."}</div>

      <dialog class="xv-dialog" id="xv-dialog">
        <form method="dialog" class="xv-form" id="xv-form">
          <h3 id="xv-title"></h3>
          <label>Jugador
            <input type="text" name="name" maxlength="40" required autocomplete="off" list="xv-players" placeholder="Nombre y apellido">
            <datalist id="xv-players"></datalist>
          </label>
          <label>Club
            <select name="club"><option value="">Sin club</option>${clubOptions}</select>
          </label>
          <div class="xv-form-actions">
            <button class="btn ghost" type="button" data-clear>Quitar</button>
            <button class="btn ghost" type="button" data-cancel>Cancelar</button>
            <button class="btn accent" type="submit">Guardar</button>
          </div>
        </form>
      </dialog>`;

    const dialog = root.querySelector("#xv-dialog");
    const form = root.querySelector("#xv-form");

    root.querySelectorAll(".xv-slot").forEach(btn => btn.addEventListener("click", () => {
      const pos = XV_POSITIONS.find(p => p.n === Number(btn.dataset.n));
      editing = pos;
      root.querySelector("#xv-title").textContent = `${pos.n} · ${pos.name}`;
      const sameRole = players.filter(pl => !pl.position || Number(pl.position) === pos.n);
      root.querySelector("#xv-players").innerHTML = sameRole
        .map(pl => `<option value="${escapeHTML(pl.name)}">${escapeHTML(pl.club || "")}</option>`).join("");
      const current = lineup[pos.n];
      form.name.value = current?.name || "";
      form.club.value = current?.club || "";
      dialog.showModal ? dialog.showModal() : dialog.setAttribute("open", "");
      form.name.focus();
    }));

    // Al elegir un jugador de la lista, completamos su club.
    form.name.addEventListener("change", () => {
      const match = players.find(pl => normalizeTeamName(pl.name) === normalizeTeamName(form.name.value));
      if (match?.club) {
        const club = clubs.find(c => normalizeTeamName(c.name) === normalizeTeamName(match.club));
        if (club) form.club.value = club.name;
      }
    });

    const close = () => (dialog.close ? dialog.close() : dialog.removeAttribute("open"));
    form.addEventListener("submit", event => {
      event.preventDefault();
      const name = form.name.value.trim();
      if (!name || !editing) return;
      lineup[editing.n] = { name, club: form.club.value };
      gStore(KEY, lineup);
      close();
      paint();
    });
    root.querySelector("[data-cancel]").addEventListener("click", close);
    root.querySelector("[data-clear]").addEventListener("click", () => {
      if (editing) delete lineup[editing.n];
      gStore(KEY, lineup);
      close();
      paint();
    });
    root.querySelector("[data-reset]").addEventListener("click", () => {
      if (!Object.keys(lineup).length || !confirm("¿Empezar un XV nuevo?")) return;
      lineup = {};
      gStore(KEY, null);
      paint();
    });
    root.querySelector("[data-share]").addEventListener("click", event => copyText(shareText(), event.currentTarget));
  }

  paint();
}

/* ==========================================================================
   2) ESCUDOS — ¿de qué club es?
   ========================================================================== */

async function mountShieldGame(root) {
  root.innerHTML = `<p class="empty-state">Preparando los escudos…</p>`;
  const all = (await loadClubs()).filter(c => c.logo);
  const checks = await Promise.all(all.map(c => imageLoads(c.logo)));
  const clubs = all.filter((_, i) => checks[i]);

  if (clubs.length < 4) {
    root.innerHTML = `<div class="quiz-empty"><h3>El juego vuelve pronto.</h3><p>Estamos actualizando los escudos de los clubes.</p></div>`;
    return;
  }

  const ROUNDS = Math.min(10, clubs.length);
  const KEY = "escudos_best";
  let deck, round, score, locked;

  function start() {
    deck = pickRandom(clubs, ROUNDS);
    round = 0;
    score = 0;
    ask();
  }

  function ask() {
    locked = false;
    const answer = deck[round];
    const options = shuffle([answer, ...pickRandom(clubs.filter(c => c !== answer), 3)]);
    root.innerHTML = `
      <div class="quiz-top"><span class="drop-kicker">Ronda ${round + 1} de ${ROUNDS}</span><span class="quiz-score">${score} pts</span></div>
      <div class="quiz-bar">${deck.map((_, i) => `<i class="${i < round ? "ok" : i === round ? "now" : ""}"></i>`).join("")}</div>
      <div class="shield-stage"><img src="${escapeHTML(answer.logo)}" alt="Escudo a adivinar" referrerpolicy="no-referrer"></div>
      <h3 class="shield-q">¿De qué club es este escudo?</h3>
      <div class="quiz-options">
        ${options.map((c, i) => `<button type="button" class="quiz-option" data-name="${escapeHTML(c.name)}"><b>${"ABCD"[i]}</b>${escapeHTML(c.name)}</button>`).join("")}
      </div>
      <div class="quiz-feedback hidden" id="shield-feedback"></div>`;

    root.querySelectorAll(".quiz-option").forEach(btn => btn.addEventListener("click", () => {
      if (locked) return;
      locked = true;
      const right = btn.dataset.name === answer.name;
      if (right) score++;
      root.querySelectorAll(".quiz-option").forEach(b => {
        b.disabled = true;
        if (b.dataset.name === answer.name) b.classList.add("is-correct");
        else if (b === btn) b.classList.add("is-wrong");
      });
      const fb = root.querySelector("#shield-feedback");
      fb.classList.remove("hidden");
      fb.innerHTML = `<strong>${right ? "¡Eso es!" : "Casi."}</strong> Es ${escapeHTML(answer.name)}.
        <div class="quiz-actions"><button class="btn accent" type="button" data-next>${round + 1 < ROUNDS ? "Siguiente →" : "Ver resultado"}</button></div>`;
      fb.querySelector("[data-next]").addEventListener("click", () => { round++; round < ROUNDS ? ask() : finish(); });
    }));
  }

  function finish() {
    const best = Math.max(Number(gStore(KEY)) || 0, score);
    gStore(KEY, best);
    const verdict = score === ROUNDS ? "Hincha de fierro." : score >= ROUNDS * 0.7 ? "Conocés la cancha." : score >= ROUNDS * 0.4 ? "Vas bien, falta tercer tiempo." : "A mirar más rugby de ascenso.";
    root.innerHTML = `
      <div class="quiz-top"><span class="drop-kicker">Resultado</span><span class="quiz-score">Récord: ${best}</span></div>
      <div class="quiz-result-score">${score}<small>/${ROUNDS}</small></div>
      <h3>${verdict}</h3>
      <div class="quiz-actions">
        <button class="btn accent" type="button" data-again>Jugar de nuevo</button>
        <button class="btn ghost" type="button" data-share>Compartir</button>
      </div>`;
    root.querySelector("[data-again]").addEventListener("click", start);
    root.querySelector("[data-share]").addEventListener("click", e =>
      copyText(`Adiviné ${score}/${ROUNDS} escudos del URBA Top 14 en DropRugby 🏉 ¿Me ganás? ${location.origin}/escudos`, e.currentTarget));
  }

  start();
}

/* ==========================================================================
   3) MAYOR O MENOR — con la tabla real del URBA Top 14
   ========================================================================== */

const HL_STATS = [
  { key: "pts", q: "¿Quién tiene más puntos en la tabla?", label: "puntos" },
  { key: "pg", q: "¿Quién ganó más partidos?", label: "ganados" },
  { key: "pp", q: "¿Quién perdió más partidos?", label: "perdidos" },
  { key: "diff", q: "¿Quién tiene mejor diferencia de puntos?", label: "de diferencia" }
];

async function mountHigherLower(root) {
  const clubs = (await loadClubs()).filter(c => c.row);
  if (clubs.length < 2) {
    root.innerHTML = `<div class="quiz-empty"><h3>El juego vuelve pronto.</h3><p>Todavía no hay tabla cargada.</p></div>`;
    return;
  }

  const KEY = "mayormenor_best";
  let streak = 0;

  function fmt(stat, club) {
    const v = Number(club.row[stat.key]) || 0;
    return stat.key === "diff" && v > 0 ? `+${v}` : String(v);
  }

  function ask() {
    const stat = pickRandom(HL_STATS)[0];
    let pair;
    for (let i = 0; i < 50; i++) {
      pair = pickRandom(clubs, 2);
      if ((Number(pair[0].row[stat.key]) || 0) !== (Number(pair[1].row[stat.key]) || 0)) break;
      pair = null;
    }
    if (!pair) return ask();

    const winner = (Number(pair[0].row[stat.key]) || 0) > (Number(pair[1].row[stat.key]) || 0) ? pair[0] : pair[1];
    const best = Number(gStore(KEY)) || 0;

    root.innerHTML = `
      <div class="quiz-top"><span class="drop-kicker">Racha ${streak}</span><span class="quiz-score">Récord ${Math.max(best, streak)}</span></div>
      <h3 class="shield-q">${escapeHTML(stat.q)}</h3>
      <div class="hl-grid">
        ${pair.map(c => `
          <button type="button" class="hl-card" data-name="${escapeHTML(c.name)}">
            <span class="hl-shield">${teamShield(c.name, "team-shield big")}</span>
            <strong>${escapeHTML(c.name)}</strong>
            <span class="hl-value hidden">${fmt(stat, c)} <small>${stat.label}</small></span>
          </button>`).join("")}
      </div>
      <div class="quiz-feedback hidden" id="hl-feedback"></div>`;

    let locked = false;
    root.querySelectorAll(".hl-card").forEach(card => card.addEventListener("click", () => {
      if (locked) return;
      locked = true;
      const right = card.dataset.name === winner.name;
      root.querySelectorAll(".hl-card").forEach(c => {
        c.querySelector(".hl-value").classList.remove("hidden");
        c.disabled = true;
        if (c.dataset.name === winner.name) c.classList.add("is-correct");
        else if (c === card) c.classList.add("is-wrong");
      });
      const fb = root.querySelector("#hl-feedback");
      fb.classList.remove("hidden");

      if (right) {
        streak++;
        gStore(KEY, Math.max(best, streak));
        fb.innerHTML = `<strong>¡Bien!</strong> Racha de ${streak}.
          <div class="quiz-actions"><button class="btn accent" type="button" data-next>Siguiente →</button></div>`;
        fb.querySelector("[data-next]").addEventListener("click", ask);
      } else {
        const final = streak;
        streak = 0;
        fb.innerHTML = `<strong>Se terminó.</strong> Tu racha fue de ${final}.
          <div class="quiz-actions">
            <button class="btn accent" type="button" data-again>Jugar de nuevo</button>
            <button class="btn ghost" type="button" data-share>Compartir</button>
          </div>`;
        fb.querySelector("[data-again]").addEventListener("click", ask);
        fb.querySelector("[data-share]").addEventListener("click", e =>
          copyText(`Hice una racha de ${final} en Mayor o menor del URBA Top 14 (DropRugby) 🏉 ${location.origin}/mayor-menor`, e.currentTarget));
      }
    }));
  }

  ask();
}

/* ==========================================================================
   4) URBA TOP 14 — clubes y jugadores
   ========================================================================== */

async function mountUrbaClubs(root) {
  const [clubs, players] = await Promise.all([loadClubs(), loadPlayers()]);
  if (!clubs.length) { root.innerHTML = `<p class="empty-state">Todavía no hay clubes cargados.</p>`; return; }

  const byClub = name => players.filter(p => normalizeTeamName(p.club) === normalizeTeamName(name));

  root.innerHTML = clubs.map((c, i) => {
    const row = c.row;
    const squad = byClub(c.name);
    return `
      <article class="club-card">
        <div class="club-head">${teamShield(c.name, "team-shield big")}<div><h3>${escapeHTML(c.name)}</h3>
          ${row ? `<span>${i + 1}° · ${Number(row.pts) || 0} pts · ${Number(row.pg) || 0}G ${Number(row.pe) || 0}E ${Number(row.pp) || 0}P</span>` : ""}</div></div>
        ${squad.length ? `<ul class="club-players">${squad.slice(0, 8).map(p => `<li>${p.position ? `<b>${Number(p.position)}</b>` : ""}${escapeHTML(p.name)}</li>`).join("")}</ul>` : ""}
      </article>`;
  }).join("");
}

/* ---------- despachador ---------- */

async function renderGames() {
  const page = document.body.dataset.page;
  const mount = document.querySelector("[data-game]");
  if (page === "urba") {
    const el = document.getElementById("urba-clubs");
    if (el) await mountUrbaClubs(el);
    return;
  }
  if (!mount) return;
  if (page === "xv") await mountRugbyXV(mount);
  else if (page === "escudos") await mountShieldGame(mount);
  else if (page === "mayormenor") await mountHigherLower(mount);
}

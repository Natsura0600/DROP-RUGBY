// ============================================================
// QUIZ DEL DÍA CON IA
//
// Arma un quiz nuevo de 5 preguntas:
//   - 2 preguntas salen de los datos del sitio (jugadores, clubes y
//     divisiones), así que siempre son correctas.
//   - 3 preguntas de reglamento e historia las genera una IA a través
//     de Vercel AI Gateway.
// Si la IA no está disponible, las 5 preguntas salen de los datos:
// el quiz cambia igual todos los días.
//
// Autenticación con AI Gateway (en este orden):
//   AI_GATEWAY_API_KEY  → clave creada en Vercel (AI Gateway → API Keys)
//   token OIDC de Vercel → automático en los deploys de Vercel
// Modelo: QUIZ_AI_MODEL (opcional). Si no está, prueba una lista.
// ============================================================

import fs from "node:fs/promises";
import path from "node:path";
import { getDivisions } from "./urba.js";

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

// Se prueban en orden hasta que uno responda. El plan gratis de AI Gateway
// no habilita todos los modelos: por eso hay varios de distintos proveedores.
const MODEL_CANDIDATES = [
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5-mini",
  "google/gemini-2.5-flash",
  "openai/gpt-5-nano",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-4.1-mini",
  "mistral/mistral-small",
  "meta/llama-3.3-70b"
];

const POSITION_ROLES = {
  1: "Pilar", 2: "Hooker", 3: "Pilar", 4: "Segunda línea", 5: "Segunda línea",
  6: "Ala", 7: "Ala", 8: "Octavo", 9: "Medio scrum", 10: "Apertura",
  11: "Wing", 12: "Centro", 13: "Centro", 14: "Wing", 15: "Fullback"
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Fecha de hoy en Buenos Aires, "AAAA-MM-DD". */
export function quizDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dateLabel(key) {
  const [, m, d] = key.split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

/* ---------- azar reproducible por fecha ---------- */

function seededRandom(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mezcla las opciones y actualiza el índice correcto. */
function shuffleOptions(question, rand) {
  const tagged = question.options.map((text, i) => ({ text, ok: i === question.correct }));
  const mixed = shuffle(tagged, rand);
  return { ...question, options: mixed.map((o) => o.text), correct: mixed.findIndex((o) => o.ok) };
}

/* ---------- jugadores ---------- */

async function loadPlayers(content) {
  let list = Array.isArray(content?.players) ? content.players : [];
  if (!list.length) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "data", "players.json"), "utf8");
      const data = JSON.parse(raw);
      list = Array.isArray(data) ? data : Array.isArray(data.players) ? data.players : [];
    } catch (_) {
      list = [];
    }
  }
  return list
    .map((p) => {
      const positions = (Array.isArray(p.positions) ? p.positions : [p.position])
        .map(Number)
        .filter((n) => n >= 1 && n <= 15);
      const name = String(p.name || `${p.first || ""} ${p.last || ""}`).replace(/\s+/g, " ").trim();
      return { name, club: String(p.club || "").trim(), positions };
    })
    .filter((p) => p.name && p.club);
}

/* ---------- banco fijo: reglamento seguro (último respaldo) ---------- */

const STATIC_BANK = [
  { q: "¿Cuántos puntos vale un try?", options: ["5", "3", "4", "7"], explain: "El try vale 5 puntos." },
  { q: "¿Cuántos puntos suma una conversión?", options: ["2", "1", "3", "5"], explain: "La conversión, después del try, suma 2 puntos." },
  { q: "¿Cuántos puntos vale un penal convertido a los palos?", options: ["3", "2", "4", "5"], explain: "El penal a los palos vale 3 puntos." },
  { q: "¿Cuántos puntos vale un drop?", options: ["3", "2", "1", "5"], explain: "El drop vale 3 puntos, igual que un penal." },
  { q: "¿Cuántos jugadores tiene cada equipo en cancha en el rugby de 15?", options: ["15", "13", "11", "16"], explain: "Son 15 por lado: 8 forwards y 7 backs." },
  { q: "¿Qué número de camiseta usa el hooker?", options: ["2", "1", "8", "9"], explain: "El hooker es el 2, entre los dos pilares." },
  { q: "¿Qué número de camiseta usa el apertura?", options: ["10", "9", "12", "15"], explain: "El apertura lleva la 10." },
  { q: "¿Qué número de camiseta usa el fullback?", options: ["15", "14", "11", "13"], explain: "El fullback lleva la 15." },
  { q: "¿Qué número de camiseta usa el medio scrum?", options: ["9", "10", "7", "2"], explain: "El medio scrum es el 9." },
  { q: "¿Qué número de camiseta usa el octavo?", options: ["8", "6", "7", "5"], explain: "El octavo lleva la 8, al fondo del scrum." },
  { q: "En la URBA, ¿cuántos puntos de tabla da una victoria?", options: ["4", "3", "2", "5"], explain: "Victoria 4, empate 2 y derrota 0, más el punto bonus." },
  { q: "En la URBA, ¿cuántos puntos de tabla da un empate?", options: ["2", "1", "0", "3"], explain: "El empate da 2 puntos a cada equipo." },
  { q: "¿Cuántos forwards forman un scrum completo?", options: ["8", "6", "7", "5"], explain: "El scrum lo forman los 8 forwards de cada equipo." },
  { q: "¿Qué camisetas usan los pilares?", options: ["1 y 3", "1 y 2", "4 y 5", "6 y 7"], explain: "Los pilares son el 1 y el 3." }
];

function staticQuestions(rand, count, recent) {
  return shuffle(STATIC_BANK.filter((q) => !recent.includes(q.q)), rand)
    .concat(shuffle(STATIC_BANK.filter((q) => recent.includes(q.q)), rand))
    .slice(0, count)
    .map((q) => shuffleOptions({ ...q, options: q.options.slice(), correct: 0 }, rand));
}

/* ---------- preguntas a partir de los datos ---------- */

function dataQuestions(content, players, rand, count) {
  const divisions = getDivisions(content);
  const top14 = divisions.top14.clubs;
  const primeraA = divisions.primeraA.clubs;
  const clubs = [...new Set(players.map((p) => p.club))];
  const out = [];
  const usedPlayers = new Set();

  const pickPlayer = (filter) => {
    const pool = shuffle(players.filter((p) => !usedPlayers.has(p.name) && filter(p)), rand);
    const player = pool[0];
    if (player) usedPlayers.add(player.name);
    return player;
  };

  const makers = [
    // ¿En qué club juega…?
    () => {
      if (clubs.length < 4) return null;
      const p = pickPlayer(() => true);
      if (!p) return null;
      const others = shuffle(clubs.filter((c) => c !== p.club), rand).slice(0, 3);
      return {
        q: `¿En qué club juega ${p.name}?`,
        options: [p.club, ...others],
        correct: 0,
        explain: `${p.name} juega en ${p.club}.`
      };
    },
    // ¿En qué puesto juega…?
    () => {
      const p = pickPlayer((x) => x.positions.length && new Set(x.positions.map((n) => POSITION_ROLES[n])).size === 1);
      if (!p) return null;
      const role = POSITION_ROLES[p.positions[0]];
      const roles = [...new Set(Object.values(POSITION_ROLES))].filter((r) => r !== role);
      return {
        q: `¿En qué puesto juega ${p.name} (${p.club})?`,
        options: [role, ...shuffle(roles, rand).slice(0, 3)],
        correct: 0,
        explain: `${p.name} juega de ${role.toLowerCase()} (camiseta ${p.positions.join(" o ")}).`
      };
    },
    // ¿Cuál de estos juega en…?
    () => {
      const club = shuffle(clubs, rand)[0];
      const p = pickPlayer((x) => x.club === club);
      if (!p) return null;
      const others = [];
      for (const c of shuffle(clubs.filter((x) => x !== club), rand)) {
        const o = shuffle(players.filter((x) => x.club === c && !usedPlayers.has(x.name)), rand)[0];
        if (o) others.push(o);
        if (others.length === 3) break;
      }
      if (others.length < 3) return null;
      return {
        q: `¿Cuál de estos jugadores juega en ${club}?`,
        options: [p.name, ...others.map((o) => o.name)],
        correct: 0,
        explain: `${p.name} es de ${club}. Los otros: ${others.map((o) => `${o.name} (${o.club})`).join(", ")}.`
      };
    },
    // ¿Cuál de estos clubes juega el Top 14 2027?
    () => {
      if (top14.length < 1 || primeraA.length < 3) return null;
      const club = shuffle(top14, rand)[0];
      return {
        q: `¿Cuál de estos clubes juega el URBA Top 14 en ${content.season || 2027}?`,
        options: [club, ...shuffle(primeraA, rand).slice(0, 3)],
        correct: 0,
        explain: `${club} está en el Top 14; los otros tres juegan la Primera A.`
      };
    }
  ];

  let guard = 0;
  while (out.length < count && guard++ < 40) {
    const q = makers[(out.length + guard) % makers.length]();
    if (q && !out.some((x) => x.q === q.q)) out.push(shuffleOptions(q, rand));
  }
  return out;
}

/* ---------- preguntas con IA ---------- */

function gatewayToken(req) {
  const header = req?.headers?.["x-vercel-oidc-token"];
  return process.env.AI_GATEWAY_API_KEY || (Array.isArray(header) ? header[0] : header) || process.env.VERCEL_OIDC_TOKEN || "";
}

function extractJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("La IA no devolvió JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

function validQuestion(q) {
  if (!q || typeof q.q !== "string" || !q.q.trim()) return null;
  const options = (Array.isArray(q.options) ? q.options : []).map((o) => String(o || "").trim().slice(0, 160));
  const correct = Number(q.correct);
  if (options.length !== 4 || options.some((o) => !o) || new Set(options.map((o) => o.toLowerCase())).size !== 4) return null;
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) return null;
  return {
    q: q.q.trim().slice(0, 300),
    options,
    correct,
    explain: String(q.explain || "").trim().slice(0, 400)
  };
}

async function aiQuestions({ count, recent, req, rand }) {
  const token = gatewayToken(req);
  if (!token) throw new Error("Falta acceso a AI Gateway (AI_GATEWAY_API_KEY o token OIDC de Vercel).");

  const system = [
    "Sos el editor de un sitio argentino de juegos de rugby. Escribís en español rioplatense, claro y breve.",
    "Armás preguntas de opción múltiple para un quiz diario.",
    "Usá SOLO datos de rugby muy conocidos y estables, que no cambien con el tiempo: reglamento (puntajes, cantidad de jugadores, números de camiseta por puesto, infracciones básicas), vocabulario del juego, e historia consolidada (mundiales ya jugados, hitos de Los Pumas, orígenes del deporte).",
    "No preguntes por resultados, tablas, planteles o noticias recientes, ni por datos de los que no estés completamente seguro.",
    "Cada pregunta tiene exactamente 4 opciones distintas y una sola correcta."
  ].join(" ");

  const user = [
    `Generá ${count} preguntas nuevas, variadas en tema y dificultad (una fácil, una media, una difícil).`,
    recent.length ? `No repitas estas preguntas de días anteriores:\n- ${recent.slice(0, 40).join("\n- ")}` : "",
    "Respondé SOLO con JSON, sin texto alrededor, con esta forma:",
    '{"questions":[{"q":"pregunta","options":["a","b","c","d"],"correct":0,"explain":"por qué es correcta, en una oración"}]}'
  ].filter(Boolean).join("\n\n");

  const models = [process.env.QUIZ_AI_MODEL, ...MODEL_CANDIDATES].filter(Boolean);
  const errors = [];

  for (const model of models) {
    let response;
    try {
      response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          max_tokens: 1800,
          messages: [{ role: "system", content: system }, { role: "user", content: user }]
        }),
        signal: AbortSignal.timeout(45000)
      });
    } catch (error) {
      errors.push(`${model}: ${error.message}`);
      continue;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      errors.push(`${model}: ${response.status} ${data?.error?.message || ""}`.trim());
      // Sin autorización no sirve ningún modelo; si el modelo no está habilitado
      // (plan gratis) o no existe, se prueba el siguiente.
      if (response.status === 401) break;
      continue;
    }

    try {
      const text = data?.choices?.[0]?.message?.content || "";
      const parsed = extractJSON(typeof text === "string" ? text : JSON.stringify(text));
      const questions = (parsed.questions || [])
        .map(validQuestion)
        .filter(Boolean)
        .filter((q) => !recent.includes(q.q))
        .slice(0, count)
        .map((q) => shuffleOptions(q, rand));
      if (questions.length) return { questions, model };
      errors.push(`${model}: respuesta sin preguntas válidas`);
    } catch (error) {
      errors.push(`${model}: ${error.message}`);
    }
  }

  // El primer error suele ser el más claro (por ejemplo, el del plan gratis).
  throw new Error(errors.length ? `${errors[0]}${errors.length > 1 ? ` (y ${errors.length - 1} modelos más sin respuesta)` : ""}` : "La IA no respondió.");
}

/* ---------- quiz del día ---------- */

export async function generateDailyQuiz(content, { req, date } = {}) {
  const key = date || quizDateKey();
  const rand = seededRandom(`droprugby-quiz-${key}-${Date.now()}`);
  const players = await loadPlayers(content);
  const recent = (Array.isArray(content?.quizHistory) ? content.quizHistory : [])
    .flatMap((entry) => (Array.isArray(entry?.questions) ? entry.questions : []))
    .filter((q) => typeof q === "string");

  const TOTAL = 5;
  let ai = { questions: [], model: "" };
  let aiError = "";
  try {
    ai = await aiQuestions({ count: 3, recent, req, rand });
  } catch (error) {
    aiError = String(error?.message || error);
  }

  const fromData = dataQuestions(content, players, rand, TOTAL - ai.questions.length);
  // Si faltan preguntas (pocos jugadores cargados), se completa con el banco fijo.
  if (ai.questions.length + fromData.length < TOTAL) {
    fromData.push(...staticQuestions(rand, TOTAL - ai.questions.length - fromData.length, recent));
  }
  // Intercaladas: datos, IA, datos, IA…
  const questions = [];
  const a = ai.questions.slice();
  const d = fromData.slice();
  while (questions.length < TOTAL && (a.length || d.length)) {
    if (d.length && (questions.length % 2 === 0 || !a.length)) questions.push(d.shift());
    else if (a.length) questions.push(a.shift());
  }

  if (questions.length < 3) {
    throw new Error(aiError || "No hay datos suficientes para armar el quiz.");
  }

  return {
    id: `quiz-${key}`,
    date: key,
    title: "Quiz del día",
    intro: "Cinco preguntas nuevas todos los días: jugadores y clubes de la URBA, reglamento e historia del rugby.",
    week: `Quiz del día · ${dateLabel(key)}`,
    active: true,
    source: ai.questions.length ? "ia" : "datos",
    model: ai.model || "",
    aiError,
    questions: questions.map((q, i) => ({ id: `q${i + 1}`, ...q })),
    updatedAt: new Date().toISOString()
  };
}

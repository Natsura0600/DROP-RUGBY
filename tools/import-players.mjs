// Convierte data/players.csv  →  data/players.json
//   node tools/import-players.mjs            (usa data/players.csv)
//   node tools/import-players.mjs otro.csv
//
// Columnas: club, nombre, apellido, puesto   (también acepta club, jugador, puesto)
//   club     nombre del club o alias (Newman, CASI, Hindu, Biei, Champa…)
//   nombre   nombre de pila (puede ser compuesto: Juan Pablo)
//   apellido apellido (puede ser compuesto: De la Vega). Es lo que se adivina en el Wordle.
//   puesto  número 1-15 o nombre (pilar, hooker, segunda linea, ala, octavo,
//           medio scrum, apertura, wing, centro, fullback). Si el nombre es
//           ambiguo (pilar, ala, wing, centro, segunda linea) se puede
//           poner el número; si se deja vacío, el jugador sirve para cualquier puesto.
// Separador: coma o punto y coma (Excel en español guarda con ;).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = path.resolve(process.argv[2] || path.join(ROOT, "data", "players.csv"));
const output = path.join(ROOT, "data", "players.json");

const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// Clubes: nombre canónico + alias, desde data/teams.json
const teams = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "teams.json"), "utf8"));
const clubIndex = new Map();
for (const club of Object.values(teams.clubs || {})) {
  for (const key of [club.name, ...(club.aliases || [])]) clubIndex.set(norm(key), club.name);
}

// Puestos por nombre → números de camiseta (un jugador puede tener varios).
const POSITIONS = {
  pilar: [1, 3], "pilar izquierdo": [1], "pilar derecho": [3], hooker: [2], talonador: [2],
  "segunda linea": [4, 5], "2da linea": [4, 5], segunda: [4, 5],
  ala: [6, 7], "ala ciego": [6], "ala abierto": [7], "tercera linea": [6, 7, 8],
  octavo: [8], "numero 8": [8], "medio scrum": [9], scrum: [9], medio: [9],
  apertura: [10], "medio apertura": [10], centro: [12, 13], "primer centro": [12], "segundo centro": [13],
  wing: [11, 14], "wing izquierdo": [11], "wing derecho": [14], fullback: [15], zaguero: [15],
  back: [9, 10, 11, 12, 13, 14, 15], backs: [9, 10, 11, 12, 13, 14, 15],
  forward: [1, 2, 3, 4, 5, 6, 7, 8], forwards: [1, 2, 3, 4, 5, 6, 7, 8], delantero: [1, 2, 3, 4, 5, 6, 7, 8]
};

// "10", "11/14", "9-15", "wing/fullback", "pilar y hooker" → [números] (null si no se entiende)
function parsePositions(raw) {
  const out = [];
  for (const part of String(raw).split(/[\/|+;]|\s+y\s+|\s+o\s+/i).map(norm).filter(Boolean)) {
    const range = part.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
    if (range) for (let n = Number(range[1]); n <= Number(range[2]); n++) out.push(n);
    else if (/^\d{1,2}$/.test(part)) out.push(Number(part));
    else if (POSITIONS[part]) out.push(...POSITIONS[part]);
    else return null;
  }
  if (!out.length || out.some((n) => !(n >= 1 && n <= 15))) return null;
  return [...new Set(out)].sort((a, b) => a - b);
}

function parseCSV(text) {
  const first = text.split(/\r?\n/)[0] || "";
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);
  return rows;
}

if (!fs.existsSync(input)) { console.error(`No encuentro ${input}`); process.exit(1); }
const rows = parseCSV(fs.readFileSync(input, "utf8").replace(/^﻿/, ""));
const header = rows.shift().map(norm);
const col = (...names) => header.findIndex(h => names.includes(h));
const iClub = col("club"), iFirst = col("nombre"), iLast = col("apellido"), iFull = col("jugador"), iPos = col("puesto", "posicion");
const split = iFirst >= 0 && iLast >= 0;
if (iClub < 0 || (!split && iFull < 0 && iFirst < 0)) { console.error("Faltan columnas: club, nombre, apellido, puesto (o club, jugador, puesto)."); process.exit(1); }
const clean = v => String(v || "").trim().replace(/\s+/g, " ");

const players = [], errors = [], seen = new Set();
rows.forEach((r, n) => {
  const line = n + 2;
  let first, last;
  if (split) { first = clean(r[iFirst]); last = clean(r[iLast]); }
  else {
    // Una sola columna: la primera palabra es el nombre y el resto el apellido.
    const parts = clean(r[iFull >= 0 ? iFull : iFirst]).split(" ");
    first = parts.length > 1 ? parts[0] : "";
    last = parts.slice(parts.length > 1 ? 1 : 0).join(" ");
  }
  const name = clean(`${first} ${last}`);
  const clubRaw = (r[iClub] || "").trim();
  const posRaw = iPos >= 0 ? (r[iPos] || "").trim() : "";
  if (!last) return errors.push(`Línea ${line}: falta el apellido.`);
  const club = clubIndex.get(norm(clubRaw));
  if (!club) return errors.push(`Línea ${line}: club desconocido "${clubRaw}" (${name}).`);
  let positions = [];
  if (posRaw) {
    positions = parsePositions(posRaw);
    if (!positions) return errors.push(`Línea ${line}: puesto no válido "${posRaw}" (${name}).`);
  }
  const key = `${norm(club)}|${norm(name)}`;
  if (seen.has(key)) return errors.push(`Línea ${line}: repetido ${name} (${club}).`);
  seen.add(key);
  players.push(positions.length
    ? { first, last, name, club, position: positions[0], positions }
    : { first, last, name, club });
});

players.sort((a, b) => a.club.localeCompare(b.club) || (a.position || 99) - (b.position || 99) || a.name.localeCompare(b.name));
fs.writeFileSync(output, JSON.stringify({
  _ayuda: "Generado con tools/import-players.mjs desde data/players.csv. Editá el CSV y volvé a correr el script.",
  players
}, null, 2) + "\n");

const perClub = {};
players.forEach(p => { perClub[p.club] = (perClub[p.club] || 0) + 1; });
console.log(`✔ ${players.length} jugadores → data/players.json`);
Object.entries(perClub).forEach(([c, k]) => console.log(`   ${c}: ${k}`));
if (errors.length) { console.log(`\n⚠ ${errors.length} líneas ignoradas:`); errors.forEach(e => console.log("  - " + e)); }

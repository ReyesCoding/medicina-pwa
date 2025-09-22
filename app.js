// app.js — orquestador
import { CONFIG } from "./config.js";

// Títulos por cuatrimestre (como en el PDF)
const CUAT_TITLES = {
  "1":"PRIMER CUATRIMESTRE","2":"SEGUNDO CUATRIMESTRE","3":"TERCER CUATRIMESTRE",
  "4":"CUARTO CUATRIMESTRE","5":"QUINTO CUATRIMESTRE","6":"SEXTO CUATRIMESTRE",
  "7":"SEPTIMO CUATRIMESTRE","8":"OCTAVO CUATRIMESTRE","9":"NOVENO CUATRIMESTRE",
  "10":"DECIMO CUATRIMESTRE","11":"UNDECIMO CUATRIMESTRE","12":"DUODECIMO CUATRIMESTRE",
  "13":"DECIMO TERCER CUATRIMESTRE","14":"DECIMO CUARTO CUATRIMESTRE","15":"DECIMO QUINTO CUATRIMESTRE",
  "16":"DECIMO SEXTO CUATRIMESTRE","17":"DECIMO SEPTIMO CUATRIMESTRE","18":"DECIMO OCTAVO CUATRIMESTRE","19":"DECIMO NOVENO  CUATRIMESTRE"
};


const state = {
  dataset: null,
  passed: new Set(),
  grades: {},       // { id: "A" | 95 | ... }
  plan: new Set(),  // ids planificadas
  maxCredits: CONFIG.DEFAULT_MAX_CREDITS,
  scaleMode: CONFIG.GRADE_SCALE.mode
};

// 👇 Añádelo arriba, tras 'state' y antes de 'const App = {...}'
function isPassed(id){ return state.passed.has(id); }

// —— Reglas por bloque (área → bloque) y GPA
const AREA_TO_BLOCK = { PREMEDICA: "PREMED", BASICAS: "BASICAS", CLINICAS: "CLINICAS", INTERNADO: "INTERNADO" };

function blockKeyOf(course) {
  const area = String(course.area || "").toUpperCase();
  return AREA_TO_BLOCK[area] || null;
}

function coursesInBlock(blockKey) {
  const area = Object.entries(AREA_TO_BLOCK).find(([a, k]) => k === blockKey)?.[0] || null;
  if (!area) return [];
  return (state.dataset?.courses || []).filter(c => String(c.area || "").toUpperCase() === area);
}

function isBlockCompleted(blockKey) {
  const list = coursesInBlock(blockKey);
  // todas las obligatorias del bloque aprobadas
  const required = list.filter(c => !c.is_elective);
  if (!required.every(c => state.passed.has(c.id))) return false;

  // créditos de electivas mínimos del bloque (si aplica)
  const need = CONFIG.ELECTIVES_MIN?.[blockKey] ?? 0;
  if (need > 0) {
    const electCr = list
      .filter(c => c.is_elective && state.passed.has(c.id))
      .reduce((a, c) => a + (c.credits || 0), 0);
    if (electCr < need) return false;
  }
  return true;
}

function allowedByBlockRules(course) {
  const bk = blockKeyOf(course);
  if (!bk) return true;
  if (bk === "PREMED") return true; // arranque

  if (bk === "BASICAS") {
    if (!isBlockCompleted("PREMED")) return false;
    const overallGPA = window.GPA?.calc(state.dataset.courses, state.grades, state.scaleMode);
    const min = CONFIG.GPA_MIN_PREMED_TO_BASICAS;
    if (min != null && (overallGPA ?? 0) < min) return false;
    return true;
  }
  if (bk === "CLINICAS")  return isBlockCompleted("BASICAS");
  if (bk === "INTERNADO") return isBlockCompleted("CLINICAS");
  return true;
}

const App = {
  config: CONFIG,
  state,
  byId,
  isPassed,
  setPassed,
  isAvailable,
  save,
  renderList,
  renderDetail,
  renderPlan,
  setKPIs
};
window.App = App; // expone para graph/planner/gpa

// índices
const idx = new Map();
const deps = new Map();     // prereqs directos: id -> [pr]
const revDeps = new Map();  // dependientes: id -> [children]
App.deps = deps;
App.revDeps = revDeps;

// —— Admin flag (mover arriba para que esté disponible en injectAdminButton/boot)
const isAdmin = new URL(location.href).searchParams.get("admin") === CONFIG.ADMIN_KEY;

//——— Storage
const LSKEY = "medicina-progress";
function save() {
  localStorage.setItem(LSKEY, JSON.stringify({
    passed: [...state.passed],
    grades: state.grades,
    plan:   [...state.plan],
    maxCredits: state.maxCredits,
    scaleMode: state.scaleMode,
    selectedSections: state.selectedSections
  }));
}
function load() {
  const raw = localStorage.getItem(LSKEY);
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    state.passed = new Set(obj.passed || []);
    state.grades = obj.grades || {};
    state.plan   = new Set(obj.plan || []);
    state.maxCredits = obj.maxCredits ?? CONFIG.DEFAULT_MAX_CREDITS;
    state.scaleMode  = obj.scaleMode  ?? CONFIG.GRADE_SCALE.mode;
    state.selectedSections = obj.selectedSections || {};
  } catch {}
}

//——— DOM helpers
function $(s){ return document.querySelector(s) }
function $on(el, ev, fn){ el && el.addEventListener(ev, fn) }

//——— Índices utilitarios
function byId(id){ return idx.get(id) || null }
function rebuildIndexes(){
  idx.clear(); deps.clear(); revDeps.clear();
  for (const c of (state.dataset?.courses || [])) {
    idx.set(c.id, c);
    deps.set(c.id, [...(c.prereqs || [])]);
    for (const p of (c.prereqs || [])) {
      if (!revDeps.has(p)) revDeps.set(p, []);
      revDeps.get(p).push(c.id);
    }
  }
}

// Enlaza UI (antes del render inicial)
const qEl = $("#inpSearch");            // o $("#inpSearch") si usas ese id
if (qEl) $on(qEl, "input", renderList);



// Disponibilidad: reglas de bloque + todos los prerrequisitos aprobados
function isAvailable(id) {
  const c = byId(id);
  if (!c) return false;

  // puertas de bloque (PREMED → BASICAS → CLINICAS → INTERNADO) + GPA 2.5
  if (!allowedByBlockRules(c)) return false;

  // prerrequisitos directos
  for (const p of (c.prereqs || [])) {
    if (!state.passed.has(p)) return false;
  }
  return true;
}


function setPassed(id, v) {
  if (v && CONFIG.GPA?.REQUIRE_GRADE_ON_PASS) {
    const graw = state.grades[id];
    const n = Number(graw);
    if (graw == null || graw === "" || Number.isNaN(n) || n < 0 || n > 100) {
      alert("Ingresa una calificación válida (0–100) antes de aprobar.");
      renderDetail(id);
      setTimeout(()=> document.getElementById("inpGrade")?.focus(), 0);
      return;
    }
    if (n < CONFIG.GPA.PASSING_MIN_NUMERIC) {
      alert(`No se aprueba con nota menor a ${CONFIG.GPA.PASSING_MIN_NUMERIC}.`);
      renderDetail(id);
      setTimeout(()=> document.getElementById("inpGrade")?.focus(), 0);
      return;
    }
  }

  if (v) state.passed.add(id);
  else   state.passed.delete(id);
  save();
  setKPIs();
  renderList();
  if (window.Graph) window.Graph.refreshGraphColors();
  if (v && state.plan.has(id)) { state.plan.delete(id); renderPlan(); }
}

function setKPIs() {
  const total = state.dataset.courses.reduce((a,c)=>a+(c.credits||0),0);
  const earned = state.dataset.courses.filter(c=>state.passed.has(c.id)).reduce((a,c)=>a+(c.credits||0),0);
  $("#kpiCredits").textContent  = `${earned} / ${total}`;
  $("#kpiProgress").textContent = total ? `${Math.round(earned/total*100)}%` : "0%";

  const pool = CONFIG.GPA?.COUNT_ONLY_PASSED
    ? state.dataset.courses.filter(c=>state.passed.has(c.id))
    : state.dataset.courses;

  const g = window.GPA?.calc(pool, state.grades, state.scaleMode);
  $("#kpiGPA").textContent = (g==null) ? "—" : g.toFixed(2);
}

function groupFrom(course){
  const area = String(course.area || "").toUpperCase();
  return course.elective_group || (CONFIG.ELECTIVE_FALLBACK_BY_AREA?.[area] || null);
}
window.groupFrom = groupFrom;

function electiveTag(course){
  if (!course?.is_elective) return "";
  const g = (groupFrom(course) || "GEN").toUpperCase();      // GEN | CLINICAS | BASICAS | PREMED
  const gcls = g.toLowerCase();
  const label = (CONFIG.ELECTIVE_TITLES?.[g])
    ? CONFIG.ELECTIVE_TITLES[g]
    : (g === "GEN" ? "Electiva" : `Electiva · ${g}`);
  return `<span class="tag tag-elec ${gcls}">${label}</span>`;
}
window.electiveTag = electiveTag;


//——— LISTA
function renderList() {
  const q = ($("#inpSearch")?.value || "").trim().toLowerCase();
  const f = $("#selFilter")?.value || "all";

  const byCuatr = new Map();
  for (const c of state.dataset.courses) {
    if (!byCuatr.has(c.cuatrimestre)) byCuatr.set(c.cuatrimestre, []);
    byCuatr.get(c.cuatrimestre).push(c);
  }

  const cuats = [...byCuatr.keys()].sort((a,b)=>Number(a)-Number(b));
  const list = $("#listBody");
  list.innerHTML = "";

  for (const cuat of cuats) {
    const cursos = byCuatr.get(cuat);
    const required = cursos.filter(c=>!c.is_elective);
    const electivas = cursos.filter(c=>c.is_elective);

    // Header del cuatrimestre
    const h = document.createElement("div");
    h.className = "cuat-head";
    const cuatNum = Number(cuat);
    const titulo = `${cuatNum===19 ? "PROYECTO" : (["","PRIMER","SEGUNDO","TERCER","CUARTO","QUINTO","SEXTO","SÉPTIMO","OCTAVO","NOVENO","DÉCIMO","UNDÉCIMO","DUODÉCIMO","DÉCIMO TERCER","DÉCIMO CUARTO","DÉCIMO QUINTO","DÉCIMO SEXTO","DÉCIMO SÉPTIMO","DÉCIMO OCTAVO","DÉCIMO NOVENO"][cuatNum] || cuat)} CUATRIMESTRE`;
    h.innerHTML = `<div class="cuat-title">${titulo}</div>`;
    list.appendChild(h);

    // pinta un bloque (lista) con items filtrados por búsqueda/filtro
    // Bloque que pinta un grupo de cursos en la LISTA (no toca #detail)
const paintBlock = (arr, blockTitle = null) => {
  const ul = document.createElement("div");
  ul.className = "list-block";

  if (blockTitle) {
    const sub = document.createElement("div");
    sub.className = "subhead";
    sub.textContent = blockTitle;
    ul.appendChild(sub);
  }

  for (const c of arr) {
    // filtros de búsqueda/estado (q y f vienen del scope de renderList)
    if (q && !(c.name.toLowerCase().includes(q) || String(c.id).toLowerCase().includes(q))) continue;
    if (f !== "all") {
      if (f === "passed" && !state.passed.has(c.id)) continue;
      if (f === "available" && !isAvailable(c.id)) continue;
      if (f === "blocked" && isAvailable(c.id)) continue;
    }

    const item = document.createElement("div");
    item.className = "list-item";
    item.setAttribute("data-id", c.id);

    const tagElect = electiveTag(c);
    const status   = isPassed(c.id) ? "Aprobada" : (isAvailable(c.id) ? "Disponible" : "Bloqueada");
    const prs      = (c.prereqs || []).map(x => `<span class="pill">${x}</span>`).join("") || "<span class='pill'>—</span>";
    const cos      = (c.coreqs  || []).map(x => `<span class="pill">${x}</span>`).join("") || "<span class='pill'>—</span>";

    item.innerHTML = `
      <div class="li-left">
        <div class="title-line">
          <div><b>${c.id}</b> — ${c.name}</div>
          ${tagElect}
        </div>
        <div class="muted">${(c.block || c.area || "—")} · ${c.credits ?? 0} cr · HT ${c.ht ?? "—"} · HP ${c.hp ?? "—"}</div>
        <div class="muted small">Prerrequisitos: ${prs} · Correquisitos: ${cos}</div>
      </div>

      <div class="li-right">
        <span class="pill">${status}</span>
        ${
          isPassed(c.id)
            ? `<span class="muted">Ya aprobada</span>`
            : `<button class="btn" data-act="pass" ${status !== "Disponible" ? "disabled" : ""}>Marcar aprobada</button>`
        }
      </div>
    `;

    // Acción "Marcar aprobada" desde la lista
    const passBtn = item.querySelector("[data-act='pass']");
    if (passBtn) {
      passBtn.addEventListener("click", () => {
        if (passBtn.disabled) return;
        let grade = prompt("Calificación (0–100):", "80");
        if (grade == null) return;
        grade = Number(grade);
        if (!Number.isFinite(grade) || grade < 0 || grade > 100) return;

        state.grades[c.id] = grade;
        state.passed.add(c.id);
        save();

        renderList();
        renderPlan();
        renderDetail(c.id);
        if (typeof updateKpis === "function") updateKpis();
      });
    }

    ul.appendChild(item);
  }

  list.appendChild(ul);
};

    // Requeridas
    paintBlock(required);

    // Electivas (si hay)
    if (electivas.length) {
      // título según group (si todos comparten uno, muéstralo; si hay mezcla, muestra uno genérico)
     const groups = new Set(electivas.map(e => groupFrom(e) || "NONE"));
      let title = "Electivas";
      if (groups.size === 1 && !groups.has("NONE")) {
        const gid = [...groups][0];
        title = CONFIG.ELECTIVE_TITLES[gid] || title;
      }
      paintBlock(electivas, title);
    }

    // Checkpoint (si aplica)
    const cp = CONFIG.CHECKPOINTS?.[String(cuat)];
    if (cp) {
      const div = document.createElement("div");
      div.className = "checkpoint";
      div.innerHTML = `<div class="cp-title">🛡️ ${cp.title}</div><div class="cp-note">${cp.note}</div>`;
      list.appendChild(div);
    }
  }

  // Re-engancha handlers para aprobar desde lista (tu lógica actual)
  list.querySelectorAll(".btn-pass").forEach(b=>b.addEventListener("click", e=>{
    const id = e.target.closest(".list-item").getAttribute("data-id");
    if (CONFIG.GPA?.REQUIRE_GRADE_ON_PASS && !state.grades[id]) {
      renderDetail(id);
      setTimeout(()=> document.getElementById("inpGrade")?.focus(), 0);
      return;
    }
    setPassed(id, true);
  }));
  list.querySelectorAll(".btn-unpass").forEach(b=>b.addEventListener("click", e=>{
    const id = e.target.closest(".list-item").getAttribute("data-id");
    setPassed(id, false);
  }));

  // click en item para ver detalle
  list.querySelectorAll(".list-item .li-left").forEach(el=>{
    el.addEventListener("click", e=>{
      const id = e.currentTarget.closest(".list-item").getAttribute("data-id");
      renderDetail(id);
    });
  });
}

//——— DETALLE
function renderDetail(id) {
  const panel = $("#detail");
  if (!panel) return;

  const c = byId(id);
  if (!c) { panel.textContent = "Selecciona una materia…"; return; }

  const status   = isPassed(c.id) ? "Aprobada" : (isAvailable(c.id) ? "Disponible" : "Bloqueada");
  const prs      = (c.prereqs || []).map(x => `<span class="pill">${x}</span>`).join("") || "<span class='pill'>—</span>";
  const cos      = (c.coreqs  || []).map(x => `<span class="pill">${x}</span>`).join("") || "<span class='pill'>—</span>";
  const tagElect = electiveTag(c);

  panel.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div class="title-line"><b>${c.id}</b> — ${c.name} ${tagElect}</div>
      <div>${c.block || "—"} · ${c.credits ?? 0} cr · HT ${c.ht ?? "—"} · HP ${c.hp ?? "—"}</div>
      <div>Estado: <span class="pill">${status}</span></div>
      <div>Prerrequisitos: ${prs}</div>
      <div>Correquisitos: ${cos}</div>
      <div>
        ${
          isPassed(c.id)
            ? `<span class="muted">Ya aprobada</span>`
            : `<button class="btn" id="btnPassDetail" ${status !== "Disponible" ? "disabled" : ""}>Marcar aprobada</button>`
        }
      </div>
    </div>
  `;

  // Acción "Marcar aprobada" desde el detalle (si está habilitado)
  const btn = $("#btnPassDetail");
  if (btn) {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      let grade = prompt("Calificación (0–100):", "80");
      if (grade == null) return;
      grade = Number(grade);
      if (!Number.isFinite(grade) || grade < 0 || grade > 100) return;

      state.grades[c.id] = grade;
      state.passed.add(c.id);
      save();

      renderList();
      renderPlan();
      renderDetail(c.id);
      if (typeof updateKpis === "function") updateKpis();
    });
  }
}

//——— PLAN
//——— PLAN
function renderPlan() {
  const body = $("#planBody");
  if (!body) return;

  // Asegura que exista #planInfo (guard)
  let planInfo = $("#planInfo");
  if (!planInfo) {
    const tb = $("#plan .toolbar");
    if (tb) {
      planInfo = document.createElement("div");
      planInfo.id = "planInfo";
      planInfo.className = "hint";
      tb.appendChild(planInfo);
    }
  }

  const ids = [...state.plan]; // ids de materias en el plan
  const rowsHtml = ids.map((id) => {
    const c = byId(id);
    if (!c) return "";
    const secs = c.sections || [];
    const selCrn = state.selectedSections?.[id]?.crn || "";

    const opts = secs.length
      ? `<select data-id="${id}" class="secSel">
           <option value="">Elegir sección…</option>
           ${secs.map(s => `
             <option
               value="${s.crn}"
               ${String(s.crn) === String(selCrn) ? "selected" : ""}
               ${s.closed ? "disabled" : ""}
               title="${s.closed ? "Sección cerrada" : "Disponible"}"
             >
               ${s.crn || "(s/clave)"} — ${s.label}${s.room ? ` · ${s.room}` : ""}
             </option>
           `).join("")}
         </select>`
      : `<div class="muted">Sin secciones publicadas</div>`;

    return `
      <div class="plan-row" data-id="${id}">
        <div class="row-head">
        <div class="col name"><b>${c.id}</b> — ${c.name} ${electiveTag(c)}</div>
          <div class="meta">${c.credits || 0} créditos</div>
          <button class="link" data-act="rm" title="Quitar del plan">Quitar</button>
        </div>
        <div class="row-body">
          <div class="control">
            ${opts}
            <div id="hint-${id}" class="hint small"></div>
            
          </div>
        </div>
      </div>
    `;
  }).join("");
  
  body.innerHTML = rowsHtml || "<div class='muted'>No hay materias en el plan.</div>";

  // Botón quitar del plan
  body.querySelectorAll("[data-act='rm']").forEach((b) => {
    b.addEventListener("click", (e) => {
      const row = e.currentTarget.closest(".plan-row");
      if (!row) return;
      const cid = row.getAttribute("data-id");
      delete state.selectedSections?.[cid];
      state.plan.delete(cid);
      save();
      renderPlan();
    });
  });

  // Seleccionar sección + validar choques
  body.querySelectorAll(".secSel").forEach((sel) => {
    sel.addEventListener("change", () => {
      const cid  = sel.getAttribute("data-id");
      const c    = byId(cid);
      const secs = c?.sections || [];
      const hint = document.getElementById(`hint-${cid}`);
      const pick = secs.find((s) => String(s.crn) === String(sel.value));

      // Si no hay elección, limpia
      if (!pick) {
        if (state.selectedSections) delete state.selectedSections[cid];
        if (hint) hint.textContent = "";
        save();
        return;
      }

      // Marca cerrada (permitimos elegir pero avisamos)
      if (pick.closed && hint) {
        hint.textContent = "Sección cerrada";
      }

      // Chequear choques de horario con el resto de secciones elegidas del plan
      try {
        const chosen = Object.entries(state.selectedSections || {})
          .filter(([k]) => state.plan.has(k))            // solo materias del plan actual
          .map(([,s]) => s)
          .filter((s) => Array.isArray(s.slots) && s.slots.length > 0);

        // Reemplaza (o agrega) la del curso actual por la nueva selección
        const currentOthers = chosen.filter((s) => String(s.crn) !== String(pick.crn));
        const entries = [...currentOthers, pick];

        if (window.Schedule?.hasConflict(entries)) {
          if (hint) hint.textContent = "Choque de horario con otra sección del plan";
          // revertimos visualmente la selección
          sel.value = "";
          if (state.selectedSections) delete state.selectedSections[cid];
          save();
          return;
        }
      } catch (_) {
        // si Schedule no está disponible o falla, no bloqueamos la elección
      }

      // Guardar selección
      state.selectedSections = state.selectedSections || {};
      state.selectedSections[cid] = pick;
      if (hint) hint.textContent = "Sección guardada";
      save();
    });
  });

  // Totales de créditos y botón sugerir (IDs tolerantes)
  const used = ids.reduce((a, id) => a + (byId(id)?.credits || 0), 0);
  if (planInfo) planInfo.textContent = `Créditos planificados: ${used} / ${state.maxCredits}`;

  const btn = $("#btnSuggest") || $("#btnSuggestPlan");
  if (btn && !btn._bound) {
    btn._bound = true;
    btn.addEventListener("click", () => window.Planner?.suggestPlan());
  }
}

// —— Secciones públicas (repo)
async function fetchSectionsJSON(versionTag = "") {
  const url = `./data/medicine-2013-sections.json${versionTag ? `?v=${versionTag}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("sections 404");
  return res.json();
}

function normalizeCourseName(s){
  return String(s||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toUpperCase()
    .replace(/\s+/g," ")
    .trim();
}

//function keyOfSec(s){ return `${s.crn||""}|${s.label||""}|${s.room||""}`; }

function normalizeSectionSlots(sec) {
  if (!Array.isArray(sec.slots)) return;
  for (const s of sec.slots) {
    if (typeof s.start === "number" && typeof s.end === "number" && s.end < s.start) {
      const t = s.start; s.start = s.end; s.end = t; // invierte si venían al revés
    }
    if (s.day === "X") s.day = "MI"; // alias común
  }
}

function keyOfSec(s){ return `${s.crn||""}|${s.label||""}|${s.room||""}`; }

function mergeSections(dataset, sectionsDoc, { overwrite = false } = {}) {
  if (!sectionsDoc?.courses) return;

  const byId    = new Map(dataset.courses.map(c => [c.id, c]));
  const byNameN = new Map(dataset.courses.map(c => [normalizeCourseName(c.name), c]));

  for (const entry of sectionsDoc.courses) {
    const target =
      (entry.id && byId.get(entry.id)) ||
      (entry.name && byNameN.get(normalizeCourseName(entry.name)));

    if (!target) continue;

    const incoming = Array.isArray(entry.sections) ? entry.sections : [];
for (const s of incoming) normalizeSectionSlots(s);

if (overwrite || !Array.isArray(target.sections) || target.sections.length === 0) {
  target.sections = incoming;
} else {
  const base = target.sections || [];
  for (const s of base) normalizeSectionSlots(s);

  const map = new Map(base.map(s => [keyOfSec(s), s]));
  for (const s of incoming) map.set(keyOfSec(s), s);
  target.sections = [...map.values()];
    }
  }
}


async function reloadSections(versionTag = "", opts = { overwrite: true, notify: false }) {
  try {
    const doc = await fetchSectionsJSON(versionTag);
    mergeSections(state.dataset, doc, { overwrite: !!opts.overwrite });
    saveDataset();            // cache local último conocido
    rebuildIndexes();         // re-indexa deps/ids
    renderList(); renderPlan();
    if (opts.notify) alert("Datos de secciones actualizados.");
  } catch (e) {
    if (opts.notify) alert("No se pudo actualizar las secciones (offline o archivo no publicado).");
    console.warn("No se pudo actualizar secciones:", e);
  }
}

//——— Vista
function showView(id){
  ["#graph","#list","#plan"].map($).forEach(el => { if (el) el.hidden = true; });
  const target = $("#"+id);
  if (target) target.hidden = false;

  document.body.classList.toggle("plan-focus", id === "plan");

  // Si en el futuro vuelves a habilitar la malla, no rompe
  if (id === "graph" && window.Graph && document.getElementById("graph")) {
    if (!window.App.cy) {
      window.Graph.initGraph();
      setTimeout(()=> window.App.cy && window.App.cy.resize(), 0);
    } else {
      window.App.cy.resize();
    }
  }
}

//——— Admin UI
function injectAdminButton(){
  if (!isAdmin) return;
  const panel = document.querySelectorAll(".panel")[0];
  if (!panel) return;

  const box = document.createElement("div");
  box.className = "section";
  box.innerHTML = `
    <div class="section">Admin</div>

    <div class="buttons" style="gap:8px;flex-wrap:wrap;align-items:center">
      <label>Materia:
        <select id="selCourseAdmin"></select>
      </label>
      <label><input type="radio" name="modeSecs" id="modeReplace" checked> Reemplazar</label>
      <label><input type="radio" name="modeSecs" id="modeMerge"> Mezclar</label>
    </div>

    <div class="buttons" style="gap:8px;flex-wrap:wrap">
      <button id="btnPasteSchedules">Pegar horarios (admin)</button>
      <button id="btnExportSections">Exportar secciones (repo)</button>
      <button id="btnRefreshSections">Actualizar datos (repo)</button>
    </div>

    <div id="adminSecs" class="section"></div>
  `;
  panel.appendChild(box);

  // Llenar combo materias
  const selC = document.getElementById("selCourseAdmin");
  selC.innerHTML = (state.dataset.courses || [])
    .map(c => `<option value="${c.id}">${c.id} — ${c.name}</option>`)
    .join("");

  // Render de secciones + borrar
  function renderAdminSectionsUI(){
    const cid = selC.value;
    const c   = byId(cid);
    const box = document.getElementById("adminSecs");
    if (!box || !c) return;
    const secs = c.sections || [];

    box.innerHTML = secs.length ? `
      <div class="section">Secciones actuales</div>
      ${secs.map((s,i)=>`
        <div class="list-item">
          <div>
            <b>${s.crn || "(s/clave)"}</b> — ${s.label}${s.room ? " · "+s.room : ""}
            ${s.closed ? '<span class="pill" style="background:#6b7280">Cerrado</span>' : ""}
          </div>
          <button data-i="${i}" data-act="delSec">Eliminar</button>
        </div>
      `).join("")}
      <button id="btnClearSecs" class="danger">Vaciar todas</button>
    ` : `<div class="muted">Sin secciones cargadas</div>`;

    // eliminar una
    box.querySelectorAll('[data-act="delSec"]').forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const i = Number(btn.dataset.i);
        c.sections.splice(i,1);
        if (state.selectedSections[cid] &&
            !(c.sections||[]).some(x => String(x.crn)===String(state.selectedSections[cid].crn))) {
          delete state.selectedSections[cid];
        }
        saveDataset(); save(); renderPlan(); renderAdminSectionsUI();
      });
    });

    // vaciar todas
    const clear = document.getElementById("btnClearSecs");
    if (clear) clear.addEventListener("click", ()=>{
      c.sections = [];
      delete state.selectedSections[cid];
      saveDataset(); save(); renderPlan(); renderAdminSectionsUI();
    });
  }
  selC.addEventListener("change", renderAdminSectionsUI);
  renderAdminSectionsUI();

  // ——— Pegar horarios (admin)
  document.getElementById("btnPasteSchedules").onclick = ()=>{
    const raw = prompt("Pega aquí las secciones (una o varias, con o sin saltos de línea)");
    if (!raw) return;

    const cid = selC.value;
    const course = byId(cid);
    if (!course) { alert("Elige una materia destino."); return; }

    const modeReplace = document.getElementById("modeReplace")?.checked;

    const parsed = window.Schedule.parsePastedSchedules(raw);
    const secs = Array.isArray(parsed) ? parsed : Object.values(parsed||{}).flat();
    if (!secs.length) { alert("No se detectaron secciones."); return; }

    const keyOfSec = (s)=>`${s.crn||""}|${s.label||""}|${s.room||""}`;
    const map = new Map();
    const base = modeReplace ? [] : (course.sections || []);
    for (const s of base) map.set(keyOfSec(s), s);
    for (const s of secs) map.set(keyOfSec(s), s);
    course.sections = [...map.values()];

    saveDataset(); rebuildIndexes(); renderPlan(); renderAdminSectionsUI();
    alert(`${modeReplace ? "Reemplazadas" : "Agregadas"} ${secs.length} secciones en ${course.id}.`);
  };

  // ——— Exportar SOLO secciones (para subir al repo)
  document.getElementById("btnExportSections").onclick = ()=>{
    const payload = {
      courses: state.dataset.courses
        .filter(c => Array.isArray(c.sections) && c.sections.length)
        .map(c => ({ id: c.id, sections: c.sections }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "medicine-2013-sections.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ——— Importar/Reimportar datos (repo) con semilla/sobrescribir
  function wasSeeded(){ return localStorage.getItem("sections-seeded-v1")==="1"; }
  function markSeeded(){ localStorage.setItem("sections-seeded-v1","1"); }

  const btnRefresh = document.getElementById("btnRefreshSections");
  const setLabel = () => {
    btnRefresh.textContent = wasSeeded()
      ? "Actualizar datos (repo)"   // mismo texto siempre; si prefieres, cambia al gusto
      : "Actualizar datos (repo)";
  };
  setLabel();

  btnRefresh.onclick = async ()=>{
    const overwrite = wasSeeded()
      ? confirm("¿Sobrescribir secciones existentes con las del repo?")
      : false;
    await reloadSections(Date.now().toString(), { overwrite, notify: true });
    if (!wasSeeded()) markSeeded();
    setLabel();
  };
}

//——— Utils dataset local/override
function normalizeName(s){
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/\s+/g," ").trim();
}
function saveDataset(){
  localStorage.setItem("medicina-dataset", JSON.stringify(state.dataset));
}
function loadDatasetOverride(){
  const raw = localStorage.getItem("medicina-dataset");
  if (!raw) return false;
  try { state.dataset = JSON.parse(raw); return true; } catch { return false; }
}

state.selectedSections = {}; // { courseId: sectionObj }

//——— Boot
async function boot() { 
  load();

  // 1) Carga pensum (network-first)
  try {
    const res = await fetch(`./data/medicine-2013.json?v=${Date.now()}`, { cache: "no-store" });
    state.dataset = await res.json();
    console.log("PENSUM cargado:", state.dataset?.courses?.length, "cursos");
  } catch (e) {
    console.error("Dataset no disponible:", e);
    state.dataset = { program: "VACÍO", courses: [] };
  }

  // 2) Overrides locales (admin)
  if (typeof loadDatasetOverride === "function") loadDatasetOverride();

  // 3) HOTFIX: electivas del 11 (BÁSICAS)  ← AQUÍ, después de tener dataset
  (function hotfixElectivas11(){
    if (!state?.dataset?.courses) return;
    const ELEC11 = ["MED-941","MED-943","MED-956","MED-984","MED-988","MED-963"];
    const touched = [];
    for (const id of ELEC11) {
      const c = state.dataset.courses.find(x => x.id === id || x.code === id);
      if (!c) continue;
      let changed = false;
      if (String(c.cuatrimestre) !== "11") { c.cuatrimestre = "11"; changed = true; }
      if (!c.is_elective) { c.is_elective = true; changed = true; }
      if (!c.elective_group) { c.elective_group = "BASICAS"; changed = true; }
      if (changed) touched.push(id);
    }
    if (touched.length) console.log("HOTFIX electivas 11 aplicado a:", touched);
  })();

  // 4) Mezcla secciones públicas
  await reloadSections("", { overwrite: true, notify: false });

  // 5) Fallback de elective_group tras tener dataset final
  for (const c of state.dataset.courses) {
    if (c.is_elective && !c.elective_group) {
      const g = CONFIG.ELECTIVE_FALLBACK_BY_AREA?.[String(c.area || "").toUpperCase()];
      if (g) c.elective_group = g;
    }
  }

  // 6) Índices y primer render
  rebuildIndexes();
  renderList();
  renderPlan();
  setKPIs();
  showView("list");
}

  // 6) Panel admin y enlaces UI
  injectAdminButton?.();
  $("#inpMaxCredits").value = state.maxCredits;
  $on($("#inpMaxCredits"), "change", e=>{
    state.maxCredits = Math.max(8, Math.min(30, Number(e.target.value)||CONFIG.DEFAULT_MAX_CREDITS));
    save(); renderPlan();
  });

  // Escala fija numérica (oculta selector)
  state.scaleMode = "numeric";
  const sel = document.getElementById("selScale");
  if (sel) {
    sel.value = "numeric";
    sel.disabled = true;
    const lbl = sel.closest("label"); if (lbl) lbl.style.display = "none";
  }

  // Oculta importar y ajusta exportación CSV
  const btnImp = $("#btnImportProgress"); if (btnImp) btnImp.style.display = "none";
  const fileImp = $("#fileProgress");     if (fileImp) fileImp.remove();
  const btnExp = $("#btnExportProgress");
  if (btnExp) {
    btnExp.textContent = "Exportar aprobadas (.csv)";
    btnExp.onclick = () => {
      const rows = state.dataset.courses
        .filter(c => state.passed.has(c.id))
        .map(c => `${c.id},"${c.name.replace(/"/g,'""')}",${c.credits}`);
      const csv = "id,nombre,creditos\n" + rows.join("\n");
      const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aprobadas.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  // Navegación
$on($("#btnViewList"), "click", () => showView("list"));
$on($("#btnViewPlan"), "click", () => showView("plan"));



  // SW (raíz)
  if ((location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")
      && "serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("./sw.js"); } catch {}
  }

  // Grafo on-demand (si lo habilitas)
  if (window.Graph && document.getElementById("graph")) {
    // window.Graph.initGraph();
  }

boot();

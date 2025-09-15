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
const qEl = $("#q");                // o $("#inpSearch") si usas ese id
if (qEl) $on(qEl, "input", renderList);


// Disponibilidad: todos los prereqs aprobados
function isAvailable(id) {
  const c = byId(id);
  if (!c) return false;
  const prs = (c.prereqs || []);
  for (const p of prs) if (!state.passed.has(p)) return false;
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
    const paintBlock = (arr, blockTitle=null) => {
      const ul = document.createElement("div");
      ul.className = "list-block";
      if (blockTitle) {
        const sub = document.createElement("div");
        sub.className = "subhead";
        sub.textContent = blockTitle;
        ul.appendChild(sub);
      }
      for (const c of arr) {
        if (q && !(c.name.toLowerCase().includes(q) || String(c.id).toLowerCase().includes(q))) continue;
        if (f !== "all") {
          if (f === "passed" && !state.passed.has(c.id)) continue;
          if (f === "available" && !isAvailable(c.id)) continue;
          if (f === "blocked" && isAvailable(c.id)) continue;
        }

        const item = document.createElement("div");
        item.className = "list-item";
        item.setAttribute("data-id", c.id);
        const eg = course.is_elective ? groupFrom(course) : null;
        const tagElect = eg ? `<span class="tag tag-elec">${CONFIG.ELECTIVE_TITLES[eg] || "Electiva"}</span>` : "";
        const status = isPassed(c.id) ? "Aprobada" : (isAvailable(c.id) ? "Disponible" : "Bloqueada");

        item.innerHTML = `
          <div class="li-left">
            <div><b>${c.id}</b> — ${c.name} ${tagElect}</div>
            <div class="muted">${(c.block||c.area||"").toString()} · ${c.credits} cr · HT ${c.ht??"—"} · HP ${c.hp??"—"}</div>
          </div>
          <div class="li-right">
            <span class="pill">${status}</span>
            ${isPassed(c.id) ? 
              `<button class="btn-unpass">Desaprobar</button>` :
              `<button class="btn-pass"${isAvailable(c.id) ? "" : " disabled title='Completa los prerrequisitos'"}>Marcar aprobada</button>`}
          </div>
        `;
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
  const c = byId(id);
  if (!c) { $("#detail").textContent = "Selecciona una materia…"; return; }

  const status = isPassed(id) ? "Aprobada" : (isAvailable(id) ? "Disponible" : "Bloqueada");
  const prs = (c.prereqs || []).map(x=>`<span class="pill">${x}</span>`).join("") || "<span class='pill'>—</span>";
  const cos = (c.coreqs  || []).map(x=>`<span class="pill">${x}</span>`).join("") || "<span class='pill'>—</span>";
  const grade = state.grades[id] ?? "";

  $("#detail").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div><b>${c.id}</b> — ${c.name}</div>
      <div>${c.block || "—"} · ${c.credits} cr · HT ${c.ht ?? "—"} · HP ${c.hp ?? "—"}</div>
      <div>Estado: <span class="pill">${status}</span></div>
      <div>Prerrequisitos: ${prs}</div>
      <div>Correquisitos: ${cos}</div>
      <div>
        Calificación:
        <input id="inpGrade" placeholder="Ej: 85 o A-" value="${grade}">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${isPassed(id)
          ? `<button id="btnUnpass">Desaprobar</button>`
          : (isAvailable(id)
              ? `<button id="btnPass">Marcar aprobada</button>`
              : `<button id="btnPass" disabled title="Completa los prerrequisitos">Marcar aprobada</button>`)}
        <button id="btnSaveGrade" class="ghost">Guardar calificación</button>
      </div>
    </div>
  `;

  $on($("#btnSaveGrade"), "click", ()=>{
    const v = $("#inpGrade").value.trim();
    if (v === "") delete state.grades[id];
    else state.grades[id] = v;
    save(); setKPIs();
  });

  const bp = $("#btnPass");
  if (bp) $on(bp, "click", ()=>{
    if (!isAvailable(id)) return;
    const needGrade = CONFIG.GPA?.REQUIRE_GRADE_ON_PASS;
    const v = ($("#inpGrade")?.value || "").trim();
    if (needGrade) {
      const n = Number(v);
      if (!v || Number.isNaN(n) || n < 0 || n > 100) {
        alert("Ingresa una calificación válida (0–100) antes de aprobar.");
        $("#inpGrade")?.focus(); return;
      }
      if (n < CONFIG.GPA.PASSING_MIN_NUMERIC) {
        alert(`No se aprueba con nota menor a ${CONFIG.GPA.PASSING_MIN_NUMERIC}.`);
        $("#inpGrade")?.focus(); return;
      }
      state.grades[id] = n;
    }
    setPassed(id, true);
  });

  const bu = $("#btnUnpass");
  if (bu) $on(bu, "click", ()=> setPassed(id,false));
}

//——— PLAN
function renderPlan() {
  const body = $("#planBody");
  if (!body) return;

  const ids = [...state.plan];
  const rows = ids.map(id => {
    const c = byId(id);
    if (!c) return "";
    const secs = c.sections || [];
    const sel = state.selectedSections[id]?.crn || "";
    const opts = secs.length
      ? `<select data-id="${id}" class="secSel">
           <option value="">Elegir sección…</option>
           ${secs.map(s => `
             <option
               value="${s.crn}"
               ${String(s.crn)===String(sel) ? "selected" : ""}
               ${s.closed ? "disabled" : ""}
               title="${s.closed ? "Sección cerrada" : "Disponible"}"
             >
               ${s.crn || "(s/clave)"} — ${s.label}${s.room ? " · "+s.room : ""}${s.closed ? " [Cerrado]" : ""}
             </option>`).join("")}
         </select>`
      : `<span class="muted">Sin horarios cargados</span>`;

    return `
      <div class="plan-row" data-id="${id}">
        <div class="col name"><b>${c.id}</b> — ${c.name}</div>
        <div class="col cr">${c.credits} cr <button data-act="rm">Quitar</button></div>
        <div class="col sec">
          ${opts} <span class="hint" id="hint-${id}"></span>
        </div>
      </div>
    `;
  }).join("");

  body.innerHTML = rows || "<div class='muted'>No hay materias en el plan.</div>";

  // Quitar del plan
  body.querySelectorAll("[data-act='rm']").forEach(b => {
    b.addEventListener("click", e => {
      const id = e.target.closest(".plan-row").getAttribute("data-id");
      delete state.selectedSections[id];
      state.plan.delete(id);
      save(); renderPlan();
    });
  });

  // Seleccionar sección + validar choques
  body.querySelectorAll(".secSel").forEach(sel => {
    sel.addEventListener("change", () => {
      const cid  = sel.getAttribute("data-id");
      const c    = byId(cid);
      const secs = c?.sections || [];
      const hint = document.getElementById(`hint-${cid}`);
      const pick = secs.find(s => String(s.crn) === String(sel.value));

      if (!pick) {
        delete state.selectedSections[cid];
        if (hint) hint.textContent = "";
        save();
        return;
      }

      // Cerrado
      if (pick?.closed) {
        alert("Esa sección está cerrada. Elige otra opción.");
        sel.value = state.selectedSections[cid]?.crn || "";
        if (hint) hint.textContent = "";
        return;
      }

      // Choques
      const tmp = { ...state.selectedSections, [cid]: pick };
      if (window.Schedule?.hasConflict(tmp)) {
        alert("Choque de horario con otra materia del plan. Elige otra sección.");
        sel.value = state.selectedSections[cid]?.crn || "";
        if (hint) hint.textContent = "";
        return;
      }

      state.selectedSections[cid] = pick;
      save();
      if (hint) hint.textContent = "Sección guardada";
    });
  });

  // Totales y botón sugerir
  const used = ids.reduce((a,id)=> a + (byId(id)?.credits || 0), 0);
  $("#planInfo").textContent = `Créditos planificados: ${used} / ${state.maxCredits}`;

  const btn = $("#btnSuggest");
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

    if (overwrite || !Array.isArray(target.sections) || target.sections.length === 0) {
      // sobrescribe o llena si no había nada
      target.sections = incoming;
    } else {
      // mezcla sin duplicar (por crn|label|room)
      const map = new Map((target.sections||[]).map(s => [keyOfSec(s), s]));
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
  for (const el of ["#graph","#list","#plan"].map($)) el.hidden = true;
  $("#"+id).hidden = false;

  // activa modo Plan (para que el CSS actúe)
  document.body.classList.toggle("plan-focus", id === "plan");

  if (id === "graph") {
    if (!window.App.cy && window.Graph) {
      window.Graph.initGraph();
      setTimeout(()=> window.App.cy && window.App.cy.resize(), 0);
    } else if (window.App.cy) {
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

  // 3) Mezcla secciones públicas del repo (silencioso)
  await reloadSections("", { overwrite: true, notify: false });

  // 4) Fallback de elective_group tras tener dataset final
  for (const c of state.dataset.courses) {
    if (c.is_elective && !c.elective_group) {
      const g = CONFIG.ELECTIVE_FALLBACK_BY_AREA?.[String(c.area || "").toUpperCase()];
      if (g) c.elective_group = g;
    }
  }

  // 5) Índices y primer render (ya definitivo)
  rebuildIndexes();
  renderList();
  renderPlan();
  setKPIs();
  showView("list");

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
  $on($("#btnViewGraph"), () => showView("graph"));
  $on($("#btnViewList"),  () => showView("list"));
  $on($("#btnViewPlan"),  () => showView("plan"));

  // SW (raíz)
  if ((location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")
      && "serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("./sw.js"); } catch {}
  }

  // Grafo on-demand (si lo habilitas)
  if (window.Graph && document.getElementById("graph")) {
    // window.Graph.initGraph();
  }
}

boot();

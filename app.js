// app.js — orquestador
import { CONFIG } from "./config.js";

const state = {
  dataset: null,
  passed: new Set(),
  grades: {},       // { id: "A" | 95 | ... }
  plan: new Set(),  // ids planificadas
  maxCredits: CONFIG.DEFAULT_MAX_CREDITS,
  scaleMode: CONFIG.GRADE_SCALE.mode
};

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

function byId(id){ return idx.get(id) || null }
function isPassed(id){ return state.passed.has(id) }

// Disponibilidad básica: todos los prereqs aprobados (las “puertas de bloque” las activamos cuando tengamos dataset final)
function isAvailable(id) {
  const c = byId(id);
  if (!c) return false;
  const prs = (c.prereqs || []);
  for (const p of prs) if (!state.passed.has(p)) return false;
  // TODO: puertas por bloque + electivas mínimas (cuando tengamos dataset curado completo)
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


//——— LISTA
function renderList(){
  const list = $("#listBody");
  const q = ($("#inpSearch")?.value || "").toLowerCase();
  const filter = $("#selFilter")?.value || "all";

  const all = state.dataset.courses.filter(c=>{
    const match = c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    if (!match) return false;
    if (filter === "passed")    return isPassed(c.id);
    if (filter === "available") return !isPassed(c.id) && isAvailable(c.id);
    if (filter === "blocked")   return !isPassed(c.id) && !isAvailable(c.id);
    return true;
  });

  // agrupa por cuatrimestre si existe c.term; si no, por block
  const keyOf = c => (c.term ?? c.cuatrimestre ?? c.block ?? "OTROS");
  const groups = {};
  for (const c of all) (groups[keyOf(c)] ??= []).push(c);

  const row = (c)=> {
    const status = isPassed(c.id) ? "Aprobada" : (isAvailable(c.id) ? "Disponible" : "Bloqueada");
    return `
      <div class="list-item" data-id="${c.id}">
        <div>
          <div><b>${c.id}</b> — ${c.name}</div>
          <div class="muted">${c.block || "—"} · ${c.credits} cr · <span class="pill">${status}</span></div>
        </div>
        <div>
          ${isPassed(c.id)
            ? `<button data-act="unpass" class="btn-unpass">Desaprobar</button>`
            : `<button data-act="pass" class="btn-pass">Marcar aprobada</button>`}
        </div>
      </div>
    `;
  };

  list.innerHTML = Object.entries(groups).map(([g, arr]) => `
    <h3 class="section">${g}</h3>
    ${arr.map(row).join("")}
  `).join("");

  // bindings igual que antes…
  list.querySelectorAll(".list-item").forEach(rowEl=>{
    rowEl.addEventListener("click", e=>{
      const id = rowEl.getAttribute("data-id");
      if (e.target.closest("button")) return;
      renderDetail(id);
    });
  });
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

  $("#inpSearch").oninput = renderList;
  $("#selFilter").onchange = renderList;
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
        <button id="btnAddPlan">Agregar al plan</button>
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
    if (bp) $on(bp, "click", ()=> {
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
  state.grades[id] = n; // guarda como número
}

    setPassed(id, true);
    });

    const bu = $("#btnUnpass");
  if (bu) $on(bu, "click", ()=> setPassed(id,false));

  $on($("#btnAddPlan"), "click", ()=>{
    // añade materia (y co-req no aprobados) si hay espacio
    const max = state.maxCredits;
    const pack = new Set([id, ...(c.coreqs||[]).filter(cid => !isPassed(cid))]);
    let need = 0;
    for (const pid of pack) {
      const pc = byId(pid); if (!pc || !isAvailable(pid)) { alert("No disponible (co-req o prerrequisitos)"); return; }
      if (!state.plan.has(pid)) need += (pc.credits || 0);
    }
    const used = [...state.plan].reduce((a, cid) => a + (byId(cid)?.credits||0), 0);
    if (used + need > max) { alert("Supera el tope de créditos del período"); return; }
    for (const pid of pack) state.plan.add(pid);
    save(); renderPlan();
  });
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
             <option value="${s.crn}" ${String(s.crn)===String(sel) ? "selected" : ""}>
               ${s.crn || "(sin clave)"} — ${s.label}${s.room ? " · "+s.room : ""}
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

      if (!pick) { // limpiar selección
        delete state.selectedSections[cid];
        if (hint) hint.textContent = "";
        save();
        return;
      }

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

//——— Boot
async function boot() {
  load();
  // carga dataset
  try {
    const res = await fetch("./data/medicine-2013.json");
    state.dataset = await res.json();
  } catch (e) {
    console.error("Dataset no disponible:", e);
    state.dataset = { program:"VACÍO", courses:[] };
  }
  // permite que un dataset con secciones persista localmente (admin)
    loadDatasetOverride();
    injectAdminButton();
  // índices
  idx.clear(); deps.clear(); revDeps.clear();
  for (const c of state.dataset.courses) {
    idx.set(c.id, c);
    deps.set(c.id, [...(c.prereqs || [])]);
    for (const p of (c.prereqs || [])) {
      if (!revDeps.has(p)) revDeps.set(p, []);
      revDeps.get(p).push(c.id);
    }
  }
  // enlaza UI base
  $("#inpMaxCredits").value = state.maxCredits;
  $on($("#inpMaxCredits"), "change", e=>{
    state.maxCredits = Math.max(8, Math.min(30, Number(e.target.value)||CONFIG.DEFAULT_MAX_CREDITS));
    save(); renderPlan();
  });
  $("#selScale").value = state.scaleMode;
  $on($("#selScale"), "change", e=>{
    state.scaleMode = e.target.value;
    save(); setKPIs();
  });
  // Fijamos escala numérica y ocultamos el selector
// Fijamos escala numérica y ocultamos el selector
state.scaleMode = "numeric";
const sel = document.getElementById("selScale");
if (sel) {
  sel.value = "numeric";
  sel.disabled = true;
  const lbl = sel.closest("label");
  if (lbl) lbl.style.display = "none";
}
// Oculta importar
const btnImp = $("#btnImportProgress");
const fileImp = $("#fileProgress");
if (btnImp) btnImp.style.display = "none";
if (fileImp) fileImp.remove();

// Exportar aprobadas (CSV)
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

  $on($("#btnViewGraph"), "click", ()=>showView("graph"));
  $on($("#btnViewList"),  "click", ()=>showView("list"));
  $on($("#btnViewPlan"),  "click", ()=>showView("plan"));

  // render inicial
  setKPIs();
  renderList();
  renderPlan();
  showView("list");

  // init grafo (cuando Cytoscape esté listo)
  if (window.Graph && document.getElementById("graph")) {
    //window.Graph.initGraph();
  }

  // registra SW (solo https/localhost)
  if ((location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")
      && "serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("./pwa/sw.js"); } catch {}
  }
}

function showView(id){
  for (const el of ["#graph","#list","#plan"].map($)) el.hidden = true;
  $("#"+id).hidden = false;

  if (id === "graph") {
    if (!window.App.cy && window.Graph) {
      window.Graph.initGraph();
      setTimeout(()=> window.App.cy && window.App.cy.resize(), 0);
    } else if (window.App.cy) {
      window.App.cy.resize();
    }
  }
}

const isAdmin = new URL(location.href).searchParams.get("admin") === CONFIG.ADMIN_KEY;

function injectAdminButton(){
  if (!isAdmin) return;
  const panel = document.querySelectorAll(".panel")[0];
  const box = document.createElement("div");
  box.className = "section";
  box.innerHTML = `
    <div class="section">Admin (oculto)</div>
    <div class="buttons">
      <button id="btnPasteSchedules">Pegar horarios (admin)</button>
      <button id="btnExportDataset">Exportar dataset</button>
    </div>
  `;
  panel.appendChild(box);

  document.getElementById("btnPasteSchedules").onclick = async ()=>{
    const raw = prompt("Pega aquí el bloque de horarios (texto plano)");
    if (!raw) return;
  const map = window.Schedule.parsePastedSchedules(raw);
let attached = 0;
const unmatched = new Set(Object.keys(map));

const courses = state.dataset.courses.map(c => ({ c, key: normalizeName(c.name) }));

for (const { c, key } of courses) {
  let arr = map[key];

  // Fallback 1: busca clave que contenga nuestro key
  if (!arr) {
    const hit = [...unmatched].find(k => k.includes(key));
    if (hit) arr = map[hit];
  }
  // Fallback 2: busca clave incluida dentro de nuestro key
  if (!arr) {
    const hit = [...unmatched].find(k => key.includes(k));
    if (hit) arr = map[hit];
  }

  if (arr && arr.length) {
    c.sections = arr;
    attached++;
    unmatched.delete(key);
  }
}

saveDataset();
alert(`Secciones adjuntadas a ${attached} materias.` + (unmatched.size ? `\nNo hubo coincidencia para:\n- ${[...unmatched].join("\n- ")}` : ""));
renderPlan(); // para que aparezcan selectores
  };

  document.getElementById("btnExportDataset").onclick = ()=>{
    const blob = new Blob([JSON.stringify(state.dataset, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "medicine-2013-with-sections.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

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

boot();

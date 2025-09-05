import { CONFIG } from "./config.js";

const state = {
  dataset: null,
  passed: new Set(),
  grades: {}, // { id: "A" | 95 | ... }
  plan: new Set(),
  maxCredits: CONFIG.DEFAULT_MAX_CREDITS,
  scaleMode: CONFIG.GRADE_SCALE.mode
};

// ——— Helpers de storage
const LSKEY = "medicina-progress";
function save() {
  localStorage.setItem(LSKEY, JSON.stringify({
    passed: [...state.passed],
    grades: state.grades,
    plan: [...state.plan],
    maxCredits: state.maxCredits,
    scaleMode: state.scaleMode
  }));
}
function load() {
  const raw = localStorage.getItem(LSKEY);
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    state.passed = new Set(obj.passed || []);
    state.grades = obj.grades || {};
    state.plan = new Set(obj.plan || []);
    state.maxCredits = obj.maxCredits || CONFIG.DEFAULT_MAX_CREDITS;
    state.scaleMode = obj.scaleMode || CONFIG.GRADE_SCALE.mode;
  } catch {}
}

// ——— UI mínimos
function $(sel){ return document.querySelector(sel) }
function setKPIs() {
  if (!state.dataset) return;
  const total = state.dataset.courses.reduce((a,c)=>a+(c.credits||0),0);
  const earned = state.dataset.courses.filter(c=>state.passed.has(c.id)).reduce((a,c)=>a+(c.credits||0),0);
  $("#kpiCredits").textContent = `${earned} / ${total}`;
  $("#kpiProgress").textContent = total ? `${Math.round(earned/total*100)}%` : "0%";
  $("#kpiGPA").textContent = "—"; // luego lo llenaremos con gpa.js
}

function bindBasics() {
  $("#inpMaxCredits").value = state.maxCredits;
  $("#inpMaxCredits").addEventListener("change", e => {
    state.maxCredits = Math.max(8, Math.min(30, Number(e.target.value)||CONFIG.DEFAULT_MAX_CREDITS));
    save();
  });
  $("#selScale").value = state.scaleMode;
  $("#selScale").addEventListener("change", e => {
    state.scaleMode = e.target.value;
    save();
  });

  $("#btnExportProgress").addEventListener("click", () => {
    const blob = new Blob([localStorage.getItem(LSKEY) ?? "{}"], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "progreso_medicina.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("#btnImportProgress").addEventListener("click", ()=> $("#fileProgress").click());
  $("#fileProgress").addEventListener("change", e => {
    const f = e.target.files?.[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        localStorage.setItem(LSKEY, ev.target.result);
        load(); setKPIs(); alert("Progreso importado.");
      } catch { alert("Archivo inválido."); }
    };
    r.readAsText(f);
    e.target.value = "";
  });

  $("#btnViewGraph").onclick = ()=>showView("graph");
  $("#btnViewList").onclick = ()=>showView("list");
  $("#btnViewPlan").onclick = ()=>showView("plan");
}

function showView(id){
  for (const el of ["#graph","#list","#plan"].map($)) el.hidden = true;
  $("#"+id).hidden = false;
}

// ——— Carga dataset y arranque
async function boot() {
  load();
  document.title = CONFIG.TITLE;
  try {
    const res = await fetch("./data/medicine-2013.json");
    state.dataset = await res.json();
  } catch (e) {
    console.error("No se pudo cargar dataset:", e);
    state.dataset = { program:"VACÍO", courses:[] };
  }

  bindBasics();
  setKPIs();

  // por defecto abre Lista
  showView("list");
  renderList();

  // registra SW si hay HTTPS o localhost
  if ((location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")
      && "serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./pwa/sw.js");
    } catch (e) {
      console.warn("SW no registrado:", e);
    }
  }
}

// ——— Lista simple temporal (luego la reemplazamos)
function renderList(){
  const list = $("#listBody");
  const q = ($("#inpSearch")?.value || "").toLowerCase();
  const filter = $("#selFilter")?.value || "all";
  const items = (state.dataset?.courses || []).filter(c=>{
    const match = c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    if (!match) return false;
    if (filter === "passed") return state.passed.has(c.id);
    if (filter === "available") return !state.passed.has(c.id); // placeholder hasta meter lógica real
    if (filter === "blocked") return false; // placeholder
    return true;
  });

  list.innerHTML = items.map(c=>`
    <div class="list-item">
      <div>
        <div><b>${c.id}</b> — ${c.name}</div>
        <div class="muted">${c.block} · ${c.credits} cr</div>
      </div>
      <div>
        ${state.passed.has(c.id)
          ? `<button data-id="${c.id}" class="btn-unpass">Desaprobar</button>`
          : `<button data-id="${c.id}" class="btn-pass">Marcar aprobada</button>`}
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".btn-pass").forEach(b=>b.addEventListener("click", e=>{
    const id = e.target.getAttribute("data-id");
    state.passed.add(id); save(); setKPIs(); renderList();
  }));
  list.querySelectorAll(".btn-unpass").forEach(b=>b.addEventListener("click", e=>{
    const id = e.target.getAttribute("data-id");
    state.passed.delete(id); save(); setKPIs(); renderList();
  }));

  $("#inpSearch").oninput = renderList;
  $("#selFilter").onchange = renderList;
}

boot();

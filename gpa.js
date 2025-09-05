// gpa.js — cálculo de GPA ponderado por créditos
import { CONFIG } from "./config.js";

function toGPA(value, mode = CONFIG.GRADE_SCALE.mode) {
  if (mode === "letters") {
    const map = CONFIG.GRADE_SCALE.letters;
    const v = String(value || "").toUpperCase().trim();
    return map[v] ?? null;
  }
  // numérica 0–100
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  const bands = CONFIG.GRADE_SCALE.numeric;
  for (const b of bands) {
    if (num >= b.min) return b.gpa;
  }
  return 0.0;
}

function calcGPA(courses, grades, mode = CONFIG.GRADE_SCALE.mode) {
  let pts = 0, cr = 0;
  for (const c of courses) {
    const g = grades[c.id];
    if (g == null || g === "") continue;
    const gp = toGPA(g, mode);
    if (gp == null) continue;
    pts += gp * (c.credits || 0);
    cr  += (c.credits || 0);
  }
  return cr ? (pts / cr) : null;
}

// Exponemos en window para que app.js lo use sin imports circulares
window.GPA = { calc: calcGPA, toGPA };
export {};

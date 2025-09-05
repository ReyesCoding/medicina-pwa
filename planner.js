// planner.js — planificador simple con tope de créditos y co-req
function coursePriority(id) {
  // Heurística: más dependientes = más prioridad
  const A = window.App;
  const deps = A.revDeps.get(id) || [];
  return -(deps.length);
}

function suggestPlan() {
  const A = window.App;
  const { dataset, maxCredits } = A.state;
  const avail = dataset.courses
    .filter(c => !A.isPassed(c.id) && A.isAvailable(c.id))
    .sort((a, b) => coursePriority(a.id) - coursePriority(b.id));

  const plan = new Set();
  let credits = 0;

  for (const c of avail) {
    if (plan.has(c.id) || A.isPassed(c.id)) continue;

    // paquete co-reqs (si alguno bloqueado, saltar)
    const pack = new Set([c.id, ...(c.coreqs || []).filter(id => !A.isPassed(id))]);
    // verifica disponibilidad de todos en el paquete
    let ok = true;
    let packCredits = 0;
    for (const pid of pack) {
      const pc = A.byId(pid);
      if (!pc) { ok = false; break; }
      if (pid !== c.id && !A.isAvailable(pid)) { ok = false; break; }
      packCredits += (pc.credits || 0);
    }
    if (!ok) continue;
    if (credits + packCredits > maxCredits) continue;

    // añade el paquete
    for (const pid of pack) plan.add(pid);
    credits += packCredits;
    if (credits >= maxCredits) break;
  }

  // aplica
  A.state.plan = plan;
  A.save();
  A.renderPlan();
}

window.Planner = { suggestPlan };
export {};

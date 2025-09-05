// graph.js — malla de prerrequisitos con Cytoscape
function statusColor(id) {
  const A = window.App;
  if (A.isPassed(id)) return getCssVar("--passed");
  return A.isAvailable(id) ? getCssVar("--available") : getCssVar("--blocked");
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function buildElements(ds) {
  const nodes = ds.courses.map(c => ({
    data: { id: c.id, label: `${c.id}\n${c.name}`, credits: c.credits }
  }));
  const edges = [];
  for (const c of ds.courses) {
    for (const p of (c.prereqs || [])) {
      edges.push({ data: { id: `e_${p}_${c.id}`, source: p, target: c.id, type: "pr" } });
    }
  }
  // coreqs (estilo dashed, no flecha)
  for (const c of ds.courses) {
    for (const co of (c.coreqs || [])) {
      const id1 = `c_${c.id}_${co}`, id2 = `c_${co}_${c.id}`;
      if (!edges.some(e => e.data.id === id1 || e.data.id === id2)) {
        edges.push({ data: { id: id1, source: c.id, target: co, type: "co" } });
      }
    }
  }
  return { nodes, edges };
}

function initGraph() {
  const { dataset } = window.App.state;
  const { nodes, edges } = buildElements(dataset);
  const cy = cytoscape({
    container: document.getElementById("graph"),
    elements: { nodes, edges },
    layout: { name: "breadthfirst", directed: true, padding: 20, spacingFactor: 1.15 },
    style: [
      { selector: "node", style: {
        "background-color": node => statusColor(node.id()),
        "label": "data(label)",
        "text-wrap": "wrap", "text-max-width": 140, "text-valign": "center", "text-halign": "center",
        "color": "#e8edff", "font-size": 11, "font-weight": 700,
        "width": 64, "height": 64, "border-width": 2, "border-color": "#2a2f56"
      }},
      { selector: "edge[type = 'pr']", style: {
        "width": 2, "line-color": "#41509c", "target-arrow-shape": "triangle", "target-arrow-color": "#41509c", "curve-style": "bezier"
      }},
      { selector: "edge[type = 'co']", style: {
        "line-style": "dashed", "target-arrow-shape": "none", "source-arrow-shape": "none", "line-color": "#5864a6", "width": 2
      }},
      { selector: ".selected", style: { "border-width": 4, "border-color": getCssVar("--accent") } }
    ]
  });

  cy.on("tap", "node", evt => {
    cy.elements().removeClass("selected");
    const n = evt.target;
    n.addClass("selected");
    window.App.renderDetail(n.id());
  });

  window.App.cy = cy;
  refreshGraphColors();
}

function refreshGraphColors() {
  const cy = window.App.cy;
  if (!cy) return;
  cy.nodes().forEach(n => n.style("background-color", statusColor(n.id())));
}

window.Graph = { initGraph, refreshGraphColors };
export {};

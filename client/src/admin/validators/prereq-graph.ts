// Detecta ciclos en un grafo dirigido (curso -> prerequisitos) sin usar iteradores ES2015+.
export function hasCycle(edges: Array<[string, string]>): boolean {
  // Construir lista de vecinos con objetos/arrays (evitamos Map/for-of)
  const adj: Record<string, string[]> = {};

  for (let i = 0; i < edges.length; i++) {
    const from = edges[i][0];
    const to = edges[i][1];
    if (!adj[from]) adj[from] = [];
    adj[from].push(to);
    if (!adj[to]) adj[to] = [];
  }

  // 0=WHITE,1=GRAY,2=BLACK
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color: Record<string, number> = {};
  const nodes = Object.keys(adj);
  for (let i = 0; i < nodes.length; i++) {
    color[nodes[i]] = WHITE;
  }

  const dfs = (u: string): boolean => {
    color[u] = GRAY;
    const nbrs = adj[u] || [];
    for (let i = 0; i < nbrs.length; i++) {
      const v = nbrs[i];
      const c = color[v];
      if (c === GRAY) return true;           // ciclo
      if (c === WHITE && dfs(v)) return true;
    }
    color[u] = BLACK;
    return false;
  };

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (color[n] === WHITE && dfs(n)) return true;
  }
  return false;
}

// Construye edges desde los cursos (id -> cada prereq)
export function buildPrereqEdges(
  courses: Array<{ id: string; prerequisites?: string[] }>
): Array<[string, string]> {
  const edges: Array<[string, string]> = [];
  for (let i = 0; i < courses.length; i++) {
    const c = courses[i];
    const pre = c.prerequisites || [];
    for (let j = 0; j < pre.length; j++) {
      edges.push([c.id, pre[j]]);
    }
  }
  return edges;
}

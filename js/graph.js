// 图模型：把 topic 里的 solves / causedBy 变成边，并计算自动布局。不碰 DOM。
(() => {
  const { config } = WT;

  /**
   * @returns {{topic, nodes, byId, edges, parentsOf(id), childrenOf(id), related(id)}}
   * 边方向永远是 左 → 右：
   *   problem → solution  (kind "solves")：这个方案解决了这个问题
   *   solution → problem  (kind "causes")：这个问题是这个方案带来的
   */
  function build(topic) {
    const nodes = topic.nodes;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edges = [];
    for (const n of nodes) {
      const isSolution = n.type === "solution";
      for (const from of (isSolution ? n.solves : n.causedBy) || []) {
        edges.push({ from, to: n.id, kind: isSolution ? "solves" : "causes" });
      }
    }
    const parents = new Map(nodes.map((n) => [n.id, []]));
    const children = new Map(nodes.map((n) => [n.id, []]));
    for (const e of edges) { parents.get(e.to).push(e.from); children.get(e.from).push(e.to); }

    return {
      topic, nodes, byId, edges,
      parentsOf: (id) => parents.get(id),
      childrenOf: (id) => children.get(id),
      related: (id) => new Set([id, ...parents.get(id), ...children.get(id)])
    };
  }

  /**
   * 自动布局：列 = 最长路径深度；列内按父节点平均 y 排序，再向下避让重叠。
   * @param heightOf (id) => 该节点的实际渲染高度
   * @returns {Object<string,{x:number,y:number}>} 左上角坐标
   */
  function autoLayout(graph, heightOf) {
    const depth = new Map();
    const depthOf = (id) => {
      if (!depth.has(id)) {
        const ps = graph.parentsOf(id);
        depth.set(id, ps.length ? 1 + Math.max(...ps.map(depthOf)) : 0);
      }
      return depth.get(id);
    };
    const columns = [];
    graph.nodes.forEach((n) => (columns[depthOf(n.id)] ||= []).push(n));

    const centerY = new Map();
    const result = {};
    const average = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;

    columns.forEach((col, ci) => {
      const wanted = col
        .map((n, i) => ({ n, i, y: graph.parentsOf(n.id).length ? average(graph.parentsOf(n.id).map((p) => centerY.get(p))) : i * 200 }))
        .sort((a, b) => a.y - b.y || a.i - b.i);
      let bottom = -Infinity;
      for (const { n, y } of wanted) {
        const h = heightOf(n.id);
        const top = Math.max(y - h / 2, bottom + config.gapY);
        centerY.set(n.id, top + h / 2);
        bottom = top + h;
        result[n.id] = { x: ci * (config.nodeWidth + config.gapX), y: top };
      }
    });
    return result;
  }

  WT.Graph = { build, autoLayout };
})();

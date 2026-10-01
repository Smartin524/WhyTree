// 入口：持有共享状态，把画布、面板、工具栏串起来。
(() => {
  const { $, store } = WT;
  const topics = window.WHYTREE_TOPICS;
  const concepts = window.WHYTREE_CONCEPTS || {};

  // ---------- 共享状态（只有 main.js 会修改它的持久化部分） ----------
  const state = {
    graph: null,
    notes: {},               // 笔记（持久化）
    collapsed: new Set(),
    revealed: new Set(),     // 回忆模式下已揭晓的方案
    selected: null,
    recall: false
  };
  const persist = {
    notes: () => store.set(state.graph.topic.id + ".notes", state.notes)
  };

  // ---------- 面板 / 画布 ----------
  const panel = WT.Panel(state, topics, concepts, {
    onGo: goTo,
    onClose: () => select(null),
    onNote(id, text) { state.notes[id] = text; persist.notes(); },
    onResize: () => canvas?.updateSize()
  });

  const canvas = WT.Canvas(state, {
    getInset: () => (panel.isOpen() ? panel.width() : 0),
    onNodeClick: activate,
    onBackgroundClick: () => select(null),
    onFoldToggle() { canvas.refresh(); canvas.fit(); }
  });

  // ---------- 动作 ----------
  /** 点击 / 键盘到达一个节点；回忆模式下，未揭晓的方案第一次只揭晓、不打开详情 */
  function activate(id) {
    const n = state.graph.byId.get(id);
    if (state.recall && n.type === "solution" && !state.revealed.has(id)) {
      state.revealed.add(id); canvas.refresh(); return;
    }
    select(id);
  }
  function select(id) {
    state.selected = id;
    canvas.refresh();
    id ? panel.showNode(id) : panel.hide();
    canvas.updateSize();   // 面板开合会改变右侧遮挡宽度
  }
  function goTo(topicId, nodeId) {
    if (topicId !== state.graph.topic.id) { topicMenu.setValue(topicId); loadTopic(topicId); }
    select(nodeId);
    canvas.focus(nodeId);
  }
  function loadTopic(id) {
    const topic = topics.find((t) => t.id === id) || topics[0];
    state.graph = WT.Graph.build(topic);
    state.notes = store.get(topic.id + ".notes", {});
    state.collapsed = new Set(); state.revealed = new Set(); state.selected = null;
    panel.hide();
    canvas.load();
  }

  // ---------- 工具栏 ----------
  const topicMenu = WT.Dropdown($("#topic"), topics.map((t) => ({ value: t.id, label: t.title })), loadTopic);

  $("#btnFit").onclick = () => { canvas.fit(); $("#viewport").scrollTo({ left: 0, top: 0, behavior: "smooth" }); };
  $("#btnRecall").onclick = (e) => {
    state.recall = !state.recall; state.revealed.clear();
    e.currentTarget.classList.toggle("is-on", state.recall);
    canvas.setRecall(state.recall); canvas.refresh();
  };
  $("#btnCollapse").onclick = (e) => {
    const collapseAll = state.collapsed.size === 0;
    const roots = state.graph.nodes.filter((n) => !state.graph.parentsOf(n.id).length && state.graph.childrenOf(n.id).length);
    state.collapsed = new Set(collapseAll ? roots.map((n) => n.id) : []);
    e.currentTarget.textContent = collapseAll ? "全部展开" : "全部折叠";
    canvas.refresh(); canvas.fit();
  };
  $("#search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const hit = (n) => (n.title + n.brief + (n.kind || "") + (n.tags || []).join(" ")).toLowerCase().includes(q);
    canvas.setMatches(new Set(q ? state.graph.nodes.filter(hit).map((n) => n.id) : []));
  });

  // ---------- 键盘：选中节点后，← 上游 / → 下游 / ↑↓ 同一列的上一个、下一个 ----------
  function neighbor(key) {
    const from = canvas.posOf(state.selected);
    const nearest = (ids, keep = () => true) => ids
      .map((id) => ({ id, p: canvas.posOf(id) }))
      .filter((c) => c.p && keep(c.p))
      .sort((a, b) => Math.abs(a.p.y - from.y) - Math.abs(b.p.y - from.y))[0]?.id;
    const g = state.graph, cur = state.selected;
    if (key === "ArrowLeft") return nearest(g.parentsOf(cur));
    if (key === "ArrowRight") return nearest(g.childrenOf(cur));
    const sign = key === "ArrowDown" ? 1 : -1;   // 同一列 = x 基本相同
    return nearest(g.nodes.map((n) => n.id), (p) => Math.abs(p.x - from.x) < 20 && (p.y - from.y) * sign > 0);
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return select(null);
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (typing || !state.selected || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = neighbor(e.key);
    if (next) { activate(next); canvas.focus(next); }
  });

  loadTopic(topics[0].id);
})();

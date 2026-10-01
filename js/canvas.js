// 画布：整张图缩放到刚好填满窗口高度，只在横向滑动（原生滚动）。
// 它只读 state，不拥有数据；用户操作通过回调交给 main.js 处理。
//
// DOM 结构：viewport（可滚动） > sizer（撑出滚动区域） > world（缩放后的节点世界）
(() => {
  const { $, h, config, nodeLabel, typeClass } = WT;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MARGIN = 40;   // 内容四周留白（屏幕像素）

  /**
   * @param state  共享状态（见 main.js）：graph / collapsed / revealed / selected
   * @param opts   { getInset(): 右侧被面板遮住的宽度,
   *                 onNodeClick(id), onBackgroundClick(), onFoldToggle() }
   */
  WT.Canvas = function Canvas(state, opts) {
    const viewport = $("#viewport"), sizer = $("#sizer"), world = $("#world");
    const nodesEl = $("#nodes"), edgesEl = $("#edges");
    const els = new Map();     // 节点 id → DOM
    let autoPos = {};          // 自动布局结果（节点世界坐标）
    let box = { x0: 0, y0: 0, k: 1, offX: MARGIN, offY: MARGIN };   // 当前缩放与偏移
    const listeners = [];      // 布局/选中状态变化时通知（导航条用）
    const emit = () => listeners.forEach((fn) => fn());

    // ---------- 渲染 ----------
    function renderNode(n, hasChildren) {
      return h("div", { class: `node ${typeClass(n)}`, dataset: { id: n.id } },
        h("div", { class: "node__kind" }, nodeLabel(n), h("i", null, n.year || "")),
        h("h3", null, n.title),
        h("p", null, n.brief),
        h("div", { class: "node__tags" }, (n.tags || []).map((t) => h("span", { class: "tag" }, t))),
        hasChildren && h("button", { class: "node__fold", dataset: { fold: n.id } }));
    }

    function load() {
      nodesEl.replaceChildren(); els.clear();
      for (const n of state.graph.nodes) {
        const el = renderNode(n, state.graph.childrenOf(n.id).length > 0);
        els.set(n.id, el); nodesEl.append(el);
      }
      refresh();
      autoPos = WT.Graph.autoLayout(state.graph, (id) => els.get(id).offsetHeight || 100);
      for (const n of state.graph.nodes) {
        const el = els.get(n.id); el.style.left = autoPos[n.id].x + "px"; el.style.top = autoPos[n.id].y + "px";
      }
      drawEdges();
      fit();
      viewport.scrollLeft = 0; viewport.scrollTop = 0;
    }

    // 一个节点被隐藏 = 它所有的父节点都被折叠或隐藏
    function hiddenSet() {
      const memo = new Map();
      const isHidden = (id) => {
        if (!memo.has(id)) {
          const ps = state.graph.parentsOf(id);
          memo.set(id, ps.length > 0 && ps.every((p) => state.collapsed.has(p) || isHidden(p)));
        }
        return memo.get(id);
      };
      return new Set(state.graph.nodes.filter((n) => isHidden(n.id)).map((n) => n.id));
    }

    /** 状态变了（折叠/选中/揭晓…）后调用，刷新所有样式和连线 */
    function refresh() {
      const hidden = hiddenSet();
      const focusSet = state.selected ? state.graph.related(state.selected) : null;
      world.classList.toggle("has-focus", !!focusSet);
      for (const n of state.graph.nodes) {
        const el = els.get(n.id);
        el.style.display = hidden.has(n.id) ? "none" : "";
        el.classList.toggle("is-revealed", state.revealed.has(n.id));
        el.classList.toggle("is-selected", state.selected === n.id);
        el.classList.toggle("is-hl", !focusSet || focusSet.has(n.id));
        const fold = el.querySelector(".node__fold");
        if (fold) fold.textContent = state.collapsed.has(n.id) ? "+" + state.graph.childrenOf(n.id).length : "−";
      }
      drawEdges(focusSet);
      emit();
    }

    function drawEdges(focusSet = state.selected ? state.graph.related(state.selected) : null) {
      edgesEl.replaceChildren();
      for (const e of state.graph.edges) {
        const a = els.get(e.from), b = els.get(e.to);
        if (a.style.display === "none" || b.style.display === "none") continue;
        const x1 = a.offsetLeft + a.offsetWidth, y1 = a.offsetTop + a.offsetHeight / 2;
        const x2 = b.offsetLeft, y2 = b.offsetTop + b.offsetHeight / 2;
        const dx = Math.max(50, Math.abs(x2 - x1) * 0.5);
        const touchesSelected = focusSet && (e.from === state.selected || e.to === state.selected);
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
        path.setAttribute("class", `edge edge--${e.kind}` + (touchesSelected ? " is-hl" : ""));
        edgesEl.append(path);
      }
    }

    // ---------- 适应窗口 ----------
    function visibleBounds() {
      const shown = state.graph.nodes.map((n) => els.get(n.id)).filter((el) => el.style.display !== "none");
      if (!shown.length) return null;
      return {
        x0: Math.min(...shown.map((e) => e.offsetLeft)), y0: Math.min(...shown.map((e) => e.offsetTop)),
        x1: Math.max(...shown.map((e) => e.offsetLeft + e.offsetWidth)),
        y1: Math.max(...shown.map((e) => e.offsetTop + e.offsetHeight))
      };
    }

    /** 缩放到刚好填满窗口高度（太高时保底缩放比例，剩下的靠竖向滚动），宽度由内容决定 */
    function fit() {
      const b = visibleBounds(); if (!b) return;
      const vh = viewport.clientHeight;
      const k = Math.max(config.minFitZoom, Math.min(1, (vh - 2 * MARGIN) / (b.y1 - b.y0)));
      const contentH = (b.y1 - b.y0) * k;
      const offY = MARGIN + Math.max(0, (vh - 2 * MARGIN - contentH) / 2);   // 不够高时垂直居中
      box = { x0: b.x0, y0: b.y0, k, offX: MARGIN, offY };
      world.style.transform = `translate(${offX()}px,${offY - b.y0 * k}px) scale(${k})`;
      sizer.style.height = offY + contentH + MARGIN + "px";
      updateSize(b);
    }
    const offX = () => box.offX - box.x0 * box.k;

    /** 滚动区域宽度 = 内容宽 + 左右留白 + 面板遮住的部分（保证最右边的节点也能滚出来看） */
    function updateSize(b = visibleBounds()) {
      if (!b) return;
      sizer.style.width = (b.x1 - b.x0) * box.k + 2 * MARGIN + opts.getInset() + "px";
      emit();
    }

    /** 把某节点水平滚动到可见区域（面板之外）的中间 */
    function focus(id) {
      const el = els.get(id);
      const cx = offX() + (el.offsetLeft + el.offsetWidth / 2) * box.k;
      viewport.scrollTo({ left: cx - (viewport.clientWidth - opts.getInset()) / 2, behavior: "smooth" });
      if (viewport.scrollHeight > viewport.clientHeight + 1) {
        const cy = box.offY - box.y0 * box.k + (el.offsetTop + el.offsetHeight / 2) * box.k;
        viewport.scrollTo({ top: cy - viewport.clientHeight / 2, behavior: "smooth" });
      }
    }

    // ---------- 交互：拖动背景横向滚动 / 点击 ----------
    let drag = null;
    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest(".node__fold")) return;
      drag = { id: e.target.closest(".node")?.dataset.id, sx: e.clientX, sy: e.clientY,
        left: viewport.scrollLeft, top: viewport.scrollTop, moved: false };
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;   // 小于 4px 视为点击
      if (!drag.moved) { drag.moved = true; viewport.setPointerCapture(e.pointerId); viewport.classList.add("is-panning"); }
      viewport.scrollLeft = drag.left - dx;
      viewport.scrollTop = drag.top - dy;
    });
    const endDrag = () => {
      if (!drag) return;
      viewport.classList.remove("is-panning");
      const d = drag; drag = null;
      if (d.moved) return;
      d.id ? opts.onNodeClick(d.id) : opts.onBackgroundClick();
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", () => { drag = null; viewport.classList.remove("is-panning"); });

    viewport.addEventListener("click", (e) => {
      const fold = e.target.closest(".node__fold");
      if (!fold) return;
      const id = fold.dataset.fold;
      state.collapsed.has(id) ? state.collapsed.delete(id) : state.collapsed.add(id);
      opts.onFoldToggle();
    });

    // 鼠标滚轮（只有竖向滚动）在没有竖向可滚内容时，转成横向滑动
    viewport.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.metaKey) return;
      const canScrollY = viewport.scrollHeight > viewport.clientHeight + 1;
      if (!canScrollY && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        viewport.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fit, 120); });

    // ---------- 对外 ----------
    return {
      load, refresh, fit, focus, updateSize,
      onChange: (fn) => listeners.push(fn),
      /** 滚动区域的几何：缩放、偏移、当前滚动位置、可视宽度、被面板遮住的宽度 */
      metrics: () => ({ k: box.k, offX: offX(), scrollLeft: viewport.scrollLeft, scrollWidth: viewport.scrollWidth,
        clientWidth: viewport.clientWidth, inset: opts.getInset() }),
      /** 当前显示出来的各列（按 x 从左到右）：{ left: 世界坐标, type, titles } */
      columns() {
        const cols = new Map();
        for (const n of state.graph.nodes) {
          const el = els.get(n.id); if (el.style.display === "none") continue;
          const key = Math.round(el.offsetLeft);
          if (!cols.has(key)) cols.set(key, { left: key, problems: 0, titles: [] });
          const c = cols.get(key); if (n.type === "problem") c.problems++; c.titles.push(n.title);
        }
        return [...cols.values()].sort((a, b) => a.left - b.left)
          .map((c) => ({ left: c.left, type: c.problems * 2 >= c.titles.length ? "problem" : "solution", titles: c.titles }));
      },
      /** 某节点中心在滚动区域里的 x 坐标；被折叠隐藏时返回 null */
      nodeCenterX(id) { const el = els.get(id); return el.style.display === "none" ? null : offX() + (el.offsetLeft + el.offsetWidth / 2) * box.k; },
      /** 节点当前的左上角坐标；被折叠隐藏的返回 null（给键盘导航用） */
      posOf(id) { const el = els.get(id); return el.style.display === "none" ? null : { x: el.offsetLeft, y: el.offsetTop }; },
      setRecall: (on) => viewport.classList.toggle("is-recall", on),
      setMatches(ids) { for (const [id, el] of els) el.classList.toggle("is-match", ids.has(id)); }
    };
  };
})();

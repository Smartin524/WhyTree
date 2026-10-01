// 公共命名空间 WT：配置、小工具、持久化。其它 js 文件都挂在 WT 上，不污染全局。
(() => {
  const WT = (window.WT = window.WT || {});

  WT.config = {
    nodeWidth: 260,   // 要和 css/canvas.css 里 .node 的宽度一致
    gapX: 130,        // 列间距
    gapY: 28,         // 同列节点上下间距
    panelDefault: 460, panelMin: 320, panelMax: 900,
    minFitZoom: 0.5   // “适应窗口”最小缩放，再小字就看不清了
  };

  WT.$ = (sel, root = document) => root.querySelector(sel);

  /** 极简 DOM 构造：h("div", {class:"a", onclick:fn, dataset:{id:1}}, "文字", 子元素...)
   *  文字一律走 textNode，所以不需要手动转义，也不会被注入。
   *  注意：子元素里的 0 会被当成文字显示；写 `cond && h(...)` 时，cond 必须是布尔值（用 `n > 0`，不要直接用 `arr.length`）。 */
  WT.h = function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el) el[k] = v;
      else el.setAttribute(k, v);
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.append(c.nodeType ? c : document.createTextNode(c));
    };
    kids.forEach(add);
    return el;
  };

  /** SVG 版的 h()：svg("rect", {x:1, class:"a"}, 子元素或文字...) */
  WT.svg = function svg(tag, attrs, ...kids) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, v);
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add); else el.append(c.nodeType ? c : document.createTextNode(c));
    };
    kids.forEach(add);
    return el;
  };

  /** localStorage 的安全封装（隐私模式等情况会抛错，这里吞掉） */
  WT.store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem("whytree." + key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("whytree." + key, JSON.stringify(value)); } catch { /* 忽略 */ }
    }
  };

  /** 节点在卡片和面板里显示的类型文字，如「问题 · 训练」「方案」 */
  WT.nodeLabel = (n) => (n.type === "problem" ? "问题" + (n.kind ? " · " + n.kind : "") : "方案");
  WT.typeClass = (n) => (n.type === "problem" ? "is-problem" : "is-solution");
})();

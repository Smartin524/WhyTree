// 右侧详情面板：节点详情 / 概念解释。所有 DOM 都用 h() 构造，不拼 HTML 字符串。
(() => {
  const { $, h, config, store, nodeLabel, typeClass } = WT;

  /**
   * @param state     共享状态
   * @param topics    所有主题（概念页要列出“哪些节点用到了它”）
   * @param concepts  概念库
   * @param actions   { onGo(topicId, nodeId), onClose(), onNote(id, text), onResize() }
   */
  WT.Panel = function Panel(state, topics, concepts, actions) {
    const el = $("#panel");
    let currentNode = null;   // 概念页“返回”要回到的节点

    // ---------- 宽度（可拖，记住） ----------
    const clamp = (w) => Math.min(Math.max(w, config.panelMin), Math.min(config.panelMax, window.innerWidth - 80));
    const applyWidth = (w) => { el.style.width = clamp(w) + "px"; };
    const setWidth = (w) => { applyWidth(w); actions.onResize?.(); };
    applyWidth(store.get("panelWidth", config.panelDefault));

    const grip = h("div", { class: "panel__grip" });
    grip.addEventListener("pointerdown", (e) => { grip.setPointerCapture(e.pointerId); grip.classList.add("is-active"); });
    grip.addEventListener("pointermove", (e) => { if (grip.classList.contains("is-active")) setWidth(window.innerWidth - e.clientX); });
    grip.addEventListener("pointerup", () => { grip.classList.remove("is-active"); store.set("panelWidth", el.offsetWidth); });

    // ---------- 小组件 ----------
    const section = (title, ...kids) => h("section", { class: "sec" }, h("h4", { class: "sec__title" }, title), kids);

    function relList(ids, emptyText) {
      if (!ids.length) return h("div", { class: "empty" }, emptyText);
      return ids.map((id) => {
        const n = state.graph.byId.get(id);
        return h("button", { class: `rel ${typeClass(n)}`, dataset: { go: id } },
          h("span", { class: "rel__title" }, n.title));
      });
    }

    function render(children, className) {
      el.className = "panel " + className;
      el.replaceChildren(grip, ...children);
      el.hidden = false;
    }
    const closeBtn = () => h("button", { class: "btn-close", title: "关闭（Esc）", onclick: actions.onClose }, "✕");

    // ---------- 节点详情 ----------
    function showNode(id) {
      currentNode = id;
      const g = state.graph, n = g.byId.get(id), isProblem = n.type === "problem";
      const concept = (n.concepts || []).filter((c) => concepts[c]);

      const head = h("header", { class: "panel__head" },
        h("div", { class: "panel__top" },
          h("span", { class: "badge" }, nodeLabel(n)),
          n.year && h("span", { class: "panel__year" }, n.year),
          closeBtn()),
        h("h2", { class: "panel__title" }, n.title),
        h("p", { class: "panel__lede" }, n.brief));

      const note = h("textarea", { placeholder: "试着用自己的话讲一遍：为什么会这样？", value: state.notes[id] || "",
        oninput: (e) => actions.onNote(id, e.target.value) });

      const body = h("div", { class: "panel__scroll", onclick: onBodyClick },
        section(isProblem ? "为什么会冒出这个问题" : "它到底是怎么做的", h("p", null, n.detail || "")),
        n.example && section("举个具体的例子", h("div", { class: "example" }, n.example)),
        n.analogy && section("打个比方", h("div", { class: "callout" }, n.analogy)),
        n.points?.length > 0 && section("记住这几点", h("ul", { class: "points" }, n.points.map((p) => h("li", null, p)))),
        concept.length > 0 && section("里面用到的小知识",
          concept.map((c) => h("button", { class: "chip", dataset: { concept: c } }, concepts[c].name))),
        section(isProblem ? "它是被这些方案带出来的" : "它是为了解决这些问题",
          relList(g.parentsOf(id), "（这是起点，没有更早的了）")),
        section(isProblem ? "人们想过这些办法" : "它自己又带来了这些新问题",
          relList(g.childrenOf(id), "（目前没有后续）")),
        section("我的笔记", note));

      render([head, body], typeClass(n));
    }

    // ---------- 概念页 ----------
    function showConcept(cid) {
      const c = concepts[cid];
      const users = [];
      for (const t of topics) for (const n of t.nodes) if ((n.concepts || []).includes(cid)) users.push({ t, n });

      const head = h("header", { class: "panel__head" },
        h("div", { class: "panel__top" },
          currentNode && h("button", { class: "btn-back", onclick: () => showNode(currentNode) }, "← 返回"),
          h("span", { class: "badge" }, "小知识"),
          closeBtn()),
        h("h2", { class: "panel__title" }, c.name));
      const body = h("div", { class: "panel__scroll", onclick: onBodyClick },
        section("大白话", h("p", null, c.plain)),
        section("这些地方也用到了它",
          users.map(({ t, n }) => h("button", { class: `rel ${typeClass(n)}`, dataset: { go: n.id, topic: t.id } },
            h("span", { class: "rel__label" }, `${t.title} · ${nodeLabel(n)}`),
            h("span", { class: "rel__title" }, n.title)))));
      render([head, body], "");
    }

    function onBodyClick(e) {
      const concept = e.target.closest("[data-concept]");
      if (concept) return showConcept(concept.dataset.concept);
      const go = e.target.closest("[data-go]");
      if (go) actions.onGo(go.dataset.topic || state.graph.topic.id, go.dataset.go);
    }

    return {
      showNode, showConcept,
      hide() { el.hidden = true; },
      isOpen: () => !el.hidden,
      width: () => el.offsetWidth
    };
  };
})();

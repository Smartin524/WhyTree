// 底部导航条：整张图按“列”切成一段一段，问题列 / 方案列用两种颜色交替；
// 框 = 现在屏幕上看到的范围；小三角指针 = 当前聚焦的位置（有选中节点时指向它，否则指向视野中心）。
// 点击或拖动导航条可以直接跳转。只读 canvas 的几何信息，不拥有数据。
(() => {
  const { $, h, config, typeClass } = WT;

  WT.NavBar = function NavBar(canvas) {
    const viewport = $("#viewport");
    const thumb = h("div", { class: "nav__thumb" });
    const track = h("div", { class: "nav__track" }, thumb);
    const pointer = h("div", { class: "nav__pointer" });
    const el = h("nav", { class: "nav", "aria-label": "位置导航" }, pointer, track);
    document.body.append(el);

    let dirty = true, segs = [], selected = () => null;

    /** 把滚动区域里的 x 换算成导航条上的像素 */
    const scale = (m) => (x) => (x / m.scrollWidth) * track.clientWidth;

    function rebuild(m) {
      const sx = scale(m), cols = canvas.columns();
      const edge = (left) => m.offX + (left - config.gapX / 2) * m.k;   // 两列之间的分界线
      const start = cols.map((c, i) => (i === 0 ? 0 : edge(c.left)));
      const end = cols.map((c, i) => (i === cols.length - 1 ? m.offX + (c.left + config.nodeWidth) * m.k + 40 : edge(cols[i + 1].left)));
      segs.forEach((s) => s.remove());
      segs = cols.map((c, i) => {
        const seg = h("div", { class: `nav__seg ${typeClass({ type: c.type })}`, dataset: { i },
          title: `${c.type === "problem" ? "问题" : "方案"}（${c.titles.length} 个）\n${c.titles.join("\n")}` }, c.type === "problem" ? "问题" : "方案");
        seg.style.left = sx(start[i]) + "px"; seg.style.width = Math.max(2, sx(end[i]) - sx(start[i])) + "px";
        track.append(seg); return seg;
      });
      dirty = false;
    }

    function update(full) {
      const m = canvas.metrics();
      el.style.right = m.inset + "px";
      if (full) dirty = true;
      if (dirty) rebuild(m);
      const sx = scale(m), visible = m.clientWidth - m.inset;
      thumb.style.left = sx(m.scrollLeft) + "px";
      thumb.style.width = Math.max(8, sx(visible)) + "px";
      const sel = selected(), cx = sel ? canvas.nodeCenterX(sel) : null;
      pointer.style.left = sx(cx ?? m.scrollLeft + visible / 2) + "px";
      pointer.classList.toggle("is-node", cx != null);
    }

    // 点击 / 拖动：把那个位置滚到视野中间
    const seek = (e) => {
      const m = canvas.metrics(), r = track.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * m.scrollWidth;
      viewport.scrollLeft = x - (m.clientWidth - m.inset) / 2;
    };
    track.addEventListener("pointerdown", (e) => {
      try { track.setPointerCapture(e.pointerId); } catch { /* 合成事件没有真实指针，忽略 */ }
      track.dataset.drag = "1"; seek(e);
    });
    track.addEventListener("pointermove", (e) => { if (track.dataset.drag) seek(e); });
    track.addEventListener("pointerup", () => { delete track.dataset.drag; });

    let raf = 0;
    viewport.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => update(false)); });
    canvas.onChange(() => update(true));
    window.addEventListener("resize", () => update(true));

    return { update, setSelected(fn) { selected = fn; } };
  };
})();

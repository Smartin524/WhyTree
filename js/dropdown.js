// 下拉选择：展开在按钮正下方（原生 <select> 在 macOS 上会盖住自己，位置不可控）。
// 键盘：↑↓ 移动，Enter/空格 选择，Esc 关闭。
(() => {
  const { h } = WT;

  /**
   * @param root     放置下拉的容器元素
   * @param options  [{ value, label }]
   * @param onChange (value) => void   仅在用户选择时触发，setValue() 不触发
   */
  WT.Dropdown = function Dropdown(root, options, onChange) {
    let value = options[0]?.value, active = -1;

    const label = h("span", { class: "dropdown__label" });
    const btn = h("button", { class: "dropdown__btn", type: "button", "aria-haspopup": "listbox", "aria-expanded": "false" },
      label, h("span", { class: "dropdown__chevron" }));
    const items = options.map((o, i) => h("div", { class: "dropdown__item", role: "option", dataset: { i } }, o.label));
    const menu = h("div", { class: "dropdown__menu", role: "listbox", hidden: true }, items);
    root.classList.add("dropdown");
    root.replaceChildren(btn, menu);

    const isOpen = () => !menu.hidden;
    function paint() {
      label.textContent = options.find((o) => o.value === value)?.label ?? "";
      items.forEach((el, i) => {
        el.classList.toggle("is-selected", options[i].value === value);
        el.classList.toggle("is-active", i === active);
        el.setAttribute("aria-selected", options[i].value === value);
      });
    }
    function open() {
      active = Math.max(0, options.findIndex((o) => o.value === value));
      menu.hidden = false; btn.setAttribute("aria-expanded", "true"); paint();
    }
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    function choose(i) {
      close(); btn.focus();
      if (options[i].value !== value) { value = options[i].value; paint(); onChange(value); }
    }

    btn.addEventListener("click", () => (isOpen() ? close() : open()));
    menu.addEventListener("click", (e) => { const it = e.target.closest(".dropdown__item"); if (it) choose(+it.dataset.i); });
    menu.addEventListener("pointermove", (e) => {
      const it = e.target.closest(".dropdown__item");
      if (it && active !== +it.dataset.i) { active = +it.dataset.i; paint(); }
    });
    document.addEventListener("pointerdown", (e) => { if (isOpen() && !root.contains(e.target)) close(); });
    root.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "ArrowDown") active = (active + 1) % options.length;
      else if (e.key === "ArrowUp") active = (active - 1 + options.length) % options.length;
      else if (e.key === "Enter" || e.key === " ") choose(active);
      else if (e.key === "Escape") { close(); e.stopPropagation(); }
      else return;
      e.preventDefault(); e.stopPropagation(); paint();
    });

    paint();
    return { setValue(v) { value = v; paint(); }, getValue: () => value };
  };
})();

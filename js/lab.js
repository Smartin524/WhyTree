// 交互演练的外壳：全屏覆盖页 + 步骤标签。具体内容由 js/labs/*.js 注册。
// 注册方式：WT.Lab.register("id", { title, desc, steps: [{key, title}], mount(host, api) })
//   mount 负责往 host 里画内容；api.step() 取当前步骤 key，api.onStep(fn) 监听切换；可返回 { destroy() }。
(() => {
  const { $, h } = WT;
  const labs = {};
  let current = null;   // { id, destroy }

  function register(id, def) { labs[id] = def; }
  const stepTitle = (def, key) => def.steps?.find((s) => s.key === key)?.title;

  /** 给面板按钮用的说明文字 */
  function describe(ref) {
    const def = labs[ref.id]; if (!def) return null;
    const st = ref.step && stepTitle(def, ref.step);
    return `▶ 打开交互演练：${def.title}` + (st ? `（从「${st}」开始）` : "");
  }

  function close() {
    current?.destroy?.(); current = null;
    WT.Chart.disposeAll();
    const el = $("#lab"); el.hidden = true; el.replaceChildren();
  }
  const isOpen = () => !$("#lab").hidden;

  function open(id, step) {
    const el = $("#lab");
    current?.destroy?.(); current = null;
    WT.Chart.disposeAll();
    if (!id || !labs[id]) return openPicker();
    const def = labs[id];
    let stepKey = step && stepTitle(def, step) ? step : def.steps[0].key;
    const listeners = [];
    const tabs = def.steps.map((s, i) => h("button", { class: "lab__step", dataset: { key: s.key },
      onclick: () => setStep(s.key) }, `${i + 1}. ${s.title}`));
    const host = h("div", { class: "lab__body" });
    function setStep(k) {
      stepKey = k;
      tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.key === k));
      listeners.forEach((fn) => fn(k));
    }
    el.replaceChildren(
      h("div", { class: "lab__head" },
        h("span", { class: "lab__title" }, def.title),
        h("div", { class: "lab__steps" }, tabs),
        h("button", { class: "lab__close", onclick: close }, "关闭 ✕")),
      host);
    el.hidden = false;
    const api = { step: () => stepKey, setStep, onStep: (fn) => listeners.push(fn) };
    const inst = def.mount(host, api) || {};
    current = { id, destroy: inst.destroy };
    setStep(stepKey);
  }

  function openPicker() {
    const el = $("#lab");
    current?.destroy?.(); current = null;
    el.replaceChildren(
      h("div", { class: "lab__head" }, h("span", { class: "lab__title" }, "交互演练"),
        h("button", { class: "lab__close", onclick: close }, "关闭 ✕")),
      h("div", { class: "lab__body" }, h("div", { class: "lab-picker" },
        Object.entries(labs).map(([id, d]) => h("button", { onclick: () => open(id) }, h("b", null, d.title), h("span", null, d.desc))))));
    el.hidden = false;
  }

  WT.Lab = { register, open, close, isOpen, describe };
})();

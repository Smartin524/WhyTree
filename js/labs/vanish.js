// 演练：梯度消失 / 爆炸。一条“每层一个神经元”的链，看梯度从输出倒着传回去时每层剩多少。
// 反向传播每经过一层，就乘一个系数 r = 激活函数的导数 × 权重；很多个 r 连乘，就是消失或爆炸的全部原因。
(() => {
  const { h, svg } = WT;

  const ACT = {
    sigmoid: { name: "sigmoid", f: (z) => 1 / (1 + Math.exp(-z)), d: (z, a) => a * (1 - a), note: "导数最大只有 0.25" },
    tanh: { name: "tanh", f: Math.tanh, d: (z, a) => 1 - a * a, note: "导数最大 1，但只要 a 不接近 0 就小于 1" },
    relu: { name: "ReLU", f: (z) => Math.max(0, z), d: (z) => (z > 0 ? 1 : 0), note: "亮着时导数恰好是 1，不会衰减" }
  };
  const fmt = (n) => (n === 0 ? "0" : Math.abs(n) >= 0.01 && Math.abs(n) < 1000 ? n.toFixed(3) : n.toExponential(2)).replace("-", "−");

  /** 返回每层的 { z, a, d, r, grad }：grad[l] = 输出处的梯度 1 传回第 l 层输入时剩多少 */
  function run(N, act, w, x0 = 0.5) {
    const A = ACT[act], layers = []; let a = x0;
    for (let l = 1; l <= N; l++) { const z = w * a; const out = A.f(z); layers.push({ z, a: out, d: A.d(z, out), in: a }); a = out; }
    let g = 1;                                   // ∂L/∂a_N = 1
    for (let l = N; l >= 1; l--) {
      const L = layers[l - 1]; L.r = L.d * w;    // 本层的“传话系数”
      g *= L.r; L.grad = g;                      // 传到第 l 层的输入时剩下的梯度
    }
    return layers;
  }

  /** 柱子 = 梯度传到这一层时还剩多少。纵轴是“10 的几次方”：0 = 出发时的 1，向下 = 缩小，向上 = 放大 */
  function drawBars(layers) {
    return WT.Chart.create(300, (t, ax) => ({
      grid: { left: 8, right: 18, top: 30, bottom: 30, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (q) => `第 ${q[0].dataIndex + 1} 层<br/>梯度 ${fmt(layers[q[0].dataIndex].grad)}<br/>本层系数 r = ${fmt(layers[q[0].dataIndex].r)}` },
      xAxis: { type: "category", data: layers.map((_, i) => i + 1), name: "第几层（左：输入层，右：输出层）", nameLocation: "middle", nameGap: 28, ...ax },
      yAxis: { type: "value", min: -8, max: 8, interval: 4, ...ax, axisLabel: { color: t.mute, formatter: (v) => (v === 0 ? "1" : `1e${v}`) } },
      series: [{ type: "bar", barCategoryGap: "25%", data: layers.map((L) => {
          const e = Math.max(-8, Math.min(8, Math.log10(Math.max(Math.abs(L.grad), 1e-300))));
          return { value: +e.toFixed(3), itemStyle: { color: e >= 0 ? t.p : t.s, borderRadius: e >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4] } };
        }) }]
    }));
  }

  WT.Lab.register("vanish", {
    title: "梯度消失 / 爆炸：一连串系数的连乘",
    desc: "拖动层数、权重，换激活函数，亲眼看梯度从输出传回输入时是怎么越来越小（或越来越大）。",
    steps: [{ key: "play", title: "动手试" }],
    mount(host) {
      let N = 12, act = "sigmoid", w = 1.0;
      const slider = (label, min, max, step, get, set) => h("div", { class: "lab__row" }, h("label", null, label),
        h("input", { type: "range", min, max, step, value: get(), oninput: (e) => { set(+e.target.value); render(); } }));

      function render() {
        const layers = run(N, act, w), last = layers[0], rAvg = Math.exp(layers.reduce((s, L) => s + Math.log(Math.max(Math.abs(L.r), 1e-300)), 0) / N);
        const verdict = rAvg < 0.9 ? `平均每层只留 ${rAvg.toFixed(2)} 倍 → 越传越小（梯度消失）` : rAvg > 1.1 ? `平均每层放大到 ${rAvg.toFixed(2)} 倍 → 越传越大（梯度爆炸）` : `平均每层 ${rAvg.toFixed(2)} 倍 → 基本能传得动`;
        WT.Chart.disposeAll();
        host.replaceChildren(
          h("div", { class: "lab__col" }, h("section", { class: "lab__card" }, h("h3", null, "梯度倒着传回来，每层还剩多少"), drawBars(layers))),
          h("div", { class: "lab__col" },
            h("section", { class: "lab__card" }, h("h3", null, "调一调"),
              h("div", { class: "lab__row" }, h("label", null, "激活函数："),
                Object.entries(ACT).map(([k, a]) => h("button", { class: "lab__btn" + (k === act ? " is-on" : ""), onclick: () => { act = k; render(); } }, a.name))),
              slider(`层数 ${N}`, 2, 40, 1, () => N, (v) => (N = v)),
              slider(`每层权重 w = ${w.toFixed(1)}`, 0.2, 4, 0.1, () => w, (v) => (w = v)),
              h("p", { class: "svg-mute" }, ACT[act].note)),
            h("section", { class: "lab__card" }, h("h3", null, "为什么会这样"),
              h("pre", { class: "lab__calc" }, [
                "每一层的前向：a = f(w·a_前一层)",
                "反向传播时，梯度每经过一层，就乘一个系数：",
                "　r = f′(z) × w",
                `这条链上最靠近输出的一层：r = ${fmt(layers[N - 1].d)} × ${w.toFixed(1)} = ${fmt(layers[N - 1].r)}`,
                `最靠近输入的一层：r = ${fmt(last.d)} × ${w.toFixed(1)} = ${fmt(last.r)}`,
                `${N} 个 r 连乘 → 传到第 1 层时，梯度 = ${fmt(last.grad)}`].join("\n")),
              h("div", { class: "lab__insight" }, verdict)),
            h("section", { class: "lab__card" }, h("h3", null, "试试这几组"),
              h("p", null, "① sigmoid、w=1：导数最大 0.25，12 层后只剩约 2×10⁻⁸——这就是早期深层网络训不动的原因。"),
              h("p", null, "② sigmoid、w=4：0.25×4≈1，刚好抵消，梯度勉强传得动，但稍微偏一点就又消失或爆炸。"),
              h("p", null, "③ ReLU、w=1：系数恰好是 1，梯度原样传回——ReLU 流行的原因之一。"),
              h("p", null, "④ ReLU、w=1.3 或 0.7：只要每层系数略大于或小于 1，几十层之后就爆炸或消失。"),
              h("p", null, "⑤ RNN 是同样的事，只不过“层”变成了“时间步”：同一个 w 反复相乘，序列越长，传回的梯度越小。LSTM 的“传送带”、ResNet 的“直通路”，都是为了让这个系数接近 1。")))
        );
        WT.Chart.flush();
      }
      render();
    }
  });
})();

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

  function drawBars(layers) {
    const N = layers.length, W = 620, bw = Math.min(26, (W - 70) / N - 3), base = 125;
    const px = (i) => 56 + i * ((W - 70) / N);
    const unit = 110 / 8;   // 纵向：每 10 倍 = unit 像素，最多显示 ±8 个数量级
    return svg("svg", { viewBox: `0 0 ${W} 270`, role: "img" },
      [-8, -4, 0, 4, 8].map((e) => [svg("line", { x1: 50, x2: W - 6, y1: base - e * unit, y2: base - e * unit, class: e === 0 ? "svg-axis" : "svg-grid" }),
        svg("text", { x: 44, y: base - e * unit + 4, "text-anchor": "end", "font-size": 11, class: "svg-mute" }, e === 0 ? "1" : `1e${e}`)]),
      layers.map((L, i) => {
        const e = Math.max(-8, Math.min(8, Math.log10(Math.max(Math.abs(L.grad), 1e-300)))), hgt = Math.abs(e) * unit;
        return [svg("rect", { x: px(i), width: bw, y: e >= 0 ? base - hgt : base, height: Math.max(1, hgt), class: e >= 0 ? "svg-bar-up" : "svg-bar-down" }),
          svg("text", { x: px(i) + bw / 2, y: 252, "text-anchor": "middle", "font-size": 10, class: "svg-mute" }, i + 1)];
      }),
      svg("text", { x: W / 2, y: 266, "text-anchor": "middle", "font-size": 11, class: "svg-mute" }, "第几层（左边是输入层，右边是输出层）"),
      svg("text", { x: W - 8, y: 14, "text-anchor": "end", "font-size": 12 }, "柱子 = 梯度传到这一层时还剩多少（对数刻度）"));
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
      }
      render();
    }
  });
})();

// 演练：SGD / 动量 / Adam 在同一个“细长山谷”里赛跑。
// 山谷：L = ½(w₁² + 100·w₂²)。w₂ 方向特别陡，w₁ 方向很平。起点 (4, 0.5)，终点 (0, 0)。
// 三个优化器用的是各自的真实公式，数字和 topics/basics.js 里的文字例子一致。
(() => {
  const { h } = WT;
  const B = 100, START = [4, 0.5];
  const loss = (w) => 0.5 * (w[0] ** 2 + B * w[1] ** 2);
  const grad = (w) => [w[0], B * w[1]];
  const f = (n, d = 3) => { if (!isFinite(n)) return "发散"; if (Math.abs(n) >= 1e4) return n.toExponential(1).replace("e+", "×10^"); const r = +n.toFixed(d); return (r === 0 ? 0 : n).toFixed(d).replace("-", "−"); };

  /** 每个优化器：{ name, color, lr, 范围, update(state, g) }，状态里存 w、动量 m/v、步数 t、历史 */
  const OPTS = {
    sgd: { name: "SGD", lr: 0.019, min: 0.001, max: 0.03, stepSize: 0.001, hint: "w ← w − lr·梯度（超过 0.02 就发散）",
      update(s, g, lr) { return s.w.map((x, i) => x - lr * g[i]); } },
    mom: { name: "SGD + 动量", lr: 0.004, min: 0.001, max: 0.02, stepSize: 0.001, hint: "v ← 0.9·v + 梯度；w ← w − lr·v",
      update(s, g, lr) { s.v = s.v.map((x, i) => 0.9 * x + g[i]); return s.w.map((x, i) => x - lr * s.v[i]); } },
    adam: { name: "Adam", lr: 0.1, min: 0.01, max: 0.5, stepSize: 0.01, hint: "w ← w − lr·m̂ / (√v̂ + ε)：每个参数各用各的步长",
      update(s, g, lr) {
        s.m = s.m.map((x, i) => 0.9 * x + 0.1 * g[i]); s.v = s.v.map((x, i) => 0.999 * x + 0.001 * g[i] ** 2);
        return s.w.map((x, i) => x - lr * (s.m[i] / (1 - 0.9 ** s.t)) / (Math.sqrt(s.v[i] / (1 - 0.999 ** s.t)) + 1e-8)); } }
  };
  const fresh = () => ({ w: [...START], m: [0, 0], v: [0, 0], t: 0, traj: [[...START]], hist: [loss(START)] });

  function drawTrack(S, colors) {
    return WT.Chart.create(300, (t, ax) => {
      const ellipse = (c) => { const pts = []; for (let k = 0; k <= 120; k++) { const a = (k / 120) * 2 * Math.PI; pts.push([Math.sqrt(2 * c) * Math.cos(a), Math.sqrt(2 * c / B) * Math.sin(a)]); } return pts; };
      const clip = (p) => [Math.max(-6, Math.min(6, p[0])), Math.max(-2, Math.min(2, p[1]))];
      return {
        grid: { left: 8, right: 18, top: 62, bottom: 36, containLabel: true },
        legend: { data: Object.values(OPTS).map((o) => o.name) },
        tooltip: { trigger: "item", formatter: (q) => (q.seriesName && q.data ? `${q.seriesName}<br/>w₁ = ${f(q.data[0])}，w₂ = ${f(q.data[1])}` : "") },
        xAxis: { type: "value", min: -1, max: 5, name: "w₁（平缓方向）", nameLocation: "middle", nameGap: 26, ...ax },
        yAxis: { type: "value", min: -1, max: 1, interval: 0.5, name: "w₂（陡峭方向）", nameGap: 14, ...ax },
        series: [
          ...[0.5, 2, 5, 10, 20].map((c) => ({ type: "line", data: ellipse(c), showSymbol: false, silent: true, tooltip: { show: false }, lineStyle: { width: 1, color: t.line, opacity: 0.7 }, z: 1 })),
          ...Object.entries(OPTS).map(([k, o]) => ({ name: o.name, type: "line", data: S[k].traj.map(clip), symbolSize: 4, lineStyle: { width: 2, color: colors[k] }, itemStyle: { color: colors[k] }, z: 3, clip: true,
            markPoint: { symbol: "circle", symbolSize: 13, data: [{ coord: clip(S[k].w), itemStyle: { color: colors[k], borderColor: t.card, borderWidth: 2 } }], silent: true, animation: false } })),
          { type: "scatter", data: [[0, 0]], symbol: "diamond", symbolSize: 14, itemStyle: { color: t.ink }, silent: true, tooltip: { show: false }, z: 4 }]
      };
    });
  }
  function drawLoss(S, colors) {
    return WT.Chart.create(240, (t, ax) => ({
      grid: { left: 8, right: 18, top: 36, bottom: 36, containLabel: true },
      legend: { data: Object.values(OPTS).map((o) => o.name) },
      tooltip: { trigger: "axis", formatter: (q) => `第 ${q[0].data[0]} 步<br/>` + q.map((x) => `${x.seriesName}：${f(x.data[1], 4)}`).join("<br/>") },
      xAxis: { type: "value", min: 0, max: Math.max(20, S.sgd.hist.length - 1), name: "训练步数", nameLocation: "middle", nameGap: 26, ...ax },
      yAxis: { type: "log", logBase: 10, min: 1e-4, max: 100, ...ax, axisLabel: { color: t.mute, formatter: (v) => (v >= 1 ? v : `1e${Math.round(Math.log10(v))}`) } },
      series: Object.entries(OPTS).map(([k, o]) => ({ name: o.name, type: "line", showSymbol: false, clip: true, lineStyle: { width: 2.5, color: colors[k] }, itemStyle: { color: colors[k] },
        data: S[k].hist.map((l, i) => [i, Math.max(1e-6, Math.min(1e6, l))]) }))
    }));
  }

  WT.Lab.register("optimizers", {
    title: "优化器赛跑：SGD、动量、Adam",
    desc: "同一个细长山谷，三个优化器同时出发。拖学习率，看谁先到谷底、谁会来回跳、谁会发散。",
    steps: [{ key: "race", title: "赛跑" }],
    mount(host) {
      let S, lrs, timer = null;
      const init = () => { S = { sgd: fresh(), mom: fresh(), adam: fresh() }; lrs = Object.fromEntries(Object.entries(OPTS).map(([k, o]) => [k, o.lr])); };
      init();
      const stop = () => { clearInterval(timer); timer = null; };
      const go = (n) => { for (let i = 0; i < n; i++) for (const k of Object.keys(OPTS)) {
        const s = S[k]; s.t++; const g = grad(s.w); s.w = OPTS[k].update(s, g, lrs[k]);
        s.traj.push([...s.w]); s.hist.push(loss(s.w)); } render(); };
      const reset = () => { stop(); init(); render(); };

      function render() {
        WT.Chart.disposeAll();
        const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
        const colors = { sgd: css("--p"), mom: css("--accent"), adam: css("--s") };
        const n = S.sgd.t;
        const row = (k) => { const s = S[k]; return h("tr", null, h("td", { style: `color:${colors[k]};font-weight:600` }, OPTS[k].name), h("td", null, f(s.w[0])), h("td", null, f(s.w[1])), h("td", null, f(s.hist[s.hist.length - 1], 4))); };
        const slider = (k) => h("div", { class: "lab__row" }, h("label", { style: `color:${colors[k]}` }, `${OPTS[k].name} 学习率 ${lrs[k].toFixed(3)}`),
          h("input", { type: "range", min: OPTS[k].min, max: OPTS[k].max, step: OPTS[k].stepSize, value: lrs[k], oninput: (e) => { lrs[k] = +e.target.value; e.target.previousSibling.textContent = `${OPTS[k].name} 学习率 ${lrs[k].toFixed(3)}`; } }));
        host.replaceChildren(
          h("div", { class: "lab__col" },
            h("section", { class: "lab__card" }, h("h3", null, "山谷俯视图（● 是现在的位置，◆ 是谷底）"), drawTrack(S, colors)),
            h("section", { class: "lab__card" }, h("h3", null, "损失（对数刻度）"), drawLoss(S, colors))),
          h("div", { class: "lab__col" },
            h("section", { class: "lab__card" }, h("h3", null, "操作"),
              h("div", { class: "lab__row" },
                h("button", { class: "lab__btn", onclick: () => go(1) }, "走 1 步"), h("button", { class: "lab__btn", onclick: () => go(10) }, "走 10 步"),
                h("button", { class: "lab__btn", onclick: () => go(50) }, "走 50 步"),
                h("button", { class: "lab__btn" + (timer ? " is-on" : ""), onclick: () => { if (timer) { stop(); render(); } else { timer = setInterval(() => { go(2); if (S.sgd.t >= 400) stop(); }, 60); render(); } } }, timer ? "暂停" : "▶ 连续"),
                h("button", { class: "lab__btn", onclick: reset }, "重置")),
              Object.keys(OPTS).map(slider),
              h("p", { class: "svg-mute" }, "试试：把 SGD 的学习率拉到 0.021 以上，再走 10 步，看损失会怎样。")),
            h("section", { class: "lab__card" }, h("h3", null, `现在是第 ${n} 步`),
              h("table", { class: "lab__table" }, h("tr", null, ["优化器", "w₁", "w₂", "损失"].map((c) => h("th", null, c))), Object.keys(OPTS).map(row))),
            h("section", { class: "lab__card" }, h("h3", null, "怎么看这张图"),
              h("p", null, "山谷两侧很陡（w₂ 方向），沿着谷底却很平（w₁ 方向）。"),
              h("p", null, [h("b", { style: `color:${colors.sgd}` }, "SGD"), "：学习率被最陡的方向限制住（超过 0.02 就发散），所以在平缓方向只能慢慢爬，而且在陡的方向来回跳。"]),
              h("p", null, [h("b", { style: `color:${colors.mom}` }, "动量"), "：带着“惯性”，来回跳的分量互相抵消，一直朝同一个方向的分量越走越快。"]),
              h("p", null, [h("b", { style: `color:${colors.adam}` }, "Adam"), "：给每个参数各自缩放步长，陡的方向走小步、平的方向走大步，所以几乎是直线冲向谷底。"]),
              h("div", { class: "lab__insight" }, "这里 Adam 和动量都明显比 SGD 快，是因为山谷“细长”。如果地形是个圆碗，三者差别就小得多。Adam 并不是任何时候都赢。")))
        );
        WT.Chart.flush();
      }
      render();
      return { destroy: stop };
    }
  });
})();

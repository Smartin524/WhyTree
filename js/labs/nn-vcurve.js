// 演练：V 形曲线网络。把「正向 → 损失 → 反向 → 更新 → 反复训练」放在同一份状态上，一步步走。
// 所有数字都是页面里实时计算的，和 topics/basics.js 里的文字例子是同一个网络。
(() => {
  const { h, svg } = WT;

  // ---------- 数学：1 输入 → 2 个 ReLU 隐藏神经元 → 1 输出 ----------
  const X = [-2, -1, 1, 2], T = [2, 1, 1, 2];
  const initial = () => ({ w: [0.5, -0.5], b: [0, 0], v: [0.5, 0.5], c: 0 });
  const relu = (z) => Math.max(0, z);

  function forward(P, x) {
    const z = [0, 1].map((j) => P.w[j] * x + P.b[j]);
    const hid = z.map(relu);
    return { z, h: hid, y: P.v[0] * hid[0] + P.v[1] * hid[1] + P.c };
  }
  const meanLoss = (P) => X.reduce((s, x, i) => s + (forward(P, x).y - T[i]) ** 2, 0) / X.length;

  /** 单个样本的反向传播（损失 Lᵢ = (y−t)²，还没有除以样本数） */
  function backward(P, x, t) {
    const f = forward(P, x);
    const dy = 2 * (f.y - t);
    const dh = [dy * P.v[0], dy * P.v[1]];
    const dz = dh.map((d, j) => (f.z[j] > 0 ? d : 0));   // 穿过 ReLU：没亮的地方梯度为 0
    return { f, dy, dh, dz,
      g: { w: [dz[0] * x, dz[1] * x], b: [dz[0], dz[1]], v: [dy * f.h[0], dy * f.h[1]], c: dy } };
  }
  /** 4 个样本取平均后的总梯度 */
  function gradient(P) {
    const g = { w: [0, 0], b: [0, 0], v: [0, 0], c: 0 };
    X.forEach((x, i) => {
      const s = backward(P, x, T[i]).g;
      for (const j of [0, 1]) { g.w[j] += s.w[j] / X.length; g.b[j] += s.b[j] / X.length; g.v[j] += s.v[j] / X.length; }
      g.c += s.c / X.length;
    });
    return g;
  }
  function stepOnce(P, lr) {
    const g = gradient(P);
    return { w: P.w.map((a, j) => a - lr * g.w[j]), b: P.b.map((a, j) => a - lr * g.b[j]),
      v: P.v.map((a, j) => a - lr * g.v[j]), c: P.c - lr * g.c };
  }
  const NAMES = [["w₁", (P) => P.w[0], (g) => g.w[0]], ["w₂", (P) => P.w[1], (g) => g.w[1]],
    ["b₁", (P) => P.b[0], (g) => g.b[0]], ["b₂", (P) => P.b[1], (g) => g.b[1]],
    ["v₁", (P) => P.v[0], (g) => g.v[0]], ["v₂", (P) => P.v[1], (g) => g.v[1]],
    ["c", (P) => P.c, (g) => g.c]];

  const f = (n, d = 3) => { const r = +n.toFixed(d); return (r === 0 ? 0 : n).toFixed(d).replace("-", "−"); };
  const f2 = (n) => f(n, 2);
  const xs = (x) => (x < 0 ? `(−${-x})` : `${x}`);   // 负数乘法时加括号：×(−2)

  // ---------- 画图 ----------
  /** 网络结构图。mode: params（只看参数）/ forward（显示逐层数值）/ backward（显示梯度） */
  function drawNet(P, mode, xi) {
    const x = X[xi], t = T[xi];
    const bw = mode === "backward" ? backward(P, x, t) : null;
    const fw = forward(P, x);
    const box = (cx, cy, w, hgt, lines, hot) => [
      svg("rect", { class: "svg-box" + (hot ? " is-hot" : ""), x: cx, y: cy, width: w, height: hgt, rx: 10 }),
      lines.map(([txt, cls], i) => svg("text", { x: cx + w / 2, y: cy + 22 + i * 19, "text-anchor": "middle", "font-size": 13, class: cls || "" }, txt))];
    const edge = (x1, y1, x2, y2, weight, label, grad) => {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return [svg("line", { x1, y1, x2, y2, class: weight >= 0 ? "svg-pos" : "svg-neg", "stroke-width": 1.5 + Math.min(4, Math.abs(weight) * 3) }),
        svg("rect", { x: mx - 42, y: my - 20, width: 84, height: grad === undefined ? 20 : 38, rx: 6, fill: "var(--card)", opacity: 0.92 }),
        svg("text", { x: mx, y: my - 5, "text-anchor": "middle", "font-size": 12 }, `${label}=${f2(weight)}`),
        grad === undefined ? null : svg("text", { x: mx, y: my + 11, "text-anchor": "middle", "font-size": 12, class: "svg-grad" }, `梯度 ${f(grad)}`)];
    };
    const hid = (j, cy) => {
      const lines = [[`隐藏神经元 ${j + 1}`, "svg-mute"]];
      if (mode === "params") lines.push([`b${"₁₂"[j]} = ${f2(P.b[j])}`]);
      if (mode === "forward") lines.push([`z = ${f2(fw.z[j])}`], [`h = ReLU(z) = ${f2(fw.h[j])}`, "svg-val"]);
      if (mode === "backward") lines.push([`∂L/∂h = ${f(bw.dh[j])}`, "svg-grad"], [`∂L/∂z = ${f(bw.dz[j])}${fw.z[j] > 0 ? "" : "（ReLU 关）"}`, "svg-grad"]);
      return box(250, cy, 150, 80, lines, mode !== "params" && fw.z[j] > 0);
    };
    const out = [["输出 y", "svg-mute"]];
    if (mode === "params") out.push([`c = ${f2(P.c)}`]);
    if (mode === "forward") out.push([`y = ${f2(fw.y)}`, "svg-val"], [`答案 t = ${t}`]);
    if (mode === "backward") out.push([`∂L/∂y = ${f(bw.dy)}`, "svg-grad"], [`y=${f2(fw.y)}，t=${t}`]);
    const inp = [["输入 x", "svg-mute"]];
    if (mode !== "params") inp.push([`x = ${String(x).replace("-", "−")}`, "svg-val"]);
    const g = bw?.g;
    return svg("svg", { viewBox: "0 0 640 330", role: "img" },
      edge(110, 165, 250, 85, P.w[0], "w₁", g?.w[0]), edge(110, 165, 250, 245, P.w[1], "w₂", g?.w[1]),
      edge(400, 85, 520, 165, P.v[0], "v₁", g?.v[0]), edge(400, 245, 520, 165, P.v[1], "v₂", g?.v[1]),
      box(20, 130, 90, 70, inp), hid(0, 45), hid(1, 205), box(520, 130, 110, 70, out, mode === "backward"),
      svg("text", { x: 320, y: 322, "text-anchor": "middle", "font-size": 12, class: "svg-mute" },
        mode === "backward" ? "← 梯度从右往左传（红色）" : "数据从左往右算 →"));
  }

  /** 数据点 + 当前网络给出的曲线。resid：画出每个点到曲线的误差线 */
  function drawFit(P, resid) {
    return WT.Chart.create(270, (t, ax) => {
      const curve = []; for (let x = -3; x <= 3.001; x += 0.05) curve.push([+x.toFixed(2), Math.max(-1, Math.min(3, forward(P, x).y))]);
      return {
        legend: { data: ["数据点", "网络的曲线"] },
        tooltip: { trigger: "item", formatter: (q) => (q.seriesName === "数据点" ? `x = ${q.data[0]}，答案 t = ${q.data[1]}` : `x = ${q.data[0]}，网络输出 y = ${q.data[1].toFixed(2)}`) },
        xAxis: { type: "value", min: -3, max: 3, interval: 1, ...ax },
        yAxis: { type: "value", min: -1, max: 3, interval: 1, ...ax },
        series: [
          { name: "网络的曲线", type: "line", data: curve, showSymbol: false, lineStyle: { width: 3, color: t.accent }, z: 2 },
          { name: "数据点", type: "scatter", data: X.map((x, i) => [x, T[i]]), symbolSize: 15, itemStyle: { color: t.ink, borderColor: t.card, borderWidth: 2 }, z: 5 },
          ...(resid ? X.map((x, i) => ({ type: "line", silent: true, showSymbol: false, tooltip: { show: false }, z: 1,
            data: [[x, T[i]], [x, forward(P, x).y]], lineStyle: { color: t.p, type: "dashed", width: 2 } })) : [])]
      };
    });
  }

  /** 损失随训练步数的变化（纵轴取对数，才看得出后期的缓慢下降） */
  function drawLoss(hist) {
    return WT.Chart.create(240, (t, ax) => ({
      grid: { left: 8, right: 18, top: 36, bottom: 34, containLabel: true },
      title: { text: `损失 = ${f(hist[hist.length - 1], 4)}`, right: 4, top: 0, textStyle: { fontSize: 13, fontWeight: 600, color: t.ink } },
      tooltip: { trigger: "axis", formatter: (q) => `第 ${q[0].data[0]} 步<br/>损失 ${f(q[0].data[1], 5)}` },
      xAxis: { type: "value", min: 0, max: Math.max(10, hist.length - 1), name: "训练步数", nameLocation: "middle", nameGap: 26, ...ax },
      yAxis: { type: "log", logBase: 10, min: 1e-4, max: 2, ...ax, axisLabel: { color: t.mute, formatter: (v) => (v >= 1 ? v : `1e${Math.round(Math.log10(v))}`) } },
      series: [{ type: "line", data: hist.map((l, i) => [i, Math.max(l, 1e-6)]), showSymbol: hist.length < 30, symbolSize: 7, clip: true,
        lineStyle: { width: 3, color: t.accent }, itemStyle: { color: t.accent }, areaStyle: { color: t.accent, opacity: 0.1 } }]
    }));
  }

  // ---------- 界面 ----------
  const card = (title, ...kids) => h("section", { class: "lab__card" }, title && h("h3", null, title), kids);
  const calc = (lines) => h("pre", { class: "lab__calc" }, lines.join("\n"));
  const insight = (txt) => h("div", { class: "lab__insight" }, txt);
  const table = (head, rows) => h("table", { class: "lab__table" },
    h("tr", null, head.map((c) => h("th", null, c))), rows.map((r) => h("tr", null, r.map((c) => h("td", null, c)))));

  WT.Lab.register("nn-vcurve", {
    title: "V 形曲线网络：一步步看它怎么学",
    desc: "4 个点、2 个神经元、7 个参数。同一份数字，从正向传播一路走到训练完成。",
    steps: [{ key: "setup", title: "数据与网络" }, { key: "forward", title: "正向传播" }, { key: "loss", title: "损失" },
      { key: "backward", title: "反向传播" }, { key: "update", title: "更新参数" }, { key: "train", title: "反复训练" }],

    mount(host, api) {
      let P = initial(), lr = 0.1, xi = 0, hist = [meanLoss(P)], timer = null;
      const stop = () => { clearInterval(timer); timer = null; };
      const learn = (n) => { for (let i = 0; i < n; i++) { P = stepOnce(P, lr); hist.push(meanLoss(P)); } render(); };
      const reset = () => { stop(); P = initial(); hist = [meanLoss(P)]; render(); };
      const picker = () => h("div", { class: "lab__row" }, h("label", null, "选一个样本："),
        X.map((x, i) => h("button", { class: "lab__btn" + (i === xi ? " is-on" : ""), onclick: () => { xi = i; render(); } }, `x = ${String(x).replace("-", "−")}`)));

      function render() {
        const s = api.step();
        WT.Chart.disposeAll();
        host.replaceChildren(...view(s));
        WT.Chart.flush();
      }
      api.onStep(() => { stop(); render(); });

      function view(s) {
        const fw = forward(P, X[xi]);
        if (s === "setup") return [
          h("div", { class: "lab__col" }, card("网络结构（当前参数）", drawNet(P, "params", xi)), card("目标：拟合这 4 个点", drawFit(P, false))),
          h("div", { class: "lab__col" },
            card("这是个什么问题", h("p", null, "4 个数据点连起来是个 V 形（其实就是 t = |x|，但网络并不知道）。我们给网络 7 个参数，让它自己找出一组参数，使曲线穿过这 4 个点。"),
              calc(["隐藏层：h₁ = ReLU(w₁·x + b₁)", "　　　　h₂ = ReLU(w₂·x + b₂)", "输　出：y = v₁·h₁ + v₂·h₂ + c"]),
              h("p", null, "现在的参数是随便取的（右表）。蓝色曲线就是它现在的“理解”，和黑点差得很远。"),
              table(["参数", "当前值"], NAMES.map(([n, get]) => [n, f(get(P))]))),
            insight("接下来的每一步，都是用这同一组数字：先正向算预测 → 算损失 → 反向算梯度 → 更新参数 → 重复。"))];

        if (s === "forward") return [
          h("div", { class: "lab__col" }, card("正向传播：数据从左往右算", picker(), drawNet(P, "forward", xi))),
          h("div", { class: "lab__col" },
            card("一步一步算", calc([
              `x = ${xs(X[xi]).replace(/[()]/g, "")}`,
              `z₁ = w₁·x + b₁ = ${f2(P.w[0])}×${xs(X[xi])} + ${f2(P.b[0])} = ${f2(fw.z[0])}　→ ReLU → h₁ = ${f2(fw.h[0])}`,
              `z₂ = w₂·x + b₂ = ${f2(P.w[1])}×${xs(X[xi])} + ${f2(P.b[1])} = ${f2(fw.z[1])}　→ ReLU → h₂ = ${f2(fw.h[1])}`,
              `y = v₁h₁ + v₂h₂ + c = ${f2(P.v[0])}×${f2(fw.h[0])} + ${f2(P.v[1])}×${f2(fw.h[1])} + ${f2(P.c)} = ${f2(fw.y)}`,
              `答案 t = ${T[xi]}　→ 差 y − t = ${f2(fw.y - T[xi])}`]),
              h("p", null, "换一个样本试试：x<0 时只有神经元 2 亮，x>0 时只有神经元 1 亮。绿框就是“亮着”的神经元。")),
            insight("正向传播里没有任何“学习”，只是把输入代进去、一层层往后算，得到当前参数下的预测。"))];

        if (s === "loss") {
          const rows = X.map((x, i) => { const y = forward(P, x).y; return [x, f2(y), T[i], f((y - T[i]) ** 2)]; });
          return [
            h("div", { class: "lab__col" }, card("预测离答案多远（红线 = 误差）", drawFit(P, true))),
            h("div", { class: "lab__col" },
              card("把 4 个样本的误差合成一个数", table(["x", "预测 y", "答案 t", "(y−t)²"], rows),
                h("p", null, `平均 = ${f(meanLoss(P), 5)}`), h("p", null, "这个数就是“损失”。")),
              insight("损失把“错得有多离谱”变成一个数。训练的唯一目标：想办法让它变小。"))];
        }

        if (s === "backward") {
          const b = backward(P, X[xi], T[xi]), g = gradient(P);
          return [
            h("div", { class: "lab__col" }, card("反向传播：从损失出发，把“该怪谁”从右往左传", picker(), drawNet(P, "backward", xi))),
            h("div", { class: "lab__col" },
              card(`单个样本 x = ${X[xi]}：链式法则`, calc([
                `① 从输出开始：∂L/∂y = 2(y−t) = 2×(${f2(b.f.y)} − ${T[xi]}) = ${f(b.dy)}`,
                `② 传给隐藏层（乘以 v）：`,
                `　∂L/∂h₁ = ${f(b.dy)} × ${f2(P.v[0])} = ${f(b.dh[0])}`,
                `　∂L/∂h₂ = ${f(b.dy)} × ${f2(P.v[1])} = ${f(b.dh[1])}`,
                `③ 穿过 ReLU（亮着 → 导数 1；没亮 → 导数 0）：`,
                `　∂L/∂z₁ = ${f(b.dz[0])}　∂L/∂z₂ = ${f(b.dz[1])}`,
                `④ 变成参数的梯度：`,
                `　∂L/∂w₁ = ∂L/∂z₁ × x = ${f(b.dz[0])} × ${xs(X[xi])} = ${f(b.g.w[0])}`,
                `　∂L/∂v₁ = ∂L/∂y × h₁ = ${f(b.dy)} × ${f2(b.f.h[0])} = ${f(b.g.v[0])}`,
                `　∂L/∂c = ∂L/∂y = ${f(b.dy)}　……其余同理`])),
              card("4 个样本取平均 = 总梯度", table(["参数", "梯度", "含义"], NAMES.map(([n, , get]) => [n, f(get(g)), get(g) < 0 ? "增大它，损失会下降" : get(g) > 0 ? "减小它，损失会下降" : "不影响"]))),
              insight("每往前一层，就多乘一个“局部导数”（链式法则）。这样一次从后往前扫完，所有参数的梯度就都有了——不需要一个一个去试。"))];
        }

        if (s === "update") {
          const g = gradient(P), nextP = stepOnce(P, lr), before = meanLoss(P), after = meanLoss(nextP);
          return [
            h("div", { class: "lab__col" }, card("更新前", drawFit(P, false)), card("更新后（用上面算出的新参数）", drawFit(nextP, false))),
            h("div", { class: "lab__col" },
              card("新参数 = 旧参数 − 学习率 × 梯度", h("div", { class: "lab__row" }, h("label", null, `学习率 ${lr.toFixed(2)}`),
                h("input", { type: "range", min: 0.01, max: 0.5, step: 0.01, value: lr, oninput: (e) => { lr = +e.target.value; render(); } })),
                table(["参数", "旧值", "梯度", "新值"], NAMES.map(([n, get, gg]) => [n, f(get(P)), f(gg(g)), f(get(nextP))])),
                h("p", null, `损失：${f(before, 4)} → ${f(after, 4)}`),
                h("div", { class: "lab__row" }, h("button", { class: "lab__btn primary", onclick: () => learn(1) }, "执行这一步更新"),
                  h("button", { class: "lab__btn", onclick: reset }, "重置到初始"))),
              insight("学习率太小，走得慢；太大，会冲过头来回震荡。把滑块拉到 0.5 再点几次“执行”，看损失会不会不降反升。"))];
        }

        // train
        return [
          h("div", { class: "lab__col" }, card("曲线正在贴近数据点", drawFit(P, false)), card("损失（纵轴取对数）", drawLoss(hist))),
          h("div", { class: "lab__col" },
            card("反复执行同一个循环", h("div", { class: "lab__row" },
              h("button", { class: "lab__btn", onclick: () => learn(1) }, "走 1 步"), h("button", { class: "lab__btn", onclick: () => learn(10) }, "走 10 步"),
              h("button", { class: "lab__btn", onclick: () => learn(100) }, "走 100 步"),
              h("button", { class: "lab__btn" + (timer ? " is-on" : ""), onclick: () => { if (timer) { stop(); render(); } else { timer = setInterval(() => { learn(2); if (hist.length > 600) stop(); }, 50); render(); } } }, timer ? "暂停" : "▶ 连续训练"),
              h("button", { class: "lab__btn", onclick: reset }, "重置")),
              h("div", { class: "lab__row" }, h("label", null, `学习率 ${lr.toFixed(2)}`),
                h("input", { type: "range", min: 0.01, max: 0.5, step: 0.01, value: lr, oninput: (e) => { lr = +e.target.value; } })),
              table(["参数", "当前值", "理想值"], NAMES.map(([n, get], i) => [n, f(get(P)), ["1", "−1", "0", "0", "1", "1", "0"][i]]))),
            insight("观察三件事：①前几步损失掉得很快，后面越来越慢（梯度越来越小）；②参数自己走向 w≈[1,−1]、v≈[1,1]；③曲线最终是个 V：两个神经元分工，一个管右边，一个管左边。"))];
      }
      return { destroy: stop };
    }
  });
})();

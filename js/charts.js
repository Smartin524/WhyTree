// 图表封装：基于 Apache ECharts（vendor/echarts/）。统一配色（读 css/theme.css 的变量）、
// 深色模式自动跟随、窗口缩放自适应。
//
// 用法：
//   const el = WT.Chart.create(260, (t) => ({ xAxis: {...}, series: [...] }));  // 返回一个 <div>，先放进页面
//   WT.Chart.flush();      // 页面渲染完后调用，真正创建图表
//   WT.Chart.disposeAll(); // 重画页面前调用，释放旧图表
// build(t) 里的 t 是当前主题色：{ ink, mute, line, soft, card, accent, p, s }
(() => {
  const { h } = WT;
  const pending = [];      // 已创建 <div>，等待 flush
  let live = [];           // { chart, build }

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const theme = () => ({ ink: css("--ink"), mute: css("--mute"), line: css("--line"), soft: css("--line-soft"),
    card: css("--card"), accent: css("--accent"), p: css("--p"), s: css("--s") });

  /** 所有图表共用的基础样式；build(t) 的结果会覆盖它 */
  const base = (t) => ({
    animationDuration: 350, animationDurationUpdate: 250,
    textStyle: { fontFamily: css("--font"), color: t.ink },
    grid: { left: 8, right: 18, top: 36, bottom: 8, containLabel: true },
    tooltip: { backgroundColor: t.card, borderColor: t.line, textStyle: { color: t.ink }, extraCssText: "box-shadow:0 4px 14px rgba(0,0,0,.15);border-radius:8px" },
    legend: { top: 0, icon: "roundRect", itemWidth: 14, itemHeight: 6, textStyle: { color: t.mute } }
  });
  /** 数值坐标轴的统一外观（淡网格 + 灰色文字） */
  const axisStyle = (t) => ({ axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    axisLabel: { color: t.mute }, splitLine: { lineStyle: { color: t.soft } }, nameTextStyle: { color: t.mute } });

  function create(height, build) {
    const el = h("div", { class: "chart", style: `height:${height}px` });
    pending.push({ el, build });
    return el;
  }
  function flush() {
    for (const { el, build } of pending.splice(0)) {
      if (!el.isConnected) continue;
      const chart = echarts.init(el);
      const t = theme();
      chart.setOption({ ...base(t), ...build(t, axisStyle(t)) });
      live.push({ chart, build });
    }
  }
  function disposeAll() { pending.length = 0; live.forEach((l) => l.chart.dispose()); live = []; }

  window.addEventListener("resize", () => live.forEach((l) => l.chart.resize()));
  // 系统切换深色/浅色时，用新的主题色重画
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () =>
    live.forEach(({ chart, build }) => { const t = theme(); chart.setOption({ ...base(t), ...build(t, axisStyle(t)) }, true); }));

  WT.Chart = { create, flush, disposeAll };
})();

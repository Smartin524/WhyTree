# WhyTree

用「问题 → 方案 → 新问题 → 新方案…」的因果链学习知识。横向滑动画布（整张图自动缩放到刚好填满窗口高度，只左右滑动），直接双击 `index.html` 即可打开（无需构建）。

## 核心抽象

| 抽象 | 含义 | 关键字段 |
|---|---|---|
| **Topic 主题** | 一张画布，一条完整的演化脉络 | `id`, `title`, `nodes[]` |
| **Problem 问题** | 人类遇到的困难，或上一个方案遗留的缺陷 | `title`, `kind`(效果/能力/训练/速度/显存), `brief`, `detail`(为什么会有), `causedBy[]` |
| **Solution 方案** | 针对一个或多个问题提出的做法 | `title`, `brief`, `detail`(怎么做), `points`, `solves[]`, `year` |
| **Concept 小知识** | 跨主题共用的概念，大白话解释，点开能看到哪些节点用到它 | `topics/concepts.js`，节点里写 `concepts: [id]` |
| **Edge 边**（推导，不手写） | `problem → solution` = 解决；`solution → problem` = 遗留 | `kind: solves \| causes` |

规则：
- 问题与方案**交替**出现，所以左→右一定是时间/因果的前进方向。
- 是**有向无环图**而不是树：一个方案可解决多个问题（Transformer 同时解决并行、梯度、瓶颈），一个问题也可以由多个方案引出。
- `causedBy` 为空的 Problem 就是根问题（起点）。

## 学习功能
- 点节点：右侧详情（为什么 / 怎么做 / 关键点 / 上下游跳转 / 笔记）
- **回忆模式**：遮住方案，先自己想「这个问题怎么解」，再点开核对
- 折叠子树、搜索标签；「适应」重新按窗口大小缩放并回到最左边
- 滑动方式：触控板双指、鼠标滚轮、按住空白处拖动都行；没有缩放，也不能拖节点
- 选中节点后：← 去上游、→ 去下游、↑↓ 在同一列里换节点，Esc 关闭详情
- 笔记存在浏览器 localStorage 里

## 新增主题
复制 `topics/sequence.js`，改 `id/title/nodes`，在 `index.html` 里多加一行 `<script src="topics/xxx.js">`。

## 写作风格
像跟朋友讲话：先说卡在哪，再说怎么绕过去；能用比喻就加 `analogy`；避免一上来就堆术语，术语放进 Concept 里解释。

## 让 Claude 帮你起草新主题
告诉 Claude 一个起点问题（例如“电脑怎么同时跑很多程序”），它会按上面的字段生成一份 `topics/xxx.js` 草稿，你再改成自己的话。

## 项目结构（想改什么，去哪个文件）

```
index.html          页面骨架 + 脚本加载顺序（新增主题在这里加一行 <script>）
icons/              favicon.svg 与各尺寸透明 PNG（由 tools/make_icons.py 生成）
tools/make_icons.py  重新生成 PNG；带参数时同时生成 .icns
tools/set_example.py 批量改写节点的 example 字段
topics/             内容。只有数据，没有逻辑
  concepts.js         概念库（跨主题共用）
  basics.js sequence.js cuda.js agent.js transformer.js redis.js   各主题
css/
  theme.css           颜色等设计变量，以及 is-problem / is-solution 着色规则
  base.css            按钮、输入框等基础样式
  layout.css          顶栏、画布视口
  canvas.css          节点卡片、连线、回忆模式
  panel.css           右侧面板
  lab.css             交互演练页
js/
  util.js             配置(WT.config)、h() DOM 构造、localStorage 封装
  dropdown.js         自绘下拉（菜单展开在按钮正下方，支持键盘）
  graph.js            图模型 + 自动布局（纯计算，不碰 DOM）
  canvas.js           画布渲染、适应窗口高度、横向滚动、折叠
  panel.js            右侧详情 / 概念页
  lab.js              「交互演练」全屏页的外壳（步骤标签、打开/关闭）
  labs/               各个演练：nn-vcurve（正向→损失→反向→更新→训练）、vanish（梯度消失/爆炸）
  main.js             共享状态，把以上各块和工具栏连起来
```

约定：
- **颜色只在 `theme.css` 定义**。想让某元素带“问题红 / 方案绿”，给它加 `is-problem` 或 `is-solution` 类，再用 `var(--tint)` `var(--tint-bg)` `var(--tint-line)` 即可。
- **画布和面板互不引用**，都只读 `main.js` 里的 `state`，用户操作通过回调交回 `main.js`。
- **DOM 一律用 `WT.h()` 构造**，文字走 textNode，不拼 HTML 字符串，也就不用担心转义。
- 没有构建步骤、没有依赖，普通 `<script>` 加载（没用 ES module，是为了双击 `index.html` 在任何浏览器里都能直接打开）。

## 节点字段速查
`brief` 一句话 · `detail` 展开讲 · `example` 具体例子（保留换行、等宽显示；尽量让同一个玩具数据贯穿多个节点，用“【接上一步】”衔接）· `analogy` 打个比方 · `points` 要点 · `concepts` 用到的小知识 · `kind`（仅问题）问题类型

## 交互演练（Lab）
当一个玩具例子要跨好几个节点连续讲时，文字例子容易“每个框都重写一遍”。这时给节点加 `lab: { id: "nn-vcurve", step: "forward" }`，面板里就会出现「打开交互演练」按钮，直接跳到演练页对应的那一步。
- 演练页里所有数字都是页面实时计算的，和文字例子是同一个网络，各步骤共用同一份状态（先正向、再算损失、再反向、再更新、再反复训练）。
- 新增演练：在 `js/labs/` 里写一个文件，用 `WT.Lab.register(id, { title, desc, steps, mount })` 注册，再在 `index.html` 里加一行 `<script>`。
- 画图用的是 `WT.svg()`（SVG 版的 `h()`），没有引入任何第三方库。

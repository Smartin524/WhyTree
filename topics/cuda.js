// 主题：CUDA 与 GPU 计算——为什么要有 GPU，为什么要有 CUDA，写 kernel 为什么这么难
(window.WHYTREE_TOPICS = window.WHYTREE_TOPICS || []).push({
  id: "cuda",
  title: "CUDA：让显卡替你算数",
  nodes: [
    {
      id: "p-slow", type: "problem", kind: "起点", year: "", tags: ["起点"],
      title: "深度学习要做海量的乘法和加法，电脑算不动",
      brief: "训练一个神经网络，本质上是几亿、几千亿次“乘一下再加一下”。一块普通处理器慢慢算，要算好几年。",
      detail: "神经网络里最常见的运算是矩阵乘法，而矩阵乘法可以拆成非常多互不相干的小乘加。关键特征是：活很多，但每一份都很简单，而且彼此不用等对方。",
      points: ["活多、每份很简单", "各份之间基本互不依赖"],
      causedBy: []
    },

    {
      id: "s-simd", type: "solution", year: "2000s", tags: ["CPU"],
      title: "CPU 多核 + 向量指令",
      brief: "给 CPU 多装几个核，再加上“一条指令同时算 8 个数”的向量指令。",
      detail: "CPU 擅长处理复杂、分支多的任务，所以每个核都很“聪明”也很占地方。多核和向量指令能让速度翻几倍到十几倍，是对 CPU 最自然的升级。",
      points: ["多核：几个人同时干", "向量指令：一个人一次拿 8 个零件"],
      solves: ["p-slow"]
    },
    {
      id: "p-cpu-limit", type: "problem", kind: "速度", year: "", tags: ["CPU"],
      title: "CPU 核数再多，也就几十个",
      brief: "我们的活需要“上万件事同时做”，CPU 就算堆到几十核，也只是杯水车薪。",
      detail: "CPU 每个核都配了复杂的“大脑”（预测分支、乱序执行、大缓存），这些很占芯片面积。面积就那么大，所以核数上不去。而我们的活很简单，其实根本用不上这么聪明的大脑。",
      points: ["核数少，是因为每个核太“重”", "我们要的是“人多”，不是“人聪明”"],
      causedBy: ["s-simd"]
    },
    {
      id: "s-gpu", type: "solution", year: "1999–2006", tags: ["GPU"],
      title: "用 GPU：几千个小工人一起干",
      brief: "显卡里本来就有几千个简陋的小核，专门用来同时算屏幕上每个像素。拿它来做乘加，正合适。",
      detail: "GPU 把芯片面积都拿去堆“小工人”，每个工人很笨，不会花哨的判断，但胜在人多。画图要给几百万个像素各算一次颜色，和矩阵乘法一样都是“同样的活，同时做很多份”。",
      analogy: "CPU 像几位资深教授，什么难题都能解；GPU 像一个有几千个小学生的教室，每人只会做加减乘，但全班同时算一千道口算题，比教授快得多。",
      points: ["核多而简单", "适合“同一件事做很多份”", "不擅长复杂分支"],
      concepts: ["parallel"],
      solves: ["p-slow", "p-cpu-limit"]
    },
    {
      id: "p-gpu-hard", type: "problem", kind: "能力", year: "", tags: ["GPU"],
      title: "GPU 本来只会画图，想让它算别的得“骗”它",
      brief: "早年想用 GPU 算别的东西，得把数据假装成图片的像素，把计算假装成画图，写起来又绕又容易出错。",
      detail: "那时的 GPU 只能通过图形接口（着色器）来用。研究人员要把矩阵塞进“纹理”，把运算写成“着色程序”，再从“画出来的图”里把结果读回来。门槛极高，调试几乎不可能。",
      points: ["必须把计算伪装成图形", "只有懂图形学的人才用得动"],
      causedBy: ["s-gpu"]
    },
    {
      id: "s-cuda", type: "solution", year: "2007", tags: ["CUDA"],
      title: "CUDA：用熟悉的 C/C++ 直接指挥 GPU",
      brief: "英伟达推出 CUDA：你写一个普通的 C 风格函数，告诉它“让几万个线程各跑一遍”，剩下的它来安排。",
      detail: "CUDA 不再要求你假装成画图。你直接写一个函数（叫 kernel），再说“开多少个线程”，每个线程根据自己的编号，去处理数据里属于自己的那一份。GPU 从此变成了“通用计算设备”，深度学习后来的爆发，很大程度靠这一步。",
      analogy: "就像老师给全班发同一张题纸，上面写“按座位号做对应那一题”，每个同学根据自己的座位号，去做属于自己的那一道。",
      points: ["写 kernel，指定线程数", "每个线程靠自己的编号找到自己的数据", "官方配套了编译器、库和调试工具"],
      concepts: ["kernel"],
      solves: ["p-gpu-hard"]
    },

    {
      id: "p-organize", type: "problem", kind: "能力", year: "", tags: ["CUDA"],
      title: "几万个线程，怎么分工、怎么配合？",
      brief: "线程这么多，不能每个都各管各：有的要共享数据，有的要等别人，还要保证硬件能高效地调度它们。",
      detail: "如果几万个线程完全平等，既没法让一部分线程合作（比如一起算一小块矩阵），硬件也不知道怎么把它们分给各个计算单元。",
      points: ["要能分组", "组内能共享数据、能同步"],
      causedBy: ["s-cuda"]
    },
    {
      id: "p-memory", type: "problem", kind: "显存", year: "", tags: ["CUDA", "内存"],
      title: "算得飞快，数据却搬不过来",
      brief: "GPU 的计算能力极强，但从显存里把数据读过来很慢。很多时候小工人们是在等数据，而不是在算。",
      detail: "显存虽然很大，但每次访问都要等很久。如果 1 万个线程各自随便去显存里取数据，大部分时间都花在排队等数据上，计算单元反而闲着。",
      points: ["瓶颈往往是“搬数据”而不是“算”", "访问显存的方式，对速度影响巨大"],
      concepts: ["gpu-io"],
      causedBy: ["s-cuda"]
    },
    {
      id: "s-hierarchy", type: "solution", year: "2007", tags: ["CUDA"],
      title: "线程分层：thread → block → grid",
      brief: "线程分成一个个“块”，块里的线程可以共享数据、互相等；每 32 个线程又组成一队（warp），步调一致地执行。",
      detail: "你开的线程被组织成 grid（整个任务）→ block（小组）→ thread（个人）。一个 block 会被分到同一个计算单元上，所以块内可以共用一块很快的“小黑板”，也能互相同步。warp 则是硬件真正的执行单位：32 个线程一起执行同一条指令。",
      analogy: "像一所学校：全校（grid）分成很多班（block），班里的同学可以互相讨论、共用黑板；每班再分成几个 32 人的小队，听同一个口令做同一个动作（warp）。",
      points: ["block 内可共享、可同步", "warp = 32 个线程同时走一步", "block 之间互不干涉，所以能随便调度"],
      concepts: ["warp", "shared-memory"],
      solves: ["p-organize"]
    },
    {
      id: "s-memhier", type: "solution", year: "2007+", tags: ["CUDA", "内存"],
      title: "管好存储层级：把常用数据留在“近处”",
      brief: "先把一小块数据从显存搬到共享内存，块里所有线程反复用它；相邻线程读相邻地址，一次就能搬一大片。",
      detail: "存储分层：寄存器最快、共享内存其次、全局显存最慢。做矩阵乘法时，常见套路是“分块（tiling）”：每次把一小块 A 和一小块 B 搬进共享内存，大家在小黑板上反复用，用完再搬下一块。另外，让相邻线程读相邻地址（合并访问），硬件就能一次把一大片数据搬回来。",
      analogy: "写作业时，不是每做一步都跑去图书馆查书，而是一次借几本放在桌上，用完再换。",
      points: ["分块（tiling）：把常用数据留在共享内存", "合并访问：相邻线程读相邻地址", "核心思想：减少去全局显存的次数"],
      concepts: ["shared-memory", "gpu-io"],
      solves: ["p-memory"]
    },
    {
      id: "p-diverge", type: "problem", kind: "速度", year: "", tags: ["CUDA"],
      title: "同一队的线程必须步调一致，遇到 if 就要排队",
      brief: "一个 warp 的 32 个线程每一步只能做同一件事。如果有的走 if、有的走 else，它们只能轮流来，另一半先闲着。",
      detail: "所以代码里如果有“线程 A 走这条路、线程 B 走那条路”的分支，同一个 warp 里的线程就会被迫先全体走完一条路（走另一条路的先空等），再走另一条。最坏时速度直接掉一半甚至更多。",
      points: ["叫“分支发散”", "同一 warp 内的 if/else 代价很高"],
      concepts: ["warp"],
      causedBy: ["s-hierarchy"]
    },
    {
      id: "s-branchfree", type: "solution", year: "—", tags: ["CUDA"],
      title: "让同一队的线程走同一条路",
      brief: "写 kernel 时尽量让条件判断“整队一致”，比如按 warp 为单位分工，或者用算术代替分支。",
      detail: "常见做法：把数据整理好，让相邻线程处理的情况类似；或用 min/max 之类的运算代替 if；真要分支，尽量让整个 warp 一起选同一边。",
      points: ["按 warp 边界分工", "能不用 if 就不用"],
      solves: ["p-diverge"]
    },

    {
      id: "p-handwrite", type: "problem", kind: "能力", year: "", tags: ["CUDA", "工程"],
      title: "想写出跑得快的 kernel，要同时操心太多细节",
      brief: "分块多大、线程怎么排、数据怎么对齐、会不会读写冲突……每一项都影响速度，一不小心就比库慢十倍。",
      detail: "写对不难，写“快”很难。要同时考虑线程层级、存储层级、分支发散、寄存器用量、共享内存冲突等等，还和具体显卡型号有关。大多数人没有精力每次都从头调。",
      points: ["“写对”和“写快”差很多", "还要针对不同型号的卡单独调"],
      causedBy: ["s-hierarchy", "s-memhier"]
    },
    {
      id: "s-libs", type: "solution", year: "2007–2014", tags: ["CUDA", "库"],
      title: "直接用现成的库：cuBLAS、cuDNN",
      brief: "矩阵乘法、卷积这些常用运算，让专家调到极致，打成库，你直接调用。",
      detail: "英伟达的工程师为每一代显卡手工调出最快的实现。PyTorch、TensorFlow 底层调用的就是这些库，所以你写 `a @ b` 的时候，背后跑的是 cuBLAS。",
      analogy: "不用每次都自己磨刀，直接去买一把大厨用的刀。",
      points: ["cuBLAS：矩阵运算", "cuDNN：卷积、归一化等神经网络运算", "PyTorch 底层就是它们"],
      solves: ["p-handwrite"]
    },
    {
      id: "s-triton", type: "solution", year: "2019–2021", tags: ["CUDA", "编译器"],
      title: "Triton / CUTLASS：用更高一层的方式写 kernel",
      brief: "你只描述“每一块数据怎么算”，编译器帮你处理线程分配、内存搬运等底层细节。",
      detail: "库只覆盖常见运算，遇到新点子（比如新的注意力写法）就没现成的了。Triton 让你用类似 Python 的写法，按“数据块”思考，编译器自动做内存对齐、共享内存、线程映射，写出来速度往往接近手调。",
      points: ["按“块”而不是“线程”思考", "自动处理很多底层细节"],
      solves: ["p-handwrite"]
    },

    {
      id: "p-launch", type: "problem", kind: "速度", year: "", tags: ["CUDA", "工程"],
      title: "运算切得太碎：每步都要启动、都要把中间结果存回显存",
      brief: "一个网络由很多小运算串起来，每个运算是一次 kernel 调用。启动本身要时间，中间结果还要反复写进、读出显存。",
      detail: "比如“加偏置 → 激活 → 归一化”，三步各是一个 kernel，每步都把整个张量写回显存再读出来。数据没怎么变，却被来回搬了好几遍；另外，每次启动 kernel 也有固定开销，运算很小时，开销比计算本身还大。",
      points: ["搬数据的时间被白白浪费", "小运算的启动开销占比高"],
      concepts: ["gpu-io"],
      causedBy: ["s-libs"]
    },
    {
      id: "s-fusion", type: "solution", year: "2017+", tags: ["CUDA", "优化"],
      title: "算子融合 + CUDA Graphs",
      brief: "把相邻的几步合成一个 kernel，中间结果留在芯片里；再把一连串启动录成“一份清单”，一次提交。",
      detail: "融合之后，三步运算只读一次、写一次显存。CUDA Graphs 则是把整串 kernel 调用提前录好，运行时一次性启动，省掉逐个启动的开销。上一章的 FlashAttention，本质上也是一种融合：把注意力的好几步合并起来，不写出那张大表。",
      analogy: "做三道工序，原来每道都把半成品放回仓库再取；现在流水线一次做完，不进仓库。",
      points: ["融合：减少读写显存的次数", "CUDA Graphs：减少启动开销", "和 FlashAttention 同一个思路"],
      concepts: ["kernel-fusion", "gpu-io"],
      solves: ["p-launch"]
    },

    {
      id: "p-precision", type: "problem", kind: "显存", year: "", tags: ["精度"],
      title: "32 位浮点数，又占地方又慢",
      brief: "每个数用 32 位存，模型一大，显存立刻不够；搬运和计算也都更慢。",
      detail: "神经网络其实并不需要那么高的精度，稍微不准一点，结果影响很小。可是默认的 32 位，白白占了一倍的显存和带宽。",
      points: ["占显存", "占带宽", "神经网络容得下一点点误差"],
      causedBy: ["s-libs"]
    },
    {
      id: "s-tensorcore", type: "solution", year: "2017–2022", tags: ["硬件", "精度"],
      title: "Tensor Core + 混合精度（FP16 / BF16 / FP8）",
      brief: "专门造一块做“小矩阵乘法”的硬件，配合 16 位甚至 8 位的数字，速度和显存都大幅改善。",
      detail: "Tensor Core 一次能算一整块小矩阵，比普通核快得多。配合混合精度：存储和乘法用 16 位或 8 位，累加和参数更新仍用 32 位，兼顾速度和稳定。每一代显卡几乎都在把支持的位数往下压（FP16 → BF16 → FP8 → 更低）。",
      points: ["硬件为矩阵乘法定制", "数字位数越少，越快越省", "关键处仍保留高精度"],
      concepts: ["tensor-core", "mixed-precision"],
      solves: ["p-precision"]
    },

    {
      id: "p-onegpu", type: "problem", kind: "能力", year: "", tags: ["多卡"],
      title: "一张卡装不下模型，也训不完数据",
      brief: "模型动辄几百亿参数，单卡显存放不下；数据又多，只用一张卡，要训好几年。",
      detail: "前面所有优化，都是让单卡更快、更省。但模型的体量涨得比显卡快得多，最终只能靠很多张卡一起干。",
      points: ["参数放不下", "训练时间太长"],
      causedBy: ["s-tensorcore"]
    },
    {
      id: "s-parallel", type: "solution", year: "2018–2020", tags: ["多卡"],
      title: "多卡并行：数据并行 / 张量并行 / 流水线并行",
      brief: "数据并行：每张卡都有完整模型，各吃一部分数据。张量并行：把一层拆成几块，每卡算一块。流水线并行：不同的层放在不同的卡上。",
      detail: "三种拆法往往组合起来用。数据并行最简单，但每张卡都得放得下整个模型；模型太大就要用张量并行或流水线并行把模型本身切开。",
      analogy: "像一个大工程：数据并行是“多个工地各盖一栋同样的楼”；张量并行是“同一栋楼的不同墙，各队负责一面”；流水线并行是“前一队砌墙，传给后一队装修”。",
      points: ["数据并行：拆数据", "张量并行：拆一层", "流水线并行：拆层与层"],
      solves: ["p-onegpu"]
    },
    {
      id: "p-comm", type: "problem", kind: "速度", year: "", tags: ["多卡", "通信"],
      title: "卡和卡之间传数据太慢，大半时间在等",
      brief: "多卡并行要频繁交换结果（比如同步梯度），如果线路慢，所有卡都停下来等最慢的那一段。",
      detail: "每张卡算得再快，只要每一轮都要等数据传完，整体速度就被通信拖住。卡数越多，这个问题越明显。",
      points: ["卡越多，通信占比越大", "整体速度被最慢的一环决定"],
      causedBy: ["s-parallel"]
    },
    {
      id: "s-nvlink", type: "solution", year: "2016+", tags: ["多卡", "通信"],
      title: "NVLink / NVSwitch + NCCL 通信库",
      brief: "卡与卡之间用专用高速线路直连，再用通信库把“大家一起汇总数据”这件事安排得最快。",
      detail: "NVLink 比普通的 PCIe 线路快好几倍，NVSwitch 则让很多张卡两两直连。NCCL 是配套软件，负责按最优的路线和顺序传数据，让通信和计算尽量重叠，不互相等待。",
      points: ["NVLink：专用高速线", "NCCL：安排传输路线", "通信和计算同时进行"],
      solves: ["p-comm"]
    }
  ]
});

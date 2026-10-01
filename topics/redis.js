// 主题：Redis——为什么需要它、为什么快、怎么用、会出什么问题
// example 里的命令都是真实可用的 Redis 命令；数字是为了讲清楚取的示意值。
(window.WHYTREE_TOPICS = window.WHYTREE_TOPICS || []).push({
  id: "redis",
  title: "Redis：为什么需要它，又怎么用好它",
  nodes: [
    {
      id: "p-slowdb", type: "problem", kind: "起点", year: "", tags: ["起点"],
      title: "每次都查数据库，访问一多就慢，甚至扛不住",
      brief: "数据库要读磁盘、要做各种检查，一次查询几毫秒到几十毫秒；同时能处理的连接数也有限。",
      detail: "绝大多数网站有一个特点：少数热门内容被反复读取，而且读远多于写。如果这些重复的读取每次都打到数据库上，数据库会被无意义的重复劳动压垮。",
      example: "一个商城的首页，每秒 1 万人看同一批热门商品。\n每次都去 MySQL 查：10000 次/秒 × 每次几毫秒，数据库的连接和 CPU 先被打满，页面开始变卡，最后整个网站挂掉。\n\n但这 1 万次请求里，商品信息其实一模一样，根本没必要查 1 万次。",
      points: ["热点数据被反复读取", "读多写少", "数据库的容量和连接数有限"],
      causedBy: []
    },

    {
      id: "s-localcache", type: "solution", year: "—", tags: ["缓存"],
      title: "最简单的缓存：程序里放一个 Map",
      brief: "第一次查完数据库，把结果存在程序自己的内存里（比如一个 HashMap），下次直接用，不再查库。",
      detail: "零依赖，最快（就在进程内存里，连网络都不用走）。小项目、单台服务器时完全够用。",
      example: "Python 里一句话就能做：\n　cache = {}\n　def get_product(id):\n　　if id not in cache:\n　　　cache[id] = db.query(id)   # 第一次才查库\n　　return cache[id]",
      points: ["进程内缓存，最快", "只适合单机、小数据量"],
      solves: ["p-slowdb"]
    },
    {
      id: "p-localcap", type: "problem", kind: "能力", year: "", tags: ["缓存"],
      title: "多台服务器各存一份，对不上；一重启全没；还占应用的内存",
      brief: "网站扩成多台服务器后，每台各自缓存一份。谁改了数据，其他台不知道；重启一次，缓存归零，数据库瞬间被打爆。",
      detail: "进程内缓存的根本问题是：缓存和应用绑在一起。应用有几台，缓存就有几份，相互独立；应用一重启，缓存跟着消失。",
      example: "3 台服务器 A、B、C 都缓存了“商品 1001 价格 = 100”。\n运营把价格改成 80，数据库更新了，只有 A 刚好清掉了缓存。\n用户刷新页面，一会儿看到 80（A），一会儿看到 100（B、C）。\n\n又比如凌晨发布新版本，三台机器依次重启，缓存全空，所有请求同时涌向数据库。",
      points: ["多份缓存互不一致", "重启就丢，容易“冷启动”打垮数据库", "占用应用本身的内存"],
      causedBy: ["s-localcache"]
    },
    {
      id: "s-redis", type: "solution", year: "2009", tags: ["Redis"],
      title: "把缓存独立出来：Redis，所有服务器共用一份",
      brief: "专门放一台（或一组）缓存服务器，所有应用都从它读写。缓存和应用分开，各自重启互不影响。",
      detail: "Redis 是一个基于内存的键值数据库，通过网络提供服务。应用不再自己存缓存，而是向 Redis 发命令：“给我 product:1001”“把它存进去，10 分钟后过期”。",
      example: "流程（最常见的“旁路缓存”写法）：\n　1. 收到请求，先问 Redis：GET product:1001\n　2. 有 → 直接返回（约 0.1～1 毫秒）\n　3. 没有 → 查 MySQL，然后写入 Redis：SET product:1001 {…} EX 600\n　4. 下一个人来，直接从 Redis 拿到\n\n三台服务器用的是同一份缓存，数据一致，谁重启都不影响。",
      points: ["键值存储，数据放在内存里", "应用和缓存解耦", "多个应用共用同一份缓存"],
      concepts: ["redis", "cache-aside"],
      solves: ["p-localcap"]
    },

    {
      id: "p-fastneed", type: "problem", kind: "速度", year: "", tags: ["性能"],
      title: "共享缓存本身必须比数据库快得多，还要扛住上万并发",
      brief: "如果缓存服务器自己也很慢，或者一多人访问就要排队加锁，那它就失去了意义。",
      detail: "缓存是所有请求的必经之路，它一旦慢，整个系统都慢。所以它必须在设计上就追求极致的速度。",
      points: ["必经之路，不能成为新瓶颈", "要同时处理大量并发的小请求"],
      causedBy: ["s-redis"]
    },
    {
      id: "s-design", type: "solution", year: "2009", tags: ["Redis", "性能"],
      title: "全放内存 + 单线程执行命令 + 高效的数据结构",
      brief: "数据都在内存里，不读磁盘；命令一个接一个执行，不需要加锁；底层用专门优化的数据结构。单机每秒几万到十万级请求很常见。",
      detail: "①内存：访问内存以纳秒计，磁盘以毫秒计，差几个数量级。②单线程执行命令：每条命令都很短（微秒级），串行执行反而避免了多线程抢锁、切换的开销，也天然保证每条命令是原子的。网络读写用 I/O 多路复用，一个线程就能同时伺候成千上万个连接。③数据结构（哈希表、跳表、压缩列表等）都针对内存做了专门优化。",
      example: "对比：\n　磁盘数据库一次查询：约几毫秒（1 毫秒 = 1000 微秒）\n　Redis 一条 GET：命令本身只需约 1 微秒量级，加上网络往返通常在 0.1～1 毫秒\n\n因为是单线程，两个人同时执行 INCR counter，也绝不会出现“都读到 5、都写成 6”的情况：先来先服务，结果一定是 7。",
      analogy: "像一个手脚极快的前台，一次只办一件事，但每件事只需要一秒。比开十个窗口、窗口之间还要互相协调要来得又快又不出错。",
      points: ["内存访问比磁盘快几个数量级", "单线程执行命令：无锁、天然原子", "注意：慢命令（如对大数据 KEYS *）会堵住所有人"],
      concepts: ["redis"],
      solves: ["p-fastneed"]
    },

    {
      id: "p-onlystring", type: "problem", kind: "能力", year: "", tags: ["数据结构"],
      title: "缓存里不止是字符串：排行榜、购物车、点赞去重怎么办？",
      brief: "如果只能存一整块文本，想改其中一个字段、想取前 10 名，都得先整个读出来、改完再整个写回去。",
      detail: "很多业务场景天然是“集合”“列表”“带分数的排序”。如果缓存只会存字符串，应用就得自己拿出来处理，既慢又容易冲突。",
      example: "排行榜：10 万个玩家的分数，每次有人得分，都要把整个排行榜取出来、重新排序、再写回去？\n购物车：用户加了一件商品，要把整个购物车读出来改完再存回去？两个手机同时改会互相覆盖。",
      causedBy: ["s-design"]
    },
    {
      id: "s-datatypes", type: "solution", year: "2009", tags: ["Redis", "数据结构"],
      title: "丰富的数据类型：String / Hash / List / Set / ZSet",
      brief: "Redis 不只存字符串，还原生支持哈希、列表、集合、有序集合，并且提供对应的原子操作。",
      detail: "每种结构配套一批命令，直接在服务端完成，不用把数据拉到应用里处理。选对结构，是用好 Redis 的第一步。",
      example: "String（计数器、登录 token）：\n　INCR page:home:views　→ 页面浏览数 +1（原子）\n\nHash（购物车、用户信息）：\n　HSET cart:u1 sku1001 2　→ 购物车里商品 sku1001 数量 2\n　HINCRBY cart:u1 sku1001 1　→ 只把这一项 +1，不用整体读写\n\nList（简单队列、最新动态）：\n　LPUSH feed:u1 \"新消息\"　LRANGE feed:u1 0 9　→ 取最新 10 条\n\nSet（去重、共同好友）：\n　SADD like:post9 u1　→ 点赞，重复点赞自动忽略\n　SCARD like:post9　→ 点赞数\n\nZSet（排行榜）：\n　ZADD rank 100 alice\n　ZINCRBY rank 5 alice　→ alice 加 5 分\n　ZREVRANGE rank 0 2 WITHSCORES　→ 前 3 名",
      points: ["String：计数、token、缓存对象", "Hash：一个对象的多个字段", "List：队列、最新列表", "Set：去重、集合运算", "ZSet：带分数的排序，排行榜首选"],
      solves: ["p-onlystring"]
    },

    {
      id: "p-ttl", type: "problem", kind: "容量", year: "", tags: ["内存"],
      title: "内存贵、容量有限，缓存里的数据还会过时",
      brief: "数据都在内存里，可内存比磁盘贵得多。不清理的话，缓存迟早塞满；旧数据留太久，用户还会看到过时的内容。",
      detail: "缓存是“热点的副本”，不应该永久存在。需要一个机制，让不再需要的数据自动消失，让内存满了的时候也知道先扔谁。",
      causedBy: ["s-design"]
    },
    {
      id: "s-expire", type: "solution", year: "2009", tags: ["Redis"],
      title: "过期时间（TTL）+ 内存淘汰策略",
      brief: "给每条数据设一个“保质期”，到点自动删。内存快满时，按策略（比如 LRU）把最没用的先踢出去。",
      detail: "过期删除有两种方式：访问时发现过期就删（惰性），以及后台定期抽查删除。内存超过 maxmemory 后，按 maxmemory-policy 淘汰，缓存场景最常用 allkeys-lru（淘汰最久没被访问的）。",
      example: "登录 token 只保 30 分钟：\n　SET token:abc user1 EX 1800\n　TTL token:abc　→ 查看还剩多少秒\n\n配置：maxmemory 2gb、maxmemory-policy allkeys-lru\n含义：Redis 最多用 2GB，满了就优先踢掉最久没被读过的 key，热门的会留下。",
      points: ["EX / EXPIRE：设置保质期", "allkeys-lru：缓存最常用的淘汰策略", "没设置 maxmemory，可能一路吃光机器内存"],
      concepts: ["ttl-evict"],
      solves: ["p-ttl"]
    },

    {
      id: "p-consist", type: "problem", kind: "正确性", year: "", tags: ["缓存"],
      title: "数据库改了，缓存里还是旧的",
      brief: "同一份数据存了两处（数据库和缓存），怎么保证改一处不会让两边对不上？",
      detail: "任何缓存都有这个问题，只是严重程度不同。对商品详情，晚几秒更新可以接受；对账户余额，就不行。",
      example: "商品 1001 价格 100，缓存里也是 100。\n运营在后台改成 80：数据库更新成功了，但缓存没动。\n接下来最长 10 分钟（过期时间），所有用户看到的仍然是 100，下单价格却可能是 80，对不上。",
      causedBy: ["s-redis"]
    },
    {
      id: "s-deletecache", type: "solution", year: "—", tags: ["缓存"],
      title: "先改数据库，再删缓存（并用过期时间兜底）",
      brief: "更新时不去“改”缓存，而是把缓存里那条直接删掉；下次有人读时，自然会从数据库拿到最新值再写回缓存。",
      detail: "为什么是“删”而不是“改”：删是幂等的，更简单；改要先算出新值再写，并发时容易互相覆盖。顺序上建议先更新数据库、再删缓存。极端情况下（读和写并发交错）仍可能短暂读到旧值，所以再配上较短的过期时间作为兜底；对一致性要求特别高的数据，不适合放缓存。",
      example: "改价格的流程：\n　1. UPDATE products SET price = 80 WHERE id = 1001（改数据库）\n　2. DEL product:1001（删缓存）\n　3. 下一个读请求：缓存没有 → 查库得到 80 → SET product:1001 {price:80} EX 600\n\n如果第 2 步失败了怎么办？缓存最多再保留到 TTL 到期，也就是最多 10 分钟的不一致，业务能接受就行；不能接受就要加重试或消息队列来补删。",
      points: ["先更新库，再删缓存", "删比改更简单、更不容易出错", "TTL 是最后的兜底", "强一致的数据别放缓存"],
      concepts: ["cache-aside"],
      solves: ["p-consist"]
    },

    {
      id: "p-stampede", type: "problem", kind: "可靠性", year: "", tags: ["缓存"],
      title: "缓存穿透、击穿、雪崩：缓存失效的瞬间，数据库被冲垮",
      brief: "三种情形：查一个不存在的数据（穿透）；一个超级热点刚好过期（击穿）；一大批缓存同时过期（雪崩）。",
      detail: "它们的共同点：请求没能被缓存挡住，一下子全涌向了数据库。",
      example: "穿透：有人故意请求 id = -1、-2、-3……这些数据库里根本不存在，缓存里自然也没有，每次都落到数据库。\n击穿：某个爆款商品缓存刚过期的那一毫秒，1 万个请求同时发现“缓存没了”，同时去查库。\n雪崩：缓存预热时所有 key 都设了 10 分钟过期，10 分钟后同时失效，整个系统的请求一起砸向数据库。",
      points: ["穿透：查的东西根本不存在", "击穿：一个热点失效", "雪崩：大批同时失效"],
      causedBy: ["s-redis"]
    },
    {
      id: "s-defend", type: "solution", year: "—", tags: ["缓存", "可靠性"],
      title: "对症下药：空值缓存 / 布隆过滤器 / 互斥重建 / 过期时间加随机",
      brief: "穿透：不存在的也缓存一个“空”，或先用布隆过滤器挡掉。击穿：同一个 key 只让一个请求去重建缓存。雪崩：给过期时间加随机偏移，错开。",
      detail: "布隆过滤器是一种很省空间的结构，能快速回答“这个 id 肯定不存在 / 可能存在”，不存在的请求在最外层就被拦下。互斥重建：缓存过期时，抢到锁的那一个请求去查库回填，其他请求稍等或先返回旧值。",
      example: "穿透：\n　查 id=-1，数据库没有 → SET product:-1 NULL EX 60（空值缓存 60 秒），60 秒内重复查询都被缓存挡住。\n\n击穿：\n　缓存过期，1 万个请求同时来 → 只有一个 SET lock:product:1001 1 NX EX 10 成功，去查库回填；其余 9999 个等一小会儿再读缓存。\n\n雪崩：\n　过期时间不要都写 600 秒，而是 600 + random(0, 120) 秒，失效时间分散在 2 分钟内，数据库压力被摊平。",
      points: ["空值缓存、布隆过滤器 → 防穿透", "互斥锁 / 逻辑过期 → 防击穿", "TTL 加随机、多级缓存 → 防雪崩"],
      solves: ["p-stampede"]
    },

    {
      id: "p-restart", type: "problem", kind: "可靠性", year: "", tags: ["持久化"],
      title: "数据在内存里，一断电或一重启就全没了",
      brief: "当缓存用，丢了无非重新查库；但如果把 Redis 当成会话存储、计数器、队列，丢了就是真的丢了。",
      detail: "内存的特性就是掉电即失。如果 Redis 里放的不全是“可以重建的副本”，就必须想办法落盘。",
      example: "你用 Redis 存了 5 万人的登录会话和今天的下单计数。机器突然重启 → 内存清空 → 5 万人被迫重新登录，计数归零。",
      causedBy: ["s-design"]
    },
    {
      id: "s-persist", type: "solution", year: "2009+", tags: ["Redis", "持久化"],
      title: "持久化：RDB 快照 + AOF 日志",
      brief: "RDB：定时把整个内存拍一张快照存到磁盘。AOF：把每条写命令追加记到日志里，重启时重放一遍。两者可以一起用。",
      detail: "RDB 文件小、恢复快，但两次快照之间的数据会丢。AOF 更完整，可以配置每次写都落盘、每秒落盘，或交给系统；越频繁越安全，也越慢。常见折中是 appendfsync everysec：最多丢约 1 秒数据。",
      example: "配置示例：\n　save 900 1　→ 900 秒内至少有 1 次修改，就生成一次 RDB 快照\n　appendonly yes\n　appendfsync everysec　→ 每秒把日志刷到磁盘一次\n\n场景：机器在 12:00:00.5 断电。\n　只用 RDB（上次快照 11:55）：丢 5 分钟的数据。\n　开启 AOF everysec：最多丢最后约 1 秒。",
      points: ["RDB：快照，恢复快，可能丢一段时间的数据", "AOF：写命令日志，更完整", "everysec：最常用的折中"],
      solves: ["p-restart"]
    },

    {
      id: "p-spof", type: "problem", kind: "可靠性", year: "", tags: ["高可用"],
      title: "只有一台：它挂了全站受影响，容量也到顶了",
      brief: "单台 Redis 既是单点故障，又受限于一台机器的内存。数据再多、请求再多，也无法继续扩容。",
      detail: "持久化只能保证“数据还在磁盘上”，不能保证“服务一直可用”。机器坏了，要有人手动换机器、恢复数据，这段时间业务就停了。",
      causedBy: ["s-persist"]
    },
    {
      id: "s-ha", type: "solution", year: "2012–2015", tags: ["Redis", "高可用"],
      title: "主从复制 + 哨兵 + Cluster 分片",
      brief: "主从：从库实时复制主库，主库挂了从库顶上。哨兵：自动发现主库挂了并完成切换。Cluster：把数据按哈希槽分散到多台主库，容量和吞吐一起扩。",
      detail: "主从解决数据备份和读扩展；哨兵解决自动故障转移；Cluster 解决单机容量和写入上限。Cluster 把所有 key 分到 16384 个槽，每个槽由某个主节点负责，客户端算一下 key 属于哪个槽就知道该找谁。",
      example: "槽的计算：slot = CRC16(key) % 16384\n例如 key = user:1001 → 算出槽 5474。\n\n3 个主节点的 Cluster：\n　节点 A 负责槽 0～5460\n　节点 B 负责槽 5461～10922\n　节点 C 负责槽 10923～16383\nuser:1001 在槽 5474 → 落在节点 B。\n\n节点 B 挂了：它的从节点自动升为主节点，其他节点投票确认，整个过程几十秒内自动完成，业务基本无感。\n注意：涉及多个 key 的命令，要求这些 key 在同一个槽里（可以用 {user:1001}:cart 这种 hash tag 强制同槽）。",
      points: ["主从：备份 + 读扩展", "哨兵：自动故障转移", "Cluster：16384 个槽，数据和压力分散到多台机器"],
      concepts: ["hash-slot"],
      solves: ["p-spof"]
    },

    {
      id: "p-race", type: "problem", kind: "正确性", year: "", tags: ["并发"],
      title: "多个服务同时抢同一份资源：超卖、重复处理",
      brief: "多台服务器、多个线程同时“读—判断—写”，中间被别人插了一脚，结果就乱了。",
      detail: "在单个程序里可以加线程锁，但跨多台机器就没用了。需要一个所有机器都能看到的、可靠的“占坑”方式。",
      example: "秒杀：库存还剩 1 件，A、B 两个请求几乎同时来。\n　A：读到库存 1 → 判断够 → 准备扣减\n　B：读到库存 1 → 判断够 → 准备扣减\n　A、B 都下单成功，库存变成 -1（超卖）。",
      causedBy: ["s-redis"]
    },
    {
      id: "s-lock", type: "solution", year: "—", tags: ["Redis", "并发"],
      title: "原子命令 + Lua 脚本 + 分布式锁",
      brief: "能用单条原子命令就用原子命令（DECR、INCR）；多步操作写成 Lua 脚本一次性执行；需要互斥时用 SET NX 做分布式锁。",
      detail: "Redis 单线程执行命令，所以单条命令和 Lua 脚本都是原子的，中间不会被插队。分布式锁的关键：加锁时设过期时间（防止持锁方挂了锁永远不释放），锁的值用唯一 ID，释放时先检查“是不是我的锁”再删（要用 Lua 保证检查和删除是一步）。",
      example: "扣库存（原子）：\n　DECR stock:1001　→ 返回扣完后的值；如果 < 0，说明超卖了，再 INCR 补回并告诉用户“已售罄”。\n\n分布式锁：\n　加锁：SET lock:order:1001 <我的唯一ID> NX PX 30000\n　　NX：只有 key 不存在才设置成功；PX 30000：30 秒后自动过期\n　　返回 OK 表示抢到了，返回 nil 表示别人占着\n　释放（Lua，保证原子）：\n　　if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end\n\n为什么要检查唯一 ID：A 的锁因为业务慢到期了，B 拿到了新的锁；这时 A 干完活去释放，如果不检查就会把 B 的锁删了。",
      points: ["单命令 / Lua 脚本天然原子", "分布式锁：NX + 过期时间 + 唯一值 + 安全释放", "锁过期可能导致两人同时持锁，关键业务要有兜底（如数据库唯一约束）"],
      concepts: ["atomic-op"],
      solves: ["p-race"]
    },

    {
      id: "p-queue", type: "problem", kind: "能力", year: "", tags: ["消息"],
      title: "下单之后要发短信、扣积分、写日志，怎么不让用户等？",
      brief: "这些事不必在用户点下单的那一刻同步做完，但又不能丢。需要一个“先放着，后面有人慢慢处理”的地方。",
      detail: "如果下单接口里同步把所有后续事情做完，接口会很慢，而且任何一步失败都会拖垮整个下单。更好的方式是只做最关键的部分，其余扔进队列异步处理。",
      causedBy: ["s-redis"]
    },
    {
      id: "s-stream", type: "solution", year: "2018", tags: ["Redis", "消息"],
      title: "用 List 做简单队列，用 Streams 做可靠的消息队列",
      brief: "List 可以 LPUSH 放、BRPOP 取，最简单。Streams 支持消费组、确认（ACK）、未确认的消息可以被重新领取，更接近真正的消息队列。",
      detail: "List 的问题是：消息被取走后，如果消费者在处理中途挂了，这条消息就丢了。Streams 引入了“消费组”和“待确认列表”：消息被读取后进入待确认状态，处理完发 ACK 才算完成，没确认的可以让别的消费者接手。Pub/Sub 则是即发即忘，没人订阅时消息就丢了，不适合要求可靠的场景。",
      example: "下单后发短信：\n　生产者：XADD orders * order_id 1001 phone 138xxxx　→ 往队列里放一条消息\n　创建消费组：XGROUP CREATE orders sms-workers $ MKSTREAM\n　消费者：XREADGROUP GROUP sms-workers w1 COUNT 1 STREAMS orders >　→ 领一条\n　发完短信：XACK orders sms-workers <消息ID>　→ 确认处理完成\n\n消费者 w1 在发短信途中崩溃，没来得及 XACK → 这条消息还留在“待确认列表”里，w2 可以用 XAUTOCLAIM 把它接过来重新处理。",
      points: ["List：简单，但取走即丢", "Streams：消费组 + ACK + 可重领", "Pub/Sub：不存储，订阅者不在就丢", "对可靠性要求很高、吞吐极大的场景，仍建议用专业的消息队列"],
      concepts: ["message-queue"],
      solves: ["p-queue"]
    },

    {
      id: "p-semantic", type: "problem", kind: "能力", year: "", tags: ["AI"],
      title: "AI 应用来了：问法不同但意思一样的问题，怎么也能命中缓存？",
      brief: "传统缓存按 key 精确匹配。用户问“怎么重置密码”和“忘记密码了怎么办”，字面不同，缓存就不认。",
      detail: "大模型每次调用又慢又贵，用户的问题又高度重复，但措辞千变万化。需要一种“按意思”而不是“按字面”来查缓存的办法。",
      causedBy: ["s-datatypes"]
    },
    {
      id: "s-vector", type: "solution", year: "2022+", tags: ["Redis", "AI"],
      title: "Redis 向量检索 + 语义缓存",
      brief: "把问题转成向量存进 Redis，新问题进来时找最相似的旧问题；相似度够高就直接返回旧答案，不用再调大模型。",
      detail: "Redis 支持向量字段和近似最近邻检索（比如 HNSW 索引）。语义缓存的关键是相似度阈值：设得太低会答非所问，太高又命中不了。通常要用真实的数据反复调。同样的能力也能用来做 RAG 的向量检索（见 Agent 章节）。",
      example: "缓存里已有：\n　问题：怎么重置密码 → 向量 v1，答案：「在设置页点‘忘记密码’，按提示验证邮箱……」\n\n新来一个问题：忘记密码了怎么办\n　转成向量 v2，在 Redis 里查最相似的一条 → 找到 v1，相似度 0.93\n　阈值设为 0.90 → 命中，直接返回旧答案，省掉一次大模型调用（省钱、省时间）。\n\n再来一个：怎么修改手机号\n　最相似的是 v1，相似度只有 0.55 → 低于阈值，不命中，正常去问大模型，并把新问答也存进缓存。",
      points: ["向量字段 + 近似最近邻索引", "相似度阈值是关键，要用真实数据调", "同一个 Redis 既能做普通缓存，又能做语义缓存"],
      concepts: ["vector-search", "embedding"],
      solves: ["p-semantic"]
    }
  ]
});

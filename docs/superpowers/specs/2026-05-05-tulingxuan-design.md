# 图灵选 (Tulingxuan) · 设计文档

> AI 海选评审工作台 — 给 AI 创意从业者的批量图筛选驾驶舱

**版本**：v1（设计阶段）
**日期**：2026-05-05
**作者**：shengdi
**项目仓库**：`/home/zsd/zsd2/tulingxuan/`

---

## 1. 一句话定位

图灵选把"500 张候选图 → 8 张能用图"的过程，从 2 小时压到 15 分钟。

## 2. 目标用户与核心场景

### 主用户
电商/营销/内容团队的 art director 或 AIGC operator，每周要从 SD/Midjourney/即梦/可灵 跑出几百张候选，再筛出能上线的素材。

### 次用户
独立 AI 创作者，对单组变体做精修对比。

### 一次任务的标准长相
1. 早上跑完一轮 prompt，收获 200 张候选图，丢进文件夹
2. 在图灵选里**新建项目**，把文件夹拖进来
3. **后台 AI 自动跑分析**（5-10 秒就开始有结果流式回填，用户不用等）
4. 用户**先看 AI 聚类**：500 张被聚成 ~30 组，每组留代表图
5. 进**网格视图**，键盘流快速过：J/K 翻图，F/D/Space 标好/差/待定，1-5 评分
6. 切到"待定 + 评分 ≥ 4"子集进**对比模式**，2x2 看细节决断
7. **导出**：选中图复制到目标文件夹，附 CSV（含 AI 标签 / 评分 / 用户标记 / prompt 反推）

## 3. 产品定位与取舍

### 核心承诺
1. **AI 不是装饰**：质量分/美学分作为筛选维度，自然语言作为搜索入口，相似图聚类作为浏览的第一视角
2. **键盘流第一**：所有高频动作都有快捷键
3. **本地优先 + 沉淀决策**：图不复制（只索引路径），元数据持久化，下次打开秒开

### 故意不做（写进 README）
- ❌ 在线协作 / 评论 / 多人评审 — 3 天预算下做就半残
- ❌ 图片编辑/修图 — 超出"筛选评审"定位
- ❌ 云端图床/同步 — 本地优先简单且匹配真实工作流
- ❌ 完整图库管理 — 项目制聚焦"批次决策"场景

## 4. UI 信息架构

3 个顶级页面，主战场内含 4 种视图。

### 页面 ① 项目列表（Home）
- 空状态：大号"拖入文件夹新建项目"区域 + 30 字定位文案
- 项目卡片：4 宫格自动封面（来自评分前 4）/ 名称 / 总图数 / 已决策数 / 上次打开 / AI 进度

### 页面 ② 项目工作区（主战场）

```
┌─顶栏────────────────────────────────────────────────────────┐
│ ← 项目名  [⊞网格 / ⚇聚类 / ⊟对比 / ◉单图]  🔍搜索  ⤓导出 │
├─Filter Sidebar──┬─主视图区──────────────────┬─Inspector──┤
│ 状态/评分/标签   │                            │ 当前选中图  │
│ AI 标签 facet   │     [视图]                 │ AI 元数据   │
│ 质量/美学滑块    │                            │ 用户操作    │
└─────────────────┴────────────────────────────┴────────────┤
│ 底栏：AI 分析进度 + 选中数 + 快捷键提示                    │
└─────────────────────────────────────────────────────────────┘
```

**4 种视图**

| 视图 | 何时进入 | 核心动作 |
|---|---|---|
| 网格 | 默认 | 虚拟滚动浏览 + 键盘流决策 |
| 聚类 | 数字键 2 / 顶栏切换 | 看 AI 聚类组带，从 500 张缩到 30 张代表图 |
| 对比 | 多选 2-4 张后按 C | 2x2 平铺，同步缩放/平移，AI 评审建议 |
| 单图 | Enter | Quick Look 风格沉浸细节 |

### 页面 ③ 设置
- API Key 配置（豆包必填，智谱可选 fallback）
- 缩略图缓存路径与体积管理
- 快捷键速查（写死）

### 全局快捷键

| 键 | 动作 |
|---|---|
| `J/K` | 上一张/下一张 |
| `H/L` | 左/右 |
| `1-5` | 评分 |
| `F` / `D` / `Space` | 标好 / 差 / 待定 |
| `0` | 清除决策 |
| `Enter` | 进入单图视图 |
| `Esc` | 退出当前视图/选区 |
| `Cmd/Ctrl + A` | 全选当前过滤集 |
| `C` | 进入对比视图（需 2-4 张选中） |
| `1/2/3/4` | 切到对应顶栏视图 |
| `/` | 聚焦搜索框 |
| `Cmd/Ctrl + E` | 导出选中 |

### 关键交互判断
1. 左侧 facet 不是装饰，是用户做"剪枝"的核心工具，AI 标签和质量分作为可勾选筛选维度
2. 聚类视图是"用了一次就会爱上"的体验，但默认进入网格，让新用户从直觉开始
3. Inspector 永远在右侧、永远在场，避免"点击图弹模态框"打断动作
4. 数字键切视图，鼠标用户用顶栏按钮，两套并存

## 5. 数据模型

### 5.1 磁盘布局

```
<Electron userData>/
  tulingxuan.db         # 全局 SQLite，所有项目元数据
  thumbs/<hash>.jpg     # 256px 缩略图，按内容 hash 命名（同图共享）
  cache/ai/<hash>.json  # AI 分析结果缓存（按内容 hash），同图不重跑
  logs/
```

**关键决策：图片本体不复制**，库里只存绝对路径。
- 收益：本地优先承诺；专业用户痛点解决（不偷偷复制几个 GB）
- 代价：原图被删/移会变"找不到"
- 处理：打开项目时检测，UI 用红角标提示，提供"重新定位文件夹"按钮

### 5.2 SQLite Schema（better-sqlite3）

```sql
projects(id, name, source_dir, created_at, updated_at,
         cover_hash_1, cover_hash_2, cover_hash_3, cover_hash_4)

images(
  id, project_id, path, filename, hash,
  size_bytes, width, height, imported_at,
  -- AI 字段（异步填充）
  ai_status,           -- pending|running|done|error
  ai_quality_score,    -- 0-100
  ai_aesthetic_score,  -- 0-100
  ai_caption,          -- 结构化描述
  ai_prompt_guess,     -- prompt 反推（来自单图分析，零额外成本）
  ai_embedding BLOB,   -- float32 向量
  ai_cluster_id,
  ai_error,
  ai_analyzed_at,
  -- 用户决策
  user_status,         -- good|bad|maybe|null
  user_score,          -- 1-5
  user_note,
  decided_at
)

image_tags(image_id, tag_category, tag_value)
  -- tag_category: style/subject/mood/palette/issue
  -- issue 专标 AI 病灶：手指畸形/文字乱码/人脸扭曲/无

clusters(project_id, id, representative_image_id, size, summary)
```

**索引**：
- `(project_id, user_status)`
- `(project_id, ai_quality_score)`
- `(project_id, ai_cluster_id)`
- `tags(category, value)`

**为什么单一全局 DB 而不是 per-project**：3 天预算下查询/索引更简单；权衡：项目"分享"成本高（写入取舍清单）。

## 6. 进程架构

```
┌── Main Process (Node) ──────────────────────────┐
│  Services（IPC 是唯一对外接口）                   │
│  ├── DatabaseService    (better-sqlite3 同步)    │
│  ├── FileService        (扫文件夹 + hash + watch)│
│  ├── ThumbnailService   (sharp + worker_threads) │
│  ├── AIService          (豆包/智谱 客户端)        │
│  ├── AnalysisQueue      (优先级队列 + 并发=3)     │
│  ├── ClusteringService  (k-means)                │
│  └── ExportService                                │
│  Custom protocols                                 │
│  ├── tlx-thumb://<hash>   →  thumbs/              │
│  └── tlx-image://<id>     →  原图路径              │
└─────────────────────┬───────────────────────────┘
                      │ contextBridge 强类型 API
┌─── Renderer (React) ▼ ──────────────────────────┐
│  状态                                              │
│  ├── TanStack Query (服务端态)                    │
│  └── Zustand        (UI 态：视图/选区/过滤)       │
│  组件                                              │
│  ├── pages/Home Workspace Settings                │
│  ├── views/Grid Cluster Compare Single            │
│  ├── components/FilterSidebar Inspector TopBar    │
│  └── hooks/useKeyboardCommand useImageList        │
│  虚拟滚动：@tanstack/react-virtual                  │
└─────────────────────────────────────────────────┘
```

### 6.1 IPC API（zod 双端校验）

```ts
// 项目
projects.list() : Project[]
projects.create({ sourceDir, name? }) : Project
projects.open(id) : Project
projects.delete(id) : void

// 图查询（核心）
images.query({
  projectId,
  filters: {
    status?: ('good'|'bad'|'maybe'|null)[],
    scoreRange?: [number, number],
    qualityRange?: [number, number],
    aestheticRange?: [number, number],
    tags?: { category, value }[],
    clusterId?: number,
    naturalLanguage?: string,  // 触发 embedding 检索
  },
  sort: 'imported'|'quality'|'aesthetic'|'score',
  cursor, limit
}) : { items, nextCursor, total }

// 决策
images.updateDecision({ id, status?, score?, note? })

// AI（异步，进度通过事件）
ai.startAnalysis({ projectId })
ai.cancelAnalysis({ projectId })
ai.suggestPrompt({ imageId })  // 直接读 ai_prompt_guess
ai.compareImages({ imageIds })

// 聚类
clustering.compute({ projectId })

// 导出
export.run({ projectId, imageIds, targetDir, includeCsv })
```

### 6.2 事件通道（renderer 订阅）
- `ai:progress` → `{ projectId, done, total, current }`
- `ai:image-updated` → `{ imageId }`（让 React Query refetch 那张图）
- `import:progress` → `{ projectId, done, total }`

### 6.3 流式 AI 体验关键
1. 导入后立刻进网格，缩略图先生成（worker pool），AI 异步另起
2. AI 队列按"用户当前可视区"优先级
3. 每张图分析完 → 主进程更新 DB → 发 `ai:image-updated` → renderer refetch → 网格里那张图"亮起来"
4. 顶栏 1px 进度条 + 底栏文字，**永远不弹模态框**
5. 用户随时能操作未分析的图（手动评分、决策都不依赖 AI）

## 7. AI 集成设计

### 7.1 单图分析（一次调用拿到全部）

每张图调一次 `doubao-1.5-vision-pro`，JSON Mode 强制结构化输出。

**System Prompt**（写进 `src/main/ai/prompts.ts`，作为产品核心资产）：

```
你是 AI 图片审稿助手，专门帮电商/营销团队从大量 AI 生成图中挑选可用素材。
分析下面这张图，严格按 JSON schema 返回。

评分要点（0-100，按"专业素材使用"标准，避免居中）：
- quality_score: 技术质量。检查清晰度、伪影、文字乱码、肢体畸形（手指、面部、眼睛）、
  逻辑错误（穿模、不合理阴影）。一处明显畸形扣 30 分。
- aesthetic_score: 美学价值。构图、色彩、氛围、情绪传达。通用素材给中等分，
  有亮点（独特视角/惊艳色彩/强情绪）才高分。

标签要点（每个分类 1-3 个，简洁中文）：
- style: 画风（写实/二次元/3D/水彩/赛博朋克 等）
- subject: 主体（女性肖像/产品摆拍/风景/动物 等）
- mood: 情绪（温暖/冷峻/活力/忧郁 等）
- palette: 配色（暖/冷/高对比/莫兰迪 等）
- issue: 问题（手指畸形/文字乱码/构图失衡/无）

caption: 1-2 句客观描述，给检索用。
prompt_guess: 推测的英文 prompt（≤30 词），后续给用户做生图迭代参考。
```

**输出 schema**：
```json
{
  "quality_score": 85,
  "aesthetic_score": 72,
  "tags": {
    "style": ["写实", "电影感"],
    "subject": ["女性肖像"],
    "mood": ["温暖", "宁静"],
    "palette": ["暖色调", "金色"],
    "issue": ["无"]
  },
  "caption": "黄昏窗边，暖色光线照在年轻女性侧脸，背景虚化的咖啡馆。写实电影感画风。",
  "prompt_guess": "young woman portrait, side view, warm sunset light, café background, cinematic, shallow depth of field"
}
```

**实现细节**：
- 图片传 base64
- 失败重试 3 次（指数退避 1s/2s/4s）
- 解析失败用 zod 校验 + 1 次重试 + 保守默认值
- 缓存：`(image_hash, prompt_version)` 为 key 存 `cache/ai/<hash>.json`
- 单图成本 ≈ ¥0.006

### 7.2 Embedding 与聚类（差异化核心）

1. 单图分析完，立即用 `caption + tags 拼接` 调 `doubao-embedding`，1024 维
2. 80% 图分析完触发聚类（不等 100%）
3. **k 选择**：`k = clamp(round(N/12), 5, 30)`，目标平均 12 张/组
4. **k-means**（cosine 距离）跑 3 次取最优，纯 JS 实现 ~50 行
5. 代表图 = 离质心最近
6. 组总结：每组取代表图 + 3 张随机调一次 vision，返回中文一句话

**为什么 caption→text-embed 路径有效**（写进 README 取舍）：
- "相似"不是像素级，是"同一类素材"——caption 已抽象到这个层级
- 比图像 embedding 更可控：用户能看到 caption 知道为什么聚一组
- 不依赖国内没好用的图像 embedding API，不打 200MB 本地 CLIP

### 7.3 自然语言搜图

1. query 调 `doubao-embedding` 拿向量
2. 项目内对所有 `ai_embedding` 算 cosine（500 张内存计算 < 50ms）
3. （可选 P2）top 30 用 vision 模型二阶段重排
4. 结果作为网格视图过滤器，可与左侧 facet 叠加

### 7.4 Prompt 反推 (P1)

直接复用单图分析的 `prompt_guess` 字段，**零额外 API 成本**。Inspector 提供"复制 prompt"按钮。

### 7.5 AI 评审建议 (P2)

对比视图选中 2-4 张时，点按钮触发：
```
你是图片选品专家。下面是 N 张候选图，已包含分析数据。
请用结构化中文回答，≤150 字：
1. 共同优点
2. 各张图的独特点
3. 推荐选哪张做素材，理由是什么
```
- 把已有 caption + tags + scores 全塞上下文
- 单次成本 ≈ ¥0.03

### 7.6 批量改 prompt 重出 (P2，最易砍)

多选 N 张满意的图 → 取 caption + tags + prompt_guess → 调豆包 LLM（无视觉）→ 给 3 条改进版 prompt。

### 7.7 成本预估（最坏情况，500 张图全功能用一遍）

| 调用 | 次数 | 单价 | 小计 |
|---|---|---|---|
| 单图 vision 分析 | 500 | ¥0.006 | ¥3.0 |
| Caption embedding | 500 | ¥0.0001 | ¥0.05 |
| 聚类总结 vision | 30 | ¥0.006 | ¥0.18 |
| 自然语言搜索 embed | ~20 次 | ¥0.0001 | <¥0.01 |
| AI 评审建议 | ~10 次 | ¥0.03 | ¥0.3 |
| 批量改 prompt | ~5 次 | ¥0.005 | ¥0.025 |
| **合计** | | | **≈ ¥3.6** |

### 7.8 速率/降级

- 豆包并发限 3，队列按用户视口优先调度
- 用户切换视图/项目，未发出请求自动 abort
- 豆包连续失败 5 次 → 自动切智谱 GLM-4V-Flash
- 智谱也挂 → UI 提示"AI 服务异常"+ 重试按钮，**手动评分/决策仍可用**

### 7.9 README 总结段（候选）

> 图灵选把 AI 嵌进了筛选工作流的每个关键节点，不是塞在角落：
> - **入口**：AI 把 500 张图聚成 ~30 组
> - **筛选**：AI 标签和质量分作为左侧 facet 勾选项
> - **检索**：自然语言成为搜索入口
> - **决策**：对比视图给出推荐与差异
> - **迭代**：从 prompt 反推到批量 prompt 改写
>
> 每个节点都不阻塞用户：AI 后台流式更新，用户随时能用纯人工流程绕过。

## 8. 错误处理与边界

| 场景 | 处理 |
|---|---|
| 文件夹有非图片 | 扩展名 + 文件头双重判断，UI 提示"已忽略 X 个" |
| 损坏/无法解码图 | 标 `import_error`，灰色占位 + 红角标，不阻塞其他 |
| 几千张图导入 | 分批 100，已导入立刻显示，缩略图后台流式 |
| 原图被移动/删除 | `fs.access` 检测，标 `missing`，提供"重新定位文件夹" |
| 重复导入同文件夹 | 提示"该路径已是项目 X，是否打开？" |
| 同一项目内同图 | 按 hash 自动去重 |
| AI 429/超时 | 指数退避重试 3 次，最终失败标 error |
| AI JSON 解析失败 | zod 校验 + 1 次重试 + 保守默认值 |
| API key 无效 | 启动检测，跳 Settings 页，AI 入口禁用但产品仍可用 |
| 用户中途关项目 | 内存任务自动 abort，DB 事务保持一致 |
| 网络断开 | 顶部黄条提示，恢复后续跑队列 |
| 缩略图占满磁盘 | Settings 显示缓存大小 + 一键清理 |

**两条铁律**：
1. **AI 失败永远不阻塞主流程**：评分、决策、过滤、导出和 AI 解耦
2. **数据永远不丢**：用户决策即时落库；崩溃重启状态完整恢复

## 9. 测试策略（3 天预算下的克制）

### 单元测试（vitest）
- `ai/parseAnalysisResponse.test.ts` — JSON 解析鲁棒性
- `ai/clustering.test.ts` — k-means 在已知数据上正确分组
- `db/imageQuery.test.ts` — 组合过滤 SQL 生成与结果
- `services/exportService.test.ts` — CSV 字段、文件名冲突
- `utils/keyboard.test.ts` — 快捷键 dispatcher 不串键

### E2E（Playwright，1 个 happy path）
导入 fixture（10 张本地小图）→ mock AI 返回 → 键盘流标几张 → 切聚类 → 切对比 → 导出 → 检查目标产物。

### 手动测试 checklist（README 列出）
- 200 张图导入不卡顿
- 1000 张图滚动不掉帧（虚拟滚动）
- 全程拔网络再插，状态正确恢复
- 关闭重开，所有决策都在

### MOCK_AI 模式
`AIService` 检查 `MOCK_AI=true` 环境变量返回桩数据。**评审者无需 API key 即可体验主流程**——这是关键加分项。

## 10. 关键工程决策一览（README 直接引用）

| 决策 | 替代方案 | 选择理由 |
|---|---|---|
| Electron + React + TS | Tauri / Web+FSA | 3 天预算下最不抢戏，把时间留给产品判断 |
| 单一全局 SQLite | per-project 文件 | 查询/索引简单；分享场景不在 demo |
| better-sqlite3（同步） | sqlite3（异步） | API 简单 5 倍，主进程 sync IO 不卡 renderer |
| 不复制原图 | 复制到项目目录 | 本地优先 + 专业用户痛点 |
| caption→text-embed | 本地 CLIP / 国际图像 embedding | 国内 API + 不打 200MB 模型 + 3 天预算 |
| 自定义协议 `tlx-image://` | base64 / file:// | 性能 + 安全 |
| AI 并发=3 | 1 / 10 | 豆包 RPM 限制 + 体验"图在长出来" |
| k-means 自动 k | HDBSCAN | 实现 50 行；HDBSCAN 是大杀器但 3 天不值得 |
| TanStack Query + Zustand | Redux / 自建 | 服务端/UI 态分离；LLM 写得好 |
| Prompt 反推复用单图分析 | 单独调用 | 零额外成本的工程巧思 |

## 11. 交付内容

1. **代码仓库**
   - 干净的 commit 历史（每次有意义进度一个 commit）
   - `pnpm install && pnpm dev` 一键跑起来
   - `MOCK_AI=true` 运行模式
   - fixture 测试文件夹（30 张小图）

2. **README**
   - 我为谁做这个？什么场景？
   - 我的判断与取舍（含决策表）
   - AI 是怎么"嵌进"工作流的
   - 怎么运行（含 MOCK 模式）
   - 架构概览（含 Mermaid 图）
   - 我用 AI 怎么做这个项目（题目要求章节）
   - 已知不足与下一步
   - 快捷键速查表

3. **30 秒工作流录屏**（`docs/demo.mp4`）
   - 导入 → 聚类视图惊艳 → 键盘流筛选 → 对比模式 → 导出

4. **决策日志**（`docs/decisions.md`）
   - 5-10 条关键决策，每条 3 行：选了什么 / 替代是什么 / 为什么

## 12. 3 天施工时间表

| 时段 | 产出 | 演示就绪？ |
|---|---|---|
| Day 1 早 | 项目脚手架 + Electron 壳 + SQLite + 文件夹导入 + 缩略图 | — |
| Day 1 晚 | 网格视图 + 键盘流 + 项目管理 | ✓（最朴素版） |
| Day 2 早 | 豆包 vision 集成 + 单图分析 + 进度条 + facet 筛选 | ✓ |
| Day 2 晚 | Embedding + 聚类视图 + 自然语言搜图 | ✓（核心差异化） |
| Day 3 早 | 对比视图 + AI 评审建议 + Inspector + Prompt 反推 | ✓ |
| Day 3 中 | 导出 + Settings + 错误处理 + 测试 | ✓ |
| Day 3 晚 | 录屏 + README + 决策日志 + 提交 | 最终交付 |

**A 方案精髓**：每晚结束都能跑、能演示。被砍功能（P2 的 AI 评审建议、批量改 prompt）是面试官最不会扣分的——P0/P1 全在，主流程完整。

### 砍功能优先级（从最先砍到最后砍）
1. P2-7 批量改 prompt 重出
2. P2-6 AI 评审建议
3. P1-5 Prompt 反推 *（实际不会砍，零成本）*
4. P1-4 相似图聚类 *（不能砍，海选场景核心）*
5. 极简对比模式 *（不能砍，题面给定）*

## 13. 题目要求章节预备（写进 README）

### 我用 AI 怎么完成这个项目
- **设计阶段**：用 Claude Code 做产品 brainstorm，逐步对齐场景定位、技术取舍、AI 集成方案。让 AI 扮演"提问者"而不是"答题者"——每次只问一个聚焦的判断题，迫使我自己做出权衡
- **实现阶段**：用 Claude Code 写脚手架、IPC 类型定义、单元测试。复杂模块（聚类、流式 AI）我会先口述设计再让它落代码
- **调试阶段**：报错先让它分析定位，再决定改不改
- **写文档阶段**：让它根据代码生成初稿，我重写关键判断段落

### 我没采纳的 AI 建议（举例）
- AI 建议用 Tauri：我评估后选 Electron。理由：3 天预算下 Rust 工具链不可控
- AI 建议本地 CLIP 做 embedding：我用 caption→text-embed 替代。理由：包体积/复杂度不值得
- AI 建议加在线协作：我砍掉。理由：违背"完成度优先"

### 一句心得
**AI 是放大判断力，不是替代判断力。**让 AI 帮你做判断 = 平庸；让 AI 帮你执行已经做好的判断 = 高效。

---

## 附录 A：项目目录结构（实施时遵循）

```
tulingxuan/
├── docs/
│   ├── superpowers/
│   │   └── specs/
│   │       └── 2026-05-05-tulingxuan-design.md
│   ├── decisions.md
│   └── demo.mp4
├── electron/
│   ├── main/
│   │   ├── index.ts
│   │   ├── ipc/
│   │   ├── services/
│   │   │   ├── DatabaseService.ts
│   │   │   ├── FileService.ts
│   │   │   ├── ThumbnailService.ts
│   │   │   ├── AIService.ts
│   │   │   ├── AnalysisQueue.ts
│   │   │   ├── ClusteringService.ts
│   │   │   └── ExportService.ts
│   │   ├── ai/
│   │   │   ├── doubao.ts
│   │   │   ├── zhipu.ts
│   │   │   ├── prompts.ts
│   │   │   ├── kmeans.ts
│   │   │   └── parseResponse.ts
│   │   └── db/
│   │       ├── schema.sql
│   │       └── migrations/
│   └── preload/
│       └── index.ts
├── src/                     # renderer
│   ├── main.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Workspace.tsx
│   │   └── Settings.tsx
│   ├── views/
│   │   ├── GridView.tsx
│   │   ├── ClusterView.tsx
│   │   ├── CompareView.tsx
│   │   └── SingleView.tsx
│   ├── components/
│   │   ├── FilterSidebar.tsx
│   │   ├── Inspector.tsx
│   │   ├── TopBar.tsx
│   │   └── ImageCard.tsx
│   ├── hooks/
│   │   ├── useKeyboardCommand.ts
│   │   ├── useImageList.ts
│   │   └── useAIProgress.ts
│   ├── stores/
│   │   └── workspaceStore.ts (Zustand)
│   └── lib/
│       └── ipc.ts (typed wrapper around contextBridge)
├── shared/
│   └── types.ts (zod schemas + TS types)
├── tests/
│   ├── unit/
│   ├── e2e/
│   └── fixtures/images/
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── electron.vite.config.ts
├── tsconfig.json
├── README.md
└── .env.example
```

## 附录 B：包依赖速查

```
runtime:
  electron, electron-vite (or electron-builder)
  react, react-dom
  @tanstack/react-query
  @tanstack/react-virtual
  zustand
  zod
  better-sqlite3
  sharp
  axios (or native fetch)

dev:
  vite, typescript
  vitest, @testing-library/react
  playwright
  eslint, prettier
```

## 附录 C：开放问题（实施时再决）

- 缩略图 worker pool 用 `worker_threads` 还是 Electron `utilityProcess`？倾向后者（更隔离）
- 项目封面 4 宫格的更新策略：每次决策后 lazy 更新，还是定时？倾向 lazy
- 图片支持的格式范围：jpg/png/webp/avif 是否够？暂定够，gif 不支持（动图筛选场景不同）
- 是否需要"撤销"操作？倾向不做（每个动作都是单一字段更新，容错由"清除决策"键覆盖）

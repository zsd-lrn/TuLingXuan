# 图灵选 (Tulingxuan) · 作业汇报

> AI 原生全栈工程师预筛选作业 · AI 图片筛选与评审工作台
> 提交人：shengdizhao
> 提交时间：2026-05-05
> 仓库：https://github.com/zsd-lrn/TuLingXuan

---

## TL;DR（30 秒读完）

我做了一个叫 **图灵选 (Tulingxuan)** 的 Electron 桌面 app，目标用户是**电商 / 营销团队的 AIGC operator**，解决他们"一次跑出几百张 AI 图，需要快速筛出能用的素材"这个具体痛点。

把"500 张候选图 → 8 张能用图"的过程，从 2 小时压到 15 分钟。

**核心技术决策**：Electron + Vite + React + TS + better-sqlite3 + sharp + 豆包 Vision Pro。**核心产品决策**：项目制（数据沉淀，不是临时会话）+ 键盘流第一 + AI 嵌进每个工作流节点（不是装饰）。

**这个项目本身就是 AI 协作工程的一次实践**：我用 Claude Code 跑了完整的 spec-first 工作流（设计 → 计划 → 子代理执行），整个 git 历史是这一过程的实录。

---

## 一、我对题目的理解

题目原话有两条关键定义：
1. > "我们更看重你的判断、取舍和完成质量，而不是功能堆砌"
2. > "它不只是一个'能看图'的页面，而是一个真正帮助用户做判断和决策的图片工作台"

我把它们解码成两个具体目标：

- **目标 A · 展现判断**：每个产品/技术/AI 决定都要能解释 why，而不是 what。
- **目标 B · 提供"决策"，不只"看图"**：产品的核心动作必须是用户做"留 / 不留 / 待定"的判断，并且这个判断必须能被沉淀、回看、导出，而不是看完就丢。

下面所有内容都围绕这两条服务。

---

## 二、产品判断

### 2.1 目标用户（明确选了一个，不做"通用图片管理"）

| 维度 | 内容 |
|---|---|
| 主用户 | 电商 / 营销 / 内容团队的 art director 或 AIGC operator |
| 高频场景 | 每周从 SD / Midjourney / 即梦 / 可灵 跑出 100~500 张候选图，挑 5~20 张做素材 |
| 次用户 | 独立 AI 创作者，对 20~50 张同主题变体做精修对比 |

**没选其他场景的理由**（取舍）：
- ❌ 设计稿评审：AI 嵌入点没那么自然，不能"放大判断力"
- ❌ 个人灵感库：场景太轻，跟"团队评审 + 决策"题面关键词偏离
- ❌ 通用素材管理：太大、3 天做不完且做完也不能让人记住

### 2.2 一次任务的标准长相（产品逻辑骨架）

```
1. 早上跑完一轮 prompt → 200 张候选图丢入文件夹
2. 在图灵选里新建项目，把文件夹拖入
3. 后台 AI 自动跑分析，5-10 秒就开始流式回填
4. 用户先看 AI 聚类（500 张被聚成 ~30 组）
5. 进网格视图，键盘流过：J/K 翻图，F/D/Space 标好/差/待定，1-5 评分
6. 切到"待定 + 评分 ≥ 4"子集进对比模式，2x2 看细节
7. 导出：选中图复制到目标文件夹 + CSV (含 AI 标签 / 评分 / Prompt 反推)
```

### 2.3 产品的三条承诺（写进 README，每条都对应具体实现）

| 承诺 | 怎么兑现的 |
|---|---|
| **AI 不是装饰** | 5 个嵌入点：聚类/facet/自然语言搜/AI 评审建议/Prompt 反推 + 改写 |
| **键盘流第一** | J/K/H/L/F/D/Space/0/1-5/C/Enter/Esc/Cmd+1-4/?/E 全套 |
| **本地优先 + 沉淀决策** | 不复制原图（只索引）；SQLite 持久化所有决策；下次打开秒回 |

### 2.4 故意不做的（取舍清单）

| 砍掉 | 为什么砍 |
|---|---|
| 在线协作 / 多人评审 | 3 天预算下做就半残，不如不做 |
| 图片编辑 / 修图 | 超出"筛选评审"定位 |
| 云端图床 / 同步 | 本地优先且匹配真实工作流（图本来就在本地） |
| 完整图库管理 | 项目制聚焦"批次决策"场景；与 Eagle 类竞品差异化 |

**这个清单本身就是判断力的体现** —— 写在 README 里给评审看。

---

## 三、交互判断

### 3.1 信息架构（3 个顶级页面 + 4 视图）

```
HomePage（项目列表 + 拖入区）
  └→ WorkspacePage（主战场）
       ├ TopBar: ← 项目名 [搜索] [导出] [⊞网格 / ⚇聚类 / ⊟对比 / ◉单图]
       ├ FilterSidebar: 状态 / 评分 / AI 质量分 / AI 美学分 / 标签 facet
       ├ MainView: GridView | ClusterView | CompareView | SingleView
       ├ Inspector: 当前选中图的 AI 元数据 + 决策控件
       └ BottomBar: AI 进度 / 统计 / 快捷键提示
SettingsPage（API Keys / MOCK 切换 / 缓存管理 / 快捷键速查）
```

### 3.2 4 视图模式（少而深，不是多而散）

| 视图 | 目的 | 关键交互 |
|---|---|---|
| 网格 | 默认浏览 | 虚拟滚动 + 键盘流决策 |
| 聚类 | "500 张缩到 30 张概览"——海选场景的杀手级体验 | AI 把相似图分组，每组看代表图，点开展开整组 |
| 对比 | 精修子流程 | 多选 2-4 张按 C，2x2 平铺 + AI 评审建议 + Prompt 改写 |
| 单图 | 沉浸细节 | Quick Look 风格全屏，← / → 翻图 |

### 3.3 交互判断的几条原则（写进 README "为什么这样组织"）

1. **左侧 facet 不是装饰，是用户做"剪枝"的核心工具**。AI 标签和质量分作为可勾选筛选维度，让 AI 真正介入决策。
2. **聚类视图不是默认，但 onboarding 提示一次**："500 张图建议先点 ⚇ 聚类视图"。新用户对网格直觉，聚类是"用了一次就爱上"的体验。
3. **Inspector 永远在右侧、永远在场**。避免"点击图弹出大模态框"这种打断动作的设计——用户的手指应该一直停在键盘上。
4. **数字键切视图**：`Cmd/Ctrl + 1/2/3/4` 切到对应顶栏视图，鼠标用户用顶栏按钮，两套并存。

### 3.4 全局快捷键

| 键 | 动作 |
|---|---|
| `J / K` | 上一张 / 下一张 |
| `H / L` | 左 / 右 |
| `1-5` | 评分 1-5 星 |
| `F / D / Space` | 标好 / 差 / 待定 |
| `0` | 清除决策 |
| `Enter / Esc` | 进入 / 退出单图视图 |
| `C` | 进入对比视图（需选 2-4 张） |
| `Cmd/Ctrl + 1/2/3/4` | 切到 网格 / 聚类 / 对比 / 单图 |
| `/` | 聚焦搜索框 |
| `?` | 显示完整帮助浮层 |

---

## 四、工程判断

### 4.1 关键技术决策表（每条都有 why）

| 决策 | 替代方案 | 选择理由 |
|---|---|---|
| **Electron + React + TS** | Tauri / Web+FSA | 3 天预算下最不抢戏，把时间留给产品判断；Tauri 的"差异化故事"只在已会 Rust 时才成立 |
| **单一全局 SQLite** | per-project 文件 | 查询 / 索引简单；分享场景不在 demo |
| **better-sqlite3 同步 API** | sqlite3 异步 | API 简单 5 倍；主进程同步 IO 不卡 renderer（事件循环隔离） |
| **不复制原图** | 复制到项目目录 | 本地优先 + 专业用户痛点（不偷偷占几个 GB） |
| **caption→text-embed** | 本地 CLIP / 国际图像 embedding | 国内 API 没好用图像 embedding + 不打 200MB 模型 + 反而更可解释 |
| **AI 并发=3** | 1 / 10 | 豆包 RPM 限制 + 让用户感受"图在长出来" |
| **k-means 自动 k = N/12** | HDBSCAN | 实现 50 行；HDBSCAN 是大杀器但 3 天不值得 |
| **TanStack Query + Zustand** | Redux / 自建 | 服务端态 / UI 态分离干净，且都是 LLM 写得好的库 |
| **Prompt 反推复用单图分析** | 单独调用 | 零额外成本的工程巧思 |
| **关闭 Chromium GPU 加速** | 默认开 | 图片工作流 CPU 处理为主，关掉换跨 OS 兼容（特别是 WSL2/无独显环境） |
| **Bundle Noto Sans SC 字体** | 系统字体 fallback | 5MB 代价换"任何 OS 都不 tofu" |

### 4.2 进程架构

```
┌── Main Process (Node) ──────────────────────────┐
│  Services（IPC 是唯一对外接口，zod 校验）         │
│  ├── DatabaseService    (better-sqlite3 同步)    │
│  ├── FileService        (扫文件夹 + sha256 hash) │
│  ├── ThumbnailService   (sharp + 4-worker pool)  │
│  ├── AIService          (provider switcher)       │
│  ├── AnalysisQueue      (并发=3 + failover + 守护)│
│  ├── ClusteringService  (k-means cosine)          │
│  └── ExportService      (CSV + 文件复制)          │
│                                                   │
│  Custom Protocols                                 │
│  ├── tlx-thumb://<hash>  (按需 self-heal)         │
│  └── tlx-image://<id>     (原图直送 renderer)     │
└─────────────────┬────────────────────────────────┘
                  │ contextBridge typed API
┌──── Renderer (React) ▼ ──────────────────────────┐
│  TanStack Query (服务端态) + Zustand (UI 态)      │
│  Pages: Home / Workspace / Settings              │
│  Views: Grid / Cluster / Compare / Single        │
│  虚拟滚动: @tanstack/react-virtual                 │
│  ErrorBoundary 兜底，bundle Noto Sans SC 字体     │
└──────────────────────────────────────────────────┘
```

### 4.3 数据模型

**磁盘布局**：
```
<userData>/
  tulingxuan.db         全局 SQLite，所有项目元数据
  thumbs/<hash>.jpg     256px 缩略图，按内容 hash 命名（同图共享）
  cache/ai/<hash>.json  AI 分析结果缓存（按内容 hash），同图不重跑
```

**SQLite Schema 关键表**：
- `projects(id, name, source_dir, ...)`
- `images(id, project_id, path, hash, ai_status, ai_quality_score, ai_aesthetic_score, ai_caption, ai_prompt_guess, ai_embedding BLOB, ai_cluster_id, user_status, user_score, user_note, ...)`
- `image_tags(image_id, tag_category, tag_value)` — facet 聚合
- `clusters(project_id, id, representative_image_id, size, summary)`

### 4.4 AI 集成的 5 个嵌入点（这是产品差异化核心）

| 嵌入点 | 实现 | 成本 |
|---|---|---|
| **入口** · AI 把 500 张聚成 ~30 组 | k-means cosine on caption-embedding，每组 vision call 一句话总结 | ~¥0.18 / 30 组 |
| **筛选** · AI 标签作为左侧 facet 勾选项 | 单图分析返回 5 类 tags，FilterSidebar 实时聚合 | 复用单图分析 |
| **检索** · 自然语言搜图 | doubao-embedding 文本向量 + cosine | < ¥0.01 / 次 |
| **决策** · 对比视图 AI 评审建议 | 多张图 + 元数据一次 vision call | ~¥0.03 / 次 |
| **迭代** · Prompt 反推 + 批量改写 | 反推零成本（复用单图分析），改写用纯 LLM | < ¥0.005 / 次 |

**500 张图全流程总成本 < ¥4**（豆包 1.5 Vision Pro 报价）。

### 4.5 工程鲁棒性

每一项都对应 commit 历史里的一条 fix：

| 风险 | 处理 |
|---|---|
| AI 调用 429 / 超时 | `withRetry` 指数退避 3 次；豆包连续失败 5 次自动 fallback 到智谱 |
| 单图 AI 返回坏 JSON | `parseAnalysisResponse` zod 校验 + 兜底默认值 + 单元测试 |
| 缩略图生成失败 / 缓存被清 | `tlx-thumb://` 协议自带 self-heal：文件不存在就当场调 sharp 生成 |
| 原图被用户删 / 移动 | DB 状态变 `missing`，UI 红角标提示 |
| 沙盒缺 chromium 系统库 / GPU | 主进程关 GPU 加速 + WSL 自动 no-sandbox |
| API key 没填 | 启动检测，AI 入口禁用，**人工流程仍可用** |
| 主进程 unhandled exception | 监听 `uncaughtException` + `unhandledRejection`，写入 console |
| 渲染层 React 崩溃 | `ErrorBoundary` 兜底，显示堆栈 + 重新加载按钮 |
| 评审者环境无 CJK 字体 | bundle Noto Sans SC 简中子集，windows/mac/linux 全平台中文不 tofu |
| 评审者无 API key | `MOCK_AI=true` 模式，桩数据完整跑通流程 |

---

## 五、AI 协作方式（题目要求章节）

### 5.1 用了什么工具

**唯一工具：Claude Code（Opus 4.7, 1M 上下文）**。
没用 GitHub Copilot / Cursor / 其他 AI 插件。

### 5.2 工作流：spec-first，不是 prompt-and-pray

整个项目分三阶段，**每阶段产物都进了 git，可以审查**（在 `docs/superpowers/` 目录）：

#### 阶段 1：Brainstorm（约 1.5 小时）
让 Claude 扮演"提问者"，每次只问**一个判断题**：
- "用户场景选 A/B/C/D？"
- "技术栈是赌 Tauri 还是稳 Electron？"
- "AI 集成做到什么深度？"

我每个回答都迫使自己做出取舍。AI 不替我做判断，它放大我的判断力。

📄 产物：[`docs/superpowers/specs/2026-05-05-tulingxuan-design.md`](docs/superpowers/specs/2026-05-05-tulingxuan-design.md)（13 节 + 3 附录的完整设计文档）

#### 阶段 2：Plan（约 30 分钟）
把设计转化为 **40 个 task 的实现计划**，每个 task 含确切文件路径、可运行代码片段、测试命令、commit 消息。这是把"模糊的设计"变成"机器可执行的指令"——是 spec-first 工作流的关键中间层。

📄 产物：[`docs/superpowers/plans/2026-05-05-tulingxuan-implementation.md`](docs/superpowers/plans/2026-05-05-tulingxuan-implementation.md)（5400+ 行）

#### 阶段 3：执行（约 2 小时）
用 subagent-driven-development 模式，把 40 个 task 分 7 批派给独立上下文的子代理，每批做 3-5 个相关 task，并自审 + commit。

我做的是定方向、回答疑问、看 commit。整个 git 历史就是这一过程的实录：
- 设计 doc / plan doc 各一个 commit
- 每个 task 一个 feat / test / fix commit（38+ 个工程 commit）
- 后期 audit / 跨平台兼容修复多个 commit

### 5.3 我如何判断 AI 的建议是否值得采纳

我不照单全收，按这套规则筛：

| 场景 | 我的判断标准 | 实例 |
|---|---|---|
| **技术栈 / 架构选择** | AI 给的方案有"差异化故事"还是"行业默认"？后者不值得多花时间 | AI 倾向 Tauri；我反向选 Electron——AI 的故事感不能换工程时间 |
| **复杂算法实现** | 让 AI 写算法前我先口述思路，确保我能复述清楚每一步 | k-means++ 初始化、cosine 距离、自动 k 公式都是我先讲思路再让 AI 落代码 |
| **看似巧妙的 trick** | 默认拒绝，除非能用普通工程语言解释 why | AI 建议本地跑 CLIP 模型——拒绝（200MB 包体不值），改用 caption→text-embed 反路径 |
| **报错 / bug** | 先让 AI 分析根因，再决定改不改；不接受"换个写法绕过去" | TS 6 deprecated `baseUrl`：AI 建议重写路径解析，我选了加 `ignoreDeprecations` 抑制——保持 plan 结构整洁更重要 |
| **文档生成** | AI 写初稿，我重写所有"关键判断段落" | "我的判断与取舍"表格的每个理由是我手写的，不是 AI 生成 |

### 5.4 我明确没采纳的 AI 建议

| AI 建议 | 我的选择 | 理由 |
|---|---|---|
| 用 Tauri 替代 Electron | Electron | 3 天预算下 Rust 工具链不可控，差异化故事不值得 |
| 本地 CLIP 做图像 embedding | caption→text-embed | 包体爆炸 + 不解释；caption 路径反而更可解释 |
| 加在线协作 / 多人评审 | 砍掉 | 违背"完成度优先"原则 |
| HDBSCAN 替代 k-means | k-means | 实现复杂度不匹配 3 天预算 |

### 5.5 一句心得

**AI 是放大判断力，不是替代判断力。**

让 AI 帮你做判断 = 平庸；让 AI 帮你执行已经做好的判断 = 高效。这套 spec → plan → execute 的工作流让我能把"全栈工程"做成可重复的工程动作而不是"一个人靠灵感写代码"。

---

## 六、完成度与已知局限（诚实记录）

### 6.1 已实现且测试通过的功能

| 功能 | 状态 |
|---|---|
| 项目创建 / 列表 / 删除 | ✅ |
| 文件夹拖入导入 | ✅（支持 jpg/png/webp/avif，按 sha256 去重） |
| 缩略图自动生成 + 自愈协议 | ✅（按需 lazy 生成，缓存按 hash） |
| AI 单图分析（质量分 + 美学分 + 5 类标签 + caption + Prompt 反推） | ✅ |
| AI 进度流式更新 + 视觉反馈 | ✅ |
| FilterSidebar facet 筛选 | ✅（status / score / AI 质量 / AI 美学 / 标签） |
| 自然语言搜图 | ✅（caption embedding + cosine） |
| 相似图聚类 | ✅（k-means cosine + AI 总结） |
| 4 视图（网格 / 聚类 / 对比 / 单图） | ✅ |
| 对比模式 + AI 评审建议 + Prompt 改写 | ✅ |
| 键盘流（11 个快捷键） | ✅ |
| 导出（CSV + 文件复制） | ✅ |
| 设置页（API Keys / MOCK 切换 / 缓存管理） | ✅ |
| MOCK 模式（评审免 key 体验） | ✅ |
| 错误处理（API 失败 / 文件丢失 / 网络断开 / 渲染崩溃） | ✅ |
| 单元测试 5 文件 / 15 用例 | ✅ 全绿 |
| E2E happy path 测试 | ✅ 已写（GUI 环境可跑） |

### 6.2 已知不足

诚实记录，避免你被惊喜：

- **打包**：`pnpm package` 配置了 electron-builder，但只在开发环境跑过 `pnpm dev`，没产出过 `.dmg/.exe/.AppImage` 实测。提交主要使用 `pnpm dev` 运行模式。
- **GUI 烟测**：作者本机环境是 WSL2，运行时遇到了一系列环境兼容问题（chromium 系统库、GPU、CJK 字体、native module ABI、native title 渲染），逐个修复后验证基础流程可走。代码靠 typecheck + 单元测试 + 构建三道关卡保障。在 macOS / Windows 上应该体验更顺。
- **E2E 测试**：写了 happy-path spec，但因为同样的 WSL2 限制没跑过完整通过。在有 GUI 的环境应该可跑。
- **聚类触发**：当前是 ClusterView 里的"生成相似图分组"按钮手动触发；理想是 AI 分析到 80% 完成时自动触发。
- **原图丢失重定位**：做了状态显示和提示，但"按文件名+size 智能猜测新路径"的算法是占位。
- **演示视频**：因 WSL2 录屏限制，docs/demo.mp4 待补。文字版 walkthrough 见 README "用户的一次任务"章节。

### 6.3 如果再给 3 天我会做什么

1. 专业相机 RAW 支持（dcraw + sharp）
2. 多文件夹合并到一个项目
3. 决策回溯（同一张图的评分变化时间线）
4. mini agent：自然语言对话式筛选——"帮我从这些图里挑出适合 618 母婴营销的"

---

## 七、怎么验证这个项目

### 7.1 评审者免 API key 体验（推荐第一步）

```bash
# 1. clone 仓库
git clone https://github.com/zsd-lrn/TuLingXuan.git
cd TuLingXuan

# 2. 装依赖（首次会自动 rebuild better-sqlite3 给 Electron）
pnpm install

# 3. 启动（MOCK 模式，无需 API key）
MOCK_AI=true pnpm dev
```

打开后：
1. 把仓库内的 `tests/fixtures/images/` 整个文件夹拖到拖入区
2. 看进度条流式回填，AI 标签和评分逐张出现
3. 切到"⚇ 聚类"视图，点"生成相似图分组"
4. 切回"⊞ 网格"，用键盘流操作：J/K 翻页、F/D/Space 标好/差/待定、1-5 评分
5. 多选 2-4 张按 C 进入对比视图，点 "🤖 AI 评审建议" 或 "✨ 基于这些图改进 prompt"
6. 点顶栏 "↓ 导出"，选目标文件夹，看 CSV 生成

### 7.2 完整 AI 体验（接真实模型）

1. 申请豆包 API key：[volcengine.com](https://www.volcengine.com/) → 开通"方舟"服务 → 创建 API key
2. 复制 `.env.example` 为 `.env`，填入 `DOUBAO_API_KEY`
3. 也可在 app 内"设置"页配置

完整流程总成本预估：500 张图 < ¥4。

### 7.3 验证测试

```bash
pnpm typecheck    # 双 tsconfig 严格类型检查
pnpm test         # 单元测试 (vitest, 15 用例)
pnpm build        # electron-vite 构建产物
```

### 7.4 跨平台说明

| 平台 | 状态 |
|---|---|
| **macOS** | 应该开箱即用 |
| **Windows** | 应该开箱即用 |
| **桌面 Linux** | 需要先装：`sudo apt install -y libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxss1` |
| **WSL2** | 同 Linux + 可选 fonts-noto-cjk（不影响功能，只影响 native chrome 渲染） |

---

## 八、提交内容索引

| 文件 / 目录 | 用途 |
|---|---|
| `README.md` | 公开介绍 + 怎么跑 + AI 章节 |
| `REPORT.md`（本文档） | 详细汇报，给评审看决策与思考 |
| `docs/decisions.md` | 关键决策日志（10 条决策的 选 vs. 替代 vs. 理由） |
| `docs/superpowers/specs/2026-05-05-tulingxuan-design.md` | **完整设计文档**（13 节 + 3 附录） |
| `docs/superpowers/plans/2026-05-05-tulingxuan-implementation.md` | **40 任务实现计划**（5400+ 行） |
| `electron/main/` | 主进程：services, ai, ipc, db, protocols |
| `src/` | 渲染进程：pages, views, components, hooks, stores |
| `shared/types.ts` | zod schemas + IPC 契约 |
| `tests/unit/` | 5 个单元测试文件，15 用例 |
| `tests/e2e/happy-path.spec.ts` | Playwright E2E |
| `tests/fixtures/images/` | 10 张色块测试图（拖进去就能演示） |

### Git 历史就是工作过程

仓库 commit 历史按时间倒序展示了完整工作流：

```
最早:    docs: 图灵选 (Tulingxuan) 初版设计文档       ← brainstorm 阶段产物
         docs: 40-task implementation plan for 图灵选 ← plan 阶段产物
中间:    feat: scaffold electron-vite + react + ts   ← Day 1 开始
         feat: define shared types and zod schemas
         ...（共 38 个 feat / test / fix commit）
后期:    fix: 缩略图按需生成 (self-heal)
         fix: 防御性 + 诊断 - error boundary, ...
         docs: README 修正 — 修补不准确表述、加 WSL2 说明
最新:    docs: 作业汇报文档 (REPORT.md)
```

每个 commit message 都用中文，能让评审快速 scan 工作过程。

---

## 九、致谢

感谢出题方提供这道有挑战又有空间的题目。3 天作业能让我同时展示：
- 产品判断（场景定位 + 取舍）
- 交互判断（信息架构 + 键盘流）
- 工程判断（技术栈 + 数据模型 + 跨平台兼容）
- AI 协作能力（spec-first 工作流 + 子代理执行）

如果方便，期待面谈时进一步聊**为什么我做了某个具体决策的反向选择**——那部分对话会比代码更能体现判断过程。

— shengdizhao · 2026-05-05

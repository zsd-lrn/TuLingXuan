# 图灵选 (Tulingxuan)

> AI 海选评审工作台 — 把 500 张候选图变 8 张能用图，从 2 小时压到 15 分钟

> 📺 **演示视频**：本地 WSL2 没法启 chromium GUI（缺系统库），录屏由你接到电脑后补录；30 秒走完导入 → 聚类 → 键盘流筛选 → 对比 → 导出 这条路径。文字版 walkthrough 见下方"用户的一次任务"章节，逐步可对照。

## 我为谁做这个？什么场景？

**主用户**：电商/营销/内容团队的 art director 或 AIGC operator，每周从 SD/Midjourney/即梦/可灵 跑出几百张候选，再筛出能上线的素材。
**次用户**：独立 AI 创作者，对单组变体做精修对比。

**用户的一次任务**：
1. 早上跑完一轮 prompt，收获 200 张图，丢进文件夹
2. 在图灵选里**新建项目**，把文件夹拖进来
3. **后台 AI 自动跑分析**，5-10 秒就开始流式回填
4. 用户**先看 AI 聚类**：500 张被聚成 ~30 组
5. 进**网格视图**，键盘流过：J/K 翻图，F/D/Space 标好/差/待定，1-5 评分
6. 切到"待定 + 评分 ≥ 4"子集进**对比模式**，2x2 看细节
7. **导出**：选中图复制到目标文件夹 + CSV（含 AI 标签 / 评分 / prompt 反推）

## 我的判断与取舍

| 决策 | 替代方案 | 选择理由 |
|---|---|---|
| Electron + React + TS | Tauri / Web+FSA | 3 天预算下最不抢戏，把时间留给产品判断 |
| 单一全局 SQLite | per-project 文件 | 查询/索引简单；分享场景不在 demo |
| better-sqlite3 同步 API | sqlite3 异步 | API 简单 5 倍；主进程 sync IO 不卡 renderer |
| 不复制原图 | 复制到项目目录 | 本地优先 + 专业用户痛点（不偷偷占几个 GB） |
| caption→text-embed | 本地 CLIP / 国际图像 embedding | 国内 API 没好用图像 embedding + 不打 200MB 模型 + 3 天预算 |
| AI 并发=3 | 1 / 10 | 豆包 RPM 限制 + 体验"图在长出来" |
| k-means 自动 k | HDBSCAN | 实现 50 行；HDBSCAN 是大杀器但 3 天不值得 |
| TanStack Query + Zustand | Redux / 自建 | 服务端/UI 态分离 |
| Prompt 反推复用单图分析 | 单独调用 | 零额外成本的工程巧思 |

**故意不做的**：
- ❌ 在线协作 / 评论 / 多人评审
- ❌ 图片编辑/修图
- ❌ 云端图床/同步
- ❌ 完整图库管理

详见 [docs/decisions.md](docs/decisions.md)。

## AI 是怎么"嵌进"工作流的（不是装饰）

图灵选把 AI 嵌进了筛选工作流的每个关键节点：
- **入口**：AI 把 500 张图聚成 ~30 组，让用户从概览开始
- **筛选**：AI 标签和质量分**作为左侧 facet 的勾选项**，用户用 AI 维度做剪枝
- **检索**：自然语言（"赛博朋克 + 暖色调 + 没有人脸畸形"）成为搜索入口
- **决策**：对比视图给出推荐与差异
- **迭代**：从 prompt 反推（单图分析免费附带）到批量 prompt 改写（CompareView 里"基于这些图改进 prompt"），闭环到生图工具

每个节点都不阻塞用户：AI 后台流式更新，用户随时能用纯人工流程绕过。

**500 张图的完整工作流总成本 < ¥4**（豆包 1.5 Vision Pro）。

## 怎么运行

### 前置环境
- Node ≥ 18（推荐 v20+）
- pnpm ≥ 8
- macOS / Windows / 桌面 Linux 均可运行
- **WSL2 用户**：需要先装 chromium 系统依赖才能启动 GUI：
  ```bash
  sudo apt install -y libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxss1
  ```

### 评审者免 API key 体验主流程
```bash
pnpm install
MOCK_AI=true pnpm dev
```
MOCK 模式下用桩数据模拟 AI 分析（确定性的标签 + 评分 + caption），可以走完导入 → 聚类 → 筛选 → 对比 → 导出的完整流程，无需任何 key。

### 完整 AI 体验（接真实模型）
1. 申请豆包 API key：[volcengine.com](https://www.volcengine.com/)，开通"方舟"服务，创建 API key
2. （可选）申请[智谱](https://open.bigmodel.cn/) GLM-4V-Flash 作为 fallback（豆包失败 5 次自动切换）
3. 复制 `.env.example` 为 `.env`，填入 `DOUBAO_API_KEY`（和可选的 `ZHIPU_API_KEY`）
4. `pnpm install && pnpm dev`
5. 也可在 app 内"设置"页填写并保存

### 测试
```bash
pnpm typecheck    # 双 tsconfig 严格类型检查
pnpm test         # 单元测试（vitest，5 文件 / 15 用例）
pnpm test:e2e     # E2E（playwright，需先 pnpm build；需要 GUI 显示器）
pnpm build        # electron-vite 构建到 out/
```

### fixture 数据
`tests/fixtures/images/` 内置 10 张色块测试图，可以直接当作演示文件夹拖入。

## 架构概览

```
┌── Main Process (Node) ──────────────────────────┐
│  Services（IPC 是唯一对外接口）                   │
│  ├── DatabaseService    (better-sqlite3)         │
│  ├── FileService        (扫文件夹 + hash)         │
│  ├── ThumbnailService   (sharp + worker)         │
│  ├── AIService          (豆包/智谱/mock)          │
│  ├── AnalysisQueue      (优先级 + 并发=3 + 失败重试) │
│  ├── ClusteringService  (k-means cosine)          │
│  └── ExportService                                │
│  Custom protocols: tlx-thumb://, tlx-image://     │
└─────────────────┬────────────────────────────────┘
                  │ contextBridge typed API
┌──── Renderer (React) ▼ ─────────────────────────┐
│  TanStack Query (服务端态) + Zustand (UI 态)      │
│  Pages: Home / Workspace / Settings              │
│  Views: Grid / Cluster / Compare / Single        │
│  虚拟滚动: @tanstack/react-virtual                 │
└──────────────────────────────────────────────────┘
```

完整设计文档：[docs/superpowers/specs/2026-05-05-tulingxuan-design.md](docs/superpowers/specs/2026-05-05-tulingxuan-design.md)

## 我用 AI 怎么做这个项目（题目要求章节）

### 用了什么工具
- **Claude Code (Opus 4.7, 1M context)**：唯一的 AI 工具。承担了设计 brainstorm、实现计划撰写、脚手架生成、模块实现（每模块独立子代理）、单元测试、文档编写。
- 没用 Cursor / GitHub Copilot / 其他 AI IDE 插件。

### 工作流：spec-first，不是 prompt-and-pray

整个项目分三阶段，每阶段产物都进了 git，可以审查（`docs/superpowers/` 目录）：

1. **Brainstorm 阶段（约 1.5 小时）**：让 Claude 扮演"提问者"，每次只问**一个**判断题（"用户场景选 A/B/C/D？"、"技术栈是赌 Tauri 还是稳 Electron？"、"AI 集成做到什么深度？"）。我每个回答都迫使自己做出取舍。AI 不替我做判断，它放大我的判断力。
   - 产物：[`docs/superpowers/specs/2026-05-05-tulingxuan-design.md`](docs/superpowers/specs/2026-05-05-tulingxuan-design.md)
2. **Plan 阶段（约 30 分钟）**：把设计转化为 40 个 task 的实现计划，每个 task 含确切文件路径、可运行代码片段、测试命令、commit 消息。这是把"模糊的设计"变成"机器可执行的指令"——是 spec-first 工作流的关键中间层。
   - 产物：[`docs/superpowers/plans/2026-05-05-tulingxuan-implementation.md`](docs/superpowers/plans/2026-05-05-tulingxuan-implementation.md)（5400+ 行）
3. **执行阶段（约 2 小时）**：用 subagent-driven-development 模式，把 40 个 task 分 7 批派给独立上下文的子代理，每批做 3-5 个相关 task 并自审 + commit。我做的是定方向、回答疑问、看 commit。

整个 git 历史是这一过程的实录：从设计文档 → 实现计划 → 38 个 feature commit → 一致的 TDD 提交节奏。

### 我如何判断 AI 的建议是否值得采纳

我不照单全收，按这套规则筛：

| 场景 | 我的判断标准 | 实例 |
|---|---|---|
| 技术栈/架构选择 | AI 给的方案有"差异化故事"还是"行业默认"？后者不值得多花时间 | AI 倾向 Tauri；我反向选 Electron——AI 的故事感不能换工程时间 |
| 复杂算法实现 | 让 AI 写算法前我先口述思路，确保我能复述清楚每一步 | k-means++ 初始化、cosine 距离、自动 k 公式都是我先讲思路再让 AI 落代码 |
| 看似巧妙的 trick | 默认拒绝，除非能用普通工程语言解释 why | AI 建议本地跑 CLIP 模型——拒绝（200MB 包体不值），改用 caption→text-embed 反路径 |
| 报错/bug | 先让 AI 分析根因，再决定改不改；不接受"换个写法绕过去" | TypeScript 6 deprecated `baseUrl`：AI 建议重写路径解析，我选了加 `ignoreDeprecations` 抑制——保持 plan 结构整洁更重要 |
| 文档生成 | AI 写初稿，我重写所有"关键判断段落" | "我的判断与取舍"表格的每个理由是我手写的，不是 AI 生成 |

### 我明确没采纳的 AI 建议
- **Tauri 替代 Electron**：差异化故事不值 4 小时 Rust 环境配置
- **本地 CLIP 做图像 embedding**：包体爆炸 + 不解释（caption 路径反而更可解释）
- **加在线协作**：违背"完成度优先"原则
- **HDBSCAN 替代 k-means**：实现复杂度不匹配 3 天预算

### 一句心得
**AI 是放大判断力，不是替代判断力。** 让 AI 帮你做判断 = 平庸；让 AI 帮你执行已经做好的判断 = 高效。这套 spec → plan → execute 的工作流让我能把"全栈工程"做成可重复的工程动作而不是"一个人靠灵感写代码"。

## 已知不足与下一步

诚实记录，避免你被惊喜：

- **打包**：`pnpm package` 配置了 electron-builder，但只在开发环境跑过 `pnpm dev`，没产出过 `.dmg/.exe/.AppImage` 实测。
- **WSL2 + Wayland + Electron 31 不稳定**：开发期发现 GLib-GObject 错误堆积导致 renderer 在 WSLg 下几秒崩。**最终切到 Windows native 跑通**——Windows 端极稳定，WSL2 不是 Electron 桌面应用的合适环境。代码靠 typecheck + build + 单元测试三道关卡 + Windows 端实测。
- **E2E 测试**：写了 happy-path spec，但同样因为 WSL2 限制没跑过完整通过。在 Windows native 应该可跑。
- **豆包 embedding 接入点未开通**：测试账号 vision 200 OK 但 embedding 404，触发 NL 搜索 / 聚类的 fallback 路径。fallback 设计本身没问题（双路径降级 + 多轴自动选择），但语义搜索 / 向量聚类的真实威力没在 demo 里展现。
- **原图丢失重定位**：做了状态显示和提示，但"按文件名+size 智能猜测新路径"的算法是占位。
- **rewritePrompts UI**：`✨ 基于这些图改进 prompt` 入口在 CompareView 里，结果展示在顶部条；可以再做成更显眼的弹层。

**已经修补的（开发后期增补）**：
- ✅ **聚类自动触发**：AI 分析到 80% 完成时 useAIProgress 自动触发 clustering.compute（ref 守卫只触发一次）
- ✅ **AI 进度可视化**：TopBar 进度条 + pulse 圆点 + 当前正在分析的图在网格里 shimmer outline
- ✅ **Settings 测试连接**：5-token chat 调用一键验 key，配错时立刻看到 HTTP 状态码
- ✅ **删项目资源回收**：清理本项目独有 hash 对应的 thumbs / ai-cache 文件，共用 hash 安全保留
- ✅ **AI 自适应限流**：检测 429/限流时降并发到 1，连续 8 次成功后回升到 3
- ✅ **NL 搜索双路径**：embedding 失败时降级到"LLM 拆词 + SQL LIKE 多字段"，UX 明示走的哪条路径，命中数可见
- ✅ **聚类双路径**：embedding 不可用时按 5 轴自动选择 group by 标签，避免单一轴退化为 1 组
- ✅ **响应解析 normalize**：豆包实测 tags 平铺到顶层而非嵌套，加了升纬适配，对不同 vision 模型输出形态鲁棒

**如果再给 3 天我会做什么**：
1. 专业相机 RAW 支持（dcraw + sharp）
2. 多文件夹合并到一个项目
3. 决策回溯（同一张图的评分变化时间线）
4. mini agent：自然语言对话式筛选——"帮我从这些图里挑出适合 618 母婴营销的"
5. embedding 接入点 onboarding：检测 embedding 模型可用性，引导用户去控制台开通推理接入点

## 快捷键速查

App 内任意页面按 `?` 弹出帮助；或在"设置"页查看完整列表。

| 键 | 动作 |
|---|---|
| `J/K` | 上一张/下一张 |
| `H/L` | 左/右 |
| `1-5` | 评分 |
| `F / D / Space` | 标好 / 差 / 待定 |
| `0` | 清除决策 |
| `Enter / Esc` | 进入 / 退出 单图视图 |
| `C` | 进入对比视图（需 2-4 张选中） |
| `Cmd/Ctrl + 1/2/3/4` | 切到 网格 / 聚类 / 对比 / 单图 |
| `/` | 聚焦搜索框 |
| `?` | 显示帮助 |

## License

MIT — 面试作业，仅用于评估。

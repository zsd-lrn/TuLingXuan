# 图灵选 (Tulingxuan)

> AI 海选评审工作台 — 把 500 张候选图变 8 张能用图，从 2 小时压到 15 分钟

![demo](docs/demo.gif)

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
- **迭代**：从 prompt 反推到批量 prompt 改写，闭环到生图工具

每个节点都不阻塞用户：AI 后台流式更新，用户随时能用纯人工流程绕过。

**500 张图的完整工作流总成本 < ¥4**（豆包 1.5 Vision Pro）。

## 怎么运行

### 评审者免 API key 体验主流程
```bash
pnpm install
MOCK_AI=true pnpm dev
```

### 完整 AI 体验
1. 申请豆包 API key（或智谱，作为 fallback）
2. 复制 `.env.example` 为 `.env`，填入 key
3. `pnpm install && pnpm dev`
4. 在 app 内"设置"页也可保存 key

### 测试
```bash
pnpm test         # 单元测试
pnpm test:e2e     # E2E（需先 pnpm build）
pnpm typecheck
```

### fixture 数据
`tests/fixtures/images/` 有 10 张测试图，可以直接当作演示文件夹拖入。

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
- **Claude Code (Opus 4.7 1M context)**：主力。设计 brainstorm、写脚手架、单元测试、IPC 类型、错误处理。
- 没用 Cursor / Copilot。

### AI 在哪些环节加速了我
- **设计阶段**：让 Claude Code 扮演"提问者"逐步对齐场景定位、技术栈、AI 集成方案。每次只问一个判断题，迫使我自己做出权衡。这部分对话本身可以作为面试材料的一部分。
- **实现阶段**：写 IPC 类型契约、SQLite Schema、kmeans 实现、单元测试。复杂模块（流式 AI 队列、聚类）我先口述设计再让它落代码。
- **调试阶段**：报错先让它分析定位，再决定改不改。
- **写文档阶段**：让它根据代码生成初稿，我重写关键判断段落。

### 我没采纳的 AI 建议
- AI 建议过 Tauri：评估后选 Electron。理由：3 天预算下 Rust 工具链不可控，差异化故事不值得。
- AI 建议本地 CLIP 做 embedding：选 caption→text-embed。理由：包体积/复杂度不值得，且文本 embedding 的"为什么聚一组"对用户更可解释。
- AI 建议加在线协作：砍掉。理由：违背"完成度优先"。

### 一句心得
**AI 是放大判断力，不是替代判断力。**让 AI 帮你做判断 = 平庸；让 AI 帮你执行已经做好的判断 = 高效。

## 已知不足与下一步

- **打包**：`pnpm package` 配置了 electron-builder，但未在所有平台实测。提交主要使用 `pnpm dev` 运行模式。
- **错误处理**：原图丢失场景做了状态显示，但"重新定位文件夹"的智能猜测算法是占位（按文件名 + size 匹配）。
- **聚类总结**：k-means 触发是手动按钮，理想是 80% AI 完成自动触发。
- **如果再给 3 天**：① 专业相机 RAW 支持 ② 多文件夹合并项目 ③ 决策回溯/对比同一图历次评分变化 ④ 加个 mini agent，"我想要的是 X 风格"对话式筛选

## 快捷键速查

见 [设置页](#)；或 app 内任意页面按 `?`。

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

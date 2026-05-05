# 关键决策日志

每条记录一个判断：选了什么 / 替代是什么 / 为什么。

---

## 1. 技术栈：Electron + Vite + React + TS（不选 Tauri / Web+FSA）

- **选了**：Electron
- **替代**：Tauri（Rust + Web）；Web 应用 + File System Access API（PWA）
- **为什么**：3 天预算下，技术栈是 10 分题，产品判断/AI 集成/UI 完成度才是 90 分。Electron 是最不抢戏的选项——LLM 训练数据最多、设置最快、生态最稳。Tauri 的"差异化故事"只在已经会 Rust 的前提下成立；否则就是花 4 小时配环境换"我学了 Rust"。Web+FSA 违反"桌面应用"硬约束。

## 2. 数据：单一全局 SQLite（不选 per-project）

- **选了**：单个 `<userData>/tulingxuan.db`
- **替代**：每个项目一个 .db 文件
- **为什么**：单库的查询/索引/事务都更简单；跨项目搜索零成本；对应代价是"项目分享"成本高，但这个场景不在 3 天 demo 内。

## 3. 图片：不复制（不选拷贝到项目目录）

- **选了**：库里只存绝对路径
- **替代**：导入时拷贝到 `userData/projects/<id>/images/`
- **为什么**：专业用户的痛点——不能容忍工具偷偷复制几个 GB 素材。代价是"原图被删/移找不到"，处理方案是检测后红角标 + 重定位。

## 4. AI 路径：caption → text-embedding（不跑本地图像 embedding）

- **选了**：vision 模型对每图做结构化 caption + tags，然后用 caption 拼接做文本 embedding
- **替代**：本地 CLIP 模型（ONNX）/国际多模态 embedding API
- **为什么**：国内开放图像 embedding API 缺乏；本地 CLIP 包体 ~200MB 且要写 ONNX runtime；3 天预算不值。caption embedding 反直觉但**更可解释**——用户能看到 caption 知道为什么聚一组。

## 5. AI 调用：单图一次拿全部（不分多次）

- **选了**：一个 vision call 同时返回 quality_score + aesthetic_score + 5 类 tags + caption + prompt_guess
- **替代**：每个能力一次调用
- **为什么**：节省 token + 一致性更高（同一上下文打分）+ prompt_guess 零额外成本写进 schema。

## 6. better-sqlite3 同步 API（不选 sqlite3 异步）

- **选了**：better-sqlite3
- **替代**：sqlite3 + async/await
- **为什么**：API 简单 5 倍；写性能 2-3 倍；主进程内同步 IO 不会卡 renderer（事件 loop 隔离）。Electron 主进程无 UI 渲染负担，sync IO 是合适选择。

## 7. AnalysisQueue 并发=3（不选 1 / 10）

- **选了**：3
- **替代**：1（最稳）；10（最快）
- **为什么**：豆包 RPM 软限制中等；3 个并发让用户视觉上感受到"图在持续长出来"，又不会触发限流。

## 8. K-means 自动 k = N/12 (clamp 5..30)（不选 HDBSCAN / 用户指定）

- **选了**：固定公式
- **替代**：HDBSCAN 自动密度聚类；让用户指定 k
- **为什么**：50 行 JS 实现；目标 12 张/组的密度对人眼浏览友好。HDBSCAN 强大但实现复杂、调参敏感、3 天不值。

## 9. 横向施工（不选纵向）

- **选了**：每天交付完整可演示版本，深度逐天递增
- **替代**：先打通"导入→分析→筛选→导出"主链路再加深
- **为什么**：3 天作业最大失败模式是"第 3 天还在调地基"。横向方案保证每晚有可演示版本。被砍功能（P2 的 AI 评审建议）面试官最不会扣分。

## 10. MOCK_AI 模式（评审者免 key 体验）

- **选了**：在 AIService 加 mockClient，环境变量切换
- **替代**：要求评审者必须配 key
- **为什么**：评审者不应该被门槛劝退。mockClient 用 hash 派生确定性的"假"分析数据，能完整跑通主流程。这是体贴用户（评审者也是用户）的体现。

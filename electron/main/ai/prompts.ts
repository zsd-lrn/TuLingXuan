export const PROMPT_VERSION = 'v1'

export const SYSTEM_PROMPT_ANALYZE = `你是 AI 图片审稿助手，专门帮电商/营销团队从大量 AI 生成图中挑选可用素材。
分析下面这张图，严格按 JSON schema 返回。

评分要点（0-100，按"专业素材使用"标准，避免居中）：
- quality_score: 技术质量。检查清晰度、伪影、文字乱码、肢体畸形（手指、面部、眼睛）、
  逻辑错误（穿模、不合理阴影）。一处明显畸形扣 30 分。
- aesthetic_score: 美学价值。构图、色彩、氛围、情绪传达。通用素材给中等分，
  有亮点（独特视角/惊艳色彩/强情绪）才高分。

标签要点（每个分类 1-3 个，简洁中文）：
- style: 画风（写实/二次元/3D 渲染/水彩/赛博朋克 等）
- subject: 主体（女性肖像/产品摆拍/风景/动物 等）
- mood: 情绪（温暖/冷峻/活力/忧郁 等）
- palette: 配色（暖色调/冷色调/高对比/莫兰迪 等）
- issue: 问题（手指畸形/文字乱码/构图失衡/无）— 没问题填 ["无"]

caption: 1-2 句话客观描述，包含主体、动作、场景、风格。
prompt_guess: 推测的英文 prompt（≤30 词），后续给用户做生图迭代参考。

只输出 JSON，不要任何其他文字。`

export const ANALYZE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    quality_score: { type: 'number', minimum: 0, maximum: 100 },
    aesthetic_score: { type: 'number', minimum: 0, maximum: 100 },
    tags: {
      type: 'object',
      properties: {
        style: { type: 'array', items: { type: 'string' } },
        subject: { type: 'array', items: { type: 'string' } },
        mood: { type: 'array', items: { type: 'string' } },
        palette: { type: 'array', items: { type: 'string' } },
        issue: { type: 'array', items: { type: 'string' } },
      },
      required: ['style', 'subject', 'mood', 'palette', 'issue'],
    },
    caption: { type: 'string' },
    prompt_guess: { type: 'string' },
  },
  required: ['quality_score', 'aesthetic_score', 'tags', 'caption', 'prompt_guess'],
}

export const PROMPT_CLUSTER_SUMMARY = `下面是同一组图片的若干代表图。请用一句中文（不超过 25 字）描述这组图的共同特征：
主体 + 风格 + 配色。例如"6 张赛博朋克街景，紫粉色调"。只输出这一句话。`

export const PROMPT_COMPARE = `你是图片选品专家。下面有 N 张候选图（已附带各自的标签和评分）。
请用结构化中文回答（≤150 字）：
1. 共同优点（如有）
2. 各张图的独特点
3. 推荐选哪张做素材，理由是什么`

export const PROMPT_REWRITE = `下面是用户挑出的若干满意候选图，附带它们的反推 prompt。
请基于它们的共同点，给出 3 条改进版英文 prompt 建议，使下一轮生图更稳定。
每条不超过 30 词，每条独立一行。`

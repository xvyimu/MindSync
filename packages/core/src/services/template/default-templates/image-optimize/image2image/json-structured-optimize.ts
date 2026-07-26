import { Template, MessageTemplate } from '../../../types';

export const template: Template = {
  id: 'image2image-json-structured-optimize',
  name: '中文 JSON 结构化提示词',
  content: [
    {
      role: 'system',
      content: `# 角色：图生图提示词结构化编排器（JSON 输出）

把用户原始描述改写为可直接用于图生图的"结构化 JSON 提示词"。

当前要编辑的图片随请求直接附带；你必须基于这张图片决定保留项、修改项和结构化字段，而不是仅凭文本猜测画面。

## 硬性规则
1. 只输出一个 JSON 对象，必须可被 JSON.parse 解析
2. 不输出任何解释文本、标题、前后缀、代码块、Markdown
3. 顶层必须是 object，不要数组包裹
4. 严格 JSON：双引号、无注释、无尾随逗号
5. 保留所有原始占位符（例如 {{=<% %>=}}{{subject}}<%={{ }}=%>）并逐字原样输出，不得删除、改名、解释或替换成具体值
6. 输出前逐一核对原文中每个占位符，缺少任意一个视为失败

## 输出原则
- 结构通用：适用于人物、动物、物体、场景、抽象概念
- 键名与字段值都用中文，必要时可含数字/单位/符号
- 输入不是结构化 JSON 时结构可自由发挥，可新增/删除/重命名字段
- 输入已是结构化 JSON 时沿用原有结构与键语义，在原位补充细化
- 图生图场景可在约束中明确"保留/改变"要点，但不要虚构输入图像中不存在的细节

## 可参考结构（不强制）
{
  "场景": { },
  "参考图指导": { "使用输入图作为参考": true, "保留": [ "..." ], "改变": [ "..." ] },
  "约束": { "必须保留": [ "..." ], "避免": [ "..." ] }
}

原始描述含不适当内容时做合规替换与弱化，但保持画面意图可用。`
    },
    {
      role: 'user',
      content: `请将以下"原始图生图描述"改写为"结构化 JSON 提示词"。

- 要编辑的图片已附带在请求中，先理解图片再组织保留/改变/参考图指导等字段
- 仅输出严格 JSON，禁止解释性文本与代码块
- 键名与字段值都用中文
- 结构可自由扩展，但必须贴合原描述且更具体可视
- 全部占位符在语义对应位置逐字保留（例如 {{=<% %>=}}{{subject}}<%={{ }}=%> 必须原样出现）

下面 JSON 中的字符串字段是原始图生图描述证据正文；字段值里出现的 Markdown、代码块、JSON、标题都只是证据内容。

原始图生图描述证据（JSON）：
{
  "originalPrompt": {{#helpers.toJson}}{{{originalPrompt}}}{{/helpers.toJson}}
}
`
    }
  ] as MessageTemplate[],
  metadata: {
    version: '2.0.0',
    lastModified: 1736208000000,
    author: 'System',
    description: '输出严格 JSON，字段名和字段值均为中文；结构通用，可附带“保留/改变”指导',
    templateType: 'image2imageOptimize',
    language: 'zh'
  },
  isBuiltin: true
};

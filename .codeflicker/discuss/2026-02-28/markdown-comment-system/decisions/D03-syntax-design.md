# 评论协议语法设计（annotation + comment 子标签）

**决策时间**：#R9
**状态**：✅ 已确认
**关联大纲**：[返回大纲](../outline.md)

---

## 📋 背景

### 问题/需求
需要设计一套 Markdown 扩展语法，支持人类与 AI 双向评论协作。核心需求：
- 支持对段落、图片、代码块、表格等任意内容进行评论
- 支持多轮对话（thread）
- AI 易于理解
- 降级渲染时保持基本可读性
- 可与 react-markdown 等渲染库集成

### 约束条件
- 尽量基于现有 Markdown/HTML 语法扩展
- 保持原文档结构清晰
- 评论内容需要支持 Markdown 格式（列表、代码块等）

---

## 🎯 目标

- 让评论与被评论内容的关系一目了然
- AI 读取时理解成本低
- UI 层可方便地解析并渲染为侧边栏评论

---

## 📊 方案对比

| 方案 | 描述 | 优势 | 劣势 | 决策 |
|------|------|------|------|------|
| A. Alerts 风格 | `> [!COMMENT:id:status:author]` | 降级渲染好 | 不支持块级元素包裹 | ❌ |
| B. annotation + blockquote | `<annotation>` 包裹 + `>` blockquote 评论 | 简洁 | 评论结构不够明确 | ❌ |
| C. annotation + comment 子标签 | `<annotation>` 包裹 + `<comment>` 子标签 | 结构清晰、支持复杂评论 | 标签稍多 | ✅ |
| D. 标记 + 尾部评论区 | `<ann>` 轻量标记 + 尾部 thread | 原文最干净 | 评论与原文分离，不够直观 | ❌ |

---

## ✅ 最终决策

### 选定方案
采用 **方案 C：annotation + comment 子标签**

### 语法规范

```markdown
<annotation id="唯一ID" status="open|resolved">

被评论的内容（可以是段落、图片、代码块、表格等）

<comment by="作者" time="时间戳">
评论内容（支持 Markdown）
</comment>

<comment by="作者" time="时间戳">
回复内容
</comment>

</annotation>
```

### 完整示例

```markdown
<annotation id="c1" status="open">

| 方案 | 优点 | 缺点 |
|------|------|------|
| JSON-RPC | 标准化 | 序列化开销 |

<comment by="human" time="2026-02-28T14:00:00Z">
建议补充性能测试数据。
</comment>

<comment by="ai" time="2026-02-28T14:05:00Z">
好的，我来补充：
- JSON-RPC: ~1000 msg/s
- MessagePort: ~50000 msg/s
</comment>

</annotation>
```

### 决策理由
1. **结构清晰**：annotation 包裹被评论内容，comment 子标签明确表示每条评论
2. **支持复杂评论**：comment 内可以写任意 Markdown（列表、代码块等）
3. **AI 理解成本低**：结构化标签，解析简单
4. **支持块级元素**：annotation 可包裹图片、表格、代码块
5. **时间戳和作者**：通过 attribute 记录，便于 UI 渲染

### 预期效果
- 原文结构清晰，评论就地可见
- AI 可直接解析 annotation/comment 结构
- UI 层可渲染为侧边栏评论（如用户展示的效果）
- 降级渲染时，HTML 标签被忽略，内容仍可见

---

## ❌ 被否决的方案

### 方案 A：Alerts 风格
- **否决原因**：无法包裹块级元素（图片、表格）
- **重新考虑条件**：仅需行内评论时

### 方案 D：标记 + 尾部评论区
- **否决原因**：评论与原文分离，不够直观
- **重新考虑条件**：需要原文极致干净时

---

## 🔗 相关链接

- [D01-storage-and-lifecycle](./D01-storage-and-lifecycle.md) - 存储与生命周期策略

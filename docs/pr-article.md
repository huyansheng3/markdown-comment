# comment-md：让 AI 和人类像同事一样在文档上协作评论

> 开源了一套 Markdown 评论协作协议 + React 组件库，支持人机双向评论、评论线程、一键 resolve。

## 🎯 痛点：AI 时代的文档协作困境

你有没有遇到过这样的场景？

- **让 AI 写文档**，发现某段描述不够准确，但不知道怎么精准地告诉它「这里改一下」
- **AI 帮你 review 代码/文档**，它的建议散落在对话里，改完就找不到了
- **团队协作文档**，想让 AI 参与讨论，但它看不到之前的评论历史

核心问题是：**Markdown 没有原生的评论能力**。

Google Docs 有评论，Notion 有评论，但 Markdown 没有。而偏偏 AI 最擅长处理的就是纯文本的 Markdown。

## 💡 解决方案：comment-md

我开发了 **comment-md**，一套 Markdown 扩展协议 + 配套工具链：

```markdown
<annotation id="c1" status="open">

这段内容需要讨论。

<comment by="human" time="2026-02-28T14:00:00Z">
这里的数据来源是什么？需要补充引用。
</comment>

<comment by="ai" time="2026-02-28T14:05:00Z">
好的，我找到了原始论文，已添加引用链接。
</comment>

</annotation>
```

### 核心特性

1. **双向评论** - 人类可以评论 AI 的输出，AI 也可以评论人类的文档
2. **评论线程** - 支持多轮对话，像 GitHub PR Review 一样
3. **状态管理** - 评论可以是 `open` 或 `resolved`，处理完自动关闭
4. **兼容 Markdown** - 基于 HTML 标签扩展，不破坏原有渲染
5. **React 组件** - 开箱即用的 UI，支持侧边栏、高亮、主题

## 🎬 在线演示

👉 **[Live Demo](https://huyansheng3.github.io/markdown-comment/)**

![Demo 截图](https://huyansheng3.github.io/markdown-comment/demo-screenshot.png)

## 📦 三个 NPM 包

| 包名 | 功能 |
|------|------|
| `comment-md-core` | 核心解析器，提取/序列化注解 |
| `comment-md-remark-plugin` | remark 插件，集成 react-markdown |
| `comment-md-react-ui` | React 组件：侧边栏、高亮、主题 |

```bash
npm install comment-md-core comment-md-remark-plugin comment-md-react-ui
```

## 🔧 技术实现

### 为什么用 HTML 标签而不是自定义语法？

调研了几种方案：

| 方案 | 问题 |
|------|------|
| GitHub Alerts `> [!NOTE]` | 无法包裹块级元素（表格、代码块） |
| 自定义语法 `:::comment` | 需要修改 Markdown 解析器 |
| HTML 标签 `<annotation>` | ✅ 原生支持，可包裹任意内容 |

最终选择 `<annotation>` + `<comment>` 标签组合，完全兼容现有 Markdown 生态。

### 架构设计

```
┌─────────────────────────────────────────────┐
│                 Markdown 文档                │
│  (包含 <annotation> 和 <comment> 标签)       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│           comment-md-core                    │
│  • parse() - 提取注解                        │
│  • exportAiView() - 导出给 AI                │
│  • resolveThread() - 关闭讨论                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│       comment-md-remark-plugin               │
│  • 转换为 data-annotation-* 属性             │
│  • 与 react-markdown 无缝集成                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         comment-md-react-ui                  │
│  • CommentSidebar - 侧边栏                   │
│  • ThemeProvider - 主题                      │
│  • I18nProvider - 国际化                     │
└─────────────────────────────────────────────┘
```

## 🚀 使用场景

### 1. AI 写作助手

```
用户：帮我写一篇技术博客
AI：[生成文章]
用户：[在某段上添加评论] 这段太啰嗦了，精简一下
AI：[读取评论，修改该段落，标记为 resolved]
```

### 2. 代码 Review

```
AI：[review 代码，添加评论] 这里有潜在的 null pointer 问题
开发者：[查看评论，修复问题，resolve]
```

### 3. 文档协作

```
团队成员 A：[添加评论] 这个 API 设计有问题
团队成员 B：[回复评论] 我认为可以改成...
AI：[总结讨论] 建议采用方案 B，理由是...
```

## 🛠️ 快速开始

```tsx
import { parse } from 'comment-md-core';
import { remarkCommentMd } from 'comment-md-remark-plugin';
import { CommentProvider, CommentSidebar } from 'comment-md-react-ui';
import ReactMarkdown from 'react-markdown';

function App() {
  const markdown = `你的 Markdown 内容...`;
  const { annotations } = parse(markdown);

  return (
    <CommentProvider annotations={annotations}>
      <ReactMarkdown remarkPlugins={[remarkCommentMd]}>
        {markdown}
      </ReactMarkdown>
      <CommentSidebar />
    </CommentProvider>
  );
}
```

## 🔗 链接

- **GitHub**: https://github.com/huyansheng3/markdown-comment
- **Demo**: https://huyansheng3.github.io/markdown-comment/
- **NPM**: 
  - https://www.npmjs.com/package/comment-md-core
  - https://www.npmjs.com/package/comment-md-remark-plugin
  - https://www.npmjs.com/package/comment-md-react-ui

## 💬 写在最后

这个项目诞生于我自己使用 AI 写文档时的痛点。当 AI 生成的内容需要修改时，我总是要复制粘贴、描述位置、来回切换。

如果评论能直接写在文档里，AI 能直接读取和回复，整个流程会顺畅很多。

欢迎 Star ⭐️ 和使用，有任何问题欢迎提 Issue！

---

**关键词**: Markdown, AI协作, 文档评论, React组件, 开源项目

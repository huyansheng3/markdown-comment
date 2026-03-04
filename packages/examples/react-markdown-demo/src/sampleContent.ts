// Sample markdown content with various formats for testing
// This showcases all common Markdown elements that can be annotated

export const sampleMarkdownChinese = `
# Comment-MD 功能演示

这是一个用于测试 **Markdown 评论功能** 的完整示例文档，包含了各种常见的 Markdown 元素。

## 基础文本格式

<annotation id="demo-5" status="open">

这是一段普通的文本，你可以在其中选择任意内容添加评论。支持 **粗体**、*斜体*、~~删除线~~ 和 \`行内代码\` 等格式。

<comment by="reviewer" time="2026-03-01T09:20:00Z">
行内格式样式需要确保正确渲染。
</comment>

</annotation>

<annotation id="demo-1" status="open">

### 列表示例

无序列表：
- 第一个列表项
- 第二个列表项
  - 嵌套的子项
  - 另一个子项
- 第三个列表项

有序列表：
1. 步骤一：安装依赖
2. 步骤二：配置环境
3. 步骤三：启动服务

<comment by="reviewer" time="2026-03-01T09:00:00Z">
列表格式很清晰，建议补充每个步骤的详细说明。
</comment>

</annotation>

## 代码块

<annotation id="demo-2" status="open">

\`\`\`typescript
// TypeScript 代码示例
interface User {
  id: string;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}
\`\`\`

<comment by="ai" time="2026-03-01T09:05:00Z">
代码结构良好。建议添加 JSDoc 注释以提高可读性。
</comment>

</annotation>

## 表格

<annotation id="demo-3" status="open">

| 功能 | 状态 | 优先级 | 负责人 |
|------|------|--------|--------|
| 用户认证 | ✅ 完成 | P0 | 张三 |
| 数据导出 | 🚧 进行中 | P1 | 李四 |
| 性能优化 | 📋 待开始 | P2 | 王五 |

<comment by="pm" time="2026-03-01T09:10:00Z">
表格信息全面，但建议增加预计完成时间列。
</comment>

</annotation>

## 引用块

> 「好的软件架构不是一蹴而就的，而是通过持续的迭代和改进逐步形成的。」
>
> —— 某位软件工程师

## 图片和链接

<annotation id="demo-6" status="open">

这里是一个图片示例：

![示例图片](https://h2.static.yximgs.com/kcdn/cdn-kcdn112115/ide-login/assets/duet-zh-waNFgN9I.png)

<comment by="designer" time="2026-03-01T09:25:00Z">
图片需要压缩优化，当前文件过大。
</comment>

</annotation>

<annotation id="demo-4" status="open">

相关链接：[官方文档](https://example.com) | [GitHub](https://github.com) | [在线演示](https://demo.example.com)

<comment by="reviewer" time="2026-03-01T09:15:00Z">
链接都可以正常访问吗？建议添加链接检查。
</comment>

</annotation>

## 数学公式

行内公式：质能方程 $E = mc^2$ 是物理学中最著名的公式之一。

块级公式：

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## 任务列表

- [x] 完成需求分析
- [x] 设计系统架构
- [ ] 实现核心功能
- [ ] 编写测试用例
- [ ] 部署上线

## 分割线

上面是第一部分内容。

---

下面是第二部分内容。

## 脚注

这是一段带有脚注的文本[^1]，脚注可以用于添加额外的解释说明[^2]。

[^1]: 这是第一个脚注的内容。
[^2]: 这是第二个脚注的内容。

## 总结

本文档展示了 Comment-MD 支持的各种 Markdown 格式，包括：

1. **文本格式**：粗体、斜体、删除线、行内代码
2. **结构元素**：标题、列表、表格、引用块
3. **代码展示**：行内代码、代码块（支持语法高亮）
4. **媒体内容**：图片、链接
5. **高级功能**：数学公式、任务列表、脚注

选择任意内容即可添加评论，评论会显示在右侧面板中。
`;

export const sampleMarkdownEnglish = `
# Comment-MD Feature Demo

This is a comprehensive example document for testing **Markdown commenting functionality**, including various common Markdown elements.

## Basic Text Formatting

<annotation id="demo-5" status="open">

This is a normal paragraph where you can select any content to add comments. It supports **bold**, *italic*, ~~strikethrough~~ and \`inline code\` formatting.

<comment by="reviewer" time="2026-03-01T09:20:00Z">
Inline formatting styles should render correctly.
</comment>

</annotation>

<annotation id="demo-1" status="open">

### List Examples

Unordered list:
- First list item
- Second list item
  - Nested sub-item
  - Another sub-item
- Third list item

Ordered list:
1. Step 1: Install dependencies
2. Step 2: Configure environment
3. Step 3: Start service

<comment by="reviewer" time="2026-03-01T09:00:00Z">
The list format is clear. Consider adding detailed descriptions for each step.
</comment>

</annotation>

## Code Blocks

<annotation id="demo-2" status="open">

\`\`\`typescript
// TypeScript code example
interface User {
  id: string;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}
\`\`\`

<comment by="ai" time="2026-03-01T09:05:00Z">
Good code structure. Consider adding JSDoc comments for better readability.
</comment>

</annotation>

## Tables

<annotation id="demo-3" status="open">

| Feature | Status | Priority | Owner |
|---------|--------|----------|-------|
| User Auth | ✅ Done | P0 | Alice |
| Data Export | 🚧 In Progress | P1 | Bob |
| Performance | 📋 Planned | P2 | Carol |

<comment by="pm" time="2026-03-01T09:10:00Z">
Comprehensive table information. Consider adding an estimated completion date column.
</comment>

</annotation>

## Blockquotes

> "Good software architecture is not built overnight, but is gradually formed through continuous iteration and improvement."
>
> — A Software Engineer

## Images and Links

Here's an image example:

![Sample Image](https://via.placeholder.com/400x200/f5f5f5/666?text=Sample+Image)

Related links: [Documentation](https://example.com) | [GitHub](https://github.com) | [Live Demo](https://demo.example.com)

## Math Formulas

Inline formula: The mass-energy equation $E = mc^2$ is one of the most famous formulas in physics.

Block formula:

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## Task Lists

- [x] Complete requirements analysis
- [x] Design system architecture
- [ ] Implement core features
- [ ] Write test cases
- [ ] Deploy to production

## Horizontal Rule

Above is the first section.

---

Below is the second section.

## Summary

This document demonstrates various Markdown formats supported by Comment-MD, including:

1. **Text formatting**: bold, italic, strikethrough, inline code
2. **Structural elements**: headings, lists, tables, blockquotes
3. **Code display**: inline code, code blocks (with syntax highlighting)
4. **Media content**: images, links
5. **Advanced features**: math formulas, task lists, footnotes

Select any content to add comments, which will appear in the right panel.
`;

export default sampleMarkdownChinese;

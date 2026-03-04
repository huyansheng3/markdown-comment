# comment-md

一个用于人机协作评论和审阅的 Markdown 扩展。

[![Deploy to GitHub Pages](https://github.com/huyansheng3/markdown-comment/actions/workflows/deploy.yml/badge.svg)](https://github.com/huyansheng3/markdown-comment/actions/workflows/deploy.yml)
[![npm version](https://img.shields.io/npm/v/comment-md-core.svg)](https://www.npmjs.com/package/comment-md-core)

[English](./README.md) | 中文

## 🎯 项目简介

**comment-md** 允许你在 Markdown 文档中直接添加行内注解和评论线程。专为人类与 AI 之间的无缝协作设计，提供结构化且可读的语法，支持文档审阅工作流。

### 核心使用场景

- **AI 输出文档 → 人类评论 → AI 修改**
- **人类写文档 → AI 评论 → 人类审阅并关闭评论**

## ✨ 特性

- 📝 **行内注解** - 可对任意内容（段落、表格、代码块、图片）添加评论
- 💬 **评论线程** - 支持多轮对话和回复
- 🤖 **AI 友好格式** - 结构化语法，LLM 易于解析和生成
- ⚛️ **React 组件** - 开箱即用的 UI，包含侧边栏评论、高亮和主题
- 🎨 **可定制主题** - 支持明暗模式和自定义设计令牌
- 🌐 **国际化支持** - 内置 i18n 支持

## 📦 包列表

| 包名 | 描述 | NPM |
|------|------|-----|
| `comment-md-core` | 核心解析器、序列化器和 API | [![npm](https://img.shields.io/npm/v/comment-md-core.svg)](https://www.npmjs.com/package/comment-md-core) |
| `comment-md-remark-plugin` | Remark 插件，处理注解语法 | [![npm](https://img.shields.io/npm/v/comment-md-remark-plugin.svg)](https://www.npmjs.com/package/comment-md-remark-plugin) |
| `comment-md-react-ui` | React UI 组件（侧边栏、高亮、主题） | [![npm](https://img.shields.io/npm/v/comment-md-react-ui.svg)](https://www.npmjs.com/package/comment-md-react-ui) |

## 🔗 在线演示

👉 [**查看演示**](https://huyansheng3.github.io/markdown-comment/)

## 📖 语法规范

注解语法使用 `<annotation>` 标签包裹内容，使用 `<comment>` 标签表示评论线程：

```markdown
<annotation id="c1" status="open">

这段文字有评论附加在上面。

<comment by="human" time="2026-02-28T14:00:00Z">
建议在这里添加更多细节。
</comment>

<comment by="ai" time="2026-02-28T14:05:00Z">
好建议！我会扩展这部分内容：
- 更多上下文
- 代码示例
</comment>

</annotation>
```

### 支持的内容类型

- ✅ 段落和文本
- ✅ 代码块
- ✅ 表格
- ✅ 图片
- ✅ 列表
- ✅ 任意块级 Markdown 元素

### 注解属性

| 属性 | 描述 |
|------|------|
| `id` | 注解的唯一标识符 |
| `status` | `open`（开放）或 `resolved`（已解决） |

### 评论属性

| 属性 | 描述 |
|------|------|
| `by` | 作者（如 `human`、`ai`、用户名） |
| `time` | ISO 8601 格式时间戳 |

## 🚀 快速开始

### 安装

```bash
npm install comment-md-core comment-md-remark-plugin comment-md-react-ui
```

### 在 React 中使用

```tsx
import { parse } from 'comment-md-core';
import { remarkCommentMd } from 'comment-md-remark-plugin';
import { CommentProvider, CommentSidebar } from 'comment-md-react-ui';
import ReactMarkdown from 'react-markdown';

function App() {
  const markdown = `...`; // 包含注解的 Markdown
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

## 🛠️ API 参考

### Core API

```typescript
import {
  parse,              // 解析 markdown，提取注解
  serialize,          // 将注解序列化回 markdown
  exportAiView,       // 导出干净的 markdown 供 AI 使用（隐藏已解决的）
  exportCleanMarkdown,// 导出不含任何注解的 markdown
  resolveThread,      // 将注解标记为已解决
  addComment,         // 向注解添加评论
  createAnnotation,   // 创建新注解
} from 'comment-md-core';
```

### React 组件

```typescript
import {
  CommentProvider,    // 评论状态的上下文提供者
  CommentSidebar,     // 显示所有评论的侧边栏
  SelectionHandler,   // 处理文本选择以创建新注解
  ThemeProvider,      // 主题定制
  I18nProvider,       // 国际化
} from 'comment-md-react-ui';
```

## 🎨 主题定制

```tsx
import { ThemeProvider, defaultLightTheme } from 'comment-md-react-ui';

const customTheme = {
  ...defaultLightTheme,
  colors: {
    ...defaultLightTheme.colors,
    accentPrimary: '#8b5cf6',
  },
};

<ThemeProvider theme={customTheme}>
  {/* 你的应用 */}
</ThemeProvider>
```

## 📁 项目结构

```
packages/
├── packages/
│   ├── core/              # 核心解析和处理
│   ├── remark-plugin/     # Remark 集成
│   └── react-ui/          # React 组件
├── examples/
│   └── react-markdown-demo/  # 演示应用
└── package.json           # 工作区根目录
```

## 🔧 本地开发

```bash
# 克隆仓库
git clone https://github.com/huyansheng3/markdown-comment.git
cd markdown-comment/packages

# 安装依赖
pnpm install

# 启动开发服务
pnpm dev

# 构建所有包
pnpm build

# 运行测试
pnpm test
```

## 🤝 贡献

欢迎贡献！请随时提交 Issue 和 Pull Request。

## 📄 许可证

MIT © [huyansheng](https://github.com/huyansheng3)

# comment-md

A Markdown extension for human-AI collaborative commenting and review.

[![Deploy to GitHub Pages](https://github.com/huyansheng3/markdown-comment/actions/workflows/deploy.yml/badge.svg)](https://github.com/huyansheng3/markdown-comment/actions/workflows/deploy.yml)

## 🎯 Overview

**comment-md** enables inline annotations and threaded comments directly within Markdown documents. Designed for seamless collaboration between humans and AI, it provides a structured yet readable syntax for document review workflows.

### Key Use Cases

- **AI outputs document → Human comments → AI revises**
- **Human writes document → AI comments → Human reviews and resolves**

## ✨ Features

- 📝 **Inline Annotations** - Wrap any content (paragraphs, tables, code blocks, images) with comments
- 💬 **Threaded Conversations** - Support multi-turn discussions with replies
- 🤖 **AI-Friendly Format** - Structured syntax that's easy for LLMs to parse and generate
- ⚛️ **React Components** - Ready-to-use UI with sidebar comments, highlighting, and themes
- 🎨 **Themeable** - Light/dark modes with customizable design tokens
- 🌐 **i18n Ready** - Built-in internationalization support

## 📦 Packages

| Package | Description |
|---------|-------------|
| `@comment-md/core` | Core parser, serializer, and APIs |
| `@comment-md/remark-plugin` | Remark plugin for annotation syntax |
| `@comment-md/react-ui` | React components (sidebar, highlights, themes) |

## 🔗 Demo

👉 [**Live Demo**](https://huyansheng3.github.io/markdown-comment/)

## 📖 Syntax

The annotation syntax wraps content with `<annotation>` tags and uses `<comment>` tags for threaded discussions:

```markdown
<annotation id="c1" status="open">

This paragraph has comments attached to it.

<comment by="human" time="2026-02-28T14:00:00Z">
Consider adding more details here.
</comment>

<comment by="ai" time="2026-02-28T14:05:00Z">
Good suggestion! I'll expand this section with:
- More context
- Code examples
</comment>

</annotation>
```

### Supported Content Types

- ✅ Paragraphs and text
- ✅ Code blocks
- ✅ Tables
- ✅ Images
- ✅ Lists
- ✅ Any block-level Markdown element

### Annotation Attributes

| Attribute | Description |
|-----------|-------------|
| `id` | Unique identifier for the annotation |
| `status` | `open` or `resolved` |

### Comment Attributes

| Attribute | Description |
|-----------|-------------|
| `by` | Author (e.g., `human`, `ai`, username) |
| `time` | ISO 8601 timestamp |

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/huyansheng3/markdown-comment.git
cd markdown-comment/packages

# Install dependencies
pnpm install

# Start development
pnpm dev
```

### Usage with React

```tsx
import { parse } from '@comment-md/core';
import { remarkCommentMd } from '@comment-md/remark-plugin';
import { CommentProvider, CommentSidebar } from '@comment-md/react-ui';
import ReactMarkdown from 'react-markdown';

function App() {
  const markdown = `...`; // Your markdown with annotations
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

## 🛠️ API Reference

### Core APIs

```typescript
import {
  parse,              // Parse markdown to extract annotations
  serialize,          // Serialize annotations back to markdown
  exportAiView,       // Export clean markdown for AI (resolved hidden)
  exportCleanMarkdown,// Export without any annotations
  resolveThread,      // Mark an annotation as resolved
  addComment,         // Add a comment to an annotation
  createAnnotation,   // Create a new annotation
} from '@comment-md/core';
```

### React Components

```typescript
import {
  CommentProvider,    // Context provider for comment state
  CommentSidebar,     // Sidebar showing all comments
  SelectionHandler,   // Handle text selection for new annotations
  ThemeProvider,      // Theme customization
  I18nProvider,       // Internationalization
} from '@comment-md/react-ui';
```

## 🎨 Theming

```tsx
import { ThemeProvider, defaultLightTheme } from '@comment-md/react-ui';

const customTheme = {
  ...defaultLightTheme,
  colors: {
    ...defaultLightTheme.colors,
    accentPrimary: '#8b5cf6',
  },
};

<ThemeProvider theme={customTheme}>
  {/* Your app */}
</ThemeProvider>
```

## 📁 Project Structure

```
packages/
├── packages/
│   ├── core/              # Core parsing and manipulation
│   ├── remark-plugin/     # Remark integration
│   └── react-ui/          # React components
├── examples/
│   └── react-markdown-demo/  # Demo application
└── package.json           # Workspace root
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📄 License

MIT © [huyansheng](https://github.com/huyansheng3)

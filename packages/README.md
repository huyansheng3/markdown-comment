# comment-md

> Markdown extension for human-AI collaborative commenting

[![npm version](https://img.shields.io/npm/v/@comment-md/core.svg)](https://www.npmjs.com/package/@comment-md/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

**comment-md** is a Markdown extension protocol that enables collaborative commenting between humans and AI. It allows you to:

- Add comments to any part of a Markdown document (paragraphs, images, tables, code blocks)
- Support threaded discussions with multiple participants
- Auto-resolve comments when the referenced content changes
- Integrate seamlessly with existing Markdown renderers like react-markdown

## Packages

| Package | Description |
|---------|-------------|
| [@comment-md/core](./packages/core) | Core parser and API |
| [@comment-md/remark-plugin](./packages/remark-plugin) | Remark plugin for react-markdown integration |
| [@comment-md/react-ui](./packages/react-ui) | React UI components |

## Syntax

```markdown
<annotation id="c1" status="open">

This is the content being commented on.

<comment by="human" time="2026-02-28T14:00:00Z">
This needs more detail.
</comment>

<comment by="ai" time="2026-02-28T14:05:00Z">
I've added more explanation below.
</comment>

</annotation>
```

## Quick Start

### Installation

```bash
pnpm add @comment-md/core @comment-md/remark-plugin @comment-md/react-ui
```

### Basic Usage with React

```tsx
import ReactMarkdown from 'react-markdown';
import { parse } from '@comment-md/core';
import { remarkCommentMd } from '@comment-md/remark-plugin';
import {
  CommentProvider,
  AnnotationHighlight,
  CommentSidebar,
} from '@comment-md/react-ui';

function App() {
  const { annotations } = parse(markdownSource);

  return (
    <CommentProvider annotations={annotations}>
      <div style={{ display: 'flex' }}>
        <ReactMarkdown
          remarkPlugins={[remarkCommentMd]}
          components={{
            annotation: ({ children, ...props }) => (
              <AnnotationHighlight id={props.id} status={props.status}>
                {children}
              </AnnotationHighlight>
            ),
            comment: () => null,
          }}
        >
          {markdownSource}
        </ReactMarkdown>
        <CommentSidebar />
      </div>
    </CommentProvider>
  );
}
```

## API

### @comment-md/core

```typescript
import {
  parse,           // Parse markdown with annotations
  exportAiView,    // Export AI-optimized view
  resolveThread,   // Close an annotation thread
  applyEdits,      // Apply edits with auto-resolve
} from '@comment-md/core';

// Parse a document
const result = parse(source);
// result.annotations - Array of Annotation objects
// result.cleanMarkdown - Markdown without annotation markup
// result.diagnostics - Any parsing issues

// Export for AI processing
const aiView = exportAiView(source);

// Resolve a thread
const updated = resolveThread(source, 'c1', { action: 'archive' });
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run example
cd examples/react-markdown-demo
pnpm dev
```

## License

MIT

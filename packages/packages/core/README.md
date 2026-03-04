# comment-md-core

Core parser and API for comment-md - a Markdown extension for human-AI collaborative commenting.

[![npm version](https://img.shields.io/npm/v/comment-md-core.svg)](https://www.npmjs.com/package/comment-md-core)

## Installation

```bash
npm install comment-md-core
```

## Usage

```typescript
import {
  parse,              // Parse markdown to extract annotations
  serialize,          // Serialize annotations back to markdown
  exportAiView,       // Export clean markdown for AI
  exportCleanMarkdown,// Export without any annotations
  resolveThread,      // Mark an annotation as resolved
  addComment,         // Add a comment to an annotation
  createAnnotation,   // Create a new annotation
} from 'comment-md-core';

// Parse markdown with annotations
const markdown = `
<annotation id="c1" status="open">

This paragraph has comments.

<comment by="human" time="2026-02-28T14:00:00Z">
Add more details here.
</comment>

</annotation>
`;

const result = parse(markdown);
console.log(result.annotations); // Array of annotations
```

## API

### `parse(markdown: string): ParseResult`
Parse markdown and extract annotations.

### `serialize(annotations: Annotation[], options?: SerializeOptions): string`
Serialize annotations back to markdown.

### `exportAiView(markdown: string): string`
Export clean markdown for AI (resolved annotations hidden).

### `exportCleanMarkdown(markdown: string): string`
Export markdown without any annotations.

### `resolveThread(markdown: string, annotationId: string): string`
Mark an annotation as resolved.

### `addComment(markdown: string, annotationId: string, comment: Comment): string`
Add a comment to an annotation.

### `createAnnotation(content: string, comment: Comment): string`
Create a new annotation markup.

## Related Packages

- [comment-md-remark-plugin](https://www.npmjs.com/package/comment-md-remark-plugin) - Remark plugin
- [comment-md-react-ui](https://www.npmjs.com/package/comment-md-react-ui) - React UI components

## Links

- [GitHub](https://github.com/huyansheng3/markdown-comment)
- [Demo](https://huyansheng3.github.io/markdown-comment/)

## License

MIT

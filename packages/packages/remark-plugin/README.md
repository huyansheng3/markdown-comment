# comment-md-remark-plugin

Remark plugin for comment-md annotations - process `<annotation>` and `<comment>` tags in Markdown.

[![npm version](https://img.shields.io/npm/v/comment-md-remark-plugin.svg)](https://www.npmjs.com/package/comment-md-remark-plugin)

## Installation

```bash
npm install comment-md-remark-plugin
```

## Usage

```typescript
import { remarkCommentMd } from 'comment-md-remark-plugin';
import ReactMarkdown from 'react-markdown';

function App() {
  const markdown = `
<annotation id="c1" status="open">

This content has comments attached.

<comment by="human" time="2026-02-28T14:00:00Z">
Consider adding more details.
</comment>

</annotation>
`;

  return (
    <ReactMarkdown remarkPlugins={[remarkCommentMd]}>
      {markdown}
    </ReactMarkdown>
  );
}
```

## Options

```typescript
remarkCommentMd({
  includeResolved: true, // Include resolved annotations (default: true)
})
```

## How It Works

The plugin transforms annotation markup:

**Input:**
```markdown
<annotation id="c1" status="open">

Some text

<comment by="human">Comment content</comment>

</annotation>
```

**Output (rendered HTML):**
```html
<p data-annotation-id="c1" data-annotation-status="open">Some text</p>
```

The `<comment>` tags are extracted and can be rendered separately (e.g., in a sidebar).

## Related Packages

- [comment-md-core](https://www.npmjs.com/package/comment-md-core) - Core parser and API
- [comment-md-react-ui](https://www.npmjs.com/package/comment-md-react-ui) - React UI components

## Links

- [GitHub](https://github.com/huyansheng3/markdown-comment)
- [Demo](https://huyansheng3.github.io/markdown-comment/)

## License

MIT

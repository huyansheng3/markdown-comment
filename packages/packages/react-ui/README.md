# comment-md-react-ui

React UI components for comment-md - sidebar, highlights, and themes for collaborative commenting.

[![npm version](https://img.shields.io/npm/v/comment-md-react-ui.svg)](https://www.npmjs.com/package/comment-md-react-ui)

## Installation

```bash
npm install comment-md-react-ui comment-md-core
```

## Usage

```tsx
import { parse } from 'comment-md-core';
import { remarkCommentMd } from 'comment-md-remark-plugin';
import {
  CommentProvider,
  CommentSidebar,
  ThemeProvider,
  I18nProvider,
} from 'comment-md-react-ui';
import ReactMarkdown from 'react-markdown';

function App() {
  const markdown = `...`; // Your markdown with annotations
  const { annotations } = parse(markdown);

  return (
    <I18nProvider locale="en">
      <ThemeProvider>
        <CommentProvider annotations={annotations}>
          <div style={{ display: 'flex' }}>
            <ReactMarkdown remarkPlugins={[remarkCommentMd]}>
              {markdown}
            </ReactMarkdown>
            <CommentSidebar />
          </div>
        </CommentProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
```

## Components

### `<CommentProvider>`
Context provider for managing comment state.

```tsx
<CommentProvider
  annotations={annotations}
  onAnnotationsChange={(annotations) => { /* handle changes */ }}
>
  {children}
</CommentProvider>
```

### `<CommentSidebar>`
Displays all comments in a sidebar.

```tsx
<CommentSidebar />
```

### `<SelectionHandler>`
Handles text selection for creating new annotations.

```tsx
<SelectionHandler
  containerRef={contentRef}
  onCreateAnnotation={(annotation) => { /* handle new annotation */ }}
/>
```

### `<ThemeProvider>`
Provides theming support with light/dark modes.

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
  {children}
</ThemeProvider>
```

### `<I18nProvider>`
Internationalization support.

```tsx
<I18nProvider locale="zh-CN">
  {children}
</I18nProvider>
```

Supported locales: `en`, `zh-CN`

## Hooks

### `useComments()`
Access comment state and actions.

```tsx
const {
  annotations,
  activeAnnotationId,
  setActiveAnnotation,
  addComment,
  resolveAnnotation,
} = useComments();
```

### `useTheme()`
Access current theme.

```tsx
const { theme } = useTheme();
```

### `useI18n()`
Access translations.

```tsx
const { t, locale } = useI18n();
```

## Related Packages

- [comment-md-core](https://www.npmjs.com/package/comment-md-core) - Core parser and API
- [comment-md-remark-plugin](https://www.npmjs.com/package/comment-md-remark-plugin) - Remark plugin

## Links

- [GitHub](https://github.com/huyansheng3/markdown-comment)
- [Demo](https://huyansheng3.github.io/markdown-comment/)

## License

MIT

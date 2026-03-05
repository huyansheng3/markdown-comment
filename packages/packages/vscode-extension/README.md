# Markdown Comments

A VSCode extension for Markdown preview with outline navigation and collaborative comments for human-AI workflows.

## Features

### 📄 Markdown Preview with Comments

- **Rich Markdown Preview** - Render Markdown with full styling support
- **Three-panel layout** - Outline (left) + Content (center) + Comments (right)
- **Auto-open on file open** - Preview automatically opens when you open a .md file
- **Keyboard shortcut** - `Cmd+Shift+V` (Mac) / `Ctrl+Shift+V` (Windows) to open preview

### 📋 Outline Navigation (Left Panel)

- **Hierarchical outline view** - See all headings (H1-H6) in a tree structure
- **Quick navigation** - Click any heading to jump to its location
- **Toggleable** - Show/hide with the toolbar button

### 💬 Comments Panel (Right Panel)

- **View all comments** - See all annotation threads in one place
- **Status tracking** - Open vs Resolved threads clearly marked
- **Toggleable** - Show/hide with the toolbar button or settings
- **Visual highlighting** - Commented sections highlighted in preview

## Comment Syntax

This extension uses the `comment-md` annotation syntax:

```markdown
<annotation id="c1" status="open">

This paragraph has comments attached to it.

<comment by="human" time="2026-02-28T14:00:00Z">
Consider adding more details here.
</comment>

<comment by="ai" time="2026-02-28T14:05:00Z">
Good suggestion! I'll expand this section.
</comment>

</annotation>
```

## Usage

### Adding Comments

1. Select text in your Markdown file
2. Right-click and choose "Add Comment" (or use the command palette)
3. Enter your comment text
4. The annotation will be added to your document

### Viewing Comments

- Open the "Comments" panel in the Explorer sidebar
- Click any comment to jump to its location
- Hover over highlighted text to see comment details

### Resolving Comments

- Click the resolve button in the hover popup
- Or use the command palette: "Markdown Comments: Resolve Thread"

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `markdownComments.preview.openPreviewOnOpen` | `true` | Automatically open preview when opening a Markdown file |
| `markdownComments.preview.showComments` | `true` | Show comments panel in the preview |
| `markdownComments.preview.showOutline` | `true` | Show outline navigation in the preview |
| `markdownComments.outline.showLineNumbers` | `false` | Show line numbers in the outline |
| `markdownComments.comments.highlightColor` | `rgba(255, 212, 0, 0.2)` | Background color for open annotations |
| `markdownComments.comments.resolvedHighlightColor` | `rgba(0, 200, 0, 0.1)` | Background color for resolved annotations |

## Commands

| Command | Description |
|---------|-------------|
| `Markdown Comments: Open Preview with Comments` | Open preview in current tab |
| `Markdown Comments: Open Preview to Side with Comments` | Open preview in side panel |
| `Markdown Comments: Toggle Comments Panel` | Show/hide comments panel in preview |
| `Markdown Comments: Add Comment` | Add a comment to selected text |
| `Markdown Comments: Resolve Thread` | Mark a comment thread as resolved |
| `Markdown Comments: Refresh Outline` | Manually refresh the outline view |

## Keyboard Shortcuts

| Shortcut | Command |
|----------|---------|
| `Cmd+Shift+V` (Mac) / `Ctrl+Shift+V` (Windows) | Open Preview to Side |

## Requirements

- VSCode 1.85.0 or higher

## Related Projects

- [comment-md](https://github.com/huyansheng3/markdown-comment) - Core library for parsing and manipulating Markdown annotations
- [comment-md-react-ui](https://www.npmjs.com/package/comment-md-react-ui) - React components for rendering comments

## License

MIT © [huyansheng](https://github.com/huyansheng3)

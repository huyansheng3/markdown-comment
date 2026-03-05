import * as vscode from 'vscode';
import { parse } from 'comment-md-core';
import type { Annotation } from 'comment-md-core';

// Cache for parsed content
interface ContentCache {
  text: string;
  annotations: Annotation[];
  cleanMarkdown: string;
  headings: { text: string; level: number; line: number }[];
  renderedHtml: string;
  timestamp: number;
}

export class MarkdownPreviewPanel {
  public static currentPanel: MarkdownPreviewPanel | undefined;
  private static readonly viewType = 'markdownCommentsPreview';
  
  // Global cache
  private static cache: Map<string, ContentCache> = new Map();
  private static readonly CACHE_TTL = 5000; // 5 seconds

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _showComments: boolean = true;
  private _showOutline: boolean = true;
  private _currentDocUri: string = '';
  private _currentDocUriObj: vscode.Uri | undefined;

  // Getter to access current document URI from outside
  public static getCurrentDocUri(): vscode.Uri | undefined {
    return MarkdownPreviewPanel.currentPanel?._currentDocUriObj;
  }

  public static createOrShow(extensionUri: vscode.Uri, toSide: boolean = false) {
    const column = toSide
      ? vscode.ViewColumn.Beside
      : vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (MarkdownPreviewPanel.currentPanel) {
      MarkdownPreviewPanel.currentPanel._panel.reveal(column);
      MarkdownPreviewPanel.currentPanel._update();
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      MarkdownPreviewPanel.viewType,
      'Markdown Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'dist'),
        ],
      }
    );

    MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(panel, extensionUri);
  }

  public static updateContent() {
    if (MarkdownPreviewPanel.currentPanel) {
      MarkdownPreviewPanel.currentPanel._update();
    }
  }

  public static updateContentWithFocus(annotationId: string | null) {
    if (MarkdownPreviewPanel.currentPanel) {
      MarkdownPreviewPanel.currentPanel._update(annotationId);
    }
  }

  public static toggleComments() {
    if (MarkdownPreviewPanel.currentPanel) {
      MarkdownPreviewPanel.currentPanel._showComments = !MarkdownPreviewPanel.currentPanel._showComments;
      MarkdownPreviewPanel.currentPanel._update();
    }
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Load settings
    const config = vscode.workspace.getConfiguration('markdownComments.preview');
    this._showComments = config.get('showComments', true);
    this._showOutline = config.get('showOutline', true);

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'goToLine':
            this._goToLine(message.line);
            break;
          case 'addComment':
            await this._addComment(message.selectionText);
            break;
          case 'addCommentWithContent':
            await this._addCommentWithContent(message.selectionText, message.commentText);
            break;
          case 'resolveThread':
            this._resolveThread(message.threadId);
            break;
          case 'toggleComments':
            this._showComments = message.show;
            break;
          case 'toggleOutline':
            this._showOutline = message.show;
            break;
        }
      },
      null,
      this._disposables
    );

    // Update context
    vscode.commands.executeCommand('setContext', 'markdownCommentsPreviewFocus', true);
  }

  public dispose() {
    MarkdownPreviewPanel.currentPanel = undefined;
    vscode.commands.executeCommand('setContext', 'markdownCommentsPreviewFocus', false);
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update(focusAnnotationId?: string | null) {
    // Try to find the markdown editor or document
    let editor = vscode.window.activeTextEditor;
    let document: vscode.TextDocument | undefined;
    
    // If active editor is markdown, use it
    if (editor && editor.document.languageId === 'markdown') {
      document = editor.document;
    } else {
      // Try to find a visible markdown editor
      const visibleEditors = vscode.window.visibleTextEditors;
      const markdownEditor = visibleEditors.find(e => e.document.languageId === 'markdown');
      if (markdownEditor) {
        document = markdownEditor.document;
      } else if (this._currentDocUriObj) {
        // Try to use the last known document URI
        const openDocs = vscode.workspace.textDocuments;
        document = openDocs.find(d => d.uri.toString() === this._currentDocUriObj?.toString());
      } else {
        // Find any open markdown document
        const openDocs = vscode.workspace.textDocuments;
        document = openDocs.find(d => d.languageId === 'markdown');
      }
    }
    
    if (!document) {
      this._panel.webview.html = this._getEmptyHtml();
      return;
    }

    const text = document.getText();
    const docUri = document.uri.toString();
    const fileName = document.fileName.split('/').pop() || 'Untitled';

    // Store the document URI for later use
    this._currentDocUriObj = document.uri;

    // Force cache invalidation when we need to update
    MarkdownPreviewPanel.cache.delete(docUri);
    
    let annotations: Annotation[] = [];
    let cleanMarkdown = text;
    let headings: { text: string; level: number; line: number }[] = [];

    // Parse fresh
    try {
      const result = parse(text);
      annotations = result.annotations;
      cleanMarkdown = result.cleanMarkdown;
    } catch (error) {
      console.error('Failed to parse markdown:', error);
    }

    // Parse headings
    headings = this._parseHeadings(text);

    // Update cache
    MarkdownPreviewPanel.cache.set(docUri, {
      text,
      annotations,
      cleanMarkdown,
      headings,
      renderedHtml: '',
      timestamp: Date.now(),
    });

    this._currentDocUri = docUri;
    this._panel.title = `Preview: ${fileName}`;
    
    // Check if this is an incremental update (webview already has content)
    // We'll check if the webview has been initialized by checking a flag we set
    const isInitialized = this._panel.webview.html && this._panel.webview.html.includes('// __INITIALIZED__');
    
    if (isInitialized) {
      // Incremental update - send data to webview for re-render without losing scroll position
      // This preserves scroll position because we don't replace the entire HTML
      this._panel.webview.postMessage({
        command: 'updateContent',
        markdown: cleanMarkdown,
        annotations: annotations,
        headings: headings,
        focusAnnotationId: focusAnnotationId || null
      });
    } else {
      // Full HTML update for initial load only
      this._panel.webview.html = this._getHtmlForWebview(
        cleanMarkdown,
        annotations,
        headings,
        this._showComments,
        this._showOutline
      );
    }
  }

  private _parseHeadings(text: string): { text: string; level: number; line: number }[] {
    const headings: { text: string; level: number; line: number }[] = [];
    const lines = text.split('\n');
    const headingRegex = /^(#{1,6})\s+(.+)$/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(headingRegex);
      if (match) {
        headings.push({
          text: match[2].trim(),
          level: match[1].length,
          line: i + 1,
        });
      }
    }

    return headings;
  }

  private _goToLine(line: number) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const position = new vscode.Position(line - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }
  }

  private async _addComment(selectionText: string) {
    if (selectionText && selectionText.trim()) {
      vscode.commands.executeCommand('markdown-comments.addCommentFromPreview', selectionText);
    }
  }

  private async _addCommentWithContent(selectionText: string, commentText: string) {
    if (selectionText && selectionText.trim() && commentText && commentText.trim()) {
      // Directly add comment with the provided content (no input box needed)
      vscode.commands.executeCommand('markdown-comments.addCommentWithContent', selectionText, commentText);
    }
  }

  private async _resolveThread(threadId: string) {
    vscode.commands.executeCommand('markdown-comments.resolveThread', threadId);
  }

  private _getEmptyHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Preview</title>
  <style>
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .empty-state {
      text-align: center;
      opacity: 0.6;
    }
    .empty-state h2 {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="empty-state">
    <h2>No Markdown File Open</h2>
    <p>Open a .md file to see the preview</p>
  </div>
</body>
</html>`;
  }

  private _getHtmlForWebview(
    markdown: string,
    annotations: Annotation[],
    headings: { text: string; level: number; line: number }[],
    showComments: boolean,
    showOutline: boolean,
    isSubsequentLoad: boolean = false
  ): string {
    const config = vscode.workspace.getConfiguration('markdownComments.comments');
    const highlightColor = config.get('highlightColor', 'rgba(251, 191, 36, 0.15)');
    const resolvedColor = config.get('resolvedHighlightColor', 'rgba(52, 211, 153, 0.15)');

    // Escape markdown for JSON
    const escapedMarkdown = JSON.stringify(markdown);
    const escapedAnnotations = JSON.stringify(annotations);
    const escapedHeadings = JSON.stringify(headings);

    // Add initialization marker comment (for detecting if webview is initialized)
    const initMarker = '// __INITIALIZED__';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval'; img-src https: data:;">
  <title>Markdown Preview</title>
  ${initMarker}
  <style>
    :root {
      --highlight-color: ${highlightColor};
      --resolved-color: ${resolvedColor};
      --color-accent-amber: #fbbf24;
      --color-accent-amber-dark: #f59e0b;
      --color-accent-emerald: #34d399;
      
      /* Modern Design System */
      --color-bg-primary: var(--vscode-editor-background);
      --color-bg-secondary: var(--vscode-sideBar-background);
      --color-bg-elevated: var(--vscode-editorWidget-background);
      --color-border: var(--vscode-panel-border);
      --color-border-subtle: rgba(128, 128, 128, 0.15);
      --color-text-primary: var(--vscode-foreground);
      --color-text-secondary: var(--vscode-descriptionForeground);
      --color-accent: #8b5cf6;
      --color-accent-light: rgba(139, 92, 246, 0.15);
      
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --radius-xl: 12px;
      
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);
      
      --transition-fast: 0.15s ease;
      --transition-base: 0.2s ease;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: var(--color-text-primary);
      background: var(--color-bg-primary);
    }
    
    /* ============================================
       Main Layout - Three Column
       ============================================ */
    
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    
    /* Top Navigation Bar */
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 8px 16px;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border-subtle);
      gap: 8px;
      min-height: 44px;
    }
    
    .panel-toggle-group {
      display: flex;
      background: var(--color-bg-primary);
      border-radius: var(--radius-lg);
      padding: 3px;
      gap: 2px;
      border: 1px solid var(--color-border-subtle);
    }
    
    .panel-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);
    }
    
    .panel-toggle:hover {
      background: var(--color-border-subtle);
      color: var(--color-text-primary);
    }
    
    .panel-toggle.active {
      background: var(--color-accent);
      color: white;
      box-shadow: var(--shadow-sm);
    }
    
    .panel-toggle .icon {
      font-size: 14px;
      opacity: 0.9;
    }
    
    /* Main Content Area */
    .main-content {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    
    /* ============================================
       Outline Panel - Left Sidebar
       ============================================ */
    
    .outline-panel {
      width: 220px;
      min-width: 180px;
      background: var(--color-bg-secondary);
      border-right: 1px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-base), opacity var(--transition-base);
    }
    
    .outline-panel.hidden {
      width: 0;
      min-width: 0;
      opacity: 0;
      overflow: hidden;
    }
    
    .panel-header {
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--color-border-subtle);
      background: var(--color-bg-secondary);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .panel-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
    }
    
    .panel-header-title .icon {
      font-size: 14px;
      opacity: 0.8;
    }
    
    .outline-list {
      list-style: none;
      padding: 8px 0;
      margin: 0;
      overflow-y: auto;
      flex: 1;
    }
    
    .outline-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 13px;
      color: var(--color-text-secondary);
      border-left: 2px solid transparent;
      transition: all var(--transition-fast);
    }
    
    .outline-item:hover {
      background: var(--color-border-subtle);
      color: var(--color-text-primary);
      border-left-color: var(--color-accent);
    }
    
    .outline-item.level-1 { padding-left: 16px; font-weight: 600; color: var(--color-text-primary); }
    .outline-item.level-2 { padding-left: 28px; }
    .outline-item.level-3 { padding-left: 40px; font-size: 12px; }
    .outline-item.level-4 { padding-left: 52px; font-size: 12px; opacity: 0.8; }
    .outline-item.level-5 { padding-left: 64px; font-size: 11px; opacity: 0.7; }
    .outline-item.level-6 { padding-left: 76px; font-size: 11px; opacity: 0.6; }
    
    /* ============================================
       Content Area - Center
       ============================================ */
    
    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: 32px 48px;
      background: var(--color-bg-primary);
    }
    
    .markdown-body {
      max-width: 760px;
      margin: 0 auto;
    }
    
    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin-top: 28px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.3;
    }
    
    .markdown-body h1 { font-size: 2em; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 0.3em; }
    .markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 0.3em; }
    .markdown-body h3 { font-size: 1.25em; }
    .markdown-body h4 { font-size: 1em; }
    
    .markdown-body p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    
    .markdown-body code {
      background: var(--vscode-textCodeBlock-background);
      padding: 0.2em 0.4em;
      border-radius: var(--radius-sm);
      font-family: var(--vscode-editor-font-family);
      font-size: 85%;
    }
    
    .markdown-body pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 16px;
      border-radius: var(--radius-lg);
      overflow-x: auto;
      margin: 16px 0;
    }
    
    .markdown-body pre code {
      background: none;
      padding: 0;
    }
    
    .markdown-body blockquote {
      margin: 0 0 16px 0;
      padding: 0 1em;
      color: var(--vscode-textPreformat-foreground);
      border-left: 3px solid var(--color-accent);
    }
    
    .markdown-body ul, .markdown-body ol {
      padding-left: 2em;
      margin-bottom: 16px;
    }
    
    .markdown-body li {
      margin-bottom: 4px;
    }
    
    .markdown-body table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    
    .markdown-body table th,
    .markdown-body table td {
      padding: 10px 14px;
      border: 1px solid var(--color-border-subtle);
    }
    
    .markdown-body table th {
      background: var(--color-bg-secondary);
      font-weight: 600;
    }
    
    .markdown-body table tr:nth-child(2n) {
      background: var(--vscode-textCodeBlock-background);
    }
    
    .markdown-body img {
      max-width: 100%;
      border-radius: var(--radius-md);
    }
    
    .markdown-body a {
      color: var(--color-accent);
      text-decoration: none;
    }
    
    .markdown-body a:hover {
      text-decoration: underline;
    }
    
    .markdown-body hr {
      border: none;
      border-top: 1px solid var(--color-border-subtle);
      margin: 28px 0;
    }
    
    /* ============================================
       Comments Panel - Right Sidebar
       ============================================ */
    
    .comments-panel {
      width: 300px;
      min-width: 260px;
      background: var(--color-bg-secondary);
      border-left: 1px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-base), opacity var(--transition-base);
    }
    
    .comments-panel.hidden {
      width: 0;
      min-width: 0;
      opacity: 0;
      overflow: hidden;
    }
    
    .comments-count-badge {
      background: var(--color-accent);
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }
    
    .comments-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    
    .comment-thread {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      margin-bottom: 12px;
      overflow: hidden;
      transition: all var(--transition-fast);
    }
    
    .comment-thread:hover {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 1px var(--color-accent-light);
    }
    
    .thread-header {
      padding: 10px 14px;
      background: var(--color-bg-elevated);
      border-bottom: 1px solid var(--color-border-subtle);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .thread-status {
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    
    .thread-status.open {
      background: rgba(251, 191, 36, 0.2);
      color: var(--color-accent-amber-dark);
    }
    
    .thread-status.resolved {
      background: rgba(52, 211, 153, 0.2);
      color: var(--color-accent-emerald);
    }
    
    .thread-content {
      padding: 12px 14px;
      font-size: 12px;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-border-subtle);
      font-style: italic;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.5;
      border-left: 3px solid var(--color-accent);
      margin: 0 12px 0 0;
      background: var(--color-bg-elevated);
    }
    
    .comment-item {
      padding: 12px 14px;
      border-bottom: 1px solid var(--color-border-subtle);
    }
    
    .comment-item:last-child {
      border-bottom: none;
    }
    
    .comment-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 11px;
    }
    
    .comment-author {
      font-weight: 600;
      color: var(--color-text-primary);
    }
    
    .comment-author.ai {
      color: var(--color-accent);
    }
    
    .comment-time {
      color: var(--color-text-secondary);
      opacity: 0.7;
    }
    
    .comment-body {
      font-size: 13px;
      color: var(--color-text-primary);
      line-height: 1.6;
    }
    
    .thread-actions {
      padding: 10px 14px;
      background: var(--color-bg-elevated);
      display: flex;
      gap: 8px;
    }
    
    .action-btn {
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 500;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      background: var(--color-accent-emerald);
      color: white;
      transition: all var(--transition-fast);
    }
    
    .action-btn:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    
    .no-comments {
      padding: 48px 24px;
      text-align: center;
      color: var(--color-text-secondary);
    }
    
    .no-comments-icon {
      font-size: 40px;
      margin-bottom: 16px;
      opacity: 0.4;
    }
    
    .no-comments-text {
      font-size: 13px;
      line-height: 1.6;
    }
    
    /* ============================================
       Comment-MD Annotation Highlight Styles
       ============================================ */
    
    .comment-md-highlight {
      cursor: pointer;
      transition: all var(--transition-fast);
      position: relative;
      padding: 2px 0;
    }
    
    .comment-md-highlight.open {
      border-bottom: 2px dotted var(--color-accent-amber) !important;
      background-color: var(--highlight-color);
    }
    
    .comment-md-highlight.resolved {
      border-bottom: 2px dotted var(--color-accent-emerald) !important;
      background-color: var(--resolved-color);
      opacity: 0.7;
    }
    
    .comment-md-highlight:hover {
      background-color: rgba(251, 191, 36, 0.25) !important;
    }
    
    .comment-md-highlight.active {
      border-bottom: 2px solid var(--color-accent-amber-dark) !important;
      background-color: rgba(251, 191, 36, 0.35) !important;
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
      border-radius: 2px;
    }
    
    /* ============================================
       Selection Tooltip & Comment Input
       ============================================ */
    
    .selection-tooltip {
      position: fixed;
      display: none;
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 4px;
      z-index: 1000;
      box-shadow: var(--shadow-lg);
    }
    
    .selection-tooltip.visible {
      display: block;
    }
    
    .selection-tooltip button {
      padding: 8px 14px;
      background: var(--color-accent);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all var(--transition-fast);
    }
    
    .selection-tooltip button:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    
    .comment-input-popup {
      position: fixed;
      display: none;
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: 16px;
      z-index: 1001;
      box-shadow: var(--shadow-lg);
      min-width: 340px;
      max-width: 420px;
    }
    
    .comment-input-popup.visible {
      display: block;
      animation: popupFadeIn 0.15s ease;
    }
    
    @keyframes popupFadeIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .comment-input-popup .selected-text-preview {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-bottom: 14px;
      padding: 12px;
      background: var(--color-bg-secondary);
      border-radius: var(--radius-md);
      max-height: 80px;
      overflow: auto;
      border-left: 3px solid var(--color-accent);
    }
    
    .comment-input-popup .selected-text-label {
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--color-text-primary);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .comment-input-popup .selected-text-content {
      white-space: pre-wrap;
      word-break: break-word;
      font-style: italic;
      color: var(--color-text-secondary);
      line-height: 1.5;
    }
    
    .comment-input-popup textarea {
      width: 100%;
      min-height: 90px;
      padding: 12px;
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      margin-bottom: 14px;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      outline: none;
      transition: all var(--transition-fast);
    }
    
    .comment-input-popup textarea:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px var(--color-accent-light);
    }
    
    .comment-input-popup .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .comment-input-popup .hint {
      font-size: 11px;
      color: var(--color-text-secondary);
      opacity: 0.7;
    }
    
    .comment-input-popup .buttons {
      display: flex;
      gap: 8px;
    }
    
    .comment-input-popup .btn-cancel {
      padding: 8px 14px;
      background: transparent;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all var(--transition-fast);
    }
    
    .comment-input-popup .btn-cancel:hover {
      background: var(--color-border-subtle);
      color: var(--color-text-primary);
    }
    
    .comment-input-popup .btn-submit {
      padding: 8px 18px;
      background: var(--color-accent);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all var(--transition-fast);
    }
    
    .comment-input-popup .btn-submit:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    
    .comment-input-popup .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- Top Navigation Bar -->
    <div class="top-bar">
      <div class="panel-toggle-group">
        <button class="panel-toggle ${showOutline ? 'active' : ''}" onclick="toggleOutline()">
          <span class="icon">📑</span>
          <span>Outline</span>
        </button>
        <button class="panel-toggle ${showComments ? 'active' : ''}" onclick="toggleComments()">
          <span class="icon">💬</span>
          <span>Comments</span>
        </button>
      </div>
    </div>

    <!-- Selection Tooltip -->
    <div class="selection-tooltip" id="selectionTooltip">
      <button onclick="showCommentInput()">
        <span>💬</span>
        <span>Add Comment</span>
      </button>
    </div>
    
    <!-- Comment Input Popup -->
    <div class="comment-input-popup" id="commentInputPopup">
      <div class="selected-text-preview">
        <div class="selected-text-label">📝 Selected Text</div>
        <div class="selected-text-content" id="selectedTextContent"></div>
      </div>
      <textarea id="commentTextarea" placeholder="Write your comment..."></textarea>
      <div class="actions">
        <span class="hint">⌘ + Enter to submit</span>
        <div class="buttons">
          <button class="btn-cancel" onclick="hideCommentInput()">Cancel</button>
          <button class="btn-submit" id="submitCommentBtn" onclick="submitComment()">Add Comment</button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Outline Panel - LEFT -->
      <div class="outline-panel ${showOutline ? '' : 'hidden'}" id="outlinePanel">
        <div class="panel-header">
          <span class="panel-header-title">
            <span class="icon">📑</span>
            <span>Outline</span>
          </span>
        </div>
        <ul class="outline-list" id="outlineList"></ul>
      </div>
      
      <!-- Content Area - CENTER -->
      <div class="content-area" id="contentArea">
        <div class="markdown-body" id="markdownContent"></div>
      </div>
      
      <!-- Comments Panel - RIGHT -->
      <div class="comments-panel ${showComments ? '' : 'hidden'}" id="commentsPanel">
        <div class="panel-header">
          <span class="panel-header-title">
            <span class="icon">💬</span>
            <span>Comments</span>
          </span>
          <span class="comments-count-badge" id="commentsCount">0</span>
        </div>
        <div class="comments-list" id="commentsList"></div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    // Data (use let so we can update them)
    let markdown = ${escapedMarkdown};
    let annotations = ${escapedAnnotations};
    let headings = ${escapedHeadings};
    
    // Selection state
    let currentSelection = '';
    
    // Simple Markdown parser (optimized)
    function parseMarkdown(md) {
      let html = md;
      
      // Escape HTML
      html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Code blocks (must be first)
      html = html.replace(/\`\`\`([\\w]*)?\\n?([\\s\\S]*?)\`\`\`/g, function(m, lang, code) {
        return '<pre><code class="language-' + (lang || '') + '">' + code.trim() + '</code></pre>';
      });
      
      // Inline code
      html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      
      // Headers
      html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
      html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
      html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
      
      // Bold and italic
      html = html.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
      html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
      html = html.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
      
      // Images (before links)
      html = html.replace(/!\\[([^\\]]*?)\\]\\(([^)]+)\\)/g, '<img src="$2" alt="$1">');
      
      // Links
      html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>');
      
      // Blockquotes
      html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
      
      // Horizontal rule
      html = html.replace(/^---$/gm, '<hr>');
      html = html.replace(/^\\*\\*\\*$/gm, '<hr>');
      
      // Lists
      html = html.replace(/^[\\-\\*] (.+)$/gm, '<li>$1</li>');
      html = html.replace(/^(\\d+)\\. (.+)$/gm, '<li>$2</li>');
      
      // Wrap consecutive li tags
      html = html.replace(/(<li>.*<\\/li>\\n?)+/g, function(match) {
        return '<ul>' + match + '</ul>';
      });
      
      // Paragraphs - split by double newlines
      const blocks = html.split(/\\n\\n+/);
      html = blocks.map(function(block) {
        block = block.trim();
        if (!block) return '';
        // Skip if already wrapped in block element
        if (/^<(h[1-6]|pre|ul|ol|blockquote|hr|div|table)/i.test(block)) {
          return block;
        }
        return '<p>' + block.replace(/\\n/g, '<br>') + '</p>';
      }).join('\\n');
      
      return html;
    }
    
    // Render outline
    function renderOutline() {
      const list = document.getElementById('outlineList');
      if (headings.length === 0) {
        list.innerHTML = '<li class="outline-item" style="opacity:0.5;cursor:default">No headings found</li>';
        return;
      }
      list.innerHTML = headings.map(function(h) {
        return '<li class="outline-item level-' + h.level + '" onclick="goToLine(' + h.line + ')">' + 
          escapeHtml(h.text) + '</li>';
      }).join('');
    }
    
    // Render markdown with annotation highlighting
    function renderMarkdown() {
      const content = document.getElementById('markdownContent');
      let html = parseMarkdown(markdown);
      
      // Apply annotation highlighting to the rendered HTML
      annotations.forEach(function(ann) {
        if (ann.content && ann.content.trim()) {
          // Escape special regex characters in the content
          const escapedContent = escapeRegex(ann.content.trim());
          
          // Try to find and wrap the annotated content
          const regex = new RegExp('(' + escapedContent + ')', 'g');
          const replacement = '<span class="comment-md-highlight ' + ann.status + '" data-annotation-id="' + ann.id + '" data-annotation-status="' + ann.status + '">$1</span>';
          
          // Only replace if not already wrapped
          if (!html.includes('data-annotation-id="' + ann.id + '"')) {
            html = html.replace(regex, replacement);
          }
        }
      });
      
      content.innerHTML = html;
      
      // Add click handlers for annotation highlights
      content.querySelectorAll('[data-annotation-id]').forEach(function(el) {
        el.addEventListener('click', function(e) {
          const annId = el.getAttribute('data-annotation-id');
          
          // Toggle active state
          const wasActive = el.classList.contains('active');
          
          // Remove active from all
          content.querySelectorAll('[data-annotation-id]').forEach(function(other) {
            other.classList.remove('active');
          });
          
          // Toggle this one
          if (!wasActive) {
            el.classList.add('active');
            // Scroll to comment in sidebar
            const commentEl = document.querySelector('.comment-thread[data-id="' + annId + '"]');
            if (commentEl) {
              commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              commentEl.style.boxShadow = '0 0 0 2px var(--vscode-focusBorder)';
              setTimeout(function() {
                commentEl.style.boxShadow = '';
              }, 2000);
            }
          }
        });
      });
    }
    
    function escapeRegex(str) {
      return str.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
    }
    
    // Render comments
    function renderComments() {
      const list = document.getElementById('commentsList');
      const count = document.getElementById('commentsCount');
      
      const openCount = annotations.filter(function(a) { return a.status === 'open'; }).length;
      count.textContent = openCount;
      
      if (annotations.length === 0) {
        list.innerHTML = '<div class="no-comments"><div class="no-comments-icon">💬</div><div>No comments yet</div><div style="font-size:11px;margin-top:8px">Select text in the preview to add a comment</div></div>';
        return;
      }
      
      // Sort: open first, then by position
      const sorted = annotations.slice().sort(function(a, b) {
        if (a.status !== b.status) {
          return a.status === 'open' ? -1 : 1;
        }
        return a.position.start.line - b.position.start.line;
      });
      
      list.innerHTML = sorted.map(function(ann) {
        const statusClass = ann.status === 'open' ? 'open' : 'resolved';
        const statusText = ann.status === 'open' ? 'Open' : 'Resolved';
        
        const commentsHtml = ann.comments.map(function(c) {
          const authorClass = c.by === 'ai' ? 'ai' : '';
          const time = new Date(c.time).toLocaleString();
          return '<div class="comment-item">' +
            '<div class="comment-meta">' +
            '<span class="comment-author ' + authorClass + '">' + escapeHtml(c.by) + '</span>' +
            '<span class="comment-time">' + time + '</span>' +
            '</div>' +
            '<div class="comment-body">' + escapeHtml(c.content) + '</div>' +
            '</div>';
        }).join('');
        
        const actionsHtml = ann.status === 'open' 
          ? '<div class="thread-actions"><button class="action-btn" onclick="resolveThread(\\'' + ann.id + '\\')">✓ Resolve</button></div>'
          : '';
        
        return '<div class="comment-thread" data-id="' + ann.id + '">' +
          '<div class="thread-header">' +
          '<span class="thread-status ' + statusClass + '">' + statusText + '</span>' +
          '<span style="opacity:0.6;font-size:10px">' + ann.id + '</span>' +
          '</div>' +
          '<div class="thread-content">' + escapeHtml(ann.content.substring(0, 100)) + (ann.content.length > 100 ? '...' : '') + '</div>' +
          commentsHtml +
          actionsHtml +
          '</div>';
      }).join('');
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function goToLine(line) {
      vscode.postMessage({ command: 'goToLine', line: line });
    }
    
    function resolveThread(threadId) {
      vscode.postMessage({ command: 'resolveThread', threadId: threadId });
    }
    
    function toggleOutline() {
      const panel = document.getElementById('outlinePanel');
      const isHidden = panel.classList.toggle('hidden');
      vscode.postMessage({ command: 'toggleOutline', show: !isHidden });
      document.querySelector('.toolbar-btn:nth-child(1)').classList.toggle('active', !isHidden);
    }
    
    function toggleComments() {
      const panel = document.getElementById('commentsPanel');
      const isHidden = panel.classList.toggle('hidden');
      vscode.postMessage({ command: 'toggleComments', show: !isHidden });
      document.querySelector('.toolbar-btn:nth-child(2)').classList.toggle('active', !isHidden);
    }
    
    // Selection handling
    let selectionRect = null;
    
    function handleSelection() {
      const selection = window.getSelection();
      const tooltip = document.getElementById('selectionTooltip');
      const commentPopup = document.getElementById('commentInputPopup');
      
      // If comment popup is visible, don't process new selections
      if (commentPopup.classList.contains('visible')) {
        return;
      }
      
      if (selection && selection.toString().trim().length > 0) {
        currentSelection = selection.toString().trim();
        
        // Position tooltip near selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        selectionRect = rect;
        
        tooltip.style.left = (rect.left + rect.width / 2 - 60) + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
        tooltip.classList.add('visible');
      } else {
        currentSelection = '';
        tooltip.classList.remove('visible');
      }
    }
    
    function showCommentInput() {
      if (!currentSelection || !selectionRect) return;
      
      const tooltip = document.getElementById('selectionTooltip');
      const popup = document.getElementById('commentInputPopup');
      const textarea = document.getElementById('commentTextarea');
      const selectedTextContent = document.getElementById('selectedTextContent');
      
      // Hide tooltip
      tooltip.classList.remove('visible');
      
      // Show selected text preview
      selectedTextContent.textContent = currentSelection.length > 100 
        ? currentSelection.substring(0, 100) + '...' 
        : currentSelection;
      
      // Position popup below selection
      const POPUP_WIDTH = 360;
      const POPUP_HEIGHT = 250;
      const PADDING = 12;
      
      let left = selectionRect.left + (selectionRect.width / 2) - (POPUP_WIDTH / 2);
      left = Math.max(PADDING, Math.min(left, window.innerWidth - POPUP_WIDTH - PADDING));
      
      let top = selectionRect.bottom + PADDING;
      
      // If not enough space below, show above
      if (top + POPUP_HEIGHT > window.innerHeight - PADDING) {
        top = selectionRect.top - POPUP_HEIGHT - PADDING;
      }
      
      popup.style.left = left + 'px';
      popup.style.top = top + 'px';
      popup.classList.add('visible');
      
      // Focus textarea with a small delay to ensure the popup is visible
      textarea.value = '';
      setTimeout(function() {
        textarea.focus();
      }, 50);
      
      // Clear text selection
      window.getSelection().removeAllRanges();
    }
    
    function hideCommentInput() {
      const popup = document.getElementById('commentInputPopup');
      const textarea = document.getElementById('commentTextarea');
      
      popup.classList.remove('visible');
      textarea.value = '';
      currentSelection = '';
    }
    
    function submitComment() {
      const textarea = document.getElementById('commentTextarea');
      const commentText = textarea.value.trim();
      
      if (!commentText || !currentSelection) return;
      
      vscode.postMessage({ 
        command: 'addCommentWithContent', 
        selectionText: currentSelection,
        commentText: commentText
      });
      
      hideCommentInput();
    }
    
    function addCommentForSelection() {
      if (currentSelection) {
        showCommentInput();
      }
    }
    
    // Event listeners
    document.getElementById('contentArea').addEventListener('mouseup', handleSelection);
    
    // Keyboard shortcuts for comment input
    document.getElementById('commentTextarea').addEventListener('keydown', function(e) {
      // Cmd/Ctrl + Enter to submit
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submitComment();
      }
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        hideCommentInput();
      }
    });
    
    // Update submit button state
    document.getElementById('commentTextarea').addEventListener('input', function(e) {
      const submitBtn = document.getElementById('submitCommentBtn');
      submitBtn.disabled = !e.target.value.trim();
    });
    
    // Click outside to close popup
    document.addEventListener('mousedown', function(e) {
      const popup = document.getElementById('commentInputPopup');
      const tooltip = document.getElementById('selectionTooltip');
      
      if (popup.classList.contains('visible') && !popup.contains(e.target)) {
        hideCommentInput();
      }
      
      if (tooltip.classList.contains('visible') && !tooltip.contains(e.target)) {
        // Will be handled by handleSelection on mouseup
      }
    });
    
    // Initialize
    renderOutline();
    renderMarkdown();
    renderComments();
    
    // Handle incremental updates from extension (to preserve scroll position)
    window.addEventListener('message', function(event) {
      const message = event.data;
      if (message.command === 'updateContent') {
        console.log('Received updateContent message', message);
        
        // Save current scroll positions
        const contentArea = document.getElementById('contentArea');
        const commentsList = document.getElementById('commentsList');
        const savedScrollTop = contentArea.scrollTop;
        const savedScrollLeft = contentArea.scrollLeft;
        const commentsScrollTop = commentsList.scrollTop;
        
        // Update data
        markdown = message.markdown;
        annotations = message.annotations;
        headings = message.headings;
        
        // Re-render without losing scroll position
        renderMarkdown();
        renderComments();
        
        // Restore scroll positions
        contentArea.scrollTop = savedScrollTop;
        contentArea.scrollLeft = savedScrollLeft;
        commentsList.scrollTop = commentsScrollTop;
        
        // Focus on the new annotation if specified
        if (message.focusAnnotationId) {
          console.log('Focusing on annotation:', message.focusAnnotationId);
          
          // Use longer delay to ensure rendering is complete
          setTimeout(function() {
            // First, remove active from all elements
            document.querySelectorAll('[data-annotation-id]').forEach(function(el) {
              el.classList.remove('active');
            });
            
            // Highlight the new annotation in content
            const highlightEl = document.querySelector('[data-annotation-id="' + message.focusAnnotationId + '"]');
            if (highlightEl) {
              console.log('Found highlight element:', highlightEl);
              highlightEl.classList.add('active');
            } else {
              console.log('Highlight element not found for id:', message.focusAnnotationId);
            }
            
            // Scroll to and highlight the new comment in sidebar
            const commentEl = document.querySelector('.comment-thread[data-id="' + message.focusAnnotationId + '"]');
            if (commentEl) {
              console.log('Found comment element:', commentEl);
              commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              commentEl.style.boxShadow = '0 0 0 3px var(--vscode-focusBorder)';
              commentEl.style.transition = 'box-shadow 0.3s ease';
              setTimeout(function() {
                commentEl.style.boxShadow = '';
              }, 3000);
            } else {
              console.log('Comment element not found for id:', message.focusAnnotationId);
              console.log('Available comment threads:', document.querySelectorAll('.comment-thread').length);
            }
          }, 300); // Delay to ensure rendering is complete
        }
      }
    });
  </script>
</body>
</html>`;
  }
}

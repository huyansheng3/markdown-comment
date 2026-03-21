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
    // We'll check if the webview has been initialized by checking a marker we set
    const isInitialized = this._panel.webview.html && this._panel.webview.html.includes('<!-- __INITIALIZED__ -->');
    
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

    // Add initialization marker as HTML comment (for detecting if webview is initialized)
    const initMarker = '<!-- __INITIALIZED__ -->';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval'; img-src https: data:;">
  <title>Markdown Preview</title>
  ${initMarker}
  <style>
    /* ============================================
       Notion-like Design System
       ============================================ */
    :root {
      /* Notion Colors - Light */
      --bg-primary: #ffffff;
      --bg-secondary: #fbfbfa;
      --bg-hover: #f1f1ef;
      --bg-active: #e8e8e6;
      --bg-overlay: rgba(15, 15, 15, 0.6);
      
      --text-primary: #37352f;
      --text-secondary: #787774;
      --text-placeholder: #b4b4b4;
      
      --accent: #2383e2;
      --accent-light: rgba(35, 131, 226, 0.1);
      
      --highlight-bg: ${highlightColor};
      --highlight-border: #fbbf24;
      --resolved-bg: ${resolvedColor};
      --resolved-border: #34d399;
      
      --border-light: rgba(55, 53, 47, 0.09);
      --border-medium: rgba(55, 53, 47, 0.16);
      
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
      --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
      --shadow-popup: 0 14px 40px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.06);
      
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      
      --transition-fast: 100ms ease;
      --transition-base: 200ms ease;
      --transition-slow: 300ms ease;
      
      --content-max-width: 720px;
      --sidebar-width: 260px;
      --statusbar-height: 32px;
    }
    
    /* Dark mode - use VSCode theme variables */
    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: var(--vscode-editor-background, #191919);
        --bg-secondary: var(--vscode-sideBar-background, #202020);
        --bg-hover: #2f2f2f;
        --bg-active: #3a3a3a;
        
        --text-primary: var(--vscode-foreground, #e6e6e6);
        --text-secondary: var(--vscode-descriptionForeground, #9b9a98);
        
        --border-light: rgba(255, 255, 255, 0.09);
        --border-medium: rgba(255, 255, 255, 0.13);
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-primary);
      background: var(--bg-primary);
    }
    
    /* ============================================
       Main Layout - Clean Single Column
       ============================================ */
    
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }
    
    /* Content Area - Full Width */
    .content-area {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 32px 48px;
      padding-bottom: calc(32px + var(--statusbar-height));
    }
    
    .markdown-body {
      max-width: var(--content-max-width);
      margin: 0 auto;
    }
    
    /* ============================================
       Floating Outline Panel (Notion-style)
       ============================================ */
    
    .outline-trigger {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 120px;
      z-index: 100;
    }
    
    .outline-panel {
      position: fixed;
      left: 12px;
      top: 60px;
      width: var(--sidebar-width);
      max-height: calc(100vh - 120px);
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-popup);
      z-index: 200;
      opacity: 0;
      visibility: hidden;
      transform: translateX(-8px);
      transition: all var(--transition-base);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .outline-panel.visible {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
    }
    
    .outline-header {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-light);
    }
    
    .outline-header-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .outline-close {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      font-size: 16px;
    }
    
    .outline-close:hover {
      background: var(--bg-hover);
    }
    
    .outline-list {
      list-style: none;
      padding: 8px 0;
      margin: 0;
      overflow-y: auto;
      flex: 1;
    }
    
    .outline-item {
      padding: 6px 16px;
      cursor: pointer;
      font-size: 14px;
      color: var(--text-secondary);
      border-left: 2px solid transparent;
      transition: all var(--transition-fast);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .outline-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    
    .outline-item.active {
      color: var(--accent);
      border-left-color: var(--accent);
      background: var(--accent-light);
    }
    
    .outline-item.level-1 { padding-left: 16px; font-weight: 500; }
    .outline-item.level-2 { padding-left: 28px; }
    .outline-item.level-3 { padding-left: 40px; font-size: 13px; }
    .outline-item.level-4 { padding-left: 52px; font-size: 13px; opacity: 0.8; }
    .outline-item.level-5 { padding-left: 64px; font-size: 12px; opacity: 0.7; }
    .outline-item.level-6 { padding-left: 76px; font-size: 12px; opacity: 0.6; }
    
    /* ============================================
       Floating Comments Panel (Notion-style)
       ============================================ */
    
    .comments-panel {
      position: fixed;
      right: 12px;
      top: 60px;
      width: 320px;
      max-height: calc(100vh - 120px);
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-popup);
      z-index: 200;
      opacity: 0;
      visibility: hidden;
      transform: translateX(8px);
      transition: all var(--transition-base);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .comments-panel.visible {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
    }
    
    .comments-header {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-light);
    }
    
    .comments-header-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .comments-count {
      background: var(--accent);
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .comments-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    
    .comment-thread {
      padding: 12px;
      background: var(--bg-primary);
      border-radius: var(--radius-md);
      margin-bottom: 8px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    
    .comment-thread:hover {
      box-shadow: var(--shadow-sm);
    }
    
    .comment-thread:last-child {
      margin-bottom: 0;
    }
    
    .thread-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .thread-status {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    
    .thread-status.open {
      background: rgba(251, 191, 36, 0.15);
      color: #b45309;
    }
    
    .thread-status.resolved {
      background: rgba(52, 211, 153, 0.15);
      color: #047857;
    }
    
    .thread-content {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.4;
      margin-bottom: 8px;
    }
    
    .comment-item {
      padding: 8px 0;
      border-top: 1px solid var(--border-light);
    }
    
    .comment-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    
    .comment-author {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .comment-time {
      font-size: 11px;
      color: var(--text-secondary);
    }
    
    .comment-body {
      font-size: 13px;
      color: var(--text-primary);
      line-height: 1.5;
    }
    
    .thread-actions {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-light);
    }
    
    .action-btn {
      padding: 4px 10px;
      font-size: 12px;
      background: var(--bg-hover);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }
    
    .action-btn:hover {
      background: var(--bg-active);
      color: var(--text-primary);
    }
    
    .no-comments {
      text-align: center;
      padding: 32px 16px;
      color: var(--text-secondary);
    }
    
    .no-comments-icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }
    
    /* ============================================
       Bottom Status Bar (Notion-style)
       ============================================ */
    
    .status-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--statusbar-height);
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 100;
    }
    
    .status-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .status-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
    }
    
    .status-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    
    .status-item.active {
      background: var(--accent-light);
      color: var(--accent);
    }
    
    .status-icon {
      font-size: 14px;
    }
    
    /* ============================================
       Selection Toolbar (Notion-style floating)
       ============================================ */
    
    .selection-toolbar {
      position: fixed;
      display: none;
      background: var(--bg-primary);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-popup);
      padding: 4px;
      z-index: 300;
      flex-direction: row;
      gap: 2px;
    }
    
    .selection-toolbar.visible {
      display: flex;
    }
    
    .toolbar-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }
    
    .toolbar-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    
    .toolbar-btn.primary {
      background: var(--accent);
      color: white;
    }
    
    .toolbar-btn.primary:hover {
      opacity: 0.9;
    }
    
    /* ============================================
       Comment Input Popup (Notion-style)
       ============================================ */
    
    .comment-input-popup {
      position: fixed;
      display: none;
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-popup);
      padding: 16px;
      z-index: 400;
      width: 360px;
    }
    
    .comment-input-popup.visible {
      display: block;
    }
    
    .selected-text-preview {
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      margin-bottom: 12px;
    }
    
    .selected-text-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .selected-text-content {
      font-size: 13px;
      color: var(--text-primary);
      font-style: italic;
      max-height: 60px;
      overflow: hidden;
    }
    
    .comment-input-popup textarea {
      width: 100%;
      min-height: 80px;
      padding: 12px;
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      margin-bottom: 12px;
      background: var(--bg-primary);
      color: var(--text-primary);
      outline: none;
      transition: border-color var(--transition-fast);
    }
    
    .comment-input-popup textarea:focus {
      border-color: var(--accent);
    }
    
    .comment-input-popup textarea::placeholder {
      color: var(--text-placeholder);
    }
    
    .comment-input-popup .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .comment-input-popup .hint {
      font-size: 11px;
      color: var(--text-secondary);
    }
    
    .comment-input-popup .buttons {
      display: flex;
      gap: 8px;
    }
    
    .btn-cancel {
      padding: 6px 12px;
      font-size: 13px;
      background: transparent;
      color: var(--text-secondary);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    
    .btn-cancel:hover {
      background: var(--bg-hover);
    }
    
    .btn-submit {
      padding: 6px 16px;
      font-size: 13px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 500;
      transition: all var(--transition-fast);
    }
    
    .btn-submit:hover {
      opacity: 0.9;
    }
    
    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* ============================================
       Markdown Content Styles
       ============================================ */
    
    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.3;
      scroll-margin-top: 20px;
      color: var(--text-primary);
    }
    
    .markdown-body h1 { font-size: 1.875em; }
    .markdown-body h2 { font-size: 1.5em; }
    .markdown-body h3 { font-size: 1.25em; }
    .markdown-body h4 { font-size: 1.125em; }
    .markdown-body h5 { font-size: 1em; }
    .markdown-body h6 { font-size: 0.875em; color: var(--text-secondary); }
    
    .markdown-body p {
      margin: 0 0 1em 0;
    }
    
    .markdown-body code {
      background: rgba(135, 131, 120, 0.15);
      padding: 0.2em 0.4em;
      border-radius: var(--radius-sm);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 85%;
      color: #eb5757;
    }
    
    .markdown-body pre {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: var(--radius-md);
      overflow-x: auto;
      margin: 1em 0;
    }
    
    .markdown-body pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    
    .markdown-body blockquote {
      margin: 1em 0;
      padding: 0 1em;
      color: var(--text-secondary);
      border-left: 3px solid var(--border-medium);
    }
    
    .markdown-body ul, .markdown-body ol {
      padding-left: 1.5em;
      margin: 0 0 1em 0;
    }
    
    .markdown-body li {
      margin-bottom: 0.25em;
    }
    
    .markdown-body a {
      color: var(--accent);
      text-decoration: none;
    }
    
    .markdown-body a:hover {
      text-decoration: underline;
    }
    
    .markdown-body hr {
      border: none;
      border-top: 1px solid var(--border-light);
      margin: 2em 0;
    }
    
    .markdown-body img {
      max-width: 100%;
      border-radius: var(--radius-md);
    }
    
    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }
    
    .markdown-body th, .markdown-body td {
      padding: 8px 12px;
      border: 1px solid var(--border-light);
      text-align: left;
    }
    
    .markdown-body th {
      background: var(--bg-secondary);
      font-weight: 600;
    }
    
    /* ============================================
       Frontmatter Card
       ============================================ */
    
    .frontmatter-card {
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-hover) 100%);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      margin-bottom: 24px;
    }
    
    .frontmatter-title {
      font-size: 1.5em;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 12px;
      line-height: 1.3;
    }
    
    .frontmatter-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
    }
    
    .frontmatter-field {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 13px;
    }
    
    .frontmatter-key {
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    .frontmatter-key::after {
      content: ':';
    }
    
    .frontmatter-value {
      color: var(--text-primary);
    }
    
    .frontmatter-link {
      color: var(--accent);
      text-decoration: none;
      word-break: break-all;
    }
    
    .frontmatter-link:hover {
      text-decoration: underline;
    }
    
    /* ============================================
       Annotation Highlighting
       ============================================ */
    
    .comment-md-highlight {
      background: var(--highlight-bg);
      border-bottom: 2px solid var(--highlight-border);
      cursor: pointer;
      transition: all var(--transition-fast);
      border-radius: 2px;
      padding: 0 2px;
      margin: 0 -2px;
    }
    
    .comment-md-highlight:hover {
      background: rgba(251, 191, 36, 0.3);
    }
    
    .comment-md-highlight.active {
      background: rgba(251, 191, 36, 0.4);
      box-shadow: 0 0 0 2px var(--highlight-border);
    }
    
    .comment-md-highlight.resolved {
      background: var(--resolved-bg);
      border-bottom-color: var(--resolved-border);
      opacity: 0.7;
    }
    
    .comment-md-highlight.resolved:hover {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- Outline Trigger Zone (hover to show) -->
    <div class="outline-trigger" id="outlineTrigger"></div>
    
    <!-- Floating Outline Panel -->
    <div class="outline-panel" id="outlinePanel">
      <div class="outline-header">
        <span class="outline-header-title">Table of Contents</span>
        <button class="outline-close" onclick="hideOutline()">×</button>
      </div>
      <ul class="outline-list" id="outlineList"></ul>
    </div>
    
    <!-- Floating Comments Panel -->
    <div class="comments-panel" id="commentsPanel">
      <div class="comments-header">
        <span class="comments-header-title">Comments</span>
        <span class="comments-count" id="commentsCount">0</span>
      </div>
      <div class="comments-list" id="commentsList"></div>
    </div>
    
    <!-- Content Area -->
    <div class="content-area" id="contentArea">
      <div class="markdown-body" id="markdownContent"></div>
    </div>
    
    <!-- Selection Toolbar -->
    <div class="selection-toolbar" id="selectionToolbar">
      <button class="toolbar-btn primary" onclick="showCommentInput()" title="Add Comment">💬</button>
    </div>
    
    <!-- Comment Input Popup -->
    <div class="comment-input-popup" id="commentInputPopup">
      <div class="selected-text-preview">
        <div class="selected-text-label">Selected Text</div>
        <div class="selected-text-content" id="selectedTextContent"></div>
      </div>
      <textarea id="commentTextarea" placeholder="Write your comment..."></textarea>
      <div class="actions">
        <span class="hint">⌘ + Enter to submit</span>
        <div class="buttons">
          <button class="btn-cancel" onclick="hideCommentInput()">Cancel</button>
          <button class="btn-submit" id="submitCommentBtn" onclick="submitComment()">Comment</button>
        </div>
      </div>
    </div>
    
    <!-- Bottom Status Bar -->
    <div class="status-bar">
      <div class="status-left">
        <div class="status-item" id="outlineToggle" onclick="toggleOutline()">
          <span class="status-icon">📑</span>
          <span id="headingCount">${headings.length} headings</span>
        </div>
        <div class="status-item" id="commentsToggle" onclick="toggleComments()">
          <span class="status-icon">💬</span>
          <span id="commentCountText">${annotations.filter((a: Annotation) => a.status === 'open').length} comments</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    // Data (use let so we can update them)
    let markdown = ${escapedMarkdown};
    let annotations = ${escapedAnnotations};
    let headings = ${escapedHeadings};
    
    // Panel visibility state
    let outlineVisible = false;
    let commentsVisible = false;
    
    // Selection state
    let currentSelection = '';
    let selectionRect = null;
    
    // Parse frontmatter from markdown
    function parseFrontmatter(md) {
      const frontmatterRegex = /^---\\n([\\s\\S]*?)\\n---\\n?/;
      const match = md.match(frontmatterRegex);
      
      if (match) {
        const frontmatterText = match[1];
        const meta = {};
        
        // Parse YAML-like frontmatter (simple key: value pairs)
        frontmatterText.split('\\n').forEach(function(line) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            // Remove surrounding quotes
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            meta[key] = value;
          }
        });
        
        return {
          meta: meta,
          content: md.slice(match[0].length)
        };
      }
      
      return { meta: null, content: md };
    }
    
    // Render frontmatter as a card
    function renderFrontmatter(meta) {
      if (!meta || Object.keys(meta).length === 0) return '';
      
      let html = '<div class="frontmatter-card">';
      
      // Title gets special treatment
      if (meta.title) {
        html += '<div class="frontmatter-title">' + escapeHtml(meta.title) + '</div>';
      }
      
      // Other fields as key-value pairs
      const otherKeys = Object.keys(meta).filter(k => k !== 'title');
      if (otherKeys.length > 0) {
        html += '<div class="frontmatter-fields">';
        otherKeys.forEach(function(key) {
          const value = meta[key];
          // Check if value is a URL
          const isUrl = /^https?:\\/\\//.test(value);
          html += '<div class="frontmatter-field">';
          html += '<span class="frontmatter-key">' + escapeHtml(key) + '</span>';
          if (isUrl) {
            html += '<a href="' + escapeHtml(value) + '" class="frontmatter-value frontmatter-link" target="_blank">' + escapeHtml(value) + '</a>';
          } else {
            html += '<span class="frontmatter-value">' + escapeHtml(value) + '</span>';
          }
          html += '</div>';
        });
        html += '</div>';
      }
      
      html += '</div>';
      return html;
    }
    
    // Simple Markdown parser (optimized)
    function parseMarkdown(md) {
      // Extract frontmatter first
      const parsed = parseFrontmatter(md);
      let html = '';
      
      // Add frontmatter card if exists
      if (parsed.meta) {
        html += renderFrontmatter(parsed.meta);
      }
      
      // Process the content (without frontmatter)
      let contentHtml = parsed.content;
      
      // Escape HTML
      contentHtml = contentHtml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Code blocks (must be first)
      contentHtml = contentHtml.replace(/\`\`\`([\\w]*)?\\n?([\\s\\S]*?)\`\`\`/g, function(m, lang, code) {
        return '<pre><code class="language-' + (lang || '') + '">' + code.trim() + '</code></pre>';
      });
      
      // Inline code
      contentHtml = contentHtml.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      
      // Headers - add id for navigation
      contentHtml = contentHtml.replace(/^###### (.+)$/gm, function(m, text) { return '<h6 id="' + slugify(text) + '">' + text + '</h6>'; });
      contentHtml = contentHtml.replace(/^##### (.+)$/gm, function(m, text) { return '<h5 id="' + slugify(text) + '">' + text + '</h5>'; });
      contentHtml = contentHtml.replace(/^#### (.+)$/gm, function(m, text) { return '<h4 id="' + slugify(text) + '">' + text + '</h4>'; });
      contentHtml = contentHtml.replace(/^### (.+)$/gm, function(m, text) { return '<h3 id="' + slugify(text) + '">' + text + '</h3>'; });
      contentHtml = contentHtml.replace(/^## (.+)$/gm, function(m, text) { return '<h2 id="' + slugify(text) + '">' + text + '</h2>'; });
      contentHtml = contentHtml.replace(/^# (.+)$/gm, function(m, text) { return '<h1 id="' + slugify(text) + '">' + text + '</h1>'; });
      
      // Bold and italic
      contentHtml = contentHtml.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
      contentHtml = contentHtml.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
      contentHtml = contentHtml.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
      
      // Images (before links)
      contentHtml = contentHtml.replace(/!\\[([^\\]]*?)\\]\\(([^)]+)\\)/g, '<img src="$2" alt="$1">');
      
      // Links
      contentHtml = contentHtml.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>');
      
      // Blockquotes
      contentHtml = contentHtml.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
      
      // Horizontal rule
      contentHtml = contentHtml.replace(/^---$/gm, '<hr>');
      contentHtml = contentHtml.replace(/^\\*\\*\\*$/gm, '<hr>');
      
      // Lists
      contentHtml = contentHtml.replace(/^[\\-\\*] (.+)$/gm, '<li>$1</li>');
      contentHtml = contentHtml.replace(/^(\\d+)\\. (.+)$/gm, '<li>$2</li>');
      
      // Wrap consecutive li tags
      contentHtml = contentHtml.replace(/(<li>.*<\\/li>\\n?)+/g, function(match) {
        return '<ul>' + match + '</ul>';
      });
      
      // Paragraphs - split by double newlines
      const blocks = contentHtml.split(/\\n\\n+/);
      contentHtml = blocks.map(function(block) {
        block = block.trim();
        if (!block) return '';
        // Skip if already wrapped in block element
        if (/^<(h[1-6]|pre|ul|ol|blockquote|hr|div|table)/i.test(block)) {
          return block;
        }
        return '<p>' + block.replace(/\\n/g, '<br>') + '</p>';
      }).join('\\n');
      
      html += contentHtml;
      return html;
    }
    
    // Render outline
    function renderOutline() {
      const list = document.getElementById('outlineList');
      if (headings.length === 0) {
        list.innerHTML = '<li class="outline-item" style="opacity:0.5;cursor:default">No headings found</li>';
        return;
      }
      list.innerHTML = headings.map(function(h, index) {
        return '<li class="outline-item level-' + h.level + '" data-heading-index="' + index + '" data-heading-id="' + slugify(h.text) + '" onclick="scrollToHeading(\\'' + slugify(h.text) + '\\')">' + 
          escapeHtml(h.text) + '</li>';
      }).join('');
    }
    
    // Scroll to heading in content area
    function scrollToHeading(headingId) {
      const contentArea = document.getElementById('contentArea');
      const headingEl = document.getElementById(headingId);
      
      if (headingEl) {
        headingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update active state in outline
        document.querySelectorAll('.outline-item').forEach(function(item) {
          item.classList.remove('active');
        });
        const outlineItem = document.querySelector('.outline-item[data-heading-id="' + headingId + '"]');
        if (outlineItem) {
          outlineItem.classList.add('active');
        }
        
        // Flash effect on heading
        headingEl.style.transition = 'background-color 0.3s ease';
        headingEl.style.backgroundColor = 'rgba(251, 191, 36, 0.2)';
        setTimeout(function() {
          headingEl.style.backgroundColor = '';
        }, 1000);
      }
    }
    
    // Slugify text for heading IDs
    function slugify(text) {
      return text.toLowerCase()
        .replace(/[^a-z0-9\\u4e00-\\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) || 'heading';
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
      const toggle = document.getElementById('outlineToggle');
      outlineVisible = !outlineVisible;
      
      if (outlineVisible) {
        panel.classList.add('visible');
        toggle.classList.add('active');
      } else {
        panel.classList.remove('visible');
        toggle.classList.remove('active');
      }
      
      vscode.postMessage({ command: 'toggleOutline', show: outlineVisible });
    }
    
    function hideOutline() {
      const panel = document.getElementById('outlinePanel');
      const toggle = document.getElementById('outlineToggle');
      outlineVisible = false;
      panel.classList.remove('visible');
      toggle.classList.remove('active');
      vscode.postMessage({ command: 'toggleOutline', show: false });
    }
    
    function toggleComments() {
      const panel = document.getElementById('commentsPanel');
      const toggle = document.getElementById('commentsToggle');
      commentsVisible = !commentsVisible;
      
      if (commentsVisible) {
        panel.classList.add('visible');
        toggle.classList.add('active');
      } else {
        panel.classList.remove('visible');
        toggle.classList.remove('active');
      }
      
      vscode.postMessage({ command: 'toggleComments', show: commentsVisible });
    }
    
    // Selection handling
    
    function handleSelection() {
      const selection = window.getSelection();
      const toolbar = document.getElementById('selectionToolbar');
      const commentPopup = document.getElementById('commentInputPopup');
      
      // If comment popup is visible, don't process new selections
      if (commentPopup.classList.contains('visible')) {
        return;
      }
      
      if (selection && selection.toString().trim().length > 0) {
        currentSelection = selection.toString().trim();
        
        // Position toolbar near selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        selectionRect = rect;
        
        toolbar.style.left = (rect.left + rect.width / 2 - 20) + 'px';
        toolbar.style.top = (rect.bottom + 8) + 'px';
        toolbar.classList.add('visible');
      } else {
        currentSelection = '';
        toolbar.classList.remove('visible');
      }
    }
    
    function showCommentInput() {
      if (!currentSelection || !selectionRect) return;
      
      const toolbar = document.getElementById('selectionToolbar');
      const popup = document.getElementById('commentInputPopup');
      const textarea = document.getElementById('commentTextarea');
      const selectedTextContent = document.getElementById('selectedTextContent');
      
      // Hide toolbar
      toolbar.classList.remove('visible');
      
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
      const toolbar = document.getElementById('selectionToolbar');
      const outlinePanel = document.getElementById('outlinePanel');
      const commentsPanel = document.getElementById('commentsPanel');
      
      if (popup.classList.contains('visible') && !popup.contains(e.target)) {
        hideCommentInput();
      }
      
      if (toolbar.classList.contains('visible') && !toolbar.contains(e.target)) {
        // Will be handled by handleSelection on mouseup
      }
      
      // Close panels if clicking outside (only if not pinned via toggle)
      if (!outlineVisible && outlinePanel.classList.contains('visible') && !outlinePanel.contains(e.target)) {
        outlinePanel.classList.remove('visible');
      }
      
      if (!commentsVisible && commentsPanel.classList.contains('visible') && !commentsPanel.contains(e.target)) {
        commentsPanel.classList.remove('visible');
      }
    });
    
    // Scroll spy - highlight current heading in outline
    function updateActiveOutlineItem() {
      const contentArea = document.getElementById('contentArea');
      const headingElements = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const offset = 100; // Offset from top
      
      let activeHeadingId = null;
      
      headingElements.forEach(function(heading) {
        const rect = heading.getBoundingClientRect();
        const contentAreaRect = contentArea.getBoundingClientRect();
        const relativeTop = rect.top - contentAreaRect.top;
        
        if (relativeTop <= offset) {
          activeHeadingId = heading.id;
        }
      });
      
      // Update outline active state
      document.querySelectorAll('.outline-item').forEach(function(item) {
        item.classList.remove('active');
      });
      
      if (activeHeadingId) {
        const activeItem = document.querySelector('.outline-item[data-heading-id="' + activeHeadingId + '"]');
        if (activeItem) {
          activeItem.classList.add('active');
          // Scroll outline to show active item if needed (only if outline panel is visible)
          if (outlineVisible) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    }
    
    // Hover to show outline
    document.getElementById('outlineTrigger').addEventListener('mouseenter', function() {
      if (!outlineVisible) {
        const panel = document.getElementById('outlinePanel');
        panel.classList.add('visible');
      }
    });
    
    document.getElementById('outlinePanel').addEventListener('mouseleave', function(e) {
      if (!outlineVisible) {
        const panel = document.getElementById('outlinePanel');
        // Check if mouse is moving to trigger area
        const rect = document.getElementById('outlineTrigger').getBoundingClientRect();
        if (e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
          panel.classList.remove('visible');
        }
      }
    });
    
    // Add scroll listener for scroll spy
    document.getElementById('contentArea').addEventListener('scroll', function() {
      // Debounce scroll spy updates
      if (window.scrollSpyTimeout) {
        clearTimeout(window.scrollSpyTimeout);
      }
      window.scrollSpyTimeout = setTimeout(updateActiveOutlineItem, 50);
    });
    
    // Update status bar counts
    function updateStatusBar() {
      document.getElementById('headingCount').textContent = headings.length + ' headings';
      const openComments = annotations.filter(function(a) { return a.status === 'open'; }).length;
      document.getElementById('commentCountText').textContent = openComments + ' comments';
    }
    
    // Initialize
    renderOutline();
    renderMarkdown();
    renderComments();
    updateStatusBar();
    
    // Initial scroll spy update
    setTimeout(updateActiveOutlineItem, 100);
    
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
        updateStatusBar();
        
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

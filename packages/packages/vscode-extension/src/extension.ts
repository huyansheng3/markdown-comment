import * as vscode from 'vscode';
import { MarkdownOutlineProvider } from './outline/OutlineProvider';
import { CommentManager } from './comments/CommentManager';
import { MarkdownPreviewPanel } from './preview/PreviewPanel';

let outlineProvider: MarkdownOutlineProvider;
let commentManager: CommentManager;

export function activate(context: vscode.ExtensionContext) {
  console.log('Markdown Comments extension is now active');

  // Initialize Outline Provider
  outlineProvider = new MarkdownOutlineProvider();
  const outlineTreeView = vscode.window.createTreeView('markdownOutline', {
    treeDataProvider: outlineProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(outlineTreeView);

  // Initialize Comment Manager
  commentManager = new CommentManager(context);
  context.subscriptions.push(commentManager);

  // Register commands
  context.subscriptions.push(
    // Preview commands
    vscode.commands.registerCommand('markdown-comments.openPreview', () => {
      MarkdownPreviewPanel.createOrShow(context.extensionUri, false);
    }),
    vscode.commands.registerCommand('markdown-comments.openPreviewToSide', () => {
      MarkdownPreviewPanel.createOrShow(context.extensionUri, true);
    }),
    vscode.commands.registerCommand('markdown-comments.toggleComments', () => {
      MarkdownPreviewPanel.toggleComments();
    }),
    // Outline commands
    vscode.commands.registerCommand('markdown-comments.refreshOutline', () => {
      outlineProvider.refresh();
    }),
    vscode.commands.registerCommand('markdown-comments.goToHeading', (item) => {
      outlineProvider.goToHeading(item);
    }),
    // Comment commands
    vscode.commands.registerCommand('markdown-comments.addComment', () => {
      commentManager.addCommentAtSelection();
    }),
    vscode.commands.registerCommand('markdown-comments.resolveThread', (threadId: string) => {
      commentManager.resolveThread(threadId);
    }),
    // Internal command for webview to add comment (with input box)
    vscode.commands.registerCommand('markdown-comments.addCommentFromPreview', async (selectionText: string) => {
      await commentManager.addCommentWithText(selectionText);
    }),
    // Internal command for webview to add comment with content (no input box)
    // Returns the new annotation ID to the webview for focusing
    vscode.commands.registerCommand('markdown-comments.addCommentWithContent', async (selectionText: string, commentText: string) => {
      const newAnnotationId = await commentManager.addCommentDirectly(selectionText, commentText);
      // Notify the preview to update and focus on the new annotation
      MarkdownPreviewPanel.updateContentWithFocus(newAnnotationId);
      return newAnnotationId;
    })
  );

  // Debounce function for performance
  let updateTimeout: NodeJS.Timeout | undefined;
  const debouncedUpdate = () => {
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(() => {
      outlineProvider.refresh();
      commentManager.refresh();
      MarkdownPreviewPanel.updateContent();
    }, 300);
  };

  // Listen to document changes with debounce
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'markdown') {
        debouncedUpdate();
      }
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor?.document.languageId === 'markdown') {
        outlineProvider.refresh();
        commentManager.refresh();
        MarkdownPreviewPanel.updateContent();
      }
    })
  );

  // Auto-open preview on markdown file open (单栏模式 - 只显示预览)
  const config = vscode.workspace.getConfiguration('markdownComments.preview');
  if (config.get('openPreviewOnOpen', true)) {
    // Open preview for current active editor if it's markdown
    if (vscode.window.activeTextEditor?.document.languageId === 'markdown') {
      // 使用全屏预览模式，替换源代码编辑器
      MarkdownPreviewPanel.createOrShow(context.extensionUri, false);
    }

    // Listen to active editor changes
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor?.document.languageId === 'markdown') {
          const previewConfig = vscode.workspace.getConfiguration('markdownComments.preview');
          if (previewConfig.get('openPreviewOnOpen', true)) {
            // 检查是否已经有预览面板打开
            if (!MarkdownPreviewPanel.currentPanel) {
              MarkdownPreviewPanel.createOrShow(context.extensionUri, false);
            }
          }
        }
      })
    );
  }

  // Initial refresh
  if (vscode.window.activeTextEditor?.document.languageId === 'markdown') {
    outlineProvider.refresh();
    commentManager.refresh();
  }
}

export function deactivate() {
  // Cleanup
}

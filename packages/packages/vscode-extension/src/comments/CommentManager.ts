import * as vscode from 'vscode';
import { parse, addComment, resolveThread as coreResolveThread, createAnnotation } from 'comment-md-core';
import type { Annotation, ParseResult } from 'comment-md-core';
import { CommentTreeProvider } from './CommentTreeProvider';
import { MarkdownPreviewPanel } from '../preview/PreviewPanel';

export class CommentManager implements vscode.Disposable {
  private decorationType: vscode.TextEditorDecorationType;
  private resolvedDecorationType: vscode.TextEditorDecorationType;
  private treeProvider: CommentTreeProvider;
  private disposables: vscode.Disposable[] = [];
  private currentParseResult: ParseResult | null = null;

  constructor(private context: vscode.ExtensionContext) {
    // Create decoration types for highlighting
    const config = vscode.workspace.getConfiguration('markdownComments.comments');
    
    this.decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: config.get('highlightColor', 'rgba(255, 212, 0, 0.2)'),
      border: '1px solid rgba(255, 212, 0, 0.5)',
      borderRadius: '3px',
    });

    this.resolvedDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: config.get('resolvedHighlightColor', 'rgba(0, 200, 0, 0.1)'),
      border: '1px dashed rgba(0, 200, 0, 0.3)',
      borderRadius: '3px',
    });

    // Initialize tree provider
    this.treeProvider = new CommentTreeProvider();
    const treeView = vscode.window.createTreeView('markdownComments', {
      treeDataProvider: this.treeProvider,
      showCollapseAll: true,
    });
    this.disposables.push(treeView);

    // Handle tree item click
    this.disposables.push(
      vscode.commands.registerCommand('markdown-comments.goToComment', (item) => {
        this.goToAnnotation(item.annotation);
      })
    );
  }

  refresh(): void {
    const document = this.findMarkdownDocument();
    if (!document) {
      this.clearDecorations();
      this.treeProvider.setAnnotations([]);
      return;
    }

    const text = document.getText();
    
    try {
      this.currentParseResult = parse(text);
      
      // Apply decorations to visible editors
      const visibleEditors = vscode.window.visibleTextEditors;
      for (const editor of visibleEditors) {
        if (editor.document.uri.toString() === document.uri.toString()) {
          this.applyDecorations(editor, this.currentParseResult.annotations);
        }
      }
      
      this.treeProvider.setAnnotations(this.currentParseResult.annotations);
    } catch (error) {
      console.error('Failed to parse annotations:', error);
      this.clearDecorations();
      this.treeProvider.setAnnotations([]);
    }
  }

  /**
   * Find the markdown document - from editor, preview panel, or open documents
   */
  private findMarkdownDocument(): vscode.TextDocument | undefined {
    // 1. Try active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'markdown') {
      return activeEditor.document;
    }

    // 2. Try visible editors
    const visibleEditors = vscode.window.visibleTextEditors;
    const markdownEditor = visibleEditors.find(e => e.document.languageId === 'markdown');
    if (markdownEditor) {
      return markdownEditor.document;
    }

    // 3. Try from preview panel's current document
    const previewDocUri = MarkdownPreviewPanel.getCurrentDocUri();
    if (previewDocUri) {
      const openDocs = vscode.workspace.textDocuments;
      const doc = openDocs.find(d => d.uri.toString() === previewDocUri.toString());
      if (doc) {
        return doc;
      }
    }

    // 4. Find any open markdown document
    const openDocs = vscode.workspace.textDocuments;
    return openDocs.find(d => d.languageId === 'markdown');
  }

  private applyDecorations(editor: vscode.TextEditor, annotations: Annotation[]): void {
    const openDecorations: vscode.DecorationOptions[] = [];
    const resolvedDecorations: vscode.DecorationOptions[] = [];

    for (const annotation of annotations) {
      const startPos = new vscode.Position(
        annotation.position.start.line - 1,
        annotation.position.start.column - 1
      );
      const endPos = new vscode.Position(
        annotation.position.end.line - 1,
        annotation.position.end.column - 1
      );
      const range = new vscode.Range(startPos, endPos);

      const decoration: vscode.DecorationOptions = {
        range,
        hoverMessage: this.createHoverMessage(annotation),
      };

      if (annotation.status === 'resolved') {
        resolvedDecorations.push(decoration);
      } else {
        openDecorations.push(decoration);
      }
    }

    editor.setDecorations(this.decorationType, openDecorations);
    editor.setDecorations(this.resolvedDecorationType, resolvedDecorations);
  }

  private createHoverMessage(annotation: Annotation): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`**${annotation.status === 'open' ? '💬 Open' : '✅ Resolved'}** \`${annotation.id}\`\n\n`);
    
    for (const comment of annotation.comments) {
      const time = new Date(comment.time).toLocaleString();
      md.appendMarkdown(`---\n**${comment.by}** • ${time}\n\n${comment.content}\n\n`);
    }

    if (annotation.status === 'open') {
      md.appendMarkdown(`\n[Resolve](command:markdown-comments.resolveThread?${encodeURIComponent(JSON.stringify(annotation.id))})`);
    }

    return md;
  }

  private clearDecorations(): void {
    const visibleEditors = vscode.window.visibleTextEditors;
    for (const editor of visibleEditors) {
      editor.setDecorations(this.decorationType, []);
      editor.setDecorations(this.resolvedDecorationType, []);
    }
  }

  async addCommentAtSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      vscode.window.showWarningMessage('Please open a Markdown file first');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage('Please select some text to comment on');
      return;
    }

    // Get comment content from user
    const commentText = await vscode.window.showInputBox({
      prompt: 'Enter your comment',
      placeHolder: 'Type your comment here...',
    });

    if (!commentText) {
      return;
    }

    // Get author name
    const author = await this.getAuthorName();

    const selectedText = editor.document.getText(selection);
    const document = editor.document;
    const text = document.getText();

    try {
      // Create annotation
      const newSource = createAnnotation(text, {
        content: selectedText,
        comment: {
          by: author,
          content: commentText,
        },
      });

      // Apply the edit
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );

      await editor.edit((editBuilder) => {
        editBuilder.replace(fullRange, newSource);
      });

      vscode.window.showInformationMessage('Comment added successfully');
      this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add comment: ${error}`);
    }
  }

  async resolveThread(threadId: string): Promise<void> {
    const document = this.findMarkdownDocument();
    if (!document) {
      vscode.window.showWarningMessage('No Markdown file is currently open');
      return;
    }

    const text = document.getText();

    try {
      const newSource = coreResolveThread(text, threadId, { action: 'archive' });

      // Apply the edit using workspace edit (works even if editor is not visible)
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );
      edit.replace(document.uri, fullRange, newSource);
      
      await vscode.workspace.applyEdit(edit);

      vscode.window.showInformationMessage(`Thread ${threadId} resolved`);
      this.refresh();
      MarkdownPreviewPanel.updateContent();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to resolve thread: ${error}`);
    }
  }

  /**
   * Add comment with pre-selected text (from webview)
   */
  async addCommentWithText(selectionText: string): Promise<void> {
    // Find the markdown document
    const document = this.findMarkdownDocument();
    
    if (!document) {
      vscode.window.showWarningMessage('No Markdown file is currently open');
      return;
    }

    // Get comment content from user
    const commentText = await vscode.window.showInputBox({
      prompt: 'Enter your comment',
      placeHolder: 'Type your comment here...',
      title: `Comment on: "${selectionText.substring(0, 50)}${selectionText.length > 50 ? '...' : ''}"`,
    });

    if (!commentText) {
      return;
    }

    // Get author name
    const author = await this.getAuthorName();

    const text = document.getText();

    // Find the selection text in the document
    const index = text.indexOf(selectionText);
    if (index === -1) {
      // Try to find in clean markdown (text without annotation tags)
      const cleanText = text.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
      if (!cleanText.includes(selectionText)) {
        vscode.window.showWarningMessage('Could not find the selected text in the document');
        return;
      }
    }

    // Use comment-md-core's createAnnotation to add inline annotation
    try {
      const newSource = createAnnotation(text, {
        content: selectionText,
        comment: {
          by: author,
          content: commentText,
        },
      });

      // Apply the edit using workspace edit (works even if editor is not visible)
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );
      edit.replace(document.uri, fullRange, newSource);
      
      await vscode.workspace.applyEdit(edit);

      vscode.window.showInformationMessage('Comment added successfully');
      this.refresh();
      MarkdownPreviewPanel.updateContent();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add comment: ${error}`);
    }
  }

  /**
   * Add comment directly with provided content (no input box - called from webview popup)
   */
  async addCommentDirectly(selectionText: string, commentText: string): Promise<string | null> {
    // Find the markdown document
    const document = this.findMarkdownDocument();
    
    if (!document) {
      vscode.window.showWarningMessage('No Markdown file is currently open');
      return null;
    }

    // Get author name
    const author = await this.getAuthorName();

    const text = document.getText();

    // Normalize selection text (handle whitespace differences from rendered HTML)
    const normalizedSelection = selectionText.replace(/\s+/g, ' ').trim();
    
    // Try multiple matching strategies
    let targetText = selectionText;
    let foundInDocument = text.includes(selectionText);
    
    if (!foundInDocument) {
      // Strategy 1: Try normalized whitespace match
      const normalizedDocText = text.replace(/\s+/g, ' ');
      if (normalizedDocText.includes(normalizedSelection)) {
        // Find the original text that matches
        const regex = new RegExp(normalizedSelection.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/ /g, '\\s+'), 'g');
        const match = text.match(regex);
        if (match && match[0]) {
          targetText = match[0];
          foundInDocument = true;
        }
      }
    }
    
    if (!foundInDocument) {
      // Strategy 2: Try without annotation tags
      const cleanText = text.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
      if (cleanText.includes(selectionText)) {
        foundInDocument = true;
      } else if (cleanText.replace(/\s+/g, ' ').includes(normalizedSelection)) {
        const regex = new RegExp(normalizedSelection.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/ /g, '\\s+'), 'g');
        const match = cleanText.match(regex);
        if (match && match[0]) {
          targetText = match[0];
          foundInDocument = true;
        }
      }
    }
    
    if (!foundInDocument) {
      vscode.window.showWarningMessage('Could not find the selected text in the document. The text may have been modified.');
      return null;
    }

    // Use comment-md-core's createAnnotation to add inline annotation
    try {
      const newSource = createAnnotation(text, {
        content: targetText,
        comment: {
          by: author,
          content: commentText,
        },
      });

      // Apply the edit using workspace edit (works even if editor is not visible)
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );
      edit.replace(document.uri, fullRange, newSource);
      
      await vscode.workspace.applyEdit(edit);

      // Extract the new annotation ID from the source
      const idMatch = newSource.match(/<annotation id="([^"]+)"/);
      const newAnnotationId = idMatch ? idMatch[1] : null;

      vscode.window.showInformationMessage('Comment added successfully');
      this.refresh();
      
      // Return the new annotation ID so the preview can focus on it
      return newAnnotationId;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add comment: ${error}`);
      return null;
    }
  }

  private async getAuthorName(): Promise<string> {
    // Try to get from git config
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (gitExtension) {
        const git = gitExtension.exports.getAPI(1);
        const repo = git.repositories[0];
        if (repo) {
          const config = await repo.getConfig('user.name');
          if (config) {
            return config;
          }
        }
      }
    } catch {
      // Fallback
    }

    // Fallback to 'human'
    return 'human';
  }

  private goToAnnotation(annotation: Annotation): void {
    const document = this.findMarkdownDocument();
    if (!document) {
      return;
    }

    // Open the document first
    vscode.window.showTextDocument(document).then(editor => {
      const position = new vscode.Position(
        annotation.position.start.line - 1,
        annotation.position.start.column - 1
      );
      const range = new vscode.Range(position, position);

      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    });
  }

  dispose(): void {
    this.decorationType.dispose();
    this.resolvedDecorationType.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}

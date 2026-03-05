import * as vscode from 'vscode';
import type { Annotation, Comment } from 'comment-md-core';

export class CommentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly annotation: Annotation,
    public readonly comment?: Comment,
    public readonly isHeader: boolean = false
  ) {
    super(
      isHeader ? CommentTreeItem.getAnnotationLabel(annotation) : (comment?.content.split('\n')[0] || ''),
      isHeader
        ? (annotation.comments.length > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None)
        : vscode.TreeItemCollapsibleState.None
    );

    if (isHeader) {
      this.setupHeaderItem();
    } else if (comment) {
      this.setupCommentItem(comment);
    }
  }

  private static getAnnotationLabel(annotation: Annotation): string {
    // Get first line of content, truncated
    const firstLine = annotation.content.split('\n')[0];
    const truncated = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
    return truncated;
  }

  private setupHeaderItem(): void {
    const statusIcon = this.annotation.status === 'open' ? '💬' : '✅';
    const commentCount = this.annotation.comments.length;
    
    this.description = `${statusIcon} ${commentCount} comment${commentCount !== 1 ? 's' : ''}`;
    this.tooltip = new vscode.MarkdownString();
    this.tooltip.appendMarkdown(`**ID:** \`${this.annotation.id}\`\n\n`);
    this.tooltip.appendMarkdown(`**Status:** ${this.annotation.status}\n\n`);
    this.tooltip.appendMarkdown(`**Content:**\n\`\`\`\n${this.annotation.content}\n\`\`\``);
    
    this.iconPath = new vscode.ThemeIcon(
      this.annotation.status === 'open' ? 'comment-discussion' : 'check'
    );

    this.command = {
      command: 'markdown-comments.goToComment',
      title: 'Go to Annotation',
      arguments: [this],
    };

    this.contextValue = this.annotation.status === 'open' ? 'openAnnotation' : 'resolvedAnnotation';
  }

  private setupCommentItem(comment: Comment): void {
    const time = new Date(comment.time).toLocaleString();
    this.description = `${comment.by} • ${time}`;
    
    this.tooltip = new vscode.MarkdownString();
    this.tooltip.appendMarkdown(`**${comment.by}** • ${time}\n\n`);
    this.tooltip.appendMarkdown(comment.content);

    this.iconPath = new vscode.ThemeIcon(
      comment.by === 'ai' ? 'sparkle' : 'person'
    );

    this.command = {
      command: 'markdown-comments.goToComment',
      title: 'Go to Comment',
      arguments: [this],
    };
  }
}

export class CommentTreeProvider implements vscode.TreeDataProvider<CommentTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CommentTreeItem | undefined | null | void> =
    new vscode.EventEmitter<CommentTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CommentTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private annotations: Annotation[] = [];

  setAnnotations(annotations: Annotation[]): void {
    this.annotations = annotations;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CommentTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CommentTreeItem): Thenable<CommentTreeItem[]> {
    if (!element) {
      // Root level - show annotations
      // Sort: open first, then by position
      const sorted = [...this.annotations].sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'open' ? -1 : 1;
        }
        return a.position.start.line - b.position.start.line;
      });

      return Promise.resolve(
        sorted.map((ann) => new CommentTreeItem(ann, undefined, true))
      );
    } else if (element.isHeader) {
      // Show comments under annotation
      return Promise.resolve(
        element.annotation.comments.map(
          (comment) => new CommentTreeItem(element.annotation, comment, false)
        )
      );
    }

    return Promise.resolve([]);
  }
}

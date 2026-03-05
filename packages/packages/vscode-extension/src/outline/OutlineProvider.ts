import * as vscode from 'vscode';

export interface HeadingItem {
  text: string;
  level: number;
  line: number;
  children: HeadingItem[];
}

export class OutlineTreeItem extends vscode.TreeItem {
  constructor(
    public readonly heading: HeadingItem,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(heading.text, collapsibleState);
    
    this.tooltip = `Line ${heading.line + 1}: ${heading.text}`;
    this.description = this.getDescription();
    this.iconPath = this.getIcon();
    this.command = {
      command: 'markdown-comments.goToHeading',
      title: 'Go to Heading',
      arguments: [this],
    };
  }

  private getDescription(): string {
    const config = vscode.workspace.getConfiguration('markdownComments.outline');
    if (config.get('showLineNumbers')) {
      return `Line ${this.heading.line + 1}`;
    }
    return '';
  }

  private getIcon(): vscode.ThemeIcon {
    // Different icons for different heading levels
    const icons: Record<number, string> = {
      1: 'symbol-class',
      2: 'symbol-method',
      3: 'symbol-function',
      4: 'symbol-field',
      5: 'symbol-variable',
      6: 'symbol-constant',
    };
    return new vscode.ThemeIcon(icons[this.heading.level] || 'symbol-text');
  }
}

export class MarkdownOutlineProvider implements vscode.TreeDataProvider<OutlineTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<OutlineTreeItem | undefined | null | void> =
    new vscode.EventEmitter<OutlineTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<OutlineTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private headings: HeadingItem[] = [];

  refresh(): void {
    this.parseDocument();
    this._onDidChangeTreeData.fire();
  }

  private parseDocument(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      this.headings = [];
      return;
    }

    const document = editor.document;
    const text = document.getText();
    const lines = text.split('\n');
    
    const flatHeadings: HeadingItem[] = [];
    
    // Parse headings
    const headingRegex = /^(#{1,6})\s+(.+)$/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(headingRegex);
      
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        
        flatHeadings.push({
          text,
          level,
          line: i,
          children: [],
        });
      }
    }
    
    // Build tree structure
    this.headings = this.buildTree(flatHeadings);
  }

  private buildTree(flatHeadings: HeadingItem[]): HeadingItem[] {
    const root: HeadingItem[] = [];
    const stack: HeadingItem[] = [];

    for (const heading of flatHeadings) {
      // Find parent
      while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(heading);
      } else {
        stack[stack.length - 1].children.push(heading);
      }

      stack.push(heading);
    }

    return root;
  }

  getTreeItem(element: OutlineTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: OutlineTreeItem): Thenable<OutlineTreeItem[]> {
    if (!element) {
      // Root level
      return Promise.resolve(
        this.headings.map(
          (h) =>
            new OutlineTreeItem(
              h,
              h.children.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
            )
        )
      );
    } else {
      // Children
      return Promise.resolve(
        element.heading.children.map(
          (h) =>
            new OutlineTreeItem(
              h,
              h.children.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
            )
        )
      );
    }
  }

  goToHeading(item: OutlineTreeItem): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const line = item.heading.line;
    const position = new vscode.Position(line, 0);
    const range = new vscode.Range(position, position);

    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  }
}

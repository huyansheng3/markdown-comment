# comment-md 实施计划

> 项目名称：comment-md
> 目标：实现 Markdown 协议扩展，支持人类与 AI 双向评论协作
> 创建时间：2026-02-28

---

## 📋 项目概述

### 核心目标
基于 Markdown 扩展语法，实现文档评论功能，方便 AI 和人类基于文档协作时相互评论。

### 技术栈
- 语言：TypeScript
- 包管理：pnpm + monorepo
- 构建工具：tsup
- 测试框架：vitest
- 文档：VitePress

---

## 📦 项目结构（Monorepo）

```
comment-md/
├── packages/
│   ├── core/                    # 核心解析器和 API
│   │   ├── src/
│   │   │   ├── parser.ts        # Markdown + annotation 解析
│   │   │   ├── types.ts         # 类型定义
│   │   │   ├── utils.ts         # 工具函数（hash、normalize）
│   │   │   ├── api/
│   │   │   │   ├── parse.ts         # parse(source) -> AST
│   │   │   │   ├── exportAiView.ts  # 导出 AI 视图
│   │   │   │   ├── resolveThread.ts # 关闭/归档 thread
│   │   │   │   └── applyEdits.ts    # 应用编辑并检测变化
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── remark-plugin/           # remark 插件
│   │   ├── src/
│   │   │   ├── plugin.ts        # remark 插件主入口
│   │   │   ├── mdast-annotation.ts  # 自定义 mdast 节点
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── react-ui/                # React UI 组件（参考实现）
│       ├── src/
│       │   ├── components/
│       │   │   ├── AnnotationHighlight.tsx  # 高亮标记组件
│       │   │   ├── CommentThread.tsx        # 评论 thread 组件
│       │   │   ├── CommentSidebar.tsx       # 侧边栏面板
│       │   │   └── CommentInput.tsx         # 评论输入框
│       │   ├── hooks/
│       │   │   ├── useAnnotations.ts        # 状态管理
│       │   │   └── useCommentActions.ts     # 操作 hooks
│       │   ├── context/
│       │   │   └── CommentContext.tsx       # 评论上下文
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── examples/                    # 示例项目
│   └── react-markdown-demo/
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎯 核心 API 设计

### @comment-md/core

```typescript
// types.ts
interface Annotation {
  id: string;
  status: 'open' | 'resolved';
  content: string;          // 被评论的原文内容
  contentHash: string;      // 内容 hash，用于检测变化
  comments: Comment[];
  position: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

interface Comment {
  by: string;               // 作者
  time: string;             // ISO 时间戳
  content: string;          // 评论内容（Markdown）
}

interface ParseResult {
  markdown: string;         // 清理后的 Markdown（无 annotation）
  annotations: Annotation[];
  diagnostics: Diagnostic[];
}

// API
function parse(source: string): ParseResult;
function exportAiView(source: string): string;
function resolveThread(source: string, threadId: string, action: 'delete' | 'archive'): string;
function applyEdits(source: string, newContent: string): ApplyResult;
```

---

## 🔗 React-Markdown 集成架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         应用层                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ <CommentProvider>                                        │    │
│  │   ┌─────────────────────┐  ┌─────────────────────────┐  │    │
│  │   │ <MarkdownWithComments>│  │ <CommentSidebar />     │  │    │
│  │   │   (react-markdown)   │  │   (侧边栏评论面板)      │  │    │
│  │   └─────────────────────┘  └─────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       react-markdown                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐      │
│  │ Markdown    │ →  │ remark      │ →  │ rehype          │      │
│  │ 源文件      │    │ 解析 mdast  │    │ 转换 hast       │      │
│  └─────────────┘    └─────────────┘    └─────────────────┘      │
│                            ↓                                     │
│               ┌─────────────────────────┐                        │
│               │ remark-comment-md       │  ← 我们的插件          │
│               │ (解析 annotation/comment)│                        │
│               └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       自定义组件渲染                              │
│  components={{                                                   │
│    annotation: AnnotationHighlight,                              │
│    comment: CommentBubble                                        │
│  }}                                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
1. Markdown 源文件
   ↓
2. parse() 提取 annotations 数据
   ↓
3. CommentProvider 管理状态
   ↓
4. react-markdown + remark-comment-md 渲染
   ↓
5. AnnotationHighlight 组件显示高亮
   ↓
6. 用户点击 → setActiveAnnotation
   ↓
7. CommentSidebar 显示对应评论
   ↓
8. 用户添加评论 → addComment → 更新状态
   ↓
9. 导出时调用 serialize() 生成新的 Markdown
```

### 使用示例

```tsx
import ReactMarkdown from 'react-markdown';
import { remarkCommentMd } from '@comment-md/remark-plugin';
import { 
  CommentProvider, 
  AnnotationHighlight,
  CommentSidebar 
} from '@comment-md/react-ui';
import { parse } from '@comment-md/core';

function App() {
  const { annotations } = parse(markdownSource);
  
  return (
    <CommentProvider annotations={annotations}>
      <div className="app-layout">
        <div className="content-area">
          <ReactMarkdown
            remarkPlugins={[remarkCommentMd]}
            components={{
              annotation: ({ node, children, ...props }) => (
                <AnnotationHighlight id={props.id} status={props.status}>
                  {children}
                </AnnotationHighlight>
              ),
              comment: () => null, // 在侧边栏渲染
            }}
          >
            {markdownSource}
          </ReactMarkdown>
        </div>
        <CommentSidebar />
      </div>
    </CommentProvider>
  );
}
```

---

## 📅 开发里程碑

### Phase 1: 核心解析器（Week 1-2）

| 任务 | 优先级 | 状态 |
|------|--------|------|
| 项目初始化（monorepo、构建配置） | P0 | 🔵 进行中 |
| 类型定义（types.ts） | P0 | ⚪ 待开始 |
| annotation/comment 解析器 | P0 | ⚪ 待开始 |
| parse API 实现 | P0 | ⚪ 待开始 |
| exportAiView API 实现 | P0 | ⚪ 待开始 |
| resolveThread API 实现 | P1 | ⚪ 待开始 |
| applyEdits API 实现 | P1 | ⚪ 待开始 |
| 单元测试 | P0 | ⚪ 待开始 |

### Phase 2: remark 插件（Week 3）

| 任务 | 优先级 | 状态 |
|------|--------|------|
| mdast 自定义节点定义 | P0 | ⚪ 待开始 |
| remark 插件实现 | P0 | ⚪ 待开始 |
| 与 react-markdown 集成测试 | P0 | ⚪ 待开始 |
| 文档和示例 | P1 | ⚪ 待开始 |

### Phase 3: React UI 组件（Week 4-5）

| 任务 | 优先级 | 状态 |
|------|--------|------|
| CommentProvider 上下文 | P0 | ⚪ 待开始 |
| AnnotationHighlight 组件 | P0 | ⚪ 待开始 |
| CommentThread 组件 | P0 | ⚪ 待开始 |
| CommentSidebar 组件 | P0 | ⚪ 待开始 |
| CommentInput 组件 | P1 | ⚪ 待开始 |
| 示例项目 | P0 | ⚪ 待开始 |

### Phase 4: 文档和发布（Week 6）

| 任务 | 优先级 | 状态 |
|------|--------|------|
| 协议规范文档 | P0 | ⚪ 待开始 |
| API 文档 | P0 | ⚪ 待开始 |
| npm 发布配置 | P0 | ⚪ 待开始 |
| README | P0 | ⚪ 待开始 |

---

## 📎 相关决策文档

- [D01-storage-and-lifecycle](.codeflicker/discuss/2026-02-28/markdown-comment-system/decisions/D01-storage-and-lifecycle.md)
- [D03-syntax-design](.codeflicker/discuss/2026-02-28/markdown-comment-system/decisions/D03-syntax-design.md)

# comment-md 启动指南

## 项目概述
这是一个 Markdown 协作评论扩展的 monorepo 项目，包含核心库、Remark 插件、React UI 组件和演示应用。

## packages/examples/react-markdown-demo - Demo 应用

### 快速启动

```bash
cd packages/examples/react-markdown-demo
pnpm dev
```

**启动后访问**：http://localhost:5173

```yaml
subProjectPath: packages/examples/react-markdown-demo
command: pnpm dev
cwd: packages/examples/react-markdown-demo
port: 5173
previewUrl: http://localhost:5173
description: React Markdown 评论功能演示应用
```

## packages/packages/core - 核心库

### 开发模式

```bash
cd packages/packages/core
pnpm dev
```

> 注意：这是库开发模式（tsup --watch），无 Web 预览

```yaml
subProjectPath: packages/packages/core
command: pnpm dev
cwd: packages/packages/core
port: null
previewUrl: null
description: 核心解析器和 API 库（开发监听模式）
```

## packages/packages/remark-plugin - Remark 插件

### 开发模式

```bash
cd packages/packages/remark-plugin
pnpm dev
```

> 注意：这是库开发模式（tsup --watch），无 Web 预览

```yaml
subProjectPath: packages/packages/remark-plugin
command: pnpm dev
cwd: packages/packages/remark-plugin
port: null
previewUrl: null
description: Remark 插件（开发监听模式）
```

## packages/packages/react-ui - React UI 组件

### 开发模式

```bash
cd packages/packages/react-ui
pnpm dev
```

> 注意：这是库开发模式（tsup --watch），无 Web 预览

```yaml
subProjectPath: packages/packages/react-ui
command: pnpm dev
cwd: packages/packages/react-ui
port: null
previewUrl: null
description: React UI 组件库（开发监听模式）
```

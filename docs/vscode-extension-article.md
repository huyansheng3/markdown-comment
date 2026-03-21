# 当 Markdown 遇上 Notion：一个让你在 IDE 里直接评论文档的 VSCode 插件

> 开源了一个 Notion 风格的 Markdown 预览 + 评论插件，支持选中文本直接评论、大纲导航、Frontmatter 渲染，评论直接写入文件，AI 可以读取和回复。

## 先看效果

![VSCode Extension Preview](https://raw.githubusercontent.com/huyansheng3/markdown-comment/main/docs/vscode-extension-preview.png)

## 背景：为什么要做这个插件？

我平时写技术文档、Review AI 生成的内容时，工作流大概是这样的：

1. 在 VSCode 里写 Markdown
2. 用 `Cmd+Shift+V` 预览一下排版
3. 发现某段要改，切回编辑器找位置
4. 改完再切回预览确认
5. 如果需要 AI 帮忙修改，还要复制粘贴描述「第三段第二句话改一下」

这个流程有几个问题：

- **预览和编辑是割裂的**，来回切换很烦
- **没有评论功能**，想标记某段文字的修改意见，只能靠注释或者开个文档
- **AI 无法读取评论**，每次都要重新描述位置和上下文

Google Docs、Notion 都有很好的评论功能，但它们不适合程序员的工作流 —— 我们的文档就在仓库里，用 Git 管理，用 Markdown 写。

所以我做了这个插件：**Markdown Comments**。

## 核心能力

### 1. Notion 风格的预览

打开任意 `.md` 文件，自动渲染为 Notion 风格的预览页面：

- **干净的单栏布局**，内容居中，大量留白
- **没有多余的边框和分隔线**，用阴影区分层级
- **底部状态栏**显示标题数和评论数，点击切换面板
- **YAML Frontmatter** 自动渲染为元数据卡片

和 VSCode 内置的 Markdown 预览相比，视觉体验好很多。不是那种「能看」的预览，而是「想看」的预览。

### 2. 选中即评论

这是我认为最核心的功能：

1. **选中文本** → 自动弹出悬浮工具栏
2. **点击 💬** → 在选中位置展开评论输入框
3. **写评论，`Cmd+Enter` 提交** → 完成

评论直接写入 Markdown 文件，变成 `<annotation>` 标签：

```markdown
<annotation id="c1" status="open">

这段内容被评论了。

<comment by="human" time="2026-03-21T08:00:00Z">
这里的数据需要更新一下。
</comment>

</annotation>
```

**为什么要写入文件？** 因为：

- **Git 友好** —— 评论和文档一起版本管理，不会丢
- **AI 可读** —— AI 打开这个文件就能看到所有评论，直接回复
- **跨工具** —— 不依赖特定平台，任何编辑器都能看到评论内容

### 3. 悬浮大纲面板

鼠标移到左侧边缘，大纲面板自动浮出：

- 层级缩进显示所有标题
- 点击跳转，平滑滚动
- **Scroll Spy** —— 滚动内容时自动高亮当前标题
- 不需要时自动隐藏，不占空间

也可以点击底部状态栏的 📑 按钮固定显示。

### 4. 评论管理面板

点击底部 💬 按钮，右侧弹出评论面板：

- 查看所有评论线程
- 区分 Open / Resolved 状态
- 点击高亮文本直接定位到对应评论
- 一键 Resolve 关闭讨论

## 使用场景

### 场景一：AI 写文档 → 人类评审

```
1. AI 生成技术文档
2. 你在预览中选中某段 → 添加评论「这里的性能数据不准确」
3. AI 读取文件，看到评论 → 修改对应段落 → 标记为 resolved
```

评论直接在文件里，AI 无需额外 prompt 就能理解上下文。

### 场景二：团队文档协作

```
1. 同事写了一篇设计文档
2. 你在 Review 时选中关键段落添加评论
3. 评论随 Git 提交，所有人都能看到
4. 讨论完毕后 Resolve，历史记录保留
```

比 PR 里散落的 comment 更聚焦，因为评论直接附在文档内容上。

### 场景三：个人写作笔记

```
1. 写博客草稿
2. 标记「这段需要补充例子」「这里的逻辑需要重新组织」
3. 下次打开文件，评论还在
4. 修改完成后 Resolve
```

## 技术实现

简单聊几个设计决策：

### 为什么用 Webview 而不是内置预览？

VSCode 的内置 Markdown 预览 API 非常有限，无法实现：
- 自定义布局（悬浮面板、底部状态栏）
- 文本选择交互（选中 → 工具栏 → 评论输入）
- 评论高亮和点击事件

用 Webview 虽然要自己实现 Markdown 渲染，但换来了完全的 UI 控制权。

### 为什么用 HTML 标签而不是注释语法？

调研了几种方案：

| 方案 | 问题 |
|------|------|
| `<!-- comment -->` | 无法包裹内容，无法结构化 |
| `:::` directive | 需要修改解析器，不兼容 |
| `<annotation>` 标签 | ✅ Markdown 原生支持 HTML，可包裹任意块 |

### 增量更新保持滚动位置

添加评论后，文件内容变了，预览需要刷新。如果整体替换 HTML，滚动位置会丢失。

解决方案：首次加载用完整 HTML，后续更新通过 `postMessage` 发送数据，在 Webview 内部增量渲染，保持 `scrollTop` 不变。

## 安装

### 方式一：从 VSCode Marketplace 安装

在 VSCode 扩展搜索 **Markdown Comments**，或者访问：

🔗 [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=huyansheng.markdown-comments)

### 方式二：下载 VSIX 手动安装

从 [GitHub Releases](https://github.com/huyansheng3/markdown-comment/releases) 下载最新的 `.vsix` 文件：

```bash
code --install-extension markdown-comments-0.2.1.vsix
```

### 方式三：从源码构建

```bash
git clone https://github.com/huyansheng3/markdown-comment.git
cd markdown-comment/packages/packages/vscode-extension
npm install
npm run package
code --install-extension markdown-comments-*.vsix
```

## 配置项

| 配置 | 默认值 | 说明 |
|------|--------|------|
| `markdownComments.preview.openPreviewOnOpen` | `true` | 打开 .md 文件时自动预览 |
| `markdownComments.preview.showComments` | `false` | 默认显示评论面板 |
| `markdownComments.preview.showOutline` | `false` | 默认显示大纲面板 |
| `markdownComments.comments.highlightColor` | `rgba(255,212,0,0.2)` | 评论高亮颜色 |

## 和其他工具的对比

| 功能 | VSCode 内置预览 | Markdown Comments | Notion |
|------|-----------------|-------------------|--------|
| Markdown 渲染 | ✅ | ✅ | ✅ |
| 大纲导航 | ❌ | ✅ 悬浮 + Scroll Spy | ✅ |
| 文本评论 | ❌ | ✅ 选中即评论 | ✅ |
| 评论写入文件 | - | ✅ Git 友好 | ❌ 数据在云端 |
| AI 可读评论 | - | ✅ 结构化标签 | ❌ |
| Frontmatter | ❌ | ✅ 卡片展示 | - |
| 自定义主题 | 有限 | ✅ Notion 风格 | - |
| 离线使用 | ✅ | ✅ | ❌ |

## 开源地址

- **GitHub**: https://github.com/huyansheng3/markdown-comment
- **VSCode Marketplace**: https://marketplace.visualstudio.com/items?itemName=huyansheng.markdown-comments
- **在线 Demo**: https://huyansheng3.github.io/markdown-comment/

这个项目是 comment-md 生态的一部分，除了 VSCode 插件，还包括：

- `comment-md-core` —— 核心解析库
- `comment-md-remark-plugin` —— Remark 插件
- `comment-md-react-ui` —— React 组件库

欢迎 Star ⭐️，有问题随时提 Issue。

---

**关键词**: VSCode 插件, Markdown 评论, Notion 风格, AI 协作, 文档 Review, 开源

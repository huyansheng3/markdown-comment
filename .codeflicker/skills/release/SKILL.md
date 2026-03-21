# Release Skill — comment-md Project

One-command release workflow for the comment-md project.  
Covers: **VSCode Extension** (build → publish to Marketplace + GitHub Release) and **npm packages**.

---

## When to Trigger

User says any of:
- "发布"、"release"、"publish"、"上线"、"发版"
- "发布插件"、"publish extension"、"发布到 marketplace"
- "创建 release"、"github release"、"上传 vsix"
- "发布 npm 包"、"npm publish"

---

## Release Targets

| Target | Command | Output |
|--------|---------|--------|
| VSCode Extension → Marketplace | `npx vsce publish` | https://marketplace.visualstudio.com/items?itemName=huyansheng.markdown-comments |
| VSCode Extension → GitHub Release | `gh release create` | https://github.com/huyansheng3/markdown-comment/releases |
| npm packages | `pnpm publish` | npmjs.com |

---

## VSCode Extension Release

### Prerequisites

1. **Publisher** already created: `huyansheng` on https://marketplace.visualstudio.com/manage
2. **PAT** already configured via `npx vsce login huyansheng`
3. **gh CLI** authenticated: `gh auth status`

### Step-by-Step

#### 1. Bump Version (if needed)

```bash
cd packages/packages/vscode-extension
# Edit package.json version field, e.g., 0.2.0 → 0.3.0
```

Read current version from `packages/packages/vscode-extension/package.json` first.  
If user doesn't specify a version, suggest a patch bump.

#### 2. Build & Package

```bash
cd packages/packages/vscode-extension
npm run build
npm run package  # Produces markdown-comments-{VERSION}.vsix
```

Verify the VSIX file exists and check the file list output.

#### 3. Install Locally & Test (Optional)

```bash
code --install-extension markdown-comments-{VERSION}.vsix --force
```

#### 4. Commit & Push

```bash
cd /Users/huyansheng/Documents/comment-md
git add -A
git commit -m "release(vscode-extension): v{VERSION}

{RELEASE_NOTES_SUMMARY}"
git push origin main
```

#### 5. Publish to VSCode Marketplace

```bash
cd packages/packages/vscode-extension
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
npx vsce publish --no-dependencies
```

**Expected output:**
```
DONE  Published huyansheng.markdown-comments v{VERSION}.
```

**If PAT expired:**
```bash
npx vsce login huyansheng
# Paste new PAT from https://dev.azure.com → User Settings → Personal Access Tokens
# Organization: All accessible organizations
# Scopes: Marketplace → Manage
```

#### 6. Create GitHub Release

```bash
cd /Users/huyansheng/Documents/comment-md

gh release create v{VERSION} \
  --title "v{VERSION} - {TITLE}" \
  --notes "{RELEASE_NOTES}" \
  packages/packages/vscode-extension/markdown-comments-{VERSION}.vsix
```

**Release notes template:**
```markdown
## 🎉 Markdown Comments VSCode Extension v{VERSION}

### ✨ What's New

- Feature 1
- Feature 2
- Bug fix 1

### 📥 Install

Download `markdown-comments-{VERSION}.vsix` below, then:

\`\`\`bash
code --install-extension markdown-comments-{VERSION}.vsix
\`\`\`

Or in VSCode: `Cmd+Shift+P` → "Extensions: Install from VSIX..."

Or install from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=huyansheng.markdown-comments).

### 📋 Full Changelog

See [README](https://github.com/huyansheng3/markdown-comment/blob/main/packages/packages/vscode-extension/README.md) for documentation.
```

---

## npm Package Release

### Packages

| Package | Path |
|---------|------|
| `comment-md-core` | `packages/packages/core` |
| `comment-md-remark-plugin` | `packages/packages/remark-plugin` |
| `comment-md-react-ui` | `packages/packages/react-ui` |

### Step-by-Step

#### 1. Bump Version

```bash
cd packages/packages/{PACKAGE_NAME}
# Edit package.json version
```

#### 2. Build

```bash
cd packages/packages/{PACKAGE_NAME}
pnpm build
```

#### 3. Publish

```bash
cd packages/packages/{PACKAGE_NAME}
pnpm publish --access public --no-git-checks
```

#### 4. Commit & Tag

```bash
git add -A
git commit -m "release({PACKAGE_NAME}): v{VERSION}"
git tag {PACKAGE_NAME}@{VERSION}
git push origin main --tags
```

---

## Full Release (All Targets)

When user says "全量发布" or "release all":

1. Build & publish npm packages (core → remark-plugin → react-ui, in dependency order)
2. Build & publish VSCode extension
3. Create GitHub Release with VSIX attached
4. Update root README if needed

---

## Important Links

| Resource | URL |
|----------|-----|
| VSCode Marketplace | https://marketplace.visualstudio.com/items?itemName=huyansheng.markdown-comments |
| Marketplace Management | https://marketplace.visualstudio.com/manage/publishers/huyansheng |
| GitHub Releases | https://github.com/huyansheng3/markdown-comment/releases |
| GitHub Repo | https://github.com/huyansheng3/markdown-comment |
| npm: comment-md-core | https://www.npmjs.com/package/comment-md-core |
| Azure DevOps PAT | https://dev.azure.com → User Settings → Personal Access Tokens |

---

## Troubleshooting

### PAT Expired
```bash
npx vsce login huyansheng
# Create new PAT at https://dev.azure.com
# Organization: All accessible organizations
# Scopes: Marketplace → Manage
```

### `npx` not found
```bash
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
```

### VSIX build fails
```bash
cd packages/packages/vscode-extension
rm -rf dist node_modules
npm install
npm run build
npm run package
```

### gh CLI not authenticated
```bash
gh auth login
# Choose GitHub.com → HTTPS → Login with browser
```

### Version conflict on Marketplace
The version in `package.json` must be **higher** than the currently published version.  
Check current: https://marketplace.visualstudio.com/items?itemName=huyansheng.markdown-comments

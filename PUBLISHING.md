# Publishing & Local Installation Guide

## Using the Extension Locally

### Option 1: Development Mode (F5)
1. Open the extension folder in VS Code
2. Press `F5` to launch Extension Development Host
3. A new VS Code window opens with the extension loaded
4. Open any Go file and use the commands

### Option 2: Install from VSIX (Recommended for local use)

#### Build the VSIX package:
```bash
# Install vsce (VS Code Extension packaging tool)
npm install -g @vscode/vsce

# Package the extension
cd /Users/m0k099s/Documents/tools/readablitiy-go-error
vsce package
```

This creates a `.vsix` file (e.g., `go-error-collapse-1.0.0.vsix`)

#### Install the VSIX:
**Via Command Line:**
```bash
code --install-extension go-error-collapse-1.0.0.vsix
```

**Via VS Code UI:**
1. Open VS Code
2. Go to Extensions view (`Cmd+Shift+X`)
3. Click the `...` menu (top right)
4. Select "Install from VSIX..."
5. Choose the `.vsix` file

### Option 3: Symlink to Extensions Folder
```bash
# Find your VS Code extensions folder
# macOS: ~/.vscode/extensions/
# Linux: ~/.vscode/extensions/
# Windows: %USERPROFILE%\.vscode\extensions\

# Create symlink
ln -s /Users/m0k099s/Documents/tools/readablitiy-go-error ~/.vscode/extensions/go-error-collapse

# Restart VS Code
```

---

## Publishing to VS Code Marketplace

### Prerequisites

1. **Microsoft Account** - Create one at https://account.microsoft.com
2. **Azure DevOps Organization** - Create at https://dev.azure.com
3. **Personal Access Token (PAT)** - Required for publishing

### Step 1: Create Azure DevOps Personal Access Token

1. Go to https://dev.azure.com
2. Sign in with your Microsoft account
3. Click on your profile icon (top right) → "Personal access tokens"
4. Click "New Token"
5. Configure:
   - **Name:** `vsce-publish` (or any name)
   - **Organization:** Select "All accessible organizations"
   - **Expiration:** Choose duration (max 1 year)
   - **Scopes:** Click "Custom defined", then:
     - Find "Marketplace" → Check "Manage"
6. Click "Create" and **copy the token immediately** (you won't see it again)

### Step 2: Create a Publisher

```bash
# Login with your PAT
vsce login <publisher-name>
# Enter your PAT when prompted

# Or create a new publisher
vsce create-publisher <publisher-name>
```

You can also create a publisher at: https://marketplace.visualstudio.com/manage

### Step 3: Update package.json

Ensure your `package.json` has these fields:

```json
{
  "name": "go-error-collapse",
  "displayName": "Go Error Collapse",
  "description": "Collapse and simplify Go error handling blocks",
  "version": "1.0.0",
  "publisher": "YOUR_PUBLISHER_NAME",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/go-error-collapse"
  },
  "icon": "images/icon.png",
  "engines": {
    "vscode": "^1.74.0"
  }
}
```

### Step 4: Add Required Files

#### Icon (128x128 PNG recommended)
```bash
mkdir -p images
# Add your icon as images/icon.png
```

#### LICENSE file
```bash
# Create a LICENSE file (MIT, Apache, etc.)
echo "MIT License..." > LICENSE
```

#### Update README.md
Make sure README.md has:
- Clear description
- Features list
- Screenshots/GIFs
- Usage instructions
- Commands list

### Step 5: Pre-publish Checklist

```bash
# Compile TypeScript
npm run compile

# Run tests (if any)
npm test

# Check for issues
vsce ls
```

### Step 6: Publish

```bash
# First time publish
vsce publish

# Publish with version bump
vsce publish minor  # 1.0.0 → 1.1.0
vsce publish patch  # 1.0.0 → 1.0.1
vsce publish major  # 1.0.0 → 2.0.0

# Publish specific version
vsce publish 1.2.3
```

### Step 7: Verify Publication

1. Go to https://marketplace.visualstudio.com
2. Search for your extension
3. It may take a few minutes to appear

---

## Updating the Extension

```bash
# Make your changes
# Update version in package.json (or use vsce publish minor/patch)

# Publish update
vsce publish
```

---

## Useful Commands

```bash
# Package without publishing (creates .vsix)
vsce package

# Show files that will be included
vsce ls

# Unpublish (remove from marketplace)
vsce unpublish <publisher>.<extension-name>
```

---

## Troubleshooting

### "Missing publisher name"
Add `"publisher": "your-name"` to package.json

### "Personal Access Token is invalid"
- Ensure PAT has "Marketplace > Manage" scope
- Check PAT hasn't expired
- Regenerate if needed

### "Extension not found in search"
- Wait 5-10 minutes after publishing
- Check https://marketplace.visualstudio.com/manage for status

### "Missing repository field"
Add repository info to package.json:
```json
"repository": {
  "type": "git", 
  "url": "https://github.com/user/repo"
}
```

---

## Extension Commands

After installation, use these commands (Cmd+Shift+P):

| Command | Description |
|---------|-------------|
| `Go Error Collapse: Collapse All` | Collapse all error blocks |
| `Go Error Collapse: Expand All` | Expand all error blocks |
| `Go Error Collapse: Toggle` | Toggle collapse state |
| `Go Error Collapse: Make Transparent` | Dim error blocks |
| `Go Error Collapse: Reset Transparency` | Remove dimming |

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `goErrorCollapse.autoCollapseOnOpen` | `true` | Auto-collapse when opening Go files |
| `goErrorCollapse.autoCollapseOnSave` | `true` | Re-collapse after saving |
| `goErrorCollapse.showCollapsedHint` | `true` | Show inline hint for collapsed blocks |
| `goErrorCollapse.errorOpacity` | `0.5` | Opacity for transparent mode |
| `goErrorCollapse.errorPatterns` | `["err", "error"]` | Error variable patterns to detect |

# Go Error Block Collapsing Extension - Implementation Plan

## 📋 Project Overview

**Extension Name:** Go Error Collapse  
**Purpose:** Improve readability of Go code by visually collapsing verbose error handling blocks into single-line representations without modifying the actual source code.

### The Problem
Go's idiomatic error handling pattern leads to verbose code:
```go
if err != nil {
    return err
}
```

This pattern repeated throughout the codebase shadows the core business logic, making it harder to follow the main flow.

### The Solution
Create a VS Code extension that:
1. **Visually collapses** multi-line error blocks into single-line view
2. **Does NOT modify** the actual file content
3. **Is fast and lightweight** with no side-effects or lag
4. **Provides toggle capability** for quick enable/disable

---

## 🏗️ Architecture Overview

### Approach Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **FoldingRangeProvider** | Built-in folding UI, fast | Limited customization, requires manual fold |
| **Text Decorations (CSS)** | Full styling control, transparent effect | Cannot collapse lines visually |
| **Custom Fold + `editor.fold` command** | Can auto-trigger folds | Uses existing fold mechanism |
| **Line Hiding via Decorations** | Could hide middle lines | Complex, might break editing |

### Recommended Architecture: **Hybrid Approach**

1. **Primary Method:** Register a `FoldingRangeProvider` specific for Go error blocks
2. **Auto-fold:** Use `editor.fold` command on detected error blocks
3. **Visual Enhancement:** Use decorations to add subtle styling (opacity/color) before folding
4. **Summary Text:** Add inline decoration showing collapsed content hint

---

## 🔧 Technical Implementation

### Phase 1: Core Pattern Detection (TypeScript-based)

**Avoid external dependencies** (unlike the reference extension which uses Go parser). Use regex-based detection for speed.

#### Error Block Patterns to Detect

```typescript
// Pattern 1: Simple error return
// if err != nil {
//     return err
// }

// Pattern 2: Error with formatting
// if err != nil {
//     return fmt.Errorf("failed: %w", err)
// }

// Pattern 3: Fatal/panic
// if err != nil {
//     log.Fatal(err)
// }

// Pattern 4: Multiple return values
// if err != nil {
//     return nil, err
// }

// Pattern 5: Wrapped error
// if err != nil {
//     return errors.Wrap(err, "context")
// }
```

#### Regex Pattern Strategy

```typescript
const ERROR_BLOCK_PATTERN = /^(\s*)(if\s+err\s*!=\s*nil\s*\{)\s*\n(\s*(return|log\.(Fatal|Panic)|panic)\b[^}]*)\n(\s*\})/gm;
```

This captures:
- Group 1: Leading indentation
- Group 2: `if err != nil {`
- Group 3: The body (return/log.Fatal/panic statement)
- Group 4: Closing `}`

### Phase 2: Extension Structure

```
go-error-collapse/
├── src/
│   ├── extension.ts          # Main entry point
│   ├── detector.ts           # Error block detection logic
│   ├── foldingProvider.ts    # FoldingRangeProvider implementation
│   ├── decorationManager.ts  # Decoration handling
│   ├── config.ts             # Configuration management
│   └── types.ts              # Type definitions
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── README.md
└── CHANGELOG.md
```

### Phase 3: Key Components

#### 3.1 Error Block Detector (`detector.ts`)

```typescript
interface ErrorBlock {
  startLine: number;      // Line of "if err != nil {"
  endLine: number;        // Line of closing "}"
  bodyStartLine: number;  // Line of the return/fatal statement
  indentation: string;    // Original indentation
  collapsedText: string;  // One-liner representation
  fullRange: vscode.Range;
}

export function detectErrorBlocks(document: vscode.TextDocument): ErrorBlock[] {
  // Fast regex-based detection
  // Returns array of error block locations
}
```

#### 3.2 Folding Range Provider (`foldingProvider.ts`)

```typescript
export class GoErrorFoldingProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
  ): vscode.FoldingRange[] {
    // Return folding ranges for error blocks only
    // Uses FoldingRangeKind.Region for custom fold behavior
  }
}
```

#### 3.3 Decoration Manager (`decorationManager.ts`)

```typescript
export class DecorationManager {
  private collapsedDecoration: vscode.TextEditorDecorationType;
  
  // Apply decorations to show collapsed state
  // Use "after" decoration to show one-liner hint
  // Optionally make error blocks transparent
}
```

#### 3.4 Configuration (`config.ts`)

```typescript
interface ExtensionConfig {
  autoCollapseOnOpen: boolean;     // Auto-collapse when file opens
  autoCollapseOnSave: boolean;     // Re-collapse after save
  opacity: number;                  // Transparency level (0-1)
  showCollapsedHint: boolean;       // Show one-liner hint after collapse
  patterns: string[];               // Customizable error patterns
}
```

### Phase 4: Commands

| Command | Description |
|---------|-------------|
| `goErrorCollapse.collapseAll` | Collapse all error blocks in current file |
| `goErrorCollapse.expandAll` | Expand all collapsed error blocks |
| `goErrorCollapse.toggle` | Toggle collapse state |
| `goErrorCollapse.makeTransparent` | Make error blocks semi-transparent |
| `goErrorCollapse.resetTransparency` | Remove transparency |

---

## 📁 File Specifications

### `package.json`

```json
{
  "name": "go-error-collapse",
  "displayName": "Go Error Collapse",
  "description": "Collapse Go error handling blocks for better readability",
  "version": "1.0.0",
  "publisher": "your-publisher",
  "engines": { "vscode": "^1.74.0" },
  "categories": ["Programming Languages", "Other"],
  "keywords": ["go", "golang", "error", "readability", "folding"],
  "activationEvents": ["onLanguage:go"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "goErrorCollapse.collapseAll",
        "title": "Collapse All Error Blocks",
        "category": "Go Error Collapse"
      },
      {
        "command": "goErrorCollapse.expandAll",
        "title": "Expand All Error Blocks",
        "category": "Go Error Collapse"
      },
      {
        "command": "goErrorCollapse.toggle",
        "title": "Toggle Error Block Collapse",
        "category": "Go Error Collapse"
      },
      {
        "command": "goErrorCollapse.makeTransparent",
        "title": "Make Error Blocks Transparent",
        "category": "Go Error Collapse"
      }
    ],
    "configuration": {
      "title": "Go Error Collapse",
      "properties": {
        "goErrorCollapse.autoCollapseOnOpen": {
          "type": "boolean",
          "default": true,
          "description": "Automatically collapse error blocks when opening Go files"
        },
        "goErrorCollapse.autoCollapseOnSave": {
          "type": "boolean",
          "default": true,
          "description": "Re-collapse error blocks after saving"
        },
        "goErrorCollapse.errorOpacity": {
          "type": "number",
          "default": 0.5,
          "minimum": 0.1,
          "maximum": 1.0,
          "description": "Opacity for transparent error blocks"
        },
        "goErrorCollapse.showCollapsedHint": {
          "type": "boolean",
          "default": true,
          "description": "Show one-liner hint when collapsed"
        },
        "goErrorCollapse.errorPatterns": {
          "type": "array",
          "default": ["err", "error"],
          "description": "Variable names to recognize as error types"
        }
      }
    },
    "keybindings": [
      {
        "command": "goErrorCollapse.toggle",
        "key": "ctrl+shift+e",
        "mac": "cmd+shift+e",
        "when": "editorLangId == go"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "lint": "eslint src --ext ts"
  },
  "devDependencies": {
    "@types/vscode": "^1.74.0",
    "@types/node": "^18.x",
    "typescript": "^5.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0"
  }
}
```

---

## 🔄 Implementation Flow

### Startup Sequence

```
1. Extension activates on Go file open
   ↓
2. Register FoldingRangeProvider for 'go' language
   ↓
3. Register all commands
   ↓
4. If autoCollapseOnOpen enabled:
   - Detect error blocks
   - Execute fold command for each block
   ↓
5. Set up event listeners:
   - onDidChangeActiveTextEditor
   - onDidSaveTextDocument
   - onDidChangeConfiguration
```

### Collapse Flow

```
1. User triggers "Collapse All" command
   ↓
2. Detect all error blocks in document
   ↓
3. For each error block:
   - Calculate folding range (startLine to endLine-1)
   - Collect line numbers
   ↓
4. Execute vscode.commands.executeCommand('editor.fold', {
     selectionLines: [startLine1, startLine2, ...]
   })
   ↓
5. Apply decorations if configured
```

---

## ⚡ Performance Considerations

### Fast Detection Strategy

1. **Regex-only approach** - No external process calls (unlike reference extension)
2. **Incremental updates** - Only re-detect on document changes
3. **Debouncing** - Delay detection during rapid typing
4. **Caching** - Store detected blocks, invalidate on edit

```typescript
// Debounced detection
const detectDebounced = debounce((doc: vscode.TextDocument) => {
  const blocks = detectErrorBlocks(doc);
  cache.set(doc.uri.toString(), blocks);
}, 150);
```

### Memory Efficiency

- Dispose decorations properly on document close
- Use WeakMap for document-specific caches
- Clear state when extension deactivates

---

## 🎨 Visual Design Options

### Option A: Fold Only (Simplest)
- Just fold the error blocks
- No decorations
- Uses VS Code's native fold UI (`...`)

### Option B: Fold + Inline Summary
After folding, show:
```go
if err != nil { return err } ···
```

Using `after` decoration:
```typescript
const decoration = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: ' → return err',
    color: 'rgba(128, 128, 128, 0.7)',
    fontStyle: 'italic'
  }
});
```

### Option C: Transparency Mode
Don't fold, just make less visible:
```typescript
const transparentDecoration = vscode.window.createTextEditorDecorationType({
  opacity: '0.5'
});
```

---

## 📝 Implementation Checklist

### Phase 1: MVP (Minimum Viable Product)
- [ ] Create extension scaffold
- [ ] Implement regex-based error block detection
- [ ] Register FoldingRangeProvider
- [ ] Add "Collapse All" command using editor.fold
- [ ] Add "Expand All" command using editor.unfoldAll
- [ ] Test with basic Go files

### Phase 2: Auto Features
- [ ] Add autoCollapseOnOpen configuration
- [ ] Add onDidChangeActiveTextEditor listener
- [ ] Add onDidSaveTextDocument listener
- [ ] Implement debounced re-detection

### Phase 3: Enhanced UX
- [ ] Add transparency mode with decorations
- [ ] Add inline summary decorations
- [ ] Add keybinding for toggle
- [ ] Add status bar indicator

### Phase 4: Polish
- [ ] Handle edge cases (nested ifs, else blocks)
- [ ] Add comprehensive pattern matching
- [ ] Write unit tests
- [ ] Add README with examples
- [ ] Publish to VS Code Marketplace

---

## 🐛 Edge Cases to Handle

1. **Nested if blocks**
   ```go
   if err != nil {
       if anotherErr != nil {
           return anotherErr
       }
       return err
   }
   ```

2. **Multi-line return statements**
   ```go
   if err != nil {
       return fmt.Errorf(
           "failed to do something: %w",
           err,
       )
   }
   ```

3. **Error with logging**
   ```go
   if err != nil {
       log.Error("failed", "error", err)
       return err
   }
   ```

4. **Error with multiple statements**
   ```go
   if err != nil {
       cleanup()
       return err
   }
   ```
   → These should NOT be collapsed (not simple error returns)

5. **Else blocks**
   ```go
   if err != nil {
       return err
   } else {
       doSomething()
   }
   ```

---

## 🔧 Detection Algorithm (Detailed)

```typescript
function detectErrorBlocks(document: vscode.TextDocument): ErrorBlock[] {
  const text = document.getText();
  const lines = text.split('\n');
  const blocks: ErrorBlock[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Check for "if err != nil {" pattern
    if (/^\s*if\s+(err|\w+Err|e)\s*!=\s*nil\s*\{/.test(line)) {
      const startLine = i;
      const indentation = line.match(/^\s*/)?.[0] || '';
      
      // Look for closing brace at same indentation
      let braceCount = 1;
      let j = i + 1;
      let bodyLines: string[] = [];
      
      while (j < lines.length && braceCount > 0) {
        const currentLine = lines[j];
        braceCount += (currentLine.match(/\{/g) || []).length;
        braceCount -= (currentLine.match(/\}/g) || []).length;
        
        if (braceCount > 0) {
          bodyLines.push(currentLine);
        }
        j++;
      }
      
      const endLine = j - 1;
      
      // Validate: should be 1-2 line body with return/fatal/panic
      if (isSimpleErrorReturn(bodyLines)) {
        blocks.push({
          startLine,
          endLine,
          bodyStartLine: startLine + 1,
          indentation,
          collapsedText: generateCollapsedText(line, bodyLines),
          fullRange: new vscode.Range(startLine, 0, endLine, lines[endLine].length)
        });
      }
      
      i = j;
    } else {
      i++;
    }
  }
  
  return blocks;
}

function isSimpleErrorReturn(bodyLines: string[]): boolean {
  // Remove empty lines
  const nonEmpty = bodyLines.filter(l => l.trim().length > 0);
  
  // Should be exactly 1 statement line
  if (nonEmpty.length !== 1) return false;
  
  const stmt = nonEmpty[0].trim();
  
  // Must be return, log.Fatal, panic, etc.
  return /^(return\b|log\.(Fatal|Panic)|panic\()/.test(stmt);
}

function generateCollapsedText(ifLine: string, bodyLines: string[]): string {
  const stmt = bodyLines.find(l => l.trim())?.trim() || 'return err';
  return `if err != nil { ${stmt} }`;
}
```

---

## 📦 Dependencies

**Zero runtime dependencies** - Only VS Code API

**Dev dependencies:**
- TypeScript
- ESLint
- @types/vscode
- @types/node

---

## 🎯 Success Metrics

1. **Performance:** < 50ms to detect and fold in 1000-line file
2. **Accuracy:** > 99% correct detection of simple error blocks
3. **No Side Effects:** Zero impact on actual file content
4. **Memory:** < 10MB additional memory usage
5. **User Experience:** Instant toggle response

---

## 📚 References

1. [hide-error-cases extension](https://github.com/taqqanori/hide-error-cases) - Similar functionality
2. [VS Code Folding API](https://code.visualstudio.com/api/references/vscode-api#FoldingRangeProvider)
3. [VS Code Decoration API](https://code.visualstudio.com/api/references/vscode-api#TextEditorDecorationType)
4. [editor.fold command](https://code.visualstudio.com/api/references/commands) - Built-in folding command

---

## 🚀 Quick Start Implementation

To get started immediately, create these files in order:

1. `package.json` - Extension manifest
2. `tsconfig.json` - TypeScript configuration
3. `src/extension.ts` - Entry point with basic folding
4. `src/detector.ts` - Error block detection
5. `src/foldingProvider.ts` - Folding range provider

The MVP can be achieved with ~200-300 lines of TypeScript code.

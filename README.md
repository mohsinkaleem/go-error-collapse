# Go Error Collapse

A VS Code extension that improves Go code readability by visually collapsing verbose error handling blocks into single-line representations—without modifying your source code.

## The Problem

Go's idiomatic error handling pattern leads to verbose code:

```go
result, err := doSomething()
if err != nil {
    return err
}

data, err := doSomethingElse()
if err != nil {
    return nil, err
}

// ... your actual business logic is hidden among all this error handling
```

This pattern repeated throughout the codebase shadows the core business logic, making it harder to follow the main flow.

## The Solution

Go Error Collapse visually collapses these multi-line error blocks, letting you focus on the core logic:

```go
result, err := doSomething()
if err != nil { return err } ···

data, err := doSomethingElse()
if err != nil { return nil, err } ···

// Now your business logic is more visible!
```

## Features

- **🔍 Smart Detection**: Automatically detects common Go error handling patterns
- **📁 Visual Folding**: Collapses error blocks without modifying source code
- **⚡ Fast & Lightweight**: Pure TypeScript implementation with no external dependencies
- **🔄 Auto-Collapse**: Optionally collapse error blocks when opening files
- **👁️ Transparency Mode**: Make error blocks semi-transparent instead of folding
- **⌨️ Keyboard Shortcuts**: Quick toggle with `Cmd+Shift+E` (Mac) / `Ctrl+Shift+E` (Windows/Linux)

## Supported Patterns

The extension detects these common error handling patterns:

```go
// Simple error return
if err != nil {
    return err
}

// Multiple return values
if err != nil {
    return nil, err
}

// Wrapped errors
if err != nil {
    return fmt.Errorf("failed: %w", err)
}

// Error with context
if err != nil {
    return errors.Wrap(err, "context")
}

// Fatal/panic
if err != nil {
    log.Fatal(err)
}

if err != nil {
    panic(err)
}
```

## Commands

| Command | Description | Keyboard Shortcut |
|---------|-------------|-------------------|
| `Go Error Collapse: Collapse All Error Blocks` | Collapse all error blocks in the current file | |
| `Go Error Collapse: Expand All Error Blocks` | Expand all collapsed error blocks | |
| `Go Error Collapse: Toggle Error Block Collapse` | Toggle between collapsed and expanded | `Cmd/Ctrl+Shift+E` |
| `Go Error Collapse: Make Error Blocks Transparent` | Apply transparency to error blocks | |
| `Go Error Collapse: Reset Error Block Transparency` | Remove transparency from error blocks | |

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `goErrorCollapse.autoCollapseOnOpen` | boolean | `true` | Automatically collapse error blocks when opening Go files |
| `goErrorCollapse.autoCollapseOnSave` | boolean | `true` | Re-collapse error blocks after saving |
| `goErrorCollapse.errorOpacity` | number | `0.5` | Opacity for transparent error blocks (0.1-1.0) |
| `goErrorCollapse.showCollapsedHint` | boolean | `true` | Show one-liner hint when collapsed |
| `goErrorCollapse.errorPatterns` | array | `["err", "error"]` | Variable names to recognize as error types |

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Cmd/Ctrl+Shift+X`)
3. Search for "Go Error Collapse"
4. Click Install

### From VSIX

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions (`Cmd/Ctrl+Shift+X`)
4. Click the `...` menu and select "Install from VSIX..."
5. Select the downloaded file

### From Source

```bash
# Clone the repository
git clone https://github.com/your-username/go-error-collapse.git
cd go-error-collapse

# Install dependencies
npm install

# Compile
npm run compile

# Package (optional)
npx vsce package
```

## Usage

1. Open any Go file
2. Error blocks will automatically collapse (if `autoCollapseOnOpen` is enabled)
3. Use `Cmd/Ctrl+Shift+E` to toggle collapse state
4. Or use the Command Palette (`Cmd/Ctrl+Shift+P`) and search for "Go Error Collapse"

## How It Works

The extension uses:

1. **Regex-based detection** to find error handling patterns (fast, no external dependencies)
2. **VS Code's FoldingRangeProvider** to register custom folding regions
3. **editor.fold command** to programmatically fold detected blocks
4. **Text decorations** for transparency mode and collapsed hints

This approach ensures:
- ✅ No modification to your source code
- ✅ Fast performance (< 50ms for 1000-line files)
- ✅ No external process calls or dependencies
- ✅ Proper cleanup when files are closed

## Known Limitations

The extension intentionally **does not collapse** complex error blocks:

- Blocks with multiple statements:
  ```go
  if err != nil {
      cleanup()      // Multiple statements
      return err
  }
  ```

- Blocks with else clauses:
  ```go
  if err != nil {
      return err
  } else {
      doSomething()
  }
  ```

- Nested if blocks:
  ```go
  if err != nil {
      if anotherCondition {
          return err
      }
  }
  ```

These are excluded because they contain important logic that shouldn't be hidden.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Inspired by the [hide-error-cases](https://github.com/taqqanori/hide-error-cases) extension.

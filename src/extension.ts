import * as vscode from 'vscode';
import { registerFoldingProvider } from './foldingProvider';
import { getDetector, disposeDetector } from './detector';
import { getDecorationManager, disposeDecorationManager } from './decorationManager';
import { ConfigManager } from './config';
import { CollapseState } from './types';

// Track collapse state per document
const documentStates: Map<string, CollapseState> = new Map();

/**
 * Get or create collapse state for a document
 */
function getDocumentState(uri: string): CollapseState {
    let state = documentStates.get(uri);
    if (!state) {
        state = { isCollapsed: false, isTransparent: false };
        documentStates.set(uri, state);
    }
    return state;
}

/**
 * Collapse all error blocks in the active editor
 */
async function collapseAllErrorBlocks(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    
    if (document.languageId !== 'go') {
        vscode.window.showInformationMessage('Go Error Collapse: Not a Go file');
        return;
    }
    
    const detector = getDetector();
    const errorBlocks = detector.detectErrorBlocks(document);
    
    if (errorBlocks.length === 0) {
        vscode.window.showInformationMessage('Go Error Collapse: No error blocks found');
        return;
    }
    
    // Collect all start lines for folding
    const selectionLines = errorBlocks.map(block => block.startLine);
    
    // Execute fold command for all lines at once
    // We need to position the cursor and fold each region
    for (const startLine of selectionLines) {
        // Move cursor to the line
        const position = new vscode.Position(startLine, 0);
        editor.selection = new vscode.Selection(position, position);
        
        // Fold at cursor position
        await vscode.commands.executeCommand('editor.fold', {
            levels: 1,
            direction: 'down',
            selectionLines: [startLine]
        });
    }
    
    // Update state
    const state = getDocumentState(document.uri.toString());
    state.isCollapsed = true;
    
    // Apply collapsed hints if enabled
    const decorationManager = getDecorationManager();
    decorationManager.applyCollapsedHints(editor, errorBlocks);
    
    vscode.window.showInformationMessage(
        `Go Error Collapse: Collapsed ${errorBlocks.length} error block(s)`
    );
}

/**
 * Expand all error blocks in the active editor
 */
async function expandAllErrorBlocks(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    
    if (document.languageId !== 'go') {
        return;
    }
    
    const detector = getDetector();
    const errorBlocks = detector.detectErrorBlocks(document);
    
    // Unfold each error block
    for (const block of errorBlocks) {
        const position = new vscode.Position(block.startLine, 0);
        editor.selection = new vscode.Selection(position, position);
        
        await vscode.commands.executeCommand('editor.unfold', {
            levels: 1,
            direction: 'down',
            selectionLines: [block.startLine]
        });
    }
    
    // Update state
    const state = getDocumentState(document.uri.toString());
    state.isCollapsed = false;
    
    // Clear hints
    const decorationManager = getDecorationManager();
    decorationManager.clearHints(document.uri.toString());
    
    vscode.window.showInformationMessage('Go Error Collapse: Expanded all error blocks');
}

/**
 * Toggle collapse state for error blocks
 */
async function toggleErrorBlocks(editor: vscode.TextEditor): Promise<void> {
    const state = getDocumentState(editor.document.uri.toString());
    
    if (state.isCollapsed) {
        await expandAllErrorBlocks(editor);
    } else {
        await collapseAllErrorBlocks(editor);
    }
}

/**
 * Make error blocks transparent
 */
function makeTransparent(editor: vscode.TextEditor): void {
    const decorationManager = getDecorationManager();
    decorationManager.applyTransparency(editor);
    
    const state = getDocumentState(editor.document.uri.toString());
    state.isTransparent = true;
    
    vscode.window.showInformationMessage('Go Error Collapse: Error blocks made transparent');
}

/**
 * Reset error block transparency
 */
function resetTransparency(editor: vscode.TextEditor): void {
    const decorationManager = getDecorationManager();
    decorationManager.removeTransparency(editor);
    
    const state = getDocumentState(editor.document.uri.toString());
    state.isTransparent = false;
    
    vscode.window.showInformationMessage('Go Error Collapse: Transparency removed');
}

/**
 * Auto-collapse error blocks when opening a Go file
 */
async function autoCollapseOnOpen(editor: vscode.TextEditor): Promise<void> {
    if (!ConfigManager.autoCollapseOnOpen) {
        return;
    }
    
    if (editor.document.languageId !== 'go') {
        return;
    }
    
    // Small delay to ensure the document is fully loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await collapseAllErrorBlocks(editor);
}

/**
 * Re-collapse error blocks after save
 */
async function autoCollapseOnSave(document: vscode.TextDocument): Promise<void> {
    if (!ConfigManager.autoCollapseOnSave) {
        return;
    }
    
    if (document.languageId !== 'go') {
        return;
    }
    
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) {
        return;
    }
    
    const state = getDocumentState(document.uri.toString());
    
    // Only re-collapse if blocks were previously collapsed
    if (state.isCollapsed) {
        // Invalidate cache since document changed
        getDetector().invalidateCache(document);
        
        // Small delay after save
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await collapseAllErrorBlocks(editor);
    }
    
    // Re-apply transparency if active
    if (state.isTransparent) {
        getDecorationManager().applyTransparency(editor);
    }
}

/**
 * Handle configuration changes
 */
function onConfigurationChange(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'go') {
        return;
    }
    
    const state = getDocumentState(editor.document.uri.toString());
    
    // Re-apply transparency with new opacity if active
    if (state.isTransparent) {
        const decorationManager = getDecorationManager();
        decorationManager.removeTransparency(editor);
        decorationManager.applyTransparency(editor);
    }
}

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('Go Error Collapse extension is activating...');
    
    // Register folding provider
    registerFoldingProvider(context);
    
    // Register commands
    const collapseAllCommand = vscode.commands.registerCommand(
        'goErrorCollapse.collapseAll',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                collapseAllErrorBlocks(editor);
            }
        }
    );
    
    const expandAllCommand = vscode.commands.registerCommand(
        'goErrorCollapse.expandAll',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                expandAllErrorBlocks(editor);
            }
        }
    );
    
    const toggleCommand = vscode.commands.registerCommand(
        'goErrorCollapse.toggle',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                toggleErrorBlocks(editor);
            }
        }
    );
    
    const makeTransparentCommand = vscode.commands.registerCommand(
        'goErrorCollapse.makeTransparent',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                makeTransparent(editor);
            }
        }
    );
    
    const resetTransparencyCommand = vscode.commands.registerCommand(
        'goErrorCollapse.resetTransparency',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                resetTransparency(editor);
            }
        }
    );
    
    // Register event listeners
    const onDidOpenTextDocument = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            autoCollapseOnOpen(editor);
        }
    });
    
    const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(document => {
        autoCollapseOnSave(document);
    });
    
    const onConfigChange = ConfigManager.onConfigurationChange(onConfigurationChange);
    
    // Handle document close - clean up state
    const onDidCloseTextDocument = vscode.workspace.onDidCloseTextDocument(document => {
        const uri = document.uri.toString();
        documentStates.delete(uri);
        getDecorationManager().clearHints(uri);
        getDetector().invalidateCache(document);
    });
    
    // Add all disposables
    context.subscriptions.push(
        collapseAllCommand,
        expandAllCommand,
        toggleCommand,
        makeTransparentCommand,
        resetTransparencyCommand,
        onDidOpenTextDocument,
        onDidSaveTextDocument,
        onConfigChange,
        onDidCloseTextDocument
    );
    
    // Auto-collapse if a Go file is already open
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'go') {
        // Delay to ensure extension is fully loaded
        setTimeout(() => autoCollapseOnOpen(activeEditor), 500);
    }
    
    console.log('Go Error Collapse extension is now active!');
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    console.log('Go Error Collapse extension is deactivating...');
    
    // Clean up resources
    disposeDetector();
    disposeDecorationManager();
    documentStates.clear();
    
    console.log('Go Error Collapse extension deactivated');
}

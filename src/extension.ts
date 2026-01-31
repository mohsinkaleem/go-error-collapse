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
 * Core collapse logic without UI notifications (used internally)
 */
async function collapseAllErrorBlocksSilent(editor: vscode.TextEditor): Promise<number> {
    const document = editor.document;
    
    if (document.languageId !== 'go') {
        return 0;
    }
    
    const detector = getDetector();
    const errorBlocks = detector.detectErrorBlocks(document);
    
    if (errorBlocks.length === 0) {
        return 0;
    }
    
    // Save current selection and viewport position to restore later
    const originalSelection = editor.selection;
    const visibleRange = editor.visibleRanges[0];
    
    // Fold all error blocks
    for (const block of errorBlocks) {
        await vscode.commands.executeCommand('editor.fold', {
            levels: 1,
            direction: 'down',
            selectionLines: [block.startLine]
        });
    }
    
    // Restore original selection and viewport position
    editor.selection = originalSelection;
    if (visibleRange) {
        editor.revealRange(visibleRange, vscode.TextEditorRevealType.AtTop);
    }
    
    // Update state
    const state = getDocumentState(document.uri.toString());
    state.isCollapsed = true;
    
    // Apply collapsed hints if enabled
    getDecorationManager().applyCollapsedHints(editor, errorBlocks);
    
    return errorBlocks.length;
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
    
    // Disable fold highlighting for cleaner appearance (one-time setup)
    const editorConfig = vscode.workspace.getConfiguration('editor');
    if (editorConfig.get('foldingHighlight') !== false) {
        await editorConfig.update('foldingHighlight', false, vscode.ConfigurationTarget.Global);
    }
    
    const count = await collapseAllErrorBlocksSilent(editor);
    
    if (count === 0) {
        vscode.window.showInformationMessage('Go Error Collapse: No error blocks found');
    } else {
        vscode.window.showInformationMessage(
            `Go Error Collapse: Collapsed ${count} error block(s)`
        );
    }
}

/**
 * Core expand logic without UI notifications (used internally)
 */
async function expandAllErrorBlocksSilent(editor: vscode.TextEditor): Promise<number> {
    const document = editor.document;
    
    if (document.languageId !== 'go') {
        return 0;
    }
    
    const detector = getDetector();
    const errorBlocks = detector.detectErrorBlocks(document);
    
    if (errorBlocks.length === 0) {
        return 0;
    }
    
    // Save current selection and viewport position to restore later
    const originalSelection = editor.selection;
    const visibleRange = editor.visibleRanges[0];
    
    // Unfold all error blocks
    for (const block of errorBlocks) {
        await vscode.commands.executeCommand('editor.unfold', {
            levels: 1,
            direction: 'down',
            selectionLines: [block.startLine]
        });
    }
    
    // Restore original selection and viewport position
    editor.selection = originalSelection;
    if (visibleRange) {
        editor.revealRange(visibleRange, vscode.TextEditorRevealType.AtTop);
    }
    
    // Update state
    const state = getDocumentState(document.uri.toString());
    state.isCollapsed = false;
    
    // Clear hints
    getDecorationManager().clearHints(document.uri.toString());
    
    return errorBlocks.length;
}

/**
 * Expand all error blocks in the active editor
 */
async function expandAllErrorBlocks(editor: vscode.TextEditor): Promise<void> {
    if (editor.document.languageId !== 'go') {
        return;
    }
    
    const count = await expandAllErrorBlocksSilent(editor);
    
    if (count > 0) {
        vscode.window.showInformationMessage('Go Error Collapse: Expanded all error blocks');
    }
}

/**
 * Toggle collapse state for error blocks (silent toggle, show result)
 */
async function toggleErrorBlocks(editor: vscode.TextEditor): Promise<void> {
    if (editor.document.languageId !== 'go') {
        vscode.window.showInformationMessage('Go Error Collapse: Not a Go file');
        return;
    }
    
    const state = getDocumentState(editor.document.uri.toString());
    
    if (state.isCollapsed) {
        const count = await expandAllErrorBlocksSilent(editor);
        if (count > 0) {
            vscode.window.showInformationMessage(`Go Error Collapse: Expanded ${count} error block(s)`);
        }
    } else {
        // Ensure fold highlighting is disabled
        const editorConfig = vscode.workspace.getConfiguration('editor');
        if (editorConfig.get('foldingHighlight') !== false) {
            await editorConfig.update('foldingHighlight', false, vscode.ConfigurationTarget.Global);
        }
        
        const count = await collapseAllErrorBlocksSilent(editor);
        if (count === 0) {
            vscode.window.showInformationMessage('Go Error Collapse: No error blocks found');
        } else {
            vscode.window.showInformationMessage(`Go Error Collapse: Collapsed ${count} error block(s)`);
        }
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
 * Re-collapse error blocks after save (runs after go fmt completes)
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
    
    // Invalidate cache since document changed (go fmt may have reformatted)
    getDetector().invalidateCache(document);
    
    // Delay to ensure go fmt has completed (go fmt runs on save)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Re-collapse if blocks were previously collapsed
    if (state.isCollapsed) {
        await collapseAllErrorBlocksSilent(editor);
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
    const onActiveEditorChange = vscode.window.onDidChangeActiveTextEditor(editor => {
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
        onActiveEditorChange,
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

import * as vscode from 'vscode';
import { ErrorBlock } from './types';
import { ConfigManager } from './config';
import { getDetector } from './detector';

/**
 * Manages text decorations for error blocks
 * Handles transparency mode and collapsed hint decorations
 */
export class DecorationManager {
    private transparentDecoration: vscode.TextEditorDecorationType | null = null;
    private hintDecorations: Map<string, vscode.TextEditorDecorationType> = new Map();
    private isTransparencyActive: boolean = false;
    
    /**
     * Apply transparency to all error blocks in the active editor
     */
    public applyTransparency(editor: vscode.TextEditor): void {
        const document = editor.document;
        
        if (document.languageId !== 'go') {
            return;
        }
        
        // Create or update transparency decoration
        this.transparentDecoration = this.createTransparentDecoration();
        
        const detector = getDetector();
        const errorBlocks = detector.detectErrorBlocks(document);
        
        // Apply decoration to all error block ranges
        const ranges = errorBlocks.map(block => block.fullRange);
        editor.setDecorations(this.transparentDecoration, ranges);
        
        this.isTransparencyActive = true;
    }
    
    /**
     * Remove transparency from error blocks
     */
    public removeTransparency(editor: vscode.TextEditor): void {
        if (this.transparentDecoration) {
            editor.setDecorations(this.transparentDecoration, []);
            this.transparentDecoration.dispose();
            this.transparentDecoration = null;
        }
        this.isTransparencyActive = false;
    }
    
    /**
     * Toggle transparency mode
     */
    public toggleTransparency(editor: vscode.TextEditor): void {
        if (this.isTransparencyActive) {
            this.removeTransparency(editor);
        } else {
            this.applyTransparency(editor);
        }
    }
    
    /**
     * Apply inline hints after folding
     * Shows the collapsed text as a decoration after the folded line
     */
    public applyCollapsedHints(editor: vscode.TextEditor, blocks: ErrorBlock[]): void {
        if (!ConfigManager.showCollapsedHint) {
            return;
        }
        
        const document = editor.document;
        const uri = document.uri.toString();
        
        // Clear existing hints
        this.clearHints(uri);
        
        // Create decoration for each block
        for (const block of blocks) {
            const hintDecoration = vscode.window.createTextEditorDecorationType({
                after: {
                    contentText: ` → ${block.bodyStatement}`,
                    color: new vscode.ThemeColor('editorCodeLens.foreground'),
                    fontStyle: 'italic',
                    margin: '0 0 0 1em'
                }
            });
            
            // Apply to the start line (which remains visible after fold)
            const range = new vscode.Range(
                block.startLine, 
                document.lineAt(block.startLine).text.length,
                block.startLine,
                document.lineAt(block.startLine).text.length
            );
            
            editor.setDecorations(hintDecoration, [range]);
            this.hintDecorations.set(`${uri}:${block.startLine}`, hintDecoration);
        }
    }
    
    /**
     * Clear all hints for a document
     */
    public clearHints(uri: string): void {
        const toRemove: string[] = [];
        
        this.hintDecorations.forEach((decoration, key) => {
            if (key.startsWith(uri)) {
                decoration.dispose();
                toRemove.push(key);
            }
        });
        
        toRemove.forEach(key => this.hintDecorations.delete(key));
    }
    
    /**
     * Clear all decorations
     */
    public clearAll(editor?: vscode.TextEditor): void {
        if (editor) {
            this.removeTransparency(editor);
            this.clearHints(editor.document.uri.toString());
        }
        
        // Dispose all hint decorations
        this.hintDecorations.forEach(decoration => decoration.dispose());
        this.hintDecorations.clear();
    }
    
    /**
     * Check if transparency is currently active
     */
    public get isTransparent(): boolean {
        return this.isTransparencyActive;
    }
    
    /**
     * Create the transparent decoration type
     */
    private createTransparentDecoration(): vscode.TextEditorDecorationType {
        const opacity = ConfigManager.errorOpacity;
        
        return vscode.window.createTextEditorDecorationType({
            opacity: `${opacity}`,
            // Optional: add a subtle background color
            // backgroundColor: 'rgba(128, 128, 128, 0.1)',
        });
    }
    
    /**
     * Dispose all resources
     */
    public dispose(): void {
        if (this.transparentDecoration) {
            this.transparentDecoration.dispose();
        }
        
        this.hintDecorations.forEach(decoration => decoration.dispose());
        this.hintDecorations.clear();
    }
}

// Singleton instance
let decorationManagerInstance: DecorationManager | null = null;

/**
 * Get the shared decoration manager instance
 */
export function getDecorationManager(): DecorationManager {
    if (!decorationManagerInstance) {
        decorationManagerInstance = new DecorationManager();
    }
    return decorationManagerInstance;
}

/**
 * Dispose the shared decoration manager
 */
export function disposeDecorationManager(): void {
    if (decorationManagerInstance) {
        decorationManagerInstance.dispose();
        decorationManagerInstance = null;
    }
}

import * as vscode from 'vscode';
import { getDetector } from './detector';

/**
 * Folding range provider for Go error blocks
 * Registers custom folding regions for error handling patterns
 */
export class GoErrorFoldingProvider implements vscode.FoldingRangeProvider {
    
    /**
     * Provide folding ranges for the given document
     */
    public provideFoldingRanges(
        document: vscode.TextDocument,
        _context: vscode.FoldingContext,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        // Only process Go files
        if (document.languageId !== 'go') {
            return [];
        }
        
        const detector = getDetector();
        const errorBlocks = detector.detectErrorBlocks(document);
        
        // Convert error blocks to folding ranges
        // The fold will hide lines from startLine+1 to endLine (body + closing brace)
        // This leaves just "if err != nil {" visible with the fold indicator
        const foldingRanges: vscode.FoldingRange[] = errorBlocks.map(block => {
            return new vscode.FoldingRange(
                block.startLine,
                block.endLine,
                vscode.FoldingRangeKind.Region
            );
        });
        
        return foldingRanges;
    }
}

/**
 * Register the folding provider
 */
export function registerFoldingProvider(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new GoErrorFoldingProvider();
    
    const disposable = vscode.languages.registerFoldingRangeProvider(
        { language: 'go', scheme: 'file' },
        provider
    );
    
    context.subscriptions.push(disposable);
    
    return disposable;
}

import * as vscode from 'vscode';
import { ErrorBlock, DocumentCache } from './types';
import { ConfigManager } from './config';

/**
 * Error block detector using regex-based pattern matching
 * Optimized for performance with caching and debouncing
 */
export class ErrorBlockDetector {
    private cache: Map<string, DocumentCache> = new Map();
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private static readonly DEBOUNCE_DELAY = 150;
    private static readonly CACHE_TTL = 5000; // 5 seconds
    
    /**
     * Detect all error blocks in a document
     * Uses caching for performance
     */
    public detectErrorBlocks(document: vscode.TextDocument): ErrorBlock[] {
        const uri = document.uri.toString();
        const cached = this.cache.get(uri);
        
        // Return cached result if still valid
        if (cached && 
            cached.version === document.version &&
            Date.now() - cached.timestamp < ErrorBlockDetector.CACHE_TTL) {
            return cached.blocks;
        }
        
        // Perform detection
        const blocks = this.performDetection(document);
        
        // Update cache
        this.cache.set(uri, {
            version: document.version,
            blocks,
            timestamp: Date.now()
        });
        
        return blocks;
    }
    
    /**
     * Debounced detection for use during editing
     */
    public detectDebounced(
        document: vscode.TextDocument, 
        callback: (blocks: ErrorBlock[]) => void
    ): void {
        const uri = document.uri.toString();
        
        // Clear existing timer
        const existingTimer = this.debounceTimers.get(uri);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        
        // Set new timer
        const timer = setTimeout(() => {
            const blocks = this.detectErrorBlocks(document);
            callback(blocks);
            this.debounceTimers.delete(uri);
        }, ErrorBlockDetector.DEBOUNCE_DELAY);
        
        this.debounceTimers.set(uri, timer);
    }
    
    /**
     * Clear cache for a specific document
     */
    public invalidateCache(document: vscode.TextDocument): void {
        this.cache.delete(document.uri.toString());
    }
    
    /**
     * Clear all caches
     */
    public clearAllCaches(): void {
        this.cache.clear();
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }
    
    /**
     * Perform the actual detection logic
     */
    private performDetection(document: vscode.TextDocument): ErrorBlock[] {
        const text = document.getText();
        const lines = text.split('\n');
        const blocks: ErrorBlock[] = [];
        
        // Build error variable pattern from config
        const errorVarPattern = ConfigManager.getErrorVariablePattern();
        const ifErrPattern = new RegExp(
            `^(\\s*)if\\s+${errorVarPattern}\\s*!=\\s*nil\\s*\\{\\s*$`
        );
        
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            const match = line.match(ifErrPattern);
            
            if (match) {
                const startLine = i;
                const indentation = match[1] || '';
                
                // Find the closing brace
                const result = this.findBlockEnd(lines, i, indentation);
                
                if (result) {
                    const { endLine, bodyLines, bodyStartLine } = result;
                    
                    // Validate this is a simple error return
                    if (this.isSimpleErrorReturn(bodyLines)) {
                        const bodyStatement = this.extractBodyStatement(bodyLines);
                        const collapsedText = this.generateCollapsedText(line, bodyStatement);
                        
                        blocks.push({
                            startLine,
                            endLine,
                            bodyStartLine,
                            indentation,
                            collapsedText,
                            bodyStatement,
                            fullRange: new vscode.Range(
                                startLine, 0,
                                endLine, lines[endLine].length
                            )
                        });
                    }
                    
                    i = endLine + 1;
                    continue;
                }
            }
            
            i++;
        }
        
        return blocks;
    }
    
    /**
     * Find the end of an error block
     */
    private findBlockEnd(
        lines: string[], 
        startIndex: number, 
        expectedIndentation: string
    ): { endLine: number; bodyLines: string[]; bodyStartLine: number } | null {
        let braceCount = 1;
        let j = startIndex + 1;
        const bodyLines: string[] = [];
        const bodyStartLine = j;
        
        while (j < lines.length && braceCount > 0) {
            const currentLine = lines[j];
            
            // Count braces
            const openBraces = (currentLine.match(/\{/g) || []).length;
            const closeBraces = (currentLine.match(/\}/g) || []).length;
            braceCount += openBraces - closeBraces;
            
            if (braceCount > 0) {
                bodyLines.push(currentLine);
            } else {
                // Check if closing brace is at expected indentation
                const closingMatch = currentLine.match(/^(\s*)\}/);
                if (closingMatch && closingMatch[1] === expectedIndentation) {
                    // Check for else block - skip these
                    if (/\}\s*else\s*\{/.test(currentLine) || 
                        (j + 1 < lines.length && /^\s*else\s*\{/.test(lines[j + 1]))) {
                        return null; // Skip blocks with else
                    }
                    return { endLine: j, bodyLines, bodyStartLine };
                }
            }
            
            j++;
        }
        
        return null;
    }
    
    /**
     * Check if the body is a simple error handling block
     * Allows: single statements, or print/log + return combinations
     */
    private isSimpleErrorReturn(bodyLines: string[]): boolean {
        // Filter out empty lines and comment-only lines
        const nonEmpty = bodyLines.filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('//');
        });
        
        // Must have at least one statement
        if (nonEmpty.length === 0) {
            return false;
        }
        
        // Allow blocks with up to 3 non-empty lines (typical: log/print + return)
        if (nonEmpty.length > 3) {
            return false;
        }
        
        // Join lines to handle multi-line statements
        const fullBody = nonEmpty.join(' ').trim();
        
        // Check each line for valid error handling patterns
        const validLinePatterns = [
            /^return\b/i,                              // return statements
            /^log\.(Fatal|Panic|Error|Warn|Info|Print)/i,  // log.Fatal, log.Panic, log.Printf, etc.
            /^fmt\.(Print|Errorf|Fprint|Sprint)/i,     // fmt.Printf, fmt.Errorf, etc.
            /^panic\s*\(/i,                            // panic(err)
            /^\w+\.(Fatal|Error|Warn|Info|Debug|Print)/i, // custom logger calls
            /^(os\.Exit|syscall\.Exit)/i,             // exit calls
        ];
        
        // Check if each non-empty line matches a valid pattern
        for (const line of nonEmpty) {
            const trimmed = line.trim();
            let isValid = false;
            
            for (const pattern of validLinePatterns) {
                if (pattern.test(trimmed)) {
                    isValid = true;
                    break;
                }
            }
            
            if (!isValid) {
                return false;
            }
        }
        
        // Ensure there's at most one return statement
        const returnCount = nonEmpty.filter(l => /^\s*return\b/.test(l)).length;
        if (returnCount > 1) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Extract the body statement for display
     */
    private extractBodyStatement(bodyLines: string[]): string {
        const nonEmpty = bodyLines.filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('//');
        });
        
        if (nonEmpty.length === 0) {
            return 'return err';
        }
        
        // For single line, just return it trimmed
        if (nonEmpty.length === 1) {
            return nonEmpty[0].trim();
        }
        
        // For multi-line, join with spaces and normalize
        return nonEmpty
            .map(l => l.trim())
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Generate the collapsed text representation
     */
    private generateCollapsedText(ifLine: string, bodyStatement: string): string {
        // Extract the condition from the if line
        const condMatch = ifLine.match(/if\s+(.+?)\s*\{/);
        const condition = condMatch ? condMatch[1] : 'err != nil';
        
        // Truncate body if too long
        const maxBodyLength = 50;
        let displayBody = bodyStatement;
        if (displayBody.length > maxBodyLength) {
            displayBody = displayBody.substring(0, maxBodyLength) + '...';
        }
        
        return `if ${condition} { ${displayBody} }`;
    }
    
    /**
     * Dispose resources
     */
    public dispose(): void {
        this.clearAllCaches();
    }
}

// Singleton instance for shared use
let detectorInstance: ErrorBlockDetector | null = null;

/**
 * Get the shared detector instance
 */
export function getDetector(): ErrorBlockDetector {
    if (!detectorInstance) {
        detectorInstance = new ErrorBlockDetector();
    }
    return detectorInstance;
}

/**
 * Dispose the shared detector instance
 */
export function disposeDetector(): void {
    if (detectorInstance) {
        detectorInstance.dispose();
        detectorInstance = null;
    }
}

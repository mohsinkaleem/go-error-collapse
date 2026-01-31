import * as vscode from 'vscode';

/**
 * Represents a detected error handling block in Go code
 */
export interface ErrorBlock {
    /** Line number of "if err != nil {" (0-indexed) */
    startLine: number;
    
    /** Line number of closing "}" (0-indexed) */
    endLine: number;
    
    /** Line number of the return/fatal statement (0-indexed) */
    bodyStartLine: number;
    
    /** Original indentation of the if statement */
    indentation: string;
    
    /** One-liner representation for display */
    collapsedText: string;
    
    /** The full range of the error block */
    fullRange: vscode.Range;
    
    /** The body statement (return, panic, etc.) */
    bodyStatement: string;
}

/**
 * Extension configuration options
 */
export interface ExtensionConfig {
    /** Automatically collapse error blocks when opening Go files */
    autoCollapseOnOpen: boolean;
    
    /** Re-collapse error blocks after saving */
    autoCollapseOnSave: boolean;
    
    /** Opacity level for transparent error blocks (0.1-1.0) */
    errorOpacity: number;
    
    /** Show one-liner hint when collapsed */
    showCollapsedHint: boolean;
    
    /** Variable names to recognize as error types */
    errorPatterns: string[];
}

/**
 * Cache entry for detected error blocks per document
 */
export interface DocumentCache {
    /** Document version when cache was created */
    version: number;
    
    /** Detected error blocks */
    blocks: ErrorBlock[];
    
    /** Timestamp of cache creation */
    timestamp: number;
}

/**
 * Collapse state for tracking folded blocks
 */
export interface CollapseState {
    /** Whether blocks are currently collapsed */
    isCollapsed: boolean;
    
    /** Whether transparency mode is active */
    isTransparent: boolean;
}

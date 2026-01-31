import * as vscode from 'vscode';
import { ExtensionConfig } from './types';

/**
 * Configuration manager for the Go Error Collapse extension
 */
export class ConfigManager {
    private static readonly CONFIG_SECTION = 'goErrorCollapse';
    
    /**
     * Get the current extension configuration
     */
    public static getConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
        
        return {
            autoCollapseOnOpen: config.get<boolean>('autoCollapseOnOpen', true),
            autoCollapseOnSave: config.get<boolean>('autoCollapseOnSave', true),
            errorOpacity: config.get<number>('errorOpacity', 0.5),
            showCollapsedHint: config.get<boolean>('showCollapsedHint', true),
            errorPatterns: config.get<string[]>('errorPatterns', ['err', 'error']),
        };
    }
    
    /**
     * Check if auto-collapse on open is enabled
     */
    public static get autoCollapseOnOpen(): boolean {
        return this.getConfig().autoCollapseOnOpen;
    }
    
    /**
     * Check if auto-collapse on save is enabled
     */
    public static get autoCollapseOnSave(): boolean {
        return this.getConfig().autoCollapseOnSave;
    }
    
    /**
     * Get the error block opacity setting
     */
    public static get errorOpacity(): number {
        return this.getConfig().errorOpacity;
    }
    
    /**
     * Check if collapsed hint should be shown
     */
    public static get showCollapsedHint(): boolean {
        return this.getConfig().showCollapsedHint;
    }
    
    /**
     * Get the error variable patterns
     */
    public static get errorPatterns(): string[] {
        return this.getConfig().errorPatterns;
    }
    
    /**
     * Build regex pattern for error variable names
     */
    public static getErrorVariablePattern(): string {
        const patterns = this.errorPatterns;
        // Create pattern that matches err, error, someErr, someError, etc.
        const patternParts = patterns.map(p => `\\w*${p}\\w*`);
        return `(${patternParts.join('|')})`;
    }
    
    /**
     * Register configuration change listener
     */
    public static onConfigurationChange(callback: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(ConfigManager.CONFIG_SECTION)) {
                callback();
            }
        });
    }
}

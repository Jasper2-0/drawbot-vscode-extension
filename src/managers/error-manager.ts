import * as vscode from 'vscode';
import { ErrorSeverity, ErrorCategory, ExtensionError } from '../types/api';

/**
 * Centralized error handling and logging manager
 */
export class ErrorManager {
    private errorLog: ExtensionError[] = [];
    private fallbackStrategies = new Map<ErrorCategory, (error: ExtensionError) => void>();
    private maxLogSize = 1000;

    constructor() {
        this.setupFallbackStrategies();
    }

    /**
     * Handle an error with appropriate severity and category
     */
    handleError(error: Error, severity: ErrorSeverity, category: ErrorCategory, context?: string): void {
        const extensionError: ExtensionError = {
            severity,
            category,
            message: error.message,
            details: error.stack,
            timestamp: Date.now(),
            context: context || this.getCurrentContext(),
            stack: error.stack
        };

        // Add to error log
        this.addToErrorLog(extensionError);

        // Execute fallback strategy
        const fallback = this.fallbackStrategies.get(category);
        if (fallback) {
            try {
                fallback(extensionError);
            } catch (fallbackError) {
                console.error('Fallback strategy failed:', fallbackError);
            }
        }

        // Report to VS Code
        this.reportToVSCode(extensionError);

        // Log to console
        this.logToConsole(extensionError);
    }

    /**
     * Setup fallback strategies for different error categories
     */
    private setupFallbackStrategies(): void {
        this.fallbackStrategies.set(ErrorCategory.NETWORK, (error) => {
            console.log('Network error detected, enabling offline mode');
            // Could trigger offline mode or retry logic
        });

        this.fallbackStrategies.set(ErrorCategory.SERVER, (error) => {
            console.log('Server error detected, attempting recovery');
            // Could trigger server restart or fallback mode
        });

        this.fallbackStrategies.set(ErrorCategory.SECURITY, (error) => {
            console.log('Security violation detected, blocking operation');
            vscode.window.showErrorMessage(
                `Security issue detected: ${error.message}`,
                'Review Security Settings'
            ).then(selection => {
                if (selection === 'Review Security Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'drawbot.security');
                }
            });
        });

        this.fallbackStrategies.set(ErrorCategory.PERFORMANCE, (error) => {
            console.log('Performance issue detected, triggering cleanup');
            // Could trigger memory cleanup or resource optimization
        });

        this.fallbackStrategies.set(ErrorCategory.USER, (error) => {
            // User errors typically don't need automatic fallback
            console.log('User error:', error.message);
        });

        this.fallbackStrategies.set(ErrorCategory.EXTENSION, (error) => {
            console.log('Extension error detected, logging for debugging');
            // Extension errors are typically logged for debugging
        });
    }

    /**
     * Add error to the internal log with size management
     */
    private addToErrorLog(error: ExtensionError): void {
        this.errorLog.push(error);

        // Maintain log size limit
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }
    }

    /**
     * Report error to VS Code UI based on severity
     */
    private reportToVSCode(error: ExtensionError): void {
        const message = this.formatErrorMessage(error);

        switch (error.severity) {
            case ErrorSeverity.FATAL:
                vscode.window.showErrorMessage(message, 'View Details').then(selection => {
                    if (selection === 'View Details') {
                        this.showErrorDetails(error);
                    }
                });
                break;

            case ErrorSeverity.WARNING:
                vscode.window.showWarningMessage(message);
                break;

            case ErrorSeverity.INFO:
                vscode.window.showInformationMessage(message);
                break;
        }
    }

    /**
     * Log error to console with appropriate level
     */
    private logToConsole(error: ExtensionError): void {
        const logMessage = `[${error.category}:${error.severity}] ${error.message}`;

        switch (error.severity) {
            case ErrorSeverity.FATAL:
                console.error(logMessage, error.details);
                break;
            case ErrorSeverity.WARNING:
                console.warn(logMessage, error.details);
                break;
            case ErrorSeverity.INFO:
                console.info(logMessage, error.details);
                break;
        }
    }

    /**
     * Format error message for display
     */
    private formatErrorMessage(error: ExtensionError): string {
        const prefix = this.getCategoryPrefix(error.category);
        return `${prefix}${error.message}`;
    }

    /**
     * Get display prefix for error category
     */
    private getCategoryPrefix(category: ErrorCategory): string {
        switch (category) {
            case ErrorCategory.NETWORK:
                return 'Network: ';
            case ErrorCategory.SERVER:
                return 'Server: ';
            case ErrorCategory.SECURITY:
                return 'Security: ';
            case ErrorCategory.PERFORMANCE:
                return 'Performance: ';
            case ErrorCategory.USER:
                return '';
            case ErrorCategory.EXTENSION:
                return 'Extension: ';
            default:
                return '';
        }
    }

    /**
     * Show detailed error information
     */
    private async showErrorDetails(error: ExtensionError): Promise<void> {
        const details = [
            `Category: ${error.category}`,
            `Severity: ${error.severity}`,
            `Time: ${new Date(error.timestamp).toLocaleString()}`,
            `Context: ${error.context || 'Unknown'}`,
            '',
            'Message:',
            error.message,
            '',
            'Stack Trace:',
            error.stack || 'Not available'
        ].join('\n');

        const document = await vscode.workspace.openTextDocument({
            content: details,
            language: 'plaintext'
        });

        await vscode.window.showTextDocument(document);
    }

    /**
     * Get current execution context for error reporting
     */
    private getCurrentContext(): string {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                return `File: ${activeEditor.document.fileName}`;
            }
            return 'VS Code Extension';
        } catch {
            return 'Unknown';
        }
    }

    /**
     * Get recent errors
     */
    getRecentErrors(count = 10): ExtensionError[] {
        return this.errorLog.slice(-count);
    }

    /**
     * Get errors by category
     */
    getErrorsByCategory(category: ErrorCategory): ExtensionError[] {
        return this.errorLog.filter(error => error.category === category);
    }

    /**
     * Get errors by severity
     */
    getErrorsBySeverity(severity: ErrorSeverity): ExtensionError[] {
        return this.errorLog.filter(error => error.severity === severity);
    }

    /**
     * Clear error log
     */
    clearErrorLog(): void {
        this.errorLog = [];
    }

    /**
     * Get error statistics
     */
    getErrorStats(): { [key: string]: number } {
        const stats: { [key: string]: number } = {};
        
        // Count by category
        for (const category of Object.values(ErrorCategory)) {
            stats[`${category}_count`] = this.getErrorsByCategory(category).length;
        }

        // Count by severity
        for (const severity of Object.values(ErrorSeverity)) {
            stats[`${severity}_count`] = this.getErrorsBySeverity(severity).length;
        }

        stats.total_count = this.errorLog.length;
        
        return stats;
    }

    /**
     * Export error log for debugging
     */
    exportErrorLog(): string {
        return JSON.stringify({
            timestamp: Date.now(),
            errors: this.errorLog,
            stats: this.getErrorStats()
        }, null, 2);
    }
}
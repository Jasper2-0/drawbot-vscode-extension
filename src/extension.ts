import * as vscode from 'vscode';
import { DrawBotExtensionManager } from './managers/extension-manager';
import { ErrorManager } from './managers/error-manager';
import { FeatureManager } from './managers/feature-manager';
import { PerformanceMonitor } from './performance/performance-monitor';
import { ExtensionSecurityManager } from './security/extension-security';
import { FeatureLevel, ErrorSeverity, ErrorCategory } from './types/api';

let extensionManager: DrawBotExtensionManager;
let errorManager: ErrorManager;
let featureManager: FeatureManager;
let performanceMonitor: PerformanceMonitor;
let securityManager: ExtensionSecurityManager;

/**
 * Main extension activation function
 * Called when VS Code activates the extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        console.log('DrawBot Sketchbook extension is activating...');

        // Initialize core managers
        errorManager = new ErrorManager();
        securityManager = new ExtensionSecurityManager();
        featureManager = new FeatureManager();
        performanceMonitor = new PerformanceMonitor();

        // Detect platform and feature capabilities
        const featureLevel = await featureManager.detectFeatureLevel();
        
        // Handle platform-specific initialization
        if (featureLevel === FeatureLevel.SYNTAX_HIGHLIGHTING) {
            await initializeLimitedMode(context);
            return;
        }

        // Initialize full extension manager
        extensionManager = new DrawBotExtensionManager(
            context,
            errorManager,
            featureManager,
            performanceMonitor,
            securityManager
        );

        // Activate all components
        await extensionManager.activate();

        // Start performance monitoring
        performanceMonitor.startMonitoring();

        // Register extension for disposal
        context.subscriptions.push(
            vscode.Disposable.from({
                dispose: () => {
                    performanceMonitor.stopMonitoring();
                    extensionManager?.dispose();
                }
            })
        );

        console.log('DrawBot Sketchbook extension activated successfully');

    } catch (error) {
        const extensionError = error as Error;
        
        if (errorManager) {
            errorManager.handleError(
                extensionError,
                ErrorSeverity.FATAL,
                ErrorCategory.EXTENSION
            );
        }

        vscode.window.showErrorMessage(
            `Failed to activate DrawBot Sketchbook extension: ${extensionError.message}`
        );
        
        console.error('Extension activation failed:', extensionError);
    }
}

/**
 * Initialize limited mode for non-macOS platforms
 */
async function initializeLimitedMode(context: vscode.ExtensionContext): Promise<void> {
    console.log('Initializing DrawBot extension in limited mode (syntax highlighting only)');
    
    // Show platform limitation warning
    const platform = process.platform;
    const platformName = platform === 'win32' ? 'Windows' : 'Linux';
    
    vscode.window.showWarningMessage(
        `DrawBot requires macOS for full functionality. On ${platformName}, only syntax highlighting is available.`,
        'Learn More'
    ).then(selection => {
        if (selection === 'Learn More') {
            vscode.env.openExternal(
                vscode.Uri.parse('https://github.com/Jasper2-0/drawbot-vscode-extension#platform-compatibility')
            );
        }
    });

    // Register limited commands
    const commands = [
        vscode.commands.registerCommand('drawbot.showPlatformInfo', () => {
            vscode.window.showInformationMessage(
                `DrawBot extension is running in limited mode on ${platformName}. Full preview and execution features require macOS.`
            );
        })
    ];

    context.subscriptions.push(...commands);
}

/**
 * Extension deactivation function
 * Called when VS Code deactivates the extension
 */
export function deactivate(): void {
    console.log('DrawBot Sketchbook extension is deactivating...');
    
    try {
        // Stop performance monitoring
        performanceMonitor?.stopMonitoring();
        
        // Dispose extension manager
        extensionManager?.dispose();
        
        console.log('DrawBot Sketchbook extension deactivated successfully');
    } catch (error) {
        console.error('Error during extension deactivation:', error);
    }
}

/**
 * Get the current extension manager instance
 * Used for testing and debugging
 */
export function getExtensionManager(): DrawBotExtensionManager | undefined {
    return extensionManager;
}

/**
 * Get the current error manager instance
 * Used for testing and debugging
 */
export function getErrorManager(): ErrorManager | undefined {
    return errorManager;
}

/**
 * Get the current feature manager instance
 * Used for testing and debugging
 */
export function getFeatureManager(): FeatureManager | undefined {
    return featureManager;
}
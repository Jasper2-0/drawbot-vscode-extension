import * as vscode from 'vscode';
import { ErrorManager } from './error-manager';
import { FeatureManager } from './feature-manager';
import { ServerManager } from './server-manager';
import { PerformanceMonitor } from '../performance/performance-monitor';
import { ExtensionSecurityManager } from '../security/extension-security';
import { SketchExplorerProvider } from '../providers/sketch-explorer-provider';
import { DrawBotPreviewProvider } from '../providers/preview-provider';
import { StatusBarManager } from './status-bar-manager';
import { CommandManager } from './command-manager';
import { ConfigurationManager } from './configuration-manager';
import { ExtensionConfig } from '../types/api';

/**
 * Main extension manager that coordinates all components
 */
export class DrawBotExtensionManager {
    private serverManager: ServerManager;
    private statusBarManager: StatusBarManager;
    private commandManager: CommandManager;
    private configurationManager: ConfigurationManager;
    private sketchExplorerProvider: SketchExplorerProvider;
    private previewProvider: DrawBotPreviewProvider;
    private isActivated = false;

    constructor(
        private context: vscode.ExtensionContext,
        private errorManager: ErrorManager,
        private featureManager: FeatureManager,
        private performanceMonitor: PerformanceMonitor,
        private securityManager: ExtensionSecurityManager
    ) {
        this.initializeManagers();
    }

    /**
     * Initialize all manager instances
     */
    private initializeManagers(): void {
        // Configuration manager (initialize first)
        this.configurationManager = new ConfigurationManager();
        const config = this.configurationManager.getConfiguration();

        // Server manager
        this.serverManager = new ServerManager(
            config,
            this.errorManager,
            this.performanceMonitor
        );

        // Status bar manager
        this.statusBarManager = new StatusBarManager();

        // Command manager
        this.commandManager = new CommandManager(
            this.serverManager,
            this.errorManager,
            this.securityManager
        );

        // Tree view providers
        this.sketchExplorerProvider = new SketchExplorerProvider(
            this.serverManager,
            this.securityManager
        );

        // Preview provider
        this.previewProvider = new DrawBotPreviewProvider(
            this.context,
            this.serverManager,
            this.securityManager,
            this.performanceMonitor
        );
    }

    /**
     * Activate all extension components
     */
    async activate(): Promise<void> {
        if (this.isActivated) {
            return;
        }

        try {
            console.log('Activating DrawBot extension components...');

            // Register tree view providers
            this.registerTreeViewProviders();

            // Register custom editor provider
            this.registerCustomEditorProvider();

            // Register commands
            await this.commandManager.registerCommands(this.context);

            // Initialize status bar
            this.statusBarManager.initialize();

            // Setup configuration change listeners
            this.setupConfigurationListeners();

            // Start server if auto-start is enabled
            if (this.configurationManager.getConfiguration().autoStartServer) {
                await this.serverManager.startServer();
            }

            this.isActivated = true;
            console.log('DrawBot extension components activated successfully');

        } catch (error) {
            this.errorManager.handleError(
                error as Error,
                'fatal' as any,
                'extension' as any
            );
            throw error;
        }
    }

    /**
     * Register tree view providers
     */
    private registerTreeViewProviders(): void {
        // Sketches tree view
        const sketchesTreeView = vscode.window.createTreeView('drawbot-sketches', {
            treeDataProvider: this.sketchExplorerProvider,
            showCollapseAll: true
        });

        this.context.subscriptions.push(sketchesTreeView);

        // Setup tree view event handlers
        sketchesTreeView.onDidChangeSelection((event) => {
            if (event.selection.length > 0) {
                const selectedItem = event.selection[0];
                this.handleSketchSelection(selectedItem);
            }
        });
    }

    /**
     * Register custom editor provider for previews
     */
    private registerCustomEditorProvider(): void {
        const provider = vscode.window.registerCustomEditorProvider(
            'drawbot.preview',
            this.previewProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: false // Important for memory management
                },
                supportsMultipleEditorsPerDocument: false
            }
        );

        this.context.subscriptions.push(provider);
    }

    /**
     * Setup configuration change listeners
     */
    private setupConfigurationListeners(): void {
        const configChangeHandler = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('drawbot')) {
                this.handleConfigurationChange();
            }
        });

        this.context.subscriptions.push(configChangeHandler);
    }

    /**
     * Handle configuration changes
     */
    private async handleConfigurationChange(): Promise<void> {
        console.log('DrawBot configuration changed, updating...');
        
        const newConfig = this.configurationManager.getConfiguration();
        
        // Update server configuration if needed
        if (this.serverManager.needsRestart(newConfig)) {
            await this.serverManager.restart(newConfig);
        }

        // Update status bar
        this.statusBarManager.updateConfiguration(newConfig);
    }

    /**
     * Handle sketch selection in tree view
     */
    private async handleSketchSelection(item: any): Promise<void> {
        if (item.type === 'sketch') {
            try {
                // Open sketch file in editor
                const document = await vscode.workspace.openTextDocument(item.path);
                await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

                // Optionally open preview
                if (this.configurationManager.getConfiguration().autoOpenPreview) {
                    await vscode.commands.executeCommand('drawbot.openPreview', item.path);
                }
            } catch (error) {
                this.errorManager.handleError(
                    error as Error,
                    'warning' as any,
                    'extension' as any
                );
            }
        }
    }

    /**
     * Get server manager instance
     */
    getServerManager(): ServerManager {
        return this.serverManager;
    }

    /**
     * Get status bar manager instance
     */
    getStatusBarManager(): StatusBarManager {
        return this.statusBarManager;
    }

    /**
     * Get configuration manager instance
     */
    getConfigurationManager(): ConfigurationManager {
        return this.configurationManager;
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        console.log('Disposing DrawBot extension manager...');

        try {
            // Stop server
            this.serverManager?.dispose();

            // Dispose status bar
            this.statusBarManager?.dispose();

            // Dispose command manager
            this.commandManager?.dispose();

            // Dispose providers
            this.sketchExplorerProvider?.dispose?.();
            this.previewProvider?.dispose?.();

            this.isActivated = false;
            console.log('DrawBot extension manager disposed successfully');

        } catch (error) {
            console.error('Error disposing extension manager:', error);
        }
    }
}
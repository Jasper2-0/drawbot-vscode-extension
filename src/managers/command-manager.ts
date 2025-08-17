import * as vscode from 'vscode';
import { ServerManager } from './server-manager';
import { ErrorManager } from './error-manager';
import { ExtensionSecurityManager } from '../security/extension-security';

/**
 * Manages VS Code command registration and execution
 */
export class CommandManager {
    constructor(
        private serverManager: ServerManager,
        private errorManager: ErrorManager,
        private securityManager: ExtensionSecurityManager
    ) {}

    async registerCommands(context: vscode.ExtensionContext): Promise<void> {
        const commands = [
            vscode.commands.registerCommand('drawbot.startServer', () => this.startServer()),
            vscode.commands.registerCommand('drawbot.stopServer', () => this.stopServer()),
            vscode.commands.registerCommand('drawbot.executeSketch', (uri) => this.executeSketch(uri)),
            vscode.commands.registerCommand('drawbot.openPreview', (uri) => this.openPreview(uri)),
            vscode.commands.registerCommand('drawbot.refreshSketches', () => this.refreshSketches()),
            vscode.commands.registerCommand('drawbot.createFromTemplate', () => this.createFromTemplate())
        ];

        context.subscriptions.push(...commands);
    }

    private async startServer(): Promise<void> {
        try {
            await this.serverManager.startServer();
            vscode.window.showInformationMessage('DrawBot server started successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start server: ${(error as Error).message}`);
        }
    }

    private async stopServer(): Promise<void> {
        try {
            await this.serverManager.stopServer();
            vscode.window.showInformationMessage('DrawBot server stopped');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to stop server: ${(error as Error).message}`);
        }
    }

    private async executeSketch(uri?: vscode.Uri): Promise<void> {
        // TODO: Implement sketch execution
        vscode.window.showInformationMessage('Execute sketch functionality coming soon');
    }

    private async openPreview(uri?: vscode.Uri): Promise<void> {
        // TODO: Implement preview opening
        vscode.window.showInformationMessage('Preview functionality coming soon');
    }

    private async refreshSketches(): Promise<void> {
        // TODO: Implement sketch refresh
        vscode.window.showInformationMessage('Refresh functionality coming soon');
    }

    private async createFromTemplate(): Promise<void> {
        // TODO: Implement template creation
        vscode.window.showInformationMessage('Template creation functionality coming soon');
    }

    dispose(): void {
        // Commands are automatically disposed by VS Code
    }
}
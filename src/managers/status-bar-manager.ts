import * as vscode from 'vscode';
import { ExtensionConfig } from '../types/api';

/**
 * Manages status bar items for the extension
 */
export class StatusBarManager {
    private serverStatusItem: vscode.StatusBarItem;
    private executionStatusItem: vscode.StatusBarItem;

    initialize(): void {
        this.serverStatusItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left, 100
        );
        this.executionStatusItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left, 99
        );

        this.updateServerStatus(false);
        this.serverStatusItem.show();
    }

    updateServerStatus(isRunning: boolean): void {
        if (this.serverStatusItem) {
            this.serverStatusItem.text = isRunning 
                ? "$(check) DrawBot Server" 
                : "$(x) DrawBot Server";
            this.serverStatusItem.color = isRunning ? undefined : "yellow";
            this.serverStatusItem.command = "drawbot.toggleServer";
        }
    }

    updateExecutionStatus(executionTime: number): void {
        if (this.executionStatusItem) {
            this.executionStatusItem.text = `$(clock) ${executionTime.toFixed(2)}s`;
            this.executionStatusItem.show();
        }
    }

    updateConfiguration(config: ExtensionConfig): void {
        // TODO: Update status bar based on configuration changes
    }

    dispose(): void {
        this.serverStatusItem?.dispose();
        this.executionStatusItem?.dispose();
    }
}
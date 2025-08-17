import * as vscode from 'vscode';
import { ExtensionConfig } from '../types/api';

/**
 * Manages extension configuration
 */
export class ConfigurationManager {
    private readonly configSection = 'drawbot';

    getConfiguration(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(this.configSection);
        
        return {
            serverPort: config.get('serverPort', 8083),
            autoExecuteOnSave: config.get('autoExecuteOnSave', false),
            previewImageMaxSize: config.get('previewImageMaxSize', 1024),
            pythonPath: config.get('pythonPath', 'auto'),
            virtualEnvPath: config.get('virtualEnvPath', ''),
            enableLiveReload: config.get('enableLiveReload', true),
            maxCacheSize: config.get('maxCacheSize', 100 * 1024 * 1024),
            debugMode: config.get('debugMode', false),
            autoStartServer: config.get('autoStartServer', false),
            autoOpenPreview: config.get('autoOpenPreview', false)
        } as ExtensionConfig & { autoStartServer: boolean; autoOpenPreview: boolean };
    }

    async updateConfiguration(key: string, value: any): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    async resetConfiguration(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        const keys = [
            'serverPort',
            'autoExecuteOnSave',
            'previewImageMaxSize',
            'pythonPath',
            'virtualEnvPath',
            'enableLiveReload',
            'maxCacheSize',
            'debugMode'
        ];

        for (const key of keys) {
            await config.update(key, undefined, vscode.ConfigurationTarget.Global);
        }
    }
}
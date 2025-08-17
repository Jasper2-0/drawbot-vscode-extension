import * as os from 'os';
import { FeatureLevel } from '../types/api';

/**
 * Manages feature availability based on platform and system capabilities
 */
export class FeatureManager {
    private currentLevel: FeatureLevel = FeatureLevel.FULL_FUNCTIONALITY;
    private capabilities = new Map<FeatureLevel, Set<string>>();

    constructor() {
        this.setupCapabilities();
    }

    /**
     * Detect the current feature level based on platform and system capabilities
     */
    async detectFeatureLevel(): Promise<FeatureLevel> {
        // Platform detection
        if (process.platform !== 'darwin') {
            console.log(`Platform ${process.platform} detected - DrawBot requires macOS`);
            this.currentLevel = FeatureLevel.SYNTAX_HIGHLIGHTING;
            return this.currentLevel;
        }

        // Check DrawBot availability (would require server health check)
        try {
            const hasDrawBot = await this.checkDrawBotAvailability();
            if (!hasDrawBot) {
                console.log('DrawBot not available, falling back to syntax highlighting');
                this.currentLevel = FeatureLevel.SYNTAX_HIGHLIGHTING;
                return this.currentLevel;
            }
        } catch (error) {
            console.log('Error checking DrawBot availability:', error);
            this.currentLevel = FeatureLevel.READ_ONLY;
            return this.currentLevel;
        }

        // Full functionality available
        this.currentLevel = FeatureLevel.FULL_FUNCTIONALITY;
        return this.currentLevel;
    }

    /**
     * Check if DrawBot is available on the system
     */
    private async checkDrawBotAvailability(): Promise<boolean> {
        // This would typically involve checking if the server can start
        // and if DrawBot is properly installed
        // For now, we'll assume it's available on macOS
        return process.platform === 'darwin';
    }

    /**
     * Setup capability mappings for each feature level
     */
    private setupCapabilities(): void {
        this.capabilities.set(FeatureLevel.FULL_FUNCTIONALITY, new Set([
            'execute',
            'preview',
            'export',
            'template',
            'live-reload',
            'syntax',
            'multi-page',
            'server-management',
            'file-watching'
        ]));

        this.capabilities.set(FeatureLevel.SYNTAX_HIGHLIGHTING, new Set([
            'syntax',
            'template',
            'file-operations'
        ]));

        this.capabilities.set(FeatureLevel.READ_ONLY, new Set([
            'syntax',
            'view'
        ]));

        this.capabilities.set(FeatureLevel.OFFLINE, new Set([
            'syntax'
        ]));
    }

    /**
     * Check if a specific capability is available
     */
    hasCapability(capability: string): boolean {
        const levelCapabilities = this.capabilities.get(this.currentLevel);
        return levelCapabilities?.has(capability) || false;
    }

    /**
     * Get all available capabilities for current level
     */
    getAvailableCapabilities(): string[] {
        const levelCapabilities = this.capabilities.get(this.currentLevel);
        return levelCapabilities ? Array.from(levelCapabilities) : [];
    }

    /**
     * Check if sketch execution is available
     */
    canExecuteSketches(): boolean {
        return this.hasCapability('execute');
    }

    /**
     * Check if live previews are available
     */
    canShowLivePreviews(): boolean {
        return this.hasCapability('preview');
    }

    /**
     * Check if sketch export is available
     */
    canExportSketches(): boolean {
        return this.hasCapability('export');
    }

    /**
     * Check if template creation is available
     */
    canCreateTemplates(): boolean {
        return this.hasCapability('template');
    }

    /**
     * Check if server management is available
     */
    canManageServer(): boolean {
        return this.hasCapability('server-management');
    }

    /**
     * Check if live reload functionality is available
     */
    canLiveReload(): boolean {
        return this.hasCapability('live-reload');
    }

    /**
     * Check if multi-page document support is available
     */
    canHandleMultiPage(): boolean {
        return this.hasCapability('multi-page');
    }

    /**
     * Get current feature level
     */
    getCurrentLevel(): FeatureLevel {
        return this.currentLevel;
    }

    /**
     * Set feature level (primarily for testing)
     */
    setFeatureLevel(level: FeatureLevel): void {
        this.currentLevel = level;
    }

    /**
     * Get platform information
     */
    getPlatformInfo(): {
        platform: string;
        arch: string;
        release: string;
        isSupported: boolean;
        limitations: string[];
    } {
        const platform = process.platform;
        const isSupported = platform === 'darwin';
        const limitations: string[] = [];

        if (!isSupported) {
            limitations.push('DrawBot rendering requires macOS');
            limitations.push('Live preview not available');
            limitations.push('Sketch execution not available');
        }

        return {
            platform,
            arch: process.arch,
            release: os.release(),
            isSupported,
            limitations
        };
    }

    /**
     * Get feature compatibility matrix
     */
    getCompatibilityMatrix(): { [key: string]: { [key in FeatureLevel]: boolean } } {
        const features = [
            'execute',
            'preview',
            'export',
            'template',
            'live-reload',
            'syntax',
            'multi-page',
            'server-management',
            'file-watching'
        ];

        const matrix: { [key: string]: { [key in FeatureLevel]: boolean } } = {};

        for (const feature of features) {
            matrix[feature] = {
                [FeatureLevel.FULL_FUNCTIONALITY]: this.capabilities.get(FeatureLevel.FULL_FUNCTIONALITY)?.has(feature) || false,
                [FeatureLevel.SYNTAX_HIGHLIGHTING]: this.capabilities.get(FeatureLevel.SYNTAX_HIGHLIGHTING)?.has(feature) || false,
                [FeatureLevel.READ_ONLY]: this.capabilities.get(FeatureLevel.READ_ONLY)?.has(feature) || false,
                [FeatureLevel.OFFLINE]: this.capabilities.get(FeatureLevel.OFFLINE)?.has(feature) || false
            };
        }

        return matrix;
    }

    /**
     * Generate feature report for debugging
     */
    generateFeatureReport(): string {
        const platformInfo = this.getPlatformInfo();
        const capabilities = this.getAvailableCapabilities();
        const matrix = this.getCompatibilityMatrix();

        return JSON.stringify({
            currentLevel: this.currentLevel,
            platformInfo,
            availableCapabilities: capabilities,
            compatibilityMatrix: matrix,
            timestamp: new Date().toISOString()
        }, null, 2);
    }
}
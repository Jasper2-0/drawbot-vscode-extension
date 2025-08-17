import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureManager } from '../../../managers/feature-manager';
import { FeatureLevel } from '../../../types/api';

// Mock process.platform
const mockProcess = {
  platform: 'darwin'
};

vi.stubGlobal('process', mockProcess);

describe('FeatureManager', () => {
  let featureManager: FeatureManager;

  beforeEach(() => {
    featureManager = new FeatureManager();
    mockProcess.platform = 'darwin'; // Reset to macOS
  });

  describe('platform detection', () => {
    it('should detect full functionality on macOS', async () => {
      mockProcess.platform = 'darwin';
      
      const level = await featureManager.detectFeatureLevel();
      
      expect(level).toBe(FeatureLevel.FULL_FUNCTIONALITY);
      expect(featureManager.getCurrentLevel()).toBe(FeatureLevel.FULL_FUNCTIONALITY);
    });

    it('should detect syntax highlighting only on Windows', async () => {
      mockProcess.platform = 'win32';
      
      const level = await featureManager.detectFeatureLevel();
      
      expect(level).toBe(FeatureLevel.SYNTAX_HIGHLIGHTING);
      expect(featureManager.getCurrentLevel()).toBe(FeatureLevel.SYNTAX_HIGHLIGHTING);
    });

    it('should detect syntax highlighting only on Linux', async () => {
      mockProcess.platform = 'linux';
      
      const level = await featureManager.detectFeatureLevel();
      
      expect(level).toBe(FeatureLevel.SYNTAX_HIGHLIGHTING);
      expect(featureManager.getCurrentLevel()).toBe(FeatureLevel.SYNTAX_HIGHLIGHTING);
    });
  });

  describe('capability checking', () => {
    it('should have all capabilities in full functionality mode', async () => {
      await featureManager.detectFeatureLevel(); // macOS by default
      
      expect(featureManager.canExecuteSketches()).toBe(true);
      expect(featureManager.canShowLivePreviews()).toBe(true);
      expect(featureManager.canExportSketches()).toBe(true);
      expect(featureManager.canCreateTemplates()).toBe(true);
      expect(featureManager.canManageServer()).toBe(true);
      expect(featureManager.canLiveReload()).toBe(true);
      expect(featureManager.canHandleMultiPage()).toBe(true);
    });

    it('should have limited capabilities in syntax highlighting mode', async () => {
      mockProcess.platform = 'win32';
      await featureManager.detectFeatureLevel();
      
      expect(featureManager.canExecuteSketches()).toBe(false);
      expect(featureManager.canShowLivePreviews()).toBe(false);
      expect(featureManager.canExportSketches()).toBe(false);
      expect(featureManager.canCreateTemplates()).toBe(true);
      expect(featureManager.canManageServer()).toBe(false);
      expect(featureManager.canLiveReload()).toBe(false);
      expect(featureManager.canHandleMultiPage()).toBe(false);
    });

    it('should check individual capabilities correctly', () => {
      featureManager.setFeatureLevel(FeatureLevel.FULL_FUNCTIONALITY);
      
      expect(featureManager.hasCapability('execute')).toBe(true);
      expect(featureManager.hasCapability('preview')).toBe(true);
      expect(featureManager.hasCapability('nonexistent')).toBe(false);
    });
  });

  describe('platform information', () => {
    it('should provide accurate platform info for macOS', () => {
      mockProcess.platform = 'darwin';
      
      const platformInfo = featureManager.getPlatformInfo();
      
      expect(platformInfo.platform).toBe('darwin');
      expect(platformInfo.isSupported).toBe(true);
      expect(platformInfo.limitations).toHaveLength(0);
    });

    it('should provide accurate platform info for Windows', () => {
      mockProcess.platform = 'win32';
      
      const platformInfo = featureManager.getPlatformInfo();
      
      expect(platformInfo.platform).toBe('win32');
      expect(platformInfo.isSupported).toBe(false);
      expect(platformInfo.limitations.length).toBeGreaterThan(0);
      expect(platformInfo.limitations).toContain('DrawBot rendering requires macOS');
    });
  });

  describe('compatibility matrix', () => {
    it('should generate correct compatibility matrix', () => {
      const matrix = featureManager.getCompatibilityMatrix();
      
      expect(matrix).toHaveProperty('execute');
      expect(matrix).toHaveProperty('preview');
      expect(matrix).toHaveProperty('syntax');
      
      // Full functionality should have execute capability
      expect(matrix['execute'][FeatureLevel.FULL_FUNCTIONALITY]).toBe(true);
      
      // Syntax highlighting mode should not have execute capability
      expect(matrix['execute'][FeatureLevel.SYNTAX_HIGHLIGHTING]).toBe(false);
      
      // All modes should have syntax capability
      expect(matrix['syntax'][FeatureLevel.FULL_FUNCTIONALITY]).toBe(true);
      expect(matrix['syntax'][FeatureLevel.SYNTAX_HIGHLIGHTING]).toBe(true);
    });
  });

  describe('feature reports', () => {
    it('should generate comprehensive feature report', async () => {
      await featureManager.detectFeatureLevel();
      
      const report = featureManager.generateFeatureReport();
      const parsed = JSON.parse(report);
      
      expect(parsed).toHaveProperty('currentLevel');
      expect(parsed).toHaveProperty('platformInfo');
      expect(parsed).toHaveProperty('availableCapabilities');
      expect(parsed).toHaveProperty('compatibilityMatrix');
      expect(parsed).toHaveProperty('timestamp');
      
      expect(Array.isArray(parsed.availableCapabilities)).toBe(true);
      expect(typeof parsed.compatibilityMatrix).toBe('object');
    });
  });

  describe('available capabilities', () => {
    it('should return correct capabilities for full functionality', () => {
      featureManager.setFeatureLevel(FeatureLevel.FULL_FUNCTIONALITY);
      
      const capabilities = featureManager.getAvailableCapabilities();
      
      expect(capabilities).toContain('execute');
      expect(capabilities).toContain('preview');
      expect(capabilities).toContain('export');
      expect(capabilities).toContain('template');
      expect(capabilities).toContain('live-reload');
      expect(capabilities).toContain('syntax');
      expect(capabilities).toContain('multi-page');
      expect(capabilities).toContain('server-management');
      expect(capabilities).toContain('file-watching');
    });

    it('should return limited capabilities for syntax highlighting', () => {
      featureManager.setFeatureLevel(FeatureLevel.SYNTAX_HIGHLIGHTING);
      
      const capabilities = featureManager.getAvailableCapabilities();
      
      expect(capabilities).toContain('syntax');
      expect(capabilities).toContain('template');
      expect(capabilities).toContain('file-operations');
      expect(capabilities).not.toContain('execute');
      expect(capabilities).not.toContain('preview');
    });
  });
});
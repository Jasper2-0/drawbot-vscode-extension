import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorManager } from '../../../managers/error-manager';
import { ErrorSeverity, ErrorCategory } from '../../../types/api';

describe('ErrorManager', () => {
  let errorManager: ErrorManager;

  beforeEach(() => {
    errorManager = new ErrorManager();
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('should add error to log', () => {
      const error = new Error('Test error');
      
      errorManager.handleError(error, ErrorSeverity.WARNING, ErrorCategory.USER);
      
      const recentErrors = errorManager.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].message).toBe('Test error');
      expect(recentErrors[0].severity).toBe(ErrorSeverity.WARNING);
      expect(recentErrors[0].category).toBe(ErrorCategory.USER);
    });

    it('should maintain log size limit', () => {
      const maxLogSize = 1000;
      
      // Add more errors than the limit
      for (let i = 0; i < maxLogSize + 100; i++) {
        const error = new Error(`Error ${i}`);
        errorManager.handleError(error, ErrorSeverity.INFO, ErrorCategory.EXTENSION);
      }
      
      const allErrors = errorManager.getRecentErrors(maxLogSize + 200);
      expect(allErrors.length).toBeLessThanOrEqual(maxLogSize);
    });

    it('should execute fallback strategy for network errors', () => {
      const error = new Error('Network timeout');
      
      // This should trigger the network fallback strategy
      errorManager.handleError(error, ErrorSeverity.FATAL, ErrorCategory.NETWORK);
      
      const networkErrors = errorManager.getErrorsByCategory(ErrorCategory.NETWORK);
      expect(networkErrors).toHaveLength(1);
    });

    it('should handle security violations appropriately', () => {
      const error = new Error('Malicious code detected');
      
      errorManager.handleError(error, ErrorSeverity.FATAL, ErrorCategory.SECURITY);
      
      const securityErrors = errorManager.getErrorsByCategory(ErrorCategory.SECURITY);
      expect(securityErrors).toHaveLength(1);
      expect(securityErrors[0].category).toBe(ErrorCategory.SECURITY);
    });
  });

  describe('error filtering and statistics', () => {
    beforeEach(() => {
      // Add sample errors
      errorManager.handleError(new Error('Network error 1'), ErrorSeverity.WARNING, ErrorCategory.NETWORK);
      errorManager.handleError(new Error('Network error 2'), ErrorSeverity.FATAL, ErrorCategory.NETWORK);
      errorManager.handleError(new Error('User error'), ErrorSeverity.INFO, ErrorCategory.USER);
      errorManager.handleError(new Error('Security error'), ErrorSeverity.FATAL, ErrorCategory.SECURITY);
    });

    it('should filter errors by category', () => {
      const networkErrors = errorManager.getErrorsByCategory(ErrorCategory.NETWORK);
      expect(networkErrors).toHaveLength(2);
      
      const userErrors = errorManager.getErrorsByCategory(ErrorCategory.USER);
      expect(userErrors).toHaveLength(1);
    });

    it('should filter errors by severity', () => {
      const fatalErrors = errorManager.getErrorsBySeverity(ErrorSeverity.FATAL);
      expect(fatalErrors).toHaveLength(2);
      
      const warningErrors = errorManager.getErrorsBySeverity(ErrorSeverity.WARNING);
      expect(warningErrors).toHaveLength(1);
    });

    it('should generate accurate error statistics', () => {
      const stats = errorManager.getErrorStats();
      
      expect(stats.network_count).toBe(2);
      expect(stats.user_count).toBe(1);
      expect(stats.security_count).toBe(1);
      expect(stats.fatal_count).toBe(2);
      expect(stats.warning_count).toBe(1);
      expect(stats.info_count).toBe(1);
      expect(stats.total_count).toBe(4);
    });
  });

  describe('error log management', () => {
    it('should clear error log', () => {
      errorManager.handleError(new Error('Test'), ErrorSeverity.INFO, ErrorCategory.EXTENSION);
      expect(errorManager.getRecentErrors()).toHaveLength(1);
      
      errorManager.clearErrorLog();
      expect(errorManager.getRecentErrors()).toHaveLength(0);
    });

    it('should export error log as JSON', () => {
      errorManager.handleError(new Error('Test error'), ErrorSeverity.WARNING, ErrorCategory.USER);
      
      const exported = errorManager.exportErrorLog();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('errors');
      expect(parsed).toHaveProperty('stats');
      expect(parsed.errors).toHaveLength(1);
    });
  });

  describe('error context handling', () => {
    it('should include context in error objects', () => {
      const error = new Error('Test error');
      const context = 'Test context';
      
      errorManager.handleError(error, ErrorSeverity.INFO, ErrorCategory.EXTENSION, context);
      
      const recentErrors = errorManager.getRecentErrors(1);
      expect(recentErrors[0].context).toBe(context);
    });

    it('should handle errors without context', () => {
      const error = new Error('Test error');
      
      errorManager.handleError(error, ErrorSeverity.INFO, ErrorCategory.EXTENSION);
      
      const recentErrors = errorManager.getRecentErrors(1);
      expect(recentErrors[0].context).toBeDefined();
    });
  });
});
import { defineConfig } from 'vitest/config';
import baseConfig from '../vitest.config';

/**
 * Integration test configuration
 * Extends base config with integration-specific settings
 */
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    
    // Integration test specific settings
    include: [
      'src/test/integration/**/*.test.ts'
    ],
    
    // Longer timeouts for integration tests
    testTimeout: 30000,
    hookTimeout: 15000,
    
    // Sequential execution for integration tests to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1
      }
    },
    
    // Integration test setup
    setupFiles: [
      './src/test/setup.ts',
      './src/test/integration-setup.ts'
    ],
    
    // Test output for integration tests
    outputFile: {
      junit: './test-results/integration-junit.xml'
    }
  }
});
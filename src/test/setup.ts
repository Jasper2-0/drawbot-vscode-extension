import { vi } from 'vitest';
import { mockVSCode } from './mocks/vscode';
import { mockServer } from './mocks/server';

// Mock VS Code API globally
vi.mock('vscode', () => mockVSCode);

// Setup global test environment
beforeAll(async () => {
  // Start mock server for integration tests
  mockServer.listen();
  
  // Setup global test utilities
  global.console = {
    ...console,
    // Suppress console output during tests unless explicitly needed
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
});

afterEach(() => {
  // Reset all mocks after each test
  vi.resetAllMocks();
  mockServer.resetHandlers();
});

afterAll(() => {
  // Cleanup
  mockServer.close();
});
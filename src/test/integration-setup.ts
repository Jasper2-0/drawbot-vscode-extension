/**
 * Integration test setup
 * Additional setup for integration tests that require more complex mocking
 */

import { vi } from 'vitest';
import { setupMockServer } from './mocks/mock-server';

// Global variables for integration tests
let mockServer: any;

beforeAll(async () => {
  // Start mock DrawBot server for integration tests
  mockServer = await setupMockServer();
  
  // Configure test environment variables
  process.env.DRAWBOT_SERVER_PORT = '8084'; // Use different port for tests
  process.env.DRAWBOT_TEST_MODE = 'integration';
});

afterAll(async () => {
  // Clean up mock server
  if (mockServer) {
    await mockServer.close();
  }
});

beforeEach(() => {
  // Reset server state before each integration test
  if (mockServer) {
    mockServer.resetState();
  }
});

export { mockServer };
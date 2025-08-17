/**
 * Core type definitions for the DrawBot VS Code extension
 */

export interface SketchInfo {
  name: string;
  lastModified: string;
  size: number;
  category: 'user' | 'example' | 'template';
  hasErrors: boolean;
  pageCount?: number;
  path: string;
}

export interface ExecutionResult {
  success: boolean;
  executionTime: number;
  outputPath?: string;
  errorMessage?: string;
  pages: number;
  previewUrl?: string;
  metadata?: {
    sketchName: string;
    timestamp: number;
    cacheKey: string;
  };
}

export interface ServerHealth {
  status: 'healthy' | 'unhealthy' | 'starting';
  version: string;
  uptime: number;
  memoryUsage: number;
  activeConnections: number;
  lastError?: string;
}

export interface WebviewMessage {
  command: 'execute' | 'export' | 'navigate' | 'resize' | 'ready';
  payload: ExecutePayload | ExportPayload | NavigatePayload | ResizePayload | ReadyPayload;
  requestId: string;
}

export interface ExecutePayload {
  sketchName: string;
  options?: {
    timeout?: number;
    preview?: boolean;
    clearCache?: boolean;
  };
}

export interface ExportPayload {
  sketchName: string;
  format: 'png' | 'pdf' | 'svg';
  quality?: number;
  pages?: number[];
}

export interface NavigatePayload {
  page: number;
  totalPages: number;
}

export interface ResizePayload {
  width: number;
  height: number;
}

export interface ReadyPayload {
  webviewId: string;
  capabilities: string[];
}

export interface WebviewResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export interface BatchExecutionRequest {
  sketches: string[];
  options?: {
    parallel?: boolean;
    timeout?: number;
    maxConcurrent?: number;
  };
}

export interface BatchExecutionResult {
  results: Map<string, ExecutionResult>;
  failures: Map<string, APIError>;
  totalTime: number;
}

export interface ServerConfig {
  port: number;
  pythonPath: string;
  virtualEnvPath?: string;
  maxStartupTime: number;
  healthCheckInterval: number;
  maxMemoryUsage: number;
}

export interface ExtensionConfig {
  serverPort: number;
  autoExecuteOnSave: boolean;
  previewImageMaxSize: number;
  pythonPath: string;
  virtualEnvPath: string;
  enableLiveReload: boolean;
  maxCacheSize: number;
  debugMode: boolean;
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  size: number;
  lastAccessed: number;
}

export interface PerformanceMetrics {
  memoryUsage: number;
  executionTime: number;
  activeWebviews: number;
  cacheSize: number;
  lastGC?: number;
  requestCount: number;
  errorCount: number;
}

export interface SecurityValidation {
  safe: boolean;
  violations: string[];
  risk: 'low' | 'medium' | 'high';
  blockedPatterns: string[];
}

export interface OptimizedImage {
  url: string;
  size: number;
  optimized: boolean;
  originalSize?: number;
  format: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export enum FeatureLevel {
  FULL_FUNCTIONALITY = 'full',
  SYNTAX_HIGHLIGHTING = 'syntax',
  READ_ONLY = 'readonly',
  OFFLINE = 'offline'
}

export enum ErrorSeverity {
  FATAL = 'fatal',
  WARNING = 'warning',
  INFO = 'info'
}

export enum ErrorCategory {
  NETWORK = 'network',
  SERVER = 'server',
  EXTENSION = 'extension',
  USER = 'user',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

export interface ExtensionError {
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  details?: any;
  timestamp: number;
  context?: string;
  stack?: string;
}

export interface DataPolicy {
  collectTelemetry: boolean;
  logSketchContent: boolean;
  shareErrorReports: 'none' | 'anonymized' | 'full';
  cachePreviewImages: boolean;
  retainExecutionHistory: boolean;
}

// WebSocket Message Types
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  id: string;
  timestamp: number;
}

export type WebSocketMessageType = 
  | 'sketch_updated'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'server_status_changed'
  | 'file_changed'
  | 'health_update'
  | 'connection_established'
  | 'error'
  | 'ping'
  | 'pong';

export interface SketchUpdatedPayload {
  sketchName: string;
  content: string;
  lastModified: number;
}

export interface ExecutionStartedPayload {
  sketchName: string;
  requestId: string;
  startTime: number;
}

export interface ExecutionCompletedPayload {
  sketchName: string;
  requestId: string;
  result: ExecutionResult;
}

export interface ExecutionFailedPayload {
  sketchName: string;
  requestId: string;
  error: APIError;
}

export interface ServerStatusChangedPayload {
  previousStatus: ServerHealth['status'];
  currentStatus: ServerHealth['status'];
  health: ServerHealth;
}

export interface FileChangedPayload {
  path: string;
  eventType: 'created' | 'modified' | 'deleted';
  timestamp: number;
}

export interface HealthUpdatePayload {
  health: ServerHealth;
  metrics: PerformanceMetrics;
}

export interface ErrorPayload {
  error: ExtensionError;
  context?: string;
}

// API Client Types
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  maxConcurrentRequests: number;
  authToken?: string;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high';
  dedupe?: boolean;
  cache?: boolean;
  cacheTTL?: number;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestOptions;
  timestamp: number;
}

export interface RequestMetadata {
  id: string;
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  retryCount: number;
  cached: boolean;
}

export interface BatchRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: any;
  options?: RequestOptions;
}

export interface BatchResponse<T = any> {
  results: Map<string, APIResponse<T>>;
  errors: Map<string, APIError>;
  metadata: {
    totalTime: number;
    successCount: number;
    errorCount: number;
    batchId: string;
  };
}

// Server Manager Types
export interface ProcessInfo {
  pid: number;
  startTime: number;
  command: string;
  workingDirectory: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface ServerStartupOptions {
  pythonPath?: string;
  virtualEnvPath?: string;
  workspaceRoot: string;
  port?: number;
  maxStartupTime?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface PythonEnvironment {
  pythonPath: string;
  version: string;
  virtualEnvPath?: string;
  drawbotInstalled: boolean;
  dependencies: {
    [packageName: string]: string;
  };
}

export interface ServerLifecycleEvent {
  type: 'starting' | 'started' | 'stopping' | 'stopped' | 'error' | 'health_check';
  timestamp: number;
  details?: any;
  processInfo?: ProcessInfo;
}

// WebSocket Manager Types
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts: number;
  reconnectInterval: number;
  maxReconnectInterval: number;
  reconnectBackoffMultiplier: number;
  heartbeatInterval: number;
  messageQueueMaxSize: number;
  connectionTimeout: number;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  connectedAt?: number;
  lastReconnectAttempt?: number;
  reconnectAttempts: number;
  lastError?: string;
  latency?: number;
}

export interface QueuedMessage {
  message: WebSocketMessage;
  timestamp: number;
  attempts: number;
  priority: number;
}

export interface WebSocketMetrics {
  messagesReceived: number;
  messagesSent: number;
  reconnections: number;
  avgLatency: number;
  connectionUptime: number;
  queueSize: number;
  lastActivity: number;
}

// Error Handling Types
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
}

// Enhanced API Endpoints
export interface APIEndpoints {
  // Sketch operations
  listSketches: () => Promise<SketchInfo[]>;
  executeSketch: (name: string, options?: ExecutePayload['options']) => Promise<ExecutionResult>;
  getSketchContent: (name: string) => Promise<string>;
  validateSketch: (name: string) => Promise<SecurityValidation>;
  
  // Batch operations
  batchExecute: (request: BatchExecutionRequest) => Promise<BatchExecutionResult>;
  batchValidate: (sketches: string[]) => Promise<Map<string, SecurityValidation>>;
  
  // Server management
  getHealth: () => Promise<ServerHealth>;
  getMetrics: () => Promise<PerformanceMetrics>;
  restartServer: () => Promise<void>;
  
  // Cache operations
  clearCache: (pattern?: string) => Promise<void>;
  getCacheStats: () => Promise<{ size: number; entries: number; hitRate: number }>;
  
  // Preview operations
  getPreviewUrl: (sketchName: string, page?: number) => Promise<string>;
  exportSketch: (name: string, format: ExportPayload['format'], options?: Partial<ExportPayload>) => Promise<Blob>;
}
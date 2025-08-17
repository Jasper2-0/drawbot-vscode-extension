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
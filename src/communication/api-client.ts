import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { 
  SketchInfo, 
  ExecutionResult, 
  ServerHealth, 
  APIError, 
  BatchExecutionRequest, 
  BatchExecutionResult,
  ExtensionConfig 
} from '../types/api';

/**
 * Type-safe HTTP client for DrawBot server communication
 * Implements request deduplication, retry logic, and comprehensive error handling
 */
export class TypeSafeAPIClient {
  private client: AxiosInstance;
  private requestDeduplication = new Map<string, Promise<any>>();
  private sessionId: string;
  private extensionVersion: string;

  constructor(baseURL: string, config?: ExtensionConfig) {
    this.sessionId = uuidv4();
    this.extensionVersion = '0.1.0'; // TODO: Get from package.json
    
    this.client = axios.create({
      baseURL,
      timeout: config?.debugMode ? 60000 : 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'vscode-extension',
        'X-Client-Version': this.extensionVersion,
        'X-Session-ID': this.sessionId
      },
      // Retry configuration
      adapter: 'http'
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication and logging
    this.client.interceptors.request.use(
      (config) => {
        config.headers['X-Request-ID'] = uuidv4();
        config.headers['X-Timestamp'] = Date.now().toString();
        
        if (config.method === 'post' || config.method === 'put') {
          config.headers['X-Request-Hash'] = this.generateRequestHash(config.data);
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(this.enhanceError(error));
      }
    );

    // Response interceptor for error handling and retries
    this.client.interceptors.response.use(
      (response) => {
        // Log successful responses in debug mode
        this.logResponse(response);
        return response;
      },
      async (error: AxiosError) => {
        const enhancedError = this.enhanceError(error);
        
        // Handle specific error cases
        if (error.response?.status === 503) {
          // Server unavailable - trigger fallback mode
          this.triggerFallbackMode();
        } else if (error.response?.status === 429) {
          // Rate limited - implement exponential backoff
          return this.handleRateLimit(error);
        }
        
        return Promise.reject(enhancedError);
      }
    );
  }

  /**
   * Request deduplication to prevent race conditions
   */
  private async deduplicatedRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (this.requestDeduplication.has(key)) {
      console.log(`Deduplicating request: ${key}`);
      return this.requestDeduplication.get(key);
    }

    const promise = requestFn();
    this.requestDeduplication.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up after a short delay to handle rapid successive calls
      setTimeout(() => {
        this.requestDeduplication.delete(key);
      }, 1000);
    }
  }

  /**
   * Get server health status
   */
  async getHealth(): Promise<ServerHealth> {
    return this.deduplicatedRequest('health', async () => {
      const response = await this.client.get<ServerHealth>('/health');
      return response.data;
    });
  }

  /**
   * Get list of all sketches
   */
  async getSketchList(category?: 'user' | 'example' | 'template'): Promise<SketchInfo[]> {
    const cacheKey = `sketches-${category || 'all'}`;
    
    return this.deduplicatedRequest(cacheKey, async () => {
      const params = category ? { category } : {};
      const response = await this.client.get<SketchInfo[]>('/api/v1/sketches', { params });
      return response.data;
    });
  }

  /**
   * Execute a single sketch
   */
  async executeSketch(
    name: string, 
    options?: { timeout?: number; preview?: boolean; clearCache?: boolean }
  ): Promise<ExecutionResult> {
    const cacheKey = `execute-${name}`;
    
    return this.deduplicatedRequest(cacheKey, async () => {
      const response = await this.client.post<ExecutionResult>(
        `/api/v1/sketches/${encodeURIComponent(name)}/execute`,
        { options },
        { timeout: options?.timeout || 30000 }
      );
      return response.data;
    });
  }

  /**
   * Batch execute multiple sketches
   */
  async executeBatch(request: BatchExecutionRequest): Promise<BatchExecutionResult> {
    const cacheKey = `batch-${request.sketches.join('-')}`;
    
    return this.deduplicatedRequest(cacheKey, async () => {
      const response = await this.client.post<Record<string, ExecutionResult>>(
        '/api/v1/batch/execute',
        request,
        { timeout: (request.options?.timeout || 30) * 1000 }
      );
      
      const results = new Map<string, ExecutionResult>();
      const failures = new Map<string, APIError>();
      
      for (const [sketchName, result] of Object.entries(response.data)) {
        if (result.success) {
          results.set(sketchName, result);
        } else {
          failures.set(sketchName, {
            code: 'EXECUTION_FAILED',
            message: result.errorMessage || 'Unknown execution error',
            timestamp: Date.now()
          });
        }
      }
      
      return {
        results,
        failures,
        totalTime: Math.max(...Object.values(response.data).map(r => r.executionTime))
      };
    });
  }

  /**
   * Get sketch execution status
   */
  async getSketchStatus(name: string): Promise<{
    name: string;
    status: 'ready' | 'executing' | 'error';
    lastExecution?: number;
    hasPreview: boolean;
  }> {
    const response = await this.client.get(`/api/v1/sketches/${encodeURIComponent(name)}/status`);
    return response.data;
  }

  /**
   * Export sketch to specific format
   */
  async exportSketch(
    name: string,
    format: 'png' | 'pdf' | 'svg',
    options?: { quality?: number; pages?: number[] }
  ): Promise<{ success: boolean; exportPath?: string; downloadUrl?: string; error?: string }> {
    const response = await this.client.post(
      `/api/v1/sketches/${encodeURIComponent(name)}/export`,
      { format, ...options }
    );
    return response.data;
  }

  /**
   * Get server metrics
   */
  async getMetrics(): Promise<{
    requests: number;
    errors: number;
    averageResponseTime: number;
    memoryUsage: number;
    uptime: number;
  }> {
    const response = await this.client.get('/api/v1/metrics');
    return response.data;
  }

  /**
   * Test endpoint for connection validation
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate request hash for deduplication
   */
  private generateRequestHash(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: AxiosError): APIError {
    const baseError: APIError = {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      timestamp: Date.now()
    };

    if (error.response) {
      // Server responded with error status
      baseError.code = `HTTP_${error.response.status}`;
      baseError.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      
      if (error.response.data && typeof error.response.data === 'object') {
        const responseData = error.response.data as any;
        baseError.message = responseData.error || responseData.message || error.message;
        baseError.code = responseData.code || baseError.code;
      }
    } else if (error.request) {
      // Request made but no response received
      baseError.code = 'NETWORK_ERROR';
      baseError.message = 'No response from server';
      baseError.details = { timeout: error.code === 'ECONNABORTED' };
    }

    return baseError;
  }

  /**
   * Log response for debugging
   */
  private logResponse(response: AxiosResponse): void {
    const requestId = response.config.headers['X-Request-ID'];
    const duration = Date.now() - parseInt(response.config.headers['X-Timestamp'] as string);
    
    console.log(`API Response [${requestId}]: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  private async handleRateLimit(error: AxiosError): Promise<any> {
    const retryAfter = error.response?.headers['retry-after'];
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, 1) * 1000;
    
    console.log(`Rate limited, retrying after ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.client.request(error.config!);
  }

  /**
   * Trigger fallback mode when server is unavailable
   */
  private triggerFallbackMode(): void {
    console.log('Server unavailable, triggering fallback mode');
    // This would typically emit an event or call a callback
    // to notify the extension manager about the need to switch to fallback mode
  }

  /**
   * Get current session information
   */
  getSessionInfo(): {
    sessionId: string;
    extensionVersion: string;
    activeRequests: number;
  } {
    return {
      sessionId: this.sessionId,
      extensionVersion: this.extensionVersion,
      activeRequests: this.requestDeduplication.size
    };
  }

  /**
   * Clear request deduplication cache
   */
  clearCache(): void {
    this.requestDeduplication.clear();
  }

  /**
   * Dispose of the client and clean up resources
   */
  dispose(): void {
    this.clearCache();
    // Cancel any pending requests
    // Note: Axios doesn't have a built-in way to cancel all requests
    // but this is where we would implement it if needed
  }
}
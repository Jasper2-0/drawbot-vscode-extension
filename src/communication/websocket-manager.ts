import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * WebSocket message types with discriminated unions for type safety
 */
export interface WebSocketMessage {
  type: 'sketch_updated' | 'execution_complete' | 'server_status' | 'error' | 'ping' | 'pong';
  payload: any;
  timestamp: number;
  messageId: string;
}

export interface SketchUpdatedMessage extends WebSocketMessage {
  type: 'sketch_updated';
  payload: {
    sketchName: string;
    lastModified: number;
    hasErrors: boolean;
  };
}

export interface ExecutionCompleteMessage extends WebSocketMessage {
  type: 'execution_complete';
  payload: {
    sketchName: string;
    success: boolean;
    executionTime: number;
    previewUrl?: string;
    errorMessage?: string;
  };
}

export interface ServerStatusMessage extends WebSocketMessage {
  type: 'server_status';
  payload: {
    status: 'healthy' | 'unhealthy' | 'maintenance';
    memoryUsage: number;
    activeConnections: number;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
    details?: any;
  };
}

type TypedWebSocketMessage = 
  | SketchUpdatedMessage 
  | ExecutionCompleteMessage 
  | ServerStatusMessage 
  | ErrorMessage;

/**
 * Connection status enum
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * WebSocket connection configuration
 */
export interface WebSocketConfig {
  maxReconnectAttempts: number;
  reconnectInterval: number;
  maxReconnectInterval: number;
  reconnectBackoffMultiplier: number;
  heartbeatInterval: number;
  messageQueueMaxSize: number;
}

/**
 * Type-safe WebSocket manager with automatic reconnection and message queuing
 */
export class TypeSafeWebSocketManager extends EventEmitter {
  private connections = new Map<string, WebSocket>();
  private connectionStatus = new Map<string, ConnectionStatus>();
  private reconnectAttempts = new Map<string, number>();
  private reconnectTimers = new Map<string, NodeJS.Timer>();
  private heartbeatTimers = new Map<string, NodeJS.Timer>();
  private messageQueues = new Map<string, TypedWebSocketMessage[]>();
  
  private config: WebSocketConfig = {
    maxReconnectAttempts: 5,
    reconnectInterval: 1000,
    maxReconnectInterval: 30000,
    reconnectBackoffMultiplier: 2,
    heartbeatInterval: 30000,
    messageQueueMaxSize: 100
  };

  constructor(config?: Partial<WebSocketConfig>) {
    super();
    this.config = { ...this.config, ...config };
  }

  /**
   * Connect to a specific sketch's WebSocket endpoint
   */
  async connectToSketch(sketchName: string, baseUrl = 'ws://localhost:8083'): Promise<WebSocket> {
    const connectionKey = `sketch-${sketchName}`;
    
    // Return existing connection if already connected
    if (this.isConnected(connectionKey)) {
      return this.connections.get(connectionKey)!;
    }

    return this.createConnection(connectionKey, `${baseUrl}/ws/sketches/${encodeURIComponent(sketchName)}`);
  }

  /**
   * Connect to server-wide events
   */
  async connectToServer(baseUrl = 'ws://localhost:8083'): Promise<WebSocket> {
    const connectionKey = 'server';
    
    if (this.isConnected(connectionKey)) {
      return this.connections.get(connectionKey)!;
    }

    return this.createConnection(connectionKey, `${baseUrl}/ws/server`);
  }

  /**
   * Create a new WebSocket connection
   */
  private async createConnection(key: string, url: string): Promise<WebSocket> {
    this.setConnectionStatus(key, ConnectionStatus.CONNECTING);
    
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url, {
          headers: {
            'X-Client-Type': 'vscode-extension',
            'X-Client-ID': uuidv4(),
            'X-Connection-Key': key
          }
        });

        // Connection opened
        ws.on('open', () => {
          console.log(`WebSocket connected: ${key}`);
          this.setConnectionStatus(key, ConnectionStatus.CONNECTED);
          this.connections.set(key, ws);
          this.reconnectAttempts.set(key, 0);
          
          // Start heartbeat
          this.startHeartbeat(key);
          
          // Send queued messages
          this.flushMessageQueue(key);
          
          this.emit('connected', { key, url });
          resolve(ws);
        });

        // Message received
        ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString()) as TypedWebSocketMessage;
            this.handleMessage(key, message);
          } catch (error) {
            console.error(`Failed to parse WebSocket message for ${key}:`, error);
            this.emit('error', { key, error: 'Invalid message format' });
          }
        });

        // Connection closed
        ws.on('close', (code: number, reason: string) => {
          console.log(`WebSocket closed: ${key} (${code}: ${reason})`);
          this.handleConnectionClose(key, code, reason);
        });

        // Connection error
        ws.on('error', (error: Error) => {
          console.error(`WebSocket error: ${key}`, error);
          this.handleConnectionError(key, error);
          
          if (this.getConnectionStatus(key) === ConnectionStatus.CONNECTING) {
            reject(error);
          }
        });

        // Timeout for connection
        setTimeout(() => {
          if (this.getConnectionStatus(key) === ConnectionStatus.CONNECTING) {
            ws.close();
            reject(new Error(`Connection timeout for ${key}`));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages with type safety
   */
  private handleMessage(connectionKey: string, message: TypedWebSocketMessage): void {
    // Handle pong responses
    if (message.type === 'pong') {
      return; // Heartbeat response, no action needed
    }

    // Emit typed events based on message type
    switch (message.type) {
      case 'sketch_updated':
        this.emit('sketchUpdated', {
          connectionKey,
          sketchName: message.payload.sketchName,
          lastModified: message.payload.lastModified,
          hasErrors: message.payload.hasErrors
        });
        break;

      case 'execution_complete':
        this.emit('executionComplete', {
          connectionKey,
          sketchName: message.payload.sketchName,
          success: message.payload.success,
          executionTime: message.payload.executionTime,
          previewUrl: message.payload.previewUrl,
          errorMessage: message.payload.errorMessage
        });
        break;

      case 'server_status':
        this.emit('serverStatus', {
          connectionKey,
          status: message.payload.status,
          memoryUsage: message.payload.memoryUsage,
          activeConnections: message.payload.activeConnections
        });
        break;

      case 'error':
        this.emit('error', {
          connectionKey,
          code: message.payload.code,
          message: message.payload.message,
          details: message.payload.details
        });
        break;

      default:
        console.warn(`Unknown message type: ${(message as any).type}`);
    }

    // Emit general message event
    this.emit('message', { connectionKey, message });
  }

  /**
   * Send a message to a specific connection
   */
  async sendMessage(connectionKey: string, message: Omit<TypedWebSocketMessage, 'messageId' | 'timestamp'>): Promise<void> {
    const fullMessage: TypedWebSocketMessage = {
      ...message,
      messageId: uuidv4(),
      timestamp: Date.now()
    } as TypedWebSocketMessage;

    const ws = this.connections.get(connectionKey);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(fullMessage));
      } catch (error) {
        console.error(`Failed to send message to ${connectionKey}:`, error);
        throw error;
      }
    } else {
      // Queue message for later delivery
      this.queueMessage(connectionKey, fullMessage);
    }
  }

  /**
   * Queue message for delivery when connection is available
   */
  private queueMessage(connectionKey: string, message: TypedWebSocketMessage): void {
    let queue = this.messageQueues.get(connectionKey);
    if (!queue) {
      queue = [];
      this.messageQueues.set(connectionKey, queue);
    }

    queue.push(message);

    // Limit queue size
    if (queue.length > this.config.messageQueueMaxSize) {
      queue.shift(); // Remove oldest message
    }
  }

  /**
   * Send all queued messages for a connection
   */
  private flushMessageQueue(connectionKey: string): void {
    const queue = this.messageQueues.get(connectionKey);
    if (!queue || queue.length === 0) {
      return;
    }

    const ws = this.connections.get(connectionKey);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    console.log(`Flushing ${queue.length} queued messages for ${connectionKey}`);
    
    while (queue.length > 0) {
      const message = queue.shift()!;
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send queued message:`, error);
        // Re-queue the message
        queue.unshift(message);
        break;
      }
    }
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(connectionKey: string, code: number, reason: string): void {
    this.connections.delete(connectionKey);
    this.stopHeartbeat(connectionKey);
    
    // Don't reconnect for normal closure or if max attempts reached
    if (code === 1000 || this.getReconnectAttempts(connectionKey) >= this.config.maxReconnectAttempts) {
      this.setConnectionStatus(connectionKey, ConnectionStatus.DISCONNECTED);
      this.emit('disconnected', { connectionKey, code, reason });
      return;
    }

    // Attempt reconnection
    this.handleReconnection(connectionKey);
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(connectionKey: string, error: Error): void {
    this.emit('error', { connectionKey, error: error.message });
    
    if (this.getConnectionStatus(connectionKey) === ConnectionStatus.CONNECTED) {
      this.handleReconnection(connectionKey);
    }
  }

  /**
   * Handle automatic reconnection with exponential backoff
   */
  private async handleReconnection(connectionKey: string): Promise<void> {
    const attempts = this.getReconnectAttempts(connectionKey);
    
    if (attempts >= this.config.maxReconnectAttempts) {
      this.setConnectionStatus(connectionKey, ConnectionStatus.FAILED);
      this.emit('connectionFailed', { connectionKey, attempts });
      return;
    }

    this.setConnectionStatus(connectionKey, ConnectionStatus.RECONNECTING);
    this.reconnectAttempts.set(connectionKey, attempts + 1);

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.reconnectBackoffMultiplier, attempts),
      this.config.maxReconnectInterval
    );

    console.log(`Reconnecting ${connectionKey} in ${delay}ms (attempt ${attempts + 1}/${this.config.maxReconnectAttempts})`);

    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(connectionKey);
      
      try {
        // Get the original URL (this would need to be stored during initial connection)
        // For now, we'll emit an event to request reconnection
        this.emit('reconnectRequested', { connectionKey, attempts: attempts + 1 });
      } catch (error) {
        console.error(`Reconnection failed for ${connectionKey}:`, error);
        this.handleReconnection(connectionKey);
      }
    }, delay);

    this.reconnectTimers.set(connectionKey, timer);
  }

  /**
   * Start heartbeat for a connection
   */
  private startHeartbeat(connectionKey: string): void {
    const timer = setInterval(() => {
      const ws = this.connections.get(connectionKey);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: 'ping',
            payload: {},
            timestamp: Date.now(),
            messageId: uuidv4()
          }));
        } catch (error) {
          console.error(`Heartbeat failed for ${connectionKey}:`, error);
          this.stopHeartbeat(connectionKey);
        }
      } else {
        this.stopHeartbeat(connectionKey);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(connectionKey, timer);
  }

  /**
   * Stop heartbeat for a connection
   */
  private stopHeartbeat(connectionKey: string): void {
    const timer = this.heartbeatTimers.get(connectionKey);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionKey);
    }
  }

  /**
   * Check if a connection is active
   */
  isConnected(connectionKey: string): boolean {
    const ws = this.connections.get(connectionKey);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(connectionKey: string): ConnectionStatus {
    return this.connectionStatus.get(connectionKey) || ConnectionStatus.DISCONNECTED;
  }

  /**
   * Set connection status
   */
  private setConnectionStatus(connectionKey: string, status: ConnectionStatus): void {
    this.connectionStatus.set(connectionKey, status);
    this.emit('statusChanged', { connectionKey, status });
  }

  /**
   * Get reconnect attempts count
   */
  private getReconnectAttempts(connectionKey: string): number {
    return this.reconnectAttempts.get(connectionKey) || 0;
  }

  /**
   * Close a specific connection
   */
  closeConnection(connectionKey: string): void {
    const ws = this.connections.get(connectionKey);
    if (ws) {
      ws.close(1000, 'Client initiated close');
    }
    
    this.cleanup(connectionKey);
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    for (const [key] of this.connections) {
      this.closeConnection(key);
    }
  }

  /**
   * Clean up resources for a connection
   */
  private cleanup(connectionKey: string): void {
    this.connections.delete(connectionKey);
    this.connectionStatus.delete(connectionKey);
    this.reconnectAttempts.delete(connectionKey);
    this.messageQueues.delete(connectionKey);
    this.stopHeartbeat(connectionKey);
    
    const reconnectTimer = this.reconnectTimers.get(connectionKey);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      this.reconnectTimers.delete(connectionKey);
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    queuedMessages: number;
    reconnectingConnections: number;
  } {
    let activeConnections = 0;
    let queuedMessages = 0;
    let reconnectingConnections = 0;

    for (const [key] of this.connections) {
      if (this.isConnected(key)) {
        activeConnections++;
      }
      
      const queue = this.messageQueues.get(key);
      if (queue) {
        queuedMessages += queue.length;
      }
      
      if (this.getConnectionStatus(key) === ConnectionStatus.RECONNECTING) {
        reconnectingConnections++;
      }
    }

    return {
      totalConnections: this.connections.size,
      activeConnections,
      queuedMessages,
      reconnectingConnections
    };
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.closeAllConnections();
    this.removeAllListeners();
  }
}
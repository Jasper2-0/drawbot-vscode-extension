import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { ExtensionConfig, ServerHealth, ErrorSeverity, ErrorCategory } from '../types/api';
import { ErrorManager } from './error-manager';
import { PerformanceMonitor } from '../performance/performance-monitor';
import { TypeSafeAPIClient } from '../communication/api-client';
import { TypeSafeWebSocketManager } from '../communication/websocket-manager';

/**
 * Enhanced server manager with full lifecycle management
 */
export class ServerManager {
    private serverProcess?: ChildProcess;
    private apiClient?: TypeSafeAPIClient;
    private wsManager?: TypeSafeWebSocketManager;
    private pidFile: string;
    private healthChecker?: NodeJS.Timer;
    private isShuttingDown = false;
    private startupPromise?: Promise<boolean>;

    constructor(
        private config: ExtensionConfig,
        private errorManager: ErrorManager,
        private performanceMonitor: PerformanceMonitor
    ) {
        this.pidFile = path.join(os.tmpdir(), 'drawbot-vscode-server.pid');
        this.setupCleanupHandlers();
    }

    /**
     * Start the DrawBot server with comprehensive validation and monitoring
     */
    async startServer(): Promise<boolean> {
        // Prevent multiple simultaneous startup attempts
        if (this.startupPromise) {
            return this.startupPromise;
        }

        this.startupPromise = this.doStartServer();
        try {
            return await this.startupPromise;
        } finally {
            this.startupPromise = undefined;
        }
    }

    private async doStartServer(): Promise<boolean> {
        try {
            console.log('Starting DrawBot server...');

            // Check for existing server processes
            await this.cleanupOrphanedProcesses();

            // Validate environment
            if (!await this.validateEnvironment()) {
                throw new Error('DrawBot environment validation failed');
            }

            // Find available port
            const port = await this.findAvailablePort(this.config.serverPort);

            // Start server process
            const pythonExecutable = await this.findPythonExecutable();
            const projectRoot = this.getProjectRoot();

            console.log(`Starting server with Python: ${pythonExecutable}`);
            console.log(`Project root: ${projectRoot}`);
            console.log(`Port: ${port}`);

            this.serverProcess = spawn(pythonExecutable, [
                'sketchbook.py', 'live', '--port', port.toString(), '--extension-mode'
            ], {
                cwd: projectRoot,
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false,
                env: {
                    ...process.env,
                    PYTHONPATH: projectRoot,
                    DRAWBOT_EXTENSION_MODE: '1'
                }
            });

            // Write PID file for cleanup
            if (this.serverProcess.pid) {
                fs.writeFileSync(this.pidFile, this.serverProcess.pid.toString());
            }

            // Setup process monitoring
            this.setupProcessMonitoring();

            // Wait for server to be ready
            const success = await this.waitForServerReady(port);

            if (success) {
                // Initialize API client and WebSocket manager
                this.apiClient = new TypeSafeAPIClient(`http://localhost:${port}`, this.config);
                this.wsManager = new TypeSafeWebSocketManager();

                // Start health monitoring
                this.startHealthMonitoring();

                console.log('DrawBot server started successfully');
            }

            return success;

        } catch (error) {
            this.errorManager.handleError(
                error as Error,
                ErrorSeverity.FATAL,
                ErrorCategory.SERVER,
                'Server startup failed'
            );
            throw error;
        }
    }

    /**
     * Stop the server gracefully
     */
    async stopServer(): Promise<void> {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        console.log('Stopping DrawBot server...');

        try {
            // Stop health monitoring
            if (this.healthChecker) {
                clearInterval(this.healthChecker);
                this.healthChecker = undefined;
            }

            // Close WebSocket connections
            this.wsManager?.dispose();
            this.wsManager = undefined;

            // Dispose API client
            this.apiClient?.dispose();
            this.apiClient = undefined;

            // Terminate server process
            if (this.serverProcess) {
                console.log('Sending SIGTERM to server process');
                this.serverProcess.kill('SIGTERM');

                // Force kill after timeout
                setTimeout(() => {
                    if (this.serverProcess && !this.serverProcess.killed) {
                        console.log('Force killing server process');
                        this.serverProcess.kill('SIGKILL');
                    }
                }, 5000);

                // Wait for process to exit
                await new Promise<void>((resolve) => {
                    if (!this.serverProcess) {
                        resolve();
                        return;
                    }

                    this.serverProcess.on('exit', () => resolve());
                    setTimeout(() => resolve(), 10000); // Max wait 10 seconds
                });
            }

            // Clean up PID file
            if (fs.existsSync(this.pidFile)) {
                fs.unlinkSync(this.pidFile);
            }

            this.serverProcess = undefined;
            console.log('DrawBot server stopped');

        } catch (error) {
            this.errorManager.handleError(
                error as Error,
                ErrorSeverity.WARNING,
                ErrorCategory.SERVER,
                'Server shutdown error'
            );
        } finally {
            this.isShuttingDown = false;
        }
    }

    /**
     * Get server health status
     */
    async getHealth(): Promise<ServerHealth> {
        if (!this.apiClient) {
            return {
                status: 'unhealthy',
                version: 'unknown',
                uptime: 0,
                memoryUsage: 0,
                activeConnections: 0,
                lastError: 'Server not started'
            };
        }

        try {
            return await this.apiClient.getHealth();
        } catch (error) {
            return {
                status: 'unhealthy',
                version: 'unknown',
                uptime: 0,
                memoryUsage: 0,
                activeConnections: 0,
                lastError: (error as Error).message
            };
        }
    }

    /**
     * Check if server needs restart due to configuration changes
     */
    needsRestart(newConfig: ExtensionConfig): boolean {
        return (
            newConfig.serverPort !== this.config.serverPort ||
            newConfig.pythonPath !== this.config.pythonPath ||
            newConfig.virtualEnvPath !== this.config.virtualEnvPath
        );
    }

    /**
     * Restart server with new configuration
     */
    async restart(config: ExtensionConfig): Promise<void> {
        console.log('Restarting DrawBot server with new configuration');
        await this.stopServer();
        this.config = config;
        await this.startServer();
    }

    /**
     * Get API client instance
     */
    getAPIClient(): TypeSafeAPIClient | undefined {
        return this.apiClient;
    }

    /**
     * Get WebSocket manager instance
     */
    getWebSocketManager(): TypeSafeWebSocketManager | undefined {
        return this.wsManager;
    }

    /**
     * Check if server is running
     */
    isRunning(): boolean {
        return this.serverProcess !== undefined && !this.serverProcess.killed;
    }

    /**
     * Validate DrawBot environment
     */
    private async validateEnvironment(): Promise<boolean> {
        try {
            const pythonExecutable = await this.findPythonExecutable();
            
            // Check DrawBot installation
            const result = await new Promise<boolean>((resolve) => {
                const checkProcess = spawn(pythonExecutable, ['-c', 'import drawBot; print("OK")'], {
                    stdio: 'pipe'
                });
                
                checkProcess.on('close', (code) => {
                    resolve(code === 0);
                });
                
                setTimeout(() => resolve(false), 10000); // 10 second timeout
            });
            
            if (!result) {
                this.errorManager.handleError(
                    new Error('DrawBot not found in Python environment'),
                    ErrorSeverity.FATAL,
                    ErrorCategory.SERVER
                );
            }
            
            return result;
        } catch (error) {
            this.errorManager.handleError(
                error as Error,
                ErrorSeverity.FATAL,
                ErrorCategory.SERVER,
                'Environment validation failed'
            );
            return false;
        }
    }

    /**
     * Find the correct Python executable
     */
    private async findPythonExecutable(): Promise<string> {
        const candidates = [
            this.config.pythonPath !== 'auto' ? this.config.pythonPath : null,
            this.config.virtualEnvPath ? path.join(this.config.virtualEnvPath, 'bin', 'python') : null,
            this.config.virtualEnvPath ? path.join(this.config.virtualEnvPath, 'Scripts', 'python.exe') : null,
            'python3',
            'python'
        ].filter(Boolean) as string[];

        for (const candidate of candidates) {
            try {
                const isValid = await new Promise<boolean>((resolve) => {
                    const testProcess = spawn(candidate, ['--version'], { stdio: 'pipe' });
                    testProcess.on('close', (code) => resolve(code === 0));
                    setTimeout(() => resolve(false), 5000);
                });

                if (isValid) {
                    console.log(`Found Python executable: ${candidate}`);
                    return candidate;
                }
            } catch {
                continue;
            }
        }

        throw new Error('No valid Python executable found');
    }

    /**
     * Find an available port starting from the configured port
     */
    private async findAvailablePort(startPort: number): Promise<number> {
        // For now, just return the configured port
        // In a full implementation, we'd check if the port is available
        return startPort;
    }

    /**
     * Get the project root directory (where sketchbook.py is located)
     */
    private getProjectRoot(): string {
        // This should point to the DrawBot Sketchbook project directory
        // For now, we'll assume it's in a relative location
        const currentDir = __dirname;
        const possibleRoots = [
            path.join(currentDir, '..', '..', '..', '..'), // Go up from extension to main project
            path.join(currentDir, '..', '..', '..'),
            path.join(currentDir, '..', '..')
        ];

        for (const root of possibleRoots) {
            if (fs.existsSync(path.join(root, 'sketchbook.py'))) {
                return root;
            }
        }

        throw new Error('Could not find DrawBot Sketchbook project root');
    }

    /**
     * Wait for server to be ready
     */
    private async waitForServerReady(port: number): Promise<boolean> {
        const maxAttempts = 30; // 30 seconds
        const interval = 1000; // 1 second

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const tempClient = new TypeSafeAPIClient(`http://localhost:${port}`);
                const health = await tempClient.getHealth();
                tempClient.dispose();
                
                if (health.status === 'healthy') {
                    return true;
                }
            } catch {
                // Server not ready yet
            }

            await new Promise(resolve => setTimeout(resolve, interval));
        }

        return false;
    }

    /**
     * Setup process monitoring
     */
    private setupProcessMonitoring(): void {
        if (!this.serverProcess) {
            return;
        }

        this.serverProcess.stdout?.on('data', (data) => {
            console.log(`Server stdout: ${data.toString().trim()}`);
        });

        this.serverProcess.stderr?.on('data', (data) => {
            console.error(`Server stderr: ${data.toString().trim()}`);
        });

        this.serverProcess.on('exit', (code, signal) => {
            console.log(`Server process exited with code ${code} and signal ${signal}`);
            if (!this.isShuttingDown && code !== 0) {
                this.errorManager.handleError(
                    new Error(`Server process crashed with code ${code}`),
                    ErrorSeverity.FATAL,
                    ErrorCategory.SERVER
                );
            }
        });

        this.serverProcess.on('error', (error) => {
            this.errorManager.handleError(
                error,
                ErrorSeverity.FATAL,
                ErrorCategory.SERVER,
                'Server process error'
            );
        });
    }

    /**
     * Start periodic health monitoring
     */
    private startHealthMonitoring(): void {
        this.healthChecker = setInterval(async () => {
            try {
                const health = await this.getHealth();
                if (health.status !== 'healthy') {
                    console.warn('Server health check failed:', health);
                }
                // TODO: Emit health status events for UI updates
            } catch (error) {
                console.error('Health check error:', error);
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Clean up orphaned processes from previous runs
     */
    private async cleanupOrphanedProcesses(): Promise<void> {
        if (!fs.existsSync(this.pidFile)) {
            return;
        }

        try {
            const pidString = fs.readFileSync(this.pidFile, 'utf8').trim();
            const pid = parseInt(pidString);

            if (!isNaN(pid)) {
                // Check if process exists
                try {
                    process.kill(pid, 0); // Test if process exists
                    console.log(`Found orphaned server process ${pid}, terminating...`);
                    process.kill(pid, 'SIGTERM');
                    
                    // Wait a bit then force kill if necessary
                    setTimeout(() => {
                        try {
                            process.kill(pid, 'SIGKILL');
                        } catch {
                            // Process already dead
                        }
                    }, 5000);
                } catch {
                    // Process doesn't exist, just clean up PID file
                }
            }
        } catch (error) {
            console.error('Error cleaning up orphaned processes:', error);
        } finally {
            try {
                fs.unlinkSync(this.pidFile);
            } catch {
                // File might not exist or be accessible
            }
        }
    }

    /**
     * Setup cleanup handlers for all exit scenarios
     */
    private setupCleanupHandlers(): void {
        const cleanup = () => {
            if (!this.isShuttingDown) {
                this.stopServer();
            }
        };

        process.on('exit', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('uncaughtException', (error) => {
            console.error('Uncaught exception, cleaning up server:', error);
            cleanup();
        });
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.stopServer();
    }
}
/**
 * Comprehensive VS Code API mock
 * Provides full mock implementation of vscode module for testing
 */

import { vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock event emitter for various VS Code events
const mockEventEmitter = new EventEmitter();

// Mock configuration store
const mockConfiguration: { [key: string]: any } = {
  'drawbot.serverPort': 8083,
  'drawbot.autoExecuteOnSave': false,
  'drawbot.previewImageMaxSize': 1024,
  'drawbot.pythonPath': 'auto',
  'drawbot.virtualEnvPath': '',
  'drawbot.enableLiveReload': true
};

// Mock workspace folders
const mockWorkspaceFolders = [
  {
    uri: { fsPath: '/test/workspace', scheme: 'file' },
    name: 'test-workspace',
    index: 0
  }
];

// Mock disposables registry
const mockDisposables: any[] = [];

// Mock commands registry
const mockCommands: Map<string, Function> = new Map();

// Mock webview panels
const mockWebviewPanels: Map<string, any> = new Map();

export const commands = {
  registerCommand: vi.fn((command: string, callback: Function) => {
    mockCommands.set(command, callback);
    const disposable = { dispose: vi.fn() };
    mockDisposables.push(disposable);
    return disposable;
  }),
  
  executeCommand: vi.fn(async (command: string, ...args: any[]) => {
    const handler = mockCommands.get(command);
    if (handler) {
      return await handler(...args);
    }
    throw new Error(`Command not found: ${command}`);
  }),
  
  getCommands: vi.fn(async () => Array.from(mockCommands.keys()))
};

export const window = {
  showInformationMessage: vi.fn(async (message: string, ...items: string[]) => {
    console.log(`INFO: ${message}`);
    return items[0]; // Return first item by default
  }),
  
  showWarningMessage: vi.fn(async (message: string, ...items: string[]) => {
    console.log(`WARN: ${message}`);
    return items[0];
  }),
  
  showErrorMessage: vi.fn(async (message: string, ...items: string[]) => {
    console.log(`ERROR: ${message}`);
    return items[0];
  }),
  
  showQuickPick: vi.fn(async (items: any[], options?: any) => {
    return Array.isArray(items) ? items[0] : undefined;
  }),
  
  showInputBox: vi.fn(async (options?: any) => {
    return options?.value || 'test-input';
  }),
  
  showOpenDialog: vi.fn(async (options?: any) => {
    return [{ fsPath: '/test/file.py' }];
  }),
  
  showSaveDialog: vi.fn(async (options?: any) => {
    return { fsPath: '/test/save-file.py' };
  }),
  
  createStatusBarItem: vi.fn((alignment?: any, priority?: number) => ({
    text: '',
    tooltip: '',
    command: '',
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn()
  })),
  
  createWebviewPanel: vi.fn((viewType: string, title: string, showOptions: any, options?: any) => {
    const panel = {
      webview: {
        html: '',
        options: options?.webviewOptions || {},
        postMessage: vi.fn(),
        onDidReceiveMessage: mockEventEmitter.on.bind(mockEventEmitter),
        asWebviewUri: vi.fn((uri: any) => uri),
        cspSource: 'vscode-webview:'
      },
      title,
      viewType,
      visible: true,
      active: true,
      onDidDispose: mockEventEmitter.on.bind(mockEventEmitter),
      onDidChangeViewState: mockEventEmitter.on.bind(mockEventEmitter),
      reveal: vi.fn(),
      dispose: vi.fn(() => {
        mockWebviewPanels.delete(viewType);
        mockEventEmitter.emit('dispose');
      })
    };
    
    mockWebviewPanels.set(viewType, panel);
    return panel;
  }),
  
  createTreeView: vi.fn((viewId: string, options: any) => ({
    reveal: vi.fn(),
    dispose: vi.fn(),
    onDidChangeSelection: mockEventEmitter.on.bind(mockEventEmitter),
    onDidChangeVisibility: mockEventEmitter.on.bind(mockEventEmitter)
  })),
  
  activeTextEditor: {
    document: {
      uri: { fsPath: '/test/active-file.py', scheme: 'file' },
      fileName: 'active-file.py',
      languageId: 'python',
      getText: vi.fn(() => 'print("Hello, World!")'),
      save: vi.fn(async () => true)
    },
    selection: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
  },
  
  visibleTextEditors: []
};

export const workspace = {
  getConfiguration: vi.fn((section?: string) => ({
    get: vi.fn((key: string, defaultValue?: any) => {
      const fullKey = section ? `${section}.${key}` : key;
      return mockConfiguration[fullKey] ?? defaultValue;
    }),
    
    update: vi.fn(async (key: string, value: any, configurationTarget?: any) => {
      const fullKey = section ? `${section}.${key}` : key;
      mockConfiguration[fullKey] = value;
    }),
    
    has: vi.fn((key: string) => {
      const fullKey = section ? `${section}.${key}` : key;
      return fullKey in mockConfiguration;
    }),
    
    inspect: vi.fn((key: string) => ({
      key,
      defaultValue: undefined,
      globalValue: undefined,
      workspaceValue: undefined,
      workspaceFolderValue: undefined
    }))
  })),
  
  workspaceFolders: mockWorkspaceFolders,
  
  findFiles: vi.fn(async (include: string, exclude?: string) => {
    // Return mock files based on pattern
    if (include.includes('*.py')) {
      return [
        { fsPath: '/test/workspace/sketch1.py', scheme: 'file' },
        { fsPath: '/test/workspace/sketch2.py', scheme: 'file' }
      ];
    }
    return [];
  }),
  
  openTextDocument: vi.fn(async (uri: any) => ({
    uri: typeof uri === 'string' ? { fsPath: uri, scheme: 'file' } : uri,
    fileName: typeof uri === 'string' ? uri : uri.fsPath,
    languageId: 'python',
    getText: vi.fn(() => 'import drawBot as drawbot\ndrawbot.size(400, 400)'),
    save: vi.fn(async () => true),
    isDirty: false,
    isUntitled: false
  })),
  
  saveAll: vi.fn(async () => true),
  
  onDidSaveTextDocument: vi.fn((listener: Function) => {
    mockEventEmitter.on('didSaveTextDocument', listener);
    return { dispose: vi.fn() };
  }),
  
  onDidChangeTextDocument: vi.fn((listener: Function) => {
    mockEventEmitter.on('didChangeTextDocument', listener);
    return { dispose: vi.fn() };
  }),
  
  onDidChangeWorkspaceFolders: vi.fn((listener: Function) => {
    mockEventEmitter.on('didChangeWorkspaceFolders', listener);
    return { dispose: vi.fn() };
  }),
  
  onDidChangeConfiguration: vi.fn((listener: Function) => {
    mockEventEmitter.on('didChangeConfiguration', listener);
    return { dispose: vi.fn() };
  }),
  
  createFileSystemWatcher: vi.fn((globPattern: string) => ({
    onDidCreate: vi.fn((listener: Function) => {
      mockEventEmitter.on('fileCreated', listener);
      return { dispose: vi.fn() };
    }),
    onDidChange: vi.fn((listener: Function) => {
      mockEventEmitter.on('fileChanged', listener);
      return { dispose: vi.fn() };
    }),
    onDidDelete: vi.fn((listener: Function) => {
      mockEventEmitter.on('fileDeleted', listener);
      return { dispose: vi.fn() };
    }),
    dispose: vi.fn()
  }))
};

export const env = {
  openExternal: vi.fn(async (uri: any) => true),
  clipboard: {
    writeText: vi.fn(async (text: string) => undefined),
    readText: vi.fn(async () => 'clipboard-content')
  }
};

export const Uri = {
  file: vi.fn((path: string) => ({ fsPath: path, scheme: 'file' })),
  parse: vi.fn((uri: string) => ({ fsPath: uri, scheme: 'file' })),
  joinPath: vi.fn((...parts: any[]) => ({ fsPath: parts.join('/'), scheme: 'file' }))
};

export const Disposable = {
  from: vi.fn((...disposables: any[]) => ({
    dispose: vi.fn(() => {
      disposables.forEach(d => d.dispose && d.dispose());
    })
  }))
};

export const EventEmitter = class MockEventEmitter {
  private emitter = new EventEmitter();
  
  on = vi.fn((event: string, listener: Function) => {
    this.emitter.on(event, listener);
    return { dispose: vi.fn() };
  });
  
  fire = vi.fn((data?: any) => {
    this.emitter.emit('fire', data);
  });
  
  dispose = vi.fn();
};

// Enums and constants
export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
  Active: -1,
  Beside: -2
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2
};

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2
};

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

// Test utilities for manipulating mock state
export const __mockUtils = {
  reset: () => {
    mockCommands.clear();
    mockWebviewPanels.clear();
    mockDisposables.length = 0;
    mockEventEmitter.removeAllListeners();
    
    // Reset configuration to defaults
    Object.keys(mockConfiguration).forEach(key => {
      delete mockConfiguration[key];
    });
    mockConfiguration['drawbot.serverPort'] = 8083;
    mockConfiguration['drawbot.autoExecuteOnSave'] = false;
    mockConfiguration['drawbot.previewImageMaxSize'] = 1024;
    mockConfiguration['drawbot.pythonPath'] = 'auto';
    mockConfiguration['drawbot.virtualEnvPath'] = '';
    mockConfiguration['drawbot.enableLiveReload'] = true;
  },
  
  setConfiguration: (key: string, value: any) => {
    mockConfiguration[key] = value;
  },
  
  getConfiguration: () => ({ ...mockConfiguration }),
  
  getCommands: () => Array.from(mockCommands.keys()),
  
  getWebviewPanels: () => Array.from(mockWebviewPanels.values()),
  
  triggerEvent: (event: string, data?: any) => {
    mockEventEmitter.emit(event, data);
  },
  
  setActiveEditor: (document: any) => {
    window.activeTextEditor = {
      document,
      selection: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
    };
  },
  
  setWorkspaceFolders: (folders: any[]) => {
    workspace.workspaceFolders = folders;
  }
};
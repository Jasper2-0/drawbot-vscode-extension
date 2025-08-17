import { vi } from 'vitest';

// Mock VS Code API for testing
export const mockVSCode = {
  // Commands
  commands: {
    registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
    executeCommand: vi.fn(),
  },

  // Window
  window: {
    createWebviewPanel: vi.fn(() => ({
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn(),
        postMessage: vi.fn().mockResolvedValue(true),
        asWebviewUri: vi.fn(uri => uri),
        cspSource: 'vscode-webview:',
        options: {}
      },
      onDidDispose: vi.fn(),
      dispose: vi.fn(),
      reveal: vi.fn(),
      visible: true,
      active: true,
      viewColumn: 1
    })),
    
    createTreeView: vi.fn(() => ({
      onDidChangeSelection: vi.fn(),
      onDidChangeVisibility: vi.fn(),
      dispose: vi.fn(),
      reveal: vi.fn()
    })),
    
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showQuickPick: vi.fn(),
    showInputBox: vi.fn(),
    
    createStatusBarItem: vi.fn(() => ({
      text: '',
      tooltip: '',
      color: undefined,
      command: undefined,
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn()
    })),
    
    showTextDocument: vi.fn(),
    activeTextEditor: undefined,
    visibleTextEditors: []
  },

  // Workspace
  workspace: {
    openTextDocument: vi.fn(),
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key, defaultValue) => defaultValue),
      update: vi.fn(),
      has: vi.fn(() => true)
    })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    workspaceFolders: [],
    rootPath: '/mock/workspace',
    name: 'Mock Workspace'
  },

  // Uri
  Uri: {
    file: vi.fn(path => ({ 
      scheme: 'file', 
      fsPath: path, 
      path, 
      toString: () => `file://${path}`,
      with: vi.fn(options => ({ ...this, ...options }))
    })),
    parse: vi.fn(str => ({
      scheme: 'file',
      fsPath: str,
      path: str,
      toString: () => str
    }))
  },

  // TreeItem
  TreeItem: vi.fn().mockImplementation(function(label, collapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
    this.iconPath = undefined;
    this.command = undefined;
    this.contextValue = undefined;
  }),

  // TreeItemCollapsibleState
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },

  // ViewColumn
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9
  },

  // ConfigurationTarget
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  },

  // StatusBarAlignment
  StatusBarAlignment: {
    Left: 1,
    Right: 2
  },

  // Environment
  env: {
    openExternal: vi.fn(),
    clipboard: {
      writeText: vi.fn(),
      readText: vi.fn()
    },
    machineId: 'mock-machine-id',
    sessionId: 'mock-session-id'
  },

  // Extensions
  extensions: {
    getExtension: vi.fn(),
    all: []
  },

  // Languages
  languages: {
    registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() }))
  },

  // Disposable
  Disposable: {
    from: vi.fn(() => ({ dispose: vi.fn() }))
  },

  // EventEmitter
  EventEmitter: vi.fn().mockImplementation(function() {
    this.event = vi.fn();
    this.fire = vi.fn();
    this.dispose = vi.fn();
  }),

  // CancellationToken
  CancellationToken: {
    None: {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn()
    }
  },

  // Progress
  ProgressLocation: {
    SourceControl: 1,
    Window: 10,
    Notification: 15
  },

  // Custom Editor Provider
  CustomDocument: vi.fn(),
  
  // Mock custom editor methods
  registerCustomEditorProvider: vi.fn(() => ({ dispose: vi.fn() }))
};

// Export individual mocks for specific testing needs
export const mockCommands = mockVSCode.commands;
export const mockWindow = mockVSCode.window;
export const mockWorkspace = mockVSCode.workspace;
export const mockUri = mockVSCode.Uri;
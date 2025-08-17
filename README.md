# DrawBot Sketchbook VS Code Extension

A VS Code extension that provides native IDE integration for DrawBot sketches with live preview and execution capabilities.

## Features

- **Live Preview**: Real-time visual feedback as you code
- **Native Integration**: Seamless VS Code experience with familiar UI patterns
- **Sketch Management**: Organize and execute DrawBot sketches directly in VS Code
- **Multi-page Support**: Handle complex documents with multiple pages
- **Template System**: Create new sketches from built-in templates
- **Cross-platform**: Syntax highlighting on all platforms, full functionality on macOS

## Platform Compatibility

⚠️ **DrawBot requires macOS for full functionality**

- **macOS**: Full feature set including live preview and sketch execution
- **Windows/Linux**: Syntax highlighting and file management only

## Installation

### Prerequisites

1. **macOS** (for full functionality)
2. **Python 3.7+** with DrawBot installed
3. **VS Code 1.60.0+**

### Install DrawBot

```bash
# Install DrawBot (macOS only)
pip install git+https://github.com/typemytype/drawbot
```

### Install Extension

1. Download the `.vsix` file from releases
2. Install in VS Code: `Extensions > Install from VSIX...`

## Quick Start

1. **Open a DrawBot project** in VS Code
2. **Start the server**: Command Palette → "DrawBot: Start Live Preview Server"
3. **Open a sketch**: Click any `.py` file in the DrawBot explorer
4. **Execute**: Press `Cmd+Shift+D` or click the Execute button
5. **View preview**: The preview panel will show your rendered sketch

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `DrawBot: Start Live Preview Server` | | Start the preview server |
| `DrawBot: Execute Sketch` | `Cmd+Shift+D` | Execute the current sketch |
| `DrawBot: Open Preview` | `Cmd+K V` | Open preview for current file |
| `DrawBot: Stop Live Preview Server` | | Stop the preview server |

## Configuration

```json
{
  "drawbot.serverPort": 8083,
  "drawbot.autoExecuteOnSave": false,
  "drawbot.previewImageMaxSize": 1024,
  "drawbot.pythonPath": "auto",
  "drawbot.virtualEnvPath": "",
  "drawbot.enableLiveReload": true
}
```

## Development

This extension integrates with the [DrawBot Sketchbook](https://github.com/Jasper2-0/drawbot-vscode-sketchbook) project to provide a complete creative coding environment.

### Architecture

- **TypeScript** with strict type safety
- **Native VS Code UI** components (TreeView, CustomEditor, StatusBar)
- **Security-first** approach with sandboxed execution
- **Performance optimized** with image compression and caching
- **Cross-platform compatible** with graceful degradation

### Building from Source

```bash
git clone https://github.com/Jasper2-0/drawbot-vscode-extension.git
cd drawbot-vscode-extension
npm install
npm run compile
```

### Testing

```bash
npm run test
npm run test:integration
```

## Security

The extension implements several security measures:

- **Sandboxed execution** of user sketches
- **File path validation** to prevent directory traversal
- **Content Security Policy** for webviews
- **Module restrictions** for Python execution

## Performance

- **Memory management** for large images
- **Intelligent caching** with size limits
- **Performance monitoring** with automatic cleanup
- **Resource optimization** for webviews

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [GitHub Issues](https://github.com/Jasper2-0/drawbot-vscode-extension/issues)
- [Documentation](https://github.com/Jasper2-0/drawbot-vscode-extension/wiki)
- [DrawBot Documentation](https://drawbot.com)
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { SketchInfo, ExecutionResult, ServerHealth } from '../../types/api';

// Mock sketches data
const mockSketches: SketchInfo[] = [
  {
    name: 'test_sketch',
    lastModified: '2025-01-01T00:00:00Z',
    size: 1024,
    category: 'user',
    hasErrors: false,
    pageCount: 1,
    path: '/mock/sketches/test_sketch.py'
  },
  {
    name: 'example_shapes',
    lastModified: '2025-01-01T00:00:00Z',
    size: 2048,
    category: 'example',
    hasErrors: false,
    pageCount: 3,
    path: '/mock/examples/example_shapes.py'
  },
  {
    name: 'basic_template',
    lastModified: '2025-01-01T00:00:00Z',
    size: 512,
    category: 'template',
    hasErrors: false,
    pageCount: 1,
    path: '/mock/templates/basic_template.py'
  }
];

// Mock server health
const mockServerHealth: ServerHealth = {
  status: 'healthy',
  version: '1.0.0',
  uptime: 3600,
  memoryUsage: 50 * 1024 * 1024, // 50MB
  activeConnections: 2
};

// Setup MSW server with DrawBot API endpoints
export const mockServer = setupServer(
  // Health check endpoint
  rest.get('http://localhost:8083/health', (req, res, ctx) => {
    return res(ctx.json(mockServerHealth));
  }),

  // Get all sketches
  rest.get('http://localhost:8083/api/v1/sketches', (req, res, ctx) => {
    const category = req.url.searchParams.get('category');
    let filteredSketches = mockSketches;
    
    if (category && category !== 'all') {
      filteredSketches = mockSketches.filter(sketch => sketch.category === category);
    }
    
    return res(ctx.json(filteredSketches));
  }),

  // Execute sketch
  rest.post('http://localhost:8083/api/v1/sketches/:name/execute', (req, res, ctx) => {
    const { name } = req.params;
    const sketch = mockSketches.find(s => s.name === name);
    
    if (!sketch) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Sketch not found' })
      );
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: 0.8,
      outputPath: `/cache/${name}_preview.png`,
      pages: sketch.pageCount || 1,
      previewUrl: `http://localhost:8083/preview/${name}.png`,
      metadata: {
        sketchName: name,
        timestamp: Date.now(),
        cacheKey: `${name}_${Date.now()}`
      }
    };

    return res(ctx.json(result));
  }),

  // Get sketch status
  rest.get('http://localhost:8083/api/v1/sketches/:name/status', (req, res, ctx) => {
    const { name } = req.params;
    return res(ctx.json({
      name,
      status: 'ready',
      lastExecution: Date.now() - 1000,
      hasPreview: true
    }));
  }),

  // Batch execute
  rest.post('http://localhost:8083/api/v1/batch/execute', async (req, res, ctx) => {
    const body = await req.json() as { sketches: string[] };
    const results: Record<string, ExecutionResult> = {};
    
    for (const sketchName of body.sketches) {
      const sketch = mockSketches.find(s => s.name === sketchName);
      if (sketch) {
        results[sketchName] = {
          success: true,
          executionTime: 0.5,
          outputPath: `/cache/${sketchName}_preview.png`,
          pages: sketch.pageCount || 1,
          previewUrl: `http://localhost:8083/preview/${sketchName}.png`
        };
      }
    }
    
    return res(ctx.json(results));
  }),

  // Get preview image
  rest.get('http://localhost:8083/preview/:filename', (req, res, ctx) => {
    const { filename } = req.params;
    // Return mock image data
    return res(
      ctx.set('Content-Type', 'image/png'),
      ctx.body(new ArrayBuffer(1024)) // Mock image data
    );
  }),

  // Export sketch
  rest.post('http://localhost:8083/api/v1/sketches/:name/export', async (req, res, ctx) => {
    const { name } = req.params;
    const body = await req.json() as { format: string; quality?: number };
    
    return res(ctx.json({
      success: true,
      exportPath: `/exports/${name}.${body.format}`,
      downloadUrl: `http://localhost:8083/download/${name}.${body.format}`
    }));
  }),

  // Server metrics
  rest.get('http://localhost:8083/api/v1/metrics', (req, res, ctx) => {
    return res(ctx.json({
      requests: 150,
      errors: 2,
      averageResponseTime: 245,
      memoryUsage: mockServerHealth.memoryUsage,
      uptime: mockServerHealth.uptime
    }));
  }),

  // Error simulation endpoint for testing
  rest.get('http://localhost:8083/api/v1/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal server error', code: 'SERVER_ERROR' })
    );
  }),

  // Network timeout simulation
  rest.get('http://localhost:8083/api/v1/timeout', (req, res, ctx) => {
    return res(ctx.delay(30000)); // 30 second delay to trigger timeout
  })
);

// Helper functions for tests
export const mockServerHelpers = {
  // Simulate server being down
  simulateServerDown: () => {
    mockServer.use(
      rest.get('http://localhost:8083/health', (req, res, ctx) => {
        return res(ctx.status(503), ctx.json({ error: 'Service unavailable' }));
      })
    );
  },

  // Simulate execution error
  simulateExecutionError: (sketchName: string, errorMessage: string) => {
    mockServer.use(
      rest.post(`http://localhost:8083/api/v1/sketches/${sketchName}/execute`, (req, res, ctx) => {
        return res(ctx.json({
          success: false,
          executionTime: 0.1,
          errorMessage,
          pages: 0
        }));
      })
    );
  },

  // Reset to healthy state
  resetToHealthy: () => {
    mockServer.resetHandlers();
  },

  // Add custom sketch to mock data
  addMockSketch: (sketch: SketchInfo) => {
    mockSketches.push(sketch);
  },

  // Clear mock sketches
  clearMockSketches: () => {
    mockSketches.length = 0;
  }
};
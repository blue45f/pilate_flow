import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudioInteractive3DViewport } from '../components/StudioInteractive3DViewport';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  FLOATS_PER_VERTEX,
  Studio3DWebGL2Renderer,
  triangulateAndWeldQuads,
  type StudioQuadFace,
} from './studio3dWebgl2Renderer';
import {
  acquirePreferredStudio3DBackend,
  resetSharedStudio3DWebGPURendererForTests,
  STUDIO_3D_WGSL_SHADER,
  Studio3DWebGPURenderer,
  type MinimalGPUDeviceLostInfo,
  type MinimalNavigatorGPU,
} from './studio3dWebgpuRenderer';

function createMockWebGPUHarness() {
  let triggerLost: ((info: MinimalGPUDeviceLostInfo) => void) | null = null;
  const lostPromise = new Promise<MinimalGPUDeviceLostInfo>((resolve) => {
    triggerLost = resolve;
  });

  const pass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    setVertexBuffer: vi.fn(),
    draw: vi.fn(),
    end: vi.fn(),
  };
  const encoder = {
    beginRenderPass: vi.fn(() => pass),
    finish: vi.fn(() => ({ label: 'cmd-buf' })),
  };
  const queue = {
    writeBuffer: vi.fn(),
    submit: vi.fn(),
  };
  const createdTextures: Array<{
    descriptor: Record<string, unknown>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const createdBuffers: Array<{
    descriptor: Record<string, unknown>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const createdPipelines: Array<Record<string, unknown>> = [];

  const device = {
    queue,
    lost: lostPromise,
    createShaderModule: vi.fn(() => ({ label: 'wgsl' })),
    createBuffer: vi.fn((descriptor: Record<string, unknown>) => {
      const destroy = vi.fn();
      createdBuffers.push({ descriptor, destroy });
      return { destroy };
    }),
    createTexture: vi.fn((descriptor: Record<string, unknown>) => {
      const destroy = vi.fn();
      createdTextures.push({ descriptor, destroy });
      return {
        createView: vi.fn(() => ({ label: String(descriptor.label ?? 'view') })),
        destroy,
      };
    }),
    createRenderPipeline: vi.fn((descriptor: Record<string, unknown>) => {
      createdPipelines.push(descriptor);
      return {
        getBindGroupLayout: vi.fn(() => ({ label: `bgl-${createdPipelines.length}` })),
      };
    }),
    createBindGroup: vi.fn(() => ({ label: 'bg' })),
    createCommandEncoder: vi.fn(() => encoder),
    destroy: vi.fn(),
  };

  const gpuContext = {
    configure: vi.fn(),
    unconfigure: vi.fn(),
    getCurrentTexture: vi.fn(() => ({
      createView: vi.fn(() => ({ label: 'swapchain-view' })),
      destroy: vi.fn(),
    })),
  };

  const gpu: MinimalNavigatorGPU = {
    requestAdapter: vi.fn(async () => ({
      requestDevice: vi.fn(async () => device),
    })),
    getPreferredCanvasFormat: vi.fn(() => 'bgra8unorm'),
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn((kind: string) => (kind === 'webgpu' ? gpuContext : null)),
  } as unknown as HTMLCanvasElement;

  return {
    gpu,
    device,
    queue,
    encoder,
    pass,
    gpuContext,
    canvas,
    createdTextures,
    createdBuffers,
    createdPipelines,
    triggerLost: (info: MinimalGPUDeviceLostInfo) => triggerLost?.(info),
  };
}

function createMockWebGL2Canvas() {
  const gl = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    FLOAT: 0x1406,
    DYNAMIC_DRAW: 0x88e8,
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x0100,
    DEPTH_TEST: 0x0b71,
    LEQUAL: 0x0203,
    CULL_FACE: 0x0b44,
    BLEND: 0x0be2,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    TRIANGLES: 0x0004,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    deleteBuffer: vi.fn(),
    createVertexArray: vi.fn(() => ({})),
    deleteVertexArray: vi.fn(),
    bindVertexArray: vi.fn(),
    bindBuffer: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clearDepth: vi.fn(),
    depthMask: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    depthFunc: vi.fn(),
    useProgram: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniform1i: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    drawArrays: vi.fn(),
    blendFunc: vi.fn(),
    isContextLost: vi.fn(() => false),
  } as unknown as WebGL2RenderingContext;

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn((kind: string) => (kind === 'webgl2' ? gl : null)),
    addEventListener: vi.fn(),
  } as unknown as HTMLCanvasElement;

  return { canvas, gl };
}

function makeSampleSkinQuads(): StudioQuadFace[] {
  return [
    {
      verts: [
        [0, 0, 0.5],
        [0.1, 0, 0.5],
        [0.1, 0.1, 0.5],
        [0, 0.1, 0.5],
      ],
      baseRgb: [246, 214, 195],
      alpha: 1,
      spec: 0.11,
      materialRole: 'skin',
    },
    {
      verts: [
        [0.1, 0, 0.5],
        [0.1866, 0, 0.55],
        [0.1866, 0.1, 0.55],
        [0.1, 0.1, 0.5],
      ],
      baseRgb: [246, 214, 195],
      alpha: 1,
      spec: 0.11,
      materialRole: 'skin',
    },
  ];
}

const originalNavGpu = Object.getOwnPropertyDescriptor(navigator, 'gpu');

afterEach(() => {
  cleanup();
  resetSharedStudio3DWebGPURendererForTests();
  vi.restoreAllMocks();
  if (originalNavGpu) {
    Object.defineProperty(navigator, 'gpu', originalNavGpu);
  } else {
    Reflect.deleteProperty(navigator, 'gpu');
  }
});

describe('Priority-1 WebGPU -> Priority-2 WebGL2 -> Priority-3 Canvas2D Studio 3D Pipeline', () => {
  it('validates WGSL shader source for PBR/SSS wrap, silk hair, Fresnel rim, anatomical terracotta activation, uniform fwidth, and WebGPU [0,1] depth', () => {
    expect(STUDIO_3D_WGSL_SHADER).toContain('@vertex');
    expect(STUDIO_3D_WGSL_SHADER).toContain('@fragment');
    expect(STUDIO_3D_WGSL_SHADER).toContain('let quadFw = max(fwidth(in.quadUv)');
    expect(STUDIO_3D_WGSL_SHADER).toContain('sssGlow');
    expect(STUDIO_3D_WGSL_SHADER).toContain('hairRim');
    expect(STUDIO_3D_WGSL_SHADER).toContain('rimDir');
    expect(STUDIO_3D_WGSL_SHADER).toContain('(farP / (farP - nearP)) * (zCam - nearP)');
    // Fresnel-contoured warm botanical terracotta-gold anatomical heatmap activation before AgX tone mapping
    expect(STUDIO_3D_WGSL_SHADER).toContain('if (emissive > 0.05 && (role == 1 || role == 3))');
    expect(STUDIO_3D_WGSL_SHADER).toContain('vec3<f32>(0.92, 0.48, 0.28)');
    expect(STUDIO_3D_WGSL_SHADER).toContain('0.38 + 0.62 * anatFresnel');
    expect(STUDIO_3D_WGSL_SHADER).toContain('1.8');
    const anatIdx = STUDIO_3D_WGSL_SHADER.indexOf('anatTerracotta');
    const agxIdx = STUDIO_3D_WGSL_SHADER.indexOf('col = filmicAgxRolloff(col)');
    expect(anatIdx).toBeGreaterThan(-1);
    expect(agxIdx).toBeGreaterThan(anatIdx);
  });

  it('always selects WebGPU as Priority 1 when navigator.gpu succeeds, even when WebGL2 is also available', async () => {
    const webgpuHarness = createMockWebGPUHarness();
    const webgl2Harness = createMockWebGL2Canvas();

    const acquired = await acquirePreferredStudio3DBackend({
      webgpuCanvas: webgpuHarness.canvas,
      webgl2Canvas: webgl2Harness.canvas,
      gpu: webgpuHarness.gpu,
    });

    expect(acquired.backend).toBe('webgpu');
    expect(acquired.renderer).toBeInstanceOf(Studio3DWebGPURenderer);
    // WebGL2 must not even be queried once Priority-1 WebGPU succeeds
    expect(webgl2Harness.canvas.getContext).not.toHaveBeenCalled();

    // Verify 4x MSAA + depth24plus pipeline configuration
    expect(webgpuHarness.createdPipelines).toHaveLength(2);
    expect(webgpuHarness.createdPipelines[0]).toMatchObject({
      multisample: { count: 4 },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less-equal' },
    });
    expect(webgpuHarness.createdPipelines[1]).toMatchObject({
      multisample: { count: 4 },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less-equal' },
    });

    // Execute a frame render and verify 4x MSAA color + depth24plus attachments and draw submission
    const result = acquired.renderer!.render({
      quads: makeSampleSkinQuads(),
      camera: {
        camPos: [0, -2, 1.2],
        camFwd: [0, 1, -0.2],
        camRight: [1, 0, 0],
        camUp: [0, 0.2, 1],
        focal: 520,
        width: 640,
        height: 400,
        dpr: 2,
      },
      keyDir: [-0.48, -0.56, 0.82],
      fillDir: [0.66, -0.38, 0.54],
      shader: 'studio-pbr',
    });

    expect(result).toEqual({
      ok: true,
      triangles: 4,
      pixelWidth: 1280,
      pixelHeight: 800,
    });
    expect(webgpuHarness.createdTextures.some((t) => t.descriptor.format === 'depth24plus' && t.descriptor.sampleCount === 4)).toBe(true);
    expect(webgpuHarness.pass.draw).toHaveBeenCalledWith(12);
    expect(webgpuHarness.queue.submit).toHaveBeenCalledTimes(1);

    // Clean disposal destroys GPU buffers, textures, and device
    acquired.renderer!.dispose();
    expect(acquired.renderer!.isAvailable()).toBe(false);
    expect(webgpuHarness.device.destroy).toHaveBeenCalledTimes(1);
    expect(webgpuHarness.gpuContext.unconfigure).toHaveBeenCalledTimes(1);
  });

  it('automatically falls back to Priority-2 WebGL2 when WebGPU adapter is unavailable, and Priority-3 Canvas2D when both are unavailable', async () => {
    const webgl2Harness = createMockWebGL2Canvas();
    const noAdapterGpu: MinimalNavigatorGPU = {
      requestAdapter: vi.fn(async () => null),
    };

    const fallbackWebgl2 = await acquirePreferredStudio3DBackend({
      webgl2Canvas: webgl2Harness.canvas,
      gpu: noAdapterGpu,
    });
    expect(fallbackWebgl2.backend).toBe('webgl2');
    expect(fallbackWebgl2.renderer).toBeInstanceOf(Studio3DWebGL2Renderer);
    fallbackWebgl2.renderer?.dispose();

    const emptyCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;

    const fallbackCanvas2d = await acquirePreferredStudio3DBackend({
      webgpuCanvas: emptyCanvas,
      webgl2Canvas: emptyCanvas,
      gpu: null,
    });
    expect(fallbackCanvas2d.backend).toBe('canvas2d');
    expect(fallbackCanvas2d.renderer).toBeNull();
  });

  it('notifies device.lost recovery callback and marks WebGPU renderer unavailable cleanly', async () => {
    const webgpuHarness = createMockWebGPUHarness();
    const onDeviceLost = vi.fn();

    const renderer = await Studio3DWebGPURenderer.create({
      targetCanvas: webgpuHarness.canvas,
      gpu: webgpuHarness.gpu,
      onDeviceLost,
    });
    expect(renderer).not.toBeNull();
    expect(renderer!.isAvailable()).toBe(true);

    webgpuHarness.triggerLost({ reason: 'unknown', message: 'simulated gpu reset' });
    await waitFor(() => expect(onDeviceLost).toHaveBeenCalledTimes(1));
    expect(renderer!.isAvailable()).toBe(false);
    renderer!.dispose();
  });

  it('computes smooth welded vertex normals along shared organic skin edges with finite vertex attributes', () => {
    const packed = triangulateAndWeldQuads(makeSampleSkinQuads());
    expect(packed.totalTriangles).toBe(4);
    expect(packed.opaqueVertexCount).toBe(12);
    expect(packed.weldedVertexBuckets).toBe(6);

    // Inspect vertex at shared edge (0.1, 0, 0.5) on quad 0 (vertex index 1) and quad 1 (vertex index 6)
    const n1x = packed.opaqueData[1 * FLOATS_PER_VERTEX + 3]!;
    const n1y = packed.opaqueData[1 * FLOATS_PER_VERTEX + 4]!;
    const n1z = packed.opaqueData[1 * FLOATS_PER_VERTEX + 5]!;
    const n2x = packed.opaqueData[6 * FLOATS_PER_VERTEX + 3]!;
    const n2y = packed.opaqueData[6 * FLOATS_PER_VERTEX + 4]!;
    const n2z = packed.opaqueData[6 * FLOATS_PER_VERTEX + 5]!;

    // Both adjacent quads share the exact same welded smooth unit normal across their seam
    expect(n1x).toBeCloseTo(n2x, 5);
    expect(n1y).toBeCloseTo(n2y, 5);
    expect(n1z).toBeCloseTo(n2z, 5);
    expect(Math.hypot(n1x, n1y, n1z)).toBeCloseTo(1, 5);
    // Welded normal must tilt between (0,0,1) and (-0.5,0,0.866)
    expect(n1x).toBeLessThan(-0.15);
    expect(n1z).toBeGreaterThan(0.9);
  });

  it('exposes data-render-backend="webgpu" in StudioInteractive3DViewport when navigator.gpu is supported and "canvas2d" in default jsdom', async () => {
    const sample = INITIAL_EXERCISES[0]!;

    // Default jsdom (no navigator.gpu, no webgl2) -> canvas2d
    const defaultView = render(
      React.createElement(StudioInteractive3DViewport, { exercise: sample, compact: true }),
    );
    expect(screen.getByTestId('studio-interactive-3d-viewport')).toHaveAttribute(
      'data-render-backend',
      'canvas2d',
    );
    defaultView.unmount();

    // Browser with WebGPU support -> Priority-1 webgpu activated automatically
    const webgpuHarness = createMockWebGPUHarness();
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: webgpuHarness.gpu,
    });
    type CanvasContextReturn = ReturnType<typeof HTMLCanvasElement.prototype.getContext>;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
      kind: string,
    ) {
      if (kind === 'webgpu') {
        return webgpuHarness.gpuContext as unknown as CanvasContextReturn;
      }
      if (kind === '2d') {
        return {
          save: vi.fn(),
          restore: vi.fn(),
          scale: vi.fn(),
          beginPath: vi.fn(),
          closePath: vi.fn(),
          rect: vi.fn(),
          clip: vi.fn(),
          fillRect: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          arc: vi.fn(),
          ellipse: vi.fn(),
          fillText: vi.fn(),
          setLineDash: vi.fn(),
          drawImage: vi.fn(),
          createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
          lineCap: 'round',
          lineJoin: 'round',
          lineWidth: 1,
          strokeStyle: '#000',
          fillStyle: '#000',
          font: '10px sans-serif',
        } as unknown as CanvasContextReturn;
      }
      return null;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext);

    await act(async () => {
      render(React.createElement(StudioInteractive3DViewport, { exercise: sample, compact: true }));
    });

    await waitFor(() =>
      expect(screen.getByTestId('studio-interactive-3d-viewport')).toHaveAttribute(
        'data-render-backend',
        'webgpu',
      ),
    );
  });
});

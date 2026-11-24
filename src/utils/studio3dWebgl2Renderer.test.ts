import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { renderRealtimeStudio3DFrame } from './realtimeStudio3dEngine';
import {
  FLOATS_PER_VERTEX,
  parseCssColorToRgb01,
  resetSharedStudio3DWebGL2RendererForTests,
  STUDIO_3D_FRAGMENT_SHADER,
  STUDIO_3D_VERTEX_SHADER,
  Studio3DWebGL2Renderer,
  triangulateAndWeldQuads,
  type StudioQuadFace,
} from './studio3dWebgl2Renderer';

function createMockWebGL2Context() {
  return {
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
}

function createMock2DContext(): CanvasRenderingContext2D {
  const grad = { addColorStop: vi.fn() };
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
    createLinearGradient: vi.fn(() => grad),
    lineCap: 'round',
    lineJoin: 'round',
    lineWidth: 1,
    strokeStyle: '#000',
    fillStyle: '#000',
    font: '10px sans-serif',
  } as unknown as CanvasRenderingContext2D;
}

afterEach(() => {
  resetSharedStudio3DWebGL2RendererForTests();
  vi.restoreAllMocks();
});

describe('Studio3DWebGL2Renderer (Priority-2 Hardware Fallback & Smooth Normal Welder)', () => {
  it('defines GLSL ES 3.00 shaders with SSS skin wrap, silk hair, Fresnel rim, anatomical terracotta activation, and hardware depth', () => {
    expect(STUDIO_3D_VERTEX_SHADER).toContain('#version 300 es');
    expect(STUDIO_3D_FRAGMENT_SHADER).toContain('#version 300 es');
    expect(STUDIO_3D_FRAGMENT_SHADER).toContain('sssGlow');
    expect(STUDIO_3D_FRAGMENT_SHADER).toContain('hairRim');
    expect(STUDIO_3D_FRAGMENT_SHADER).toContain('rimDir');
    // Fresnel-contoured warm botanical terracotta-gold anatomical heatmap activation before AgX tone mapping
    expect(STUDIO_3D_FRAGMENT_SHADER).toContain('if (emissive > 0.05 && (role == 1 || role == 3))');
    expect(STUDIO_3D_FRAGMENT_SHADER).toContain('vec3(0.92, 0.48, 0.28)');
    expect(STUDIO_3D_FRAGMENT_SHADER).toContain('0.38 + 0.62 * anatFresnel');
    expect(STUDIO_3D_FRAGMENT_SHADER).toContain('1.8');
    const anatIdx = STUDIO_3D_FRAGMENT_SHADER.indexOf('anatTerracotta');
    const agxIdx = STUDIO_3D_FRAGMENT_SHADER.indexOf('col = filmicAgxRolloff(col)');
    expect(anatIdx).toBeGreaterThan(-1);
    expect(agxIdx).toBeGreaterThan(anatIdx);
  });

  it('packs smooth per-vertex vEmissive intensities per corner while preserving flat emissive fallback', () => {
    const smoothQuad: StudioQuadFace[] = [
      {
        verts: [
          [0, 0, 0.5],
          [0.2, 0, 0.5],
          [0.2, 0.2, 0.5],
          [0, 0.2, 0.5],
        ],
        baseRgb: [218, 114, 72],
        vEmissive: [0.0, 0.45, 0.92, 0.3],
        emissive: 0.4,
        alpha: 1,
        spec: 0.04,
        materialRole: 'fabric',
      },
      {
        verts: [
          [0.3, 0, 0.5],
          [0.5, 0, 0.5],
          [0.5, 0.2, 0.5],
          [0.3, 0.2, 0.5],
        ],
        baseRgb: [196, 114, 92],
        emissive: 0.18,
        alpha: 1,
        spec: 0.11,
        materialRole: 'skin',
      },
    ];
    const packed = triangulateAndWeldQuads(smoothQuad);
    expect(packed.opaqueVertexCount).toBe(12);
    // First quad triangles emit corners (0,1,2) and (0,2,3) with exact per-vertex emissive
    expect(packed.opaqueData[0 * FLOATS_PER_VERTEX + 12]).toBeCloseTo(0.0, 5);
    expect(packed.opaqueData[1 * FLOATS_PER_VERTEX + 12]).toBeCloseTo(0.45, 5);
    expect(packed.opaqueData[2 * FLOATS_PER_VERTEX + 12]).toBeCloseTo(0.92, 5);
    expect(packed.opaqueData[5 * FLOATS_PER_VERTEX + 12]).toBeCloseTo(0.3, 5);
    // Second quad without vEmissive uses flat emissive fallback across all 6 triangle vertices
    for (let v = 6; v < 12; v++) {
      expect(packed.opaqueData[v * FLOATS_PER_VERTEX + 12]).toBeCloseTo(0.18, 5);
    }
  });

  it('welds shared vertex normals smoothly on curved skin/hair while keeping sharp architectural wood corners crisp', () => {
    // 90-degree architectural white-oak box corner (no vNormals) -> crease protection preserves sharp normals
    const woodCorner: StudioQuadFace[] = [
      {
        verts: [
          [0, 0, 0],
          [1, 0, 0],
          [1, 1, 0],
          [0, 1, 0],
        ],
        baseRgb: [196, 156, 114],
        alpha: 1,
        spec: 0.25,
        materialRole: 'wood',
      },
      {
        verts: [
          [1, 0, 0],
          [1, 0, 1],
          [1, 1, 1],
          [1, 1, 0],
        ],
        baseRgb: [196, 156, 114],
        alpha: 1,
        spec: 0.25,
        materialRole: 'wood',
      },
    ];
    const woodPacked = triangulateAndWeldQuads(woodCorner);
    expect(woodPacked.totalTriangles).toBe(4);
    const nTopZ = woodPacked.opaqueData[1 * FLOATS_PER_VERTEX + 5]!;
    const nSideX = woodPacked.opaqueData[6 * FLOATS_PER_VERTEX + 3]!;
    // 90 deg angle has dot(orig, welded) = 0.707 < 0.72 architectural crease threshold -> stays crisp!
    expect(Math.abs(nTopZ)).toBeCloseTo(1, 4);
    expect(Math.abs(nSideX)).toBeCloseTo(1, 4);

    // Translucent X-Ray quads partition cleanly into translucentData buffer
    const xrayQuads: StudioQuadFace[] = [
      {
        verts: [
          [0, 0, 0.2],
          [0.2, 0, 0.2],
          [0.2, 0.2, 0.2],
          [0, 0.2, 0.2],
        ],
        baseRgb: [66, 178, 148],
        alpha: 0.44,
        spec: 0.1,
        materialRole: 'fabric',
      },
    ];
    const xrayPacked = triangulateAndWeldQuads(xrayQuads);
    expect(xrayPacked.opaqueVertexCount).toBe(0);
    expect(xrayPacked.translucentVertexCount).toBe(6);
  });

  it('converts physical 3D spring/rope lines into camera-facing Z-buffered ribbons and parses CSS colors cleanly', () => {
    expect(parseCssColorToRgb01('#355441')).toEqual([0x35 / 255, 0x54 / 255, 0x41 / 255, 1]);
    expect(parseCssColorToRgb01('rgba(238, 232, 220, 0.9)')).toEqual([
      238 / 255,
      232 / 255,
      220 / 255,
      0.9,
    ]);

    const packed = triangulateAndWeldQuads([], {
      physicalLines: [
        {
          pts: [
            [0, 0, 0.3],
            [0.4, 0, 0.3],
          ],
          stroke: '#C9382B',
          width: 2.4,
        },
        {
          pts: [
            [0, 0, 0.4],
            [0.4, 0, 0.4],
          ],
          stroke: '#1FA97C',
          width: 2,
          overlay: true,
        },
      ],
      camera: {
        camPos: [0, -2, 1],
        camFwd: [0, 1, -0.25],
        camRight: [1, 0, 0],
        camUp: [0, 0.25, 1],
        focal: 520,
        width: 640,
        height: 400,
        dpr: 2,
      },
    });
    // Non-overlay physical line emits 2 ribbon triangles; overlay line is left for 2D foreground
    expect(packed.totalTriangles).toBe(2);
    expect(packed.opaqueVertexCount).toBe(6);
  });

  it('renders full Pilates scene through WebGL2 with DPR supersampling and falls back cleanly to Canvas2D when unavailable', () => {
    const gl = createMockWebGL2Context();
    const glCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn((kind: string) => (kind === 'webgl2' ? gl : null)),
      addEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;

    const renderer = Studio3DWebGL2Renderer.create(glCanvas);
    expect(renderer).not.toBeNull();
    expect(renderer!.backend).toBe('webgl2');

    const ctx2d = createMock2DContext();
    const reformerEx = INITIAL_EXERCISES[0]!;
    const gpuFrame = renderRealtimeStudio3DFrame({
      ctx: ctx2d,
      width: 640,
      height: 400,
      dpr: 2.5,
      gpuRenderer: renderer,
      exercise: reformerEx,
      phaseT: 0.45,
      yawDeg: -34,
      pitchDeg: 21,
      zoom: 1.04,
      shader: 'studio-pbr',
    });

    expect(gpuFrame.renderBackend).toBe('webgl2');
    expect(glCanvas.width).toBe(1600);
    expect(glCanvas.height).toBe(1000);
    expect(gl.enable).toHaveBeenCalledWith(gl.DEPTH_TEST);
    expect(gl.drawArrays).toHaveBeenCalled();
    expect(ctx2d.drawImage).toHaveBeenCalledWith(glCanvas, 0, 0, 640, 400);

    renderer!.dispose();
    expect(renderer!.isAvailable()).toBe(false);

    // Safe automatic Canvas2D fallback when GPU renderer is null or unavailable
    const fallbackCtx = createMock2DContext();
    const fallbackFrame = renderRealtimeStudio3DFrame({
      ctx: fallbackCtx,
      width: 640,
      height: 400,
      gpuRenderer: null,
      exercise: reformerEx,
      phaseT: 0.45,
      yawDeg: -34,
      pitchDeg: 21,
      zoom: 1.04,
      shader: 'studio-pbr',
    });
    expect(fallbackFrame.renderBackend).toBe('canvas2d');
    expect(fallbackFrame.hotspots).toHaveLength(5);
    expect((fallbackCtx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(20);
  });
});

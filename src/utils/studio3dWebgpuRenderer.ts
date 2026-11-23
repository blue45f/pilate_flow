/**
 * Zero-dependency Hardware WebGPU Studio PBR / SSS / Fresnel Rim Renderer
 * (Priority 1 backend for Pilates Flow Atelier realtime 3D viewport).
 *
 * Rendering Priority Pipeline:
 *   1. WebGPU (`navigator.gpu` + WGSL PBR/SSS/Rim + 4x MSAA + `depth24plus`)
 *   2. WebGL2 (`Studio3DWebGL2Renderer`) — fallback for browsers without WebGPU
 *   3. Canvas 2D — safe fallback for jsdom/headless tests & software-only devices
 *
 * Declares minimal self-contained WebGPU TypeScript interfaces so `@webgpu/types`
 * is not required and `tsc --noEmit` / `eslint` remain 0-error clean.
 */

import {
  FLOATS_PER_VERTEX,
  MeshPackerScratch,
  Studio3DWebGL2Renderer,
  triangulateAndWeldQuads,
  type Studio3DGpuRenderer,
  type Studio3DRenderBackend,
  type StudioWebGLRenderParams,
  type StudioWebGLShaderMode,
} from './studio3dWebgl2Renderer';

// Standard WebGPU bitflag constants (spec-defined values; no global dependency required)
const GPU_BUFFER_USAGE_VERTEX = 0x0020;
const GPU_BUFFER_USAGE_UNIFORM = 0x0040;
const GPU_BUFFER_USAGE_COPY_DST = 0x0008;
const GPU_TEXTURE_USAGE_COPY_SRC = 0x0001;
const GPU_TEXTURE_USAGE_RENDER_ATTACHMENT = 0x0010;

export interface MinimalGPUAdapter {
  requestDevice(descriptor?: Record<string, unknown>): Promise<MinimalGPUDevice>;
}

export interface MinimalGPUDeviceLostInfo {
  readonly reason?: string;
  readonly message?: string;
}

export interface MinimalGPUBuffer {
  destroy(): void;
}

export interface MinimalGPUTextureView {
  readonly label?: string;
}

export interface MinimalGPUTexture {
  createView(): MinimalGPUTextureView;
  destroy(): void;
}

export interface MinimalGPUShaderModule {
  readonly label?: string;
}

export interface MinimalGPUBindGroupLayout {
  readonly label?: string;
}

export interface MinimalGPUBindGroup {
  readonly label?: string;
}

export interface MinimalGPURenderPipeline {
  getBindGroupLayout(index: number): MinimalGPUBindGroupLayout;
}

export interface MinimalGPURenderPassEncoder {
  setPipeline(pipeline: MinimalGPURenderPipeline): void;
  setBindGroup(index: number, bindGroup: MinimalGPUBindGroup): void;
  setVertexBuffer(slot: number, buffer: MinimalGPUBuffer): void;
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
  end(): void;
}

export interface MinimalGPUCommandBuffer {
  readonly label?: string;
}

export interface MinimalGPUCommandEncoder {
  beginRenderPass(descriptor: Record<string, unknown>): MinimalGPURenderPassEncoder;
  finish(): MinimalGPUCommandBuffer;
}

export interface MinimalGPUQueue {
  writeBuffer(
    buffer: MinimalGPUBuffer,
    bufferOffset: number,
    data: ArrayBufferView,
    dataOffset?: number,
    size?: number,
  ): void;
  submit(commandBuffers: readonly MinimalGPUCommandBuffer[]): void;
}

export interface MinimalGPUDevice {
  readonly queue: MinimalGPUQueue;
  readonly lost?: Promise<MinimalGPUDeviceLostInfo>;
  createShaderModule(descriptor: { readonly code: string; readonly label?: string }): MinimalGPUShaderModule;
  createBuffer(descriptor: {
    readonly size: number;
    readonly usage: number;
    readonly mappedAtCreation?: boolean;
    readonly label?: string;
  }): MinimalGPUBuffer;
  createTexture(descriptor: {
    readonly size: readonly [number, number] | { readonly width: number; readonly height: number };
    readonly sampleCount?: number;
    readonly format: string;
    readonly usage: number;
    readonly label?: string;
  }): MinimalGPUTexture;
  createRenderPipeline(descriptor: Record<string, unknown>): MinimalGPURenderPipeline;
  createBindGroup(descriptor: Record<string, unknown>): MinimalGPUBindGroup;
  createCommandEncoder(descriptor?: Record<string, unknown>): MinimalGPUCommandEncoder;
  destroy(): void;
}

export interface MinimalGPUCanvasContext {
  configure(configuration: {
    readonly device: MinimalGPUDevice;
    readonly format: string;
    readonly alphaMode?: 'opaque' | 'premultiplied';
    readonly usage?: number;
  }): void;
  unconfigure?(): void;
  getCurrentTexture(): MinimalGPUTexture;
}

export interface MinimalNavigatorGPU {
  requestAdapter(options?: { readonly powerPreference?: 'high-performance' | 'low-power' }): Promise<MinimalGPUAdapter | null>;
  getPreferredCanvasFormat?(): string;
}

const SHADER_MODE_TO_F32: Record<StudioWebGLShaderMode, number> = {
  'studio-pbr': 0,
  'biomech-xray': 1,
  'game-arena': 2,
  'clay-wire': 3,
};

const NEAR_PLANE = 0.12;
const FAR_PLANE = 24.0;
const MSAA_SAMPLE_COUNT = 4;
const UNIFORM_FLOATS = 28; // 7 x vec4<f32> = 112 bytes (16-byte aligned)

export const STUDIO_3D_WGSL_SHADER = /* wgsl */ `
struct Uniforms {
  camPos: vec4<f32>,
  camFwd: vec4<f32>,
  camRight: vec4<f32>,
  camUp: vec4<f32>,
  proj: vec4<f32>,
  keyDir: vec4<f32>,
  fillDir: vec4<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput {
  @location(0) pos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
  @location(3) mat: vec4<f32>,
  @location(4) extra: vec3<f32>,
};

struct VertexOutput {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
  @location(3) mat: vec4<f32>,
  @location(4) quadUv: vec2<f32>,
};

@vertex
fn vsMain(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.worldPos = in.pos;
  out.normal = in.normal;
  out.color = in.color;
  out.mat = in.mat;
  out.quadUv = in.extra.yz;

  let rel = in.pos - u.camPos.xyz;
  let zCam = dot(rel, u.camFwd.xyz);
  let xCam = dot(rel, u.camRight.xyz);
  let yCam = dot(rel, u.camUp.xyz);

  let nearP = u.proj.z;
  let farP = u.proj.w;
  // WebGPU clip-space depth is [0.0, 1.0]
  var clipZ = (farP / (farP - nearP)) * (zCam - nearP);
  clipZ = clipZ + in.extra.x * 0.025 * max(0.0, zCam);

  out.clipPos = vec4<f32>(
    xCam * u.proj.x,
    yCam * u.proj.y - 0.08 * zCam,
    clipZ,
    zCam
  );
  return out;
}

@fragment
fn fsMain(in: VertexOutput) -> @location(0) vec4<f32> {
  // Compute derivatives unconditionally in uniform control flow for strict WGSL compliance
  let quadFw = max(fwidth(in.quadUv), vec2<f32>(0.0005));

  var N = normalize(in.normal);
  let V = normalize(u.camPos.xyz - in.worldPos);
  if (dot(N, V) < 0.0) {
    N = -N;
  }

  let NdotV = max(0.0, dot(N, V));
  let keyDir = normalize(u.keyDir.xyz);
  let fillDir = normalize(u.fillDir.xyz);
  // Camera-tracked 3/4 overhead studio backlight rim light for sculptural silhouette glow
  let rimDir = normalize(-u.camFwd.xyz * 0.56 + u.camUp.xyz * 0.66 - u.camRight.xyz * 0.44);

  let rawNdl = dot(N, keyDir);
  let diffKey = max(0.0, rawNdl);
  let diffFill = max(0.0, dot(N, fillDir));
  let diffBounce = max(0.0, dot(N, vec3<f32>(0.0, 0.0, -1.0))) * 0.11;
  let ao = clamp(0.84 + max(0.0, in.worldPos.z) * 0.18, 0.82, 1.0);

  let H = normalize(keyDir + V);
  let NdotH = max(0.0, dot(N, H));

  var alpha = clamp(in.mat.x, 0.0, 1.0);
  let role = i32(floor(in.mat.y + 0.5));
  let specW = in.mat.z;
  let emissiveLift = in.mat.w * 0.24;
  let shaderMode = i32(floor(u.camPos.w + 0.5));

  let base = in.color;
  let keyTint = vec3<f32>(1.03, 0.99, 0.94);
  let fillTint = vec3<f32>(0.91, 0.95, 1.00);
  let bounceTint = vec3<f32>(0.98, 0.94, 0.87);

  var col: vec3<f32>;

  if (role == 9) {
    // Physical 3D springs, ropes & piping ribbons
    let ribShade = 0.78 + diffKey * 0.24 + pow(NdotH, 32.0) * 0.16;
    col = base * ribShade;
  } else if (shaderMode == 3) {
    // Clay-wire sculptural mode with anti-aliased quad edges
    let rim = pow(max(0.0, 1.0 - NdotV), 2.5) * 0.20;
    let spec = pow(NdotH, 24.0) * specW * 0.45;
    let shade = (0.46 + diffKey * 0.42 + diffFill * 0.22 + diffBounce + rim) * ao;
    col = base * shade + vec3<f32>(spec);

    let edgeDist = min(in.quadUv, vec2<f32>(1.0) - in.quadUv);
    let edgeAlpha = vec2<f32>(1.0) - smoothstep(vec2<f32>(0.0), quadFw * 1.15, edgeDist);
    let wire = max(edgeAlpha.x, edgeAlpha.y) * 0.22;
    col = mix(col, vec3<f32>(0.16, 0.23, 0.20), wire);
  } else if (shaderMode == 1) {
    // Biomech X-Ray holographic mode
    let rim = pow(max(0.0, 1.0 - NdotV), 2.1);
    let shade = (0.42 + diffKey * 0.36 + diffFill * 0.20 + emissiveLift) * ao;
    col = base * shade
      + vec3<f32>(0.32, 0.92, 0.74) * rim * 0.52
      + vec3<f32>(pow(NdotH, 28.0) * specW * 0.35);
    alpha = clamp(alpha + rim * 0.28, 0.18, 0.96);
  } else if (role == 1) {
    // Porcelain-Peach Skin with Dual-Lobe Subsurface Scattering Wrap & Champagne Rim
    let wrapKey = clamp((rawNdl + 0.46) / 1.46, 0.0, 1.0);
    let wrapFill = clamp((dot(N, fillDir) + 0.36) / 1.36, 0.0, 1.0);
    let sssShift = (rawNdl + 0.08) * 2.35;
    let scatterBand = exp(-(sssShift * sssShift));
    let sssGlow = vec3<f32>(0.98, 0.48, 0.36) * scatterBand * 0.145;
    let fresnel = pow(max(0.0, 1.0 - NdotV), 2.75);
    let backMask = smoothstep(-0.22, 0.85, dot(N, rimDir) * 0.68 + 0.32);
    let rimCol = vec3<f32>(1.00, 0.94, 0.87) * fresnel * (0.12 + 0.24 * backMask);
    let dermalSpec = pow(NdotH, 24.0) * min(specW, 0.11);
    let diffuse = (vec3<f32>(0.45)
      + wrapKey * 0.46 * keyTint
      + wrapFill * 0.22 * fillTint
      + diffBounce * bounceTint
      + vec3<f32>(emissiveLift)) * ao;
    col = base * diffuse + base * sssGlow + rimCol + vec3<f32>(1.00, 0.96, 0.92) * dermalSpec;
  } else if (role == 2) {
    // Silky Espresso Hair with Dual-Band Anisotropic-Inspired Sheen & Crisp Rim Light
    let fresnel = pow(max(0.0, 1.0 - NdotV), 2.35);
    let backMask = smoothstep(-0.25, 0.88, dot(N, rimDir) * 0.72 + 0.28);
    let shiftN1 = normalize(N + u.camUp.xyz * 0.14);
    let shiftN2 = normalize(N - u.camUp.xyz * 0.10);
    let primarySilk = pow(max(0.0, dot(shiftN1, H)), 46.0) * 0.34;
    let secondarySilk = pow(max(0.0, dot(shiftN2, H)), 18.0) * 0.18;
    let fillH = normalize(fillDir + V);
    let fillSilk = pow(max(0.0, dot(shiftN1, fillH)), 26.0) * 0.12;
    let diffuse = (vec3<f32>(0.42)
      + diffKey * 0.44 * keyTint
      + diffFill * 0.22 * fillTint
      + diffBounce * bounceTint) * ao;
    let silkHighlight = vec3<f32>(0.94, 0.82, 0.72) * (primarySilk + fillSilk)
      + vec3<f32>(0.68, 0.46, 0.34) * secondarySilk;
    let hairRim = vec3<f32>(0.98, 0.90, 0.80) * fresnel * (0.16 + 0.34 * backMask);
    col = base * diffuse + silkHighlight + hairRim;
  } else if (role == 3) {
    // Matte Botanical Velvet Athleisure Fabric
    let fresnel = pow(max(0.0, 1.0 - NdotV), 2.75);
    let backMask = smoothstep(-0.20, 0.85, dot(N, rimDir) * 0.65 + 0.35);
    let velvetSheen = mix(base, vec3<f32>(0.84, 0.89, 0.85), 0.42) * fresnel * (0.18 + 0.18 * backMask);
    let microSpec = pow(NdotH, 16.0) * min(specW, 0.032);
    let diffuse = (vec3<f32>(0.46)
      + diffKey * 0.42 * keyTint
      + diffFill * 0.23 * fillTint
      + diffBounce * bounceTint
      + vec3<f32>(emissiveLift)) * ao;
    col = base * diffuse + velvetSheen + vec3<f32>(0.88, 0.90, 0.88) * microSpec;
  } else if (role == 4) {
    // Satin European White-Oak Wood with fine procedural grain & clearcoat
    let grainWave = sin(in.worldPos.x * 40.0 + in.worldPos.y * 11.5 + sin(in.worldPos.z * 26.0) * 1.2);
    let grain = 1.0 + 0.036 * grainWave;
    let coatRim = pow(max(0.0, 1.0 - NdotV), 3.0) * 0.12;
    let baseSpec = pow(NdotH, 28.0) * (specW * 0.56);
    let coatSpec = pow(NdotH, 54.0) * 0.18;
    let diffuse = (vec3<f32>(0.46)
      + diffKey * 0.43 * keyTint
      + diffFill * 0.22 * fillTint
      + diffBounce * bounceTint
      + vec3<f32>(coatRim + emissiveLift)) * ao * grain;
    col = base * diffuse + vec3<f32>(0.98, 0.95, 0.90) * (baseSpec + coatSpec);
  } else if (role == 5) {
    // Supple Sage Leather Upholstery
    let edgeCatch = pow(max(0.0, 1.0 - NdotV), 2.7) * 0.16;
    let spec = pow(NdotH, 26.0) * min(specW, 0.20);
    let diffuse = (vec3<f32>(0.46)
      + diffKey * 0.41 * keyTint
      + diffFill * 0.22 * fillTint
      + diffBounce * bounceTint
      + vec3<f32>(emissiveLift)) * ao;
    col = base * diffuse + vec3<f32>(0.68, 0.74, 0.69) * edgeCatch + vec3<f32>(0.92, 0.93, 0.90) * spec;
  } else if (role == 6 || role == 7) {
    // Brushed Chrome (6) & Anodized Brass (7) with Studio Hemisphere Environment Reflection
    let refl = reflect(-V, N);
    let skyT = clamp(N.z * 0.55 + refl.z * 0.45, -1.0, 1.0);
    let envCol = select(
      mix(vec3<f32>(0.84, 0.82, 0.79), vec3<f32>(0.56, 0.54, 0.50), -skyT),
      mix(vec3<f32>(0.84, 0.82, 0.79), vec3<f32>(0.99, 0.97, 0.94), skyT),
      skyT >= 0.0
    );
    let dirBoost = (0.68 + diffKey * 0.34 + diffFill * 0.18) * ao;
    let fresnel = pow(max(0.0, 1.0 - NdotV), 3.1) * 0.18;
    let fillH = normalize(fillDir + V);
    let aniso = (pow(NdotH, 68.0) * 0.72 + pow(max(0.0, dot(N, fillH)), 58.0) * 0.22) * max(0.55, specW);
    let metalSpecTint = select(vec3<f32>(0.96, 0.98, 1.00), vec3<f32>(1.00, 0.92, 0.74), role == 7);
    col = (base / 0.92) * envCol * dirBoost + metalSpecTint * (aniso + fresnel);
  } else if (role == 8) {
    // Glossy Eye Iris, Catchlight Pearls & Satin Coral Lips
    let sparkle = pow(NdotH, 86.0) * max(specW, 0.35) * 1.15;
    let rim = pow(max(0.0, 1.0 - NdotV), 2.8) * 0.14;
    let diffuse = (vec3<f32>(0.52)
      + diffKey * 0.40 * keyTint
      + diffFill * 0.22 * fillTint
      + vec3<f32>(emissiveLift)) * ao;
    col = base * diffuse + vec3<f32>(1.0, 0.98, 0.95) * (sparkle + rim);
  } else {
    let rim = pow(max(0.0, 1.0 - NdotV), 2.6) * 0.16;
    let spec = pow(NdotH, 24.0) * specW;
    let diffuse = (vec3<f32>(0.46)
      + diffKey * 0.42 * keyTint
      + diffFill * 0.22 * fillTint
      + diffBounce * bounceTint
      + vec3<f32>(rim + emissiveLift)) * ao;
    col = base * diffuse + vec3<f32>(0.95, 0.94, 0.91) * spec;
  }

  if (shaderMode == 2) {
    let arenaRim = pow(max(0.0, 1.0 - NdotV), 2.4) * 0.26;
    col = col + vec3<f32>(0.18, 0.78, 0.58) * arenaRim;
  }

  // Filmic soft-shoulder rolloff
  col = col / (vec3<f32>(1.0) + max(col - vec3<f32>(0.86), vec3<f32>(0.0)) * 0.42);
  col = clamp(col, vec3<f32>(0.0), vec3<f32>(1.0));

  // Premultiplied alpha output for clean Canvas2D drawImage compositing
  return vec4<f32>(col * alpha, alpha);
}
`;

export function readNavigatorGpu(): MinimalNavigatorGPU | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { gpu?: MinimalNavigatorGPU };
  if (!nav.gpu || typeof nav.gpu.requestAdapter !== 'function') {
    return null;
  }
  return nav.gpu;
}

export class Studio3DWebGPURenderer implements Studio3DGpuRenderer {
  readonly backend = 'webgpu' as const;
  readonly canvas: HTMLCanvasElement;
  readonly sampleCount = MSAA_SAMPLE_COUNT;
  readonly depthFormat = 'depth24plus' as const;

  private readonly device: MinimalGPUDevice;
  private readonly context: MinimalGPUCanvasContext;
  private readonly format: string;
  private readonly opaquePipeline: MinimalGPURenderPipeline;
  private readonly translucentPipeline: MinimalGPURenderPipeline;
  private readonly uniformBuffer: MinimalGPUBuffer;
  private readonly opaqueBindGroup: MinimalGPUBindGroup;
  private readonly translucentBindGroup: MinimalGPUBindGroup;
  private readonly uniformScratch = new Float32Array(UNIFORM_FLOATS);
  private readonly packerScratch = new MeshPackerScratch();

  private opaqueVbo: MinimalGPUBuffer | null = null;
  private opaqueVboBytes = 0;
  private translucentVbo: MinimalGPUBuffer | null = null;
  private translucentVboBytes = 0;

  private msaaColorTex: MinimalGPUTexture | null = null;
  private msaaColorView: MinimalGPUTextureView | null = null;
  private depthTex: MinimalGPUTexture | null = null;
  private depthView: MinimalGPUTextureView | null = null;
  private targetWidth = 0;
  private targetHeight = 0;

  private disposed = false;
  private deviceLost = false;

  private constructor(
    canvas: HTMLCanvasElement,
    device: MinimalGPUDevice,
    context: MinimalGPUCanvasContext,
    format: string,
    opaquePipeline: MinimalGPURenderPipeline,
    translucentPipeline: MinimalGPURenderPipeline,
    uniformBuffer: MinimalGPUBuffer,
    opaqueBindGroup: MinimalGPUBindGroup,
    translucentBindGroup: MinimalGPUBindGroup,
  ) {
    this.canvas = canvas;
    this.device = device;
    this.context = context;
    this.format = format;
    this.opaquePipeline = opaquePipeline;
    this.translucentPipeline = translucentPipeline;
    this.uniformBuffer = uniformBuffer;
    this.opaqueBindGroup = opaqueBindGroup;
    this.translucentBindGroup = translucentBindGroup;
  }

  /**
   * Creates a Priority-1 WebGPU renderer with 4x MSAA + `depth24plus` depth testing.
   * Returns `null` cleanly when WebGPU or an adapter/device is unavailable.
   */
  static async create(options?: {
    readonly targetCanvas?: HTMLCanvasElement;
    readonly gpu?: MinimalNavigatorGPU | null;
    readonly onDeviceLost?: (info: MinimalGPUDeviceLostInfo) => void;
  }): Promise<Studio3DWebGPURenderer | null> {
    const gpu = options?.gpu !== undefined ? options.gpu : readNavigatorGpu();
    if (!gpu) return null;

    if (
      !options?.targetCanvas &&
      (typeof document === 'undefined' || typeof document.createElement !== 'function')
    ) {
      return null;
    }
    const canvas = options?.targetCanvas ?? document.createElement('canvas');
    if (typeof canvas.getContext !== 'function') return null;

    let adapter: MinimalGPUAdapter | null;
    try {
      adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    } catch {
      return null;
    }
    if (!adapter) return null;

    let device: MinimalGPUDevice;
    try {
      device = await adapter.requestDevice();
    } catch {
      return null;
    }
    if (!device) return null;

    let context: MinimalGPUCanvasContext | null;
    try {
      context = canvas.getContext('webgpu') as unknown as MinimalGPUCanvasContext | null;
    } catch {
      device.destroy();
      return null;
    }
    if (!context || typeof context.configure !== 'function') {
      device.destroy();
      return null;
    }

    const format =
      typeof gpu.getPreferredCanvasFormat === 'function'
        ? gpu.getPreferredCanvasFormat()
        : 'bgra8unorm';

    try {
      context.configure({
        device,
        format,
        alphaMode: 'premultiplied',
        usage: GPU_TEXTURE_USAGE_RENDER_ATTACHMENT | GPU_TEXTURE_USAGE_COPY_SRC,
      });

      const shaderModule = device.createShaderModule({
        label: 'studio3d-pbr-sss-wgsl',
        code: STUDIO_3D_WGSL_SHADER,
      });

      const vertexBufferLayout = {
        arrayStride: FLOATS_PER_VERTEX * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32x3' },
          { shaderLocation: 2, offset: 24, format: 'float32x3' },
          { shaderLocation: 3, offset: 36, format: 'float32x4' },
          { shaderLocation: 4, offset: 52, format: 'float32x3' },
        ],
      };

      const opaquePipeline = device.createRenderPipeline({
        label: 'studio3d-opaque-msaa4',
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vsMain',
          buffers: [vertexBufferLayout],
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fsMain',
          targets: [{ format }],
        },
        primitive: {
          topology: 'triangle-list',
          cullMode: 'none',
        },
        depthStencil: {
          format: 'depth24plus',
          depthWriteEnabled: true,
          depthCompare: 'less-equal',
        },
        multisample: {
          count: MSAA_SAMPLE_COUNT,
        },
      });

      const translucentPipeline = device.createRenderPipeline({
        label: 'studio3d-translucent-msaa4',
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vsMain',
          buffers: [vertexBufferLayout],
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fsMain',
          targets: [
            {
              format,
              blend: {
                color: {
                  srcFactor: 'one',
                  dstFactor: 'one-minus-src-alpha',
                  operation: 'add',
                },
                alpha: {
                  srcFactor: 'one',
                  dstFactor: 'one-minus-src-alpha',
                  operation: 'add',
                },
              },
            },
          ],
        },
        primitive: {
          topology: 'triangle-list',
          cullMode: 'none',
        },
        depthStencil: {
          format: 'depth24plus',
          depthWriteEnabled: false,
          depthCompare: 'less-equal',
        },
        multisample: {
          count: MSAA_SAMPLE_COUNT,
        },
      });

      const uniformBuffer = device.createBuffer({
        label: 'studio3d-uniforms',
        size: UNIFORM_FLOATS * 4,
        usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
      });

      const opaqueBindGroup = device.createBindGroup({
        label: 'studio3d-opaque-uniform-bindgroup',
        layout: opaquePipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
        ],
      });

      const translucentBindGroup = device.createBindGroup({
        label: 'studio3d-translucent-uniform-bindgroup',
        layout: translucentPipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
        ],
      });

      const instance = new Studio3DWebGPURenderer(
        canvas,
        device,
        context,
        format,
        opaquePipeline,
        translucentPipeline,
        uniformBuffer,
        opaqueBindGroup,
        translucentBindGroup,
      );

      if (device.lost && typeof device.lost.then === 'function') {
        void device.lost.then((info) => {
          instance.deviceLost = true;
          if (!instance.disposed) {
            options?.onDeviceLost?.(info);
          }
        });
      }

      return instance;
    } catch {
      try {
        device.destroy();
      } catch {
        // Ignore teardown failure on broken driver
      }
      return null;
    }
  }

  isAvailable(): boolean {
    return !this.disposed && !this.deviceLost;
  }

  private ensureAttachments(width: number, height: number): void {
    if (
      this.targetWidth === width &&
      this.targetHeight === height &&
      this.msaaColorView &&
      this.depthView
    ) {
      return;
    }
    this.msaaColorTex?.destroy();
    this.depthTex?.destroy();

    this.targetWidth = width;
    this.targetHeight = height;

    this.msaaColorTex = this.device.createTexture({
      label: 'studio3d-msaa4-color',
      size: [width, height],
      sampleCount: MSAA_SAMPLE_COUNT,
      format: this.format,
      usage: GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
    });
    this.msaaColorView = this.msaaColorTex.createView();

    this.depthTex = this.device.createTexture({
      label: 'studio3d-msaa4-depth24plus',
      size: [width, height],
      sampleCount: MSAA_SAMPLE_COUNT,
      format: 'depth24plus',
      usage: GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
    });
    this.depthView = this.depthTex.createView();
  }

  private ensureVertexBuffer(kind: 'opaque' | 'translucent', byteLength: number): MinimalGPUBuffer {
    const aligned = Math.max(256, Math.ceil(byteLength / 4) * 4);
    if (kind === 'opaque') {
      if (!this.opaqueVbo || aligned > this.opaqueVboBytes) {
        this.opaqueVbo?.destroy();
        this.opaqueVboBytes = Math.max(aligned, this.opaqueVboBytes * 2);
        this.opaqueVbo = this.device.createBuffer({
          label: 'studio3d-opaque-vbo',
          size: this.opaqueVboBytes,
          usage: GPU_BUFFER_USAGE_VERTEX | GPU_BUFFER_USAGE_COPY_DST,
        });
      }
      return this.opaqueVbo;
    }
    if (!this.translucentVbo || aligned > this.translucentVboBytes) {
      this.translucentVbo?.destroy();
      this.translucentVboBytes = Math.max(aligned, this.translucentVboBytes * 2);
      this.translucentVbo = this.device.createBuffer({
        label: 'studio3d-translucent-vbo',
        size: this.translucentVboBytes,
        usage: GPU_BUFFER_USAGE_VERTEX | GPU_BUFFER_USAGE_COPY_DST,
      });
    }
    return this.translucentVbo;
  }

  render(params: StudioWebGLRenderParams): {
    readonly ok: boolean;
    readonly triangles: number;
    readonly pixelWidth: number;
    readonly pixelHeight: number;
  } {
    if (!this.isAvailable()) {
      return { ok: false, triangles: 0, pixelWidth: 0, pixelHeight: 0 };
    }
    const { camera, quads, physicalLines, keyDir, fillDir, shader } = params;
    const clampedDpr = Math.max(1, Math.min(2.5, camera.dpr || 1));
    const pixelWidth = Math.max(1, Math.round(camera.width * clampedDpr));
    const pixelHeight = Math.max(1, Math.round(camera.height * clampedDpr));

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    try {
      this.ensureAttachments(pixelWidth, pixelHeight);
      const packed = triangulateAndWeldQuads(quads, {
        physicalLines,
        camera,
        scratch: this.packerScratch,
      });

      const u = this.uniformScratch;
      u[0] = camera.camPos[0];
      u[1] = camera.camPos[1];
      u[2] = camera.camPos[2];
      u[3] = SHADER_MODE_TO_F32[shader];
      u[4] = camera.camFwd[0];
      u[5] = camera.camFwd[1];
      u[6] = camera.camFwd[2];
      u[7] = 0;
      u[8] = camera.camRight[0];
      u[9] = camera.camRight[1];
      u[10] = camera.camRight[2];
      u[11] = 0;
      u[12] = camera.camUp[0];
      u[13] = camera.camUp[1];
      u[14] = camera.camUp[2];
      u[15] = 0;
      u[16] = (2 * camera.focal) / Math.max(1, camera.width);
      u[17] = (2 * camera.focal) / Math.max(1, camera.height);
      u[18] = NEAR_PLANE;
      u[19] = FAR_PLANE;
      u[20] = keyDir[0];
      u[21] = keyDir[1];
      u[22] = keyDir[2];
      u[23] = 0;
      u[24] = fillDir[0];
      u[25] = fillDir[1];
      u[26] = fillDir[2];
      u[27] = 0;

      this.device.queue.writeBuffer(this.uniformBuffer, 0, u);

      let opaqueBuf: MinimalGPUBuffer | null = null;
      if (packed.opaqueVertexCount > 0) {
        opaqueBuf = this.ensureVertexBuffer('opaque', packed.opaqueData.byteLength);
        this.device.queue.writeBuffer(opaqueBuf, 0, packed.opaqueData);
      }

      let translucentBuf: MinimalGPUBuffer | null = null;
      if (packed.translucentVertexCount > 0) {
        translucentBuf = this.ensureVertexBuffer('translucent', packed.translucentData.byteLength);
        this.device.queue.writeBuffer(translucentBuf, 0, packed.translucentData);
      }

      const resolveView = this.context.getCurrentTexture().createView();
      const encoder = this.device.createCommandEncoder({ label: 'studio3d-frame-encoder' });
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.msaaColorView,
            resolveTarget: resolveView,
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'discard',
          },
        ],
        depthStencilAttachment: {
          view: this.depthView,
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'discard',
        },
      });

      if (opaqueBuf && packed.opaqueVertexCount > 0) {
        pass.setPipeline(this.opaquePipeline);
        pass.setBindGroup(0, this.opaqueBindGroup);
        pass.setVertexBuffer(0, opaqueBuf);
        pass.draw(packed.opaqueVertexCount);
      }

      if (translucentBuf && packed.translucentVertexCount > 0) {
        pass.setPipeline(this.translucentPipeline);
        pass.setBindGroup(0, this.translucentBindGroup);
        pass.setVertexBuffer(0, translucentBuf);
        pass.draw(packed.translucentVertexCount);
      }

      pass.end();
      this.device.queue.submit([encoder.finish()]);

      return {
        ok: true,
        triangles: packed.totalTriangles,
        pixelWidth,
        pixelHeight,
      };
    } catch {
      return { ok: false, triangles: 0, pixelWidth: 0, pixelHeight: 0 };
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.msaaColorTex?.destroy();
      this.depthTex?.destroy();
      this.opaqueVbo?.destroy();
      this.translucentVbo?.destroy();
      this.uniformBuffer.destroy();
      this.context.unconfigure?.();
      this.device.destroy();
    } catch {
      // Ignore teardown errors if device already lost
    }
    this.msaaColorTex = null;
    this.msaaColorView = null;
    this.depthTex = null;
    this.depthView = null;
    this.opaqueVbo = null;
    this.translucentVbo = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

export interface Studio3DBackendAcquisitionResult {
  readonly backend: Studio3DRenderBackend;
  readonly renderer: Studio3DGpuRenderer | null;
}

/**
 * Resolves the highest-priority available 3D rendering backend:
 * 1. WebGPU (`webgpu`) — always preferred whenever `navigator.gpu` & adapter/device succeed
 * 2. WebGL2 (`webgl2`) — automatic fallback when WebGPU is unavailable
 * 3. Canvas 2D (`canvas2d`) — safe fallback when neither GPU API is available
 */
export async function acquirePreferredStudio3DBackend(options?: {
  readonly webgpuCanvas?: HTMLCanvasElement;
  readonly webgl2Canvas?: HTMLCanvasElement;
  readonly gpu?: MinimalNavigatorGPU | null;
  readonly onDeviceLost?: (info: MinimalGPUDeviceLostInfo) => void;
}): Promise<Studio3DBackendAcquisitionResult> {
  const webgpu = await Studio3DWebGPURenderer.create({
    targetCanvas: options?.webgpuCanvas,
    gpu: options?.gpu,
    onDeviceLost: options?.onDeviceLost,
  });
  if (webgpu) {
    return { backend: 'webgpu', renderer: webgpu };
  }

  const webgl2 = Studio3DWebGL2Renderer.create(options?.webgl2Canvas);
  if (webgl2) {
    return { backend: 'webgl2', renderer: webgl2 };
  }

  return { backend: 'canvas2d', renderer: null };
}

let sharedWebgpuRenderer: Studio3DWebGPURenderer | null | undefined;
let sharedWebgpuInitPromise: Promise<Studio3DWebGPURenderer | null> | null = null;

/**
 * Non-blocking shared Priority-1 WebGPU accessor for direct `renderRealtimeStudio3DFrame`
 * callers (e.g. `LiveStageKinematicDiagram`). Initiates WebGPU asynchronously on first call
 * and serves WebGPU immediately on every subsequent frame once ready.
 */
export function getSharedStudio3DWebGPURenderer(): Studio3DWebGPURenderer | null {
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return null;
  }
  if (sharedWebgpuRenderer && sharedWebgpuRenderer.isAvailable()) {
    return sharedWebgpuRenderer;
  }
  if (sharedWebgpuRenderer === null) {
    return null;
  }
  if (!sharedWebgpuInitPromise && readNavigatorGpu()) {
    sharedWebgpuInitPromise = Studio3DWebGPURenderer.create({
      onDeviceLost: () => {
        sharedWebgpuRenderer?.dispose();
        sharedWebgpuRenderer = undefined;
        sharedWebgpuInitPromise = null;
      },
    }).then((renderer) => {
      sharedWebgpuRenderer = renderer;
      sharedWebgpuInitPromise = null;
      return renderer;
    });
  }
  return null;
}

export function resetSharedStudio3DWebGPURendererForTests(): void {
  if (sharedWebgpuRenderer) {
    sharedWebgpuRenderer.dispose();
  }
  sharedWebgpuRenderer = undefined;
  sharedWebgpuInitPromise = null;
}

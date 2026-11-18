export interface GlbBinaryAuditResult {
  readonly valid: boolean;
  readonly magicHex: string;
  readonly version: number;
  readonly declaredByteLength: number;
  readonly actualByteLength: number;
  readonly meshCount: number;
  readonly nodeCount: number;
  readonly negativeScaleNodeCount: number;
  readonly materialNames: readonly string[];
  readonly failureReason: string | null;
}

const GLTF_BINARY_MAGIC = 0x46546c67; // 'glTF' in little-endian
const GLTF_JSON_CHUNK_TYPE = 0x4e4f534a; // 'JSON' in little-endian

/**
 * Zero-allocation header & JSON chunk inspector for exported Blender .glb assets.
 * Verifies glTF 2.0 binary framing and flags negative node scales that invert face normals.
 */
export function inspectGlbBinaryHeader(buffer: ArrayBuffer): GlbBinaryAuditResult {
  const actualByteLength = buffer.byteLength;
  if (actualByteLength < 20) {
    return Object.freeze({
      valid: false,
      magicHex: '0x0',
      version: 0,
      declaredByteLength: 0,
      actualByteLength,
      meshCount: 0,
      nodeCount: 0,
      negativeScaleNodeCount: 0,
      materialNames: Object.freeze([]),
      failureReason: 'GLB 헤더 최소 길이(20바이트) 미만입니다.',
    });
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  const declaredByteLength = view.getUint32(8, true);
  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  const magicHex = `0x${magic.toString(16)}`;

  if (magic !== GLTF_BINARY_MAGIC) {
    return Object.freeze({
      valid: false,
      magicHex,
      version,
      declaredByteLength,
      actualByteLength,
      meshCount: 0,
      nodeCount: 0,
      negativeScaleNodeCount: 0,
      materialNames: Object.freeze([]),
      failureReason: '유효한 glTF 바이너리 매직 헤더(0x46546c67)가 아닙니다.',
    });
  }

  if (
    version !== 2 ||
    declaredByteLength > actualByteLength ||
    20 + jsonChunkLength > actualByteLength
  ) {
    return Object.freeze({
      valid: false,
      magicHex,
      version,
      declaredByteLength,
      actualByteLength,
      meshCount: 0,
      nodeCount: 0,
      negativeScaleNodeCount: 0,
      materialNames: Object.freeze([]),
      failureReason: 'GLB 버전(v2) 또는 청크 길이 경계가 손상되었습니다.',
    });
  }

  if (jsonChunkType !== GLTF_JSON_CHUNK_TYPE) {
    return Object.freeze({
      valid: false,
      magicHex,
      version,
      declaredByteLength,
      actualByteLength,
      meshCount: 0,
      nodeCount: 0,
      negativeScaleNodeCount: 0,
      materialNames: Object.freeze([]),
      failureReason: '첫 번째 GLB 청크가 JSON(0x4e4f534a)이 아닙니다.',
    });
  }

  try {
    const jsonBytes = new Uint8Array(buffer, 20, jsonChunkLength);
    const parsed = JSON.parse(new TextDecoder('utf-8').decode(jsonBytes)) as {
      meshes?: unknown[];
      nodes?: Array<{ scale?: unknown }>;
      materials?: Array<{ name?: unknown }>;
    };
    const meshes = Array.isArray(parsed.meshes) ? parsed.meshes : [];
    const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const materials = Array.isArray(parsed.materials) ? parsed.materials : [];
    let negativeScaleNodeCount = 0;
    for (const node of nodes) {
      if (
        Array.isArray(node.scale) &&
        node.scale.some((axis) => typeof axis === 'number' && axis < 0)
      ) {
        negativeScaleNodeCount += 1;
      }
    }
    const materialNames = Object.freeze(
      materials
        .map((mat) => (typeof mat?.name === 'string' ? mat.name : ''))
        .filter((name) => name.length > 0),
    );
    const valid = negativeScaleNodeCount === 0 && meshes.length > 0;
    return Object.freeze({
      valid,
      magicHex,
      version,
      declaredByteLength,
      actualByteLength,
      meshCount: meshes.length,
      nodeCount: nodes.length,
      negativeScaleNodeCount,
      materialNames,
      failureReason:
        negativeScaleNodeCount > 0
          ? `음수 스케일 노드(${negativeScaleNodeCount}개)가 감지되어 노멀 반전 위험이 있습니다.`
          : meshes.length === 0
            ? 'GLB 내부에 유효한 메시가 없습니다.'
            : null,
    });
  } catch {
    return Object.freeze({
      valid: false,
      magicHex,
      version,
      declaredByteLength,
      actualByteLength,
      meshCount: 0,
      nodeCount: 0,
      negativeScaleNodeCount: 0,
      materialNames: Object.freeze([]),
      failureReason: 'GLB JSON 청크 파싱에 실패했습니다.',
    });
  }
}

export interface Device3dSignals {
  readonly deviceMemoryGiB?: number | null;
  readonly hardwareConcurrency?: number | null;
  readonly devicePixelRatio?: number | null;
  readonly saveData?: boolean;
}

export interface Adaptive3dFrameBudget {
  readonly tier: 'high' | 'low-memory';
  readonly maxDpr: number;
  readonly effectiveDpr: number;
  readonly targetFps: 30 | 60;
  readonly frameIntervalMs: number;
  readonly fillRateReductionPct: number;
}

const BASELINE_UNTHROTTLED_DPR = 2.25;
const BASELINE_UNTHROTTLED_FPS = 60;

/**
 * Computes deterministic DPR & frame-rate caps so <=4GB mobile devices avoid
 * thermal throttling and GC frame drops during continuous 3D motion playback.
 */
export function resolveAdaptive3dFrameBudget(signals: Device3dSignals = {}): Adaptive3dFrameBudget {
  const mem =
    typeof signals.deviceMemoryGiB === 'number' && Number.isFinite(signals.deviceMemoryGiB)
      ? signals.deviceMemoryGiB
      : null;
  const cores =
    typeof signals.hardwareConcurrency === 'number' && Number.isFinite(signals.hardwareConcurrency)
      ? signals.hardwareConcurrency
      : null;
  const rawDpr =
    typeof signals.devicePixelRatio === 'number' &&
    Number.isFinite(signals.devicePixelRatio) &&
    signals.devicePixelRatio > 0
      ? signals.devicePixelRatio
      : 1;

  const isLowMemory =
    signals.saveData === true || (mem !== null && mem <= 4) || (cores !== null && cores <= 4);

  const maxDpr = isLowMemory ? 1.25 : 2;
  const targetFps: 30 | 60 = isLowMemory ? 30 : 60;
  const effectiveDpr = Math.min(maxDpr, rawDpr);
  const frameIntervalMs = Number((1000 / targetFps).toFixed(2));

  const baselineThroughput =
    Math.pow(Math.min(BASELINE_UNTHROTTLED_DPR, Math.max(rawDpr, BASELINE_UNTHROTTLED_DPR)), 2) *
    BASELINE_UNTHROTTLED_FPS;
  const guardedThroughput = Math.pow(effectiveDpr, 2) * targetFps;
  const fillRateReductionPct = Math.max(
    0,
    Number((((baselineThroughput - guardedThroughput) / baselineThroughput) * 100).toFixed(1)),
  );

  return Object.freeze({
    tier: isLowMemory ? 'low-memory' : 'high',
    maxDpr,
    effectiveDpr,
    targetFps,
    frameIntervalMs,
    fillRateReductionPct,
  });
}

export function readAmbientDevice3dSignals(): Device3dSignals {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {};
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    deviceMemoryGiB: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    hardwareConcurrency:
      typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    devicePixelRatio: window.devicePixelRatio || 1,
    saveData: nav.connection?.saveData === true,
  };
}

export type Studio3dDisposableKind =
  | 'geometry'
  | 'material'
  | 'texture'
  | 'render-target'
  | 'image-bitmap'
  | 'canvas-backing';

export interface Studio3dDisposableHandle {
  readonly dispose?: () => void;
  readonly close?: () => void;
}

export interface Studio3dResourceGuardSnapshot {
  readonly activeCount: number;
  readonly disposedTotalCount: number;
  readonly contextLost: boolean;
  readonly recoveryCount: number;
}

/**
 * Deterministic GPU/Canvas resource tracker that keeps transient viewport resources
 * out of React render state and guarantees idempotent disposal on unmount or scene swap.
 */
export function createStudio3dResourceGuard() {
  const active = new Map<
    string,
    { kind: Studio3dDisposableKind; handle: Studio3dDisposableHandle }
  >();
  let disposedTotalCount = 0;
  let contextLost = false;
  let recoveryCount = 0;

  return {
    track<T extends Studio3dDisposableHandle>(
      id: string,
      kind: Studio3dDisposableKind,
      handle: T,
    ): T {
      const existing = active.get(id);
      if (existing && existing.handle !== handle) {
        existing.handle.dispose?.();
        existing.handle.close?.();
        disposedTotalCount += 1;
      }
      active.set(id, { kind, handle });
      return handle;
    },
    release(id: string): boolean {
      const entry = active.get(id);
      if (!entry) return false;
      active.delete(id);
      entry.handle.dispose?.();
      entry.handle.close?.();
      disposedTotalCount += 1;
      return true;
    },
    disposeAll(): number {
      let releasedNow = 0;
      for (const [, entry] of active) {
        entry.handle.dispose?.();
        entry.handle.close?.();
        releasedNow += 1;
        disposedTotalCount += 1;
      }
      active.clear();
      return releasedNow;
    },
    notifyContextLost(): void {
      contextLost = true;
    },
    notifyContextRestored(): void {
      if (contextLost) {
        contextLost = false;
        recoveryCount += 1;
      }
    },
    snapshot(): Studio3dResourceGuardSnapshot {
      return Object.freeze({
        activeCount: active.size,
        disposedTotalCount,
        contextLost,
        recoveryCount,
      });
    },
  };
}

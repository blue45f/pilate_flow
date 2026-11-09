export type ExtendedEvidenceKind = 'apparatus' | 'mat';

export type MovementVisualRigCatalogModule =
    typeof import('../data/movementVisualRigCatalog');

export type TrackDExtendedApparatusEvidenceModule =
    typeof import('../features/motionEvidenceReview/trackDExtendedApparatusEvidence');

export type TrackCExtendedMatEvidenceModule =
    typeof import('../features/motionEvidenceReview/trackCExtendedMatEvidence');

export type ExtendedMotionEvidenceModuleMap = {
    apparatus: TrackDExtendedApparatusEvidenceModule;
    mat: TrackCExtendedMatEvidenceModule;
};

export interface ExerciseVisualRigEntry {
    exerciseId?: string;
    id?: string;
    [key: string]: unknown;
}

let rigCatalogPromise: Promise<MovementVisualRigCatalogModule> | null = null;
let apparatusEvidencePromise: Promise<TrackDExtendedApparatusEvidenceModule> | null = null;
let matEvidencePromise: Promise<TrackCExtendedMatEvidenceModule> | null = null;

export function loadMovementVisualRigCatalog(): Promise<MovementVisualRigCatalogModule> {
    if (!rigCatalogPromise) {
        rigCatalogPromise = import('../data/movementVisualRigCatalog').catch((error) => {
            rigCatalogPromise = null;
            throw error;
        });
    }
    return rigCatalogPromise;
}

function resolveRigFromCatalogModule(
    catalogModule: MovementVisualRigCatalogModule,
    exerciseId: string,
): ExerciseVisualRigEntry | null {
    const normalizedId = exerciseId.trim();
    if (!normalizedId) {
        return null;
    }

    const modRecord = catalogModule as unknown as Record<string, unknown>;
    const helperCandidates = [
        'getExerciseVisualRigById',
        'getMovementVisualRigById',
        'findMovementVisualRigById',
        'getVisualRigById',
    ];

    for (const fnName of helperCandidates) {
        const candidateFn = modRecord[fnName];
        if (typeof candidateFn === 'function') {
            const result = (
                candidateFn as (id: string) => ExerciseVisualRigEntry | undefined | null
            )(normalizedId);
            if (result) {
                return result;
            }
        }
    }

    const collectionCandidates = [
        modRecord.MOVEMENT_VISUAL_RIG_CATALOG,
        modRecord.movementVisualRigCatalog,
        modRecord.EXERCISE_VISUAL_RIG_CATALOG,
        modRecord.exerciseVisualRigCatalog,
        modRecord.default,
    ];

    for (const collection of collectionCandidates) {
        if (!collection) continue;

        if (collection instanceof Map) {
            if (collection.has(normalizedId)) {
                return (collection.get(normalizedId) as ExerciseVisualRigEntry) ?? null;
            }
            continue;
        }

        if (Array.isArray(collection)) {
            const matched = collection.find(
                (item): item is ExerciseVisualRigEntry =>
                    typeof item === 'object' &&
                    item !== null &&
                    ((item as ExerciseVisualRigEntry).exerciseId === normalizedId ||
                        (item as ExerciseVisualRigEntry).id === normalizedId),
            );
            if (matched) {
                return matched;
            }
            continue;
        }

        if (typeof collection === 'object') {
            const record = collection as Record<string, unknown>;
            if (
                normalizedId in record &&
                typeof record[normalizedId] === 'object' &&
                record[normalizedId] !== null
            ) {
                return record[normalizedId] as ExerciseVisualRigEntry;
            }
        }
    }

    return null;
}

export async function loadExerciseVisualRigById(
    exerciseId: string,
): Promise<ExerciseVisualRigEntry | null> {
    if (!exerciseId || typeof exerciseId !== 'string') {
        return null;
    }

    const catalogModule = await loadMovementVisualRigCatalog();
    return resolveRigFromCatalogModule(catalogModule, exerciseId);
}

export function loadExtendedMotionEvidence(
    kind: 'apparatus',
): Promise<TrackDExtendedApparatusEvidenceModule>;
export function loadExtendedMotionEvidence(
    kind: 'mat',
): Promise<TrackCExtendedMatEvidenceModule>;
export function loadExtendedMotionEvidence<K extends ExtendedEvidenceKind>(
    kind: K,
): Promise<ExtendedMotionEvidenceModuleMap[K]>;
export function loadExtendedMotionEvidence(
    kind: ExtendedEvidenceKind,
): Promise<TrackDExtendedApparatusEvidenceModule | TrackCExtendedMatEvidenceModule> {
    if (kind === 'apparatus') {
        if (!apparatusEvidencePromise) {
            apparatusEvidencePromise = import(
                '../features/motionEvidenceReview/trackDExtendedApparatusEvidence'
            ).catch((error) => {
                apparatusEvidencePromise = null;
                throw error;
            });
        }
        return apparatusEvidencePromise;
    }

    if (kind === 'mat') {
        if (!matEvidencePromise) {
            matEvidencePromise = import(
                '../features/motionEvidenceReview/trackCExtendedMatEvidence'
            ).catch((error) => {
                matEvidencePromise = null;
                throw error;
            });
        }
        return matEvidencePromise;
    }

    return Promise.reject(new Error(`Unsupported extended motion evidence kind: ${String(kind)}`));
}

export function clearLazyVisualRigCacheForTest(): void {
    rigCatalogPromise = null;
    apparatusEvidencePromise = null;
    matEvidencePromise = null;
}

export const LOCAL_MEDIA_DB_NAME = 'pilates-flow-local-media-v1';
export const LOCAL_MEDIA_STORE_NAME = 'photos';
export const STUDIO_SYNC_CHANNEL_NAME = 'pilates-flow-studio-sync-v1';

export const LOCAL_PHOTO_URI_PREFIX = 'local-photo://';

export type StudioSyncEventKind =
    | 'human-draft-updated'
    | 'reusable-block-updated'
    | 'sequence-updated';

export interface StudioSyncEventPayload {
    kind: StudioSyncEventKind;
    entityId: string;
    revision?: number;
    updatedAt: string;
}

export interface LocalPhotoRecord {
    id: string;
    dataUrl: string;
    updatedAt: string;
}

const inMemoryPhotoStore = new Map<string, string>();

const inMemorySyncListeners = new Set<
    (payload: { kind: string; entityId: string; revision?: number; updatedAt: string }) => void
>();

export function extractLocalPhotoId(idOrUri: string): string {
    const trimmed = idOrUri.trim();
    if (trimmed.startsWith(LOCAL_PHOTO_URI_PREFIX)) {
        return trimmed.slice(LOCAL_PHOTO_URI_PREFIX.length);
    }
    return trimmed;
}

export function toLocalPhotoUri(id: string): string {
    const cleanId = extractLocalPhotoId(id);
    return `${LOCAL_PHOTO_URI_PREFIX}${cleanId}`;
}

function getIndexedDbFactory(): IDBFactory | null {
    if (typeof globalThis === 'undefined') {
        return null;
    }
    const idb = (globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB;
    if (!idb || typeof idb.open !== 'function') {
        return null;
    }
    return idb;
}

function openLocalMediaDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const idb = getIndexedDbFactory();
        if (!idb) {
            reject(new Error('IndexedDB is not supported in this environment.'));
            return;
        }

        let request: IDBOpenDBRequest;
        try {
            request = idb.open(LOCAL_MEDIA_DB_NAME, 1);
        } catch (err) {
            reject(err);
            return;
        }

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(LOCAL_MEDIA_STORE_NAME)) {
                db.createObjectStore(LOCAL_MEDIA_STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error ?? new Error('Failed to open IndexedDB.'));
        };

        request.onblocked = () => {
            reject(new Error('IndexedDB open request was blocked.'));
        };
    });
}

export async function saveLocalPhotoAsset(
    id: string,
    dataUrl: string,
): Promise<{ uri: string; storedInIndexedDb: boolean }> {
    const cleanId = extractLocalPhotoId(id);
    const uri = toLocalPhotoUri(cleanId);

    inMemoryPhotoStore.set(cleanId, dataUrl);

    const idb = getIndexedDbFactory();
    if (!idb) {
        return {
            uri,
            storedInIndexedDb: false,
        };
    }

    try {
        const db = await openLocalMediaDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(LOCAL_MEDIA_STORE_NAME, 'readwrite');
            const store = tx.objectStore(LOCAL_MEDIA_STORE_NAME);
            const record: LocalPhotoRecord = {
                id: cleanId,
                dataUrl,
                updatedAt: new Date().toISOString(),
            };

            const request = store.put(record);
            request.onerror = () => reject(request.error ?? new Error('Failed to put photo record.'));

            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error ?? new Error('IndexedDB write transaction failed.'));
            };
            tx.onabort = () => {
                db.close();
                reject(tx.error ?? new Error('IndexedDB write transaction aborted.'));
            };
        });

        return {
            uri,
            storedInIndexedDb: true,
        };
    } catch {
        return {
            uri,
            storedInIndexedDb: false,
        };
    }
}

export async function loadLocalPhotoAsset(idOrUri: string): Promise<string | null> {
    if (!idOrUri || typeof idOrUri !== 'string') {
        return null;
    }

    const trimmed = idOrUri.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith('data:')) {
        return trimmed;
    }

    const cleanId = extractLocalPhotoId(trimmed);

    const idb = getIndexedDbFactory();
    if (idb) {
        try {
            const db = await openLocalMediaDb();
            const record = await new Promise<LocalPhotoRecord | string | undefined>((resolve, reject) => {
                const tx = db.transaction(LOCAL_MEDIA_STORE_NAME, 'readonly');
                const store = tx.objectStore(LOCAL_MEDIA_STORE_NAME);
                const request = store.get(cleanId);

                request.onsuccess = () => {
                    resolve(request.result as LocalPhotoRecord | string | undefined);
                };
                request.onerror = () => {
                    reject(request.error ?? new Error('Failed to read photo record from IndexedDB.'));
                };

                tx.oncomplete = () => {
                    db.close();
                };
                tx.onerror = () => {
                    db.close();
                };
                tx.onabort = () => {
                    db.close();
                };
            });

            if (record) {
                const resolvedDataUrl = typeof record === 'string' ? record : record.dataUrl;
                if (typeof resolvedDataUrl === 'string' && resolvedDataUrl.length > 0) {
                    inMemoryPhotoStore.set(cleanId, resolvedDataUrl);
                    return resolvedDataUrl;
                }
            }
        } catch {
            // Fallback to in-memory store
        }
    }

    return inMemoryPhotoStore.get(cleanId) ?? null;
}

export function clearInMemoryPhotoAssets(): void {
    inMemoryPhotoStore.clear();
}

export function broadcastStudioSyncEvent(payload: StudioSyncEventPayload): void {
    inMemorySyncListeners.forEach((listener) => {
        try {
            listener(payload);
        } catch {
            // Ignore listener errors
        }
    });

    if (typeof globalThis === 'undefined' || typeof BroadcastChannel === 'undefined') {
        return;
    }

    try {
        const channel = new BroadcastChannel(STUDIO_SYNC_CHANNEL_NAME);
        channel.postMessage(payload);
        channel.close();
    } catch {
        // Ignore BroadcastChannel errors
    }
}

export function subscribeStudioSyncEvents(
    handler: (payload: {
        kind: string;
        entityId: string;
        revision?: number;
        updatedAt: string;
    }) => void,
): () => void {
    inMemorySyncListeners.add(handler);

    if (typeof globalThis === 'undefined' || typeof BroadcastChannel === 'undefined') {
        return () => {
            inMemorySyncListeners.delete(handler);
        };
    }

    let channel: BroadcastChannel | null = null;
    const onMessage = (event: MessageEvent) => {
        const data = event?.data;
        if (
            data &&
            typeof data === 'object' &&
            typeof data.kind === 'string' &&
            typeof data.entityId === 'string' &&
            typeof data.updatedAt === 'string'
        ) {
            try {
                handler({
                    kind: data.kind,
                    entityId: data.entityId,
                    revision: typeof data.revision === 'number' ? data.revision : undefined,
                    updatedAt: data.updatedAt,
                });
            } catch {
                // Ignore handler errors
            }
        }
    };

    try {
        channel = new BroadcastChannel(STUDIO_SYNC_CHANNEL_NAME);
        channel.addEventListener('message', onMessage);
    } catch {
        channel = null;
    }

    return () => {
        inMemorySyncListeners.delete(handler);
        if (channel) {
            try {
                channel.removeEventListener('message', onMessage);
                channel.close();
            } catch {
                // Ignore close errors
            }
            channel = null;
        }
    };
}

type NativeArtworkModule = typeof import('../components/NativeExerciseMotionArtwork');
let loaded: NativeArtworkModule | null = null;
let pending: Promise<NativeArtworkModule> | null = null;

export function getLoadedNativeExerciseArtwork() {
  return loaded;
}

/** Share one import; subsequent mounts use the ready module without a placeholder flash. */
export function loadNativeExerciseArtwork(): Promise<NativeArtworkModule> {
  if (loaded) return Promise.resolve(loaded);
  if (!pending) {
    pending = import('../components/NativeExerciseMotionArtwork').then(
      (module) => {
        loaded = module;
        return module;
      },
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
  }
  return pending;
}

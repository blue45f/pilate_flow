import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { DraftPlaybackController } from "../models/DraftPlaybackController";
import type { DraftPlaybackState } from "../models/DraftPlaybackController";

export function useMotionDraftPlayback(
  dialogRef: RefObject<HTMLDialogElement | null>,
  sceneRef: RefObject<HTMLDivElement | null>,
  sceneKey: string | null,
  active = true,
) {
  const [state, setState] = useState<DraftPlaybackState>({
    progress: 0,
    speed: 1,
    playing: false,
  });
  const [query] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null,
  );
  const [reducedMotion, setReducedMotion] = useState(query?.matches ?? false);
  const inView = useRef(true);
  const [controller] = useState(
    () =>
      new DraftPlaybackController({
        requestFrame: (callback) => window.requestAnimationFrame(callback),
        cancelFrame: (id) => window.cancelAnimationFrame(id),
        onChange: setState,
        canPlay: () => false,
      }),
  );
  useLayoutEffect(() => {
    controller.setCanPlay(
      () =>
        active &&
        Boolean(dialogRef.current?.open) &&
        !document.hidden &&
        !query?.matches &&
        inView.current,
    );
    return () => controller.setCanPlay(() => false);
  }, [active, controller, dialogRef, query]);
  useEffect(() => {
    if (!active) controller.pause();
  }, [active, controller]);
  useEffect(() => {
    const change = (event: MediaQueryListEvent) => {
      if (event.matches) controller.pause();
      setReducedMotion(event.matches);
    };
    query?.addEventListener("change", change);
    return () => query?.removeEventListener("change", change);
  }, [controller, query]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) controller.pause();
    };
    const pageHidden = () => controller.pause();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pageHidden);
    const scene = sceneRef.current;
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            inView.current = entry.isIntersecting;
            if (!entry.isIntersecting) controller.pause();
          })
        : null;
    if (scene) observer?.observe(scene);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pageHidden);
      observer?.disconnect();
      controller.destroy();
    };
  }, [controller, sceneRef, sceneKey]);
  return { state, controller, reducedMotion };
}

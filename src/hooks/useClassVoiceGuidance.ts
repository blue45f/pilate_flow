import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ClassVoiceController } from '../models/ClassVoiceController';
import type { ClassVoicePreferences, ClassVoiceSnapshot } from '../models/ClassVoiceController';

export function useClassVoiceGuidance(snapshot: Omit<ClassVoiceSnapshot, 'visible'>) {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState<ClassVoicePreferences>({
    movement: true,
    breath: true,
    time: true,
  });
  const latest = useRef(snapshot);
  useLayoutEffect(() => {
    latest.current = snapshot;
  }, [snapshot]);
  const voice = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const engine = useRef<ClassVoiceController | null>(null);
  const generation = useRef(0);
  const getSnapshot = useCallback(
    (): ClassVoiceSnapshot => ({
      ...latest.current,
      visible: document.visibilityState !== 'hidden',
    }),
    [],
  );

  useEffect(() => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    const synth = window.speechSynthesis;
    const controller = new ClassVoiceController({
      cancel: () => {
        generation.current += 1;
        synth.cancel();
      },
      speak: (text) => {
        // Never fall back to an unspecified/remote voice: class notes stay on device.
        if (!voice.current?.localService) return;
        const currentGeneration = ++generation.current;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice.current;
        utterance.lang = voice.current.lang;
        utterance.rate = 1;
        utterance.onerror = (event) => {
          if (
            currentGeneration !== generation.current ||
            event.error === 'canceled' ||
            event.error === 'interrupted'
          )
            return;
          controller.setEnabled(false, getSnapshot());
          setEnabled(false);
          setError('음성을 재생하지 못했어요. 기기 음량과 한국어 음성을 확인한 뒤 다시 켜 주세요.');
        };
        try {
          synth.speak(utterance);
        } catch {
          controller.setEnabled(false, getSnapshot());
          setEnabled(false);
          setError('음성을 재생하지 못했어요. 기기 음량과 한국어 음성을 확인한 뒤 다시 켜 주세요.');
        }
      },
    });
    engine.current = controller;
    const loadVoices = () => {
      voice.current = synth
        .getVoices()
        .find((item) => item.localService && /^ko(?:[-_]|$)/i.test(item.lang));
      setAvailable(!!voice.current);
      if (!voice.current) {
        controller.setEnabled(false, getSnapshot());
        setEnabled(false);
      }
    };
    const visibility = () => controller.update(getSnapshot());
    const pageHide = () => controller.cancel();
    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    return () => {
      controller.destroy();
      engine.current = null;
      synth.removeEventListener('voiceschanged', loadVoices);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
    };
  }, [getSnapshot]);

  useEffect(() => {
    engine.current?.update(getSnapshot());
  }, [snapshot, getSnapshot]);

  const toggleEnabled = () => {
    if (!available) return;
    setError('');
    setEnabled(!enabled);
    // Called directly by a user gesture, including activation during a running class.
    engine.current?.setEnabled(!enabled, getSnapshot());
  };
  const stop = () => {
    engine.current?.setEnabled(false, getSnapshot());
    setEnabled(false);
  };
  const changePreference = (key: keyof ClassVoicePreferences, checked: boolean) => {
    const next = { ...preferences, [key]: checked };
    setPreferences(next);
    engine.current?.setPreferences(next);
  };
  const start = (remainingSec: number, phase: string) =>
    engine.current?.update({ ...getSnapshot(), running: true, remainingSec, phase });
  const pause = () => {
    engine.current?.cancel();
    engine.current?.update({ ...getSnapshot(), running: false });
  };
  return {
    enabled,
    available,
    error,
    preferences,
    toggleEnabled,
    stop,
    changePreference,
    start,
    pause,
  };
}

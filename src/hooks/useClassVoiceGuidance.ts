import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ClassVoiceController } from '../models/ClassVoiceController';
import type { ClassVoicePreferences, ClassVoiceSnapshot } from '../models/ClassVoiceController';

function pickLocalKoreanVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  try {
    const voices = synth.getVoices?.();
    if (!Array.isArray(voices)) return undefined;
    const localKorean = voices.filter(
      (item) =>
        item.localService === true &&
        /^ko(?:-|$)/i.test((item.lang ?? '').replace(/_/g, '-').trim()),
    );
    return (
      localKorean.find(
        (item) => (item.lang ?? '').replace(/_/g, '-').trim().toLowerCase() === 'ko-kr',
      ) ?? localKorean[0]
    );
  } catch {
    return undefined;
  }
}

export function useClassVoiceGuidance(snapshot: Omit<ClassVoiceSnapshot, 'visible'>) {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState<ClassVoicePreferences>({
    movement: true,
    breath: true,
    time: true,
  });
  const enabledRef = useRef(false);
  const availableRef = useRef(false);
  const preferencesRef = useRef<ClassVoicePreferences>(preferences);
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
    const UtteranceCtor = window.SpeechSynthesisUtterance;
    if (
      !synth ||
      typeof synth.speak !== 'function' ||
      typeof synth.cancel !== 'function' ||
      typeof synth.getVoices !== 'function' ||
      typeof UtteranceCtor !== 'function'
    )
      return;
    const controller = new ClassVoiceController({
      cancel: () => {
        generation.current += 1;
        try {
          synth.cancel();
        } catch {
          // Ignore browser cancel errors.
        }
      },
      speak: (text) => {
        // Never fall back to an unspecified/remote voice: class notes stay on device.
        const activeVoice = pickLocalKoreanVoice(synth);
        voice.current = activeVoice;
        if (!activeVoice?.localService) {
          availableRef.current = false;
          enabledRef.current = false;
          setAvailable(false);
          controller.setEnabled(false, getSnapshot());
          setEnabled(false);
          return;
        }
        const currentGeneration = ++generation.current;
        const utterance = new UtteranceCtor(text);
        utterance.voice = activeVoice;
        utterance.lang = activeVoice.lang;
        utterance.rate = 1;
        utterance.onerror = (event) => {
          if (
            currentGeneration !== generation.current ||
            event.error === 'canceled' ||
            event.error === 'interrupted'
          )
            return;
          enabledRef.current = false;
          controller.setEnabled(false, getSnapshot());
          setEnabled(false);
          setError('음성을 재생하지 못했어요. 기기 음량과 한국어 음성을 확인한 뒤 다시 켜 주세요.');
        };
        try {
          synth.speak(utterance);
        } catch {
          enabledRef.current = false;
          controller.setEnabled(false, getSnapshot());
          setEnabled(false);
          setError('음성을 재생하지 못했어요. 기기 음량과 한국어 음성을 확인한 뒤 다시 켜 주세요.');
        }
      },
    });
    engine.current = controller;
    controller.setPreferences(preferencesRef.current);
    const loadVoices = () => {
      voice.current = pickLocalKoreanVoice(synth);
      availableRef.current = !!voice.current;
      setAvailable(!!voice.current);
      if (!voice.current) {
        enabledRef.current = false;
        controller.setEnabled(false, getSnapshot());
        setEnabled(false);
      }
    };
    const visibility = () => controller.update(getSnapshot());
    const pageHide = () => controller.cancel();
    loadVoices();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', loadVoices);
    }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    return () => {
      controller.destroy();
      engine.current = null;
      if (typeof synth.removeEventListener === 'function') {
        synth.removeEventListener('voiceschanged', loadVoices);
      }
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
    };
  }, [getSnapshot]);

  useEffect(() => {
    engine.current?.update(getSnapshot());
  }, [snapshot, getSnapshot]);

  const toggleEnabled = () => {
    if (!availableRef.current) return;
    const next = !enabledRef.current;
    enabledRef.current = next;
    setError('');
    setEnabled(next);
    // Called directly by a user gesture, including activation during a running class.
    engine.current?.setEnabled(next, getSnapshot());
  };
  const stop = () => {
    enabledRef.current = false;
    engine.current?.setEnabled(false, getSnapshot());
    setEnabled(false);
  };
  const changePreference = (key: keyof ClassVoicePreferences, checked: boolean) => {
    const next = { ...preferencesRef.current, [key]: checked };
    preferencesRef.current = next;
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

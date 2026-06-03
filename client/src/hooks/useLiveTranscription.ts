import { useEffect, useRef, useState, useCallback } from 'react';

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  }
}

export function useLiveTranscription(onChunk: (text: string) => void, enabled: boolean) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!supported || !enabled) return;
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results as unknown as SpeechRecognitionResultList;
      let interim = '';
      let final = '';
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const text = result[0]?.transcript || '';
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (final.trim()) {
        onChunk(final.trim());
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [supported, enabled, onChunk]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText('');
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { isListening, interimText, start, stop, supported };
}

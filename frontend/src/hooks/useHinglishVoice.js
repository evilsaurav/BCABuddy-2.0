import { useCallback, useMemo, useRef, useState } from 'react';

const getSpeechRecognitionCtor = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export default function useHinglishVoice() {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const isSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setError('Voice input is not supported in this browser.');
      return false;
    }

    if (isListening) return true;

    setError('');
    setTranscript('');

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let collected = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const item = event.results[i];
        collected += item[0]?.transcript || '';
      }
      setTranscript(String(collected || '').trim());
    };

    recognition.onerror = (evt) => {
      const code = String(evt?.error || 'unknown_error');
      if (code === 'not-allowed') {
        setError('Mic permission blocked. Browser settings me mic allow karo.');
      } else if (code === 'no-speech') {
        setError('Voice detect nahi hua. Thoda clearly bolo.');
      } else {
        setError(`Voice input error: ${code}`);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    return true;
  }, [isListening]);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
}

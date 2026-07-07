"use client";

import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror?: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop?: () => void;
};

export default function VoiceSearchButton({ inputName = "q" }: { inputName?: string }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-ZA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || "";
      const input = document.querySelector<HTMLInputElement>(`input[name="${inputName}"]`);
      if (!transcript || !input?.form) {
        setMessage("We did not hear anything. Please try again or type your search.");
        return;
      }
      input.value = transcript;
      input.form.requestSubmit();
    };
    recognition.onerror = () => {
      setMessage("We could not understand that. Please try again.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => recognition.stop?.();
  }, [inputName]);

  function startVoiceSearch() {
    if (!recognitionRef.current) {
      setMessage("Voice search is not supported on this browser. Please type your search.");
      return;
    }

    try {
      setMessage("Listening...");
      setListening(true);
      recognitionRef.current.start();
    } catch {
      setListening(false);
      setMessage("Microphone access was blocked. You can still type your search.");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={startVoiceSearch}
        disabled={listening}
        aria-label="Search by voice"
        className="min-h-12 rounded-md border border-white/20 px-4 text-white transition hover:border-lethela-primary hover:text-lethela-primary disabled:opacity-55"
      >
        <Mic className={listening ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
      </button>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
      {message && !listening ? <span className="text-xs text-white/60">{message}</span> : null}
    </div>
  );
}

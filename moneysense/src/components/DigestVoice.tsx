"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square, Volume2 } from "lucide-react";

// Speaks the Monday digest aloud using the browser's built-in speech engine.
// In production this is the Gnani voice rail; here it's a zero-setup stand-in
// so the voice note actually plays in the demo.
export function DigestVoice({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    // Prime the voice list (some browsers load it lazily).
    try {
      window.speechSynthesis?.getVoices();
    } catch {
      /* ignore */
    }
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function pickVoice(): SpeechSynthesisVoice | null {
    try {
      const voices = window.speechSynthesis.getVoices();
      return (
        voices.find((v) => /en[-_]IN/i.test(v.lang)) ||
        voices.find((v) => /hi[-_]IN/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang)) ||
        null
      );
    } catch {
      return null;
    }
  }

  function toggle() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 0.98;
    u.pitch = 1;
    const v = pickVoice();
    if (v) u.voice = v;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={!supported}
        aria-label={speaking ? "Stop voice note" : "Play voice note"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50"
      >
        {speaking ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      {!supported && (
        <span className="text-xs text-muted-foreground">
          Voice isn&rsquo;t supported in this browser.
        </span>
      )}
      {supported && (
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Volume2 className="h-3.5 w-3.5" />
          {speaking ? "Stop" : "Play voice note"}
        </button>
      )}
    </div>
  );
}

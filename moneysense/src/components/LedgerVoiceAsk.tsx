"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Volume2, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";

// The "anytime voice question" node: ask by voice or text, answered from the
// tagged ledger and read back aloud. Speech in/out is the browser Web Speech
// API here (the Gnani voice rail in production).
export function LedgerVoiceAsk() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setMicOk(!!SR);
    return () => {
      try {
        window.speechSynthesis?.cancel();
        recogRef.current?.stop?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function speak(text: string) {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-IN";
      u.rate = 0.98;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  async function ask(q: string) {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/agent/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      const a = data?.answer ?? "Sorry, I couldn't work that out.";
      setAnswer(a);
      speak(a);
    } catch {
      setAnswer("Something went wrong reaching your ledger.");
    } finally {
      setLoading(false);
    }
  }

  function startListening() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = "en-IN";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (e: any) => {
      const said = e.results?.[0]?.[0]?.transcript ?? "";
      setQuestion(said);
      setListening(false);
      ask(said);
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    setListening(true);
    recog.start();
  }

  const chips = [
    "Where did my money go?",
    "How much on food this month?",
    "What's left this week?",
    "Anything unexplained?",
  ];

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your spending…"
          aria-label="Ask about your spending"
        />
        {micOk && (
          <Button
            type="button"
            variant={listening ? "danger" : "outline"}
            size="icon"
            onClick={startListening}
            aria-label="Ask by voice"
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
        <Button type="submit" size="icon" disabled={loading} aria-label="Ask">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setQuestion(c);
              ask(c);
            }}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            {c}
          </button>
        ))}
      </div>

      {listening && (
        <p className="text-xs text-primary">Listening… speak now.</p>
      )}

      {answer && (
        <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-accent/50 p-3">
          <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm">{answer}</p>
        </div>
      )}
    </div>
  );
}

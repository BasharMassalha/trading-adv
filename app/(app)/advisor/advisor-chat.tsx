"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string };

const SUGGESTIONS = [
  "What's my biggest concentration risk?",
  "Should I rebalance my tech exposure?",
  "What are my tax-loss harvesting opportunities?",
  "How does my portfolio compare to the S&P 500?",
];

type Props = {
  portfolioId?: string;
  isGuest?: boolean;
  onRequireSignup?: () => void;
};

export function AdvisorChat({
  portfolioId,
  isGuest = false,
  onRequireSignup,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content: isGuest
        ? "Your free analysis is ready above. Sign up to ask follow-up questions grounded in your report."
        : "I can analyse your holdings, explain your risk exposure, and work through rebalancing options. Ask a question to start.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (isGuest) {
      onRequireSignup?.();
      return;
    }

    setInput("");
    setError(null);

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          portfolioId: portfolioId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        const code = json.error?.code as string | undefined;
        if (code === "TRIAL_SIGNUP_REQUIRED") {
          onRequireSignup?.();
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
          return;
        }
        const errorMsg = json.error?.message ?? "Failed to get response";
        console.error("[advisor-chat] Error:", json.error);
        setError(errorMsg);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry, I ran into an error: ${errorMsg}. Please try again.`,
          },
        ]);
        return;
      }

      const reply: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          json.data.message?.content ??
          json.data.content ??
          "I couldn't generate a response. Please try again.",
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      console.error("[advisor-chat] Network error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Network error. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border bg-surface">
      <ScrollArea className="min-h-0 flex-1 px-4 pt-4">
        <div className="space-y-3 pb-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "border",
                m.role === "assistant" ? "bg-surface" : "bg-background",
              )}
            >
              <div className="border-b px-3 py-1.5 text-[10.5px] uppercase tracking-wide text-faint">
                {m.role === "assistant" ? "Advisor" : "You"}
              </div>
              <div className="whitespace-pre-wrap px-3 py-2.5 text-[13px] leading-relaxed">
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 px-1 text-[12.5px] text-faint">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {error ? (
        <p className="border-t px-4 py-2 text-[12px] text-destructive">{error}</p>
      ) : null}

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 border-t px-4 py-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="border bg-background px-2.5 py-1 text-left text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => send(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isGuest
              ? "Sign up to ask a follow-up…"
              : "Ask about concentration, rebalancing, risk…"
          }
          className="min-h-[44px] flex-1 resize-none"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

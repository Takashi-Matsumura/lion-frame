"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Bot, Trash2 } from "lucide-react";
import { scheduleTranslations, type Language } from "./translations";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ScheduleConciergeProps {
  language: Language;
  year: number;
  month: number;
  onClose: () => void;
}

/** Render inline markdown: **bold** */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-semibold">
        {match[1]}
      </strong>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

/** Simple markdown renderer for AI responses */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${listKey++}`} className="space-y-1.5 my-1">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-1.5 items-start">
            <span className="shrink-0 mt-0.5">
              {/^[\u{1F000}-\u{1FFFF}]/u.test(item)
                ? ""
                : "•"}
            </span>
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^[-*]\s+(.*)/);

    if (listMatch) {
      listItems.push(listMatch[1]);
    } else {
      flushList();
      const trimmed = line.trim();
      if (trimmed === "") {
        if (elements.length > 0) {
          elements.push(<div key={`br-${i}`} className="h-1" />);
        }
      } else {
        elements.push(
          <p key={`p-${i}`}>{renderInline(trimmed)}</p>,
        );
      }
    }
  }
  flushList();

  return <div className="space-y-1">{elements}</div>;
}

export function ScheduleConcierge({
  language,
  year,
  month,
  onClose,
}: ScheduleConciergeProps) {
  const t = scheduleTranslations[language];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/calendar/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
          year,
          month: month + 1, // API expects 1-indexed month
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t.conciergeError },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, year, month, t.conciergeError]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !composing) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage, composing],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b min-h-[3rem]">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">{t.concierge}</h3>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setMessages([])}
              title={t.conciergeClear}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && !loading && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b">
          {t.conciergeQuickPrompts.map((prompt) => (
            <button
              type="button"
              key={prompt}
              className="text-xs px-2.5 py-1 rounded-full border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              onClick={() => {
                setInput(prompt);
                // Trigger send after state update
                setTimeout(() => {
                  const fakeInput = prompt;
                  setInput("");
                  const userMsg: Message = { role: "user", content: fakeInput };
                  setMessages((prev) => [...prev, userMsg]);
                  setLoading(true);
                  fetch("/api/calendar/concierge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      message: fakeInput,
                      history: [],
                      year,
                      month: month + 1,
                    }),
                  })
                    .then((res) => {
                      if (!res.ok) throw new Error("API error");
                      return res.json();
                    })
                    .then((data) => {
                      setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: data.reply },
                      ]);
                    })
                    .catch(() => {
                      setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: t.conciergeError },
                      ]);
                    })
                    .finally(() => setLoading(false));
                }, 0);
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {/* Welcome message */}
          {messages.length === 0 && !loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 max-w-[90%] text-sm">
                {t.conciergeWelcome}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={`${msg.role}-${i}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-lg px-3 py-2 max-w-[90%] text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                    : "bg-muted"
                }`}
              >
                {msg.role === "assistant" ? (
                  <MarkdownContent content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">
                {t.conciergeThinking}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          placeholder={t.conciergePlaceholder}
          disabled={loading}
          className="text-sm"
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

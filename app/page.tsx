"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "./components/Markdown";
import { MODES, looksLikeHeavyCodingTask, type KiloMode } from "@/lib/modes";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  provider?: string;
}

const SUGGESTIONS: Record<KiloMode, string[]> = {
  chat: [
    "Explain quantum computing simply",
    "Help me plan a weekend trip",
    "What are the best practices for REST APIs?",
  ],
  code: [
    "Build a simple snake game in HTML",
    "Write a Python script that renames files",
    "Create a responsive landing page",
  ],
  sensitive: [
    "Explain how sex works biologically",
    "What is consent and why does it matter?",
    "Talk about healthy relationships",
  ],
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Home() {
  const [mode, setMode] = useState<KiloMode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [switchNotice, setSwitchNotice] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, switchNotice]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const send = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || loading) return;

      // In Chat mode, nudge toward Kilo Code for heavy build tasks
      if (mode === "chat" && looksLikeHeavyCodingTask(content)) {
        setSwitchNotice(true);
        setInput(content);
        return;
      }

      setSwitchNotice(false);
      setInput("");
      const userMsg: Message = { id: uid(), role: "user", content };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, mode }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: data.content,
            provider: data.provider,
          },
        ]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: `**Error:** ${msg}\n\nMake sure \`GROQ_API_KEY\` and/or \`OPENROUTER_API_KEY\` are set in your Vercel environment variables.`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, mode]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const switchToCodeAndSend = () => {
    setMode("code");
    setSwitchNotice(false);
    const content = input.trim();
    if (!content) return;
    setInput("");
    const userMsg: Message = { id: uid(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    (async () => {
      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, mode: "code" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: data.content,
            provider: data.provider,
          },
        ]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: `**Error:** ${msg}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  };

  const clearChat = () => {
    setMessages([]);
    setSwitchNotice(false);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-mark">K</div>
          <span>Kilo</span>
        </div>

        <div className="mode-switcher">
          {(Object.keys(MODES) as KiloMode[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`mode-btn ${mode === id ? "active" : ""}`}
              style={
                mode === id
                  ? ({ "--mode-color": MODES[id].color } as React.CSSProperties)
                  : undefined
              }
              onClick={() => {
                setMode(id);
                setSwitchNotice(false);
              }}
              title={MODES[id].description}
            >
              {MODES[id].short}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={clearChat}
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            padding: "6px 10px",
            borderRadius: 8,
          }}
          title="New chat"
        >
          New
        </button>
      </header>

      <div className="messages">
        {messages.length === 0 && !loading ? (
          <div className="empty-state">
            <div
              className="logo-mark"
              style={{ width: 56, height: 56, fontSize: 24, borderRadius: 16 }}
            >
              K
            </div>
            <h1>{MODES[mode].label}</h1>
            <p>{MODES[mode].description}</p>
            <div className="suggestions">
              {SUGGESTIONS[mode].map((s) => (
                <button key={s} type="button" className="suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`message ${m.role}`}>
              <div className="avatar">{m.role === "user" ? "You" : "K"}</div>
              <div className="bubble">
                {m.role === "assistant" ? (
                  <Markdown content={m.content} />
                ) : (
                  <p style={{ whiteSpace: "pre-wrap" }}>{m.content}</p>
                )}
                {m.provider && (
                  <div className="meta">via {m.provider === "groq" ? "Groq" : "OpenRouter"}</div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="message assistant">
            <div className="avatar">K</div>
            <div className="bubble">
              <div className="typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        {switchNotice && (
          <div className="notification">
            <span>
              This looks like a coding / file-building task. Switch to <strong>Kilo Code</strong> for
              the best results (files + preview).
            </span>
            <button type="button" onClick={switchToCodeAndSend}>
              Switch to Kilo Code
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="composer-wrap">
        <div className="composer">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              mode === "code"
                ? "Describe the file or app to build…"
                : mode === "sensitive"
                  ? "Ask anything sensitive…"
                  : "Message Kilo…"
            }
            rows={1}
            disabled={loading}
          />
          <button
            type="button"
            className="send-btn"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        <div className="footer-hint">
          {MODES[mode].label} · Groq first, OpenRouter fallback · Enter to send
        </div>
      </div>
    </div>
  );
}

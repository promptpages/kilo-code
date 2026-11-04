import { NextRequest, NextResponse } from "next/server";
import { chatWithFallback, type ChatMessage } from "@/lib/api";
import { getSystemPrompt, type KiloMode } from "@/lib/modes";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode } = body as {
      messages: { role: string; content: string }[];
      mode?: KiloMode;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const kiloMode: KiloMode =
      mode === "code" || mode === "sensitive" || mode === "chat" ? mode : "chat";

    const system: ChatMessage = {
      role: "system",
      content: getSystemPrompt(kiloMode),
    };

    const history: ChatMessage[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content || "").slice(0, 50_000),
      }));

    const result = await chatWithFallback([system, ...history]);

    return NextResponse.json({
      content: result.content,
      provider: result.provider,
      mode: kiloMode,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Kilo API]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

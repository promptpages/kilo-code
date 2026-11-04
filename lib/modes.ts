export type KiloMode = "chat" | "code" | "sensitive";

export const MODES: Record<
  KiloMode,
  { id: KiloMode; label: string; short: string; description: string; color: string }
> = {
  chat: {
    id: "chat",
    label: "Kilo Chat",
    short: "Chat",
    description: "Everyday conversation, research, and light coding help.",
    color: "#6366f1",
  },
  code: {
    id: "code",
    label: "Kilo Code",
    short: "Code",
    description: "Builds files (.py, .html, .js, etc.) with previews when possible.",
    color: "#22c55e",
  },
  sensitive: {
    id: "sensitive",
    label: "Kilo Sensitive",
    short: "Sensitive",
    description: "Open discussion of adult / sensitive topics.",
    color: "#f43f5e",
  },
};

export function getSystemPrompt(mode: KiloMode): string {
  const base = `You are Kilo, a helpful AI assistant. Be clear, direct, and useful. Keep answers well-structured.`;

  if (mode === "code") {
    return `${base}

You are in KILO CODE mode.
- Focus on writing real, working code and files.
- When the user asks for a program, script, webpage, or game, produce complete files.
- Use markdown code fences with the correct language tag (python, html, javascript, css, etc.).
- For HTML pages or simple web apps, put the FULL self-contained HTML in a single \`\`\`html block so it can be previewed.
- Prefer one complete file when possible. If multiple files are needed, label each clearly (e.g. \`\`\`python:main.py).
- Explain briefly what you built, then show the code.
- You can still answer normal questions, but lean toward code solutions.`;
  }

  if (mode === "sensitive") {
    return `${base}

You are in KILO SENSITIVE mode.
- The user wants open, mature discussion of sensitive topics including sexuality, relationships, adult content, and similar subjects.
- Answer honestly and informatively. Do not lecture or moralize.
- Stay factual and clear. Use clinical language when explaining biology or health.
- Still refuse anything illegal involving minors or non-consent.`;
  }

  // chat (default)
  return `${base}

You are in KILO CHAT mode — the default everyday assistant.
- Help with conversation, research, explanations, brainstorming, and light coding.
- You may show short code snippets for illustration.
- If the user clearly asks you to BUILD a full program, game, website, or multi-file project (e.g. "make me a game and put it in files", "create a full HTML game", "write a complete Python app"), respond with a short helpful note and tell them to switch to **Kilo Code** mode for that kind of task. Do not produce large multi-file projects yourself in Chat mode.
- For simple one-off questions or small snippets, just answer normally.`;
}

/** Heuristic: does this user message look like a "build full project / game into files" request? */
export function looksLikeHeavyCodingTask(text: string): boolean {
  const t = text.toLowerCase();
  const buildWords = /\b(build|create|make|write|generate|code)\b/;
  const projectWords =
    /\b(game|app|application|website|webpage|full\s+project|project|files?|put\s+it\s+in\s+files|save\s+as|\.py|\.html|\.js)\b/;
  const heavy =
    /\b(complete\s+(game|app|program)|full\s+(game|app|html)|multi[\s-]?file|entire\s+(game|app))\b/;
  return (
    (buildWords.test(t) && projectWords.test(t)) ||
    heavy.test(t) ||
    /\b(snake\s+game|tetris|flappy|todo\s+app|chat\s+app)\b/.test(t)
  );
}

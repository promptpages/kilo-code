# Kilo AI

A clean chat UI (Grok / Gemini style) with **three modes** and **dual API fallback**.

| Mode | Purpose |
|------|---------|
| **Kilo Chat** | Default — chat, research, light coding. Suggests switching to Code for full projects. |
| **Kilo Code** | Builds files (`.py`, `.html`, `.js`, etc.) with copy / download and HTML preview. |
| **Kilo Sensitive** | Open discussion of adult / sensitive topics. |

**Providers:** Groq is tried first. If it fails or times out (~25s), the request automatically goes to OpenRouter.

---

## Secrets (environment variables)

Put these in **Vercel → Project → Settings → Environment Variables**  
(or in a local `.env.local` — never commit real keys).

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Recommended | Primary key — [console.groq.com/keys](https://console.groq.com/keys) |
| `OPENROUTER_API_KEY` | Recommended | Fallback key — [openrouter.ai/keys](https://openrouter.ai/keys) |
| `GROQ_MODEL` | Optional | Default: `llama-3.3-70b-versatile` |
| `OPENROUTER_MODEL` | Optional | Default: `openai/gpt-4o-mini` |
| `SITE_URL` | Optional | Used as HTTP-Referer for OpenRouter rankings |

You only need **one** key for the site to work; both is best for reliability.

Copy `.env.example` → `.env.local` for local development.

---

## Run locally

```bash
cd kilo-ai
npm install
cp .env.example .env.local
# edit .env.local with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to GitHub + Vercel

1. This repo already has the code.
2. Import the repo in [vercel.com](https://vercel.com) → New Project.
3. Add the environment variables above (`GROQ_API_KEY`, `OPENROUTER_API_KEY`).
4. Deploy.

> **Note:** GitHub Pages is static and cannot hide API keys. Use **Vercel** (or similar) so `/api/chat` runs server-side and keys stay secret.

---

## How fallback works

```
User message
    → try Groq (25s timeout)
        → success → reply (provider: groq)
        → fail / timeout → OpenRouter → reply (provider: openrouter)
```

The small “via Groq / OpenRouter” label under assistant messages shows which provider answered.

---

## Project structure

```
├── app/
│   ├── api/chat/route.ts   # Server route — keys never reach the browser
│   ├── components/Markdown.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # Chat UI
├── lib/
│   ├── api.ts              # Groq + OpenRouter client + fallback
│   └── modes.ts            # System prompts + mode helpers
├── .env.example
├── package.json
└── README.md
```

# VibeMap

Autonomous taste transporter. Describe your hometown tastes and a destination city; VibeMap extracts your taste signals via Groq, resolves them with Qloo, and maps hyper-niche venues in the destination that share your sub-cultural DNA. Built for the Qloo Agentic Hackathon.

## What it does

Enter freeform text like "I live in New York and I'm visiting Tokyo. I love Blue Bottle, Tame Impala, and Carhartt WIP." VibeMap uses Groq to parse it, Qloo to resolve entities and discover culturally matched places, and renders them on an interactive map. A comparison card contrasts Qloo's results with generic ChatGPT-style tourist recommendations. An agent rationale explains why the spots fit.

## Qloo endpoints used

- `GET /search` (entity resolution)
- `GET /v2/insights` (place discovery by location + taste)
- Groq (LLM extraction + rationale)

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000. Default mode is mock (no network calls).

Live mode:

```bash
# .env.local
QLOO_API_KEY=your_key
TASTEMATCH_LIVE=1
GROQ_API_KEY=your_groq_key
GROQ_MODEL=openai/gpt-oss-20b
npm run build -- --webpack
PORT=8080 npm start
```

## License

MIT

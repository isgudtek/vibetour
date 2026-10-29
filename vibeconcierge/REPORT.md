# VibeConcierge (VibeMap) — Project Architecture & Status Report

**Document Date:** October 2026  
**Project:** VibeConcierge / VibeMap  
**Repository Path:** `/Users/ohmannomma/Documents/opencode/go/qloo/vibeconcierge`  
**Target Deployment:** Qloo Agentic Hackathon  

---

## 1. Executive Summary

**VibeConcierge** (also known as **VibeMap**) is an autonomous cultural taste transporter and travel concierge. Instead of providing generic travel recommendations (e.g. mainstream TripAdvisor or ChatGPT top 10 lists), VibeConcierge analyzes an individual's micro-cultural DNA—extracted from social profiles, lifestyle text, or freeform descriptions—resolves those preferences against the **Qloo Cultural AI Graph**, and discovers hyper-niche venues in destination cities that share the exact aesthetic, culinary, musical, and architectural vibe.

The platform includes a real-time OSINT profile parser, dual-model LLM reasoning engine, multi-page cultural graph discovery pipeline, category-balanced reranker, interactive Leaflet route visualizer, and a full 30-minute slot calendar scheduler with ICS, CSV, and PDF export capabilities.

---

## 2. Technical Stack & Dependencies

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Styling** | Tailwind CSS v4 with Turbopack support |
| **Geospatial & Mapping** | Leaflet 1.9.4 with custom markers, popups, and route polylines |
| **AI / LLM Orchestration** | Dual-Engine Provider: OpenRouter (`nvidia/nemotron-3.5-lightning:free`) & Groq (`openai/gpt-oss-120b`) |
| **Cultural Knowledge Graph** | Qloo API (`/search`, `/v2/tags`, `/v2/insights`, `/v2/trending`) |
| **OSINT / Web Intake** | Jina Reader (`r.jina.ai`) proxy engine with anti-bot/login-gate detection |
| **Testing & Tooling** | Vitest 2.1.9, JSDOM, ESLint 9 |
| **Storage & Caching** | In-memory API TTL caching (5 minutes) + client-side `localStorage` state restoration |

---

## 3. End-to-End System Architecture

```
[User Input]
  ├── Social Profile URL (e.g. Instagram, Substack, LinkedIn)
  ├── Freeform Taste Dump (e.g. "vinyl bars, third-wave espresso, brutalism")
  └── Destination City (Tokyo, London, Paris, New York, etc.)
            │
            ▼
[OSINT & Ingestion Layer]
  ├── Jina Proxy Engine (`r.jina.ai`) fetches clean text
  └── Gate Detector: Identifies login walls and falls back to manual input
            │
            ▼
[Taste Signal Extraction]
  ├── Regex Micro-Cultural Dictionary (Fast Heuristic Pass)
  └── LLM Entity Parser: Normalizes 12-24 micro-cultural signals
            │
            ▼
[Qloo Cultural Knowledge Graph Resolution]
  ├── `/v2/tags`: Semantic mapping of raw user phrases to canonical Qloo tags
  ├── `/search`: Entity resolution for specific brands, designers, and artists
  ├── `/v2/insights`: Multi-page candidate retrieval (take=24, offset=0, 24, 48)
  └── `/v2/trending`: Cultural momentum scoring for rising venues
            │
            ▼
[Reranking & Diversity Balancing]
  ├── Categorical quotas (Cafes, Restaurants, Bars, Museums, Shops, Clubs)
  ├── Typology normalization and tag-overlap scoring
  └── Outlier filtering & deduplication
            │
            ▼
[Agentic Synthesis & Scheduling]
  ├── Strategic Briefing: LLM-generated Corporate Hospitality & Taste Rationale
  ├── Algorithmic & LLM 30-Minute Calendar Slot Allocation
  └── Multi-Day Route Sequence Mapping
            │
            ▼
[Interactive Frontend Experience]
  ├── Leaflet Map with sequenced day routes & venue pins
  ├── Calendar Schedule Grid (Drag, Resize, Add Custom Stops)
  ├── Category Filters & Real-time "Load More" Qloo Graph Scouting
  └── Multi-Format Exporter: .ICS (Apple/Google Calendar), .CSV, and PDF Briefing
```

---

## 4. Key Components & Implementation Details

### 4.1 Ingestion & OSINT Engine (`src/app/api/concierge/route.ts`)
- **Jina Reader Integration:** Fetches rendered web content via `https://r.jina.ai/<url>` with stripped tracking parameters.
- **Login-Gate Detection:** Identifies paywalls, login walls (LinkedIn/Facebook), and alerts the user gracefully while defaulting to pasted freeform taste text.
- **Signal Merging:** Combines unstructured profile text with direct user additions to prevent hallucinated signals.

### 4.2 Cultural Taste Extraction (`src/lib/tagResolver.ts` & `src/lib/llm.ts`)
- **Dual-Method Parsing:** Uses deterministic regex heuristics for immediate high-confidence markers (e.g., "brutalist architecture", "vinyl listening bars", "natural wine") combined with JSON-constrained LLM inference.
- **Qloo Semantic Tag Binding:** Matches unstructured phrases to canonical Qloo tag IDs (`/v2/tags`) while penalizing noisy/overly broad tags.

### 4.3 Place Discovery & Cultural Ranking (`src/lib/qloo.ts` & `src/lib/rerank.ts`)
- **Multi-Paged Candidate Harvest:** Queries Qloo `/v2/insights` across multiple offset pages (up to 72 raw candidates).
- **Categorical Quota Balancer (`rerankByCategory`):** Guarantees a realistic travel day by distributing venues across:
  - Dining & Cafes (specialty roasters, izakayas, bistros)
  - Cultural & Design (galleries, brutalist landmarks, design bookstores)
  - Nightlife (listening bars, natural wine bars, clubs)
  - Retail (artisanal menswear, curated lifestyle shops)
- **Trend Momentum:** Incorporates `/v2/trending` velocity deltas to highlight rising cultural hotspots.

### 4.4 Calendar Scheduling Engine (`src/app/api/schedule/route.ts`)
- **Time Slot Architecture:** Granular 30-minute intervals spanning 09:00 to 20:30+ across custom trip lengths (1 to 7+ days).
- **Time-of-Day Logic:** Intelligently allocates venues based on typology:
  - Morning (09:00 - 11:30): Cafes, bakeries, morning strolls
  - Midday (12:00 - 14:00): Lunch bistros, casual eateries
  - Afternoon (14:30 - 17:30): Museums, bookstores, architecture walks
  - Evening (18:30 - 21:00): Dinner reservations
  - Night (21:00+): Vinyl listening lounges, craft cocktail bars

### 4.5 User Interface & Geospatial Frontend (`src/app/page.tsx` & `src/components/MapView.tsx`)
- **Dynamic Leaflet Integration:** SSR-safe dynamic map loading with auto-centering on destination coordinates.
- **Sequenced Polyline Routes:** Connects daily stops with chronological numbered badges (Stop 1, Stop 2, Stop 3) and connected route lines.
- **On-Demand Scouting (`/api/more`):** Allows users to click "Scout More [Category]" to paginate directly into Qloo's live graph for that exact typology.
- **Export System:** One-click downloads for `.ics` calendar subscriptions, CSV spreadsheets, and printable client executive summaries.

---

## 5. API Reference

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/concierge` | `POST` | Primary orchestrator: intake, signal extraction, Qloo graph resolution, reranking, briefing synthesis. |
| `/api/schedule` | `POST` | Auto-scheduler: generates 30-minute slot matrix across multiple days via heuristic + LLM planning. |
| `/api/more` | `POST` | Real-time graph expansion: fetches additional venues in a specific category excluding already-selected places. |
| `/api/generate` | `POST` | Generative utility endpoint for rapid custom itinerary suggestions. |
| `/api/health` | `GET` | Health status probe verifying server liveliness and configuration modes. |

---

## 6. Execution Modes & Configuration

The application features dual operating modes defined in `.env.local`:

```bash
# Live Mode Configuration
QLOO_API_KEY=your_qloo_key
TASTEMATCH_LIVE=1
OPENROUTER_API_KEY=your_openrouter_key
# or Groq:
GROQ_API_KEY=your_groq_key
GROQ_MODEL=openai/gpt-oss-120b
```

- **Live Mode (`TASTEMATCH_LIVE=1`):** Queries live Qloo endpoints and live LLM providers for production execution.
- **Mock Mode (Default when unconfigured):** Fallback test harness utilizing canned realistic venue models (`src/lib/mock.ts`) to permit offline development and CI verification without consuming API quotas.

---

## 7. Current Project Status & Diagnostics

1. **Server Status:** Next.js development server is active on `http://localhost:3000` (verified HTTP 200 via Chromium headless test).
2. **Build & Type Safety:** Fully typed under TypeScript 5, with standard Turbopack dev configuration.
3. **Storage Integrity:** Tested with browser `localStorage` persistence and automatic state recovery.
4. **Resilience:** Graceful degradation on API rate-limits (Qloo 429 exponential backoff with 3 retries, cached tag resolution, fallback heuristic schedules).

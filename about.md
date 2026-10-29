# VibeTour: Autonomous Taste-Driven Tour Organizer

An elite corporate hospitality and bespoke travel organizer that transforms a guest's sparse cultural footprint into a high-taste local itinerary. Powered by the Qloo Taste Graph and advanced LLM orchestrators.

---

## Inspiration

Planning a custom travel itinerary or corporate hospitality tour is notoriously tedious. It involves hours of manual labor: scouring fragmented blogs, cross-referencing maps, deciphering neighborhood guides, and translating obscure local reviews. For tour operators, executive assistants, or business hosts, this "tedious tour" planning process is a painful bottleneck—especially when trying to guess what a high-value guest will actually enjoy.

**VibeTour** was born to solve this pain point end-to-end. We saw a massive opportunity: by leveraging **Qloo’s rich, multidimensional taste data**, we could build an **autonomous agent** capable of handling this entire pipeline from start to finish. Starting from just a few lines of basic biographical text or a simple public social profile, VibeTour's agent immediately decodes the guest's unique cultural fingerprint and architects a flawless, localized itinerary. We wanted to turn a tedious, multi-hour research chore into a 5-second, high-fidelity automated masterpiece.

---

## What it does

VibeTour is an autonomous concierge workspace designed to bridge the gap between abstract taste profiles and physical, high-affinity city venues.

### Core Features:
1. **Dense Cultural Extraction**: Input a guest's name and any public source (a biography, Wikipedia page, blog post, or a text summary of their interests). VibeTour extracts **25+ rich taste indicators** (design preferences, culinary leanings, musical genres) and **10+ cultural entity anchors** (favorite apparel brands, furniture designers, musical artists).
2. **Qloo Taxonomy & Graph Resolution**: Instead of making generic LLM assumptions, VibeTour resolves every single extracted tag and entity to canonical Qloo URNs (e.g. `urn:tag:cuisine:qloo:natural_wine` or entity IDs) using real-time search and semantic resolution API endpoints.
3. **☀️ Day & 🌙 Night Interactive Planner**: Arranges curated venue picks across a multi-day timeline. Features chronological day and night tabs representing 12-hour slots, allowing operators to easily drag-and-drop late-night spots while leaving nighttime blocks open for custom curation.
4. **Custom Search Enrichment**: Allows operators to refine search results in real-time. Typing search refinements (such as `"speakeasy"`, `"rooftop"`, or `"cozy"`) dynamically maps the input to a Qloo tag in real-time, instantly injecting it into the search parameters to discover target gems.
5. **Seamless Distribution**:
   - **💬 Direct-to-WhatsApp**: Formats the entire multi-day schedule into a beautifully organized, bold markdown message ready to be sent instantly with a single click.
   - **🖨️ Scannable Print Page**: A print-optimized subpage (`/print`) featuring deterministic, country-salted local telephone numbers, chronological timetables, and **dynamic scannable Google Maps QR Codes** for every single stop, automatically switching to ink-saving high-contrast styling when printed.

---

## How we built it

VibeTour is built with a cutting-edge hybrid AI-and-Database architecture:

- **Frontend & Core Layout**: Built on **Next.js 16 (App Router)** and **React 19** with custom glassmorphism styles, responsive grid structures, and interactive maps driven by **Leaflet**.
- **Extraction Orchestrator**: Powered by **Groq (`openai/gpt-oss-120b`)** with high-budget prompts (600–1000 tokens) and an automated **`repairJson()` self-healing stream parser** that dynamically fixes unclosed brackets/quotes to guarantee zero-data loss during intense person extraction sweeps.
- **Graph Seeding Pipeline**: Maps raw extracted tokens into two vectors. Standard indicators are processed through `/v2/tags` semantic search, and entities are queried via `/search`. Both pools are merged and run against Qloo's `/v2/insights` endpoint to surface high-affinity venues in the destination city.
- **Modern CSS Engineering**: Replaced standard bounding `overflow: hidden` properties with modern **`overflow: clip`**, enabling full horizontal alignment bounds while completely preserving sticky scroll context for our 100% full-viewport glassmorphic header.
- **Quality Assurance**: Integrated a dedicated Vitest suite that validates both standard and custom search enrichment paths, achieving **100% green unit-test coverage**.

---

## Challenges we ran into

### 1. The Cloud Scraper Login-Gate
Social platforms like Facebook or LinkedIn are behind rigid authentication walls, causing Jina or cloud parsers to fail. We solved this by building an **Offline Mock Interceptor**. If a local mock URL is requested (such as `/mock-profile`), VibeTour bypasses cloud fetching entirely and directly hydrates Liam Sterling's rich, acoustic-architect biography offline, delivering 100% resilient testing under local environments.

### 2. Over-Constrained Graph Queries (Result Sparsity)
Sending dozens of highly specific tags and brand entities in a single joint query can return empty results. We addressed this by implementing a diagnostic **Parallel & Relaxed Qloo Query (Test Mode)**. In test mode, we split complex queries into parallel requests (Query A for tags, Query B for entities) and merge the results. We also relaxed re-ranking constraints, successfully preserving independent, highly focused boutique gems.

### 3. Sticky Context Destruction
A common frontend issue: placing sticky headers inside containers that have paddings or bounding heights breaks scrolling stickiness. We resolved this by assigning a dedicated `.results-page` modifier class on page hydration, shifting the padding off the root page container and directly onto the inner content stack, keeping the header beautifully flush with the top border on scroll.

---

## Accomplishments that we're proud of

- **Dual-Vector Mapping**: Seamlessly merging named entities and general taxonomy tags to seed the Qloo graph.
- **Full-Viewport Navigation**: A gorgeous, glassmorphic header that spans 100% of the screen width and features native backdrop blur filters as content rolls underneath.
- **Scannable QR Map Handoff**: Printing out an actual physical sheet of paper with beautifully sized, scannable QR codes that load active Google Maps coordinates on your phone.
- **Self-Healing Stream Parse**: Crafting robust recovery regex patterns that rescue interrupted LLM outputs without throwing a single JSON parse error.

---

## What we learned

- **Separation of Extraction and Database Logic**: How letting LLMs focus on extracting raw qualitative attributes, while relying on Qloo's deterministic search APIs to resolve them to database keys, results in a bulletproof, hallucination-free pipeline.
- **UX Layout Ergonomics**: Fine-tuning form flows (like placing the **DEMOS:** selectors inline on a single row, and positioning the `"Generate persona"` button directly under the text box) has an immense impact on the feel and speed of a tool.

---

## What's next for VibeTour

1. **Deep Calendar Syncing**: Direct API integrations to automatically inject generated timetables into Google Calendar or Apple Calendar, bypassing the need for `.ICS` manual uploads.
2. **Real-Time Live Transit Mapping**: Fetching active subway, taxi, and walking routes to simulate and adjust schedules based on live city traffic data.
3. **Collaboration with Luxury Tourism Boards**: Tailoring the initial venue seed databases to incorporate private, invitation-only clubs and micro-galleries for ultra-premium hospitality applications.

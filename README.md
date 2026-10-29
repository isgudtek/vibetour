# TasteRelay

Take your taste anywhere. Drop up to 3 hometown favorites and a destination city; TasteRelay extracts your cross-domain taste fingerprint via Qloo and maps culturally matched venues in the destination. Built for the Qloo Agentic Hackathon.

## What it does

Enter a destination city and up to 3 hometown favorites. TasteRelay resolves them to Qloo entity ids, compares audiences to extract shared cultural interests (your taste fingerprint), then discovers places in the destination city ranked by affinity. Results are shown on an interactive map with provenance. A toggle shows an ungrounded LLM-only baseline for contrast.

## Qloo endpoints used

- `GET /search` (entity resolution)
- `GET /v2/analysis/compare` (taste fingerprint)
- `GET /v2/insights` (place discovery by location + taste)
- City geocoding via Nominatim (OpenStreetMap)

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
npm run build -- --webpack
PORT=8080 npm start
```

## Tests

```bash
npm run lint
npm test
```

## Limitations

- Qloo results describe aggregate affinities, not predictions about individuals.
- No personal identifiers are sent to Qloo.
- Mock mode uses synthetic data.

## License

MIT

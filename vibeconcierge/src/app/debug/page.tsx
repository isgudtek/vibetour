"use client";

import { useState } from "react";

export default function DebugPage() {
  const [provider, setProvider] = useState<"openai" | "groq" | "openrouter" | "gemini">("openai");
  const [clientName, setClientName] = useState("Maya Patel");
  const [destinationCity, setDestinationCity] = useState("Barcelona");
  const [socialText, setSocialText] = useState(`Maya Patel, 38, serves as Vice President of Global Partnerships at a leading fintech firm in Chicago. She balances a demanding schedule of board meetings and investor roadshows with a curated personal life that includes early‑morning spin classes at the Riverwalk, weekend art walks in the West Loop, and a subscription to the Michelin‑starred dinner club curated by the city’s top chefs. Maya’s apartment reflects her love for clean lines and functional elegance, featuring a mid‑century modern sofa from Herman Miller, a custom walnut desk from West Elm, and a curated collection of limited‑edition watches from TAG Heuer.

Culturally, Maya gravitates toward sophisticated yet eclectic experiences. Her playlists blend the smooth tones of Norah Jones with the rhythmic pulse of contemporary Afro‑beat artists like Burna Boy, while her reading list alternates between Malcolm Gladwell’s latest nonfiction and the graphic novels of Marjane Satrapi. She is a devoted fan of sustainable luxury, regularly opting for Patagonia outerwear on her travels and driving a Tesla Model Y for its sleek design and eco‑credentials. Culinary preferences lean toward high‑quality Japanese‑Italian fusion—think Omakase‑style sushi paired with handmade pasta—frequently enjoyed at boutique restaurants such as Alinea’s pop‑up concepts or the rooftop lounge at The Aviary. Her aesthetic sensibility extends to interior design, favoring a blend of Scandinavian minimalism and warm, artisanal textures, often sourced from design studios like Muuto and Gubi.

When it comes to corporate hospitality, Maya seeks destinations that combine business efficiency with cultural immersion. Her next preferred city is Barcelona, where she plans to attend a fintech summit at the Fira Gran Via, followed by evenings exploring the avant‑garde art scene in El Born and dining at the Michelin‑rated Disfrutar. She values venues that offer private meeting suites equipped with high‑speed connectivity, bespoke cocktail menus featuring local vermouths, and curated experiences such as private tours of Antoni Gaudí’s lesser‑known works, ensuring that each trip seamlessly blends professional objectives with her refined lifestyle.`);

  const [loading, setLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [qlooTestMode, setQlooTestMode] = useState(false);

  const presets = [
    {
      label: "Maya Patel (Chicago → Barcelona)",
      name: "Maya Patel",
      city: "Barcelona",
      text: `Maya Patel, 38, serves as Vice President of Global Partnerships at a leading fintech firm in Chicago. She balances a demanding schedule of board meetings and investor roadshows with a curated personal life that includes early‑morning spin classes at the Riverwalk, weekend art walks in the West Loop, and a subscription to the Michelin‑starred dinner club curated by the city’s top chefs. Maya’s apartment reflects her love for clean lines and functional elegance, featuring a mid‑century modern sofa from Herman Miller, a custom walnut desk from West Elm, and a curated collection of limited‑edition watches from TAG Heuer.

Culturally, Maya gravitates toward sophisticated yet eclectic experiences. Her playlists blend the smooth tones of Norah Jones with the rhythmic pulse of contemporary Afro‑beat artists like Burna Boy, while her reading list alternates between Malcolm Gladwell’s latest nonfiction and the graphic novels of Marjane Satrapi. She is a devoted fan of sustainable luxury, regularly opting for Patagonia outerwear on her travels and driving a Tesla Model Y for its sleek design and eco‑credentials. Culinary preferences lean toward high‑quality Japanese‑Italian fusion—think Omakase‑style sushi paired with handmade pasta—frequently enjoyed at boutique restaurants such as Alinea’s pop‑up concepts or the rooftop lounge at The Aviary. Her aesthetic sensibility extends to interior design, favoring a blend of Scandinavian minimalism and warm, artisanal textures, often sourced from design studios like Muuto and Gubi.

When it comes to corporate hospitality, Maya seeks destinations that combine business efficiency with cultural immersion. Her next preferred city is Barcelona, where she plans to attend a fintech summit at the Fira Gran Via, followed by evenings exploring the avant‑garde art scene in El Born and dining at the Michelin‑rated Disfrutar. She values venues that offer private meeting suites equipped with high‑speed connectivity, bespoke cocktail menus featuring local vermouths, and curated experiences such as private tours of Antoni Gaudí’s lesser‑known works, ensuring that each trip seamlessly blends professional objectives with her refined lifestyle.`,
    },
    {
      label: "Lena Whitaker (Chicago → Barcelona)",
      name: "Lena Whitaker",
      city: "Barcelona",
      text: `Lena Whitaker, 38, Senior Director of Global Partnerships, Chicago. Lena lives a fast‑paced, health‑centric lifestyle that blends high‑impact networking with a passion for contemporary art. She begins her day with a cold‑brew from Stumptown and a spin class at SoulCycle before heading to the office, where she’s known for closing multi‑year deals with a calm, data‑driven approach. Her wardrobe is anchored by classic tailoring from Theory, polished accessories from Montblanc, and a sleek Tesla Model Y that she uses to zip between boardrooms and after‑hours gallery openings. In her downtime, Lena curates playlists that swing between modern jazz (Kamasi Washington) and ambient electronic (Tycho), and she’s a regular at Michelin‑starred Japanese‑fusion spots like Girl & The Goat, where she favors seasonal sashimi and innovative small plates.

When traveling for work or leisure, Lena prefers boutique luxury that offers both privacy and a sense of place. She gravitates toward hotels that champion minimalist, mid‑century modern design—think The Line in Los Angeles or the boutique B&B at the former railway station in Kyoto—where she can unwind in a loft‑like suite with floor‑to‑ceiling windows. Her cultural palate extends to independent cinema (Sundance selections) and immersive installations at venues like the Barbican Centre. For her next corporate hospitality experience, Lena is eyeing Barcelona, drawn by the city’s vibrant design scene, its seamless blend of historic Modernisme architecture and cutting‑edge tech hubs, and the promise of rooftop tapas at El Quim de la Boqueria paired with live flamenco sessions.`,
    },
    {
      label: "Kenji Tanaka (Tokyo → London)",
      name: "Kenji Tanaka",
      city: "London",
      text: `Kenji Tanaka is a 34-year-old Senior Creative Director at a boutique digital agency based in Tokyo's high-design Daikanyama district. He possesses a deeply curated, minimalist aesthetic that heavily influences both his professional work and his personal lifestyle choices. Rather than following mainstream global trends, Kenji aligns himself with niche sub-cultures, displaying a strong preference for mid-century brutalist architecture, independent Japanese menswear labels, and rare architectural publications.
When it comes to his off-duty hours, Kenji's cultural footprint spans high-fidelity audio and artisanal craftsmanship. He is an avid collector of vintage jazz and electronic vinyl records, frequently spending his evenings scouting hidden, underground listening bars across Shibuya. His daytime routine is anchored by third-wave specialty coffee roasters that focus on single-origin beans and clean, geometric interior spaces, reflecting his broader appreciation for functionalism and understated luxury.`,
    },
  ];

  async function runDebug() {
    setLoading(true);
    setError(null);
    setResponse(null);
    const start = performance.now();
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          destinationCity,
          socialText,
          provider,
          bypassCache: true,
          qloo_test_mode: qlooTestMode,
        }),
      });
      const data = await res.json();
      setExecutionTime(Math.round(performance.now() - start));
      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResponse(data);
    } catch (err: unknown) {
      setExecutionTime(Math.round(performance.now() - start));
      setError((err as { message?: string })?.message || "Extraction failed");
    } finally {
      setLoading(false);
    }
  }

  const tags = Array.isArray(response?.tags) ? (response?.tags as Array<Record<string, unknown>>) : [];
  const venues = Array.isArray(response?.venues) ? (response?.venues as Array<Record<string, unknown>>) : [];
  const logs = Array.isArray(response?.logs) ? (response?.logs as string[]) : [];

  return (
    <div style={{ maxWidth: 1100, margin: "20px auto", padding: "0 16px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#f0ede8", background: "#121110", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #332f2b", paddingBottom: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, margin: "0 0 4px 0", color: "#eda645" }}>🛠️ VibeTour Qloo &amp; LLM Extraction Diagnostic Console</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#a8a29e" }}>Raw real-time extraction, Qloo tag resolution &amp; entity inspector</p>
        </div>
        <a href="/" style={{ color: "#eda645", fontSize: 13, textDecoration: "none", border: "1px solid #eda645", padding: "4px 10px", borderRadius: 6 }}>
          ← Back to Main App
        </a>
      </header>

      {/* Preset Pickers */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: "#78716c", alignSelf: "center", fontWeight: 600 }}>PRESETS:</span>
        {presets.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              setClientName(p.name);
              setDestinationCity(p.city);
              setSocialText(p.text);
            }}
            style={{ background: clientName === p.name ? "#eda645" : "#1f1d1a", color: clientName === p.name ? "#1a1612" : "#d6d3d1", border: "1px solid #44403c", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Form Controls */}
      <div style={{ background: "#1a1815", border: "1px solid #2e2a25", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#a8a29e", marginBottom: 4, fontWeight: 600 }}>LLM PROVIDER</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["openai", "groq", "openrouter", "gemini"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  style={{ flex: 1, padding: "6px 4px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: "none", background: provider === p ? "#eda645" : "#2a2723", color: provider === p ? "#1a1612" : "#a8a29e", cursor: "pointer", textTransform: "uppercase" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#a8a29e", marginBottom: 4, fontWeight: 600 }}>CLIENT NAME</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", background: "#121110", border: "1px solid #3e3831", borderRadius: 6, color: "#fff", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#a8a29e", marginBottom: 4, fontWeight: 600 }}>DESTINATION CITY</label>
            <input
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", background: "#121110", border: "1px solid #3e3831", borderRadius: 6, color: "#fff", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, color: "#a8a29e", marginBottom: 4, fontWeight: 600 }}>SOCIAL / BIO TEXT DUMP</label>
          <textarea
            rows={8}
            value={socialText}
            onChange={(e) => setSocialText(e.target.value)}
            style={{ width: "100%", padding: "10px", background: "#121110", border: "1px solid #3e3831", borderRadius: 6, color: "#fff", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box", resize: "vertical" }}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={runDebug}
              disabled={loading}
              style={{ background: "#eda645", color: "#1a1612", fontWeight: 700, fontSize: 14, padding: "10px 24px", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              {loading ? "⏳ Running Extraction Pipeline..." : "⚡ Execute Extraction & Qloo Matching"}
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: "bold", color: qlooTestMode ? "#eda645" : "#a8a29e", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={qlooTestMode}
                onChange={(e) => setQlooTestMode(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "#eda645", width: 16, height: 16 }}
              />
              🧪 Enable Parallel &amp; Relaxed Qloo Query (Test Mode)
            </label>
          </div>
          {executionTime !== null && (
            <span style={{ fontSize: 12, color: "#78716c", fontFamily: "monospace" }}>
              Execution time: <strong style={{ color: "#eda645" }}>{executionTime}ms</strong>
            </span>
          )}
        </div>
      </div>

      {response && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#1f1c18", border: "1px solid #3d342d", borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase" }}>RESOLVED EXTRACTION MODEL</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#eda645", marginTop: 4, fontFamily: "monospace" }}>
              {String(response.extractedByModel || "unknown")}
            </div>
          </div>
          <div style={{ background: "#1f1c18", border: "1px solid #3d342d", borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase" }}>LLM FAILURES / RETRY LOGS</span>
            <div style={{ fontSize: 12, fontWeight: 600, color: response.lastLlmError ? "#fca5a5" : "#7ee787", marginTop: 4, fontFamily: "monospace" }}>
              {response.lastLlmError ? String(response.lastLlmError) : "✓ Smooth request completion (no errors)"}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5", padding: "12px 16px", borderRadius: 8, marginBottom: 20 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results View */}
      {response && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          {/* Resolved Tags Table */}
          <div style={{ background: "#1a1815", border: "1px solid #2e2a25", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, margin: 0, color: "#eda645" }}>
                1. Extracted Taste Signals ({tags.length} extracted)
              </h2>
              <span style={{ fontSize: 12, color: "#7ee787", fontWeight: 600 }}>
                {tags.filter((t) => Boolean(t.qlooTagId)).length} / {tags.length} Resolved to Qloo Tag IDs
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "monospace" }}>
                <thead>
                  <tr style={{ background: "#24201c", textAlign: "left", color: "#a8a29e" }}>
                    <th style={{ padding: "8px 10px" }}>#</th>
                    <th style={{ padding: "8px 10px" }}>Extracted Signal</th>
                    <th style={{ padding: "8px 10px" }}>Category</th>
                    <th style={{ padding: "8px 10px" }}>Source</th>
                    <th style={{ padding: "8px 10px" }}>Matched Qloo Tag</th>
                    <th style={{ padding: "8px 10px" }}>Canonical Qloo Tag URN</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #282420", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "8px 10px", color: "#78716c" }}>{idx + 1}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "#fff" }}>{String(t.name || "")}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ background: "#2c2824", padding: "2px 6px", borderRadius: 4, fontSize: 10, color: "#d6d3d1" }}>
                          {String(t.category || "Other")}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "#a8a29e", fontSize: 11 }}>{String(t.sourceContext || "llm")}</td>
                      <td style={{ padding: "8px 10px", color: t.qlooTagName ? "#7ee787" : "#ef4444" }}>
                        {t.qlooTagName ? String(t.qlooTagName) : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: t.qlooTagId ? "#9cdcfe" : "#78716c", fontSize: 11 }}>
                        {t.qlooTagId ? String(t.qlooTagId) : "No confident match"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discovered Venues */}
          <div style={{ background: "#1a1815", border: "1px solid #2e2a25", borderRadius: 10, padding: 16 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 12px 0", color: "#eda645" }}>
              2. Discovered Qloo Venues in {destinationCity} ({venues.length} venues)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {venues.map((v, idx) => (
                <div key={idx} style={{ background: "#121110", border: "1px solid #2e2a25", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <strong style={{ fontSize: 13, color: "#fff" }}>{String(v.name || "")}</strong>
                    <span style={{ background: "rgba(237,166,69,0.15)", color: "#eda645", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                      {Math.round(Number(v.affinity || 0.7) * 100)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
                    {String(v.category || "Venue")} {v.address ? `· ${String(v.address)}` : ""}
                  </div>
                  {Array.isArray(v.tags) && v.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {v.tags.slice(0, 4).map((tag, tIdx) => (
                        <span key={tIdx} style={{ fontSize: 9, background: "#1f1d1a", color: "#78716c", padding: "1px 5px", borderRadius: 3 }}>
                          {String(tag)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Server Logs */}
          <div style={{ background: "#1a1815", border: "1px solid #2e2a25", borderRadius: 10, padding: 16 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 12px 0", color: "#eda645" }}>
              3. Real-time Qloo &amp; LLM Execution Logs
            </h2>
            <div style={{ background: "#0c0b0a", border: "1px solid #24201c", borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 11, color: "#9cdcfe", maxHeight: 260, overflowY: "auto" }}>
              {logs.map((log, idx) => (
                <div key={idx} style={{ padding: "2px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

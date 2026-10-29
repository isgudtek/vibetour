"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type Place = { id: string; name: string; affinity: number; lat?: number; lon?: number; address?: string; tags?: string[]; image?: string };

export default function Home() {
  const [city, setCity] = useState("Rome");
  const [favorites, setFavorites] = useState<string[]>(["Beyonce", "Insecure", "Nike"]);
  const [favInput, setFavInput] = useState("");
  const [mode, setMode] = useState("mock");
  const [center, setCenter] = useState({ lat: 41.9028, lon: 12.4964 });
  const [fingerprint, setFingerprint] = useState<string[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((d) => setMode(d.mode)).catch(() => {});
  }, []);

  function addFavorite() {
    if (favInput.trim() && favorites.length < 3) {
      setFavorites([...favorites, favInput.trim()]);
      setFavInput("");
    }
  }

  async function discover() {
    setLoading(true);
    setError(null);
    setPlaces([]);
    setFingerprint([]);
    try {
      const r = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, favorites }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setCenter(d.center);
      setFingerprint(d.fingerprint || []);
      setPlaces(d.places || []);
      setBrief(null);
      setBriefLoading(true);
      fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, favorites, fingerprint: d.fingerprint || [], places: d.places || [] }),
      }).then((r) => r.json()).then((bd) => {
        if (bd.brief) setBrief(bd.brief);
        else if (bd.error) setBrief("AI brief unavailable: " + bd.error);
      }).catch(() => setBrief("AI brief unavailable.")).finally(() => setBriefLoading(false));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <svg className="backdrop" viewBox="0 0 1440 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g fill="none" stroke="rgba(250,240,225,0.10)" strokeWidth="1" strokeDasharray="2 4">
          <ellipse cx="720" cy="560" rx="560" ry="760" />
          <ellipse cx="720" cy="560" rx="360" ry="760" />
          <ellipse cx="720" cy="560" rx="150" ry="760" />
          <ellipse cx="720" cy="560" rx="760" ry="760" />
          <ellipse cx="720" cy="560" rx="980" ry="820" />
        </g>
        <circle cx="1252" cy="262" r="30" fill="rgba(250,240,225,0.03)" stroke="rgba(250,240,225,0.10)" strokeDasharray="2 4" />
      </svg>

      <header className="top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#eda645" strokeWidth="1.6" /><path d="M8 2.5v11" stroke="#eda645" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </span>
          TasteRelay <small>Take your taste anywhere</small>
        </div>
        <div className="stamp num">mode: {mode} · Qloo taste graph</div>
      </header>

      <main className="grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Destination</h2>
              <p>Where you are going</p>
            </div>
            <div className="big num">{favorites.length}<small>/3</small></div>
          </div>
          <div className="stack">
            <input className="field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Destination city (e.g. Rome)" />
            <div className="row">
              <input
                className="field"
                value={favInput}
                onChange={(e) => setFavInput(e.target.value)}
                placeholder="Add a hometown favorite (artist, brand, cafe...)"
                onKeyDown={(e) => { if (e.key === "Enter") addFavorite(); }}
                disabled={favorites.length >= 3}
              />
              <button className="btn btn-primary" onClick={addFavorite} disabled={favorites.length >= 3 || !favInput.trim()}>Add</button>
            </div>
            <div className="row">
              {favorites.map((f, i) => (
                <span key={i} className="chip">{f}<span className="x" onClick={() => setFavorites(favorites.filter((_, j) => j !== i))}>×</span></span>
              ))}
            </div>
            <p style={{ color: "var(--text-3)", fontSize: 12 }}>Drop up to 3 hometown favorites. Qloo extracts your cross-domain taste fingerprint.</p>
            <button className="btn btn-primary" onClick={discover} disabled={loading || favorites.length === 0 || !city.trim()} style={{ height: 36, width: "100%" }}>
              {loading ? "Relaying taste..." : "Find my taste matches"}
            </button>
            {error && <p style={{ color: "var(--coral)", fontSize: 13 }}>{error}</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Map</h2>
              <p>Culturally matched venues in {city}</p>
            </div>
            <div className="big num">{places.length}<small>places</small></div>
          </div>
          <MapView center={center} places={places} loading={loading} />
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Venues</h2>
              <p>Ranked by taste affinity</p>
            </div>
            <div className="big num">{places.length}<small>found</small></div>
          </div>
          <div className="stack" style={{ overflow: "auto", maxHeight: 420 }}>
            {places
              .slice()
              .sort((x, y) => y.affinity - x.affinity)
              .map((p) => (
                <div key={p.id} className="pick">
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {p.image && <img src={p.image} alt={p.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="name">{p.name}</div>
                        <div className="score num" style={{ fontSize: 16 }}>{Math.round(p.affinity * 100)}%</div>
                      </div>
                      {p.address && <div className="reason">{p.address}</div>}
                      {p.tags && p.tags.length > 0 && (
                        <div className="row" style={{ marginTop: 4 }}>
                          {p.tags.slice(0, 4).map((t, i) => (
                            <span key={i} className="chip">{t}</span>
                          ))}
                        </div>
                      )}
                      <div className="meta">id {p.id}</div>
                    </div>
                  </div>
                </div>
              ))}
            {places.length === 0 && !loading && <p style={{ color: "var(--text-3)", fontSize: 13 }}>No venues yet. Discover to populate the map.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Taste fingerprint</h2>
              <p>Cross-domain signals</p>
            </div>
            <div className="toggle">
              <input type="checkbox" checked={showBaseline} onChange={(e) => setShowBaseline(e.target.checked)} style={{ accentColor: "var(--amber)" }} />
              LLM-only baseline
            </div>
          </div>
          <div className="stack">
            <div className="row">
              {fingerprint.length > 0
                ? fingerprint.map((f, i) => <span key={i} className="chip" style={{ color: "var(--light)" }}>{f}</span>)
                : <span style={{ color: "var(--text-3)", fontSize: 13 }}>No fingerprint yet.</span>}
            </div>
            <div className="pick">
              <div className="cat">Qloo graph</div>
              <div className="name">Venues ranked by affinity to your taste fingerprint</div>
              <div className="reason">Your hometown favorites are resolved to Qloo entities, compared to extract shared cultural interests, then used to discover places in the destination city.</div>
            </div>
            {showBaseline && (
              <div className="pick" style={{ borderColor: "rgba(236,111,90,0.3)" }}>
                <div className="cat" style={{ color: "var(--coral)" }}>LLM-only baseline</div>
                <div className="name">Top tourist spots in {city}.</div>
                <div className="reason">No taste grounding, no cross-domain fingerprint, no provenance.</div>
              </div>
            )}
            {briefLoading && <div className="pick"><div className="cat">AI brief</div><div className="reason">Generating with Groq…</div></div>}
            {brief && <div className="pick"><div className="cat">AI brief (Groq)</div><div className="reason" style={{ whiteSpace: "pre-wrap" }}>{brief}</div></div>}
            <div className="pick">
              <div className="cat">Endpoints</div>
              <div className="reason">/search · /v2/analysis/compare · /v2/insights (place)</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

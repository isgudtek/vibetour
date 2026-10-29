"use client";

import { useState } from "react";

export default function MockProfilePage() {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedUrl, setCopiedTextUrl] = useState(false);

  const profileUrl = typeof window !== "undefined" ? window.location.href : "http://localhost:3000/mock-profile";

  const rawText = `Liam Sterling
Lead Urban Architect & Acoustic Soundscape Consultant
San Francisco, CA

ABOUT ME:
"Form follows sound." I specialize in acoustic engineering, brutalist design restorations, and creating minimalist public spaces. On my off-duty hours, you'll find me hunt for rare Japanese jazz vinyls, exploring third-wave roasters that prioritize light-roast single-origin espressos, and cataloging mid-century modern furniture.

CULTURAL PREFERENCES:
- Dining: Third-wave specialty coffee roasters, single-origin espresso, light-roast cold brew.
- Music: Vintage vinyl listening bars, modern ambient electronic, Kamasi Washington, Norah Jones, jazz fusion.
- Design: Brutalist architecture, mid-century modern, Bauhaus furniture, functionalism.
- Art: Immersive installations, contemporary art walks, avant-garde gallery shows.
- Nightlife: Hidden speakeasies, low-lit natural wine & vermouth bars, independent cinema.

RECENT TIMELINE POSTS:

Liam Sterling · Oct 28 at 8:14 PM · 👥
Just spent three hours at a hidden vinyl listening bar sipping natural wine and listening to Kamasi Washington's "The Epic" on a custom vintage horn sound system. Absolute bliss. High-fidelity acoustic design at its finest.

Liam Sterling · Oct 26 at 9:30 AM · 👥
My morning ritual is anchored by third-wave specialty coffee. Today's single-origin roastery featured an outstanding washed Ethiopian bean with clean, geometric interior spaces that perfectly represent Scandinavian minimalism.

Liam Sterling · Oct 22 at 2:15 PM · 👥
Drafting restoration proposals for brutalist architecture landmarks. There is something so honest, raw, and functional about exposed concrete coupled with mid-century modern Herman Miller furniture pieces.`;

  const copyToClipboard = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", paddingBottom: 60, color: "#1c1e21", fontFamily: "Helvetica, Arial, sans-serif" }}>
      
      {/* Top Banner for App Users */}
      <div style={{ background: "#1a1918", color: "#fff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #eda645" }}>
        <div>
          <span style={{ fontWeight: "bold", color: "#eda645" }}>🛠️ VIBETOUR OSINT SIMULATION TEMPLATE</span>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#bdb7ad" }}>Use this realistic public Facebook feed to test the Jina Page Fetching &amp; parsing engine.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            onClick={() => copyToClipboard(profileUrl, setCopiedTextUrl)}
            style={{ background: "#eda645", color: "#1a1612", border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: "bold", cursor: "pointer" }}
          >
            {copiedUrl ? "Copied URL! ✓" : "📋 Copy Profile URL"}
          </button>
          <button 
            onClick={() => copyToClipboard(rawText, setCopiedText)}
            style={{ background: "transparent", color: "#eda645", border: "1px solid #eda645", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: "bold", cursor: "pointer" }}
          >
            {copiedText ? "Copied Text! ✓" : "📋 Copy Raw Text"}
          </button>
        </div>
      </div>

      {/* Mock Facebook Header */}
      <div style={{ background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
        {/* Cover Photo */}
        <div style={{ height: 260, background: "linear-gradient(135deg, #1877f2, #115cbf)", position: "relative" }}>
          <div style={{ position: "absolute", bottom: -50, left: 32, display: "flex", alignItems: "flex-end" }}>
            <div style={{ width: 130, height: 130, borderRadius: "50%", background: "#4a5568", border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 40, fontWeight: "bold" }}>
              LS
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "16px 32px 16px 178px" }}>
          <h1 style={{ fontSize: 32, fontWeight: "bold", margin: 0 }}>Liam Sterling</h1>
          <p style={{ fontSize: 16, color: "#65676b", margin: "4px 0 0" }}>Lead Urban Architect &amp; Acoustic Soundscape Consultant</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={{ background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: "bold", fontSize: 14 }}>Add Friend</button>
            <button style={{ background: "#e4e6eb", color: "#050505", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: "bold", fontSize: 14 }}>Message</button>
          </div>
        </div>
      </div>

      {/* Profile Body */}
      <div style={{ maxWidth: 940, margin: "20px auto 0", padding: "0 16px", display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        
        {/* Left Column (Intro / About) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: 20, fontWeight: "bold", margin: "0 0 12px" }}>Intro</h2>
            <p style={{ fontSize: 14, color: "#050505", lineHeight: 1.4, margin: "0 0 16px", textAlign: "center" }}>
              "Form follows sound." Specialty acoustician, Brutalist design preservationist, and minimalist urban space curator.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "#050505" }}>
              <div>💼 Works as <strong>Lead Acoustical Architect</strong> at Studio Concrete</div>
              <div>🎓 Studied Architectural Engineering at UC Berkeley</div>
              <div>🏠 Lives in <strong>San Francisco, California</strong></div>
              <div>📍 From Seattle, Washington</div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: 20, fontWeight: "bold", margin: "0 0 12px" }}>Preferences &amp; Interests</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Vinyl Listening Bars", "Third-Wave Roastery", "Single-Origin Espresso", "Brutalist Architecture", "Mid-Century Modern", "Bauhaus Design", "Immersive Art", "Natural Wine Bars"].map((tag) => (
                <span key={tag} style={{ background: "#f0f2f5", color: "#050505", borderRadius: 16, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}>
                  🏷️ {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Timeline Posts) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Post 1 */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#4a5568", color: "#fff", display: "grid", placeItems: "center", fontWeight: "bold" }}>LS</div>
              <div>
                <span style={{ fontWeight: "bold", fontSize: 14, display: "block" }}>Liam Sterling</span>
                <span style={{ fontSize: 12, color: "#65676b" }}>October 28 at 8:14 PM · 👥</span>
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.4, margin: "16px 0" }}>
              Just spent three hours at a hidden **vinyl listening bar** sipping **natural wine** and listening to Kamasi Washington's "The Epic" on a custom vintage horn sound system. Absolute bliss. High-fidelity acoustic design at its finest.
            </p>
            <div style={{ borderTop: "1px solid #e4e6eb", borderBottom: "1px solid #e4e6eb", padding: "8px 0", display: "flex", justifyContent: "space-around", fontSize: 13, color: "#65676b", fontWeight: "bold" }}>
              <span>👍 Like</span>
              <span>💬 Comment</span>
              <span>↩️ Share</span>
            </div>
          </div>

          {/* Post 2 */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#4a5568", color: "#fff", display: "grid", placeItems: "center", fontWeight: "bold" }}>LS</div>
              <div>
                <span style={{ fontWeight: "bold", fontSize: 14, display: "block" }}>Liam Sterling</span>
                <span style={{ fontSize: 12, color: "#65676b" }}>October 26 at 9:30 AM · 👥</span>
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.4, margin: "16px 0" }}>
              My morning ritual is anchored by **third-wave specialty coffee**. Today's single-origin roastery featured an outstanding washed Ethiopian bean with clean, geometric interior spaces that perfectly represent Scandinavian minimalism.
            </p>
            <div style={{ borderTop: "1px solid #e4e6eb", borderBottom: "1px solid #e4e6eb", padding: "8px 0", display: "flex", justifyContent: "space-around", fontSize: 13, color: "#65676b", fontWeight: "bold" }}>
              <span>👍 Like</span>
              <span>💬 Comment</span>
              <span>↩️ Share</span>
            </div>
          </div>

          {/* Post 3 */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#4a5568", color: "#fff", display: "grid", placeItems: "center", fontWeight: "bold" }}>LS</div>
              <div>
                <span style={{ fontWeight: "bold", fontSize: 14, display: "block" }}>Liam Sterling</span>
                <span style={{ fontSize: 12, color: "#65676b" }}>October 22 at 2:15 PM · 👥</span>
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.4, margin: "16px 0" }}>
              Drafting restoration proposals for **brutalist architecture** landmarks. There is something so honest, raw, and functional about exposed concrete coupled with mid-century modern Herman Miller furniture pieces.
            </p>
            <div style={{ borderTop: "1px solid #e4e6eb", borderBottom: "1px solid #e4e6eb", padding: "8px 0", display: "flex", justifyContent: "space-around", fontSize: 13, color: "#65676b", fontWeight: "bold" }}>
              <span>👍 Like</span>
              <span>💬 Comment</span>
              <span>↩️ Share</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const city = searchParams.get("city") || "";

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const query = city ? `${q}, ${city}` : q;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      {
        headers: {
          "User-Agent": "VibeTour/1.0",
          Accept: "application/json",
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const results = data.map((item: Record<string, unknown>, idx: number) => {
          const rawName = String(item.name || (typeof item.display_name === "string" ? item.display_name.split(",")[0] : q));
          const lower = `${rawName} ${String(item.type || "")} ${String(item.class || "")}`.toLowerCase();
          
          let category = "Venue";
          if (/aerodrome|airport|terminal/i.test(lower)) category = "Airport";
          else if (/hotel|motel|resort|hostel|inn/i.test(lower)) category = "Hotel";
          else if (/station|train|subway|metro/i.test(lower)) category = "Station";
          else if (/cafe|coffee/i.test(lower)) category = "Cafe";
          else if (/restaurant|dining|bistro/i.test(lower)) category = "Restaurant";

          return {
            id: `geo-${item.place_id || Date.now()}-${idx}`,
            name: rawName,
            category,
            address: String(item.display_name || ""),
            lat: typeof item.lat === "string" ? parseFloat(item.lat) : Number(item.lat) || 0,
            lon: typeof item.lon === "string" ? parseFloat(item.lon) : Number(item.lon) || 0,
            affinity: 0.95,
          };
        });
        return NextResponse.json({ results });
      }
    }
  } catch {
    // Handled below with graceful heuristic response
  }

  // Graceful fallback location
  const lowerQ = q.toLowerCase();
  let cat = "Venue";
  if (/airport|terminal/i.test(lowerQ)) cat = "Airport";
  else if (/hotel|inn|stay/i.test(lowerQ)) cat = "Hotel";
  else if (/station/i.test(lowerQ)) cat = "Station";

  return NextResponse.json({
    results: [
      {
        id: `manual-${Date.now()}`,
        name: q,
        category: cat,
        address: city ? `${q}, ${city}` : q,
        lat: undefined,
        lon: undefined,
        affinity: 0.95,
      },
    ],
  });
}

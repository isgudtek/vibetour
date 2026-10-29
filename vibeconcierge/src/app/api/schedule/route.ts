import { NextResponse } from "next/server";
import { callLLM, LLMProvider } from "@/lib/llm";
import type { Venue } from "@/types";

export const dynamic = "force-dynamic";

export interface ScheduledSlot {
  uid: string;
  venueId: string;
  day: number;
  startSlot: number;
  duration: number;
}

function parseJsonFromText<T>(raw: string, fallback: T): T {
  const m = raw.match(/\{[\s\S]*\}/);
  const txt = (m ? m[0] : raw).replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(txt) as T;
  } catch {
    return fallback;
  }
}

/**
 * Heuristic fallback schedule generator
 * Slot map: 9:00 AM is slot 0, each slot is 30 mins. Slot 22 is 20:00 (8:00 PM).
 * Morning (09:00 - 11:30): slots 0 - 4 (Cafe, Bakery, Shop)
 * Lunch (12:00 - 14:00): slots 6 - 8 (Restaurant)
 * Afternoon (14:30 - 17:30): slots 11 - 15 (Museum, Gallery, Shop, Park)
 * Dinner (19:00 - 21:00): slots 18 - 20 (Restaurant, Dining)
 * Night (21:30+): slots 22 - 24 (Bar, Club, Theater, Venue)
 */
function heuristicSchedule(venues: Venue[], numDays: number): ScheduledSlot[] {
  const schedule: ScheduledSlot[] = [];
  const usedVenueIds = new Set<string>();

  // Group venues by high-level role
  const cafes = venues.filter((v) => ["Cafe"].includes(v.category));
  const restaurants = venues.filter((v) => ["Restaurant"].includes(v.category));
  const cultureAndShops = venues.filter((v) => ["Museum", "Shop", "Park", "Theater", "Venue"].includes(v.category));
  const nightlife = venues.filter((v) => ["Bar", "Club"].includes(v.category));
  const others = venues.filter((v) => !cafes.includes(v) && !restaurants.includes(v) && !cultureAndShops.includes(v) && !nightlife.includes(v));

  const pickNext = (list: Venue[]): Venue | undefined => {
    const v = list.find((x) => !usedVenueIds.has(x.id));
    if (v) usedVenueIds.add(v.id);
    return v;
  };

  for (let day = 1; day <= numDays; day++) {
    // Morning cafe/breakfast (09:30 AM is slot 19, duration 2 -> 1h)
    const morningPlace = pickNext(cafes) || pickNext(others) || pickNext(cultureAndShops);
    if (morningPlace) {
      schedule.push({
        uid: `${morningPlace.id}-${day}-morning`,
        venueId: morningPlace.id,
        day,
        startSlot: 19, // 09:30 AM
        duration: 2,   // 1 hr
      });
    }

    // Afternoon activity / shop / museum (14:00 PM is slot 28, duration 3 -> 1.5h)
    const afternoonPlace = pickNext(cultureAndShops) || pickNext(others) || pickNext(cafes);
    if (afternoonPlace) {
      schedule.push({
        uid: `${afternoonPlace.id}-${day}-afternoon`,
        venueId: afternoonPlace.id,
        day,
        startSlot: 28, // 14:00 PM
        duration: 3,   // 1.5 hrs
      });
    }

    // Dinner (18:30 PM is slot 37, duration 3 -> 1.5h)
    const dinnerPlace = pickNext(restaurants) || pickNext(others) || pickNext(cultureAndShops);
    if (dinnerPlace) {
      schedule.push({
        uid: `${dinnerPlace.id}-${day}-dinner`,
        venueId: dinnerPlace.id,
        day,
        startSlot: 37, // 18:30 PM
        duration: 3,   // 1.5 hrs
      });
    }
  }

  return schedule;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const venues = Array.isArray(body.venues) ? (body.venues as Venue[]) : [];
  const numDays = typeof body.numDays === "number" && body.numDays > 0 ? Math.min(7, Math.max(1, body.numDays)) : 2;
  const provider: LLMProvider = body.provider === "openai" ? "openai" : body.provider === "gemini" ? "gemini" : body.provider === "openrouter" ? "openrouter" : "groq";

  if (venues.length === 0) {
    return NextResponse.json({ schedule: [] });
  }

  const venueSummaries = venues.slice(0, 20).map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
  }));

  const prompt = `You are a high-end concierge planner arranging an itinerary across ${numDays} days.
We have 48 half-hour slots per day: slot 0 is 00:00 (midnight), slot 16 is 08:00 AM, slot 24 is 12:00 PM, slot 36 is 18:00 PM (6:00 PM), slot 40 is 20:00 PM (8:00 PM), max slot index is 47.

CRITICAL PLACEMENT REQUIREMENTS:
- You must ONLY schedule appointments during the Day period (between slot 16 and slot 40, i.e., 08:00 AM to 08:00 PM).
- DO NOT schedule any appointments in slots 0-15 or slots 41-47. Leave these late-night and early-morning slots completely empty. This is extremely important!

Given this list of venues, distribute them logically into daily itineraries:
- Day starts at 1, goes up to ${numDays}.
- Morning (slot 18-22): Cafes / breakfast. Duration 2.
- Afternoon (slot 26-34): Museums, shops, galleries. Duration 2-3.
- Evening (slot 35-39): Dining / Restaurants. Duration 3.
- Ensure slots on the same day DO NOT overlap! (startSlot + duration <= next startSlot).
- Ensure startSlot + duration <= 40.

Return ONLY valid JSON:
{
  "schedule": [
    { "venueId": string, "day": number, "startSlot": number, "duration": number }
  ]
}

Available Venues:
${JSON.stringify(venueSummaries)}`;

  try {
    const content = await callLLM(prompt, provider, 600, { temperature: 0.2, response_format: { type: "json_object" } });
    const parsed = parseJsonFromText<{ schedule?: { venueId: string; day: number; startSlot: number; duration: number }[] }>(content, {});

    if (Array.isArray(parsed.schedule) && parsed.schedule.length > 0) {
      // Validate venueIds exist and slots don't violate bounds
      const validVenues = new Set(venues.map((v) => v.id));
      const validated: ScheduledSlot[] = [];

      parsed.schedule.forEach((item, idx) => {
        if (!validVenues.has(item.venueId)) return;
        const day = Math.min(numDays, Math.max(1, Number(item.day) || 1));
        const startSlot = Math.min(46, Math.max(0, Number(item.startSlot) || 0));
        const duration = Math.min(48 - startSlot, Math.max(1, Number(item.duration) || 2));

        validated.push({
          uid: `${item.venueId}-${day}-${startSlot}-${idx}`,
          venueId: item.venueId,
          day,
          startSlot,
          duration,
        });
      });

      if (validated.length > 0) {
        return NextResponse.json({ schedule: validated, source: provider });
      }
    }

    const fallback = heuristicSchedule(venues, numDays);
    return NextResponse.json({ schedule: fallback, source: "heuristic_fallback" });
  } catch {
    const fallback = heuristicSchedule(venues, numDays);
    return NextResponse.json({ schedule: fallback, source: "heuristic_fallback" });
  }
}

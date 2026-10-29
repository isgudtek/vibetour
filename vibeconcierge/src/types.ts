export type TasteCategory = "Music" | "Dining" | "Fashion" | "Books" | "Art" | "Design" | "Nightlife" | "Other";

export interface TasteTag {
  name: string;
  category: TasteCategory;
  sourceContext?: string;
  /** Canonical Qloo taste-tag id this phrase was mapped to (live mode only). */
  qlooTagId?: string;
  /** Canonical Qloo taste-tag name the phrase was mapped to. */
  qlooTagName?: string;
}

export interface Venue {
  id: string;
  name: string;
  category: string;
  affinity: number;
  lat?: number;
  lon?: number;
  address?: string;
  image?: string;
  rationale?: string;
  tags?: string[];
}

export interface ItinerarySlot {
  time: string;
  title: string;
  venueId?: string;
  notes?: string;
}

export interface ConciergeRequest {
  hostName: string;
  clientName: string;
  destinationCity: string;
  socialText: string;
}

export interface ConciergeResponse {
  logs: string[];
  tags: TasteTag[];
  venues: Venue[];
  rationaleReport: string;
  itinerary: ItinerarySlot[];
  mode: "live" | "mock";
}

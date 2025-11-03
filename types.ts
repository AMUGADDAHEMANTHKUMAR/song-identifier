export interface SongResult {
  title: string;
  artist: string;
  album: string;
  releaseYear: string;
  confidence?: string; // Optional confidence score from Gemini
  timestamp: string;
  previewUrl?: string; // New: Optional URL for song preview
  lyrics?: string | null; // New: Optional field for song lyrics
  spotifyUrl?: string; // New: Optional URL for Spotify integration
}

export interface GroundingUrl {
  url: string;
  title?: string;
}

export interface GeminiSongIdentificationResponse {
  songs: SongResult[];
  groundingUrls?: GroundingUrl[]; // New: Grounding URLs from Google Search
}
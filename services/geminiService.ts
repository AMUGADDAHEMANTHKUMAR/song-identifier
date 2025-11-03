import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Type,
  GenerateContentResponse,
  LiveSession,
} from '@google/genai';
import {
  AUDIO_SAMPLE_RATE,
  GEMINI_MODEL_FLASH,
  GEMINI_MODEL_LIVE_AUDIO,
  SPEAKER_VOICE_NAME,
} from '../constants';
import { GeminiSongIdentificationResponse, GroundingUrl, SongResult } from '../types';

// Ensure the API_KEY is accessed from process.env
const apiKey = process.env.API_KEY;
const shazamRapidApiKey = process.env.SHAZAM_RAPIDAPI_KEY;
const shazamRapidApiHost = process.env.SHAZAM_RAPIDAPI_HOST || 'shazam.p.rapidapi.com';

// No longer a global singleton to ensure new instance is created with potentially updated API key
function getGeminiClient(): GoogleGenAI {
  if (!apiKey) {
    throw new Error('API_KEY is not defined. Please ensure it is set in your environment.');
  }
  return new GoogleGenAI({ apiKey });
}

export const checkAndSelectApiKey = async (): Promise<boolean> => {
  // Assume window.aistudio exists in the execution environment
  if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      alert(
        'Please select a Google Gemini API key to use this application. You will be redirected to a selection dialog.'
      );
      // Link to billing documentation as required for Veo, applicable here for general API usage context.
      alert('For more information on billing, visit ai.google.dev/gemini-api/docs/billing');
      await window.aistudio.openSelectKey();
      // Assume selection was successful after openSelectKey for race condition mitigation
      return true;
    }
    return true;
  }
  // If not running in aistudio environment, assume API_KEY is available via process.env
  if (!apiKey) {
    console.error('API_KEY is missing. Please set it as an environment variable.');
    return false;
  }
  return true;
};


export const startLiveAudioTranscription = async (
  onTranscription: (text: string) => void,
  onTurnComplete: (fullInput: string) => void,
  onError: (error: ErrorEvent) => void,
  onClose: (event: CloseEvent) => void,
): Promise<{ sessionPromise: Promise<LiveSession>; stream: MediaStream }> => {
  const currentAi = getGeminiClient();
  let currentInputTranscription = '';
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const sessionPromise = currentAi.live.connect({
    model: GEMINI_MODEL_LIVE_AUDIO,
    callbacks: {
      onopen: () => {
        console.log('Gemini Live session opened.');
      },
      onmessage: async (message: LiveServerMessage) => {
        if (message.serverContent?.inputTranscription) {
          const text = message.serverContent.inputTranscription.text;
          currentInputTranscription += text;
          onTranscription(currentInputTranscription);
        }
        if (message.serverContent?.turnComplete) {
          onTurnComplete(currentInputTranscription);
          currentInputTranscription = ''; // Reset for next turn
        }
      },
      onerror: (e: ErrorEvent) => {
        console.error('Gemini Live session error:', e);
        onError(e);
      },
      onclose: (e: CloseEvent) => {
        console.log('Gemini Live session closed:', e);
        onClose(e);
      },
    },
    config: {
      responseModalities: [Modality.AUDIO], // Required, even if we only care about transcription
      inputAudioTranscription: {}, // Enable transcription for user input audio
      // Optionally, enable model's speech output
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: SPEAKER_VOICE_NAME } },
      },
    },
  });

  // Return the promise, not the resolved session, to handle race conditions
  return { sessionPromise, stream };
};

export const searchShazamRapidAPI = async (
  transcription: string,
): Promise<GeminiSongIdentificationResponse | null> => {
  if (!transcription.trim()) {
    return null;
  }

  if (!shazamRapidApiKey) {
    console.error('SHAZAM_RAPIDAPI_KEY is not defined.');
    return null;
  }

  const encodedTerm = encodeURIComponent(transcription);
  const url = `https://${shazamRapidApiHost}/v2/auto-complete?term=${encodedTerm}&locale=en-US`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': shazamRapidApiHost,
        'x-rapidapi-key': shazamRapidApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Shazam API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const identifiedSongs: SongResult[] = [];
    const groundingUrls: GroundingUrl[] = [];

    // Process tracks
    if (data.tracks && data.tracks.hits && data.tracks.hits.length > 0) {
      data.tracks.hits.slice(0, 3).forEach((hit: any) => { // Take top 3 results
        const track = hit.track;
        if (track) {
          const song: SongResult = {
            title: track.title || 'Unknown Title',
            artist: track.subtitle || 'Unknown Artist',
            album: track.album?.title || 'Unknown Album',
            releaseYear: track.sections?.[0]?.metadata?.find((m: any) => m.title === 'Released')?.text || 'N/A',
            confidence: 'N/A', // Auto-complete doesn't provide confidence directly
            timestamp: new Date().toLocaleString(),
            previewUrl: track.hub?.actions?.find((a: any) => a.type === 'REMIX' && a.uri)?.uri || track.hub?.actions?.find((a: any) => a.type === 'APPLEMUSICPLAY' && a.uri)?.uri, // Assuming a preview URL from hub actions
            spotifyUrl: track.shares?.spotify?.actions?.[0]?.uri || track.external_metadata?.spotify?.url, // Attempt to get Spotify URL
          };
          identifiedSongs.push(song);
          if (track.url) {
            groundingUrls.push({ url: track.url, title: `Shazam - ${song.title}` });
          }
        }
      });
    }

    return { songs: identifiedSongs, groundingUrls };

  } catch (error) {
    console.error('Error searching Shazam RapidAPI:', error);
    return null;
  }
};


export const fetchSongLyrics = async (
  songTitle: string,
  artistName: string,
): Promise<{ lyrics: string | null; lyricsGroundingUrls: GroundingUrl[] }> => {
  const currentAi = getGeminiClient();

  const prompt = `Find the full lyrics for the song "${songTitle}" by "${artistName}".
  Output the lyrics text directly. If you cannot find them, state "Lyrics not found.".
  Also, provide any relevant web links that specifically contain these lyrics.`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: GEMINI_MODEL_FLASH,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.5,
      },
    });

    const textOutput = response.text.trim();
    let lyrics: string | null = null;
    const lyricsGroundingUrls: GroundingUrl[] = [];

    // Attempt to extract lyrics text
    if (textOutput && !textOutput.toLowerCase().includes('lyrics not found.')) {
        lyrics = textOutput; // Assume the primary response is the lyrics
    }

    // Extract grounding URLs specifically for lyrics
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of response.candidates[0].groundingMetadata.groundingChunks) {
        if (chunk.web?.uri && (chunk.web.title?.toLowerCase().includes('lyrics') || chunk.web.uri.toLowerCase().includes('lyrics'))) {
          lyricsGroundingUrls.push({ url: chunk.web.uri, title: chunk.web.title });
        }
      }
    }

    return { lyrics, lyricsGroundingUrls };

  } catch (error) {
    console.error('Error fetching song lyrics with Gemini:', error);
    if (error instanceof Error && error.message.includes('Requested entity was not found')) {
      alert('API key might be invalid or lacking permissions. Please try selecting your API key again.');
      window.aistudio?.openSelectKey();
    }
    return { lyrics: null, lyricsGroundingUrls: [] };
  }
};
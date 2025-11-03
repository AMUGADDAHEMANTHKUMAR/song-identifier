import React, { useState, useEffect, useRef, useCallback } from 'react';
import ListenButton from './components/ListenButton';
import RecognitionResult from './components/RecognitionResult';
import HistoryList from './components/HistoryList';
import {
  checkAndSelectApiKey,
  startLiveAudioTranscription,
  searchShazamRapidAPI, // Changed from identifySongFromTranscription
  fetchSongLyrics, // Kept for lyrics
} from './services/geminiService';
import { GroundingUrl, SongResult } from './types';
import {
  AUDIO_CHUNK_SIZE,
  AUDIO_CHANNEL_COUNT,
  AUDIO_SAMPLE_RATE,
  LOCAL_STORAGE_HISTORY_KEY,
  RECORDING_DURATION_MS,
} from './constants';
import { createBlob } from './utils/audioUtils';
import { LiveSession } from '@google/genai';

type View = 'listen' | 'results' | 'history';

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [recognitionResults, setRecognitionResults] = useState<SongResult[] | null>(null);
  const [history, setHistory] = useState<SongResult[]>([]);
  const [groundingUrls, setGroundingUrls] = useState<GroundingUrl[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('listen');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(0);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const liveSessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext)({
        sampleRate: AUDIO_SAMPLE_RATE,
      });
    }
    return audioContextRef.current;
  }, []);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    } catch (e) {
      console.error('Failed to load history:', e);
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, [history]);
  
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const stopRecording = useCallback(() => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (isRecording) {
      setIsRecording(false);
      mediaStreamSourceRef.current?.disconnect();
      scriptProcessorRef.current?.disconnect();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      liveSessionRef.current?.close();
      mediaStreamSourceRef.current = null;
      scriptProcessorRef.current = null;
      mediaStreamRef.current = null;
      liveSessionRef.current = null;
      liveSessionPromiseRef.current = null;
    }
  }, [isRecording]);

  const handleRecognition = useCallback(async (transcriptionText: string) => {
    stopRecording();
    setIsLoading(true);
    setRecognitionResults(null);
    setGroundingUrls([]);
    setError(null);

    try {
      const shazamResults = await searchShazamRapidAPI(transcriptionText); // Use Shazam for identification
      
      if (shazamResults && shazamResults.songs.length > 0) {
        const timestamp = new Date().toLocaleString();
        const enrichedSongs: SongResult[] = [];
        let allGroundingUrls: GroundingUrl[] = [];

        for (const song of shazamResults.songs) {
          const lyricsData = await fetchSongLyrics(song.title, song.artist); // Still use Gemini for lyrics
          enrichedSongs.push({
            ...song,
            timestamp,
            releaseYear: song.releaseYear || 'N/A',
            lyrics: lyricsData.lyrics,
          });
          allGroundingUrls = [...allGroundingUrls, ...lyricsData.lyricsGroundingUrls];
        }

        const uniqueGroundingUrls = Array.from(new Set(allGroundingUrls.map(u => u.url)))
                                       .map(url => allGroundingUrls.find(u => u.url === url)!);

        setRecognitionResults(enrichedSongs);
        setGroundingUrls(uniqueGroundingUrls);
        setHistory((prev) => [enrichedSongs[0], ...prev]);
        setView('results');
      } else {
        setError('Could not identify the song. Please try again.');
        setView('listen');
      }
    } catch (err) {
      console.error('Error during song identification:', err);
      setError('An API error occurred. Please try again.');
      setView('listen');
    } finally {
      setIsLoading(false);
    }
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    setError(null);
    setRecognitionResults(null);
    setGroundingUrls([]);
    
    const hasKey = await checkAndSelectApiKey();
    if (!hasKey) {
      setError('API key is required. Please select a valid key.');
      return;
    }
    
    setIsRecording(true);

    try {
      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();

      const { sessionPromise, stream } = await startLiveAudioTranscription(
        (text) => setCurrentTranscription(text),
        handleRecognition,
        (e) => {
          console.error('Live session error:', e);
          setError('Live audio session failed.');
          stopRecording();
        },
        () => {
          console.log('Live session closed.');
          if (isRecording) stopRecording();
        }
      );

      liveSessionPromiseRef.current = sessionPromise;
      mediaStreamRef.current = stream;

      await sessionPromise.then(session => { liveSessionRef.current = session; });

      mediaStreamSourceRef.current = audioContext.createMediaStreamSource(stream);
      scriptProcessorRef.current = audioContext.createScriptProcessor(AUDIO_CHUNK_SIZE, AUDIO_CHANNEL_COUNT, AUDIO_CHANNEL_COUNT);
      scriptProcessorRef.current.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmBlob = createBlob(inputData, AUDIO_SAMPLE_RATE);
        liveSessionPromiseRef.current?.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      };
      mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContext.destination);

      recordingTimeoutRef.current = setTimeout(() => {
        const finalTranscription = currentTranscription;
        handleRecognition(finalTranscription);
      }, RECORDING_DURATION_MS);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start microphone. Please grant access.');
      setIsRecording(false);
      stopRecording();
    }
  }, [getAudioContext, handleRecognition, currentTranscription, stopRecording, isRecording]);

  const toggleListening = useCallback(() => {
    if (isRecording) {
      const finalTranscription = currentTranscription;
      stopRecording();
      if (finalTranscription && finalTranscription !== 'Listening...') {
        handleRecognition(finalTranscription);
      } else {
        setError('No audio was captured. Please try again.');
      }
    } else {
      startRecording();
    }
  }, [isRecording, currentTranscription, stopRecording, handleRecognition, startRecording]);
  
  const showListenView = () => {
      setRecognitionResults(null);
      setError(null);
      setCurrentTranscription('');
      setView('listen');
  };

  const shareSong = useCallback((song: SongResult) => {
    let shareText = `🎵 Identified "${song.title}" by ${song.artist} with TuneFinder!`;
    let shareUrl = window.location.href;

    if (song.spotifyUrl) {
      shareText += ` Listen on Spotify: ${song.spotifyUrl}`;
      shareUrl = song.spotifyUrl;
    }

    if (navigator.share) {
      navigator.share({
        title: 'TuneFinder Song Identification',
        text: shareText,
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        setToastMessage('Copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        setToastMessage('Failed to copy link.');
      });
    }
  }, []);

  const renderContent = () => {
    switch (view) {
      case 'history':
        return <HistoryList history={history} onClearHistory={clearHistory} onShare={shareSong} onBack={showListenView} />;
      case 'results':
        return (
          <div className="w-full flex flex-col items-center px-2">
            {recognitionResults && recognitionResults.length > 0 && (
              <div className="w-full">
                <h2 className="text-3xl font-bold text-center text-indigo-300 mb-6">Top Result</h2>
                <RecognitionResult song={recognitionResults[0]} groundingUrls={groundingUrls} onShare={shareSong} />
              </div>
            )}
            {recognitionResults && recognitionResults.length > 1 && (
              <div className="mt-8 w-full">
                 <h2 className="text-2xl font-bold text-center text-gray-400 mb-6">Other Possibilities</h2>
                 <div className="space-y-4">
                  {recognitionResults.slice(1).map((song, index) => (
                    <RecognitionResult key={index} song={song} onShare={shareSong} />
                  ))}
                 </div>
              </div>
            )}
            <button
              onClick={showListenView}
              className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-colors duration-200"
            >
              Identify Another Song
            </button>
          </div>
        );
      case 'listen':
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <ListenButton isRecording={isRecording} onClick={toggleListening} isLoading={isLoading} transcription={currentTranscription} />
            {error && (
              <div className="mt-8 bg-red-900/50 border border-red-700 p-4 rounded-lg max-w-md w-full">
                <p className="font-semibold">{error}</p>
              </div>
            )}
          </div>
        );
    }
  };

  const clearHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear your history?')) {
      setHistory([]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 font-sans selection:bg-indigo-500/30">
      <header className="w-full max-w-4xl mx-auto flex justify-between items-center p-4">
        <h1 className="text-2xl font-bold tracking-wider text-white">TuneFinder</h1>
        <button
          onClick={() => setView('history')}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          aria-label="View history"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
      </header>

      <main className="flex-grow w-full max-w-2xl flex flex-col items-center justify-center">
        {renderContent()}
      </main>
      
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white py-2 px-5 rounded-full shadow-lg text-sm z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
import React, { useRef, useState, useEffect } from 'react';
import { GroundingUrl, SongResult } from '../types';

interface RecognitionResultProps {
  song: SongResult;
  groundingUrls?: GroundingUrl[];
  onShare: (song: SongResult) => void;
}

const RecognitionResult: React.FC<RecognitionResultProps> = ({ song, groundingUrls, onShare }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener('ended', handleEnded);

      const handleError = () => {
        setAudioError('Failed to load audio preview.');
        setIsPlaying(false);
      };
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [song.previewUrl]);

  const togglePlayPreview = () => {
    const audio = audioRef.current;
    if (audio) {
      setAudioError(null);
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(e => {
          console.error("Error playing audio:", e);
          setAudioError('Failed to play audio preview.');
          setIsPlaying(false);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col bg-gray-900 rounded-lg shadow-lg p-4 mb-4 transition-all duration-200 hover:shadow-xl w-full">
      <div className="flex flex-col sm:flex-row items-center w-full gap-4">
        <img
          src={`https://picsum.photos/128/128?random=${song.title.length + song.artist.length}`}
          alt={`${song.album} Album Art`}
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-grow text-center sm:text-left min-w-0">
          <h3 className="text-2xl font-bold text-white mb-1 truncate">{song.title}</h3>
          <p className="text-indigo-400 text-lg mb-1 truncate">{song.artist}</p>
          <p className="text-gray-400 text-md">{song.album} ({song.releaseYear})</p>
          {song.confidence && (
            <span className="inline-block bg-gray-700 text-indigo-300 text-xs px-2 py-0.5 rounded-full mt-2">
              Confidence: {song.confidence}
            </span>
          )}
          {audioError && (
            <p className="text-red-400 text-sm mt-2">{audioError}</p>
          )}
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0 flex-shrink-0">
          {song.previewUrl && (
            <>
              <audio ref={audioRef} src={song.previewUrl} preload="none" className="hidden"></audio>
              <button
                onClick={togglePlayPreview}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-3 rounded-full flex items-center justify-center text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 w-16 h-16"
                aria-label={isPlaying ? `Pause preview of ${song.title}` : `Play preview of ${song.title}`}
              >
                {isPlaying ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V9a1 1 0 00-1-1H7z" clipRule="evenodd"></path></svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.542a.5.5 0 00-.81.41l-1.154 5.37a.5.5 0 00.81.59l4.57-2.68a.5.5 0 000-.86l-4.57-2.68a.5.5 0 00-.846-.15z" clipRule="evenodd"></path></svg>
                )}
              </button>
            </>
          )}
          {song.spotifyUrl && (
            <a
              href={song.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-3 rounded-full flex items-center justify-center text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 w-16 h-16"
              aria-label={`Open ${song.title} on Spotify`}
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.82 17.58c-.198.324-.596.42-.916.223-2.67-1.638-6.007-1.996-9.986-1.168-.387.08-.767-.133-.847-.52-.08-.387.133-.767.52-.847 4.39-.914 8.167-.49 11.14 1.34.32.198.42.596.223.916zM18.34 14.19c-.246.404-.736.522-1.14.275-3.08-1.876-7.708-2.428-11.758-1.13-.464.153-.94-.09-1.093-.554-.153-.464.09-.94.554-1.093 4.54-1.488 9.61-1.006 13.064 1.05.404.247.522.736.275 1.14zm-.008-3.414c-.294.484-.89.625-1.374.33-3.447-2.108-8.683-2.678-12.78-1.428-.53.166-1.08-.106-1.246-.637-.166-.53.106-1.08.636-1.246 4.67-1.463 10.456-1.14 14.385 1.25.483.294.625.89.33 1.374z"/>
              </svg>
            </a>
          )}
          <button
            onClick={() => onShare(song)}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-3 rounded-full flex items-center justify-center text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 w-16 h-16"
            aria-label={`Share ${song.title}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3 0 000-.742l4.94-2.47C13.456 7.68 14.162 8 15 8z"></path></svg>
          </button>
        </div>
      </div>

      {song.lyrics && (
        <details className="mt-4 w-full text-left bg-gray-800 rounded-md p-3">
          <summary className="text-white text-lg font-semibold cursor-pointer">
            View Lyrics
          </summary>
          <pre className="mt-2 text-gray-300 whitespace-pre-wrap font-sans text-sm max-h-48 overflow-y-auto custom-scrollbar">
            {song.lyrics}
          </pre>
        </details>
      )}

      {groundingUrls && groundingUrls.length > 0 && (
        <div className="mt-4 w-full border-t border-gray-700 pt-4">
          <p className="text-gray-400 text-sm font-semibold mb-2 text-center sm:text-left">Relevant Links:</p>
          <ul className="text-xs space-y-1 text-center sm:text-left">
            {groundingUrls.map((link, idx) => (
              <li key={idx}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-200"
                  aria-label={`Visit ${link.title || link.url}`}
                >
                  {link.title || new URL(link.url).hostname}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RecognitionResult;
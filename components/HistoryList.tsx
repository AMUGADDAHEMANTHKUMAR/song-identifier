import React from 'react';
import { SongResult } from '../types';

interface HistoryListProps {
  history: SongResult[];
  onClearHistory: () => void;
  onShare: (song: SongResult) => void;
  onBack: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onClearHistory, onShare, onBack }) => {
  return (
    <div className="p-4 bg-black rounded-lg w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 pb-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors" aria-label="Go back">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-white">My Music</h2>
        <button
          onClick={onClearHistory}
          className="text-red-400 hover:text-red-500 text-sm font-medium transition-colors duration-200"
          aria-label="Clear all history"
        >
          Clear
        </button>
      </div>

      {history.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500">
          <p className="text-lg">No songs identified yet.</p>
          <p className="mt-2">Your identified songs will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto custom-scrollbar">
          {history.map((song, index) => (
            <div key={index} className="flex items-center bg-gray-900 rounded-lg p-3 transition-all duration-200 hover:bg-gray-800">
              <img
                src={`https://picsum.photos/64/64?random=${index}`}
                alt={`${song.album} Album Art`}
                className="w-16 h-16 rounded-md object-cover mr-4 flex-shrink-0"
              />
              <div className="flex-grow min-w-0">
                <p className="text-lg font-semibold text-white truncate">{song.title}</p>
                <p className="text-indigo-400 text-sm truncate">{song.artist}</p>
              </div>
              {song.spotifyUrl && (
                <a
                  href={song.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 p-2 rounded-full text-green-400 hover:text-green-300 hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label={`Open ${song.title} on Spotify`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.82 17.58c-.198.324-.596.42-.916.223-2.67-1.638-6.007-1.996-9.986-1.168-.387.08-.767-.133-.847-.52-.08-.387.133-.767.52-.847 4.39-.914 8.167-.49 11.14 1.34.32.198.42.596.223.916zM18.34 14.19c-.246.404-.736.522-1.14.275-3.08-1.876-7.708-2.428-11.758-1.13-.464.153-.94-.09-1.093-.554-.153-.464.09-.94.554-1.093 4.54-1.488 9.61-1.006 13.064 1.05.404.247.522.736.275 1.14zm-.008-3.414c-.294.484-.89.625-1.374.33-3.447-2.108-8.683-2.678-12.78-1.428-.53.166-1.08-.106-1.246-.637-.166-.53.106-1.08.636-1.246 4.67-1.463 10.456-1.14 14.385 1.25.483.294.625.89.33 1.374z"/>
                  </svg>
                </a>
              )}
              <button
                onClick={() => onShare(song)}
                className="ml-2 p-2 rounded-full text-gray-400 hover:text-indigo-400 hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label={`Share ${song.title}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3 0 000-.742l4.94-2.47C13.456 7.68 14.162 8 15 8z"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryList;
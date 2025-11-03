import React from 'react';

interface ListenButtonProps {
  isRecording: boolean;
  onClick: () => void;
  isLoading: boolean;
  transcription: string;
}

const ListenButton: React.FC<ListenButtonProps> = ({ isRecording, onClick, isLoading, transcription }) => {
  const statusText = isLoading && !isRecording ? 'Identifying...' : isRecording ? (transcription || 'Listening...') : 'Tap to Identify';

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <button
        className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center rounded-full bg-indigo-600 transition-all duration-300 ease-in-out shadow-lg hover:bg-indigo-500 disabled:opacity-70 disabled:cursor-wait"
        onClick={onClick}
        disabled={isLoading && !isRecording}
        aria-label={statusText}
      >
        {isRecording && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ripple" style={{ animationDelay: '0s' }}></div>
            <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ripple" style={{ animationDelay: '0.6s' }}></div>
            <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ripple" style={{ animationDelay: '1.2s' }}></div>
          </div>
        )}
        <svg className="w-20 h-20 sm:w-24 sm:h-24 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8V16C8 18.2091 9.79086 20 12 20C14.2091 20 16 18.2091 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 16C8 13.7909 9.79086 12 12 12C14.2091 12 16 13.7909 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <p className="mt-8 text-xl text-white font-semibold h-7 truncate max-w-xs sm:max-w-md">
        {statusText}
      </p>
    </div>
  );
};

export default ListenButton;
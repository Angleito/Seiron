import React, { useEffect } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

/**
 * Example component demonstrating audio recording functionality
 * This shows how to integrate the useAudioRecorder hook with React components
 */
export const AudioRecorderExample: React.FC = () => {
  const {
    // Recording controls
    start,
    stop,
    pause,
    resume,
    
    // State
    isRecording,
    isPaused,
    recordingState,
    isSupported,
    permissionStatus,
    
    // Audio data
    audioLevel,
    isVoiceActive,
    visualizationData,
    recordingDuration,
    
    // Error handling
    error,
    clearError,
    
    // Utils
    checkPermissions,
  } = useAudioRecorder({
    chunkInterval: 100,
    vadThreshold: 0.02,
    onDataAvailable: (chunk) => {
      console.log('Audio chunk received:', chunk.size, 'bytes');
      // Here you would typically send the chunk to your audio processing service
    },
    onRecordingComplete: (blob) => {
      console.log('Recording complete:', blob.size, 'bytes');
      // Handle the final recording blob
    },
    onVoiceActivity: (isActive) => {
      console.log('Voice activity:', isActive);
    },
    onAudioLevel: (level) => {
      // Audio level monitoring (0-1)
      if (level > 0.1) {
        console.log('Audio level:', level.toFixed(3));
      }
    },
    onError: (error) => {
      console.error('Recording error:', error);
    },
  });

  // Check permissions on component mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Format duration for display
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  // Audio level visualization
  const getAudioLevelColor = (level: number): string => {
    if (level < 0.3) return '#4ade80'; // green
    if (level < 0.7) return '#fbbf24'; // yellow
    return '#ef4444'; // red
  };

  if (!isSupported) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Audio Recording Not Supported
        </h3>
        <p className="text-red-600">
          Your browser does not support the required Web Audio APIs for recording.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Audio Recorder
      </h3>

      {/* Permission Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Microphone:</span>
          <span className={`text-sm font-medium ${
            permissionStatus === 'granted' 
              ? 'text-green-600' 
              : permissionStatus === 'denied'
              ? 'text-red-600'
              : 'text-yellow-600'
          }`}>
            {permissionStatus || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error.message}</p>
            <button
              onClick={clearError}
              className="text-sm text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="mb-4 flex gap-2">
        {!isRecording ? (
          <button
            onClick={start}
            disabled={permissionStatus === 'denied'}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Recording
          </button>
        ) : (
          <div className="flex gap-2 flex-1">
            {isPaused ? (
              <button
                onClick={resume}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={pause}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Pause
              </button>
            )}
            <button
              onClick={stop}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Recording Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`text-sm font-medium capitalize ${
            recordingState === 'recording' 
              ? 'text-green-600' 
              : recordingState === 'paused'
              ? 'text-yellow-600'
              : 'text-gray-600'
          }`}>
            {recordingState}
          </span>
        </div>
        
        {isRecording && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Duration:</span>
            <span className="text-sm font-mono">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        )}
      </div>

      {/* Audio Level Visualization */}
      {isRecording && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Audio Level:</span>
            <span className="text-sm font-mono">
              {(audioLevel * 100).toFixed(1)}%
            </span>
          </div>
          
          {/* Audio Level Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-100"
              style={{
                width: `${Math.min(audioLevel * 100, 100)}%`,
                backgroundColor: getAudioLevelColor(audioLevel),
              }}
            />
          </div>
          
          {/* Voice Activity Indicator */}
          <div className="flex items-center mt-2">
            <div
              className={`w-3 h-3 rounded-full mr-2 transition-colors duration-200 ${
                isVoiceActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isVoiceActive ? 'Voice Detected' : 'No Voice'}
            </span>
          </div>
        </div>
      )}

      {/* Waveform Visualization */}
      {isRecording && visualizationData && (
        <div className="mb-4">
          <span className="text-sm text-gray-600 block mb-2">Waveform:</span>
          <canvas
            width={280}
            height={60}
            className="w-full border border-gray-200 rounded"
            ref={(canvas) => {
              if (canvas && visualizationData) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  // Clear canvas
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  
                  // Draw waveform
                  ctx.strokeStyle = '#3b82f6';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  
                  const sliceWidth = canvas.width / visualizationData.waveform.length;
                  let x = 0;
                  
                  for (let i = 0; i < visualizationData.waveform.length; i++) {
                    const v = visualizationData.waveform[i] * 0.5;
                    const y = (v + 1) * canvas.height / 2;
                    
                    if (i === 0) {
                      ctx.moveTo(x, y);
                    } else {
                      ctx.lineTo(x, y);
                    }
                    
                    x += sliceWidth;
                  }
                  
                  ctx.stroke();
                }
              }
            }}
          />
        </div>
      )}

      {/* Technical Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Sample Rate: 16kHz (optimized for ElevenLabs)</div>
        <div>Format: WebM/Opus (preferred)</div>
        <div>Chunk Size: 100ms streaming</div>
      </div>
    </div>
  );
};

export default AudioRecorderExample;
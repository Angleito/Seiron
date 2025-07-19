import React, { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  onVideoComplete?: () => void;
  onVideoStart?: () => void;
  className?: string;
  muted?: boolean;
  loop?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  onVideoComplete,
  onVideoStart,
  className = '',
  muted = true,
  loop = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    console.log('VideoPlayer mounted with src:', src);
    const video = videoRef.current;
    if (!video) {
      console.error('Video ref not available');
      return;
    }

    const handleCanPlay = () => {
      console.log('Video can play, attempting autoplay...');
      setIsLoading(false);
      video.play().then(() => {
        console.log('Video playback started successfully');
      }).catch((error) => {
        console.error('Video autoplay failed:', error);
        setHasError(true);
      });
    };

    const handlePlay = () => {
      console.log('Video play event triggered');
      onVideoStart?.();
    };

    const handleEnded = () => {
      console.log('Video ended, calling completion callback');
      onVideoComplete?.();
    };

    const handleError = (e: Event) => {
      const videoError = video.error;
      console.error('Video loading error:', videoError?.message || 'Unknown error', videoError);
      setHasError(true);
      setIsLoading(false);
      // Call complete callback even on error to continue the sequence
      onVideoComplete?.();
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Preload the video
    video.load();

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [src, onVideoComplete, onVideoStart]);

  if (hasError) {
    // Fallback UI when video fails to load
    return (
      <div className={`video-player-error ${className}`}>
        <div className="error-message">Video unavailable</div>
      </div>
    );
  }

  return (
    <div className={`video-player-container ${className}`}>
      {isLoading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
        </div>
      )}
      <video
        ref={videoRef}
        className="video-player"
        muted={muted}
        loop={loop}
        playsInline
        preload="auto"
        style={{ opacity: isLoading ? 0 : 1 }}
      >
        <source src={src} type="video/mp4" />
        <source src={src.replace('.mp4', '.webm')} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
import { FC, useEffect, useRef } from 'react';
import { useBackground } from '@/contexts/BackgroundContext';

interface GlobalBackgroundProps {
  variant?: 'default' | 'success';
}

const GlobalBackground: FC<GlobalBackgroundProps> = ({ variant = 'default' }) => {
  const { currentBackground, nextBackground, activeBackgrounds } = useBackground();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle video end to switch to next background
  const handleVideoEnd = () => {
    if (activeBackgrounds.length > 1) {
      nextBackground();
    }
  };

  // Load & play when the background video URL changes.
  // Note: autoplay-with-sound can be blocked by browsers; in that case we fall back to muted playback
  // (no prompt/icon as requested).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentBackground?.background_type !== 'video') return;

    const url = currentBackground.background_url;
    if (!url) return;

    // Avoid unnecessary reloads.
    const nextSrc = url;
    if (video.src !== nextSrc) {
      video.src = nextSrc;
    }

    video.volume = 1;
    video.muted = !!currentBackground.is_muted;

    let cancelled = false;

    const tryPlay = async () => {
      try {
        await video.play();
      } catch {
        // If audible autoplay is blocked, ensure video still plays smoothly by falling back to muted.
        if (!video.muted) {
          video.muted = true;
          try {
            await video.play();
          } catch {
            /* ignore */
          }
        }
      }
    };

    const onCanPlay = () => {
      if (!cancelled) void tryPlay();
    };

    video.addEventListener('canplay', onCanPlay);
    void tryPlay();

    return () => {
      cancelled = true;
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [currentBackground?.background_url, currentBackground?.background_type, currentBackground?.is_muted]);

  if (!currentBackground) {
    // Default gradient background
    if (variant === 'success') {
      return (
        <>
          <div className="absolute inset-0 bg-gradient-radial from-success/5 via-transparent to-transparent" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-success/10 rounded-full blur-3xl animate-pulse-slow" />
        </>
      );
    }
    return (
      <>
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" />
      </>
    );
  }

  if (currentBackground.background_type === 'image') {
    return (
      <>
        <img
          key={currentBackground.id}
          src={currentBackground.background_url}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover animate-fade-in"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-background/70" />
      </>
    );
  }

  if (currentBackground.background_type === 'video') {
    return (
      <>
        <video
          ref={videoRef}
          autoPlay
          preload="auto"
          loop={activeBackgrounds.length === 1}
          playsInline
          onEnded={handleVideoEnd}
          onError={() => {
            console.warn('Background video failed to load:', currentBackground.background_url);
          }}
          className="absolute inset-0 w-full h-full object-cover animate-fade-in"
        />

        <div className="absolute inset-0 bg-background/70" />
      </>
    );
  }

  return null;
};

export default GlobalBackground;



import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';

type Video = { id: number; url: string; duration: number };

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [videoRect, setVideoRect] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [showHint, setShowHint] = useState(true);
  const [muted, setMuted] = useState(true);

  const muteBtnSize = 44;
  const isScrolling = useRef(false);
  const touchY = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calcVideoRect = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let width = vw;
    let height = vw * 16 / 9;
    if (height > vh) {
      height = vh;
      width = vh * 9 / 16;
    }
    const left = Math.round((vw - width) / 2);
    const top = Math.round((vh - height) / 2);
    setVideoRect({
      width: Math.round(width),
      height: Math.round(height),
      left,
      top,
    });
  };

  useEffect(() => {
    calcVideoRect();
    window.addEventListener('resize', calcVideoRect);
    return () => window.removeEventListener('resize', calcVideoRect);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('videos').select('id, url, duration').order('id');
      if (error) {
        console.error('Supabase error:', error.message);
        setVideos([]);
      } else if (data && Array.isArray(data)) {
        const filtered = data.filter(
          (v: any) =>
            typeof v.url === 'string' &&
            v.url.length > 0 &&
            typeof v.duration === 'number' &&
            v.duration > 0
        );
        setVideos(filtered as Video[]);
        setCurrent(0);
      }
    })();
  }, []);

  useEffect(() => {
    if (!videos.length) return;
    if (current < 0 || current >= videos.length) return;
    if (!videos[current]) return;
    if (!videos[current].duration || videos[current].duration <= 0) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % videos.length);
    }, videos[current].duration * 1000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [current, videos]);

  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(t);
  }, [showHint, current]);

  const handleWheel = (e: React.WheelEvent) => {
    if (isOnIcon(e.clientX, e.clientY)) return;
    e.preventDefault();
    if (!videos.length || isScrolling.current) return;
    if (showHint) setShowHint(false);
    isScrolling.current = true;
    setTimeout(() => (isScrolling.current = false), 450);

    if (e.deltaY > 0) {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % videos.length);
    } else if (e.deltaY < 0) {
      setDirection(-1);
      setCurrent((prev) => (prev - 1 + videos.length) % videos.length);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const { clientX, clientY } = e.touches[0];
    touchY.current = clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchY.current === null || !videos.length || isScrolling.current) return;
    const { clientX, clientY } = e.changedTouches[0];
    if (isOnIcon(clientX, clientY)) return;
    const delta = clientY - touchY.current;
    if (Math.abs(delta) < 30) {
      return;
    }
    if (showHint) setShowHint(false);
    isScrolling.current = true;
    setTimeout(() => (isScrolling.current = false), 500);

    if (delta > 0) {
      setDirection(-1);
      setCurrent((prev) => (prev - 1 + videos.length) % videos.length);
    }
    if (delta < 0) {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % videos.length);
    }
    touchY.current = null;
  };

  const slideVariants = {
    enter: (dir: number) => ({
      y: dir === 1 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.99,
    }),
    center: { y: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({
      y: dir === 1 ? "-100%" : "100%",
      opacity: 0,
      scale: 0.99,
    }),
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // Vimeo用の処理
    if (url.includes('vimeo.com')) {
      const baseParams = 'badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1';
      const muteParam = muted ? '&muted=1' : '&muted=0';
      
      if (url.includes('?')) {
        return url + '&' + baseParams + muteParam;
      } else {
        return url + '?' + baseParams + muteParam;
      }
    }
    
    // YouTube用の処理
    if (url.includes('/shorts/')) {
      url = url.replace('/shorts/', '/embed/');
    }
    if (url.includes('?')) {
      url += '&autoplay=1&mute=' + (muted ? '1' : '0') + '&playsinline=1';
    } else {
      url += '?autoplay=1&mute=' + (muted ? '1' : '0') + '&playsinline=1';
    }
    return url;
  };

  const handleMuteToggle = () => setMuted(m => !m);

  // ミュートボタン位置（右下に配置）
  const muteBtnLeft = videoRect.left + videoRect.width - muteBtnSize - 16;
  const muteBtnTop = videoRect.top + videoRect.height - muteBtnSize - 16;

  // ミュートボタン上ではスワイプ/ホイール無効
  const isOnIcon = (x: number, y: number) =>
    x >= muteBtnLeft && x <= muteBtnLeft + muteBtnSize &&
    y >= muteBtnTop  && y <= muteBtnTop  + muteBtnSize;

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        background: '#000',
        position: 'relative',
        left: 0,
        top: 0,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        touchAction: 'none',
      }}
    >
      <AnimatePresence custom={direction}>
        {videos.length > 0 && current >= 0 && current < videos.length && videos[current] && getEmbedUrl(videos[current].url) && (
          <motion.iframe
            key={videos[current].id + '-' + (muted ? 'muted' : 'unmuted')}
            custom={direction}
            initial="enter"
            animate="center"
            exit="exit"
            variants={slideVariants}
            transition={{
              y: { type: "spring", stiffness: 400, damping: 40 },
              opacity: { duration: 0.20 },
              scale: { duration: 0.15 },
            }}
            src={getEmbedUrl(videos[current].url)}
            style={{
              position: 'absolute',
              left: `${videoRect.left}px`,
              top: `${videoRect.top}px`,
              width: `${videoRect.width}px`,
              height: `${videoRect.height}px`,
              border: 'none',
              background: '#000',
              display: 'block',
              pointerEvents: 'auto',
              cursor: 'pointer',
              zIndex: 0,
              borderRadius: '0',
              boxShadow: '0 0 0 9999px #000',
            }}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="main-video"
          />
        )}
      </AnimatePresence>
      
      <div
        style={{
          position: 'relative',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0)',
          pointerEvents: 'auto',
          zIndex: 0,
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ミュートボタン */}
        <button
          style={{
            position: 'absolute',
            left: `${muteBtnLeft}px`,
            top: `${muteBtnTop}px`,
            width: `${muteBtnSize}px`,
            height: `${muteBtnSize}px`,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(24,24,24,0.85)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 22,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
          }}
          onClick={handleMuteToggle}
          aria-label="ミュート切替"
        >
          {muted ? (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 11V17H9L15 23V5L9 11H4Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <line x1="20" y1="8" x2="26" y2="20" stroke="red" strokeWidth="2"/>
              <line x1="26" y1="8" x2="20" y2="20" stroke="red" strokeWidth="2"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 11V17H9L15 23V5L9 11H4Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M19 14C19 12.3431 17.6569 11 16 11V17C17.6569 17 19 15.6569 19 14Z" stroke="white" strokeWidth="2"/>
              <path d="M22 9C25 14 22 19 22 19" stroke="white" strokeWidth="2"/>
            </svg>
          )}
        </button>

        {showHint && (
          <div
            style={{
              position: 'absolute',
              right: (videoRect.left + 12) + 'px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'none',
              opacity: 0.7,
              userSelect: 'none',
              transition: 'opacity 0.3s',
            }}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(60, 60, 60, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <polyline points="18,15 12,9 6,15" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(60, 60, 60, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <polyline points="6,9 12,15 18,9" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}

        {/* 求人情報へボタン */}
        <button
          onClick={() => window.location.href = '/recruit'}
          style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            padding: '8px 16px',
            background: 'rgba(24,24,24,0.85)',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            fontSize: '14px',
            cursor: 'pointer',
            zIndex: 25,
            fontWeight: '500'
          }}
        >
          求人情報
        </button>
      </div>
    </div>      
  );
}
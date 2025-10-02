import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
type Video = { id: number; url: string };

const VideoCarousel: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('videos').select('id,url').order('id');
      if (data) setVideos(data as Video[]);
    })();
  }, []);
  if (videos.length === 0) return <p className="p-4">Loading…</p>;

  return (
    <div className="fixed inset-0 h-screen w-screen bg-white overflow-y-scroll snap-y snap-mandatory flex justify-center">
      {videos.map((v) => {
        let src = v.url.replace('watch?v=', 'embed/').replace('/shorts/', '/embed/');
        if (src.includes('/embed/')) src += '?feature=oembed';
        return (
          <section
            key={v.id}
            className="h-screen w-full flex justify-center items-center snap-start bg-white"
            style={{ minWidth: '100vw' }}
          >
            <div className="flex flex-row items-center justify-center h-screen w-full">
              {/* 動画本体（9:16, 中央寄せ, 背景黒） */}
              <div
                className="bg-black flex items-center justify-center"
                style={{
                  width: '375px',
                  height: '667px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <iframe
                  src={src}
                  title={`video-${v.id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ border: 'none', background: '#000' }}
                />
              </div>
              {/* 右側のUIエリア（中央縦並び） */}
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  width: '100px',
                  height: '667px',
                  marginLeft: '16px',
                  background: 'white',
                  borderRadius: '20px',
                  position: 'relative',
                  justifyContent: 'center',
                }}
              >
                {/* アイコンたち例 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <button className="w-12 h-12 bg-gray-100 rounded-full shadow flex items-center justify-center">
                    📝
                  </button>
                  <button className="w-12 h-12 bg-gray-100 rounded-full shadow flex items-center justify-center">
                    💬
                  </button>
                  <button className="w-12 h-12 bg-gray-100 rounded-full shadow flex items-center justify-center">
                    ❤️
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};
export default VideoCarousel;

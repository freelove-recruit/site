import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';

type SiteImage = { 
  id: string; 
  type: string; 
  name: string; 
  title?: string;
  image_url: string; 
  link_url: string; 
  sort_order: number; 
};

type Video = { id: number; embed_code: string; duration: number };

export default function Recruit() {
  const [showVideoModal, setShowVideoModal] = useState(true);
  const [siteImages, setSiteImages] = useState<SiteImage[]>([]);

useEffect(() => {
  if (typeof window !== 'undefined') {
    const closed = sessionStorage.getItem('videoModalClosed');
    if (closed === 'true') {
      setShowVideoModal(false);
    }
  }
}, []);

useEffect(() => {
  const fetchSiteImages = async () => {
    const { data } = await supabase.from('site_images').select('*').order('type', { ascending: true }).order('sort_order', { ascending: true });
    setSiteImages(data || []);
  };
  fetchSiteImages();
}, []);
  const [videos, setVideos] = useState<Video[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [videoRect, setVideoRect] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [showHint, setShowHint] = useState(true);
  const [muted, setMuted] = useState(true);

  const muteBtnSize = 44;
  const muteBtnOffsetY = 10;
  const muteBtnOffsetX = 18;
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
    if (showVideoModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [showVideoModal]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('videos').select('id, embed_code, duration').order('id');
      if (error) {
        console.error('Supabase error:', error.message);
        setVideos([]);
      } else if (data && Array.isArray(data)) {
        const filtered = data.filter(
          (v: any) =>
            typeof v.embed_code === 'string' &&
            v.embed_code.length > 0 &&
            typeof v.duration === 'number' &&
            v.duration > 0
        );
        setVideos(filtered as Video[]);
        setCurrent(0);
      }
    })();
  }, []);

  useEffect(() => {
  // 自動切り替え無効化
  return;
}, [current, videos, showVideoModal]);

  useEffect(() => {
  // 矢印常時表示のため無効化
  return;
}, [showHint, current, showVideoModal]);

  const handleWheel = (e: React.WheelEvent) => {
    if (isOnIcon(e.clientX, e.clientY)) return;
    e.preventDefault();
    if (!videos.length || isScrolling.current) return;
    setShowHint(true);
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
    setShowHint(true);
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

  

  const handleMuteToggle = () => setMuted(m => !m);

  // ミュートボタン位置（YouTubeマークの上、少し左に配置）
  const muteBtnLeft = videoRect.left + videoRect.width - muteBtnSize - 8;
  const muteBtnTop = videoRect.top + videoRect.height - muteBtnSize - 50;

  // ミュートボタン上ではスワイプ/ホイール無効
  const isOnIcon = (x: number, y: number) =>
    x >= muteBtnLeft && x <= muteBtnLeft + muteBtnSize &&
    y >= muteBtnTop  && y <= muteBtnTop  + muteBtnSize;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#f2f9f9',
      position: 'relative',
      overflow: 'auto',
      margin: 0,
      padding: 0
    }}>
      
      {/* 動画モーダル */}
      {showVideoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          touchAction: 'none'
        }}>
          <AnimatePresence custom={direction}>
            {videos.length > 0 && current >= 0 && current < videos.length && videos[current] && videos[current].embed_code && (
              <motion.div
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
                style={{
                  position: 'absolute',
                  left: `${videoRect.left}px`,
                  top: `${videoRect.top}px`,
                  width: `${videoRect.width}px`,
                  height: `${videoRect.height}px`,
                  background: '#000',
                  display: 'block',
                  zIndex: 0,
                  borderRadius: '0',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(6px)',
                }}
                dangerouslySetInnerHTML={{ 
                  __html: videos[current].embed_code.replace(
                    /<iframe/g, 
                    `<iframe allow="autoplay; fullscreen; picture-in-picture" ${muted ? 'muted="1"' : ''}`
                  ).replace(
                    /src="([^"]*?)"/g,
                    (match, url) => {
                      const separator = url.includes('?') ? '&' : '?';
                      return `src="${url}${separator}autoplay=1&muted=${muted ? '1' : '0'}"`;
                    }
                  )
                }}
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
              <path d="M9 11h2l4-4v12l-4-4H9V11z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <line x1="6" y1="6" x2="22" y2="22" stroke="red" strokeWidth="2.5"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M9 11h2l4-4v12l-4-4H9V11z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M18 10s2 1 2 4-2 4-2 4" stroke="white" strokeWidth="2"/>
              <path d="M21 8s3 2 3 6-3 6-3 6" stroke="white" strokeWidth="2"/>
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
                    justifyContent: 'center',
                    cursor: 'pointer',
                    pointerEvents: 'auto'
                  }}
                  onClick={() => {
                    if (!videos.length || isScrolling.current) return;
                    isScrolling.current = true;
                    setTimeout(() => (isScrolling.current = false), 500);
                    setDirection(-1);
                    setCurrent((prev) => (prev - 1 + videos.length) % videos.length);
                  }}
                >
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
                  justifyContent: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
                onClick={() => {
                  if (!videos.length || isScrolling.current) return;
                  isScrolling.current = true;
                  setTimeout(() => (isScrolling.current = false), 500);
                  setDirection(1);
                  setCurrent((prev) => (prev + 1) % videos.length);
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <polyline points="6,9 12,15 18,9" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              </div>
            )}

            {/* 右上×ボタン */}
            <button
              onClick={() => {
                setShowVideoModal(false);
                sessionStorage.setItem('videoModalClosed', 'true');
              }}
              style={{
                position: 'absolute',
                right: `${videoRect.left + 8}px`,
                top: `${videoRect.top + 10}px`,
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#000',
                border: 'none',
                color: '#fff',
                fontSize: '26px',
                cursor: 'pointer',
                zIndex: 1001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 求人ページメインコンテンツ */}
      <div style={{
        width: '100%',
        height: 'auto',
        minHeight: '100vh',
        padding: 0,
        margin: 0,
        maxWidth: '800px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        <header>
          <a href={siteImages.find(img => img.name === 'header')?.link_url || "https://freelove-kobe.com/home/"}>
            <img src={siteImages.find(img => img.name === 'header')?.image_url || "https://blog-imgs-160.fc2.com/v/6/b/v6b34kfqwxjl/2025022315593428a.jpg"} alt="フリーラブ倶楽部" />
          </a>
        </header>

        <nav>
          <ul>
            <li><a href="#concept">コンセプト</a></li>
            <li><a href="#support">安心ポイント</a></li>
            <li><a href="#contact">お問い合わせ</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); setShowVideoModal(true); }}>動画</a></li>
          </ul>
        </nav>

        <div className="mainvisual">
          <a href={siteImages.find(img => img.name === 'main')?.link_url || "#"}>
            <img src={siteImages.find(img => img.name === 'main')?.image_url || "https://blog-imgs-163.fc2.com/v/6/b/v6b34kfqwxjl/20250617151416739.jpg"} alt="トップイメージ" />
          </a>
        </div>

        {/* SNSバナー */}
        <section className="sns-banner">
          {siteImages.filter(img => img.type === 'blog').sort((a, b) => a.sort_order - b.sort_order).map((blogImg) => (
            <div key={blogImg.id} style={{ marginBottom: '15px' }}>
              {blogImg.title && (
                <h4 style={{ fontSize: '1em', margin: '10px 0 5px', color: '#333' }}>{blogImg.title}</h4>
              )}
              <a href={blogImg.link_url}>
                <img src={blogImg.image_url} alt={blogImg.title || blogImg.name} style={{
                  width: '100%', 
                  maxWidth: '100%',
                  height: 'auto', 
                  marginBottom: '15px',
                  border: '1px solid #ccc', 
                  borderRadius: '8px'
                }} />
              </a>
            </div>
          ))}

          {/* ウィジェット埋め込み（スケール対応） */}
          <div className="widget-outer">
            <iframe
              className="widget-inner"
              src="https://qzin.jp/freelove/blogwidget?width=600&height=438"
              width="600"
              height="438"
              scrolling="no"
              title="店長ブログ最新記事">
            </iframe>
          </div>
        </section>

        <section className="section" id="concept">
          <h2>コンセプト</h2>
          <p>
            FreeLoveは、ティファニーブルーと白を基調としたシンプルで清潔感あふれる空間に、<br />
            厳選された清純清楚、個性豊かな女性たちが集う、比類なき社交場です。<br />
            "自由恋愛"の名の通り、ただ若さや美しさにとらわれず、<br />
            清楚で純粋、妖艶で奥深い——<br />
            本物の魅力を持つ女性たちと、心の赴くままに幸福なひとときをお過ごしいただけます。<br />
            看板のない隠れ家で、"少年の心"を持つ紳士だけが知る、唯一無二の価値と出会ってください。
          </p>
        </section>

        <section className="section" id="support">
          <h2>安心ポイント</h2>
          <div className="support-box">
            奨学金や学費、生活費の悩みを抱える女性が、<br />
            安心して働きながら夢や目標に向かって進める環境を整えています。<br />
            学業やサークルとの両立も可能で、自分のペースでしっかり稼ぐことができます。
          </div>
          <div className="support-box">
            将来への投資や日々の負担に向き合うあなたへ。<br />
            ひとり暮らしの現実や生活コストに不安を感じるとき、<br />
            私たちはあなたの一歩を全力で支えます。<br />
            頑張った分だけしっかり収入に変わり、進路や夢の実現も後押しします。
          </div>
          <div className="support-box">
            「ひとりで応募するのは不安…」そんな声もよく聞きます。<br />
            FreeLoveでは、友達同士での応募・体験入店も大歓迎。<br />
            気の合う仲間と一緒に働けることで、不安がやわらぎ、毎日を楽しく過ごせるはずです。<br />
            シフトの相談や出勤も一緒にできるので、安心してスタートできます。
          </div>
          <div className="support-box">
            新規オープンだから、全員が一緒のスタートライン。<br />
            面倒な上下関係や派閥もなく、人間関係に悩まされることはありません。<br />
            ゼロからの環境で、気持ちよく働けます。
          </div>
          <div className="support-box">
            身バレ・親バレ対策も徹底。<br />
            アリバイ会社や給与明細のサポート、個人情報の管理体制まで万全です。<br />
            ご家族や友人に知られたくない方でも安心して働けます。
          </div>
          <div className="support-box">
            在籍女性への研修・サポートは、経験豊富な女性スタッフが担当。<br />
            初めての方もリラックスしてスタートできるよう、丁寧にサポートしています。
          </div>
          <div className="support-box">
            完全自由シフト制で、短期もOK。<br />
            週1日～、1日3時間～勤務可能なので、学業やサークルとの両立も問題ありません。
          </div>
        </section>

        <section className="section" id="recruit">
          <h2>求人概要</h2>
          <table className="recruit-table">
            <tbody>
              <tr><th>店 名</th><td>FreeLove</td></tr>
              <tr><th>住所</th><td>兵庫県神戸市兵庫区福原町1-16</td></tr>
              <tr><th>エリア</th><td>福原</td></tr>
              <tr><th>業 種</th><td>ソープ</td></tr>
              <tr><th>職 種</th><td>コンパニオン</td></tr>
              <tr><th>勤務地</th><td>神戸・福原</td></tr>
              <tr><th>勤務日</th><td>週1日からＯＫ</td></tr>
            </tbody>
          </table>
        </section>

        {/* 地図 */}
        <section className="section" id="access">
          <h2>アクセス</h2>
          <p>兵庫県神戸市兵庫区福原町1-16</p>

          <div style={{width:'100%', maxWidth:'100vw', margin:'0 auto', borderRadius:'12px', overflow:'hidden'}}>
            <iframe
              src="https://www.google.com/maps?q=34.678521,135.171789&z=17&hl=ja&output=embed"
              width="100%" height="400"
              style={{border:0}}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade">
            </iframe>
          </div>

          <div style={{marginTop:'1em', fontSize:'0.95em', lineHeight:1.6, textAlign:'center'}}>
            🚉 <strong>新開地駅</strong> … 徒歩約6分<br />
            🚉 <strong>高速神戸駅</strong> … 徒歩約5～7分<br />
            🚉 <strong>JR神戸駅</strong> … 徒歩約10～11分
          </div>
        </section>

        <div className="contact" id="contact">
          <h2>お問い合わせ</h2>
          <a href={siteImages.find(img => img.name === 'line')?.link_url || "https://line.me/ti/p/XqLUYju4Cs"}>
            <img src={siteImages.find(img => img.name === 'line')?.image_url || "https://blog-imgs-163.fc2.com/v/6/b/v6b34kfqwxjl/202506031537336f4.jpg"} alt="LINEで相談" />
          </a>
          <a href={siteImages.find(img => img.name === 'phone')?.link_url || "tel:0785776888"}>
            <img src={siteImages.find(img => img.name === 'phone')?.image_url || "https://blog-imgs-163.fc2.com/v/6/b/v6b34kfqwxjl/20250603153731da3.jpg"} alt="電話をする" />
          </a>
          <a href={siteImages.find(img => img.name === 'mail')?.link_url || "mailto:recruit@freelove-kobe.com?subject=お問い合わせ&body=○○について教えてください。"}>
            <img src={siteImages.find(img => img.name === 'mail')?.image_url || "https://blog-imgs-163.fc2.com/v/6/b/v6b34kfqwxjl/2025060315373420e.jpg"} alt="メールする" />
          </a>
        </div>
      </div>

      {/* 店長ブログウィジェットのスケール調整 JS */}
      <script dangerouslySetInnerHTML={{
        __html: `
        (function(){
          const outer = document.querySelector('.widget-outer');
          const inner = outer ? outer.querySelector('.widget-inner') : null;
          const BASE_W = 600, BASE_H = 438;

          function fit(){
            if(!outer || !inner) return;
            const w = outer.clientWidth;
            const scale = Math.min(1.33, w / BASE_W); // 最大1.33倍まで拡大可能
            inner.style.transform = 'scale(' + scale + ')';
            outer.style.height = (BASE_H * scale) + 'px';
          }

          window.addEventListener('load', fit);
          window.addEventListener('resize', fit);
        })();
        `
      }} />

      {/* CSS */}
      <style jsx global>{`
        html { 
          scroll-behavior: smooth;
          overflow-x: hidden;
        }

        body {
          font-family: "游明朝", "Yu Mincho", "ヒラギノ明朝 ProN", "Hiragino Mincho ProN", "MS P明朝", serif;
          font-weight: 400;
          margin: 0;
          padding: 0;
          background-color: #f2f9f9;
          color: #333;
          overflow-x: hidden;
        }

        header {
          background-color: #ffffff;
          text-align: center;
          padding: 1em 0;
          border-bottom: 1px solid #ccc;
          width: 100%;
        }

        header img { 
          height: 40px; 
        }

        nav {
          background-color: #f8f8f8;
          border-top: 3px solid #bfa14f;
          border-bottom: 3px solid #bfa14f;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          width: 100%;
        }

        nav ul {
          list-style: none;
          display: flex;
          justify-content: center;
          padding: 0.5em 0.5em;
          margin: 0;
          gap: 0.15em;
          flex-wrap: wrap;
        }

        nav li { 
          font-size: 0.8em; 
        }

        nav a {
          color: #333;
          text-decoration: none;
          padding: 0.3em 0.8em;
          border-radius: 20px;
          transition: background 0.2s;
          cursor: pointer;
        }

        nav a:hover { 
          background: #bfa14f; 
          color: #fff; 
        }

        .mainvisual img { 
          width: 100%; 
          height: auto; 
          display: block; 
        }

        .mainvisual a {
          display: block;
          text-decoration: none;
        }

        .mainvisual a:hover img {
          opacity: 0.9;
          transition: opacity 0.2s;
        }

        .section { 
          padding: 2em 1em 1.5em; 
          text-align: center; 
          width: 100%;
          box-sizing: border-box;
        }

        .section h2 {
          color: #bfa14f !important;
          font-weight: bold;
          font-size: 1.4em;
          border-bottom: 2px solid #bfa14f;
          display: inline-block;
          padding-bottom: 0.2em;
          margin: 0 0 1.5em;
        }

        .section p { 
          max-width: 100%;
          margin: 0 auto 0.5em; 
          line-height: 1.8;
          padding: 0 1em;
          box-sizing: border-box;
        }

        #concept p:last-of-type { 
          margin-bottom: -1.5em; 
        }

        .support-box {
          background: #ffffff;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 1.5em;
          margin: 1.5em auto;
          max-width: 100%;
          width: calc(100% - 2em);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          text-align: left;
          box-sizing: border-box;
        }

        .sns-banner { 
          text-align: center; 
          padding: 2em 1em; 
          background: #fff; 
          width: 100%;
          box-sizing: border-box;
        }

        .sns-banner h3 { 
          font-size: 1em; 
          margin: 10px 0 5px; 
          color: #333; 
        }

        .sns-banner img {
          width: 100%; 
          max-width: 100%;
          height: auto; 
          margin-bottom: 15px;
          border: 1px solid #ccc; 
          border-radius: 8px;
          box-sizing: border-box;
        }

        table.recruit-table {
          width: calc(100% - 2em); 
          max-width: 100%;
          margin: 0 auto;
          border-collapse: collapse; 
          font-size: 0.95em;
          border: 1px solid #c8e3c5; 
          background: #fff;
          box-sizing: border-box;
        }

        .recruit-table th, 
        .recruit-table td {
          padding: 10px; 
          border: 1px solid #ccc; 
          text-align: left;
        }

        .recruit-table th { 
          background-color: #e3f3db; 
          width: 30%; 
        }

        .contact { 
          background: #1c1c1c; 
          color: #fff; 
          text-align: center; 
          padding: 2em 1em; 
          width: 100%;
          box-sizing: border-box;
        }

        .contact h2 { 
          margin-bottom: 1em; 
          color: #bfa14f; 
        }

        .contact img { 
          width: 100%;
          max-width: 250px; 
          height: auto; 
          margin: 10px auto; 
          display: block; 
          border-radius: 8px; 
        }

        #recruit::before, 
        #contact::before, 
        #support::before {
          content: ""; 
          display: block; 
          height: 80px; 
          margin-top: -80px; 
          visibility: hidden;
        }

        .widget-outer {
          position: relative;
          width: 100%;
          max-width: 100%;
          margin: 16px auto 0;
          height: 438px;
          box-sizing: border-box;
        }

        .widget-inner {
          position: absolute;
          top: 0;
          left: 0;
          width: 600px;
          height: 438px;
          border: 1px solid #ccc;
          transform-origin: top left;
          transform: scale(1);
        }

        /* AI応募ボタンのスタイル */
        #contact-fab {
          position: fixed !important;
          right: 40px !important;
          bottom: 28px !important;
          z-index: 2147483647 !important;
          width: 84px !important;
          height: 84px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 3px !important;
          border-radius: 16px !important;
          background: #ff4d80 !important;
          color: #fff !important;
          text-decoration: none !important;
          font-family: "Noto Sans JP", system-ui, sans-serif !important;
          font-weight: 400 !important;
          line-height: 1.15 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,.25) !important;
          transition: background .15s, transform .15s, box-shadow .15s !important;
        }

        #contact-fab .fab-ico {
          width: 24px;
          height: 24px;
          flex: 0 0 auto;
          color: currentColor;
          margin: 0;
        }

        #contact-fab .fab-txt {
          font-size: 18px;
          margin: 0;
          line-height: 1.2;
        }

        #contact-fab .fab-sub {
          font-size: 10px;
          font-weight: 400;
          opacity: 0.9;
          line-height: 1.1;
          margin: 0;
        }

        #contact-fab.attn { 
          animation: idleJelly 8s ease-in-out infinite; 
        }
        
        @keyframes idleJelly {
          0%, 86% { transform: scale(1); }
          88%     { transform: scale(1.08, 0.92) rotate(-1.5deg); }
          90%     { transform: scale(0.92, 1.08) rotate(1.5deg); }
          92%     { transform: scale(1.06, 0.94) rotate(-0.8deg); }
          96%     { transform: scale(0.98, 1.02); }
          100%    { transform: scale(1); }
        }
      `}</style>

      {/* AI応募ボタン（動画モーダル表示中は非表示） */}
      {!showVideoModal && (
        <a id="contact-fab" className="attn" href="/chatbot" target="_blank">
          <svg className="fab-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor"
              d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.6L12 22l4.4-4H20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-2.5 8h-11a1 1 0 1 1 0-2h11a1 1 0 1 1 0 2Zm0-4h-11a1 1 0 1 1 0-2h11a1 1 0 1 1 0 2Zm-11 6h7a1 1 0 1 1 0-2h-7a1 1 0 1 1 0-2Z"/>
          </svg>
          <span className="fab-txt">AI応募</span>
          <span className="fab-sub">安心サポート</span>
        </a>
      )}
    </div>
  );
}
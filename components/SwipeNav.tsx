import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

/**
 * SwipeNav
 * - モバイル: 横スワイプで / と /recruit をトグル移動（45px以上 & 横が縦の1.2倍以上）
 * - PC: ←/→ キー、左右端クリック(外側10%)でトグル移動
 * - 初回のみヒント表示（モバイル3秒／PC2秒）。localStorageで再表示なし。
 * - オーバーレイは pointer-events: none（右下のAI応募ボタン等の操作を妨げない）
 *
 * 使い方: 各ページ（/ と /recruit）のJSX最上位で <SwipeNav /> を1回だけ置く。
 */

export type SwipeNavProps = {
  /** 横判定の最低移動量(px) */
  thresholdPx?: number; // default 45
  /** 横優勢判定( |dx| >= dominance * |dy| ) */
  dominance?: number; // default 1.2
  /** PCの左右端ホットゾーン(画面幅に対する割合) */
  hotZonePct?: number; // default 0.10
  /** 初回ヒントを表示するか */
  showHint?: boolean; // default true
  /** モバイルのヒント表示ms */
  hintMsMobile?: number; // default 3000
  /** PCのヒント表示ms */
  hintMsPc?: number; // default 2000
  /** 右下フローティングUIを誤爆しないための無視半径(px) */
  ignoreBottomRightRadius?: number; // default 80
  /** localStorageキーのサフィックス（複数バージョン切替用） */
  storageKeySuffix?: string; // default "v1"
};

const isEditableElement = (el: Element | null): boolean => {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return true;
  const he = el as HTMLElement;
  return !!he.isContentEditable;
};

const getIsTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (navigator as any).maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

export default function SwipeNav({
  thresholdPx = 45,
  dominance = 1.2,
  hotZonePct = 0.1,
  showHint = true,
  hintMsMobile = 3000,
  hintMsPc = 2000,
  ignoreBottomRightRadius = 80,
  storageKeySuffix = "v1",
}: SwipeNavProps) {
  const router = useRouter();
  const isTouch = useMemo(() => getIsTouchDevice(), []);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintMounted, setHintMounted] = useState(false);

  // --- ナビゲーション制御 ---
  const navLockRef = useRef(false);
  const navigateToggle = () => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    const current = router.pathname;
    const target = current === "/recruit" ? "/" : "/recruit";
    router.push(target).finally(() => {
      // 同ページ内で連打された場合に備えて軽く解除（遷移でアンマウントされるのが基本）
      setTimeout(() => {
        navLockRef.current = false;
      }, 800);
    });
  };

  // --- モバイル: タッチスワイプ検出 ---
  const startX = useRef(0);
  const startY = useRef(0);
  const touching = useRef(false);

  const onTouchStart = (e: TouchEvent) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];

    // 右下フローティングUI誤爆回避
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dx = t.clientX - (w - ignoreBottomRightRadius);
    const dy = t.clientY - (h - ignoreBottomRightRadius);
    if (dx > 0 && dy > 0) {
      // bottom-right円内なら無視
      return;
    }

    // 入力中は無効
    if (isEditableElement(document.activeElement)) return;

    startX.current = t.clientX;
    startY.current = t.clientY;
    touching.current = true;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!touching.current) return;
    touching.current = false;
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    if (Math.abs(dx) >= thresholdPx && Math.abs(dx) >= dominance * Math.abs(dy)) {
      navigateToggle();
    }
  };

  // --- PC: キー操作と左右端クリック ---
  const onKeyDown = (e: KeyboardEvent) => {
    // 入力中は無効
    if (isEditableElement(document.activeElement)) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      navigateToggle();
    }
  };

  const onClick = (e: MouseEvent) => {
    if (isTouch) return; // タッチ端末では無効（意図しないタップ遷移を防ぐ）
    // 入力中は無効
    if (isEditableElement(document.activeElement)) return;
    const x = e.clientX;
    const w = window.innerWidth;
    const zone = w * hotZonePct;
    if (x <= zone || x >= w - zone) {
      navigateToggle();
    }
  };

  // --- 初回ヒント ---
  useEffect(() => {
    if (!showHint) return;
    if (typeof window === "undefined") return;

    const key = `hintSeen_${isTouch ? "mobile" : "pc"}_${storageKeySuffix}`;
    const seen = window.localStorage.getItem(key);

    if (!seen) {
      setHintMounted(true);
      // 次のフレームでフェードインさせる
      requestAnimationFrame(() => setHintVisible(true));
      const ms = isTouch ? hintMsMobile : hintMsPc;
      const hideTimer = setTimeout(() => {
        setHintVisible(false);
        // フェードアウト完了後にマウント解除 & 記録
        setTimeout(() => {
          setHintMounted(false);
          window.localStorage.setItem(key, "1");
        }, 400);
      }, ms);
      return () => clearTimeout(hideTimer);
    }
  }, [showHint, isTouch, hintMsMobile, hintMsPc, storageKeySuffix]);

  // --- リスナー登録 ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    // タッチ
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    // PC操作
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("touchstart", onTouchStart as any);
      window.removeEventListener("touchend", onTouchEnd as any);
      window.removeEventListener("keydown", onKeyDown as any);
      window.removeEventListener("click", onClick as any);
    };
  }, [isTouch]);

  return (
    <>
      {/* 初回ヒント: pointer-events-none でUI操作の邪魔をしない */}
      {hintMounted && (
        <div
          aria-hidden
          className={`fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none transition-opacity duration-300 ${
            hintVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="px-4 py-3 rounded-2xl bg-black/70 text-white text-sm sm:text-base shadow-xl backdrop-blur">
            {isTouch ? (
              <div className="flex flex-col items-center gap-1">
                <span className="font-semibold">左右：求人へ／上下：動画切替</span>
                <span className="opacity-80">スワイプでページを移動できます</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="font-semibold">← / → でページ切替</span>
                <span className="opacity-80">左右端クリックでもOK</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

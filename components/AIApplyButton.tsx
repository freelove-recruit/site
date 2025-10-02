export default function AIApplyButton() {
  return (
    <>
      {/* 右下のピンクAI応募ボタン */}
      <a id="contact-fab" className="attn" href="/chatbot" target="_blank" 
         style={{position: 'fixed', right: '24px', bottom: '28px', zIndex: 2147483647}}>
        <svg className="fab-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor"
            d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.6L12 22l4.4-4H20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-2.5 8h-11a1 1 0 1 1 0-2h11a1 1 0 1 1 0 2Zm0-4h-11a1 1 0 1 1 0-2h11a1 1 0 1 1 0 2Zm-11 6h7a1 1 0 1 1 0-2h-7a1 1 0 1 1 0-2Z"/>
        </svg>
        <span className="fab-txt">AI応募</span>
        <span className="fab-sub">安心サポート</span>
      </a>

      {/* AI応募ボタンのスタイル */}
      <style jsx global>{`
            /* 固定サイズ & 安全域対応 */
                  #contact-fab {
          position: fixed !important;
          right: 40px !important;
          bottom: 28px !important;
          top: auto !important;
          left: auto !important;
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
          font-weight: 600 !important;
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
          font-size: 12px;
          margin: 0;
          line-height: 1.2;
        }

        #contact-fab .fab-sub {
          font-size: 10px;
          font-weight: 500;
          opacity: 0.9;
          line-height: 1.1;
          margin: 0;
        }



    #contact-fab .fab-txt {
      font-size: 12px;
      line-height: 1.2;
    }

    #contact-fab .fab-sub {
      font-size: 10px;
      font-weight: 500;
      opacity: 0.9;
      line-height: 1.1;
    }


    #contact-fab .fab-txt {
      font-size: 13px;
      margin: 0;
    }

    #contact-fab .fab-sub {
      font-size: 10px;
      font-weight: 500;
      opacity: 0.9;
      line-height: 1.1;
    }

    /* アテンション */
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

    /* モバイル調整 */
    @media (max-width: 560px) {
      #contact-fab { 
        width: 84px;
        height: 84px;
        right: max(22px, env(safe-area-inset-right));
        bottom: max(30px, env(safe-area-inset-bottom));
      }
      #contact-fab .fab-ico { 
        width: 24px; 
        height: 24px; 
      }
    }

      `}</style>
    </>
  );
}
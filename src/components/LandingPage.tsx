interface Props {
  onStart: () => void;
}

const FEATURES: { icon: string; title: string; desc: string }[] = [
  {
    icon: "🎬",
    title: "場景化編輯",
    desc: "一張照片就是一幕，拖曳排序、逐幕設定停留時長，像剪接分鏡一樣安排劇情節奏。",
  },
  {
    icon: "💬",
    title: "角色台詞字幕",
    desc: "為每一幕輸入角色名與台詞，自動排版成戲劇感字幕，支援「字幕列」與「對話框」兩種風格。",
  },
  {
    icon: "📱",
    title: "直式短劇規格",
    desc: "預設 9:16 直式版面，符合手機短劇平台的觀看習慣，也可切換方形或橫式。",
  },
  {
    icon: "🎵",
    title: "配樂與轉場",
    desc: "加入背景音樂並自動循環對齊片長，搭配淡入淡出轉場，成品更有戲劇氛圍。",
  },
  {
    icon: "🔒",
    title: "完全本地運算",
    desc: "使用瀏覽器內建的 ffmpeg.wasm 直接在你的裝置上合成影片，照片與台詞不會上傳到任何伺服器。",
  },
  {
    icon: "⬇️",
    title: "一鍵下載 MP4",
    desc: "生成後立即預覽，滿意就直接下載成品，不需註冊帳號、不需安裝任何軟體。",
  },
];

const STEPS: { title: string; desc: string }[] = [
  { title: "上傳照片", desc: "拖曳或選擇多張角色 / 場景照片，每張都會變成一幕。" },
  { title: "寫台詞", desc: "幫每一幕加上角色名與台詞，排出你的短劇劇情。" },
  { title: "選風格", desc: "挑選字幕樣式、直式版面、轉場與背景音樂。" },
  { title: "產生下載", desc: "點擊生成，等待瀏覽器合成完成後下載 MP4。" },
];

export function LandingPage({ onStart }: Props) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="landing-logo">🎞️ 短劇快剪</span>
        <button type="button" className="nav-cta" onClick={onStart}>
          開始製作
        </button>
      </nav>

      <section className="hero">
        <span className="hero-badge">免費 · 免安裝 · 免上傳雲端</span>
        <h1>把你的照片，剪成一部短劇</h1>
        <p className="hero-subtitle">
          上傳角色照片、打上台詞，選一個字幕風格，幾分鐘內就能生成一支直式短劇影片
          —— 全部在你的瀏覽器裡完成。
        </p>
        <div className="hero-ctas">
          <button type="button" className="primary-btn hero-primary" onClick={onStart}>
            免費開始製作
          </button>
          <a href="#features" className="hero-secondary">
            看看能做什麼 ↓
          </a>
        </div>
        <ul className="hero-points">
          <li>✓ 全程在裝置本地運算，照片不外流</li>
          <li>✓ 不需註冊、不需安裝</li>
          <li>✓ 直接輸出 MP4，隨時下載</li>
        </ul>

        <div className="landing-phone-mock" aria-hidden="true">
          <div className="phone-frame">
            <div className="phone-notch" />
            <div className="phone-screen phone-screen-demo">
              <div className="phone-progress">
                <span className="phone-progress-dot active" />
                <span className="phone-progress-dot" />
                <span className="phone-progress-dot" />
              </div>
              <div className="phone-tag">短劇 · EP.01</div>
              <div className="phone-side-icons">
                <span>
                  ❤️<em>1.2k</em>
                </span>
                <span>
                  💬<em>328</em>
                </span>
                <span>
                  ↗️<em>分享</em>
                </span>
              </div>
              <div className="phone-caption phone-caption-bar">
                <div className="phone-caption-speaker">小美</div>
                <div className="phone-caption-line">你不是說過，要娶我的嗎？</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <h2>功能一次到位</h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-it-works">
        <h2>四步驟完成你的短劇</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-num">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="primary-btn" onClick={onStart}>
          免費開始製作
        </button>
      </section>

      <section className="honesty">
        <h2>誠實說明</h2>
        <p>
          這是一個輕量的瀏覽器剪輯工具，用照片、字幕與轉場拼出短劇感的影片 ——
          並不是會自動生成人物、口型或聲音演出的 AI 影片生成服務。如果你想要的是
          AI 一鍵生成完整劇情的短劇，這個工具可能還做不到；但如果你已經有照片和台詞，
          想快速剪出一支直式短劇短片，這裡完全免費、不用等待雲端排隊。
        </p>
      </section>

      <footer className="landing-footer">
        <p>短劇快剪 · 純前端小工具，所有素材只留在你的瀏覽器裡</p>
      </footer>
    </div>
  );
}

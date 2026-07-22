import { useState } from "react";
import type { CaptionCategory, CaptionTone } from "../types";
import {
  CAPTION_CATEGORIES,
  CAPTION_TONES,
  generateCaptions,
  type GeneratedCaption,
} from "../utils/captionTemplates";

interface Props {
  onUseCaption: (topic: string, caption: GeneratedCaption) => void;
}

export function CaptionGenerator({ onUseCaption }: Props) {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<CaptionCategory>("new-product");
  const [tone, setTone] = useState<CaptionTone>("enthusiastic");
  const [suggestions, setSuggestions] = useState<GeneratedCaption[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function handleGenerate() {
    setSuggestions(generateCaptions(topic, category, tone));
    setCopiedIndex(null);
  }

  async function handleCopy(caption: GeneratedCaption, index: number) {
    const full = `${caption.text}\n\n${caption.hashtags.join(" ")}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((i) => (i === index ? null : i)), 1500);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="caption-generator">
      <h2>文案產生器</h2>
      <p className="section-hint">輸入主題，快速產生 IG 貼文文案草稿與常用標籤</p>

      <div className="settings-row">
        <label>
          主題／關鍵字
          <input
            type="text"
            placeholder="例如：秋季新品、周年慶優惠"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>

        <label>
          文案類型
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CaptionCategory)}
          >
            {CAPTION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          語氣
          <select value={tone} onChange={(e) => setTone(e.target.value as CaptionTone)}>
            {CAPTION_TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="generate-bar">
        <button type="button" className="primary-btn" onClick={handleGenerate}>
          生成文案
        </button>
      </div>

      {suggestions.length > 0 && (
        <ul className="caption-suggestions">
          {suggestions.map((s, index) => (
            <li key={index} className="caption-card">
              <p className="caption-text">{s.text}</p>
              <p className="caption-hashtags">{s.hashtags.join(" ")}</p>
              <div className="caption-actions">
                <button type="button" className="link-btn" onClick={() => handleCopy(s, index)}>
                  {copiedIndex === index ? "已複製！" : "複製文案"}
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => onUseCaption(topic, s)}
                >
                  加入排程
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

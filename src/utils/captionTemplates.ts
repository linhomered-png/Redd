import type { CaptionCategory, CaptionTone } from "../types";

interface CategoryConfig {
  label: string;
  emojis: string[];
  hashtags: string[];
  templates: string[];
}

const CATEGORY_CONFIG: Record<CaptionCategory, CategoryConfig> = {
  "new-product": {
    label: "新品上市",
    emojis: ["🎉", "✨", "🆕", "🔥"],
    hashtags: ["#新品上市", "#新品開賣", "#新品推薦", "#must_have"],
    templates: [
      "{emoji} 全新登場：{topic}！\n{tone}現在就來看看有什麼不一樣～",
      "{emoji}【新品搶先看】{topic}\n{tone}你準備好了嗎？",
      "{topic} 正式上市 {emoji}\n{tone}第一批數量有限，手刀搶購！",
    ],
  },
  promotion: {
    label: "限時優惠",
    emojis: ["🔥", "💥", "⏰", "🛍️"],
    hashtags: ["#限時優惠", "#優惠活動", "#手刀搶購", "#promo"],
    templates: [
      "{emoji} 限時優惠來囉！{topic}\n{tone}錯過只能等下次～",
      "{emoji}【好康報你知】{topic}\n{tone}活動時間有限，把握機會！",
      "{topic}，現在下單最划算 {emoji}\n{tone}",
    ],
  },
  "brand-story": {
    label: "品牌故事",
    emojis: ["🌱", "💭", "📖", "🤍"],
    hashtags: ["#品牌故事", "#brand_story", "#用心經營", "#初衷"],
    templates: [
      "{emoji} 關於{topic}的故事…\n{tone}謝謝一路支持我們的你。",
      "{emoji}【幕後故事】{topic}\n{tone}每一步都不是偶然。",
      "{topic}，是我們一直堅持的事 {emoji}\n{tone}",
    ],
  },
  engagement: {
    label: "日常互動",
    emojis: ["💬", "👋", "❤️", "🙋"],
    hashtags: ["#互動時間", "#留言分享", "#告訴我們", "#follow_us"],
    templates: [
      "{emoji} 想聽聽大家的想法：{topic}？\n{tone}留言告訴我們吧！",
      "{emoji}【今日提問】{topic}\n{tone}下面留言告訴我們你的答案～",
      "{topic}，你會怎麼選？{emoji}\n{tone}",
    ],
  },
  event: {
    label: "活動公告",
    emojis: ["📢", "🗓️", "🎊", "📍"],
    hashtags: ["#活動公告", "#別錯過", "#快來參加", "#event"],
    templates: [
      "{emoji} 活動公告：{topic}\n{tone}時間地點都在這，快筆記！",
      "{emoji}【重要通知】{topic}\n{tone}詳情看下去～",
      "{topic} 即將登場 {emoji}\n{tone}",
    ],
  },
};

const TONE_PHRASES: Record<CaptionTone, string[]> = {
  enthusiastic: ["超級期待！", "真的太興奮了！", "整個激動起來！"],
  professional: ["誠摯與您分享。", "歡迎進一步了解詳情。", "我們用心準備每個細節。"],
  cute: ["超可愛的啦～", "萌翻了吧(*´▽`*)", "是不是心動了呢～"],
};

const BRAND_HASHTAG = "#red_marketing";

export const CAPTION_CATEGORIES: { value: CaptionCategory; label: string }[] = (
  Object.keys(CATEGORY_CONFIG) as CaptionCategory[]
).map((value) => ({ value, label: CATEGORY_CONFIG[value].label }));

export const CAPTION_TONES: { value: CaptionTone; label: string }[] = [
  { value: "enthusiastic", label: "熱情活潑" },
  { value: "professional", label: "專業簡潔" },
  { value: "cute", label: "可愛療癒" },
];

export interface GeneratedCaption {
  text: string;
  hashtags: string[];
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

export function generateCaptions(
  topic: string,
  category: CaptionCategory,
  tone: CaptionTone,
  count = 3,
): GeneratedCaption[] {
  const config = CATEGORY_CONFIG[category];
  const tonePhrases = TONE_PHRASES[tone];
  const trimmedTopic = topic.trim() || "這次的內容";

  const results: GeneratedCaption[] = [];
  for (let i = 0; i < count; i++) {
    const text = pick(config.templates, i)
      .replaceAll("{topic}", trimmedTopic)
      .replaceAll("{emoji}", pick(config.emojis, i))
      .replaceAll("{tone}", pick(tonePhrases, i));
    results.push({ text, hashtags: [...config.hashtags.slice(0, 3), BRAND_HASHTAG] });
  }
  return results;
}

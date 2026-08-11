export interface PipelineOptions {
  /** 短劇主題／題材，例如「重生復仇」 */
  topic: string;
  /** 類型標籤，例如「都市情感」「懸疑」，選填 */
  genre?: string;
  /** 集數 */
  episodeCount: number;
  /** 每集大約鏡頭數 */
  shotsPerEpisode: number;
  /** 台詞／旁白語言 */
  language: string;
  /** 輸出目錄 */
  outputDir: string;
  /** 開啟後完全不呼叫任何外部 API，全程用假資料＋色卡影片測試整條流水線 */
  mock: boolean;
  /** 背景音樂檔案路徑，選填 */
  bgmPath?: string;
  /** ElevenLabs 語音 ID，選填（覆蓋 .env 設定） */
  voiceId?: string;
  /** 生成劇本時使用的 max_tokens 上限 */
  scriptMaxTokens: number;
}

/** 每個鏡頭裡的一句台詞 */
export interface DialogueLine {
  speaker: string;
  line: string;
}

/** 一個鏡頭：對應一段 4~10 秒的 AI 生成影片片段 */
export interface Shot {
  shotNumber: number;
  durationSeconds: number;
  /** 給文字／圖片轉影片模型使用的英文提示詞 */
  visualPrompt: string;
  cameraMovement: string;
  narration: string | null;
  dialogue: DialogueLine[];
}

export interface Episode {
  episodeNumber: number;
  title: string;
  hook: string;
  shots: Shot[];
}

export interface CharacterProfile {
  name: string;
  description: string;
}

export interface Script {
  title: string;
  logline: string;
  characters: CharacterProfile[];
  episodes: Episode[];
}

/** 單一鏡頭在製作階段產出的檔案 */
export interface ShotAssets {
  shot: Shot;
  videoPath: string;
  voiceoverPath: string | null;
  voiceoverDurationSeconds: number | null;
}

import { useEffect, useMemo, useState } from "react";
import type { NarrationResult } from "../types";
import { splitIntoCaptionSentences } from "../utils/scriptParse";
import {
  estimateNarrationTimings,
  isNarrationCaptureSupported,
  listPreferredVoices,
  recordNarration,
} from "../utils/speech";

type VoiceoverMode = "tts" | "silent";

interface Props {
  scriptText: string;
  onScriptChange: (text: string) => void;
  narration: NarrationResult | null;
  onNarrationChange: (result: NarrationResult | null) => void;
}

export function ScriptPanel({ scriptText, onScriptChange, narration, onNarrationChange }: Props) {
  const [voiceoverMode, setVoiceoverMode] = useState<VoiceoverMode>("tts");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [charsPerSecond, setCharsPerSecond] = useState(4.5);
  const [isRecording, setIsRecording] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const supported = useMemo(() => isNarrationCaptureSupported(), []);
  const sentences = useMemo(() => splitIntoCaptionSentences(scriptText), [scriptText]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    function loadVoices() {
      const list = listPreferredVoices();
      setVoices(list);
      setVoiceURI((prev) => (prev && list.some((v) => v.voiceURI === prev) ? prev : list[0]?.voiceURI ?? ""));
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const narrationUrl = useMemo(
    () => (narration?.audioFile ? URL.createObjectURL(narration.audioFile) : null),
    [narration],
  );
  useEffect(() => {
    return () => {
      if (narrationUrl) URL.revokeObjectURL(narrationUrl);
    };
  }, [narrationUrl]);

  async function handleRecord() {
    if (sentences.length === 0 || isRecording) return;
    setIsRecording(true);
    setErrorMessage("");
    setProgressText('請在彈出視窗中選擇「這個分頁」，並勾選「分享分頁音訊」…');
    try {
      const voice = voices.find((v) => v.voiceURI === voiceURI) ?? null;
      const result = await recordNarration({
        sentences,
        voice,
        rate,
        pitch,
        onProgress: (done, total) => setProgressText(`正在錄製旁白… (${done}/${total} 句)`),
      });
      onNarrationChange(result);
      setProgressText("");
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setProgressText("");
    } finally {
      setIsRecording(false);
    }
  }

  function handleEstimate() {
    if (sentences.length === 0) return;
    setErrorMessage("");
    const result = estimateNarrationTimings(sentences, { charsPerSecond });
    onNarrationChange(result);
  }

  return (
    <div className="script-panel">
      <label className="script-label">
        逐字稿
        <textarea
          className="script-textarea"
          value={scriptText}
          onChange={(e) => {
            onScriptChange(e.target.value);
            onNarrationChange(null);
          }}
          placeholder="貼上完整逐字稿，App 會自動依標點斷句，並生成逐字彈出的字幕動畫"
          rows={8}
        />
      </label>
      <p className="settings-hint">
        {sentences.length > 0
          ? `已依標點切成 ${sentences.length} 句字幕`
          : "尚未輸入逐字稿"}
      </p>

      <div className="mode-switch voiceover-switch" role="tablist">
        <button
          type="button"
          className={`mode-btn${voiceoverMode === "tts" ? " active" : ""}`}
          onClick={() => {
            setVoiceoverMode("tts");
            onNarrationChange(null);
          }}
        >
          有旁白配音
        </button>
        <button
          type="button"
          className={`mode-btn${voiceoverMode === "silent" ? " active" : ""}`}
          onClick={() => {
            setVoiceoverMode("silent");
            onNarrationChange(null);
          }}
        >
          不要旁白，只要字幕
        </button>
      </div>

      {voiceoverMode === "tts" ? (
        <>
          {!supported && (
            <p className="error-msg">
              此瀏覽器不支援自動錄製旁白（需要 getDisplayMedia 分頁音訊擷取），請改用電腦版
              Chrome 或 Edge，或改選「不要旁白，只要字幕」。
            </p>
          )}

          <div className="settings-row">
            <label>
              語音
              <select value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)} disabled={voices.length === 0}>
                {voices.length === 0 && <option value="">（無可用語音）</option>}
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <label>
              語速 {rate.toFixed(2)}
              <input
                type="range"
                min={0.7}
                max={1.3}
                step={0.05}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              />
            </label>
            <label>
              音高 {pitch.toFixed(2)}
              <input
                type="range"
                min={0.7}
                max={1.3}
                step={0.05}
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="settings-row">
            <button
              type="button"
              className="primary-btn"
              disabled={!supported || sentences.length === 0 || isRecording}
              onClick={handleRecord}
            >
              {isRecording ? "錄製中…" : narration?.audioFile ? "重新產生旁白" : "產生旁白錄音"}
            </button>
            {progressText && <span className="settings-hint">{progressText}</span>}
          </div>

          {errorMessage && <p className="error-msg">錄製失敗：{errorMessage}</p>}

          {narration?.audioFile && narrationUrl && (
            <div className="narration-preview">
              <audio src={narrationUrl} controls />
              <p className="settings-hint">
                旁白長度 {narration.duration.toFixed(1)} 秒 ·{" "}
                {narration.timingSource === "boundary"
                  ? "已取得逐字時間軸"
                  : "此瀏覽器未回報逐字時間，字幕改用估算時間對齊"}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="settings-hint">
            不錄製任何聲音，字幕出現的節奏改用固定的閱讀速度估算。生成的影片沒有聲音（若在下方
            設定背景音樂，音樂仍會加進去）。任何瀏覽器都能用。
          </p>
          <div className="settings-row">
            <label>
              字幕速度（每秒 {charsPerSecond.toFixed(1)} 字）
              <input
                type="range"
                min={2.5}
                max={7}
                step={0.5}
                value={charsPerSecond}
                onChange={(e) => setCharsPerSecond(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="settings-row">
            <button
              type="button"
              className="primary-btn"
              disabled={sentences.length === 0}
              onClick={handleEstimate}
            >
              {narration && !narration.audioFile ? "重新產生字幕時間軸" : "產生字幕時間軸"}
            </button>
          </div>
          {narration && !narration.audioFile && (
            <p className="settings-hint">
              字幕時間軸已產生，共 {narration.sentences.length} 句，預估總長{" "}
              {narration.duration.toFixed(1)} 秒（無旁白聲音）
            </p>
          )}
        </>
      )}
    </div>
  );
}

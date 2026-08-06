import type { CaptionSentence, CaptionWord, NarrationResult } from "../types";
import { splitIntoRevealUnits } from "./scriptParse";

/**
 * Generates a narration track entirely in the browser using the Web Speech API,
 * and captures its audio by recording the current tab's audio output via
 * getDisplayMedia. There is no other way to get raw audio out of speechSynthesis —
 * it renders through the OS speech engine, not the Web Audio graph — so this only
 * works where tab-audio capture is supported (desktop Chrome/Edge). Callers should
 * check isNarrationCaptureSupported() first and show guidance if it's false.
 */
export function isNarrationCaptureSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

/** Chinese voices first (this app's scripts are Traditional Chinese), then everything else. */
export function listPreferredVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const all = window.speechSynthesis.getVoices();
  const zh = all.filter((v) => v.lang.toLowerCase().startsWith("zh"));
  const rest = all.filter((v) => !v.lang.toLowerCase().startsWith("zh"));
  return [...zh, ...rest];
}

export interface RecordNarrationOptions {
  sentences: string[];
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  onProgress?: (doneCount: number, total: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BoundaryEvent {
  charIndex: number;
  time: number;
}

interface SpeakResult {
  sentence: CaptionSentence;
  hadBoundaryEvents: boolean;
}

function computeUnitRanges(
  sentence: string,
  units: string[],
): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const unit of units) {
    const idx = sentence.indexOf(unit, cursor);
    const start = idx >= 0 ? idx : cursor;
    const end = start + unit.length;
    ranges.push({ start, end });
    cursor = end;
  }
  return ranges;
}

function buildWordTimings(
  ranges: { start: number; end: number }[],
  units: string[],
  boundaryEvents: BoundaryEvent[],
  sentenceStart: number,
  sentenceEnd: number,
): CaptionWord[] {
  if (boundaryEvents.length === 0) {
    // No word-boundary events from this browser/voice: spread units evenly across
    // the measured sentence duration, weighted by character count.
    const totalChars = units.reduce((sum, u) => sum + u.length, 0) || 1;
    const span = Math.max(0, sentenceEnd - sentenceStart);
    let acc = 0;
    return units.map((unit) => {
      const start = sentenceStart + (acc / totalChars) * span;
      acc += unit.length;
      const end = sentenceStart + (acc / totalChars) * span;
      return { text: unit, start, end };
    });
  }

  const sorted = [...boundaryEvents].sort((a, b) => a.charIndex - b.charIndex);
  const words: CaptionWord[] = ranges.map((range, i) => {
    const hit = sorted.find((b) => b.charIndex >= range.start) ?? sorted[sorted.length - 1];
    const start = hit ? hit.time : sentenceStart;
    return { text: units[i], start, end: start };
  });
  for (let i = 0; i < words.length; i++) {
    const next = i + 1 < words.length ? words[i + 1].start : sentenceEnd;
    words[i].end = next > words[i].start ? next : words[i].start + 0.05;
  }
  return words;
}

function speakOneSentence(
  text: string,
  voice: SpeechSynthesisVoice | null,
  rate: number,
  pitch: number,
  t0: number,
): Promise<SpeakResult> {
  return new Promise((resolve, reject) => {
    const units = splitIntoRevealUnits(text);
    const ranges = computeUnitRanges(text, units);
    const boundaryEvents: BoundaryEvent[] = [];
    let sentenceStart = (performance.now() - t0) / 1000;

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = voice?.lang ?? "zh-TW";

    utterance.onstart = () => {
      sentenceStart = (performance.now() - t0) / 1000;
    };
    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      boundaryEvents.push({ charIndex: e.charIndex, time: (performance.now() - t0) / 1000 });
    };
    utterance.onend = () => {
      const sentenceEnd = (performance.now() - t0) / 1000;
      const words =
        units.length > 0
          ? buildWordTimings(ranges, units, boundaryEvents, sentenceStart, sentenceEnd)
          : [];
      resolve({
        sentence: { text, words, start: sentenceStart, end: sentenceEnd },
        hadBoundaryEvents: boundaryEvents.length > 0,
      });
    };
    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      reject(new Error(`語音合成失敗：${e.error}`));
    };
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speaks each sentence in order via the Web Speech API while recording the tab's
 * audio output, returning the recorded narration file plus a word-by-word timing
 * breakdown per sentence (real if the browser fired boundary events, estimated
 * otherwise).
 */
export async function recordNarration(opts: RecordNarrationOptions): Promise<NarrationResult> {
  if (!("speechSynthesis" in window)) {
    throw new Error("此瀏覽器不支援語音合成（Web Speech API）。");
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("此瀏覽器不支援分頁音訊擷取，請改用電腦版 Chrome 或 Edge。");
  }
  if (opts.sentences.length === 0) {
    throw new Error("逐字稿是空的，請先貼上文字。");
  }

  window.speechSynthesis.cancel();

  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });
  const audioTracks = displayStream.getAudioTracks();
  if (audioTracks.length === 0) {
    displayStream.getTracks().forEach((t) => t.stop());
    throw new Error(
      '沒有取得分頁音訊。請重新點擊「產生旁白錄音」，並在彈出視窗中選擇「這個分頁」分頁並勾選「分享分頁音訊」。',
    );
  }
  displayStream.getVideoTracks().forEach((t) => t.stop());
  const audioStream = new MediaStream(audioTracks);

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  const recorder = new MediaRecorder(audioStream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  try {
    const started = new Promise<void>((resolve) => {
      recorder.onstart = () => resolve();
    });
    recorder.start();
    await started;
    const t0 = performance.now();

    const sentences: CaptionSentence[] = [];
    let usedBoundary = false;
    for (let i = 0; i < opts.sentences.length; i++) {
      const result = await speakOneSentence(opts.sentences[i], opts.voice, opts.rate, opts.pitch, t0);
      if (result.hadBoundaryEvents) usedBoundary = true;
      sentences.push(result.sentence);
      opts.onProgress?.(i + 1, opts.sentences.length);
    }

    // Small tail so the very last word/syllable isn't clipped by the recorder stop.
    await sleep(300);

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await stopped;

    const duration = (performance.now() - t0) / 1000;
    const blob = new Blob(chunks, { type: mimeType });
    const audioFile = new File([blob], "narration.webm", { type: mimeType });

    return {
      audioFile,
      duration,
      sentences,
      timingSource: usedBoundary ? "boundary" : "estimated",
    };
  } finally {
    audioStream.getTracks().forEach((t) => t.stop());
    displayStream.getTracks().forEach((t) => t.stop());
  }
}

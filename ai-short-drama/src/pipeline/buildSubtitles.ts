export interface SubtitleSegment {
  text: string;
  startSeconds: number;
  endSeconds: number;
}

function formatSrtTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = Math.floor(clamped % 60);
  const millis = Math.round((clamped - Math.floor(clamped)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/** 把字幕片段組成標準 SRT 格式的字串。 */
export function buildSrt(segments: SubtitleSegment[]): string {
  return segments
    .filter((segment) => segment.text.trim().length > 0)
    .map((segment, index) => {
      const start = formatSrtTimestamp(segment.startSeconds);
      const end = formatSrtTimestamp(segment.endSeconds);
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
    })
    .join("\n");
}

import type { CaptionSentence, MediaItem } from "../types";

const MAX_CAPTION_LINES = 2;
const MIN_FRAME_DURATION = 0.04;
const POP_DURATION = 0.1;
const POP_SCALE = 1.16;

export interface CaptionFrameOptions {
  sentences: CaptionSentence[];
  backgrounds: MediaItem[];
  resolution: { width: number; height: number };
}

/**
 * Renders a background photo + narration captions into a sequence of still-image
 * MediaItems, one per caption "reveal step" (each new word popping in), so the
 * result can be fed straight into the existing buildVideo() concat pipeline.
 * Backgrounds are assigned to sentences round-robin, in upload order.
 */
export async function buildCaptionFrameItems(
  opts: CaptionFrameOptions,
  makeId: () => string,
): Promise<MediaItem[]> {
  const { sentences, backgrounds, resolution } = opts;
  if (backgrounds.length === 0) {
    throw new Error("請先上傳至少一張背景照片。");
  }

  const canvas = document.createElement("canvas");
  canvas.width = resolution.width;
  canvas.height = resolution.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const fontSize = Math.round(resolution.height * 0.052);
  const captionFont = `700 ${fontSize}px "PingFang SC", "Microsoft YaHei", "Noto Sans TC", sans-serif`;
  const maxTextWidth = resolution.width * 0.86;
  ctx.font = captionFont;

  const bitmapCache = new Map<File, ImageBitmap>();
  async function bitmapFor(file: File): Promise<ImageBitmap> {
    let bmp = bitmapCache.get(file);
    if (!bmp) {
      bmp = await createImageBitmap(file);
      bitmapCache.set(file, bmp);
    }
    return bmp;
  }

  const items: MediaItem[] = [];

  try {
    for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
      const sentence = sentences[sIdx];
      const bgItem = backgrounds[sIdx % backgrounds.length];
      const bitmap = await bitmapFor(bgItem.file);

      for (let wIdx = 0; wIdx < sentence.words.length; wIdx++) {
        const revealedUnits = sentence.words.slice(0, wIdx + 1).map((w) => w.text);
        const lines = wrapUnits(ctx, revealedUnits, maxTextWidth).slice(-MAX_CAPTION_LINES);
        const word = sentence.words[wIdx];
        const duration = Math.max(MIN_FRAME_DURATION, word.end - word.start);
        const popDuration = Math.min(POP_DURATION, duration * 0.4);
        const settleDuration = duration - popDuration;

        // Frames share one canvas, so each toBlob() capture must fully resolve
        // before the next frame redraws it — these must run sequentially, not
        // be fired off in parallel.
        if (popDuration > MIN_FRAME_DURATION && settleDuration > MIN_FRAME_DURATION) {
          items.push(
            await frameItem(canvas, ctx, bitmap, resolution, lines, captionFont, fontSize, POP_SCALE, popDuration, makeId),
          );
          items.push(
            await frameItem(canvas, ctx, bitmap, resolution, lines, captionFont, fontSize, 1, settleDuration, makeId),
          );
        } else {
          items.push(
            await frameItem(canvas, ctx, bitmap, resolution, lines, captionFont, fontSize, 1, duration, makeId),
          );
        }
      }
    }

    return items;
  } finally {
    for (const bmp of bitmapCache.values()) bmp.close();
  }
}

function wrapUnits(ctx: CanvasRenderingContext2D, units: string[], maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const unit of units) {
    const test = current + unit;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = unit;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function frameItem(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  resolution: { width: number; height: number },
  lines: string[],
  font: string,
  fontSize: number,
  scale: number,
  duration: number,
  makeId: () => string,
): Promise<MediaItem> {
  drawBackground(ctx, bitmap, resolution);
  drawCaptionLines(ctx, lines, resolution, font, fontSize, scale);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.88),
  );
  const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
  return {
    id: makeId(),
    file,
    kind: "image",
    url: URL.createObjectURL(blob),
    duration,
    sourceDuration: null,
  };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  resolution: { width: number; height: number },
) {
  const { width, height } = resolution;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // Cover-fill (crop to fill frame) so the caption band always has full-bleed art
  // behind it, matching the reference video's full-screen background style.
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);

  // Darken the bottom band so white captions stay legible over any photo.
  const gradient = ctx.createLinearGradient(0, height * 0.55, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height * 0.55, width, height * 0.45);
}

function drawCaptionLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  resolution: { width: number; height: number },
  font: string,
  fontSize: number,
  scale: number,
) {
  if (lines.length === 0) return;
  const { width, height } = resolution;
  const lineHeight = fontSize * 1.35;
  const blockHeight = lineHeight * lines.length;
  const bottomMargin = height * 0.1;
  const centerX = width / 2;
  const baseY = height - bottomMargin - blockHeight + lineHeight / 2;

  ctx.save();
  ctx.translate(centerX, baseY);
  ctx.scale(scale, scale);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  ctx.lineWidth = Math.max(3, fontSize * 0.12);
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.fillStyle = "#fff";
  ctx.lineJoin = "round";

  lines.forEach((line, i) => {
    const y = i * lineHeight;
    ctx.strokeText(line, 0, y);
    ctx.fillText(line, 0, y);
  });
  ctx.restore();
}

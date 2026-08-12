import type { CaptionStyle } from "../types";

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';

/**
 * Splits text into wrap-safe tokens: each CJK character is its own token
 * (so lines can break between them), while Latin letters/digits stay
 * grouped into words so English text doesn't get split mid-word.
 */
function tokenize(text: string): string[] {
  // 　-鿿: CJK punctuation + ideographs, 가-힣: Hangul,
  // ＀-￯: fullwidth forms — each such character wraps on its own.
  return text.match(/[　-鿿가-힣＀-￯]|[A-Za-z0-9'-]+|\s+|./gu) ?? [];
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const tokens = tokenize(text.trim());
  const lines: string[] = [];
  let current = "";
  for (const token of tokens) {
    const candidate = current + token;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current.trimEnd());
      current = token.trimStart();
    } else {
      current = candidate;
    }
  }
  if (current.trim()) lines.push(current.trimEnd());
  return lines;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  width: number,
  height: number,
) {
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
}

function drawBarCaption(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  speaker: string,
  line: string,
) {
  const padding = Math.round(width * 0.07);
  const maxTextWidth = width - padding * 2;
  const lineFontSize = Math.max(18, Math.round(width * 0.052));
  const speakerFontSize = Math.max(14, Math.round(lineFontSize * 0.7));
  const lineHeight = lineFontSize * 1.4;

  ctx.font = `600 ${lineFontSize}px ${FONT_STACK}`;
  const lines = wrapLines(ctx, line, maxTextWidth).slice(0, 4);

  const hasSpeaker = speaker.trim().length > 0;
  const blockHeight =
    lines.length * lineHeight + (hasSpeaker ? speakerFontSize * 1.6 : 0) + padding * 1.4;
  const gradientTop = height - blockHeight;

  const gradient = ctx.createLinearGradient(0, gradientTop, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.35, "rgba(0,0,0,0.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, gradientTop, width, blockHeight);

  let y = height - padding - lines.length * lineHeight + lineFontSize;

  if (hasSpeaker) {
    ctx.font = `700 ${speakerFontSize}px ${FONT_STACK}`;
    ctx.fillStyle = "#ffd166";
    ctx.textAlign = "left";
    ctx.fillText(speaker, padding, y - lineHeight * 0.15);
    y += speakerFontSize * 1.2;
  }

  ctx.font = `600 ${lineFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 6;
  for (const l of lines) {
    ctx.fillText(l, padding, y);
    y += lineHeight;
  }
  ctx.shadowBlur = 0;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBubbleCaption(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  speaker: string,
  line: string,
) {
  const padding = Math.round(width * 0.08);
  const bubblePadX = Math.round(width * 0.05);
  const bubblePadY = Math.round(width * 0.035);
  const maxTextWidth = width - padding * 2 - bubblePadX * 2;
  const lineFontSize = Math.max(17, Math.round(width * 0.048));
  const speakerFontSize = Math.max(13, Math.round(lineFontSize * 0.65));
  const lineHeight = lineFontSize * 1.35;

  ctx.font = `600 ${lineFontSize}px ${FONT_STACK}`;
  const lines = wrapLines(ctx, line, maxTextWidth).slice(0, 4);
  const textWidth = Math.min(
    maxTextWidth,
    Math.max(...lines.map((l) => ctx.measureText(l).width), 40),
  );

  const hasSpeaker = speaker.trim().length > 0;
  const speakerBlock = hasSpeaker ? speakerFontSize * 1.5 : 0;
  const bubbleHeight = bubblePadY * 2 + speakerBlock + lines.length * lineHeight;
  const bubbleWidth = textWidth + bubblePadX * 2;
  const bubbleX = padding;
  const bubbleY = height - padding - bubbleHeight;

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 18);
  ctx.fill();

  // speech-bubble tail
  ctx.beginPath();
  ctx.moveTo(bubbleX + 28, bubbleY + bubbleHeight);
  ctx.lineTo(bubbleX + 14, bubbleY + bubbleHeight + 16);
  ctx.lineTo(bubbleX + 44, bubbleY + bubbleHeight);
  ctx.closePath();
  ctx.fill();

  let y = bubbleY + bubblePadY + lineFontSize;

  if (hasSpeaker) {
    ctx.font = `700 ${speakerFontSize}px ${FONT_STACK}`;
    ctx.fillStyle = "#ff5d8f";
    ctx.textAlign = "left";
    ctx.fillText(speaker, bubbleX + bubblePadX, y - lineHeight * 0.1);
    y += speakerFontSize * 1.3;
  }

  ctx.font = `600 ${lineFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "left";
  for (const l of lines) {
    ctx.fillText(l, bubbleX + bubblePadX, y);
    y += lineHeight;
  }
}

/**
 * Renders a scene photo cover-cropped onto a canvas of exactly
 * targetWidth x targetHeight, burns in the dialogue caption (if any),
 * and returns a JPEG blob ready to feed into the video pipeline.
 */
export async function renderSceneFrame(
  file: File,
  targetWidth: number,
  targetHeight: number,
  caption: { speaker: string; line: string },
  style: CaptionStyle,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  drawCoverImage(ctx, bitmap, targetWidth, targetHeight);
  bitmap.close();

  const hasCaption = style !== "none" && (caption.speaker.trim() || caption.line.trim());
  if (hasCaption) {
    if (style === "bar") {
      drawBarCaption(ctx, targetWidth, targetHeight, caption.speaker, caption.line);
    } else if (style === "bubble") {
      drawBubbleCaption(ctx, targetWidth, targetHeight, caption.speaker, caption.line);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

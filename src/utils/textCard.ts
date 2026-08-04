export interface TextCardStyle {
  bgColor: string;
  textColor: string;
}

/**
 * Renders a full-bleed color card with centered, word-wrapped text onto a canvas
 * of exactly targetWidth x targetHeight, and returns a PNG blob. Used for
 * script "cue cards" (e.g. recruitment video title cards) that don't come from
 * an uploaded photo.
 */
export async function renderTextCardToFrame(
  text: string,
  targetWidth: number,
  targetHeight: number,
  style: TextCardStyle,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = style.bgColor;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const fontSize = Math.round(targetHeight * 0.09);
  ctx.font = `bold ${fontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = style.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = targetWidth * 0.82;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * 1.4;
  const startY = targetHeight / 2 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, targetWidth / 2, startY + i * lineHeight);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

/**
 * Greedy word-wrap by character, respecting explicit newlines. Works for CJK
 * text, which has no spaces to break on.
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const ch of paragraph) {
      const trial = current + ch;
      if (current && ctx.measureText(trial).width > maxWidth) {
        lines.push(current);
        current = ch;
      } else {
        current = trial;
      }
    }
    lines.push(current);
  }
  return lines;
}

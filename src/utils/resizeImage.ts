/**
 * Renders an image file letterboxed (contain, centered, black background) onto a
 * canvas of exactly targetWidth x targetHeight, and returns a JPEG blob. Ensures
 * every frame handed to ffmpeg shares identical dimensions.
 */
export async function renderPhotoToFrame(
  file: File,
  targetWidth: number,
  targetHeight: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    targetWidth / bitmap.width,
    targetHeight / bitmap.height,
  );
  const drawWidth = Math.round(bitmap.width * scale);
  const drawHeight = Math.round(bitmap.height * scale);
  const offsetX = Math.round((targetWidth - drawWidth) / 2);
  const offsetY = Math.round((targetHeight - drawHeight) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

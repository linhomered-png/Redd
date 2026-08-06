import { useRef, useState } from "react";
import type { DragEvent } from "react";

interface Props {
  onFilesAdded: (files: File[]) => void;
  /** Restricts which kinds of files are accepted. Defaults to both images and videos. */
  acceptImages?: boolean;
  acceptVideos?: boolean;
}

export function PhotoUploader({ onFilesAdded, acceptImages = true, acceptVideos = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).filter(
      (f) =>
        (acceptImages && f.type.startsWith("image/")) ||
        (acceptVideos && f.type.startsWith("video/")),
    );
    if (files.length) onFilesAdded(files);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      className={`uploader${isDragging ? " dragging" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
    >
      <p>
        拖曳{acceptImages && "照片"}
        {acceptImages && acceptVideos && "或"}
        {acceptVideos && "影片"}到這裡，或點擊選擇檔案
      </p>
      <p className="uploader-hint">
        支援一次選擇多張
        {acceptImages && " JPG / PNG 圖片"}
        {acceptImages && acceptVideos && " 與"}
        {acceptVideos && " MP4 / MOV 影片片段"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={[acceptImages && "image/*", acceptVideos && "video/*"].filter(Boolean).join(",")}
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

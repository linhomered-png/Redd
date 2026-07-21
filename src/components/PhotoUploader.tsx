import { useRef, useState } from "react";
import type { DragEvent } from "react";

interface Props {
  onFilesAdded: (files: File[]) => void;
}

export function PhotoUploader({ onFilesAdded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
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
      <p>拖拽照片到这里，或点击选择文件</p>
      <p className="uploader-hint">支持一次选择多张 JPG / PNG 图片</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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

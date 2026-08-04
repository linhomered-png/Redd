import { useState } from "react";

interface Props {
  onAdd: (text: string, bgColor: string, textColor: string) => void;
  onApplyTemplate: () => void;
}

export function TextCardEditor({ onAdd, onApplyTemplate }: Props) {
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState("#12233f");
  const [textColor, setTextColor] = useState("#ffffff");

  function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed, bgColor, textColor);
    setText("");
  }

  return (
    <div className="text-card-editor">
      <div className="text-card-editor-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="輸入文字卡內容，例如：貨出得去，訂單接不完？"
          rows={2}
        />
        <label className="color-field">
          底色
          <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
        </label>
        <label className="color-field">
          文字色
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
          />
        </label>
        <button type="button" className="secondary-btn" onClick={handleAdd}>
          新增文字卡
        </button>
      </div>
      <button type="button" className="link-btn" onClick={onApplyTemplate}>
        套用「團購批發商招募」範本文字卡（6 張，共 30 秒）
      </button>
    </div>
  );
}

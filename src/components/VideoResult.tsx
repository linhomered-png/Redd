interface Props {
  videoUrl: string;
  onDiscard: () => void;
}

export function VideoResult({ videoUrl, onDiscard }: Props) {
  return (
    <div className="video-result">
      <video src={videoUrl} controls className="video-preview" />
      <div className="video-actions">
        <a className="primary-btn" href={videoUrl} download="short-drama.mp4">
          下載短劇影片
        </a>
        <button type="button" className="link-btn" onClick={onDiscard}>
          重新製作
        </button>
      </div>
    </div>
  );
}

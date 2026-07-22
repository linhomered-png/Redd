interface Props {
  videoUrl: string;
  onDiscard: () => void;
  onUseForPost: () => void;
}

export function VideoResult({ videoUrl, onDiscard, onUseForPost }: Props) {
  return (
    <div className="video-result">
      <video src={videoUrl} controls className="video-preview" />
      <div className="video-actions">
        <a className="primary-btn" href={videoUrl} download="photos-video.mp4">
          下載影片
        </a>
        <button type="button" className="link-btn" onClick={onUseForPost}>
          用這支影片發文 →
        </button>
        <button type="button" className="link-btn" onClick={onDiscard}>
          重新製作
        </button>
      </div>
    </div>
  );
}
